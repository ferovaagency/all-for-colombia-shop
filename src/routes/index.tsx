import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { canonicalUrl, withCanonical } from "@/lib/seo";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Search, Truck, ShieldCheck, Building2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PromoBannerSlider, type PromoBannerItem } from "@/components/shop/PromoBanner";
import { DynamicCategoryGrid } from "@/components/shop/DynamicCategoryGrid";
import { HomeCatalog } from "@/components/shop/HomeCatalog";
import { BrandShowcase } from "@/components/shop/BrandShowcase";
import { Reveal } from "@/components/shop/Reveal";
import bannerMsi from "@/assets/banner-msi-juega-sin-limites.webp";
import posterJbl from "@/assets/poster-jbl.webp";
import { getHomeData } from "@/lib/ssr-data.functions";
import {
  FREE_SHIPPING_CITIES_TEXT,
  FREE_SHIPPING_HEADLINE,
  FREE_SHIPPING_REST_TEXT,
} from "@/lib/shipping";
import videoJbl from "@/assets/video-productos-jbl.mp4.asset.json";

const JBL_VIDEO_URL = `https://allforall.com.co${videoJbl.url}`;

export const Route = createFileRoute("/")({
  loader: () => getHomeData(),
  head: () => withCanonical(canonicalUrl("/"), {
    meta: [
      { title: "All For All — Tecnología, hogar y equipos en Colombia" },
      {
        name: "description",
        content:
          "Compra tecnología premium, equipos para el hogar, gaming, monitores y soluciones corporativas. Envíos a todo Colombia.",
      },
      { property: "og:title", content: "All For All — Todo lo que necesitas, para todos" },
      {
        property: "og:description",
        content:
          "Tu tienda online en Colombia: tecnología, hogar, equipos corporativos. Envíos a todo el país.",
      },
    ],
  }),
  component: HomePage,
});

const PROMO_BANNERS: PromoBannerItem[] = [
  {
    id: 1,
    image: bannerMsi,
    link: "/tienda?marca=msi",
    alt: "MSI — Juega sin límites",
    aspectRatio: "1920/585",
  },
  {
    id: 2,
    image: posterJbl,
    video: JBL_VIDEO_URL,
    link: "/tienda?marca=jbl",
    alt: "JBL — Sonido premium",
    aspectRatio: "16/9",
  },
];

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };
const DM = { fontFamily: "'DM Sans', 'Inter', sans-serif" };

