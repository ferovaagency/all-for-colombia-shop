/**
 * Consentimiento de cookies + Google Consent Mode v2.
 *
 * Reglas que impone el documento legal:
 *  - Nada que no sea estrictamente necesario se activa antes del consentimiento.
 *  - El usuario puede cambiar de opinión en cualquier momento.
 *  - La preferencia persiste y queda registrada con IP, User-Agent y versión.
 */

// Importa sólo versiones/slugs, NO el contenido: el banner vive en el bundle raíz.
import {
  COOKIE_PREFS_KEY,
  LEGAL_SLUGS,
  LEGAL_VERSIONS,
  type LegalDocKey,
} from "@/lib/legal-versions";

export type CookieCategory = "necessary" | "analytics" | "marketing" | "functional";

export type CookiePreferences = {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  /** Versión de la Política de Cookies aceptada. */
  version: string;
  decidedAt: string;
};

const PREFS_KEY = COOKIE_PREFS_KEY;
const GUEST_KEY = "afa_guest_id";

export const COOKIE_PREFS_EVENT = "afa_cookie_prefs_change";
export const COOKIE_PREFS_OPEN_EVENT = "afa_cookie_prefs_open";

export const ALL_DENIED: Omit<CookiePreferences, "version" | "decidedAt"> = {
  analytics: false,
  marketing: false,
  functional: false,
};

export const ALL_GRANTED: Omit<CookiePreferences, "version" | "decidedAt"> = {
  analytics: true,
  marketing: true,
  functional: true,
};

/** Identificador estable del visitante anónimo, para vincular sus consentimientos. */
export function getGuestId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return "unavailable";
  }
}

export function readCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    if (typeof parsed?.analytics !== "boolean") return null;
    // Si la política cambió de versión hay que volver a preguntar.
    if (parsed.version !== LEGAL_VERSIONS.cookies) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasDecided(): boolean {
  return readCookiePreferences() !== null;
}

/**
 * Guarda la decisión, actualiza Consent Mode y deja constancia en el servidor.
 * `persistRemote` en false permite reaplicar la preferencia guardada sin
 * generar una fila nueva en cada carga de página.
 */
export function saveCookiePreferences(
  prefs: Omit<CookiePreferences, "version" | "decidedAt">,
  opts: { persistRemote?: boolean } = {},
): CookiePreferences {
  const full: CookiePreferences = {
    ...prefs,
    version: LEGAL_VERSIONS.cookies,
    decidedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(full));
    } catch {
      /* modo privado sin almacenamiento */
    }
    applyConsentMode(full);
    window.dispatchEvent(new CustomEvent(COOKIE_PREFS_EVENT, { detail: full }));

    if (opts.persistRemote !== false) {
      // No bloquea la interfaz: la constancia se guarda en segundo plano.
      import("@/lib/consent.functions")
        .then(({ recordCookieConsent }) =>
          recordCookieConsent({
            data: {
              analytics: full.analytics,
              marketing: full.marketing,
              functional: full.functional,
              policy_version: full.version,
              guest_id: getGuestId(),
            },
          }),
        )
        .catch(() => {});
    }
  }

  return full;
}

type Gtag = (...args: unknown[]) => void;

function gtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { gtag?: Gtag; dataLayer?: unknown[] };
  if (typeof w.gtag === "function") return w.gtag;
  // Fallback: empuja directo al dataLayer si gtag.js aún no cargó.
  if (Array.isArray(w.dataLayer)) {
    return function () {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    } as Gtag;
  }
  return null;
}

/** Traduce las preferencias a las señales de Google Consent Mode v2. */
export function applyConsentMode(prefs: Omit<CookiePreferences, "version" | "decidedAt">) {
  const g = gtag();
  if (!g) return;
  const grant = (v: boolean) => (v ? "granted" : "denied");
  try {
    g("consent", "update", {
      analytics_storage: grant(prefs.analytics),
      ad_storage: grant(prefs.marketing),
      ad_user_data: grant(prefs.marketing),
      ad_personalization: grant(prefs.marketing),
      personalization_storage: grant(prefs.functional),
      functionality_storage: "granted",
      security_storage: "granted",
    });
    (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({
      event: "afa_consent_update",
      afa_analytics: prefs.analytics,
      afa_marketing: prefs.marketing,
      afa_functional: prefs.functional,
    });
  } catch {
    /* noop */
  }
}

/** Reaplica al cargar la página lo que el usuario ya había decidido. */
export function restoreConsentMode() {
  const prefs = readCookiePreferences();
  if (prefs) applyConsentMode(prefs);
}

/** Abre el centro de preferencias desde cualquier parte del sitio. */
export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_PREFS_OPEN_EVENT));
}

/**
 * Deja constancia de la aceptación de uno o varios documentos legales.
 * Falla en silencio: nunca debe impedir que el usuario complete su acción.
 */
export async function recordLegalAcceptance(input: {
  keys: LegalDocKey[];
  origin: string;
  reference?: string | null;
  userId?: string | null;
}) {
  try {
    const { recordLegalConsent } = await import("@/lib/consent.functions");
    await recordLegalConsent({
      data: {
        consents: input.keys.map((k) => ({
          policy: LEGAL_SLUGS[k],
          version: LEGAL_VERSIONS[k],
          accepted: true,
        })),
        origin: input.origin,
        guest_id: getGuestId(),
        user_id: input.userId ?? null,
        reference: input.reference ?? null,
      },
    });
  } catch {
    /* noop */
  }
}
