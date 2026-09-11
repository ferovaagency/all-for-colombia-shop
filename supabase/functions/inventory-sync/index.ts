// Inventory sync: Google Sheet (master) -> products table. Native Supabase Edge
// Function (no n8n / Make). Reads the sheet as a public CSV (no Google auth needed).
//
// Auth: call with the service-role key as Bearer (cron) OR an admin user's JWT
// (the "Sincronizar ahora" button). verify_jwt = false in config.toml.
//
// Reglas acordadas con Mafe (11-09-2026):
//   1. Un SKU nuevo en la hoja crea el producto en la pagina.
//   2. La hoja manda en SKU, stock y precio. Si la hoja dice 0, es 0.
//   3. El nombre se edita en la pagina y la hoja NUNCA lo pisa: el producto se
//      ubica SOLO por SKU, nunca por nombre.
//   4. El slug se escribe al crear y no se vuelve a tocar jamas.
//   5. "Activo Web" se maneja en los dos lados: la hoja solo pisa el activo
//      cuando esa celda cambio respecto a la ultima sincronizacion.
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
    for (let r = hIdx + 1; r < grid.length; r++) {
      const cells = grid[r];
      const sku = (cells[iSku] || '').trim();
      if (/^fecha$/i.test(sku)) break;
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

    // Indice por SKU normalizado. inv_sku manda; sku es el respaldo.
    const porSku = new Map<string, any>();
    for (const p of products!) if (p.sku) porSku.set(skuKey(p.sku), p);
    for (const p of products!) if (p.inv_sku) porSku.set(skuKey(p.inv_sku), p);

    const slugsUsados = new Set<string>(products!.map((p) => String(p.slug || '')).filter(Boolean));
    const used = new Set<string>();
    const updates: any[] = [];
    const newRows: any[] = [];
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

    for (const row of sheet) {
      const hit = porSku.get(skuKey(row.sku));

      if (hit && !used.has(hit.id)) {
        used.add(hit.id);
        // NUNCA se escriben name ni slug: son de la pagina.
        const patch: any = {
          inv_sku: row.sku,
          stock: row.stock,
          price: row.price,
          inv_estado: 'vinculado',
          inv_synced_at: nowIso,
        };
        // "Activo Web" se maneja en los dos lados: la hoja solo pisa el activo
        // cuando esa celda cambio de valor desde la ultima sincronizacion. Asi
        // un cambio hecho en el admin sobrevive hasta que alguien mueva la
        // celda a proposito en la hoja.
        if (hit.inv_activo_hoja === null || hit.inv_activo_hoja === undefined || hit.inv_activo_hoja !== row.active) {
          patch.active = row.active;
        }
        patch.inv_activo_hoja = row.active;
        updates.push({ id: hit.id, ...patch });
        continue;
      }

      if (hit) continue; // ya lo tomo otra fila; el SKU repetido ya quedo contado

      // SKU que no existe en la pagina -> se crea. Sin adivinar por nombre.
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
    // tienen ningun SKU no los maneja la hoja, asi que no se tocan.
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
      for (let i = 0; i < newRows.length; i += 300) {
        const { error } = await admin.from('products').insert(newRows.slice(i, i + 300));
        if (error) errors.push(`create: ${error.message}`);
      }
    }

    return json({
      ok: true,
      dryRun,
      summary: {
        sheetRows: sheet.length,
        descartadas: descartadas.length,
        products: products!.length,
        actualizados: updates.length,
        creados: newRows.length,
        sinInventario: zero.length,
        sinSkuNoTocados: sinSku,
      },
      // Las filas que la hoja trae mal formadas, para que se vean y se arreglen.
      descartadas: descartadas.slice(0, 50),
      // Que productos crearia, para revisarlos antes de que entren.
      creariaEjemplos: newRows.slice(0, 50).map((r) => ({ sku: r.sku, name: r.name, stock: r.stock, price: r.price })),
      errors,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
