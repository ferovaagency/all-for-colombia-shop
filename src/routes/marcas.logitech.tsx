import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalUrl, withCanonical } from "@/lib/seo";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WideProductCard } from "@/components/shop/HomeCatalog";
import { Reveal } from "@/components/shop/Reveal";
import { LogitechColorViewer } from "@/components/shop/LogitechColorViewer";
import { LogitechVideoHero } from "@/components/shop/LogitechVideoHero";
import { ProductImage } from "@/components/shop/ProductImage";
import { formatCOP, useCart } from "@/lib/cart";
import { LOGITECH_HERO_VIDEOS } from "@/lib/logitech-hero-videos";
import { trackAddToCart } from "@/lib/analytics";
import {
  ArrowRight,
  ArrowUpRight,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marcas/logitech")({
  head: () => withCanonical(canonicalUrl("/marcas/logitech"), {
    meta: [
      {
        title: "Logitech y Logitech G en Colombia | All For All",
      },
      {
        name: "description",
        content:
          "Logitech y Logitech G en All For All: series MX, ERGO, Serie G, Racing y PRO. Envíos a todo Colombia y garantía oficial.",
      },
      { property: "og:title", content: "Tienda Logitech — All For All" },
      {
        property: "og:description",
        content: "Descubre tu espacio de trabajo ideal y juega al máximo con Logitech G.",
      },
    ],
  }),
  component: LogitechMicrosite,
});

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

// Acento de marca Logitech (teal/menta).
const TEAL = "#00B8B0";

// Degradados para los slides del hero (estilo tienda oficial).
const HERO_GRADIENTS = [
  "linear-gradient(115deg,#063b4a 0%,#0f8a8a 52%,#22c9c0 100%)",
  "linear-gradient(115deg,#0a2f57 0%,#1f7fc4 55%,#43c6e8 100%)",
  "linear-gradient(115deg,#101827 0%,#0f6f66 58%,#14b8a6 100%)",
  "linear-gradient(115deg,#3a0f52 0%,#7b2ff7 55%,#22d3ee 100%)",
  "linear-gradient(115deg,#0b1220 0%,#334155 55%,#00B8B0 100%)",
];

/**
 * Líneas oficiales de Logitech.
 * `keywords` clasifica los productos por nombre/SKU porque el catálogo aún no
 * guarda el "pilar" de Logitech como campo propio.
 * El orden importa: la primera serie que coincide se queda con el producto.
 */
type Serie = {
  key: string;
  name: string;
  label: string;
  tagline: string;
  description: string;
  keywords: string[];
  gaming?: boolean;
};

