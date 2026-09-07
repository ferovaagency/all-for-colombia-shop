import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalUrl, withCanonical } from "@/lib/seo";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WideProductCard } from "@/components/shop/HomeCatalog";
import { Reveal } from "@/components/shop/Reveal";
import { ProductImage } from "@/components/shop/ProductImage";
import { formatCOP, useCart } from "@/lib/cart";
import { trackAddToCart } from "@/lib/analytics";
import {
  ArrowRight,
  ArrowUpRight,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Truck,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marcas/esenses")({
  head: () =>
    withCanonical(canonicalUrl("/marcas/esenses"), {
      meta: [
        {
          title: "Esenses en Colombia | Audífonos, relojes y parlantes | All For All",
        },
        {
          name: "description",
          content:
            "Esenses en All For All: audífonos, relojes inteligentes, parlantes, cargadores y cables. Envíos seguros a nivel nacional y garantía de 12 meses.",
        },
        { property: "og:title", content: "Tienda Esenses — All For All" },
        {
          property: "og:description",
          content: "Un mundo de posibilidades con tecnología innovadora. Esenses en All For All.",
        },
      ],
    }),
  component: EsensesMicrosite,
});

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

/** Identidad Esenses: negro, blanco y metalizados. */
const SILVER = "#B8BDC4";
const BRAND_GRADIENT = "linear-gradient(115deg,#050505 0%,#1c1f24 45%,#5b636d 100%)";
const BRAND_GRADIENT_ALT = "linear-gradient(115deg,#0a0a0a 0%,#2a2f36 50%,#8d949c 100%)";
const SLOGAN = "Un mundo de posibilidades con tecnología innovadora";

const IMG = {
  logo: "/marcas/esenses/logo.webp",
  hero1: "/marcas/esenses/hero-1.jpg",
  hero2: "/marcas/esenses/hero-2.jpg",
  hero3: "/marcas/esenses/hero-3.jpg",
  bannerParlantes: "/marcas/esenses/banner-parlantes.webp",
  diadema: "/marcas/esenses/destacado-diadema.webp",
  parlante: "/marcas/esenses/destacado-parlante.webp",
  tws: "/marcas/esenses/destacado-tws.webp",
  reloj: "/marcas/esenses/destacado-reloj.webp",
  cables: "/marcas/esenses/destacado-cables.webp",
  audioPro: "/marcas/esenses/destacado-audio-pro.webp",
  ambiente1: "/marcas/esenses/ambiente-1.webp",
  ambiente2: "/marcas/esenses/ambiente-2.webp",
  mh10A: "/marcas/esenses/insignia-mh10-a.webp",
  mh10B: "/marcas/esenses/insignia-mh10-b.webp",
  hp10000A: "/marcas/esenses/insignia-hp10000-a.jpg",
  hp10000B: "/marcas/esenses/insignia-hp10000-b.jpg",
};

/**
 * Imagen que se desmonta sola si el archivo no existe.
 * Las fotos de Esenses todavía no están en `public/marcas/esenses/`, así que
 * cualquier <img> de marca tiene que poder faltar sin dejar un ícono roto:
 * cuando falla, queda el fondo sólido/degradado del contenedor.
 */
function BrandImage({
  src,
  alt,
  className,
  onFail,
}: {
  src: string;
  alt: string;
  className?: string;
  onFail?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        setFailed(true);
        onFail?.();
      }}
    />
  );
}

/**
 * Categorías del sitio oficial de Esenses.
 * `keywords` clasifica por nombre/SKU/categoría porque el catálogo de All For
 * All no guarda la categoría de Esenses como campo propio.
 * El orden importa: la primera categoría que coincide se queda con el producto.
 */
type Categoria = {
  key: string;
  label: string;
  tagline: string;
  keywords: string[];
};

