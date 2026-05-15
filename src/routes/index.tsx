import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search, Sparkles, Truck, ShieldCheck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";
import bannerPadre from "@/assets/banner-padre-logitech.jpg";
import bannerA50 from "@/assets/banner-a50x.jpg";

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

const CATEGORY_IMAGES: Record<string, string> = {
  audio: "/categorias/audio.jpg",
  gaming: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80&auto=format",
  computadores: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80&auto=format",
  "computadores-accesorios": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80&auto=format",
  "celulares-tablets": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80&auto=format",
  hogar: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format",
  "hogar-tech": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format",
  impresion: "/categorias/impresion.jpg",
  accesorios: "/categorias/accesorios.jpg",
  "ferreteria-hogar-inteligente": "/categorias/ferreteria.jpg",
  "tv-y-video": "/categorias/tv-video.jpg",
};

const PROMO_BANNERS = [
  { id: 1, image: bannerPadre, link: "/tienda", alt: "Día del Padre Logitech — G923 + A30" },
  { id: 2, image: bannerA50, link: "/tienda", alt: "Auricular Astro A50 X — Diseñados para jugar" },
];

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBannerIndex((p) => (p + 1) % PROMO_BANNERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  useEffect(() => {
    (async () => {
      const [cats, prods, brs, blog] = await Promise.all([
        supabase.from("categories").select("*").is("parent_id", null).order("sort_order"),
        supabase.from("products").select("*").eq("active", true).order("updated_at", { ascending: false }).limit(8),
        supabase.from("brands").select("*").eq("show_in_home", true).order("display_order", { ascending: true }).limit(20),
        supabase.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false }).limit(3),
      ]);
      setCategories(cats.data || []);
      setProducts(prods.data || []);
      setBrands(brs.data || []);
      setPosts(blog.data || []);
    })();
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/tienda", search: { q: q.trim() } as any });
  };

  return (
    <>
      {/* Hero - banner se adapta a la proporción real de la imagen */}
      <section className="relative overflow-hidden bg-muted">
        <Link to="/tienda" className="block w-full">
          <img
            src={bannerPadre}
            alt="Día del Padre Logitech — G923 + A30"
            className="block w-full h-auto"
            fetchPriority="high"
          />
        </Link>

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
            <button type="button" onClick={() => scrollCarousel("left")} aria-label="Anterior" className="h-10 w-10 rounded-full border bg-background hover:bg-muted flex items-center justify-center transition-smooth">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => scrollCarousel("right")} aria-label="Siguiente" className="h-10 w-10 rounded-full border bg-background hover:bg-muted flex items-center justify-center transition-smooth">
              <ChevronRight className="h-5 w-5" />
            </button>
            <Link to="/categorias" className="ml-2 text-secondary text-sm font-medium hover:underline inline-flex items-center gap-1">
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div ref={carouselRef} className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((cat) => {
            const img = CATEGORY_IMAGES[cat.slug] || cat.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80";
            return (
              <Link
                key={cat.id}
                to="/tienda"
                search={{ categoria: cat.slug } as any}
                className="group relative shrink-0 w-[200px] h-[200px] rounded-xl overflow-hidden snap-start shadow-card hover:shadow-elevated transition-smooth"
              >
                <img src={img} alt={cat.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.endsWith('/placeholder.svg')) t.src = '/placeholder.svg'; }} />
                <div className="absolute inset-0 bg-black/45 group-hover:bg-black/55 transition-colors" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="font-semibold text-base leading-tight">{cat.name}</h3>
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
      {products.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Productos destacados</h2>
              <p className="text-muted-foreground">Lo más nuevo en nuestra tienda</p>
            </div>
            <Link to="/tienda" className="text-secondary text-sm font-medium hover:underline">Ver todos →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Promo banners slider */}
      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl h-[160px] md:h-[220px]">
            {PROMO_BANNERS.map((banner, i) => (
              <Link
                key={banner.id}
                to={banner.link}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  i === bannerIndex ? "opacity-100 z-10" : "opacity-0 z-0",
                )}
              >
                <img src={banner.image} alt={banner.alt} className="w-full h-full object-cover object-center" loading="lazy" />
              </Link>
            ))}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {PROMO_BANNERS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBannerIndex(i)}
                  aria-label={`Banner ${i + 1}`}
                  className={cn("h-1.5 rounded-full transition-all", i === bannerIndex ? "w-5 bg-white" : "w-1.5 bg-white/60")}
                />
              ))}
            </div>
          </div>
        </div>
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
          <h2 className="text-2xl font-bold text-center mb-2">Marcas que confían en nosotros</h2>
          <p className="text-center text-muted-foreground text-sm mb-8">Trabajamos con los líderes de la industria</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 items-center">
            {brands.map((b) => (
              <div key={b.id} className="brand-logo-card aspect-[3/2] bg-white rounded-lg border border-border flex items-center justify-center p-3 hover:shadow-md transition-shadow">
                {b.logo_url || b.logo ? (
                  <img
                    src={b.logo_url || b.logo}
                    alt={b.name}
                    loading="lazy"
                    className="brand-logo max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <span className="block text-xs font-semibold text-foreground">{b.name}</span>
                    <span className="block text-[9px] text-muted-foreground mt-0.5">Logo pendiente</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Blog */}
      {posts.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Blog y consejos tech</h2>
                <p className="text-muted-foreground text-sm mt-1">Guías, comparativas y novedades del mundo tech</p>
              </div>
              <Link to="/blog" className="text-sm text-secondary hover:underline font-semibold">Ver todos →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-elevated transition-all"
                >
                  {post.cover_image && (
                    <div className="overflow-hidden h-44">
                      <img src={post.cover_image} alt={post.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-4">
                    {post.category && (
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider bg-secondary/10 px-2 py-0.5 rounded-full">
                        {post.category}
                      </span>
                    )}
                    <h3 className="font-bold text-foreground mt-2 line-clamp-2 text-sm group-hover:text-secondary transition-colors">{post.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
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
