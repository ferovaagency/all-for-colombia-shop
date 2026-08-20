// Inventory sync: Google Sheet (master) -> products table. Native Supabase Edge
// Function (no n8n / Make). Reads the sheet as a public CSV (no Google auth needed).
//
// Auth: call with the service-role key as Bearer (cron) OR an admin user's JWT
// (the "Sincronizar ahora" button). verify_jwt = false in config.toml.
//
// Rules: price = "Precio Web Plano"; stock = "Cantidad Disponible"; active = "Activo Web".
// Not in the sheet -> stock 0 + inv_estado 'sin_inventario'. Only stock/price/active/inv_*
// are touched, never content. First run also links existing products by name/model-code.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHEET_ID = Deno.env.get('INVENTORY_SHEET_ID') || '13798JechMiinmFH_0jGnSuDJ6U5u5F6QYGmzCl6RY6E';
// gid de la pestaña de inventario ("SKU / DESCRIPCION / Cantidad Disponible").
// '0' no existe en esta hoja, así que se ignora y se usa la pestaña real.
const ENV_GID = (Deno.env.get('INVENTORY_SHEET_GID') || '').trim();
const SHEET_GID = ENV_GID && ENV_GID !== '0' ? ENV_GID : '602957575';
const SHEET_SKU_RE = /^[A-ZÑ0-9.]{2,5}-\d{3,4}$/;
const AUTO_MATCH_MIN = 90;
const REVIEW_MIN = 72;

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

