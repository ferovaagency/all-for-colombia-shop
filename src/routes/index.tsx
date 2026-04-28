import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search, Sparkles, Truck, ShieldCheck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

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

type HeroSlide = {
  image: string | null;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  badge?: string;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    image: null,
    title: "Todo lo que necesitas para tu hogar y empresa",
    subtitle: "Tecnología, hogar, equipos corporativos y más. Entrega a todo Colombia.",
    cta: "Ver productos",
    ctaLink: "/tienda",
  },
  {
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1920&q=80",
    title: "Equipos corporativos con precios especiales",
    subtitle: "Compras por volumen. Facturación y soporte incluido.",
    cta: "Cotizar ahora",
    ctaLink: "/ventas-corporativas",
  },
  {
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1920&q=80",
    badge: "NUEVO",
    title: "Aires acondicionados para tu empresa",
    subtitle: "Las mejores marcas. Entrega a todo Colombia.",
    cta: "Ver aires",
    ctaLink: "/tienda",
  },
];

const CATEGORY_IMAGES: Record<string, string> = {
  tecnologia: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80",
  hogar: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&q=80",
  "equipos-corporativos": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
  "aires-acondicionados": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80",
  ploters: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
  otros: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80",
};

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [posts, setPosts] = useState<any[]>([]);

  // Promo banners
  const promoBanners = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
      title: "Audífonos y Sonido",
      subtitle: "La mejor calidad de audio",
      cta: "Ver productos",
      link: "/tienda",
      categoria: "audifonos-diademas",
      bg: "#020f1e",
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80",
      title: "Gaming",
      subtitle: "Equipa tu setup",
      cta: "Ver gaming",
      link: "/tienda",
      categoria: "gaming",
      bg: "#568baf",
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80",
      title: "Computadores",
      subtitle: "Para trabajar y estudiar",
      cta: "Ver computadores",
      link: "/tienda",
      categoria: "computadores-accesorios",
      bg: "#3e4653",
    },
  ];
  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setBannerIndex((p) => (p + 1) % promoBanners.length),
      4000,
    );
    return () => clearInterval(t);
  }, [promoBanners.length]);

  // Hero slider
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Categories carousel
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

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
      {/* Hero slider */}
      <section className="relative overflow-hidden text-primary-foreground">
        <div className="relative h-[480px] md:h-[560px]">
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                i === current ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
              aria-hidden={i !== current}
            >
              {slide.image ? (
                <>
                  <img
                    src={slide.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={i === 0 ? "high" : "low"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/30" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-hero" />
              )}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 40%)",
              }} />

              <div className="container relative mx-auto h-full px-4 flex items-center">
                <div className="max-w-3xl">
                  {slide.badge ? (
                    <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-bold mb-5">
                      <Sparkles className="h-3.5 w-3.5" /> {slide.badge}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1 rounded-full text-xs font-medium mb-5">
                      <Sparkles className="h-3.5 w-3.5" /> Envíos a todo Colombia
                    </div>
                  )}
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/85 mb-8 max-w-2xl">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                      <Link to={slide.ctaLink}>{slide.cta} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                      <Link to="/ventas-corporativas">Ventas corporativas</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Arrows */}
          <button
            type="button"
            onClick={() => setCurrent((p) => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((p) => (p + 1) % HERO_SLIDES.length)}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Ir al slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === current ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/75",
                )}
              />
            ))}
          </div>
        </div>

        {/* Search bar overlapping the hero */}
        <div className="container mx-auto px-4 -mt-10 relative z-20">
          <form onSubmit={onSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="¿Qué estás buscando?"
                className="h-14 pl-12 pr-32 bg-white text-foreground text-base shadow-elevated border-transparent"
              />
              <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary">
                Buscar
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-muted/40 border-y mt-12">
        <div className="container mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Trust icon={<Truck className="h-5 w-5" />} title="Envíos a todo Colombia" />
          <Trust icon={<ShieldCheck className="h-5 w-5" />} title="Compra protegida" />
          <Trust icon={<Building2 className="h-5 w-5" />} title="Facturación a empresas" />
          <Trust icon={<Sparkles className="h-5 w-5" />} title="Asesor virtual 24/7" />
        </div>
      </section>

      {/* Categories carousel */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Categorías</h2>
            <p className="text-muted-foreground">Explora por tipo de producto</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              aria-label="Anterior"
              className="h-10 w-10 rounded-full border bg-background hover:bg-muted flex items-center justify-center transition-smooth"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              aria-label="Siguiente"
              className="h-10 w-10 rounded-full border bg-background hover:bg-muted flex items-center justify-center transition-smooth"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <Link to="/categorias" className="ml-2 text-secondary text-sm font-medium hover:underline inline-flex items-center gap-1">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((cat) => {
            const img = cat.image || CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES.otros;
            const productCount = counts[cat.id] || 0;
            return (
              <Link
                key={cat.id}
                to="/tienda"
                search={{ categoria: cat.slug } as any}
                className="group relative shrink-0 w-[200px] h-[200px] rounded-xl overflow-hidden snap-start shadow-card hover:shadow-elevated transition-smooth"
              >
                <img
                  src={img}
                  alt={cat.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-primary-foreground">
                  <h3 className="font-semibold text-base leading-tight">{cat.name}</h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {productCount} producto{productCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            );
          })}
          {categories.length === 0 && (
            <div className="text-sm text-muted-foreground py-8">Cargando categorías…</div>
          )}
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
