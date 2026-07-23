/**
 * Política de envíos All For All
 * - Envío GRATIS en pedidos ≥ $200.000 para las ciudades principales.
 * - Resto del país: el flete se cotiza al confirmar el pedido.
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
export function getShippingStatus(subtotal: number, city?: string | null): ShippingStatus {
  const main = city ? findMainCity(city) : null;
  const missing = Math.max(0, FREE_SHIPPING_THRESHOLD - (subtotal || 0));

  if (!city || !city.trim()) {
    return {
      kind: "unknown",
      label: "Se calcula al indicar la ciudad",
      note: `Envío gratis desde ${formatShort(FREE_SHIPPING_THRESHOLD)} en Bogotá, Medellín, Cali y Barranquilla.`,
      missing,
      cost: null,
    };
  }

  if (!main) {
    return {
      kind: "quote",
      label: "Se cotiza al confirmar el pedido",
      note: "Para el resto del país coordinamos el flete contigo antes de despachar.",
      missing: 0,
      cost: null,
    };
  }

  if (missing > 0) {
    return {
      kind: "below",
      label: "Se cotiza al confirmar el pedido",
      note: `Te faltan ${formatShort(missing)} para envío gratis a ${main.name}.`,
      missing,
      cost: null,
    };
  }

  return {
    kind: "free",
    label: "GRATIS",
    note: `Envío gratis a ${main.name} por superar ${formatShort(FREE_SHIPPING_THRESHOLD)}.`,
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

export const FREE_SHIPPING_HEADLINE = `Envío GRATIS desde ${formatShort(FREE_SHIPPING_THRESHOLD)}`;
export const FREE_SHIPPING_CITIES_TEXT = "Bogotá · Medellín · Cali · Barranquilla";
export const FREE_SHIPPING_REST_TEXT = "Resto del país: flete cotizado al confirmar el pedido.";
