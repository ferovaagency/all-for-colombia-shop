/**
 * Versiones de los documentos legales, aisladas del contenido.
 *
 * Vive en su propio módulo porque el arranque de Consent Mode (en __root)
 * necesita la versión de la Política de Cookies sin arrastrar los ~250 KB
 * de texto legal al bundle inicial.
 *
 * Al publicar una nueva redacción sube el número aquí: los consentimientos
 * previos dejan de considerarse vigentes y se vuelve a pedir la autorización.
 */
export const LEGAL_VERSIONS = {
  terminos: "2.0",
  privacidad: "1.0",
  cookies: "1.0",
  ia: "1.0",
  envios: "1.0",
  garantias: "1.0",
  cambios: "1.0",
  aviso: "1.0",
} as const;

export type LegalDocKey = keyof typeof LEGAL_VERSIONS;

/** Slug público de cada documento. Es lo que se guarda en `legal_consents.policy`. */
export const LEGAL_SLUGS: Record<LegalDocKey, string> = {
  terminos: "terminos-y-condiciones",
  privacidad: "politica-privacidad",
  cookies: "politica-cookies",
  ia: "politica-inteligencia-artificial",
  envios: "politica-envios",
  garantias: "politica-garantias",
  cambios: "politica-cambios-retracto-reembolsos",
  aviso: "aviso-privacidad",
};

/** Nombre corto de cada documento, para menús y enlaces. */
export const LEGAL_SHORT_TITLES: Record<LegalDocKey, string> = {
  terminos: "Términos y Condiciones",
  privacidad: "Política de Privacidad",
  cookies: "Política de Cookies",
  ia: "Política de IA",
  envios: "Política de Envíos",
  garantias: "Política de Garantías",
  cambios: "Cambios, Retracto y Reembolsos",
  aviso: "Aviso de Privacidad",
};

/**
 * Lista para el footer y menús. Vive aquí —y no en `legal.ts`— para que el
 * bundle raíz no tenga que cargar el texto completo de las políticas.
 */
export const LEGAL_NAV = (Object.keys(LEGAL_SLUGS) as LegalDocKey[]).map((key) => ({
  key,
  slug: LEGAL_SLUGS[key],
  shortTitle: LEGAL_SHORT_TITLES[key],
}));

/** Aviso de propiedad intelectual del footer (cláusula 32 del documento legal). */
export const IP_NOTICE =
  "Todo el contenido de este sitio web, incluyendo imágenes, textos, diseños, logotipos, software y demás elementos, es propiedad de ALL FOR ALL S.A.S. o de sus respectivos titulares y se encuentra protegido por la legislación sobre propiedad intelectual.";

/** Fecha de entrada en vigor de esta tanda de documentos. */
export const LEGAL_PUBLISHED_AT = "2026-07-23";

/** Clave de localStorage donde se guarda la decisión de cookies. */
export const COOKIE_PREFS_KEY = "afa_cookie_consent";
