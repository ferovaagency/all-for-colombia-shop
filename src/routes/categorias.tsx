import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalUrl, withCanonical } from "@/lib/seo";
import { useMemo } from "react";
import { getCategoriesData } from "@/lib/ssr-data.functions";

export const Route = createFileRoute("/categorias")({
  loader: () => getCategoriesData(),
  head: () => withCanonical(canonicalUrl("/categorias"), {
    meta: [
      { title: "Categorías — All For All" },
      { name: "description", content: "Explora todas nuestras categorías de productos." },
      { property: "og:title", content: "Categorías de productos — All For All" },
      {
        property: "og:description",
        content:
          "Navega por categorías: tecnología, gaming, monitores, hogar, aires acondicionados, plóters y equipos corporativos.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CategoriesPage,
});

const ICONS: Record<string, string> = {
  tecnologia: "💻", hogar: "🏠", "equipos-corporativos": "🏢",
  "aires-acondicionados": "❄️", ploters: "🖨️", otros: "📦",
};

function CategoriesPage() {
  // Los datos llegan del loader (servidor), así que el HTML servido ya trae
  // los enlaces de categoría. Antes se pedían en un useEffect del navegador y
  // el HTML salía vacío.
  const { categories } = Route.useLoaderData();

  const { parents, children, counts } = useMemo(() => {
    const all: any[] = categories ?? [];
    const ch: Record<string, any[]> = {};
    const cnt: Record<string, number> = {};
    all.forEach((c: any) => {
      if (c.parent_id) {
        ch[c.parent_id] = ch[c.parent_id] || [];
        ch[c.parent_id].push(c);
      }
      if (typeof c.product_count === "number") cnt[c.id] = c.product_count;
    });
    return { parents: all.filter((c: any) => !c.parent_id), children: ch, counts: cnt };
  }, [categories]);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-2">Nuestras categorías</h1>
      <p className="text-muted-foreground mb-10">Encuentra justo lo que necesitas</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parents.map((cat) => (
          <Link
            key={cat.id}
            to="/tienda"
            search={{ categoria: cat.slug } as any}
            className="group bg-card border rounded-2xl p-6 hover:shadow-elevated hover:border-secondary transition-smooth"
          >
            <div className="text-5xl mb-4">{ICONS[cat.slug] || "🛍️"}</div>
            <h2 className="text-xl font-bold mb-1 group-hover:text-secondary transition-smooth">{cat.name}</h2>
            <p className="text-sm text-muted-foreground mb-3">
              {counts[cat.id] || 0} producto{counts[cat.id] === 1 ? "" : "s"}
            </p>
            {children[cat.id]?.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-1 border-t pt-3">
                {children[cat.id].map((c) => (
                  <li key={c.id}>• {c.name}</li>
                ))}
              </ul>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