const SERIES: Serie[] = [
  {
    key: "mx",
    name: "MX",
    label: "Serie MX",
    tagline: "Herramientas para tu creatividad",
    description:
      "La línea insignia de Logitech. Precisión, materiales premium y flujos de trabajo avanzados para quienes viven del detalle.",
    keywords: [
      "mx master",
      "mx keys",
      "mx anywhere",
      "mx mechanical",
      "mx brio",
      "mx creative",
      "mx palm",
      "mx ",
    ],
  },
  {
    key: "ergo",
    name: "ERGO",
    label: "Serie ERGO",
    tagline: "Ergonomía para largas jornadas de trabajo",
    description:
      "Diseño ergonómico probado en laboratorio: postura natural de muñeca y antebrazo para trabajar horas sin molestias.",
    keywords: ["ergo", "lift", "wave keys", "k860", "m575", "vertical"],
  },
  {
    key: "gamer-pro",
    name: "PRO",
    label: "Serie PRO",
    tagline: "El equipo con el que compiten los profesionales",
    description:
      "Desarrollada junto a jugadores de esports: latencia mínima, peso ultraligero y fiabilidad de torneo.",
    keywords: ["pro x", "pro superlight", "g pro", "pro 2 lightspeed", "astro"],
    gaming: true,
  },
  {
    key: "racing",
    name: "RACING",
    label: "Sim Racing",
    tagline: "Simulación de conducción con retroalimentación real",
    description:
      "Volantes, pedales y palancas con force feedback para sentir cada curva como si estuvieras en la pista.",
    keywords: [
      "g29",
      "g920",
      "g923",
      "driving force",
      "racing wheel",
      "volante",
      "shifter",
      "pedal",
    ],
    gaming: true,
  },
  {
    key: "g",
    name: "G",
    label: "Serie G",
    tagline: "Que nadie se interponga entre tú y la victoria",
    description:
      "Gaming para todos los niveles: sensores HERO, switches LIGHTFORCE e iluminación LIGHTSYNC RGB.",
    keywords: ["logitech g", "g502", "g305", "g733", "g435", "g213", "g413", "g203", "g335", "g "],
    gaming: true,
  },
  {
    key: "lifestyle",
    name: "LIFESTYLE",
    label: "Serie Lifestyle",
    tagline: "Diseño y color que combinan con tu espacio",
    description:
      "Teclados y mouses que se ven tan bien como funcionan. Color, personalidad y tecnología inalámbrica confiable.",
    keywords: ["pop", "casa", "aurora", "studio series", "desk mat", "pebble keys"],
  },
  {
    key: "esencial",
    name: "ESENCIAL",
    label: "Serie Esencial",
    tagline: "Tecnología inalámbrica simple y confiable",
    description:
      "Lo esencial que siempre funciona: combos, teclados y mouses inalámbricos con años de batería y plug and play.",
    keywords: [
      "mk",
      "m170",
      "m185",
      "m190",
      "m280",
      "m331",
      "k380",
      "k400",
      "pebble",
      "signature",
      "m350",
      "combo",
      "b100",
      "b170",
    ],
  },
];

// Fotos ambiente oficiales por serie (estilo tienda oficial Logitech), para la
// sección "Descubre tu serie ideal".
const CDN = "https://www.logitechstore.com.co/cdn/shop/files";
const SERIES_AMBIENT: Record<string, string> = {
  mx: `${CDN}/Banner_Pilar_MX.jpg?width=800`,
  ergo: `${CDN}/download.jpg?v=1750727197&width=800`,
  lifestyle: `${CDN}/Serie-lifestyle-logi.png?v=1760473105&width=800`,
  esencial: `${CDN}/download-2.jpg?v=1750727197&width=800`,
  "gamer-pro": `${CDN}/download-3_1db57ad7-c227-426d-8562-948aa58094cd.jpg?v=1750728941&width=800`,
  racing: `${CDN}/download-1_7a1956bf-17b3-45aa-b308-57eb5211447f.jpg?v=1750728941&width=800`,
  g: `${CDN}/download_bd1b4a57-3792-48c0-b1c4-3eb344531b34.jpg?v=1750728941&width=800`,
};

const SERIE_BY_KEY = new Map(SERIES.map((s) => [s.key, s]));

function classify(product: any): string | null {
  const haystack = `${product.name ?? ""} ${product.sku ?? ""}`.toLowerCase();
  for (const s of SERIES) {
    if (s.keywords.some((k) => haystack.includes(k))) return s.key;
  }
  return null;
}

function isGaming(product: any): boolean {
  const key = classify(product);
  return !!(key && SERIE_BY_KEY.get(key)?.gaming);
}

const hasImg = (p: any) => Array.isArray(p.images) && p.images[0];

// Producto apto para vitrina (hero, mosaicos, "más destacados"): tiene imagen,
// precio real y no es un ítem de "caja dañada" / liquidación.
const showcaseOk = (p: any) =>
  hasImg(p) && Number(p.price ?? 0) > 0 && !/da[ñÃ]?ada|caja da/i.test(p.name ?? "");

