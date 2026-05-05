import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorías — All For All" },
      { name: "description", content: "Explora todas nuestras categorías de productos." },
    ],
  }),
  component: CategoriesPage,
});

const ICONS: Record<string, string> = {
  tecnologia: "💻", hogar: "🏠", "equipos-corporativos": "🏢",
  "aires-acondicionados": "❄️", ploters: "🖨️", otros: "📦",
};

function CategoriesPage() {
  const [parents, setParents] = useState<any[]>([]);
  const [children, setChildren] = useState<Record<string, any[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from("categories_with_products" as any)
        .select("*")
        .order("sort_order");
      const all = ((cats as any) || []);
      setParents(all.filter((c: any) => !c.parent_id));
      const ch: Record<string, any[]> = {};
      const cnt: Record<string, number> = {};
      all.forEach((c: any) => {
        if (c.parent_id) {
          ch[c.parent_id] = ch[c.parent_id] || [];
          ch[c.parent_id].push(c);
        }
        if (typeof c.product_count === "number") cnt[c.id] = c.product_count;
      });
      setChildren(ch);
      setCounts(cnt);
    })();
  }, []);

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
