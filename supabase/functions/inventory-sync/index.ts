// Inventory sync: Google Sheet (master) -> products table. Native Supabase Edge
// Function (no n8n / Make). Reads the sheet as a public CSV (no Google auth needed).
//
// Auth: call with the service-role key as Bearer (cron) OR an admin user's JWT
// (the "Sincronizar ahora" button). verify_jwt = false in config.toml.
//
// ============================ REGLA DE DOMINIOS ============================
// La hoja de calculo es duena de:   stock, price, sku / inv_sku, y "Activo Web"
//                                   (este ultimo solo cuando la celda cambio).
// El admin de la pagina es dueno de: images, brand_id, category_id, name, slug,
//                                   description y toda la ficha editorial.
// Esta funcion NUNCA escribe una columna del segundo grupo. Ni al actualizar,
// ni al reasignar un SKU, ni al crear.
//
// Reglas acordadas con Mafe (11-09-2026, ampliadas 25-09-2026):
//   1. Un SKU nuevo en la hoja crea el producto en la pagina.
//   2. La hoja manda en SKU, stock y precio. Si la hoja dice 0, es 0.
//   3. El nombre se edita en la pagina y la hoja NUNCA lo pisa.
//   4. El slug se escribe al crear y no se vuelve a tocar jamas.
//   5. "Activo Web" se maneja en los dos lados: la hoja solo pisa el activo
//      cuando esa celda cambio respecto a la ultima sincronizacion.
//   6. Si la hoja le cambia el SKU a un producto que ya existe, se le REASIGNA
//      el SKU al producto existente. Jamas se crea un clon. Y si no se puede
//      decidir sin adivinar, no se escribe nada: queda en `conflictos`.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHEET_ID = Deno.env.get('INVENTORY_SHEET_ID') || '13798JechMiinmFH_0jGnSuDJ6U5u5F6QYGmzCl6RY6E';
// gid de la pestana de inventario ("SKU / DESCRIPCION / Cantidad Disponible").
// '0' no existe en esta hoja, asi que se ignora y se usa la pestana real.
const ENV_GID = (Deno.env.get('INVENTORY_SHEET_GID') || '').trim();
const SHEET_GID = ENV_GID && ENV_GID !== '0' ? ENV_GID : '602957575';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/* ---------- CSV ---------- */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const toInt = (s: string) => { const n = parseInt(String(s ?? '').replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : 0; };

/* ---------- normalizacion ---------- */
const strip = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
// Clave de comparacion de SKU: sin tildes, sin espacios, en mayuscula.
// "HP -0240", "hp-0240" y "HP-0240" son el mismo SKU. El valor que se GUARDA
// es siempre el de la hoja, tal cual; esto es solo para emparejar.
const skuKey = (s: string) => strip(String(s ?? '')).toUpperCase().replace(/\s+/g, '');
// Clave de comparacion de nombre: solo letras y numeros, en mayuscula. Sirve
// para detectar que "Impresora Honeywell PC42E-T" y la misma con otro espacio
// o un guion de mas son el mismo producto. NO es una busqueda difusa: o es
// identico caracter a caracter una vez normalizado, o no lo es.
const nameKey = (s: string) => strip(String(s ?? '')).toUpperCase().replace(/[^A-Z0-9]/g, '');

interface SheetRow { sku: string; name: string; stock: number; price: number; active: boolean; }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Auth: service key (cron) or admin JWT (manual) ----
    const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
    let authorized = !!bearer && bearer === SERVICE_KEY;
    if (!authorized && bearer) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const { data: isAdmin } = await admin.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
        authorized = !!isAdmin;
      }
    }
    // pg_cron authenticates with an internal token stored in the DB.
    if (!authorized) {
      const cronToken = req.headers.get('x-cron-token');
      if (cronToken) {
        const { data: t } = await admin.from('internal_tokens').select('token').eq('name', 'inventory_cron').maybeSingle();
        if (t?.token && t.token === cronToken) authorized = true;
      }
    }
    if (!authorized) return json({ error: 'No autorizado' }, 401);

    // Modo prueba: ?dry=1 (o {"dry":true} en el body) calcula todo y devuelve
    // el resumen SIN escribir una sola fila. Sirve para ver que haria la
    // corrida antes de dejarla suelta.
    let dryRun = new URL(req.url).searchParams.get('dry') === '1';
    if (!dryRun && req.method === 'POST') {
      try { const b = await req.json(); if (b && b.dry === true) dryRun = true; } catch { /* sin body */ }
    }

    // ---- Read the sheet ----
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const csvRes = await fetch(url, { redirect: 'follow' });
    if (!csvRes.ok) return json({ error: `No se pudo leer la hoja (HTTP ${csvRes.status}). Esta publica?` }, 502);
    const grid = parseCsv(await csvRes.text());

    let hIdx = grid.findIndex((r) => r.some((c) => /^\s*sku\s*$/i.test(c)) && r.some((c) => /descripcion/i.test(c)));
    if (hIdx < 0) hIdx = 1;
    const header = grid[hIdx].map((c) => c.trim().toLowerCase());
    const col = (re: RegExp, fb: number) => { const i = header.findIndex((h) => re.test(h)); return i >= 0 ? i : fb; };
    const iSku = col(/^sku$/, 0), iName = col(/descripcion/, 1), iStock = col(/cantidad disponible/, 2), iPrice = col(/precio web plano/, 7), iActive = col(/activo web/, 8);

    // Se acepta CUALQUIER SKU no vacio. Antes habia un filtro de formato que
    // descartaba en silencio las filas con tilde, espacio o forma distinta, y
    // esos productos terminaban en stock 0. Ahora lo unico que descarta una
    // fila es que le falte el SKU o la descripcion, y queda contado.
    const sheet: SheetRow[] = [];
    const descartadas: { fila: number; sku: string; motivo: string }[] = [];
    const vistos = new Set<string>();
    let cortadoEnFila = 0;
    for (let r = hIdx + 1; r < grid.length; r++) {
      const cells = grid[r];
      const sku = (cells[iSku] || '').trim();
      // La hoja termina con un bloque de totales que arranca con "fecha".
      // Se corta ahi, pero se DICE en que fila y cuantas quedaron sin leer,
      // para que no se pierdan filas en silencio.
      if (/^fecha$/i.test(sku)) { cortadoEnFila = r + 1; break; }
      const name = (cells[iName] || '').trim();
      if (!sku && !name) continue; // fila en blanco, no es un descarte
      if (!sku) { descartadas.push({ fila: r + 1, sku: '', motivo: 'sin SKU' }); continue; }
      if (!name) { descartadas.push({ fila: r + 1, sku, motivo: 'sin descripcion' }); continue; }
      const key = skuKey(sku);
      if (vistos.has(key)) { descartadas.push({ fila: r + 1, sku, motivo: 'SKU repetido en la hoja' }); continue; }
      vistos.add(key);
      sheet.push({
        sku,
        name,
        stock: Math.max(0, toInt(cells[iStock])),
        price: Math.max(0, toInt(cells[iPrice])),
        active: /^\s*si\s*$/i.test((cells[iActive] || '').trim()),
      });
    }

    // ---- Load products ----
    const { data: products, error: pErr } = await admin
      .from('products')
      .select('id, name, slug, sku, inv_sku, stock, active, inv_activo_hoja')
      .range(0, 9999);
    if (pErr) return json({ error: pErr.message }, 500);

    // Indice de busqueda por SKU, de mas fuerte a mas debil:
    //   1. inv_sku exacto  2. sku exacto  3. inv_sku normalizado  4. sku normalizado
    // Asi, cuando dos productos comparten un SKU parecido, gana el que coincide
    // literalmente y no el que quedo de ultimo en la lista.
    const exactoInv = new Map<string, any>();
    const exactoSku = new Map<string, any>();
    const normInv = new Map<string, any>();
    const normSku = new Map<string, any>();
    for (const p of products!) {
      if (p.inv_sku) { const v = String(p.inv_sku).trim(); exactoInv.set(v, p); normInv.set(skuKey(v), p); }
      if (p.sku) { const v = String(p.sku).trim(); if (!exactoSku.has(v)) exactoSku.set(v, p); if (!normSku.has(skuKey(v))) normSku.set(skuKey(v), p); }
    }
    const buscar = (sku: string) => {
      const v = sku.trim(), k = skuKey(v);
      return exactoInv.get(v) || exactoSku.get(v) || normInv.get(k) || normSku.get(k) || null;
    };

    // Indice por nombre normalizado. Se guarda la LISTA completa, no el ultimo:
    // saber que hay dos productos con el mismo nombre es justo lo que impide
    // emparejar mal.
    const porNombre = new Map<string, any[]>();
    for (const p of products!) {
      const k = nameKey(p.name);
      if (!k) continue;
      const lista = porNombre.get(k);
      if (lista) lista.push(p); else porNombre.set(k, [p]);
    }
    // Todos los SKU que trae la hoja hoy. Si el SKU actual de un producto sigue
    // viniendo en la hoja, ese producto NO fue reasignado: es otro producto que
    // simplemente se llama igual.
    const skusDeLaHoja = new Set<string>(sheet.map((r) => skuKey(r.sku)));

    // inv_sku tiene indice unico parcial: dos productos no pueden compartirlo.
    const invOcupados = new Set<string>(products!.filter((p) => p.inv_sku).map((p) => String(p.inv_sku).trim()));

    const slugsUsados = new Set<string>(products!.map((p) => String(p.slug || '')).filter(Boolean));
    const used = new Set<string>();
    const updates: any[] = [];
    const newRows: any[] = [];
    const conflictos: { sku: string; motivo: string }[] = [];
    // SKU que la hoja le cambio a un producto que ya existia. Se reportan para
    // que el admin lo vea, en vez de procesarlos a sus espaldas.
    const reasignados: { de: string; a: string; name: string }[] = [];
    const left = (t: string) => String(t ?? '').slice(0, 60);
    const nowIso = new Date().toISOString();

    const slugify = (s: string, sku: string) => {
      const base = `${strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'producto'}-${skuKey(sku).toLowerCase()}`;
      // El slug se fija al crear y no se vuelve a tocar, asi que solo hay que
      // garantizar que nazca unico.
      let s2 = base, n = 2;
      while (slugsUsados.has(s2)) s2 = `${base}-${n++}`;
      slugsUsados.add(s2);
      return s2;
    };

    // Campos que la hoja SI puede escribir sobre un producto existente.
    // Aqui no aparecen images, brand_id, category_id, name, slug ni description
    // a proposito: esas son del admin y la hoja no las toca nunca.
    const parcheDeHoja = (p: any, row: SheetRow, estado: string) => {
      const patch: any = {
        stock: row.stock,
        price: row.price,
        inv_estado: estado,
        inv_synced_at: nowIso,
      };
      // "Activo Web" se maneja en los dos lados: la hoja solo pisa el activo
      // cuando esa celda cambio de valor desde la ultima sincronizacion. Asi
      // un cambio hecho en el admin sobrevive hasta que alguien mueva la celda
      // a proposito en la hoja.
      if (p.inv_activo_hoja === null || p.inv_activo_hoja === undefined || p.inv_activo_hoja !== row.active) {
        patch.active = row.active;
      }
      patch.inv_activo_hoja = row.active;
      return patch;
    };

    // Toma el SKU de la hoja para un producto, respetando el indice unico de
    // inv_sku. Devuelve false si el SKU ya es de otro producto.
    const tomarSku = (p: any, nuevo: string) => {
      const destino = nuevo.trim();
      const mio = p.inv_sku ? String(p.inv_sku).trim() : '';
      if (mio === destino) return true;
      if (invOcupados.has(destino)) return false;
      if (mio) invOcupados.delete(mio);
      invOcupados.add(destino);
      return true;
    };

    for (const row of sheet) {
      const hit = buscar(row.sku);

      /* ---- 1. El SKU de la hoja ya existe en la pagina: actualizar ---- */
      if (hit && !used.has(hit.id)) {
        used.add(hit.id);
        const patch = parcheDeHoja(hit, row, 'vinculado');
        if (tomarSku(hit, row.sku)) {
          if (String(hit.inv_sku ?? '').trim() !== row.sku.trim()) patch.inv_sku = row.sku;
        } else {
          conflictos.push({ sku: row.sku, motivo: `el inv_sku ya lo tiene otro producto (${left(hit.name)})` });
        }
        updates.push({ id: hit.id, ...patch });
        continue;
      }
      if (hit) continue; // ya lo tomo otra fila; el SKU repetido ya quedo contado

      /* ---- 2. SKU nuevo: antes de crear, mirar si es un SKU reasignado ----
         La hoja a veces le cambia el codigo a un producto que ya existe. Antes
         esto creaba un clon en blanco (sin fotos, sin marca, sin categoria) y
         mandaba el producto editado a stock 0. Ahora se reasigna el SKU al
         producto existente, y solo cuando no hay ninguna duda:
           a) hay EXACTAMENTE un producto con ese nombre normalizado,
           b) ninguna otra fila de la hoja lo tomo ya,
           c) el SKU que ese producto tiene hoy ya NO viene en la hoja.
         Si (c) falla, son dos productos distintos que se llaman igual, y el
         que estamos leyendo es de verdad nuevo. Si (a) falla, hay mas de un
         candidato: no se adivina, se reporta. */
      const candidatos = (porNombre.get(nameKey(row.name)) ?? []).filter((p) => !used.has(p.id));

      if (candidatos.length === 1) {
        const p = candidatos[0];
        const suSku = skuKey(String(p.inv_sku || p.sku || ''));
        const sigueEnLaHoja = !!suSku && skusDeLaHoja.has(suSku);
        if (!sigueEnLaHoja) {
          if (!tomarSku(p, row.sku)) {
            conflictos.push({ sku: row.sku, motivo: `no se reasigno: ese inv_sku ya es de otro producto (${left(p.name)})` });
            continue;
          }
          used.add(p.id);
          const patch = parcheDeHoja(p, row, 'sku_reasignado');
          // Se reasigna el codigo. El slug NO se toca: la URL publica no cambia.
          patch.inv_sku = row.sku;
          patch.sku = row.sku;
          updates.push({ id: p.id, ...patch });
          reasignados.push({ de: String(p.inv_sku || p.sku || '—'), a: row.sku, name: left(p.name) });
          continue;
        }
        // El candidato sigue vivo en la hoja con su propio SKU: son dos
        // productos distintos con el mismo nombre. No se crea un tercero.
        conflictos.push({ sku: row.sku, motivo: `no se creo: ya existe un producto con ese mismo nombre (${left(p.name)}, SKU ${p.inv_sku || p.sku})` });
        continue;
      }

      if (candidatos.length > 1) {
        conflictos.push({ sku: row.sku, motivo: `no se creo: hay ${candidatos.length} productos con ese mismo nombre; hay que resolverlo a mano` });
        continue;
      }

      // Si el nombre ya existe pero todos sus registros los tomo otra fila de
      // la hoja, tampoco se crea: seria un duplicado por nombre.
      if ((porNombre.get(nameKey(row.name)) ?? []).length > 0) {
        conflictos.push({ sku: row.sku, motivo: 'no se creo: ya hay un producto con ese nombre vinculado a otro SKU de la hoja' });
        continue;
      }

      /* ---- 3. Producto realmente nuevo: se crea ---- */
      if (invOcupados.has(row.sku.trim())) {
        conflictos.push({ sku: row.sku, motivo: 'no se creo: ese inv_sku ya existe en otro producto' });
        continue;
      }
      invOcupados.add(row.sku.trim());
      newRows.push({
        name: row.name,
        slug: slugify(row.name, row.sku),
        inv_sku: row.sku,
        sku: row.sku,
        stock: row.stock,
        price: row.price,
        active: row.active,
        inv_activo_hoja: row.active,
        inv_estado: 'vinculado',
        inv_synced_at: nowIso,
      });
    }

    // Lo que no esta en la hoja se queda sin inventario. Los productos que no
    // tienen ningun SKU no los maneja la hoja, asi que no se tocan. Los que se
    // acaban de reasignar estan en `used` y por eso no caen aqui.
    const zero = products!
      .filter((p) => !used.has(p.id) && (p.sku || p.inv_sku))
      .map((p) => ({ id: p.id, stock: 0, inv_estado: 'sin_inventario', inv_synced_at: nowIso }));

    const sinSku = products!.filter((p) => !p.sku && !p.inv_sku).length;

    const errors: string[] = [];
    // UPDATE por id (no upsert: un upsert exigiria columnas NOT NULL como slug).
    const chunkUpdate = async (rows: any[], label: string) => {
      const seen = new Set<string>();
      for (let i = 0; i < rows.length; i += 25) {
        const slice = rows.slice(i, i + 25).filter((r) => !seen.has(r.id) && seen.add(r.id));
        const res = await Promise.all(
          slice.map(({ id, ...patch }: any) => admin.from('products').update(patch).eq('id', id)),
        );
        for (const r of res) if (r.error && errors.length < 10) errors.push(`${label}: ${r.error.message}`);
      }
    };
    if (!dryRun) {
      await chunkUpdate(updates, 'update');
      await chunkUpdate(zero, 'zero');
      // Si un lote falla, se reintenta fila por fila: una fila mala ya no
      // impide que se creen las demas, y el error dice exactamente cual es.
      for (let i = 0; i < newRows.length; i += 300) {
        const lote = newRows.slice(i, i + 300);
        const { error } = await admin.from('products').insert(lote);
        if (!error) continue;
        for (const fila of lote) {
          const r = await admin.from('products').insert([fila]);
          if (r.error) {
            conflictos.push({ sku: fila.sku, motivo: `no se pudo crear: ${r.error.message}` });
            if (errors.length < 10) errors.push(`create ${fila.sku}: ${r.error.message}`);
          }
        }
      }
    }

    return json({
      ok: true,
      dryRun,
      summary: {
        sheetRows: sheet.length,
        // Alias con los nombres viejos, para que un panel que no se haya
        // actualizado todavia siga mostrando cifras y no ceros.
        linked: updates.length,
        created: newRows.length,
        zeroed: zero.length,
        skippedDuplicates: conflictos.length,
        ambiguous: 0,
        descartadas: descartadas.length,
        products: products!.length,
        actualizados: updates.length,
        reasignados: reasignados.length,
        creados: newRows.length,
        sinInventario: zero.length,
        sinSkuNoTocados: sinSku,
        conflictos: conflictos.length,
        // Cuadre de filas: filasEnLaHoja = sheetRows + descartadas + vacias
        //                                  + filasIgnoradasDespuesDelCorte
        filasEnLaHoja: Math.max(0, grid.length - (hIdx + 1)),
        cortadoEnFila,
        filasIgnoradasDespuesDelCorte: cortadoEnFila ? Math.max(0, grid.length - cortadoEnFila) : 0,
      },
      // Las filas que la hoja trae mal formadas, para que se vean y se arreglen.
      descartadas: descartadas.slice(0, 50),
      // Productos a los que la hoja les cambio el codigo. No es un error, pero
      // el admin tiene que enterarse.
      reasignados: reasignados.slice(0, 50),
      // SKU que no se pudieron resolver sin adivinar. Cada uno se mira a mano.
      conflictos: conflictos.slice(0, 50),
      // Que productos crearia, para revisarlos antes de que entren.
      creariaEjemplos: newRows.slice(0, 50).map((r) => ({ sku: r.sku, name: r.name, stock: r.stock, price: r.price })),
      errors,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
