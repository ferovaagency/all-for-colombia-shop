/**
 * Política de envíos All For All
 * - El precio de cada producto YA INCLUYE el costo de envío.
 * - Cobertura a todo el país, sin flete adicional.
 */

export const FREE_SHIPPING_THRESHOLD = 200000;

export type MainCity = { slug: string; name: string; aliases: string[] };

export const MAIN_CITIES: MainCity[] = [
  {
    slug: "bogota",
    name: "Bogotá D.C.",
    aliases: ["bogota", "bogota dc", "bogota d c", "santafe de bogota"],
  },
  { slug: "medellin", name: "Medellín", aliases: ["medellin"] },
  { slug: "cali", name: "Cali", aliases: ["cali", "santiago de cali"] },
  { slug: "barranquilla", name: "Barranquilla", aliases: ["barranquilla"] },
];

export const OTHER_CITY_VALUE = "otra";

/** Quita tildes, signos y espacios sobrantes para comparar ciudades escritas a mano. */
export function normalizeCity(raw: string): string {
  let out = "";
  for (const ch of (raw || "").normalize("NFD")) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x0300 && code <= 0x036f) continue; // marcas diacríticas
    out += ch;
  }
  return out
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findMainCity(raw: string): MainCity | null {
  const n = normalizeCity(raw);
  if (!n) return null;
  return (
    MAIN_CITIES.find((c) => c.slug === n || c.aliases.includes(n)) ??
    MAIN_CITIES.find((c) => c.aliases.some((a) => n.startsWith(a))) ??
    null
  );
}

export function isMainCity(raw: string): boolean {
  return findMainCity(raw) !== null;
}

export type ShippingStatus =
  | { kind: "unknown"; label: string; note: string; missing: number; cost: number | null }
  | { kind: "free"; label: string; note: string; missing: 0; cost: 0 }
  | { kind: "below"; label: string; note: string; missing: number; cost: null }
  | { kind: "quote"; label: string; note: string; missing: 0; cost: null };

/**
 * Estado del envío para un subtotal y una ciudad.
 * `city` vacío ⇒ todavía no sabemos a dónde va el pedido.
 */
export function getShippingStatus(_subtotal: number, _city?: string | null): ShippingStatus {
  // El precio ya incluye el envío: siempre "incluido", sin flete adicional
  // ni umbrales, para cualquier ciudad del país.
  return {
    kind: "free",
    label: "INCLUIDO",
    note: "El precio ya incluye el envío a todo el país.",
    missing: 0,
    cost: 0,
  };
}

function formatShort(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export const FREE_SHIPPING_HEADLINE = "Envío incluido en el precio";
export const FREE_SHIPPING_CITIES_TEXT = "Envíos a todo Colombia";
export const FREE_SHIPPING_REST_TEXT = "El precio ya incluye el costo de envío.";
