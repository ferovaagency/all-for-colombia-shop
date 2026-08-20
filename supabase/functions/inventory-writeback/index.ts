// Inventory write-back: when a web order is paid, decrement "Cantidad Disponible"
// in the Google Sheet (the master), so the sheet stays exact for web + physical
// sales. Native Supabase Edge Function (no n8n / Make); writing to Sheets needs a
// Google service account (the only Google credential required).
//
// POST { order_id }. Auth: service-role key (server/trigger) or admin JWT.
// verify_jwt = false in config.toml.
//
// Secrets: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (PEM),
// INVENTORY_SHEET_ID, INVENTORY_SHEET_GID. The service account email must be shared
// as EDITOR on the sheet.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SHEET_ID = Deno.env.get('INVENTORY_SHEET_ID') || '13798JechMiinmFH_0jGnSuDJ6U5u5F6QYGmzCl6RY6E';
const SHEET_GID = Number(Deno.env.get('INVENTORY_SHEET_GID') || '0');

/* ---------- Google service-account auth (RS256 JWT) ---------- */
function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  const raw = atob(body);
  const der = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) der[i] = raw.charCodeAt(i);
  return der;
}
async function getAccessToken(email: string, privateKeyPem: string): Promise<string> {
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claim = b64url(enc.encode(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })));
  const data = `${header}.${claim}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(privateKeyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(data)));
  const assertion = `${data}.${b64url(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('No se pudo autenticar con Google: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- Auth ----
    const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
    let authorized = !!bearer && bearer === SERVICE_KEY;
    if (!authorized && bearer) {
      const uc = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
      const { data: u } = await uc.auth.getUser();
      if (u?.user) { const { data: isAdmin } = await admin.rpc('has_role', { _user_id: u.user.id, _role: 'admin' }); authorized = !!isAdmin; }
    }
    if (!authorized) return json({ error: 'No autorizado' }, 401);

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return json({ error: 'order_id requerido' }, 400);

    // ---- Load order + idempotency guard ----
    const { data: order, error: oErr } = await admin
      .from('orders').select('id, items, shipping_address').eq('id', order_id).maybeSingle();
    if (oErr) return json({ error: oErr.message }, 500);
    if (!order) return json({ error: 'Pedido no encontrado' }, 404);
    const ship: any = order.shipping_address ?? {};
    if (ship.stockWritebackAt) return json({ ok: true, skipped: 'ya descontado', at: ship.stockWritebackAt });

    const items: any[] = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) return json({ ok: true, note: 'pedido sin items' });

    // Resolve each item's inv_sku (sheet SKU) from the product row.
    const ids = items.map((it) => it.id).filter(Boolean);
    const { data: prods } = await admin.from('products').select('id, inv_sku').in('id', ids);
    const invById = new Map<string, string>();
    for (const p of prods || []) if (p.inv_sku) invById.set(p.id, String(p.inv_sku).trim());

    // sold quantity per inv_sku
    const sold = new Map<string, number>();
    for (const it of items) {
      const inv = invById.get(it.id) || (it.sku ? String(it.sku).trim() : '');
      if (!inv) continue;
      sold.set(inv, (sold.get(inv) || 0) + Number(it.quantity || it.qty || 1));
    }
    if (sold.size === 0) return json({ ok: true, note: 'sin SKUs de inventario que descontar' });

    // ---- Google auth ----
    const email = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const pk = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    if (!email || !pk) return json({ error: 'Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL / _PRIVATE_KEY' }, 500);
    const token = await getAccessToken(email, pk);
    const gh = { Authorization: `Bearer ${token}` };

    // Tab title for the configured gid
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets(properties(sheetId,title))`, { headers: gh });
    const meta = await metaRes.json();
    const tab = (meta.sheets || []).find((s: any) => s.properties?.sheetId === SHEET_GID)?.properties?.title;
    if (!tab) return json({ error: `No se encontró la pestaña gid=${SHEET_GID}` }, 500);

    // Read SKU (col A) + Cantidad Disponible (col C)
    const valRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tab)}!A1:C10000`, { headers: gh });
    const values: string[][] = (await valRes.json()).values || [];

    // Map inv_sku -> { rowNumber (1-based), currentQty }
    const skuRow = new Map<string, { row: number; qty: number }>();
    for (let i = 0; i < values.length; i++) {
      const sku = (values[i][0] || '').trim();
      if (!/^[A-ZÑ0-9.]{2,5}-\d{3,4}$/.test(sku)) continue;
      const qty = parseInt(String(values[i][2] ?? '').replace(/[^\d-]/g, ''), 10) || 0;
      skuRow.set(sku, { row: i + 1, qty });
    }

    // Build cell updates (column C)
    const updates: { range: string; values: number[][] }[] = [];
    const applied: Record<string, number> = {};
    for (const [inv, qty] of sold) {
      const hit = skuRow.get(inv);
      if (!hit) continue;
      const newQty = Math.max(0, hit.qty - qty);
      updates.push({ range: `${tab}!C${hit.row}`, values: [[newQty]] });
      applied[inv] = newQty;
    }
    if (updates.length === 0) return json({ ok: true, note: 'ningún SKU del pedido está en la hoja' });

    const upRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`, {
      method: 'POST',
      headers: { ...gh, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data: updates }),
    });
    if (!upRes.ok) return json({ error: 'Sheets update falló: ' + (await upRes.text()).slice(0, 300) }, 502);

    // Mark the order so we never double-decrement.
    await admin.from('orders').update({ shipping_address: { ...ship, stockWritebackAt: new Date().toISOString() } }).eq('id', order.id);

    return json({ ok: true, applied });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
