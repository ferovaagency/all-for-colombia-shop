import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Search, Sparkles, Truck, ShieldCheck, Building2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/shop/ProductCard";
import { PromoBannerSlider, type PromoBannerItem } from "@/components/shop/PromoBanner";
import { WeeklyDealTeaser } from "@/components/shop/WeeklyDealTeaser";
import { Reveal } from "@/components/shop/Reveal";
import bannerPadre from "@/assets/banner-logitech-mundial.jpg";
import bannerA50 from "@/assets/banner-logitech-gol.jpg";
import bannerMsi from "@/assets/banner-msi-juega-sin-limites.jpg";
import monitorGamer from "@/assets/monitor-gamer.png";
import { getHomeData } from "@/lib/ssr-data.functions";
import videoJbl from "@/assets/video-productos-jbl.mp4.asset.json";

export const Route = createFileRoute("/")({
  loader: () => getHomeData(),
  head: () => ({
    meta: [
      { title: "All For All — Tecnología premium, hogar y soluciones empresariales en Colombia" },
      { name: "description", content: "Compra tecnología premium, equipos para el hogar, gaming, monitores y soluciones corporativas. Envíos a todo Colombia con financiación." },
      { property: "og:title", content: "All For All — Todo lo que necesitas, para todos" },
      { property: "og:description", content: "Tu tienda online en Colombia: tecnología, hogar, equipos corporativos." },
    ],
  }),
  component: HomePage,
});

const CATEGORY_IMAGES: Record<string, string> = {
  audio: "/categorias/audio.jpg",
  gaming: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80&auto=format",
  computadores: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80&auto=format",
  "computadores-accesorios": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80&auto=format",
  "celulares-tablets": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80&auto=format",
  hogar: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format",
  "hogar-tech": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format",
  impresion: "/categorias/impresion.jpg",
  accesorios: "/categorias/accesorios.jpg",
  "ferreteria-hogar-inteligente": "/categorias/ferreteria.jpg",
  "tv-y-video": "/categorias/tv-video.jpg",
  monitores: monitorGamer,
};

const PROMO_BANNERS: PromoBannerItem[] = [
  { id: 1, image: bannerPadre, link: "/tienda", alt: "Si es Logitech, es gol — Mundial Colombia" },
  { id: 2, image: bannerA50, link: "/tienda", alt: "Si es Logitech, es gol — Mundial Colombia" },
  { id: 3, image: bannerMsi, link: "/tienda?marca=msi", alt: "MSI — Juega sin límites" },
  { id: 4, image: bannerMsi, video: videoJbl.url, link: "/tienda?marca=jbl", alt: "JBL — Sonido premium" },
];

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };
const DM = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

