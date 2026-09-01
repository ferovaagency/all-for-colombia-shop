// Utilidades de SEO para emitir el canonical desde el servidor.
//
// Antes el <link rel="canonical"> lo creaba un componente con
// document.createElement dentro de un useEffect, así que no existía en el HTML
// servido y además ignoraba el query string: /tienda?categoria=tintas
// declaraba canonical /tienda y contradecía al sitemap.
//
// Ahora cada ruta lo emite en su `head`, que TanStack renderiza en el HTML del
// servidor.

export const CANONICAL_HOST = "https://allforall.com.co";

type SearchValues = Record<string, string | number | undefined | null>;

/**
 * Construye la URL canónica absoluta.
 * - Fuerza el host canónico (https, sin www)
 * - Quita la barra final salvo en la raíz
 * - Incluye solo los parámetros que se le pasen y que tengan valor,
 *   en el orden en que llegan (orden estable = canonical estable)
 */
export function canonicalUrl(path: string, search?: SearchValues): string {
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath !== "/" && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  const params = new URLSearchParams();
  if (search) {
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined || value === null || value === "") continue;
      params.append(key, String(value));
    }
  }
  const qs = params.toString();

  return `${CANONICAL_HOST}${cleanPath}${qs ? `?${qs}` : ""}`;
}

type HeadObject = {
  meta?: unknown;
  links?: unknown;
};

/**
 * Añade a un objeto `head` el <link rel="canonical"> y el og:url
 * correspondientes a `url`, conservando lo que ya traía.
 *
 * meta y links se tipan como unknown a propósito: las rutas construyen sus
 * arrays con formas distintas y el tipo estricto de TanStack
 * (React.JSX.IntrinsicElements['meta']) no acepta algunas de ellas.
 */
export function withCanonical<T extends HeadObject>(url: string, head: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any[] = Array.isArray(head.meta) ? head.meta : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links: any[] = Array.isArray(head.links) ? head.links : [];
  return {
    ...head,
    meta: [...meta, { property: "og:url", content: url }],
    links: [...links, { rel: "canonical", href: url }],
  };
}
