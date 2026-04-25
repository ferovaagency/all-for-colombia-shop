import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Sparkles, Truck, ShieldCheck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "All For All — Tecnología, hogar y soluciones empresariales en Colombia" },
      { name: "description", content: "Compra tecnología, equipos para el hogar, aires acondicionados, plóters y soluciones corporativas. Envíos a todo Colombia." },
      { property: "og:title", content: "All For All — Todo lo que necesitas, para todos" },
      { property: "og:description", content: "Tu tienda online en Colombia: tecnología, hogar, equipos corporativos." },
    ],
  }),
  component: HomePage,
});

const CATEGORY_ICONS: Record<string, string> = {
  tecnologia: "💻",
  hogar: "🏠",
  "equipos-corporativos": "🏢",
  "aires-acondicionados": "❄️",
  ploters: "🖨️",
  otros: "📦",
};

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [cats, prods, brs] = await Promise.all([
        supabase.from("categories").select("*").is("parent_id", null).order("sort_order"),
        supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("brands").select("*").limit(12),
      ]);
      setCategories(cats.data || []);
      setProducts(prods.data || []);
      setBrands(brs.data || []);

      const all = await supabase.from("products").select("category_id").eq("active", true);
      const c: Record<string, number> = {};
      (all.data || []).forEach((p: any) => {
        if (p.category_id) c[p.category_id] = (c[p.category_id] || 0) + 1;
      });
      setCounts(c);
    })();
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/tienda", search: { q: q.trim() } as any });
  };

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 40%)",
        }} />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs font-medium mb-5">
              <Sparkles className="h-3.5 w-3.5" /> Envíos a todo Colombia
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 animate-fade-in-up">
              Todo lo que necesitas para tu hogar y empresa
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-8 max-w-2xl">
              Tecnología, hogar, equipos corporativos, aires acondicionados, plóters y más. Entrega a todo Colombia.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link to="/tienda">Ver productos <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                <Link to="/ventas-corporativas">Ventas corporativas</Link>
              </Button>
            </div>

            {/* Search */}
            <form onSubmit={onSearch} className="mt-10 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="¿Qué estás buscando?"
                  className="h-14 pl-12 pr-32 bg-white text-foreground text-base shadow-elevated"
                />
                <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary">
                  Buscar
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-muted/40 border-y">
        <div className="container mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Trust icon={<Truck className="h-5 w-5" />} title="Envíos a todo Colombia" />
          <Trust icon={<ShieldCheck className="h-5 w-5" />} title="Compra protegida" />
          <Trust icon={<Building2 className="h-5 w-5" />} title="Facturación a empresas" />
          <Trust icon={<Sparkles className="h-5 w-5" />} title="Asesor virtual 24/7" />
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Categorías</h2>
            <p className="text-muted-foreground">Explora por tipo de producto</p>
          </div>
          <Link to="/categorias" className="text-secondary text-sm font-medium hover:underline hidden md:inline-flex items-center gap-1">
            Ver todas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to="/tienda"
              search={{ categoria: cat.slug } as any}
              className="group bg-card border rounded-xl p-6 hover:shadow-elevated hover:border-secondary transition-smooth"
            >
              <div className="text-4xl mb-3">{CATEGORY_ICONS[cat.slug] || "🛍️"}</div>
              <h3 className="font-semibold text-lg group-hover:text-secondary transition-smooth">{cat.name}</h3>
              <p className="text-sm text-muted-foreground">{counts[cat.id] || 0} producto{counts[cat.id] === 1 ? "" : "s"}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Productos destacados</h2>
            <p className="text-muted-foreground">Lo más nuevo en nuestra tienda</p>
          </div>
          <Link to="/tienda" className="text-secondary text-sm font-medium hover:underline">Ver todos →</Link>
        </div>
        {products.length === 0 ? (
          <div className="bg-muted/40 border rounded-xl p-12 text-center text-muted-foreground">
            Aún no hay productos. Agrega productos desde el panel de administración.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Corporate banner */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-hero text-primary-foreground rounded-2xl p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center shadow-elevated">
          <div>
            <Building2 className="h-10 w-10 mb-4 text-white/80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-3">¿Eres empresa?</h2>
            <p className="text-white/85 text-lg">
              Tenemos precios especiales para compras corporativas, facturación a empresa y soporte dedicado.
            </p>
          </div>
          <div className="flex md:justify-end">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link to="/ventas-corporativas">Conocer más <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Brands */}
      {brands.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">Marcas que confían en nosotros</h2>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {brands.map((b) => (
              <div key={b.id} className="grayscale hover:grayscale-0 transition-smooth opacity-70 hover:opacity-100">
                {b.logo ? (
                  <img src={b.logo} alt={b.name} className="h-12 object-contain" />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">{b.name}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Trust({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <span className="text-secondary">{icon}</span>
      <span className="font-medium">{title}</span>
    </div>
  );
}
