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

export const Route = createFileRoute("/")({
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
];

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };
const DM = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBannerIndex((p) => (p + 1) % PROMO_BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

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

  const getCategoryImage = (cat: any) =>
    CATEGORY_IMAGES[cat.slug] || cat.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80";

  // Bento arrangement for categories (first = hero, next 4 = grid)
  const heroCat = categories[0];
  const bentoCats = categories.slice(1, 5);

  return (
    <div className="bg-[#0a0a1a] text-white" style={DM}>
      <h1 className="sr-only">All For All — Tienda online de tecnología, hogar y soluciones empresariales en Colombia</h1>

      {/* ============ CINEMATIC HERO ============ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-[#4f46e5]/25 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#1e1e5a]/50 blur-[120px]" />

        <div className="container mx-auto px-6 lg:px-10 relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 items-center py-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.25em] uppercase text-white/70 backdrop-blur mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] animate-pulse" />
              Todo lo que necesitas — para todos
            </div>
            <h2
              style={SPACE}
              className="text-[clamp(3.5rem,9vw,7.5rem)] font-bold leading-[0.88] tracking-[-0.055em] mb-8"
            >
              El futuro,<br />
              <span className="text-[#4f46e5]">a tu alcance.</span>
            </h2>
            <p className="text-lg md:text-xl text-white/55 max-w-lg mb-10 leading-relaxed">
              Tecnología premium, hogar inteligente y equipamiento corporativo. Financiación hasta 24 meses y envíos a todo Colombia.
            </p>

            <form onSubmit={onSearch} className="max-w-xl mb-8">
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-1.5 backdrop-blur focus-within:border-[#4f46e5] focus-within:ring-4 focus-within:ring-[#4f46e5]/20 transition-all">
                <Search className="absolute left-5 h-5 w-5 text-white/40" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="¿Qué estás buscando?"
                  className="h-12 pl-12 pr-4 bg-transparent border-0 text-white placeholder:text-white/40 text-base focus-visible:ring-0"
                />
                <Button type="submit" className="h-12 px-6 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] font-bold text-sm shadow-lg shadow-[#4f46e5]/30">
                  Buscar
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-white text-[#0a0a1a] hover:bg-white/90 rounded-full px-8 h-12 font-bold">
                <Link to="/tienda">Explorar tienda <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-full px-8 h-12 font-bold">
                <Link to="/producto-de-la-semana">Producto de la semana</Link>
              </Button>
            </div>
          </motion.div>

          {/* Hero visual: banner slider in premium frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-[#4f46e5]/20 blur-3xl rounded-[3rem]" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/50 bg-[#141432]">
              <PromoBannerSlider
                banners={PROMO_BANNERS}
                index={bannerIndex}
                onSelect={setBannerIndex}
                eagerFirst
                className="relative w-full aspect-[16/10]"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="border-y border-white/5 bg-[#0f0f24]">
        <div className="container mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <TrustItem n="01" label="Envío express" desc="A todo Colombia" icon={<Truck className="h-4 w-4" />} />
          <TrustItem n="02" label="Garantía total" desc="Cobertura oficial" icon={<ShieldCheck className="h-4 w-4" />} />
          <TrustItem n="03" label="Facturación B2B" desc="Precios corporativos" icon={<Building2 className="h-4 w-4" />} />
          <TrustItem n="04" label="Asesor IA 24/7" desc="Respuestas al instante" icon={<Sparkles className="h-4 w-4" />} />
        </div>
      </section>

      {/* ============ PRODUCTO DE LA SEMANA ============ */}
      <div className="[&_a]:!bg-none [&_a]:!bg-gradient-to-br [&_a]:!from-[#141432] [&_a]:!via-[#1e1e5a] [&_a]:!to-[#0a0a1a] [&_a]:!border [&_a]:!border-white/10">
        <WeeklyDealTeaser />
      </div>

      {/* ============ CATEGORÍAS — BENTO ASIMÉTRICO ============ */}
      {categories.length > 0 && (
        <Reveal>
          <section className="container mx-auto px-6 lg:px-10 py-24 lg:py-32">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
              <div>
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Colecciones</span>
                <h2 style={SPACE} className="text-5xl md:text-7xl font-bold tracking-[-0.04em] mt-3">
                  Explora por<br />categoría.
                </h2>
              </div>
              <Link to="/tienda" className="group inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white transition-colors">
                Ver toda la tienda
                <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 md:gap-5 min-h-[560px] md:h-[680px]">
              {heroCat && (
                <BentoCategory cat={heroCat} img={getCategoryImage(heroCat)} className="md:col-span-2 md:row-span-2" hero />
              )}
              {bentoCats.map((c, i) => (
                <BentoCategory
                  key={c.id}
                  cat={c}
                  img={getCategoryImage(c)}
                  className={i === 0 ? "md:col-span-2" : ""}
                />
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ FEATURED PRODUCTS ============ */}
      {products.length > 0 && (
        <Reveal>
          <section className="border-t border-white/5 bg-[#0f0f24]">
            <div className="container mx-auto px-6 lg:px-10 py-24">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Novedades</span>
                  <h2 style={SPACE} className="text-4xl md:text-6xl font-bold tracking-[-0.04em] mt-3">
                    Productos destacados.
                  </h2>
                </div>
                <Link to="/tienda" className="group inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white transition-colors">
                  Ver todos
                  <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-5 [&_article]:!bg-[#141432] [&_article]:!border-white/10 [&_article]:!text-white [&_h3]:!text-white [&_p]:!text-white/60">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ PROMO SLIDER ============ */}
      <Reveal>
        <section className="container mx-auto px-6 lg:px-10 py-20">
          <div className="relative">
            <div className="absolute -inset-6 bg-[#4f46e5]/10 blur-3xl rounded-[3rem]" />
            <PromoBannerSlider
              banners={PROMO_BANNERS}
              index={bannerIndex}
              onSelect={setBannerIndex}
              className="relative overflow-hidden rounded-3xl w-full aspect-[1920/585] border border-white/10 shadow-2xl shadow-black/40"
            />
          </div>
        </section>
      </Reveal>

      {/* ============ BRANDS ============ */}
      {brands.length > 0 && (
        <Reveal>
          <section className="border-y border-white/5 bg-[#0f0f24]">
            <div className="container mx-auto px-6 lg:px-10 py-16">
              <div className="text-center mb-10">
                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Aliados</span>
                <h2 style={SPACE} className="text-3xl md:text-5xl font-bold tracking-[-0.04em] mt-3">
                  Marcas que confían en nosotros.
                </h2>
              </div>
              <div className="flex flex-wrap justify-center items-center gap-3 md:gap-4">
                {brands.map((b) => (
                  <Link
                    key={b.id}
                    to={b.slug === "logitech" ? "/marcas/logitech" : "/tienda"}
                    search={b.slug === "logitech" ? undefined : ({ marca: b.slug } as any)}
                    aria-label={`Ver productos de ${b.name}`}
                    className="group bg-white/[0.03] rounded-xl border border-white/10 h-16 w-28 md:h-20 md:w-32 flex items-center justify-center p-2 hover:border-[#4f46e5]/50 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all backdrop-blur"
                  >
                    {b.logo_url || b.logo ? (
                      <img
                        src={b.logo_url || b.logo}
                        alt={b.name}
                        loading="lazy"
                        className="h-10 md:h-12 w-auto object-contain opacity-60 group-hover:opacity-100 transition-opacity brightness-0 invert"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-white/80">{b.name}</span>
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
          <section className="py-24">
            <div className="container mx-auto px-6 lg:px-10">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">Lectura</span>
                  <h2 style={SPACE} className="text-4xl md:text-5xl font-bold tracking-[-0.04em] mt-3">Consejos y guías tech.</h2>
                </div>
                <Link to="/blog" className="group inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white transition-colors">
                  Ver blog <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="group bg-[#141432] rounded-2xl overflow-hidden border border-white/10 hover:border-[#4f46e5]/50 hover:-translate-y-1 transition-all"
                  >
                    {post.cover_image && (
                      <div className="overflow-hidden aspect-[16/10]">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      {post.category && (
                        <span className="text-[10px] font-bold text-[#4f46e5] uppercase tracking-[0.2em]">
                          {post.category}
                        </span>
                      )}
                      <h3 className="font-bold text-white mt-3 line-clamp-2 text-lg group-hover:text-[#4f46e5] transition-colors" style={SPACE}>
                        {post.title}
                      </h3>
                      <p className="text-sm text-white/50 mt-2 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ CORPORATE CTA ============ */}
      <section className="pb-24">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#1e1e5a] via-[#141432] to-[#0a0a1a] p-10 md:p-16">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#4f46e5]/30 blur-[100px]" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] uppercase text-[#4f46e5]">
                  <Zap className="h-3 w-3" /> B2B
                </span>
                <h2 style={SPACE} className="text-4xl md:text-6xl font-bold tracking-[-0.04em] mt-4 leading-[0.95]">
                  Escala tu<br />empresa con nosotros.
                </h2>
                <p className="text-white/60 mt-5 max-w-lg">
                  Precios especiales, facturación electrónica y soporte dedicado para compras corporativas. Financiación y catálogo a medida.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Button asChild size="lg" className="bg-white text-[#0a0a1a] hover:bg-white/90 rounded-full px-8 h-12 font-bold w-full md:w-auto">
                  <Link to="/ventas-corporativas">Solicitar cotización <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-full px-8 h-12 font-bold w-full md:w-auto">
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
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-[#4f46e5]/15 border border-[#4f46e5]/30 flex items-center justify-center text-[#4f46e5]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#4f46e5]">{n}</div>
        <div className="font-bold text-sm mt-0.5" style={SPACE}>{label}</div>
        <div className="text-xs text-white/50">{desc}</div>
      </div>
    </div>
  );
}

function BentoCategory({
  cat,
  img,
  className = "",
  hero = false,
}: {
  cat: any;
  img: string;
  className?: string;
  hero?: boolean;
}) {
  return (
    <Link
      to="/tienda"
      search={{ categoria: cat.slug } as any}
      className={`group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#141432] transition-all duration-500 hover:border-[#4f46e5]/50 hover:-translate-y-1 ${className}`}
    >
      <div className="absolute inset-0">
        <img
          src={img}
          alt={cat.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/40 to-transparent" />
      </div>
      <div className={`relative z-10 h-full flex flex-col justify-end p-6 md:p-8 min-h-[220px] ${hero ? "md:p-10" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#4f46e5]">Colección</span>
        </div>
        <h3
          style={SPACE}
          className={`font-bold tracking-[-0.03em] leading-[0.95] drop-shadow-lg ${hero ? "text-4xl md:text-6xl" : "text-2xl md:text-3xl"}`}
        >
          {cat.name}
        </h3>
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white/80 group-hover:text-white transition-colors">
          Ver colección
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
