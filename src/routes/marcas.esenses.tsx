import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalUrl, withCanonical } from "@/lib/seo";
import { useEffect, useMemo, useRef, useState } from "react";
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
const SLOGAN = "Un mundo de posibilidades con tecnología innovadora";

/**
 * Un archivo por foto. `mh10A`, `mh10B` y `sp3720A` se referencian dos veces
 * a propósito (colecciones e insignia): se reusa el mismo archivo, no se
 * duplica. La extensión de cada uno es la del original de esenses.com.co,
 * para que baste con descargar y renombrar, sin convertir nada.
 */
const IMG = {
  /** Banner del hero. Pieza oficial terminada: trae su propio titular. */
  hero1: "/marcas/esenses/hero-1.webp",
  /** Piezas promocionales oficiales, con precio y texto ya dibujados. */
  promoSp3720: "/marcas/esenses/promo-sp3720.webp",
  promoTws: "/marcas/esenses/promo-tws-91.webp",
  promoMh10g: "/marcas/esenses/promo-mh10g.webp",
};

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

      {/* ============ PIEZAS PROMOCIONALES DE LA MARCA ============ */}
      <PromosEsenses />

      {/* ============ TRES PILARES DE CONFIANZA ============ */}
      <TrustBar />

      {loading && (
        <div className="container mx-auto px-6 py-16 text-center text-neutral-500">
          Cargando catálogo Esenses…
        </div>
      )}

      {/* ============ CARRUSEL DE PRODUCTOS DESTACADOS ============ */}
      {!loading && destacados.length > 0 && (
        <section className="bg-white">
          <div className="container mx-auto px-6 lg:px-10 py-14 md:py-20">
            <SectionHeading eyebrow="Esenses" title="Productos destacados" />
            <DestacadosCarrusel products={destacados} />
          </div>
        </section>
      )}

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

      {/* ============ FAQ ============ */}
      <Faq />
    </div>
  );
}

/* ============================== HERO ============================== */

/** Respaldo del hero: si la pieza no carga, queda un bloque de marca. */
type HeroSlide = { gradient: string; eyebrow: string; title: string; text: string };

/**
 * El hero es una pieza terminada de Esenses: la foto ya trae el titular y el
 * boton dibujados. Por eso va sin velo, sin recorte y SIN texto encima —
 * escribirle algo arriba se le montaria al diseno original.
 * `ratio` es el tamano real del archivo: reserva el alto exacto antes de que
 * cargue y evita que la pagina salte.
 */
type HeroBanner = { image: string; alt: string; ratio: string };

const HERO_BANNERS: HeroBanner[] = [
  {
    image: IMG.hero1,
    alt: "Esenses — Accesorios tecnologicos y wearables. Speakers",
    ratio: "1828 / 656",
  },
];

const HERO_SLIDES: HeroSlide[] = [
  {
    gradient: BRAND_GRADIENT,
    eyebrow: "Esenses",
    title: SLOGAN,
    text: "Audifonos, relojes inteligentes, parlantes y accesorios Esenses, disponibles en All For All con envio a todo el pais.",
  },
];