function HomePage() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<any[]>(initial.categories ?? []);
  const [products, setProducts] = useState<any[]>(initial.products ?? []);
  const [brands, setBrands] = useState<any[]>(initial.brands ?? []);
  const [posts, setPosts] = useState<any[]>(initial.posts ?? []);

  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBannerIndex((p) => (p + 1) % PROMO_BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const [cats, prods, brs, blog] = await Promise.all([
        supabase.from("categories").select("*").is("parent_id", null).order("sort_order"),
        supabase.from("products").select("*").eq("active", true).order("updated_at", { ascending: false }).limit(12),
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

  const getCategoryImage = (cat: any) =>
    CATEGORY_IMAGES[cat.slug] || cat.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80";

  return (
    <div className="bg-[#f7f7fb] text-[#0a0a1a]" style={DM}>
      <h1 className="sr-only">All For All — Tienda online de tecnología, hogar y soluciones empresariales en Colombia</h1>

      {/* ============ FULL-WIDTH HERO BANNER ============ */}
      <section className="relative w-full overflow-hidden bg-[#0a0a1a]">
        <PromoBannerSlider
          banners={PROMO_BANNERS}
          index={bannerIndex}
          onSelect={setBannerIndex}
          eagerFirst
          className="relative w-full aspect-video"
        />
      </section>

      {/* ============ SEARCH + INTRO ============ */}
      <section className="relative border-b border-black/5 bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-4 md:py-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4f46e5]/10 border border-[#4f46e5]/20 px-3 py-1 text-[10px] font-bold tracking-[0.25em] uppercase text-[#4f46e5] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] animate-pulse" />
              Todo lo que necesitas — para todos
            </div>
            <h2 style={SPACE} className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold leading-[0.95] tracking-[-0.04em]">
              El futuro, <span className="text-[#4f46e5]">a tu alcance.</span>
            </h2>
            <p className="text-sm text-black/60 max-w-xl mt-2">
              Tecnología premium, hogar inteligente y equipamiento corporativo. Financiación hasta 24 meses y envíos a todo Colombia.
            </p>
          </motion.div>

          <form onSubmit={onSearch} className="w-full">
            <div className="relative flex items-center bg-white border border-black/10 rounded-2xl p-1 shadow-sm focus-within:border-[#4f46e5] focus-within:ring-4 focus-within:ring-[#4f46e5]/15 transition-all">
              <Search className="absolute left-4 h-4 w-4 text-black/40" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="¿Qué estás buscando?"
                className="h-10 pl-10 pr-3 bg-transparent border-0 text-[#0a0a1a] placeholder:text-black/40 text-sm focus-visible:ring-0"
              />
              <Button type="submit" className="h-10 px-5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-sm shadow-lg shadow-[#4f46e5]/25">
                Buscar
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="border-b border-black/5 bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <TrustItem n="01" label="Envío express" desc="A todo Colombia" icon={<Truck className="h-4 w-4" />} />
          <TrustItem n="02" label="Garantía total" desc="Cobertura oficial" icon={<ShieldCheck className="h-4 w-4" />} />
          <TrustItem n="03" label="Facturación B2B" desc="Precios corporativos" icon={<Building2 className="h-4 w-4" />} />
          <TrustItem n="04" label="Asesor IA 24/7" desc="Respuestas al instante" icon={<Sparkles className="h-4 w-4" />} />
        </div>
      </section>

      {/* ============ PRODUCTO DE LA SEMANA ============ */}
      <div className="py-2">
        <WeeklyDealTeaser />
      </div>


      {/* ============ CATEGORÍAS — GRID COMPLETO ============ */}
      {categories.length > 0 && (
        <Reveal>
          <section className="container mx-auto px-6 lg:px-10 py-5 md:py-7">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Colecciones</span>
                <h2 style={SPACE} className="text-xl md:text-2xl font-bold tracking-[-0.03em] mt-1 text-[#0a0a1a]">
                  Explora por categoría
                </h2>
              </div>
              <Link to="/tienda" className="group inline-flex items-center gap-2 text-sm font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors">
                Ver toda la tienda
                <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
              {categories.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.35, delay: (i % 8) * 0.04, ease: "easeOut" }}
                >
                  <CategoryCard cat={c} img={getCategoryImage(c)} />
                </motion.div>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ FEATURED PRODUCTS ============ */}
      {products.length > 0 && (
        <Reveal>
          <section className="border-y border-black/5 bg-white">
            <div className="container mx-auto px-6 lg:px-10 py-5 md:py-7">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Novedades</span>
                  <h2 style={SPACE} className="text-xl md:text-2xl font-bold tracking-[-0.03em] mt-1 text-[#0a0a1a]">
                    Productos destacados
                  </h2>
                </div>
                <Link to="/tienda" className="group inline-flex items-center gap-2 text-sm font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors">
                  Ver todos
                  <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3">
                {products.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.3, delay: (i % 8) * 0.04 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}


      {/* ============ PROMO SLIDER (full width, natural aspect) ============ */}
      <Reveal>
        <section className="w-full bg-[#0a0a1a]">
          <PromoBannerSlider
            banners={PROMO_BANNERS}
            index={bannerIndex}
            onSelect={setBannerIndex}
            className="relative w-full aspect-video"
          />
        </section>
      </Reveal>

      {/* ============ BRANDS ============ */}
      {brands.length > 0 && (
        <Reveal>
          <section className="bg-white border-b border-black/5">
            <div className="container mx-auto px-6 lg:px-10 py-5">
              <div className="text-center mb-3">
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Aliados</span>
                <h2 style={SPACE} className="text-lg md:text-2xl font-bold tracking-[-0.03em] mt-1 text-[#0a0a1a]">
                  Marcas que confían en nosotros
                </h2>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
                {brands.map((b) => (
                  <Link
                    key={b.id}
                    to={b.slug === "logitech" ? "/marcas/logitech" : "/tienda"}
                    search={b.slug === "logitech" ? undefined : ({ marca: b.slug } as any)}
                    aria-label={`Ver productos de ${b.name}`}
                    className="group bg-white rounded-xl border border-black/10 h-12 w-20 md:h-14 md:w-24 flex items-center justify-center p-1.5 hover:border-[#4f46e5]/50 hover:-translate-y-0.5 hover:shadow-md transition-all"
                  >
                    {b.logo_url || b.logo ? (
                      <img
                        src={b.logo_url || b.logo}
                        alt={b.name}
                        loading="lazy"
                        className="h-7 md:h-9 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-[#0a0a1a]">{b.name}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ BLOG ============ */}
      {posts.length > 0 && (
        <Reveal>
          <section className="py-5 md:py-7">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Lectura</span>
                  <h2 style={SPACE} className="text-xl md:text-2xl font-bold tracking-[-0.03em] mt-1 text-[#0a0a1a]">Consejos y guías tech</h2>
                </div>
                <Link to="/blog" className="group inline-flex items-center gap-2 text-sm font-bold text-[#4f46e5] hover:text-[#4338ca] transition-colors">
                  Ver blog <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="group bg-white rounded-2xl overflow-hidden border border-black/10 hover:border-[#4f46e5]/50 hover:-translate-y-1 hover:shadow-lg transition-all"
                  >
                    {post.cover_image && (
                      <div className="overflow-hidden aspect-[16/9]">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      {post.category && (
                        <span className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-[0.2em]">
                          {post.category}
                        </span>
                      )}
                      <h3 className="font-bold text-[#0a0a1a] mt-2 line-clamp-2 text-base group-hover:text-[#4f46e5] transition-colors" style={SPACE}>
                        {post.title}
                      </h3>
                      <p className="text-sm text-black/60 mt-1 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ CORPORATE CTA ============ */}
      <section className="pb-6 pt-2">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[#1e1e5a] via-[#141432] to-[#0a0a1a] p-6 md:p-8 text-white">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#4f46e5]/30 blur-[100px]" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-4 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] uppercase text-[#a5b4fc]">
                  <Zap className="h-3 w-3" /> B2B
                </span>
                <h2 style={SPACE} className="text-2xl md:text-3xl font-bold tracking-[-0.03em] mt-2 leading-[0.95]">
                  Escala tu empresa con nosotros.
                </h2>
                <p className="text-white/70 mt-2 max-w-lg text-sm">
                  Precios especiales, facturación electrónica y soporte dedicado para compras corporativas.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <Button asChild size="lg" className="bg-white text-[#0a0a1a] hover:bg-white/90 rounded-full px-6 h-10 font-bold w-full md:w-auto">
                  <Link to="/ventas-corporativas">Solicitar cotización <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-full px-6 h-10 font-bold w-full md:w-auto">
                  <Link to="/distribuidores">Programa de distribuidores</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function TrustItem({ n, label, desc, icon }: { n: string; label: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#4f46e5]/10 border border-[#4f46e5]/20 flex items-center justify-center text-[#4f46e5]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#4f46e5]">{n}</div>
        <div className="font-bold text-sm mt-0.5 text-[#0a0a1a]" style={SPACE}>{label}</div>
        <div className="text-xs text-black/55">{desc}</div>
      </div>
    </div>
  );
}

function CategoryCard({ cat, img }: { cat: any; img: string }) {
  return (
    <Link
      to="/tienda"
      search={{ categoria: cat.slug } as any}
      className="group relative block overflow-hidden rounded-xl border border-black/10 bg-white aspect-square transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-[#4f46e5]/40"
    >
      <div className="absolute inset-0">
        <img
          src={img}
          alt={cat.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>
      <div className="relative z-10 h-full flex flex-col justify-end p-2">
        <h3
          style={SPACE}
          className="font-bold tracking-[-0.02em] leading-tight text-white text-xs md:text-sm drop-shadow-lg line-clamp-2"
        >
          {cat.name}
        </h3>
      </div>
    </Link>
  );
}