const CATEGORIAS: Categoria[] = [
  {
    key: "audifonos",
    label: "Audífonos",
    tagline: "Diadema, in-ear y TWS con sonido envolvente",
    keywords: [
      "audifono",
      "audífono",
      "auricular",
      "diadema",
      "headset",
      "headphone",
      "earbud",
      "tws",
      "in-ear",
      "manos libres",
    ],
  },
  {
    key: "relojes",
    label: "Relojes inteligentes",
    tagline: "Smartwatches para entrenar y estar conectado",
    keywords: ["smartwatch", "smart watch", "reloj", "watch", "banda inteligente", "pulsera"],
  },
  {
    key: "cables",
    label: "Cables",
    tagline: "Cables reforzados de carga y datos",
    keywords: ["cable", "usb-c", "usb c", "lightning", "micro usb", "hdmi", "adaptador"],
  },
  {
    key: "parlantes",
    label: "Parlantes",
    tagline: "Bluetooth portátiles y de alta potencia",
    keywords: ["parlante", "speaker", "bafle", "torre de sonido", "soundbar", "barra de sonido"],
  },
  {
    key: "cargadores",
    label: "Cargadores",
    tagline: "Carga rápida, inalámbrica y power banks",
    keywords: [
      "cargador",
      "carga rapida",
      "carga rápida",
      "power bank",
      "powerbank",
      "bateria",
      "batería",
      "inalambrica",
      "inalámbrica",
    ],
  },
  {
    key: "computadores",
    label: "Computadores",
    tagline: "Portátiles y accesorios de escritorio",
    keywords: [
      "computador",
      "portatil",
      "portátil",
      "laptop",
      "notebook",
      "all in one",
      "monitor",
      "teclado",
      "mouse",
    ],
  },
];

function classify(product: any): string | null {
  const haystack = `${product?.name ?? ""} ${product?.sku ?? ""} ${
    product?.categories?.name ?? ""
  }`.toLowerCase();
  for (const c of CATEGORIAS) {
    if (c.keywords.some((k) => haystack.includes(k))) return c.key;
  }
  return null;
}

const hasImg = (p: any) => Array.isArray(p.images) && p.images[0];

/** Producto apto para vitrina: con imagen, con precio real y sin ser liquidación. */
const showcaseOk = (p: any) =>
  hasImg(p) && Number(p.price ?? 0) > 0 && !/da[ñn]ada|caja da/i.test(p.name ?? "");

/* ============================== PÁGINA ============================== */