/* ---------- matching ---------- */
const strip = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const normName = (s: string) => strip(s).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('DE LA EL LOS LAS Y CON PARA POR EN UN UNA PULGADAS PULGADA'.split(' '));
const tokens = (s: string) => normName(s).split(' ').filter((t) => t && !STOP.has(t));
const codes = (s: string) => tokens(s).filter((t) => /[A-Z]/.test(t) && /\d/.test(t) && t.length >= 3);
const jaccard = (a: string[], b: string[]) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; const u = A.size + B.size - i; return u ? i / u : 0; };

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

    // ---- Read the sheet ----
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const csvRes = await fetch(url, { redirect: 'follow' });
    if (!csvRes.ok) return json({ error: `No se pudo leer la hoja (HTTP ${csvRes.status}). ¿Está pública?` }, 502);
    const grid = parseCsv(await csvRes.text());

    let hIdx = grid.findIndex((r) => r.some((c) => /^\s*sku\s*$/i.test(c)) && r.some((c) => /descripcion/i.test(c)));
    if (hIdx < 0) hIdx = 1;
    const header = grid[hIdx].map((c) => c.trim().toLowerCase());
    const col = (re: RegExp, fb: number) => { const i = header.findIndex((h) => re.test(h)); return i >= 0 ? i : fb; };
    const iSku = col(/^sku$/, 0), iName = col(/descripcion/, 1), iStock = col(/cantidad disponible/, 2), iPrice = col(/precio web plano/, 7), iActive = col(/activo web/, 8);

    const sheet: SheetRow[] = [];
    for (let r = hIdx + 1; r < grid.length; r++) {
      const cells = grid[r];
      const sku = (cells[iSku] || '').trim();
      if (/^fecha$/i.test(sku)) break;
      if (!SHEET_SKU_RE.test(sku)) continue;
      const name = (cells[iName] || '').trim();
      if (!name) continue;
      sheet.push({ sku, name, stock: Math.max(0, toInt(cells[iStock])), price: Math.max(0, toInt(cells[iPrice])), active: /^\s*si\s*$/i.test((cells[iActive] || '').trim()) });
    }

    // ---- Load products ----
    const { data: products, error: pErr } = await admin
      .from('products')
      .select('id, name, sku, inv_sku, stock')
      .range(0, 9999);
    if (pErr) return json({ error: pErr.message }, 500);

    const byInv = new Map<string, any>();
    for (const p of products!) if (p.inv_sku) byInv.set(String(p.inv_sku).trim(), p);
    const bySku = new Map<string, any>();
    for (const p of products!) if (p.sku) bySku.set(String(p.sku).trim(), p);

    const used = new Set<string>();
    const linkUpserts: any[] = [];
    const newRows: any[] = [];
    const ambiguous: any[] = [];
    const nowIso = new Date().toISOString();
    const slugify = (s: string, sku: string) =>
      `${strip(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'producto'}-${sku.toLowerCase()}`;

    // candidates for name/code match = products without a sheet-style link
    const cand = products!.filter((p) => !(p.inv_sku && SHEET_SKU_RE.test(String(p.inv_sku).trim())) && !(p.sku && SHEET_SKU_RE.test(String(p.sku).trim())));
    const candIdx = cand.map((p) => ({ p, nn: normName(p.name), tk: tokens(p.name), cd: new Set(codes(p.name)) }));

    for (const row of sheet) {
      const hit = byInv.get(row.sku) || bySku.get(row.sku);
      if (hit && !used.has(hit.id)) {
        used.add(hit.id);
        linkUpserts.push({ id: hit.id, inv_sku: row.sku, stock: row.stock, price: row.price, active: row.active, inv_estado: 'vinculado', inv_synced_at: nowIso });
        continue;
      }
      // name / model-code match
      const snn = normName(row.name), stk = tokens(row.name), scd = new Set(codes(row.name));
      let best: any = null, score = -1;
      for (const c of candIdx) {
        if (used.has(c.p.id)) continue;
        let sc = 0;
        if (snn === c.nn) sc = 100;
        else { const shared = [...scd].filter((x) => c.cd.has(x)); const j = jaccard(stk, c.tk); if (shared.length >= 2) sc = 96; else if (shared.length === 1 && j >= 0.25) sc = 92; else if (shared.length === 1) sc = 80; else sc = Math.round(j * 78); }
        if (sc > score) { score = sc; best = c.p; }
      }
      if (best && score >= AUTO_MATCH_MIN) {
        used.add(best.id);
        linkUpserts.push({ id: best.id, inv_sku: row.sku, stock: row.stock, price: row.price, active: row.active, inv_estado: 'vinculado', inv_synced_at: nowIso });
      } else if (best && score >= REVIEW_MIN) {
        ambiguous.push({ id: best.id, inv_estado: 'ambiguo', inv_synced_at: nowIso });
      } else {
        newRows.push({ name: row.name, slug: slugify(row.name, row.sku), inv_sku: row.sku, sku: row.sku, stock: row.stock, price: row.price, active: row.active, inv_estado: 'vinculado', inv_synced_at: nowIso });
      }
    }

    // Not in the sheet -> stock 0 / sin_inventario
    const zero = products!.filter((p) => !used.has(p.id) && !ambiguous.find((a) => a.id === p.id))
      .map((p) => ({ id: p.id, stock: 0, inv_estado: 'sin_inventario', inv_synced_at: nowIso }));

    const errors: string[] = [];
    // UPDATE por id (no upsert: un upsert exigiría columnas NOT NULL como slug).
    const chunkUpsert = async (rows: any[], label: string) => {
      const seen = new Set<string>();
      for (let i = 0; i < rows.length; i += 25) {
        const slice = rows.slice(i, i + 25).filter((r) => !seen.has(r.id) && seen.add(r.id));
        const res = await Promise.all(
          slice.map(({ id, ...patch }: any) => admin.from('products').update(patch).eq('id', id)),
        );
        for (const r of res) if (r.error && errors.length < 10) errors.push(`${label}: ${r.error.message}`);
      }
    };
    await chunkUpsert(linkUpserts, 'link');
    await chunkUpsert(ambiguous, 'ambiguo');
    await chunkUpsert(zero, 'zero');
    for (let i = 0; i < newRows.length; i += 300) {
      const { error } = await admin.from('products').insert(newRows.slice(i, i + 300));
      if (error) errors.push(`create: ${error.message}`);
    }

    return json({
      ok: true,
      summary: { sheetRows: sheet.length, products: products!.length, linked: linkUpserts.length, created: newRows.length, ambiguous: ambiguous.length, zeroed: zero.length },
      errors,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