function HeroCarousel() {
  const [idx, setIdx] = useState(0);
  const [caidas, setCaidas] = useState<Record<string, boolean>>({});
  const banners = HERO_BANNERS.filter((b) => !caidas[b.image]);
  const n = banners.length;

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n]);

  const i = n ? idx % n : 0;
  const go = (d: number) => setIdx((p) => (p + d + n) % n);

  // Ninguna pieza cargó: se cae al hero escrito de siempre.
  if (!n) return <HeroEscrito />;

  const b = banners[i];

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <Link
        to="/tienda"
        search={{ marca: "esenses" } as any}
        aria-label="Ver los productos Esenses"
        className="block"
      >
        <div className="w-full" style={{ aspectRatio: b.ratio }}>
          <img
            src={b.image}
            alt={b.alt}
            className="h-full w-full object-cover"
            decoding="async"
            onError={() => setCaidas((c) => ({ ...c, [b.image]: true }))}
          />
        </div>
      </Link>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Banner anterior"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/25 text-white hover:bg-black/45 backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Banner siguiente"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/25 text-white hover:bg-black/45 backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, k) => (
              <button
                key={k}
                type="button"
                onClick={() => setIdx(k)}
                aria-label={`Ir al banner ${k + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  k === i ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Piezas promocionales de la marca, con la proporcion del sitio oficial: la
 * grande al lado de las dos pequenas apiladas. Las tres son 1188x600 (2:1).
 *
 * El alto lo fija la pieza ancha y la columna de la derecha se estira para
 * igualarlo. Dos piezas apiladas mas el espacio entre ellas suman un poco mas
 * que la ancha, asi que si se les deja su proporcion exacta queda una franja
 * blanca debajo de la grande; estirarlas recorta unos pocos pixeles de los
 * lados, que en estas piezas es margen vacio. En movil van una debajo de otra,
 * a ancho completo y sin recorte.
 */
type Promo = { image: string; alt: string };

const PROMO_ANCHA: Promo = {
  image: IMG.promoSp3720,
  alt: "New Speaker — Esenses SP-3720 Black, parlante inalambrico bluetooth",
};

const PROMOS_CHICAS: Promo[] = [
  { image: IMG.promoTws, alt: "Auriculares Esenses EB-TWS-91 por $54.900" },
  {
    image: IMG.promoMh10g,
    alt: "Ofertas — Diadema multimedia gaming Esenses MH-10G por $99.900, antes $159.900",
  },
];

const RATIO_PROMO = "1188 / 600";

function PromosEsenses() {
  const [caidas, setCaidas] = useState<Record<string, boolean>>({});
  const caer = (src: string) => () => setCaidas((c) => ({ ...c, [src]: true }));

  const ancha = caidas[PROMO_ANCHA.image] ? null : PROMO_ANCHA;
  const chicas = PROMOS_CHICAS.filter((p) => !caidas[p.image]);
  if (!ancha && !chicas.length) return null;

  const enlace =
    "block overflow-hidden rounded-2xl bg-neutral-100 min-h-0 transition-transform duration-500 hover:scale-[1.01]";

  // Si falta la ancha, las que queden se reparten el ancho por igual.
  const columnas = ancha ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <Reveal>
      <section className="bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-10 md:py-14">
          <div className={cn("grid grid-cols-1 gap-4 md:gap-5", columnas)}>
            {ancha && (
              <Link
                to="/tienda"
                search={{ marca: "esenses" } as any}
                aria-label={ancha.alt}
                className={cn(enlace, "md:col-span-2")}
              >
                <div className="w-full" style={{ aspectRatio: RATIO_PROMO }}>
                  <img
                    src={ancha.image}
                    alt={ancha.alt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    onError={caer(ancha.image)}
                  />
                </div>
              </Link>
            )}

            {chicas.length > 0 && (
              <div
                className={cn(
                  "grid grid-cols-1 gap-4 md:gap-5",
                  ancha && chicas.length === 2 && "md:grid-rows-2 md:h-full",
                )}
              >
                {chicas.map((p) => (
                  <Link
                    key={p.image}
                    to="/tienda"
                    search={{ marca: "esenses" } as any}
                    aria-label={p.alt}
                    className={enlace}
                  >
                    <img
                      src={p.image}
                      alt={p.alt}
                      loading="lazy"
                      decoding="async"
                      style={!ancha ? { aspectRatio: RATIO_PROMO } : undefined}
                      className={cn(
                        "w-full object-cover",
                        ancha ? "aspect-[1188/600] md:aspect-auto md:h-full" : "h-full",
                      )}
                      onError={caer(p.image)}
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </Reveal>
  );
}

/**
 * Respaldo del hero. Solo se ve si la pieza oficial no carga. No pide ningun
 * archivo: el degradado de marca y la palabra ESENSES bastan para que la
 * pagina no se vea rota.
 */
function HeroEscrito() {
  const slide = HERO_SLIDES[0];
  return (
    <section className="relative w-full overflow-hidden text-white" style={{ minHeight: 460 }}>
      <div className="absolute inset-0" style={{ backgroundImage: slide.gradient }} />

      <div className="relative container mx-auto px-6 lg:px-10 flex items-center min-h-[460px] md:min-h-[560px] py-16">
        <div className="z-10 max-w-2xl">
          <p style={SPACE} className="text-lg md:text-xl font-black tracking-[0.35em] uppercase mb-5">
            Esenses
          </p>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-white/60 mb-3">
            {slide.eyebrow}
          </p>
          <h1 style={SPACE} className="text-3xl md:text-6xl font-bold tracking-[-0.04em] leading-[1.05]">
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
        </div>
      </div>
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
