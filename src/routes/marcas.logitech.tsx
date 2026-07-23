import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { WideProductCard } from "@/components/shop/HomeCatalog";
import { Reveal } from "@/components/shop/Reveal";
import { FreeShippingStrip } from "@/components/shop/ShippingNotice";
import { formatCOP, useCart } from "@/lib/cart";
import { trackAddToCart } from "@/lib/analytics";
import { ArrowRight, ArrowUpRight, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import bannerMundial from "@/assets/banner-logitech-mundial.jpg";
import bannerGol from "@/assets/banner-logitech-gol.jpg";

export const Route = createFileRoute("/marcas/logitech")({
  head: () => ({
    meta: [
      {
        title: "Tienda Logitech Colombia — Series MX, ERGO, Esencial, Lifestyle y G | All For All",
      },
      {
        name: "description",
        content:
          "Microsite oficial Logitech en All For All: series MX, ERGO, Esencial, Lifestyle, Serie G, Racing y Gamer PRO. Envío gratis desde $200.000 en ciudades principales.",
      },
      { property: "og:title", content: "Tienda Logitech — All For All" },
      {
        property: "og:description",
        content: "Descubre tu serie ideal: MX, ERGO, Esencial, Lifestyle, G, Racing y Gamer PRO.",
      },
    ],
  }),
  component: LogitechMicrosite,
});

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

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
    name: "GAMER PRO",
    label: "Serie Gamer PRO",
    tagline: "El equipo con el que compiten los profesionales",
    description:
      "Desarrollada junto a jugadores de esports: latencia mínima, peso ultraligero y fiabilidad de torneo.",
    keywords: ["pro x", "pro superlight", "g pro", "pro 2 lightspeed", "astro"],
    gaming: true,
  },
  {
    key: "racing",
    name: "RACING",
    label: "Serie Racing",
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
    keywords: [
      "logitech g",
      "g502",
      "g305",
      "g502",
      "g733",
      "g435",
      "g213",
      "g413",
      "g203",
      "g335",
      "g ",
    ],
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

function classify(product: any): string | null {
  const haystack = `${product.name ?? ""} ${product.sku ?? ""}`.toLowerCase();
  for (const s of SERIES) {
    if (s.keywords.some((k) => haystack.includes(k))) return s.key;
  }
  return null;
}

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
    bySerie.get(s.key)?.find((p) => p.images?.[0])?.images?.[0] ??
    (s.gaming ? bannerGol : bannerMundial);

  const filtered = activeSerie === "todas" ? products : (bySerie.get(activeSerie) ?? []);

  const hero = products.find((p) => p.images?.[0] && classify(p) === "ergo") ?? products[0];

  return (
    <div className="bg-white text-neutral-950">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div className="relative aspect-[16/9] md:aspect-[21/9]">
          <img
            src={bannerMundial}
            alt="Tienda Logitech oficial en All For All"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col items-center justify-end text-center px-6 pb-10 md:pb-16"
          >
            <p className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-white/60 mb-3">
              Microsite oficial
            </p>
            <h1
              style={SPACE}
              className="text-4xl md:text-7xl font-bold tracking-[-0.04em] max-w-4xl leading-[1.02]"
            >
              Tienda Logitech
            </h1>
            <p className="mt-4 text-white/70 max-w-xl">
              Todas las líneas en un solo lugar, con garantía oficial y el respaldo de All For All.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 bg-white text-neutral-950 hover:bg-white/90 rounded-full font-bold"
            >
              <a href="#series">
                Descubre tu serie ideal <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      <FreeShippingStrip />

      {loading && (
        <div className="container mx-auto px-6 py-20 text-center text-neutral-500">
          Cargando catálogo Logitech…
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="container mx-auto px-6 py-20 text-center text-neutral-500">
          Muy pronto vas a encontrar aquí todo el catálogo Logitech.
        </div>
      )}

      {/* ============ DESCUBRE TU SERIE IDEAL (imagen 3) ============ */}
      {activeSeries.length > 0 && (
        <Reveal>
          <section id="series" className="bg-white scroll-mt-24">
            <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
              <h2 style={SPACE} className="text-3xl md:text-5xl font-bold tracking-[-0.03em]">
                Descubre tu serie ideal
              </h2>
              <p className="text-neutral-600 mt-2 max-w-2xl">
                Cada línea de Logitech resuelve una necesidad distinta. Encuentra la tuya.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                {activeSeries.slice(0, 5).map((s, i) => (
                  <motion.a
                    key={s.key}
                    href={`#serie-${s.key}`}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className="group relative block overflow-hidden rounded-2xl aspect-[3/4] bg-neutral-900"
                  >
                    <img
                      src={seriesImage(s)}
                      alt={s.label}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/25 to-transparent" />
                    <div className="relative z-10 h-full flex flex-col justify-end p-5 text-white">
                      <p className="text-lg font-medium">
                        Serie{" "}
                        <span className="font-bold" style={SPACE}>
                          {s.name}
                        </span>
                      </p>
                      <p className="text-sm text-white/75 leading-snug mt-1">{s.tagline}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ TIRA DE SERIES (imagen 4) ============ */}
      {activeSeries.length > 0 && (
        <Reveal>
          <section className="bg-[#f5f5f7]">
            <div className="container mx-auto px-6 lg:px-10 py-10 md:py-14">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {activeSeries.slice(0, 4).map((s) => (
                  <a
                    key={s.key}
                    href={`#serie-${s.key}`}
                    className="group relative block overflow-hidden rounded-2xl aspect-[16/9]"
                  >
                    <img
                      src={seriesImage(s)}
                      alt={s.label}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-neutral-950/85 to-transparent" />
                    <p
                      className="absolute inset-x-0 bottom-4 text-center text-white font-bold text-base md:text-lg"
                      style={SPACE}
                    >
                      {s.label}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* ============ PRODUCTO DESTACADO (imagen 5) ============ */}
      {hero && <FeaturedShowcase product={hero} />}

      {/* ============ BLOQUES POR SERIE ============ */}
      {activeSeries.map((s, i) => {
        const items = bySerie.get(s.key) ?? [];
        const dark = i % 2 === 0;
        return (
          <Reveal key={s.key}>
            <section
              id={`serie-${s.key}`}
              className={cn(
                "scroll-mt-24",
                dark ? "bg-neutral-950 text-white" : "bg-white text-neutral-950",
              )}
            >
              <div className="container mx-auto px-6 lg:px-10 py-12 md:py-20">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mb-8">
                  <div className={i % 2 === 1 ? "md:order-2" : ""}>
                    <p
                      className={cn(
                        "text-[10px] uppercase tracking-[0.3em] font-bold mb-3",
                        dark ? "text-white/50" : "text-neutral-400",
                      )}
                    >
                      Logitech · {s.label}
                    </p>
                    <h2
                      style={SPACE}
                      className="text-3xl md:text-5xl font-bold tracking-[-0.03em] mb-3"
                    >
                      {s.tagline}
                    </h2>
                    <p
                      className={cn(
                        "text-base md:text-lg leading-relaxed",
                        dark ? "text-white/60" : "text-neutral-600",
                      )}
                    >
                      {s.description}
                    </p>
                    <Button
                      asChild
                      variant={dark ? "outline" : "default"}
                      className={cn(
                        "mt-6 rounded-full font-bold",
                        dark
                          ? "bg-white text-neutral-950 hover:bg-white/90 border-white"
                          : "bg-neutral-950 text-white hover:bg-neutral-800",
                      )}
                    >
                      <button type="button" onClick={() => setActiveSerie(s.key)}>
                        Ver {s.label} ({items.length}) <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </Button>
                  </div>
                  <div
                    className={cn(
                      "group relative aspect-[4/3] rounded-2xl overflow-hidden",
                      i % 2 === 1 ? "md:order-1" : "",
                      dark ? "bg-white/5" : "bg-[#f5f5f7]",
                    )}
                  >
                    <img
                      src={seriesImage(s)}
                      alt={s.label}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-8 transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  {items.slice(0, 4).map((p) => (
                    <MiniCard key={p.id} product={p} dark={dark} />
                  ))}
                </div>
              </div>
            </section>
          </Reveal>
        );
      })}

      {/* ============ CATÁLOGO COMPLETO FILTRABLE ============ */}
      {products.length > 0 && (
        <section className="bg-[#f5f5f7]">
          <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
            <div className="text-center">
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-500">
                Catálogo
              </span>
              <h2 style={SPACE} className="mt-2 text-3xl md:text-5xl font-bold tracking-[-0.03em]">
                Todo Logitech
              </h2>
              <p className="text-neutral-600 mt-2">{products.length} productos disponibles</p>
            </div>

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
                        ? "border-neutral-950 text-neutral-950 font-bold"
                        : "border-transparent text-neutral-500 hover:text-neutral-900",
                    )}
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

/** Bloque tipo "hotspot" de la imagen 5: foto de ambiente + ficha de compra al lado. */
function FeaturedShowcase({ product }: { product: any }) {
  const { add } = useCart();
  const img = product.images?.[0];
  const price = product.sale_price ?? product.price ?? 0;
  const hasDiscount = product.sale_price && product.price && product.sale_price < product.price;
  const pct = hasDiscount ? Math.round((1 - product.sale_price / product.price) * 100) : 0;

  return (
    <Reveal>
      <section className="bg-white">
        <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 md:gap-6 items-stretch">
            <div className="relative rounded-2xl overflow-hidden bg-[#f5f5f7] aspect-[16/10]">
              {img && (
                <img
                  src={img}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-contain p-10"
                />
              )}
              <span className="absolute top-5 left-5 rounded-xl bg-white/95 backdrop-blur px-4 py-2 text-sm font-bold text-secondary shadow-lg max-w-[60%]">
                {product.name}
              </span>
            </div>

            <div className="rounded-2xl bg-white border border-neutral-200 p-6 md:p-8 flex flex-col relative">
              {hasDiscount && (
                <span className="absolute top-5 right-5 h-14 w-14 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center">
                  {pct}% OFF
                </span>
              )}
              <div className="flex-1 flex items-center justify-center py-6">
                {img && <img src={img} alt="" className="max-h-52 w-auto object-contain" />}
              </div>
              <span className="self-start rounded-full bg-secondary text-white text-xs font-bold px-3 py-1.5 mb-3">
                Envío Gratis
              </span>
              <h3 style={SPACE} className="text-xl md:text-2xl font-bold leading-snug">
                {product.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                {hasDiscount && (
                  <span className="text-neutral-400 line-through">{formatCOP(product.price)}</span>
                )}
                <span className="text-3xl font-bold">{formatCOP(price)}</span>
              </div>
              <Button
                size="lg"
                className="mt-5 w-full rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold"
                onClick={() => {
                  add({
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    price,
                    image: img,
                    sku: product.sku ?? undefined,
                  });
                  trackAddToCart({
                    item_id: product.sku || product.id,
                    item_name: product.name,
                    price,
                    quantity: 1,
                  });
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar al carrito
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function MiniCard({ product, dark }: { product: any; dark: boolean }) {
  const img = product.images?.[0];
  const price = product.sale_price ?? product.price;
  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      className={cn(
        "group block rounded-2xl overflow-hidden h-full transition-all hover:-translate-y-1",
        dark
          ? "bg-white/[0.04] border border-white/10 hover:border-white/25"
          : "bg-[#f5f5f7] border border-transparent hover:border-neutral-300",
      )}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        {img && (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-5 group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2">{product.name}</h3>
        {price != null && <p className="mt-1.5 font-bold">{formatCOP(price)}</p>}
      </div>
    </Link>
  );
}