function EsensesMicrosite() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("todas");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(id, name, slug), brands!inner(slug)")
        .eq("active", true)
        .eq("brands.slug", "esenses")
        .order("updated_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    })();
  }, []);

  /** Productos agrupados por categoría, con las categorías vacías descartadas. */
  const byCat = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of products) {
      const key = classify(p);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [products]);

  const activeCategorias = CATEGORIAS.filter((c) => (byCat.get(c.key)?.length ?? 0) > 0);

  const destacados = useMemo(() => {
    const pool = products.filter(showcaseOk);
    const featured = pool.filter((p) => p.featured);
    return (featured.length >= 4 ? featured : pool).slice(0, 12);
  }, [products]);

  const estrella = activeCat === "todas" ? products : (byCat.get(activeCat) ?? []);

  return (
    <div className="bg-white text-neutral-950">
      {/* ============ HERO CARRUSEL DE BANNERS ============ */}
      <HeroCarousel />

      {/* ============ TRES PILARES DE CONFIANZA ============ */}
      <TrustBar />

      {loading && (
        <div className="container mx-auto px-6 py-16 text-center text-neutral-500">
          Cargando catálogo Esenses…
        </div>
      )}

      {/* ============ CARRUSEL DE PRODUCTOS DESTACADOS ============ */}
      {!loading && (
        <section className="bg-white">
          <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
            <SectionHeading eyebrow="Esenses" title="Productos destacados" />
            {destacados.length > 0 ? (
              <DestacadosCarrusel products={destacados} />
            ) : (
              <EmptyState text="Los productos Esenses llegan muy pronto a la tienda." />
            )}
          </div>
        </section>
      )}

      {/* ============ COLECCIONES (siempre visibles) ============ */}
      <Colecciones />

      {/* ============ EL MUNDO ESENSES (fotos de ambiente) ============ */}
      <MundoEsenses />

      {/* ============ PRODUCTOS INSIGNIA (dos vistas) ============ */}
      <Insignias />

      {/* ============ PRODUCTOS ESTRELLA POR CATEGORÍA ============ */}
      {!loading && (
        <section id="categorias" className="scroll-mt-20 bg-neutral-950 text-white">
          <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
            <SectionHeading eyebrow="Catálogo" title="Productos estrella" dark />

            {activeCategorias.length > 0 ? (
              <>
                <div className="mt-6 flex justify-center">
                  <div className="flex items-center gap-1 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {[
                      { key: "todas", label: "Todas" },
                      ...activeCategorias.map((c) => ({ key: c.key, label: c.label })),
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveCat(t.key)}
                        className={cn(
                          "shrink-0 px-4 md:px-5 py-2 text-sm whitespace-nowrap border-b-2 transition-colors",
                          activeCat === t.key
                            ? "text-white font-bold"
                            : "border-transparent text-white/50 hover:text-white",
                        )}
                        style={activeCat === t.key ? { borderColor: SILVER } : undefined}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                  {estrella.map((p) => (
                    <WideProductCard key={p.id} product={p} />
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <Link
                    to="/tienda"
                    search={{ marca: "esenses" } as any}
                    className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white hover:bg-white hover:text-neutral-950 transition-colors"
                  >
                    Ver Esenses en la tienda <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState
                dark
                text="Estamos cargando el catálogo Esenses por categoría. Muy pronto verás audífonos, relojes, parlantes y más."
              />
            )}
          </div>
        </section>
      )}

      {/* ============ BANNER PROMOCIONAL ============ */}
      <BannerParlantes />

      {/* ============ FAQ ============ */}
      <Faq />
    </div>
  );
}

/* ============================== HERO ============================== */

type HeroSlide = {
  image: string;
  gradient: string;
  eyebrow: string;
  title: string;
  text: string;
};

const HERO_SLIDES: HeroSlide[] = [
  {
    image: IMG.hero1,
    gradient: BRAND_GRADIENT,
    eyebrow: "Esenses",
    title: SLOGAN,
    text: "Audífonos, relojes inteligentes, parlantes y accesorios Esenses, disponibles en All For All con envío a todo el país.",
  },
  {
    image: IMG.hero2,
    gradient: BRAND_GRADIENT_ALT,
    eyebrow: "Audio y wearables",
    title: "Sonido y estilo en cada detalle",
    text: "Diseño en negro, blanco y acabados metalizados. Tecnología pensada para el día a día.",
  },
  {
    image: IMG.hero3,
    gradient: BRAND_GRADIENT,
    eyebrow: "Novedades",
    title: "Tecnología que acompaña tu ritmo",
    text: "Parlantes, cargadores y cables Esenses para la casa, la oficina y el camino. Garantía de 12 meses en All For All.",
  },
];

function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const n = HERO_SLIDES.length;
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n]);

  const go = (d: number) => setIdx((p) => (p + d + n) % n);
  const slide = HERO_SLIDES[idx];

  return (
    <section className="relative w-full overflow-hidden text-white" style={{ minHeight: 460 }}>
      {/* Degradado de marca: es el fondo real, la foto va encima. Si la foto
          falta, el hero se ve igual de terminado. */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
          style={{ backgroundImage: slide.gradient }}
        >
          <BrandImage
            src={slide.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
        </motion.div>
      </AnimatePresence>

      <div className="relative container mx-auto px-6 lg:px-10 flex items-center min-h-[460px] md:min-h-[560px] py-16">
        <motion.div
          key={`txt-${idx}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="z-10 max-w-2xl"
        >
          {logoOk ? (
            <BrandImage
              src={IMG.logo}
              alt="Esenses"
              className="h-8 md:h-10 w-auto object-contain mb-5"
              onFail={() => setLogoOk(false)}
            />
          ) : (
            <p
              style={SPACE}
              className="text-lg md:text-xl font-black tracking-[0.35em] uppercase mb-5"
            >
              Esenses
            </p>
          )}

          <p className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-white/60 mb-3">
            {slide.eyebrow}
          </p>
          <h1
            style={SPACE}
            className="text-3xl md:text-6xl font-bold tracking-[-0.04em] leading-[1.05]"
          >
            {slide.title}
          </h1>
          <p className="mt-5 text-white/80 max-w-lg text-base md:text-lg">{slide.text}</p>

          <Link
            to="/tienda"
            search={{ marca: "esenses" } as any}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-neutral-950 px-9 py-4 text-sm md:text-base font-black tracking-[0.12em] uppercase hover:gap-3 transition-all"
          >
            Compra ahora <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Banner anterior"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Banner siguiente"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Ir al banner ${i + 1}`}
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

/* ============================== PILARES DE CONFIANZA ============================== */

function TrustBar() {
  const items = [
    { icon: <Truck className="h-6 w-6" />, label: "Envíos seguros a nivel nacional" },
    { icon: <ShieldCheck className="h-6 w-6" />, label: "Garantía de 12 meses" },
    { icon: <Headphones className="h-6 w-6" />, label: "Soporte técnico especializado" },
  ];
  return (
    <section className="border-b border-neutral-200 bg-white">
      <div className="container mx-auto px-6 lg:px-10 py-7 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 justify-center">
            <span className="text-neutral-900">{it.icon}</span>
            <span className="text-sm font-semibold text-neutral-800 leading-snug">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================== ENCABEZADO DE SECCIÓN ============================== */

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
      <span
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.3em]",
          dark ? "text-white/60" : "text-neutral-500",
        )}
      >
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

/* ============================== ESTADO VACÍO ============================== */

function EmptyState({ text, dark }: { text: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "mt-8 rounded-2xl border border-dashed px-6 py-12 text-center",
        dark ? "border-white/20 text-white/70" : "border-neutral-300 text-neutral-600",
      )}
    >
      <p className="text-base">{text}</p>
      <Link
        to="/tienda"
        className={cn(
          "mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-colors",
          dark
            ? "bg-white text-neutral-950 hover:bg-white/90"
            : "border border-neutral-300 hover:border-neutral-950",
        )}
      >
        Ver toda la tienda <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ============================== DESTACADOS ============================== */

function DestacadosCarrusel({ products }: { products: any[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (d: number) => scroller.current?.scrollBy({ left: d * 280, behavior: "smooth" });

  return (
    <div className="relative mt-8">
      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <EsensesProductCard key={p.id} product={p} />
        ))}
      </div>

      {products.length > 3 && (
        <>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Anterior"
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full items-center justify-center shadow-lg bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Siguiente"
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full items-center justify-center shadow-lg bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

function EsensesProductCard({ product }: { product: any }) {
  const { add } = useCart();
  const img = product.images?.[0];
  const price = product.price ?? null;
  const sale = product.sale_price ?? null;
  const hasDiscount = !!sale && !!price && sale < price;
  const final = sale ?? price ?? 0;
  const pct = hasDiscount ? Math.round((1 - (sale as number) / (price as number)) * 100) : 0;

  return (
    <div className="group w-60 md:w-64 shrink-0 snap-start rounded-2xl overflow-hidden flex flex-col border bg-white border-neutral-200">
      <Link
        to="/producto/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square bg-[#f4f5f6]"
      >
        {hasDiscount && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-neutral-950 text-white text-[10px] font-bold px-2.5 py-1">
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
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem] text-neutral-900 group-hover:underline">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-neutral-950">{formatCOP(final)}</span>
          {hasDiscount && (
            <span className="text-xs line-through text-neutral-400">
              {formatCOP(price as number)}
            </span>
          )}
        </div>
        <Button
          className="mt-3 w-full rounded-full font-bold bg-neutral-950 text-white hover:bg-neutral-800"
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

/* ============================== COLECCIONES ============================== */

const COLECCIONES = [
  { image: IMG.diadema, label: "Audífonos de diadema", tagline: "Sonido envolvente" },
  { image: IMG.tws, label: "Audífonos TWS", tagline: "Libertad inalámbrica" },
  { image: IMG.parlante, label: "Parlantes", tagline: "Potencia portátil" },
  { image: IMG.reloj, label: "Relojes inteligentes", tagline: "Tu día, medido" },
  { image: IMG.cables, label: "Cables y cargadores", tagline: "Carga rápida y confiable" },
  { image: IMG.audioPro, label: "Audio profesional", tagline: "Monitoreo y estudio" },
];

function Colecciones() {
  return (
    <Reveal>
      <section className="bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
          <SectionHeading eyebrow="Colecciones" title="Explora Esenses" />
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {COLECCIONES.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.07 }}
              >
                <Link
                  to="/tienda"
                  search={{ marca: "esenses" } as any}
                  className="group relative block overflow-hidden rounded-2xl aspect-[4/5]"
                  style={{ backgroundImage: BRAND_GRADIENT }}
                >
                  <BrandImage
                    src={c.image}
                    alt={c.label}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 md:p-5">
                    <div className="text-white">
                      <p
                        style={SPACE}
                        className="text-base md:text-xl font-bold tracking-[-0.02em] leading-tight"
                      >
                        {c.label}
                      </p>
                      <p className="text-xs md:text-sm text-white/75 leading-snug mt-0.5">
                        {c.tagline}
                      </p>
                    </div>
                    <span className="shrink-0 mb-1 text-white/90 group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

/* ============================== BANNER PROMOCIONAL ============================== */

function BannerParlantes() {
  return (
    <Reveal>
      <section className="bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-10 md:py-14">
          <div
            className="relative overflow-hidden rounded-3xl text-white min-h-[300px] md:min-h-[380px] flex items-center"
            style={{ backgroundImage: BRAND_GRADIENT_ALT }}
          >
            <BrandImage
              src={IMG.bannerParlantes}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-65"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

            <div className="relative z-10 p-8 md:p-14 max-w-xl">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
                Línea de audio
              </p>
              <h2
                style={SPACE}
                className="mt-3 text-2xl md:text-4xl font-bold tracking-[-0.03em] leading-[1.08]"
              >
                Parlantes y accesorios de audio Esenses
              </h2>
              <p className="mt-4 text-white/80">
                Bluetooth portátil, torres de sonido y accesorios en acabados negros y
                metalizados. Potencia real para la casa, la oficina y el viaje.
              </p>
              <Link
                to="/tienda"
                search={{ marca: "esenses" } as any}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white text-neutral-950 px-7 py-3 text-sm font-bold hover:gap-3 transition-all"
              >
                Ver la línea de audio <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

/* ============================== FAQ ============================== */

const FAQS = [
  {
    q: "¿Es segura la compra de productos Esenses en All For All?",
    a: "Sí. All For All es una tienda colombiana con pasarela de pago certificada: los datos de tu tarjeta viajan cifrados y no quedan almacenados en nuestros servidores. Recibes la confirmación del pedido por correo y puedes hacer seguimiento del envío desde tu cuenta.",
  },
  {
    q: "¿Qué cubre la garantía de los productos Esenses?",
    a: "Todos los productos Esenses que vendemos tienen garantía de 12 meses por defectos de fábrica, contada desde la fecha de la factura. No cubre daños por golpes, humedad ni manipulación indebida. Para hacerla efectiva escríbenos desde la página de contacto con el número de pedido.",
  },
  {
    q: "¿Cómo sé si un producto Esenses es compatible con mi equipo?",
    a: "En la ficha de cada producto están las especificaciones de conexión (Bluetooth, USB-C, jack 3.5 mm) y los sistemas compatibles. Los audífonos y parlantes Bluetooth funcionan con Android e iOS, y los relojes inteligentes requieren la app del fabricante. Si tienes dudas con un modelo puntual, escríbenos antes de comprar.",
  },
  {
    q: "¿Cómo contacto al servicio al cliente?",
    a: "Desde la página de contacto de All For All puedes escribirnos por formulario o WhatsApp en horario hábil. Atendemos consultas de compra, estado de envío, garantías y soporte técnico de los productos Esenses.",
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-neutral-50 border-t border-neutral-200">
      <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20 max-w-3xl">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Antes de comprar" />
        <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
          {FAQS.map((f, i) => (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="w-full flex items-center justify-between gap-4 py-5 text-left"
              >
                <span className="text-base md:text-lg font-semibold text-neutral-900">{f.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-neutral-500 transition-transform",
                    open === i && "rotate-180",
                  )}
                />
              </button>
              {open === i && (
                <p className="pb-5 -mt-1 text-neutral-600 leading-relaxed">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== EL MUNDO ESENSES ============================== */

const AMBIENTES = [
  {
    image: IMG.ambiente1,
    title: "Para tu día",
    text: "Audio y wearables que acompañan el trabajo, el gimnasio y el camino.",
  },
  {
    image: IMG.ambiente2,
    title: "Para tu espacio",
    text: "Sonido y accesorios con acabados negros y metalizados que combinan con todo.",
  },
];

/**
 * Fotos de ambiente de la marca con el eslogan encima.
 * No depende del catálogo: es la sección que sostiene la página mientras no
 * haya productos Esenses cargados.
 */
function MundoEsenses() {
  return (
    <section className="bg-neutral-950 text-white">
      <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
        <SectionHeading eyebrow="El mundo Esenses" title={SLOGAN} dark />

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {AMBIENTES.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.08}>
              <div
                className="relative overflow-hidden rounded-3xl min-h-[280px] md:min-h-[420px] flex items-end"
                style={{ backgroundImage: i === 0 ? BRAND_GRADIENT : BRAND_GRADIENT_ALT }}
              >
                <BrandImage
                  src={a.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                <div className="relative z-10 p-7 md:p-10">
                  <h3
                    style={SPACE}
                    className="text-xl md:text-3xl font-bold tracking-[-0.02em] leading-tight"
                  >
                    {a.title}
                  </h3>
                  <p className="mt-2 text-white/75 max-w-sm">{a.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/tienda"
            search={{ marca: "esenses" } as any}
            className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-950 px-8 py-3.5 text-sm font-black tracking-[0.12em] uppercase hover:gap-3 transition-all"
          >
            Compra ahora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================== PRODUCTOS INSIGNIA ============================== */

const INSIGNIAS = [
  {
    key: "mh10",
    name: "Diadema MH-10",
    tagline: "Audio profesional",
    text: "Diadema over-ear de monitoreo, con almohadillas amplias y cable desmontable. Pensada para escuchar horas sin cansancio.",
    views: [IMG.mh10A, IMG.mh10B],
    gradient: BRAND_GRADIENT,
  },
  {
    key: "hp10000",
    name: "Parlante HP-10000",
    tagline: "Potencia para la fiesta",
    text: "Torre de sonido de alta potencia con conexión inalámbrica e iluminación. El equipo grande de la línea de audio Esenses.",
    views: [IMG.hp10000A, IMG.hp10000B],
    gradient: BRAND_GRADIENT_ALT,
  },
];

function Insignias() {
  return (
    <Reveal>
      <section className="bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
          <SectionHeading eyebrow="Productos insignia" title="Míralos por los dos lados" />
          <p className="mt-3 text-center text-neutral-500">
            Pasa el mouse o toca la foto para ver la segunda vista.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {INSIGNIAS.map((it) => (
              <InsigniaCard key={it.key} item={it} />
            ))}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

/**
 * Visor de dos vistas. No reutiliza `LogitechColorViewer` porque ese lee las
 * variantes desde `logitech-variants` y no admite fotos sueltas.
 * Las dos vistas van apiladas y se cruzan por opacidad: si un archivo falta,
 * `BrandImage` se desmonta y queda el degradado de marca, sin hueco visual.
 */
function InsigniaCard({
  item,
}: {
  item: { name: string; tagline: string; text: string; views: string[]; gradient: string };
}) {
  const [view, setView] = useState(0);
  const toggle = () => setView((v) => (v === 0 ? 1 : 0));

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => setView(1)}
        onMouseLeave={() => setView(0)}
        aria-label={`Cambiar la vista de ${item.name}`}
        className="relative block w-full aspect-[4/3] overflow-hidden"
        style={{ backgroundImage: item.gradient }}
      >
        {item.views.map((src, i) => (
          <span
            key={src}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              view === i ? "opacity-100" : "opacity-0",
            )}
          >
            <BrandImage
              src={src}
              alt={`${item.name} — vista ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </span>
        ))}

        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {item.views.map((src, i) => (
            <span
              key={src}
              className={cn(
                "h-1.5 rounded-full transition-all",
                view === i ? "w-5 bg-white" : "w-1.5 bg-white/50",
              )}
            />
          ))}
        </span>
      </button>

      <div className="p-6 md:p-8">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: SILVER }}
        >
          {item.tagline}
        </p>
        <h3
          style={SPACE}
          className="mt-2 text-xl md:text-2xl font-bold tracking-[-0.02em] text-neutral-950"
        >
          {item.name}
        </h3>
        <p className="mt-2 text-neutral-600 leading-relaxed">{item.text}</p>
        <Link
          to="/tienda"
          search={{ marca: "esenses" } as any}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-neutral-950 text-white px-6 py-3 text-sm font-bold hover:gap-3 transition-all"
        >
          Ver en la tienda <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