function HomePage() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const categories = initial.categories ?? [];
  const products = initial.products ?? [];
  const brands = initial.brands ?? [];
  const posts = initial.posts ?? [];

  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBannerIndex((p) => (p + 1) % PROMO_BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/tienda", search: { q: q.trim() } as any });
  };

  return (
    <div className="bg-white text-neutral-950" style={DM}>
      <h1 className="sr-only">
        All For All — Tienda online de tecnología, hogar y soluciones empresariales en Colombia
      </h1>

      {/* ============ HERO BANNER ============ */}
      <section className="relative w-full overflow-hidden bg-neutral-950">
        <PromoBannerSlider
          banners={PROMO_BANNERS}
          index={bannerIndex}
          onSelect={setBannerIndex}
          eagerFirst
          className="w-full"
        />
      </section>

      {/* ============ BÚSQUEDA + ENVÍO GRATIS ============ */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-5 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-5 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase text-white mb-2">
              <Truck className="h-3 w-3" />
              {FREE_SHIPPING_HEADLINE}
            </div>
            <h2
              style={SPACE}
              className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold leading-[0.95] tracking-[-0.04em]"
            >
              El futuro, <span className="text-secondary">a tu alcance.</span>
            </h2>
            <p className="text-sm text-neutral-600 max-w-xl mt-2">
              {FREE_SHIPPING_CITIES_TEXT}. {FREE_SHIPPING_REST_TEXT} Financiación hasta 24 meses.
            </p>
          </motion.div>

          <form onSubmit={onSearch} className="w-full">
            <div className="relative flex items-center bg-white border border-neutral-200 rounded-2xl p-1 shadow-sm focus-within:border-neutral-950 focus-within:ring-4 focus-within:ring-neutral-950/10 transition-all">
              <Search className="absolute left-4 h-4 w-4 text-neutral-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="¿Qué estás buscando?"
                className="h-10 pl-10 pr-3 bg-transparent border-0 text-neutral-950 placeholder:text-neutral-400 text-sm focus-visible:ring-0"
              />
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-sm"
              >
                Buscar
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="bg-neutral-950 text-white">
        <div className="container mx-auto px-6 lg:px-10 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <TrustItem
            label="Envíos a todo el país"
            desc="El flete se calcula según tu ciudad en el checkout"
            icon={<Truck className="h-4 w-4" />}
          />
          <TrustItem
            label="Garantía total"
            desc="Cobertura oficial de fábrica"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
          <TrustItem
            label="Facturación B2B"
            desc="Precios corporativos"
            icon={<Building2 className="h-4 w-4" />}
          />
          <TrustItem
            label="Pago en cuotas"
            desc="Hasta 24 meses sin salir de casa"
            icon={<Zap className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* ============ DESTACADOS — GRID DINÁMICO POR CATEGORÍA ============ */}
      <DynamicCategoryGrid categories={categories} products={products} />

      {/* ============ CATÁLOGO (estilo Samsung, 4 por vista + Ver más) ============ */}
      <HomeCatalog
        products={products}
        categories={categories}
        title="Nuestro catálogo"
        eyebrow="Novedades y más vendidos"
      />

      {/* ============ PROMO SLIDER ============ */}
      <Reveal>
        <section className="w-full bg-neutral-950">
          <PromoBannerSlider
            banners={PROMO_BANNERS}
            index={bannerIndex}
            onSelect={setBannerIndex}
            className="w-full"
          />
        </section>
      </Reveal>

      {/* ============ SECCIONES DEDICADAS A MARCAS ============ */}
      <BrandShowcase brands={brands} products={products} max={4} />

      {/* ============ MICROSITE LOGITECH ============ */}
      <Reveal>
        <section className="bg-white">
          <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
            <Link
              to="/marcas/logitech"
              className="group relative block overflow-hidden rounded-3xl bg-neutral-950 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950"
            >
              <div aria-hidden="true" className="absolute inset-y-0 right-0 w-2/5 bg-[#00b8a9]" />
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-24 size-72 rounded-full border-[42px] border-white/20"
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-24 right-[18%] size-56 rounded-full border-[34px] border-neutral-950/25"
              />
              <div
                aria-hidden="true"
                className="absolute right-[9%] top-1/2 hidden -translate-y-1/2 md:block"
              >
                <span className="text-7xl font-bold text-neutral-950/80" style={SPACE}>
                  logi
                </span>
              </div>

              <div className="relative z-10 max-w-2xl px-8 py-14 md:px-14 md:py-20">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">
                  Microsite oficial
                </span>
                <h2
                  style={SPACE}
                  className="mt-3 max-w-md text-balance text-3xl font-bold leading-[1.05] md:text-5xl"
                >
                  Tienda Logitech
                </h2>
                <p className="mt-3 max-w-lg text-pretty text-white/75">
                  Todas las líneas: MX, ERGO, Esencial, Lifestyle, Serie G, Racing y Gamer PRO.
                  Encuentra la serie que se ajusta a cómo trabajas o juegas.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-neutral-950 px-6 py-3 text-sm font-bold group-hover:gap-3 transition-all">
                  Explorar la tienda Logitech <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        </section>
      </Reveal>

      {/* ============ BLOG ============ */}
      {posts.length > 0 && (
        <Reveal>
          <section className="bg-[#f5f5f7]">
            <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-500">
                    Lectura
                  </span>
                  <h2
                    style={SPACE}
                    className="text-2xl md:text-4xl font-bold tracking-[-0.03em] mt-1"
                  >
                    Consejos y guías tech
                  </h2>
                </div>
                <Link
                  to="/blog"
                  className="group inline-flex items-center gap-2 text-sm font-bold text-neutral-950 hover:text-neutral-600 transition-colors whitespace-nowrap"
                >
                  Ver blog{" "}
                  <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="group bg-white rounded-2xl overflow-hidden border border-neutral-200 hover:border-neutral-300 hover:-translate-y-1 hover:shadow-lg transition-all"
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
                    <div className="p-5">
                      {post.category && (
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">
                          {post.category}
                        </span>
                      )}
                      <h3
                        className="font-bold text-neutral-950 mt-2 line-clamp-2 text-base"
                        style={SPACE}
                      >
                        {post.title}
                      </h3>
                      <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{post.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ CTA CORPORATIVO ============ */}
      <section className="bg-neutral-950 text-white">
        <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">
                <Zap className="h-3 w-3" /> B2B
              </span>
              <h2
                style={SPACE}
                className="text-3xl md:text-5xl font-bold tracking-[-0.03em] mt-3 leading-[1.02]"
              >
                Escala tu empresa con nosotros.
              </h2>
              <p className="text-white/60 mt-3 max-w-lg">
                Precios especiales, facturación electrónica y soporte dedicado para compras
                corporativas.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Button
                asChild
                size="lg"
                className="bg-white text-neutral-950 hover:bg-white/90 rounded-full px-6 h-11 font-bold w-full md:w-auto"
              >
                <Link to="/ventas-corporativas">
                  Solicitar cotización <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10 rounded-full px-6 h-11 font-bold w-full md:w-auto"
              >
                <Link to="/distribuidores">Programa de distribuidores</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ label, desc, icon }: { label: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-bold text-sm text-white" style={SPACE}>
          {label}
        </div>
        <div className="text-xs text-white/55 leading-snug">{desc}</div>
      </div>
    </div>
  );
}
