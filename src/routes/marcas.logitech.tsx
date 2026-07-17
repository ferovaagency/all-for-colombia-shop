import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { ArrowRight } from "lucide-react";
import bannerMundial from "@/assets/banner-logitech-mundial.jpg";
import bannerGol from "@/assets/banner-logitech-gol.jpg";

export const Route = createFileRoute("/marcas/logitech")({
  head: () => ({
    meta: [
      { title: "Logitech — All For All" },
      {
        name: "description",
        content: "Explora el catálogo Logitech en All For All: gaming, audio y accesorios de oficina. Si es Logitech, es gol.",
      },
    ],
  }),
  component: LogitechMicrosite,
});

function LogitechMicrosite() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(id, name, slug), brands!inner(slug)")
        .eq("active", true)
        .eq("brands.slug", "logitech")
        .order("updated_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    })();
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; slug: string; products: any[] }>();
    for (const p of products) {
      const cat = p.categories;
      if (!cat) continue;
      if (!map.has(cat.id)) map.set(cat.id, { name: cat.name, slug: cat.slug, products: [] });
      map.get(cat.id)!.products.push(p);
    }
    return Array.from(map.values()).filter((c) => c.products.length > 0);
  }, [products]);

  return (
    <>
      {/* Hero full-bleed */}
      <section className="relative overflow-hidden bg-black text-white">
        <div className="relative aspect-[16/9] md:aspect-[21/9]">
          <img
            src={bannerMundial}
            alt="Logitech — Si es Logitech, es gol"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-end text-center px-6 pb-12 md:pb-20">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-4">Marca oficial</p>
            <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.05]">
              Si es Logitech, es gol
            </h1>
            <p className="mt-4 text-white/70 max-w-xl">
              Gaming, audio y accesorios de oficina con la garantía y el soporte de All For All.
            </p>
            <Button asChild size="lg" className="mt-8 bg-white text-black hover:bg-white/90">
              <Link to="/tienda" search={{ marca: "logitech" } as any}>
                Ver catálogo Logitech <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {!loading && byCategory.length === 0 && (
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Muy pronto vas a encontrar aquí todo el catálogo Logitech.
        </div>
      )}

      {/* Bloques por categoría, alternando imagen/texto */}
      {byCategory.map((cat, i) => (
        <section key={cat.slug} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-10 items-center mb-10">
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <p className="text-xs uppercase tracking-[0.3em] text-secondary font-semibold mb-3">Logitech {cat.name}</p>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{cat.name}</h2>
                <p className="text-muted-foreground text-lg mb-6">
                  Diseño pensado para el día a día, con la calidad y durabilidad que Logitech garantiza en cada producto.
                </p>
                <Button asChild variant="outline">
                  <Link to="/tienda" search={{ marca: "logitech", categoria: cat.slug } as any}>
                    Ver {cat.name} Logitech <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <img
                  src={cat.products[0]?.images?.[0] || bannerGol}
                  alt={cat.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {cat.products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Cierre: grid completo */}
      {products.length > 0 && (
        <section className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-16 md:py-20">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold">Todo el catálogo Logitech</h2>
                <p className="text-white/70">{products.length} productos disponibles</p>
              </div>
              <Button asChild variant="outline" className="bg-white text-primary hover:bg-white/90 border-white">
                <Link to="/tienda" search={{ marca: "logitech" } as any}>
                  Ver todo Logitech <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