function LogitechMicrosite() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSerie, setActiveSerie] = useState<string>("todas");

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

  const office = useMemo(() => products.filter((p) => !isGaming(p)), [products]);
  const gaming = useMemo(() => products.filter((p) => isGaming(p)), [products]);

  /** Productos agrupados por serie, con las series vacías descartadas. */
  const bySerie = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of products) {
      const key = classify(p);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [products]);

  const activeSeries = SERIES.filter((s) => (bySerie.get(s.key)?.length ?? 0) > 0);

  const seriesImage = (s: Serie) =>
    bySerie.get(s.key)?.find(hasImg)?.images?.[0] ?? "/placeholder.svg";

  // Slides del hero: destacados aptos para vitrina, mezclando gaming y oficina.
  const heroSlides = useMemo(() => {
    const pool0 = products.filter(showcaseOk);
    const featured = pool0.filter((p) => p.featured);
    // Intercala un gaming y un office para que el hero muestre ambas marcas.
    const base = featured.length >= 3 ? featured : pool0;
    const g = base.filter(isGaming);
    const o = base.filter((p) => !isGaming(p));
    const mixed: any[] = [];
    for (let i = 0; i < 5 && (o[i] || g[i]); i++) {
      if (o[i]) mixed.push(o[i]);
      if (g[i]) mixed.push(g[i]);
    }
    return mixed.slice(0, 5).map((p, i) => ({
      product: p,
      gradient: HERO_GRADIENTS[i % HERO_GRADIENTS.length],
      word: (SERIE_BY_KEY.get(classify(p) ?? "")?.label ?? "Logitech").toUpperCase(),
    }));
  }, [products]);

  const featuredOffice = useMemo(
    () => office.find((p) => classify(p) === "mx" && showcaseOk(p)) ?? office.find(showcaseOk),
    [office],
  );
  const featuredGaming = useMemo(
    () =>
      gaming.find((p) => classify(p) === "gamer-pro" && showcaseOk(p)) ??
      gaming.find((p) => classify(p) === "g" && showcaseOk(p)) ??
      gaming.find(showcaseOk),
    [gaming],
  );

  const filtered = activeSerie === "todas" ? products : (bySerie.get(activeSerie) ?? []);
  const enabledHeroVideos = LOGITECH_HERO_VIDEOS.filter((video) => video.enabled);

  return (
    <div className="bg-white text-neutral-950">
      {/* ============ BARRA DE MARCAS ============ */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="container mx-auto px-6 lg:px-10 h-11 flex items-center justify-center gap-4 text-sm">
          <span className="text-neutral-500">Nuestras marcas:</span>
          <a href="#office" className="font-semibold hover:opacity-70 transition-opacity">
            Logitech
          </a>
          <span className="text-neutral-300">|</span>
          <a
            href="#gaming"
            className="font-semibold hover:opacity-70 transition-opacity"
            style={{ color: TEAL }}
          >
            Logitech G
          </a>
        </div>
      </div>

      {/* ============ HERO CARRUSEL ============ */}
      {enabledHeroVideos.length > 0 ? (
        <LogitechVideoHero videos={enabledHeroVideos} />
      ) : heroSlides.length > 0 ? (
        <HeroCarousel slides={heroSlides} />
      ) : (
        <div
          className="flex items-center justify-center text-white"
          style={{ minHeight: 420, backgroundImage: HERO_GRADIENTS[0] }}
        >
          <div className="text-center px-6">
            <h1 style={SPACE} className="text-4xl md:text-6xl font-bold tracking-[-0.03em]">
              Tienda Logitech
            </h1>
            <p className="mt-3 text-white/80">Muy pronto, todo el catálogo Logitech.</p>
          </div>
        </div>
      )}

      {/* ============ BARRA DE CONFIANZA ============ */}
      <TrustBar />

      {loading && (
        <div className="container mx-auto px-6 py-16 text-center text-neutral-500">
          Cargando catálogo Logitech…
        </div>
      )}

      {/* ============ MOSAICOS DE MARCA ============ */}
      {!loading && products.length > 0 && <BrandTiles />}

      {/* ============ MÁS DESTACADOS — LOGITECH (OFICINA) ============ */}
      {office.length > 0 && (
        <section id="office" className="scroll-mt-20 bg-white">
          <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
            <SectionHeading eyebrow="Logitech" title="Conoce los más destacados" />
            <DestacadosTabs products={office} />
          </div>
        </section>
      )}

      {/* ============ DESCUBRE TU SERIE IDEAL — OFICINA ============ */}
      {featuredOffice && (
        <SerieIdealFeatured
          product={featuredOffice}
          eyebrow="Descubre tu serie ideal"
          gradient={HERO_GRADIENTS[0]}
        />
      )}

      {/* ============ MÁS DESTACADOS — LOGITECH G (GAMING) ============ */}
      {gaming.length > 0 && (
        <section id="gaming" className="scroll-mt-20 bg-neutral-950 text-white">
          <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
            <SectionHeading eyebrow="Logitech G" title="Juega al máximo" dark />
            <DestacadosTabs products={gaming} dark />
          </div>
        </section>
      )}

      {/* ============ DESCUBRE TU SERIE IDEAL — GAMING ============ */}
      {featuredGaming && (
        <SerieIdealFeatured
          product={featuredGaming}
          eyebrow="Descubre tu serie ideal"
          gradient={HERO_GRADIENTS[2]}
        />
      )}

      {/* ============ DESCUBRE TU SERIE IDEAL (fotos ambiente, estilo oficial) ============ */}
      {activeSeries.length > 0 && (
        <Reveal>
          <section className="bg-white">
            <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
              <SectionHeading eyebrow="Colecciones" title="Descubre tu serie ideal" />
              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                {activeSeries.slice(0, 4).map((s, i) => (
                  <SerieCard
                    key={s.key}
                    serie={s}
                    index={i}
                    image={SERIES_AMBIENT[s.key] ?? seriesImage(s)}
                    onSelect={() => {
                      setActiveSerie(s.key);
                      document
                        .getElementById("catalogo")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                ))}
              </div>
              {activeSeries.length > 4 && (
                <div className="mt-4 md:mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
                  {activeSeries.slice(4, 8).map((s, i) => (
                    <SerieCard
                      key={s.key}
                      serie={s}
                      index={i}
                      image={SERIES_AMBIENT[s.key] ?? seriesImage(s)}
                      onSelect={() => {
                        setActiveSerie(s.key);
                        document
                          .getElementById("catalogo")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ VISOR DE COLORES (fotos oficiales) ============ */}
      <LogitechColorViewer />

      {/* ============ CATÁLOGO COMPLETO FILTRABLE ============ */}
      {products.length > 0 && (
        <section id="catalogo" className="scroll-mt-20 bg-white">
          <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
            <SectionHeading eyebrow="Catálogo" title="Todo Logitech" />
            <p className="text-center text-neutral-500 mt-2">
              {products.length} productos disponibles
            </p>

            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-1 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  { key: "todas", label: "Todas" },
                  ...activeSeries.map((s) => ({ key: s.key, label: s.label })),
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveSerie(t.key)}
                    className={cn(
                      "shrink-0 px-4 md:px-5 py-2 text-sm whitespace-nowrap border-b-2 transition-colors",
                      activeSerie === t.key
                        ? "text-neutral-950 font-bold"
                        : "border-transparent text-neutral-500 hover:text-neutral-900",
                    )}
                    style={activeSerie === t.key ? { borderColor: TEAL } : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {filtered.map((p) => (
                <WideProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/tienda"
                search={{ marca: "logitech" } as any}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-bold hover:border-neutral-950 transition-colors"
              >
                Ver Logitech en la tienda <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ============================== HERO CARRUSEL ============================== */

function HeroCarousel({ slides }: { slides: { product: any; gradient: string; word: string }[] }) {
  const [idx, setIdx] = useState(0);
  const n = slides.length;

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n]);

  const go = (d: number) => setIdx((p) => (p + d + n) % n);
  const slide = slides[idx];
  const p = slide.product;
  const img = p.images?.[0];

  return (
    <section className="relative w-full overflow-hidden text-white" style={{ minHeight: 460 }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
          style={{ backgroundImage: slide.gradient }}
        />
      </AnimatePresence>

      {/* Palabra gigante de fondo */}
      <span
        style={SPACE}
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/10 font-black tracking-tighter leading-none text-[22vw] md:text-[16vw] select-none"
      >
        {slide.word}
      </span>

      <div className="relative container mx-auto px-6 lg:px-10 grid md:grid-cols-2 items-center gap-6 min-h-[460px] md:min-h-[540px]">
        <motion.div
          key={`txt-${idx}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="order-2 md:order-1 z-10"
        >
          <p className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-white/70 mb-3">
            Logitech
          </p>
          <h1
            style={SPACE}
            className="text-2xl md:text-5xl font-bold tracking-[-0.04em] leading-[1.05] max-w-xl line-clamp-3"
          >
            {p.name}
          </h1>
          {p.short_description && (
            <p className="mt-4 text-white/80 max-w-md text-base md:text-lg">
              {p.short_description}
            </p>
          )}
          <Link
            to="/producto/$slug"
            params={{ slug: p.slug }}
            className="mt-7 inline-flex items-center gap-2 rounded-full border-2 border-white/80 px-7 py-3 text-sm font-bold hover:bg-white hover:text-neutral-950 transition-colors"
          >
            Ver {p.name} <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div
          key={`img-${idx}`}
          initial={{ opacity: 0, scale: 0.94, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="order-1 md:order-2 z-10 flex items-center justify-center"
        >
          {img && (
            <img
              src={img}
              alt={p.name}
              className="max-h-[240px] md:max-h-[420px] w-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.35)]"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Flechas */}
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Anterior"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Siguiente"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Puntos */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Ir al slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ============================== BARRA DE CONFIANZA ============================== */

function TrustBar() {
  const items = [
    { icon: <Truck className="h-6 w-6" />, label: "Envíos a todo Colombia" },
    { icon: <ShieldCheck className="h-6 w-6" />, label: "Compra segura" },
    { icon: <PackageCheck className="h-6 w-6" />, label: "Envíos nacionales" },
    { icon: <RefreshCw className="h-6 w-6" />, label: "Garantía de devolución" },
  ];
  return (
    <section className="border-b border-neutral-200 bg-white">
      <div className="container mx-auto px-6 lg:px-10 py-6 grid grid-cols-2 md:grid-cols-4 gap-5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 justify-center md:justify-start">
            <span style={{ color: TEAL }}>{it.icon}</span>
            <span className="text-sm font-medium text-neutral-700 leading-snug">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================== MOSAICOS DE MARCA ============================== */

function BrandTiles() {
  return (
    <section className="bg-white">
      <div className="container mx-auto px-6 lg:px-10 py-10 md:py-14 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <BrandTile
          href="#office"
          img="/logitech/brand-tiles/logitech-brio-705.webp"
          width={1200}
          height={627}
          label="Explorar Logitech y conocer la cámara web MX Brio 705 for Business"
          dark={false}
        />
        <BrandTile
          href="#gaming"
          img="/logitech/brand-tiles/logitech-g-rs-h-shifter.webp"
          width={1920}
          height={1080}
          label="Explorar Logitech G y la palanca de cambios RS H-Shifter"
          dark
        />
      </div>
    </section>
  );
}

function BrandTile({
  href,
  img,
  width,
  height,
  label,
  dark,
}: {
  href: string;
  img: string;
  width: number;
  height: number;
  label: string;
  dark: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className={cn(
        "group relative block aspect-[1200/627] overflow-hidden rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950",
        dark ? "bg-black" : "bg-neutral-100",
      )}
    >
      <img
        src={img}
        alt=""
        width={width}
        height={height}
        loading="lazy"
        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
      />
    </a>
  );
}

/* ============================== TARJETA DE SERIE (foto ambiente) ============================== */

function SerieCard({
  serie,
  index,
  image,
  onSelect,
}: {
  serie: Serie;
  index: number;
  image: string;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.07 }}
      className="group relative block overflow-hidden rounded-2xl aspect-[4/5] bg-neutral-200 text-left"
    >
      <img
        src={image}
        alt={serie.label}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
        onError={(e) => {
          const t = e.target as HTMLImageElement;
          if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
        }}
      />
      {/* Degradado inferior para legibilidad del texto sobre cualquier foto. */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 md:p-5">
        <div className="text-white">
          <p
            style={SPACE}
            className="text-lg md:text-xl font-bold tracking-[-0.02em] leading-tight"
          >
            {serie.label}
          </p>
          <p className="text-xs md:text-sm text-white/80 leading-snug mt-0.5">{serie.tagline}</p>
        </div>
        <span className="shrink-0 mb-1 text-white/90 group-hover:translate-x-1 transition-transform">
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </motion.button>
  );
}

/* ============================== SECTION HEADING ============================== */

function SectionHeading({
  eyebrow,
  title,
  dark,
}: {
  eyebrow: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <div className="text-center">
      <span className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: TEAL }}>
        {eyebrow}
      </span>
      <h2
        style={SPACE}
        className={cn(
          "mt-2 text-3xl md:text-5xl font-bold tracking-[-0.03em]",
          dark ? "text-white" : "text-neutral-950",
        )}
      >
        {title}
      </h2>
    </div>
  );
}

/* ============================== DESTACADOS CON PESTAÑAS ============================== */

const orderRecent = (a: any, b: any) =>
  new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
const hasOffer = (p: any) => p.sale_price && p.price && p.sale_price < p.price;

function DestacadosTabs({ products, dark }: { products: any[]; dark?: boolean }) {
  const withImg = useMemo(() => products.filter(showcaseOk), [products]);

  const tabs = useMemo(() => {
    const nuevos = [...withImg].sort(orderRecent).slice(0, 10);
    const masVendidos = [
      ...withImg.filter((p) => p.featured),
      ...withImg
        .filter((p) => !p.featured)
        .sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0)),
    ].slice(0, 10);
    const recomendados = [
      ...withImg.filter(hasOffer),
      ...withImg.filter((p) => !hasOffer(p)),
    ].slice(0, 10);
    return [
      { key: "nuevos", label: "Nuevos", items: nuevos },
      { key: "vendidos", label: "Más Vendidos", items: masVendidos },
      { key: "recomendados", label: "Recomendados", items: recomendados },
    ].filter((t) => t.items.length > 0);
  }, [withImg]);

  const [tab, setTab] = useState(0);
  const items = tabs[tab]?.items ?? [];
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (d: number) => scroller.current?.scrollBy({ left: d * 280, behavior: "smooth" });

  if (tabs.length === 0) return null;

  return (
    <div className="mt-8">
      {/* Pestañas */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(i)}
              className={cn(
                "px-4 md:px-5 py-2 text-sm whitespace-nowrap border-b-2 transition-colors",
                tab === i
                  ? "font-bold " + (dark ? "text-white" : "text-neutral-950")
                  : "border-transparent " +
                      (dark
                        ? "text-white/50 hover:text-white"
                        : "text-neutral-500 hover:text-neutral-900"),
              )}
              style={tab === i ? { borderColor: TEAL } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Carrusel horizontal */}
      <div className="relative mt-8">
        <div
          ref={scroller}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((p) => (
            <LogiProductCard key={p.id} product={p} dark={dark} />
          ))}
        </div>

        {items.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className={cn(
                "hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full items-center justify-center shadow-lg transition-colors",
                dark
                  ? "bg-white text-neutral-950"
                  : "bg-neutral-950 text-white hover:bg-neutral-800",
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Siguiente"
              className={cn(
                "hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full items-center justify-center shadow-lg transition-colors",
                dark
                  ? "bg-white text-neutral-950"
                  : "bg-neutral-950 text-white hover:bg-neutral-800",
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LogiProductCard({ product, dark }: { product: any; dark?: boolean }) {
  const { add } = useCart();
  const img = product.images?.[0];
  const price = product.price ?? null;
  const sale = product.sale_price ?? null;
  const hasDiscount = !!sale && !!price && sale < price;
  const final = sale ?? price ?? 0;
  const pct = hasDiscount ? Math.round((1 - (sale as number) / (price as number)) * 100) : 0;

  return (
    <div
      className={cn(
        "group w-60 md:w-64 shrink-0 snap-start rounded-2xl overflow-hidden flex flex-col border",
        dark ? "bg-white/[0.04] border-white/10" : "bg-white border-neutral-200",
      )}
    >
      <Link
        to="/producto/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square bg-[#f7f7f7]"
      >
        {hasDiscount && (
          <span
            className="absolute top-3 left-3 z-10 rounded-full text-white text-[10px] font-bold px-2.5 py-1"
            style={{ backgroundColor: TEAL }}
          >
            Ahorra {pct}%
          </span>
        )}
        {img && (
          <ProductImage
            src={img}
            alt={product.name}
            className="absolute inset-0 transition-transform duration-150 group-hover:scale-[1.03]"
          />
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to="/producto/$slug" params={{ slug: product.slug }}>
          <h3
            className={cn(
              "text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem] group-hover:underline",
              dark ? "text-white" : "text-neutral-900",
            )}
          >
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className={cn("text-lg font-bold", dark ? "text-white" : "text-neutral-950")}>
            {formatCOP(final)}
          </span>
          {hasDiscount && (
            <span
              className={cn("text-xs line-through", dark ? "text-white/40" : "text-neutral-400")}
            >
              {formatCOP(price as number)}
            </span>
          )}
        </div>
        <Button
          className="mt-3 w-full rounded-full font-bold text-white hover:opacity-90"
          style={{ backgroundColor: TEAL }}
          onClick={() => {
            add({
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: final,
              image: img,
              sku: product.sku ?? undefined,
            });
            trackAddToCart({
              item_id: product.sku || product.id,
              item_name: product.name,
              price: final,
              quantity: 1,
            });
          }}
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          Agregar al carrito
        </Button>
      </div>
    </div>
  );
}

/* ============================== SERIE IDEAL — FEATURED ============================== */

function SerieIdealFeatured({
  product,
  eyebrow,
  gradient,
}: {
  product: any;
  eyebrow: string;
  gradient: string;
}) {
  const img = product.images?.[0];
  return (
    <Reveal>
      <section className="bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-10 md:py-14">
          <div
            className="relative overflow-hidden rounded-3xl text-white grid md:grid-cols-2 items-center gap-6 min-h-[320px] md:min-h-[380px]"
            style={{ backgroundImage: gradient }}
          >
            <div className="relative z-10 p-8 md:p-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">{eyebrow}</p>
              <h2
                style={SPACE}
                className="mt-3 text-2xl md:text-4xl font-bold tracking-[-0.03em] leading-[1.05] line-clamp-3"
              >
                Descubre {product.name}
              </h2>
              {product.short_description && (
                <p className="mt-4 text-white/80 max-w-md">{product.short_description}</p>
              )}
              <Link
                to="/producto/$slug"
                params={{ slug: product.slug }}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white text-neutral-950 px-7 py-3 text-sm font-bold hover:gap-3 transition-all"
              >
                Ver {product.name} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative z-10 flex items-center justify-center p-6 md:p-10">
              {img && (
                <img
                  src={img}
                  alt={product.name}
                  loading="lazy"
                  className="max-h-[220px] md:max-h-[320px] w-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.35)]"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
