/**
 * Registro de documentos legales de All For All S.A.S.
 *
 * Cada documento tiene versión y fecha de entrada en vigor. Esa versión es la
 * que se guarda junto a cada consentimiento en `legal_consents`, de modo que
 * ante una reclamación se pueda acreditar QUÉ versión aceptó el usuario.
 *
 * Al publicar una nueva redacción: sube `version`, actualiza `effectiveDate` y
 * NO sobrescribas el archivo anterior (guárdalo como `-v1.md`, `-v2.md`…).
 */

import terminos from "@/content/legal/terminos-y-condiciones.md?raw";
import privacidad from "@/content/legal/politica-privacidad.md?raw";
import cookies from "@/content/legal/politica-cookies.md?raw";
import ia from "@/content/legal/politica-ia.md?raw";
import envios from "@/content/legal/politica-envios.md?raw";
import garantias from "@/content/legal/politica-garantias.md?raw";
import cambios from "@/content/legal/politica-cambios-retracto-reembolsos.md?raw";
import aviso from "@/content/legal/aviso-privacidad.md?raw";
import { LEGAL_PUBLISHED_AT, LEGAL_VERSIONS } from "@/lib/legal-versions";

export type LegalDocKey =
  | "terminos"
  | "privacidad"
  | "cookies"
  | "ia"
  | "envios"
  | "garantias"
  | "cambios"
  | "aviso";

export type LegalDoc = {
  key: LegalDocKey;
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  version: string;
  effectiveDate: string; // ISO
  body: string;
};

const PUBLISHED = LEGAL_PUBLISHED_AT;

export const LEGAL_DOCS: LegalDoc[] = [
  {
    key: "terminos",
    slug: "terminos-y-condiciones",
    title: "Términos y Condiciones de Uso y Compra",
    shortTitle: "Términos y Condiciones",
    description:
      "Condiciones que regulan el acceso al sitio, el registro, la compra de productos y el uso de herramientas de inteligencia artificial.",
    version: LEGAL_VERSIONS.terminos,
    effectiveDate: PUBLISHED,
    body: terminos,
  },
  {
    key: "privacidad",
    slug: "politica-privacidad",
    title: "Política de Privacidad y Tratamiento de Datos Personales",
    shortTitle: "Política de Privacidad",
    description:
      "Cómo recopilamos, usamos, almacenamos y protegemos tus datos personales conforme a la Ley 1581 de 2012.",
    version: LEGAL_VERSIONS.privacidad,
    effectiveDate: PUBLISHED,
    body: privacidad,
  },
  {
    key: "cookies",
    slug: "politica-cookies",
    title: "Política de Cookies",
    shortTitle: "Política de Cookies",
    description:
      "Qué cookies y tecnologías similares usamos, con qué finalidad y cómo puedes configurarlas.",
    version: LEGAL_VERSIONS.cookies,
    effectiveDate: PUBLISHED,
    body: cookies,
  },
  {
    key: "ia",
    slug: "politica-inteligencia-artificial",
    title: "Política de Uso de Inteligencia Artificial",
    shortTitle: "Política de IA",
    description:
      "Alcance, limitaciones y supervisión humana de los asistentes inteligentes del sitio.",
    version: LEGAL_VERSIONS.ia,
    effectiveDate: PUBLISHED,
    body: ia,
  },
  {
    key: "envios",
    slug: "politica-envios",
    title: "Política de Envíos",
    shortTitle: "Política de Envíos",
    description:
      "Cobertura, tiempos estimados, envío gratuito y condiciones de entrega en todo Colombia.",
    version: LEGAL_VERSIONS.envios,
    effectiveDate: PUBLISHED,
    body: envios,
  },
  {
    key: "garantias",
    slug: "politica-garantias",
    title: "Política de Garantías",
    shortTitle: "Política de Garantías",
    description:
      "Garantía legal del Estatuto del Consumidor, garantía del fabricante, coberturas y exclusiones.",
    version: LEGAL_VERSIONS.garantias,
    effectiveDate: PUBLISHED,
    body: garantias,
  },
  {
    key: "cambios",
    slug: "politica-cambios-retracto-reembolsos",
    title: "Política de Cambios, Derecho de Retracto y Reembolsos",
    shortTitle: "Cambios, Retracto y Reembolsos",
    description:
      "Plazos y condiciones para cambios, ejercicio del derecho de retracto (art. 47 Ley 1480 de 2011) y reembolsos.",
    version: LEGAL_VERSIONS.cambios,
    effectiveDate: PUBLISHED,
    body: cambios,
  },
  {
    key: "aviso",
    slug: "aviso-privacidad",
    title: "Aviso de Privacidad",
    shortTitle: "Aviso de Privacidad",
    description:
      "Resumen del tratamiento de datos personales y de los derechos que puedes ejercer como titular.",
    version: LEGAL_VERSIONS.aviso,
    effectiveDate: PUBLISHED,
    body: aviso,
  },
];

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}

export function legalDocByKey(key: LegalDocKey): LegalDoc {
  return LEGAL_DOCS.find((d) => d.key === key)!;
}

/** Identificador que se guarda en `legal_consents.policy` + `.version`. */
export function policyRef(key: LegalDocKey) {
  const d = legalDocByKey(key);
  return { policy: d.slug, version: d.version };
}

export function formatEffectiveDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const LEGAL_CONTACT = {
  company: "ALL FOR ALL S.A.S.",
  nit: "901.009.310-8",
  email: "ventas.marketplace@allforall.com.co",
  city: "Bogotá D.C., Colombia",
  site: "https://allforall.com.co",
};

export { IP_NOTICE } from "@/lib/legal-versions";
