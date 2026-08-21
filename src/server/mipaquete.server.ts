// Load environment variables from .env file
import '../../server-env';

/**
 * mipaquete.com API v2 server helper.
 *
 * Auth: every request needs two headers:
 *   - `apikey`: a JWT obtained from POST /generateapikey (email + password).
 *   - `session-tracker`: a tracking UUID.
 *
 * The JWT embeds the mipaquete user `_id`, which createSending needs as `user`.
 * The email/password and the resulting JWT never reach the browser.
 *
 * Env:
 *   MIPAQUETE_ENV             "prod" (default) | "dev"
 *   MIPAQUETE_API_KEY         optional static JWT (skips /generateapikey)
 *   MIPAQUETE_EMAIL           account email (used when no static API key)
 *   MIPAQUETE_PASSWORD        account password
 *   MIPAQUETE_SESSION_TRACKER optional fixed session-tracker UUID
 */

const PROD_BASE = 'https://api-v2.mpr.mipaquete.com';
const DEV_BASE = 'https://api-v2.dev.mpr.mipaquete.com';

// Colombia's numeric country code in mipaquete (ISO 3166 numeric). NOT 484 (that
// is Mexico — the value shown in the docs' example is for a MX account).
export const COLOMBIA_COUNTRY_CODE = '170';

function clean(v: string | undefined) {
  return v?.trim() || undefined;
}

export function getMipaqueteBase() {
  return clean(process.env.MIPAQUETE_ENV) === 'dev' ? DEV_BASE : PROD_BASE;
}

function configError(description: string): never {
  throw new Response(JSON.stringify({ error_code: 'mipaquete_config_error', description }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

let _sessionTracker: string | null = null;
function getSessionTracker(): string {
  if (_sessionTracker) return _sessionTracker;
  _sessionTracker = clean(process.env.MIPAQUETE_SESSION_TRACKER) || crypto.randomUUID();
  return _sessionTracker;
}

/** Decode the `_id` (mipaquete user id) out of the apikey JWT payload. */
function decodeUserId(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json)?._id ?? null;
  } catch {
    return null;
  }
}

interface ApiKey {
  apiKey: string;
  userId: string | null;
  expiresAt: number;
}

let _cachedKey: ApiKey | null = null;

/**
 * Returns a valid apikey JWT (+ decoded user id), generating and caching it.
 * A static MIPAQUETE_API_KEY short-circuits the login call.
 */
export async function getApiKey(): Promise<ApiKey> {
  const now = Date.now();
  if (_cachedKey && _cachedKey.expiresAt > now + 60_000) return _cachedKey;

  const staticKey = clean(process.env.MIPAQUETE_API_KEY);
  if (staticKey) {
    _cachedKey = { apiKey: staticKey, userId: decodeUserId(staticKey), expiresAt: now + 30 * 60_000 };
    return _cachedKey;
  }

  const email = clean(process.env.MIPAQUETE_EMAIL);
  const password = clean(process.env.MIPAQUETE_PASSWORD);
  if (!email || !password) {
    configError('Configura MIPAQUETE_API_KEY, o MIPAQUETE_EMAIL y MIPAQUETE_PASSWORD, en el backend.');
  }

  const res = await fetch(`${getMipaqueteBase()}/generateapikey`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'session-tracker': getSessionTracker(),
    },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Response(
      JSON.stringify({ error_code: 'mipaquete_auth_error', http_code: res.status, description: text.slice(0, 500) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
  // Response may be the raw token string or a JSON wrapper.
  let apiKey = text.trim().replace(/^"|"$/g, '');
  try {
    const parsed = JSON.parse(text);
    apiKey = parsed?.apiKey ?? parsed?.token ?? parsed?.data ?? apiKey;
  } catch {
    /* plain token string */
  }
  if (!apiKey || apiKey.split('.').length !== 3) {
    configError('mipaquete no devolvió un apikey válido. Revisa las credenciales.');
  }

  _cachedKey = { apiKey, userId: decodeUserId(apiKey), expiresAt: now + 30 * 60_000 };
  return _cachedKey;
}

/**
 * Authenticated fetch against the mipaquete API. Returns the parsed JSON, or
 * throws a JSON Response (forwarding mipaquete's status) on error.
 */
export async function mpFetch<T = any>(
  path: string,
  init: { method: 'GET' | 'POST' | 'PUT'; body?: unknown } = { method: 'GET' },
): Promise<T> {
  const { apiKey } = await getApiKey();
  const res = await fetch(`${getMipaqueteBase()}${path}`, {
    method: init.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: apiKey,
      'session-tracker': getSessionTracker(),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!res.ok) {
    throw new Response(
      JSON.stringify({
        error_code: 'mipaquete_error',
        http_code: res.status,
        description: (payload && (payload.message || payload.error)) || String(payload).slice(0, 500),
      }),
      { status: res.status || 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return payload as T;
}

/* ---------------- Locations (DANE codes) ---------------- */

export interface MpLocation {
  locationName: string;
  locationCode: string; // DANE
  departmentOrStateName: string;
}

interface LocationCache {
  list: MpLocation[];
  expiresAt: number;
}
let _locations: LocationCache | null = null;

const foldText = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** All Colombian locations, cached in-memory (~12h). */
async function getAllLocations(): Promise<MpLocation[]> {
  const now = Date.now();
  if (_locations && _locations.expiresAt > now) return _locations.list;
  const raw = await mpFetch<any[]>('/getLocations', { method: 'GET' });
  const list: MpLocation[] = (Array.isArray(raw) ? raw : []).map((l) => ({
    locationName: l.locationName,
    locationCode: l.locationCode,
    departmentOrStateName: l.departmentOrStateName,
  }));
  _locations = { list, expiresAt: now + 12 * 60 * 60 * 1000 };
  return list;
}

/** Search locations by city name (accent-insensitive). Returns up to `limit`. */
export async function searchLocations(query: string, limit = 20): Promise<MpLocation[]> {
  const q = foldText(query);
  if (q.length < 2) return [];
  const all = await getAllLocations();
  const starts: MpLocation[] = [];
  const contains: MpLocation[] = [];
  for (const l of all) {
    const name = foldText(l.locationName);
    if (name.startsWith(q)) starts.push(l);
    else if (name.includes(q)) contains.push(l);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
