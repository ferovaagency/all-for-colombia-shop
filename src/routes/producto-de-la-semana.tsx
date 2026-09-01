import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { canonicalUrl, withCanonical } from "@/lib/seo";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Countdown, useCountdown } from "@/components/WeeklyDealCountdown";
import { formatCOP, useCart } from "@/lib/cart";
import { syncToBrevo } from "@/lib/brevo";
import { FREE_SHIPPING_CITIES_TEXT, FREE_SHIPPING_REST_TEXT } from "@/lib/shipping";
import { recordLegalAcceptance } from "@/lib/consent";
import { LegalLink } from "@/components/legal/ConsentControls";
import { getPastWeeklyDeals } from "@/lib/weekly.functions";
import {
  Sparkles,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  Loader2,
  Crown,
  Flame,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/producto-de-la-semana")({
  head: () => withCanonical(canonicalUrl("/producto-de-la-semana"), {
    meta: [
      { title: "Producto de la Semana — Hasta 80% OFF | All For All" },
      {
        name: "description",
        content:
          "Cada viernes revelamos un producto con hasta 80% de descuento, comprable solo de 12:00 pm a 1:00 pm. Una hora, un precio irrepetible.",
      },
      { property: "og:title", content: "Producto de la Semana — Hasta 80% OFF" },
      {
        property: "og:description",
        content: "Viernes 12:00 pm a 1:00 pm. Un producto, hasta 80% menos. Solo una hora.",
      },
    ],
  }),
  component: WeeklyDealPage,
});

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

/** Próximo viernes a las 12:00 p.m. (hora local) en ISO, para el contador. */
function nextFridayNoonISO(): string {
  const now = new Date();
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  let add = (5 - d.getDay() + 7) % 7; // 5 = viernes
  if (add === 0 && now.getTime() >= d.getTime()) add = 7; // viernes ya pasado el mediodía → siguiente
  d.setDate(d.getDate() + add);
  return d.toISOString();
}

// Palabras clave para detectar productos "gamer" / deseados para la franja.
const GAMER_RE =
  /gamer|gaming|\brtx\b|geforce|radeon|\bmsi\b|logitech ?g|razer|redragon|hyperx|corsair|asus rog|\brog\b|consola|playstation|\bps5\b|xbox|nintendo|switch|\d{3}\s?hz|144hz|165hz|240hz|mec[aá]nic|mouse gamer|teclado gamer|diadema|headset|aud[ií]fonos gamer|silla gamer|volante|joystick|control(ador)?|monitor/i;

function gamerScore(p: any): number {
  const hay = `${p.name ?? ""} ${p.categories?.name ?? ""} ${p.categories?.slug ?? ""} ${p.brands?.slug ?? ""}`;
  let score = 0;
  const m = hay.match(new RegExp(GAMER_RE, "gi"));
  if (m) score += m.length;
  return score;
}

/**
 * Selecciona hasta `max` productos para la franja: primero los más "gamer" y
 * deseados, con variedad de categorías (máx. 3 por categoría) para no llenarla
 * solo de computadores.
 */
function pickPremium(list: any[], max = 14): any[] {
  const withImg = list.filter((p) => Array.isArray(p.images) && p.images[0] && p.price);
  const scored = withImg
    .map((p) => ({ p, g: gamerScore(p) }))
    .sort((a, b) => b.g - a.g || Number(b.p.price ?? 0) - Number(a.p.price ?? 0));

  const perCat = new Map<string, number>();
  const out: any[] = [];
  const overflow: any[] = [];
  for (const { p } of scored) {
    const cat = p.categories?.slug ?? p.category_id ?? "sin";
    const n = perCat.get(cat) ?? 0;
    if (n < 3) {
      perCat.set(cat, n + 1);
      out.push(p);
    } else {
      overflow.push(p);
    }
    if (out.length >= max) break;
  }
  // Si no llegamos al máximo por el tope de categoría, rellena con el resto.
  for (const p of overflow) {
    if (out.length >= max) break;
    out.push(p);
  }
  return out.slice(0, max);
}

type Deal = {
  id: string;
  product_id: string;
  discount_percent: number;
  reveal_at: string;
  ends_at: string;
  stock_limit: number | null;
  is_active: boolean;
  teaser_images: string[] | null;
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    short_description: string | null;
    price: number | null;
    images: string[] | null;
    sku: string | null;
  } | null;
};

type PastDeal = {
  id: string;
  discount_percent: number;
  reveal_at: string;
  ends_at: string;
  product: { slug: string; name: string; price: number | null; images: string[] | null } | null;
};

type Premium = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  images: string[] | null;
};

/* ============================== CARGA ============================== */

function WeeklyDealPage() {
  const [data, setData] = useState<{ current: Deal | null; past: PastDeal[]; premium: Premium[] }>({
    current: null,
    past: [],
    premium: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // current + premium con el cliente anónimo (RLS permite deals activos y
        // productos activos). El historial (deals cerrados, is_active=false) se
        // lee con service-role vía server function.
        const [dealRes, premiumRes, pastRes] = await Promise.all([
          supabase
            .from("weekly_deals")
            .select(
              "id, product_id, discount_percent, reveal_at, ends_at, stock_limit, is_active, teaser_images, product:products(id, slug, name, description, short_description, price, images, sku)",
            )
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("products")
            .select(
              "id, slug, name, price, images, category_id, categories(slug,name), brands(slug,name)",
            )
            .eq("active", true)
            .not("price", "is", null)
            .not("images", "is", null)
            .order("price", { ascending: false, nullsFirst: false })
            .limit(150),
          getPastWeeklyDeals().catch(() => ({ past: [] as PastDeal[] })),
        ]);

        const premium = pickPremium((premiumRes.data as any[]) ?? [], 14) as Premium[];

        setData({
          current: (dealRes.data as unknown as Deal) ?? null,
          past: ((pastRes as { past: PastDeal[] })?.past ?? []) as PastDeal[],
          premium,
        });
      } catch {
        // degradar sin romper
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  return <WeeklyDealView current={data.current} past={data.past} premium={data.premium} />;
}

function WeeklyDealView({
  current,
  past,
  premium,
}: {
  current: Deal | null;
  past: PastDeal[];
  premium: Premium[];
}) {
  const reveal = useCountdown(current?.reveal_at ?? null);
  const end = useCountdown(current?.ends_at ?? null);

  const phase: "none" | "teaser" | "live" | "closed" = useMemo(() => {
    if (!current || !current.product) return "none";
    if (!reveal.done) return "teaser";
    if (!end.done) return "live";
    return "closed";
  }, [current, reveal.done, end.done]);

  // Estado EN VIVO: la ficha en podio ocupa toda la atención.
  if (phase === "live" && current) {
    return (
      <div className="bg-black text-white">
        <LiveState deal={current} />
        <PastDeals deals={past} />
      </div>
    );
  }

  return (
    <div className="bg-black text-white">
      {phase === "teaser" && current ? (
        <TeaserHero deal={current} />
      ) : phase === "closed" && current ? (
        <ClosedHero deal={current} />
      ) : (
        <NoDealHero />
      )}

      <MechanicsStrip />
      <PremiumFranja products={premium} />
      <PastDeals deals={past} />

      <section className="bg-black py-20 md:py-28 border-t border-white/10">
        <div className="container mx-auto px-6 max-w-xl">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}

/* ============================== MONEDA 3D GIRATORIA ============================== */

function Coin3D({ percent = 80 }: { percent?: number }) {
  return (
    <div className="relative" style={{ perspective: "900px" }}>
      {/* Halo */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/40 blur-3xl"
        style={{ width: 260, height: 260 }}
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative mx-auto flex items-center justify-center rounded-full"
        style={{
          width: 176,
          height: 176,
          transformStyle: "preserve-3d",
          background:
            "radial-gradient(circle at 34% 28%, #ff7a4d 0%, #ef4444 45%, #b91c1c 78%, #7f1d1d 100%)",
          boxShadow:
            "inset 0 8px 22px rgba(255,255,255,0.35), inset 0 -14px 28px rgba(0,0,0,0.55), 0 30px 55px rgba(0,0,0,0.55)",
        }}
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <div className="text-center" style={{ transform: "translateZ(24px)" }}>
          <div
            style={{ ...SPACE }}
            className="text-white font-black leading-none text-5xl md:text-6xl"
          >
            −{percent}%
          </div>
          <div className="text-white/90 text-[10px] font-bold tracking-[0.4em] mt-1">OFF</div>
        </div>
      </motion.div>
    </div>
  );
}

/* ============================== HERO ESPECTACULAR (expectativa / sin oferta) ============================== */

function SpectacularHero({
  target,
  discount,
  teasers = [],
}: {
  target: string;
  discount: number;
  teasers?: string[];
}) {
  const clean = teasers.filter(Boolean);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (clean.length < 2) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % clean.length), 3500);
    return () => clearInterval(t);
  }, [clean.length]);

  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
      {/* Glows de fondo animados */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-secondary/30 blur-[130px]"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-primary/40 blur-[130px]"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] backdrop-blur mb-8">
          <Sparkles className="h-3 w-3" /> Producto de la Semana
        </span>

        {/* Moneda 3D */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="mb-4"
        >
          <Coin3D percent={Math.round(discount)} />
        </motion.div>

        {/* Titular animado HASTA X% OFF */}
        <span className="text-xs md:text-sm uppercase tracking-[0.4em] text-white/60 mb-2">
          Hasta
        </span>
        <motion.h1
          style={{
            ...SPACE,
            backgroundImage:
              "linear-gradient(100deg,#fff 0%,#f43f5e 25%,#fb923c 50%,#f43f5e 75%,#fff 100%)",
            backgroundSize: "220% auto",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
          animate={{ backgroundPosition: ["0% 50%", "220% 50%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="text-[clamp(3.5rem,15vw,11rem)] font-black tracking-[-0.05em] leading-[0.85]"
        >
          {Math.round(discount)}% OFF
        </motion.h1>

        <p className="mt-6 text-lg md:text-2xl text-white/70 max-w-2xl font-light">
          Todos los <span className="text-white font-semibold">viernes</span>, un producto revelado
          y comprable solo de{" "}
          <span className="text-white font-semibold">12:00 p.m. a 1:00 p.m.</span>
          <br className="hidden md:block" />
          Una hora. Un precio irrepetible.
        </p>

        <p className="mt-12 text-[10px] uppercase tracking-[0.35em] text-white/40 mb-4">
          Se revela en
        </p>
        <Countdown target={target} />
      </motion.div>

      {/* Foto sorpresa (solo si hay teaser configurado) */}
      {clean.length > 0 && (
        <div className="relative z-10 mt-14 w-full max-w-xl aspect-square rounded-[2rem] border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
          <motion.img
            key={clean[idx]}
            src={clean[idx]}
            alt="Pista del Producto de la Semana"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9 }}
            className="h-full w-full object-cover"
          />
          <span className="absolute top-5 left-5 rounded-full bg-secondary text-white font-bold px-4 py-1.5 text-sm shadow-lg">
            −{Math.round(discount)}%
          </span>
        </div>
      )}
    </section>
  );
}

function TeaserHero({ deal }: { deal: Deal }) {
  return (
    <SpectacularHero
      target={deal.reveal_at}
      discount={deal.discount_percent}
      teasers={deal.teaser_images ?? []}
    />
  );
}

/* ============================== HERO: CERRADO ============================== */

function ClosedHero({ deal }: { deal: Deal }) {
  const product = deal.product!;
  const img = (product.images ?? []).filter(Boolean)[0];
  const final = product.price
    ? Math.max(0, Math.round(product.price * (1 - deal.discount_percent / 100)))
    : null;

  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[32rem] w-[32rem] rounded-full bg-primary/40 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] backdrop-blur mb-8">
          <Clock className="h-3 w-3" /> La oferta de esta semana cerró
        </span>

        {img && (
          <div className="relative mb-8 h-52 w-52 md:h-64 md:w-64">
            <img
              src={img}
              alt={product.name}
              className="h-full w-full object-contain opacity-90 drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
            />
            <span className="absolute -top-3 -right-3 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white font-bold px-3 py-1 text-xs">
              −{Math.round(deal.discount_percent)}%
            </span>
          </div>
        )}

        <h1
          style={SPACE}
          className="text-[clamp(2rem,7vw,5rem)] font-bold tracking-[-0.04em] leading-[0.95] max-w-4xl"
        >
          {product.name}
        </h1>
        <p className="mt-5 text-lg md:text-xl text-white/50 max-w-xl">
          Se fue con {Math.round(deal.discount_percent)}% de descuento
          {final != null ? ` (${formatCOP(final)})` : ""}. Vuelve el próximo{" "}
          <span className="text-white font-medium">viernes a las 12:00 pm</span> por la siguiente
          revelación.
        </p>

        <Button
          asChild
          size="lg"
          className="mt-10 rounded-full bg-white text-black hover:bg-white/90 font-bold px-8"
        >
          <Link to="/tienda">Explorar la tienda</Link>
        </Button>
      </motion.div>
    </section>
  );
}

/* ============================== HERO: SIN DEAL ============================== */

function NoDealHero() {
  // Sin oferta configurada: contamos hacia el próximo viernes al mediodía.
  const target = useMemo(() => nextFridayNoonISO(), []);
  return <SpectacularHero target={target} discount={80} />;
}

/* ============================== ESTADO EN VIVO: PODIO ============================== */

function LiveState({ deal }: { deal: Deal }) {
  const product = deal.product!;
  const images = (product.images ?? []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const { add } = useCart();
  const navigate = useNavigate();

  const original = product.price ?? 0;
  const final = useMemo(
    () => Math.max(0, Math.round(original * (1 - deal.discount_percent / 100))),
    [original, deal.discount_percent],
  );
  const savings = original - final;
  const pct = Math.round(deal.discount_percent);

  const end = useCountdown(deal.ends_at);

  const buyNow = () => {
    add(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: final,
        image: images[0],
        sku: product.sku ?? undefined,
      },
      1,
    );
    navigate({ to: "/checkout" });
  };

  const paragraphs = (product.description ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      {/* ---- Barra de urgencia superior ---- */}
      <div className="sticky top-[calc(4.5rem)] md:top-[calc(5rem)] z-40 bg-red-600 text-white">
        <div className="container mx-auto px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm font-bold">
          <Flame className="h-4 w-4 animate-pulse" />
          <span>¡OFERTA ACTIVA AHORA!</span>
          <span className="hidden sm:inline text-white/80 font-medium">
            Cierra en {pad2(end.hours)}:{pad2(end.minutes)}:{pad2(end.seconds)} · solo esta hora
          </span>
        </div>
      </div>

      {/* ---- Podio ---- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-secondary/20 blur-[130px]" />
        </div>

        <div className="container mx-auto px-6 pt-10 md:pt-16 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-6 items-center relative z-10">
          {/* Podio con la ficha */}
          <Podium images={images} idx={idx} setIdx={setIdx} pct={pct} name={product.name} />

          {/* Info + compra */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/15 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] backdrop-blur">
              <Zap className="h-3 w-3 text-secondary" /> Producto de la Semana
            </span>

            <h1
              style={SPACE}
              className="mt-5 text-[clamp(2rem,5vw,3.75rem)] font-bold tracking-[-0.04em] leading-[0.98]"
            >
              {product.name}
            </h1>

            {product.short_description && (
              <p className="mt-4 text-lg text-white/55 max-w-xl mx-auto lg:mx-0 font-light">
                {product.short_description}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-baseline justify-center lg:justify-start gap-x-4 gap-y-1">
              <span style={SPACE} className="text-5xl md:text-6xl font-bold tracking-[-0.03em]">
                {formatCOP(final)}
              </span>
              <span className="text-lg md:text-2xl text-white/30 line-through">
                {formatCOP(original)}
              </span>
            </div>
            <p className="mt-1.5 text-secondary font-semibold">
              −{pct}% · Ahorras {formatCOP(savings)}
            </p>

            {/* Contador grande */}
            <div className="mt-8 flex flex-col items-center lg:items-start">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 mb-3">
                La oferta cierra en
              </p>
              <Countdown target={deal.ends_at} urgent />
            </div>

            {/* CTA compra directa */}
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={buyNow}
                className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-10 py-6 text-lg shadow-xl shadow-white/10"
              >
                Comprar ahora <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="rounded-full text-white hover:bg-white/10 font-semibold py-6"
              >
                <Link to="/producto/$slug" params={{ slug: product.slug }}>
                  Ver ficha completa
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/40">
              Precio exclusivo válido solo durante esta hora. Al terminar, vuelve a su valor normal.
            </p>

            {deal.stock_limit && deal.stock_limit > 0 && (
              <div className="mt-6 max-w-md mx-auto lg:mx-0">
                <StockBar limit={deal.stock_limit} />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ---- Descripción del producto ---- */}
      {paragraphs.length > 0 && (
        <section className="bg-white text-neutral-950">
          <div className="container mx-auto px-6 py-20 md:py-28 max-w-4xl text-center">
            <h2
              style={SPACE}
              className="text-[clamp(1.75rem,5vw,3.5rem)] font-bold tracking-[-0.04em] leading-[1.02]"
            >
              Por qué no puedes dejarlo pasar.
            </h2>
            {paragraphs.map((text, i) => (
              <p
                key={i}
                className="mt-6 text-lg md:text-xl text-neutral-600 font-light leading-relaxed"
              >
                {text}
              </p>
            ))}
          </div>
        </section>
      )}

      {images[1] && (
        <section className="bg-black">
          <img
            src={images[1]}
            alt={product.name}
            className="w-full max-h-[80vh] object-contain mx-auto"
          />
        </section>
      )}

      {/* ---- Garantías ---- */}
      <section className="bg-[#f5f5f7] text-neutral-950">
        <div className="container mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <Perk
            icon={<Truck className="h-8 w-8" />}
            title="Envíos a todo Colombia"
            text={`${FREE_SHIPPING_CITIES_TEXT}. ${FREE_SHIPPING_REST_TEXT}`}
          />
          <Perk
            icon={<ShieldCheck className="h-8 w-8" />}
            title="Producto 100% original"
            text="Garantía del fabricante incluida en cada compra."
          />
          <Perk
            icon={<Zap className="h-8 w-8" />}
            title="Checkout en 60 segundos"
            text="Paga con PSE, tarjeta, Nequi o financia con Addi."
          />
        </div>
      </section>

      {/* ---- Cierre ---- */}
      <section className="bg-black text-white text-center">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <h2
            style={SPACE}
            className="text-[clamp(2rem,6vw,4.5rem)] font-bold tracking-[-0.04em] leading-[1.02]"
          >
            Cuando el reloj llegue a cero,
            <br />
            la oferta desaparece.
          </h2>

          <div className="mt-10 flex justify-center">
            <Countdown target={deal.ends_at} urgent compact />
          </div>

          <Button
            size="lg"
            onClick={buyNow}
            className="mt-10 rounded-full bg-white text-black hover:bg-white/90 font-bold px-10 py-6 text-lg"
          >
            Comprar ahora por {formatCOP(final)}
          </Button>
        </div>
      </section>
    </>
  );
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function Podium({
  images,
  idx,
  setIdx,
  pct,
  name,
}: {
  images: string[];
  idx: number;
  setIdx: (i: number) => void;
  pct: number;
  name: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex w-full max-w-lg flex-col items-center justify-end">
        {/* Aura / foco de luz */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[130%] w-[85%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),transparent_62%)] blur-2xl"
        />

        {/* Corona */}
        <span className="z-10 mb-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-black shadow-lg shadow-amber-500/30">
          <Crown className="h-4 w-4" /> El más deseado de la semana
        </span>

        {/* Producto flotando */}
        <div className="relative z-10 flex items-center justify-center">
          {images[idx] ? (
            <motion.img
              key={images[idx]}
              src={images[idx]}
              alt={name}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1, y: [0, -14, 0] }}
              transition={{
                opacity: { duration: 0.6 },
                scale: { duration: 0.6 },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
              className="h-[36vh] md:h-[44vh] w-auto max-w-full object-contain drop-shadow-[0_30px_45px_rgba(0,0,0,0.65)]"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
              }}
            />
          ) : (
            <ShoppingBag className="h-40 w-40 text-white/15" strokeWidth={0.75} />
          )}

          {/* Sello de descuento */}
          <span className="absolute -right-2 top-2 md:-right-6 flex h-24 w-24 rotate-6 flex-col items-center justify-center rounded-full bg-secondary font-black text-white shadow-2xl shadow-secondary/40">
            <span className="text-3xl leading-none">−{pct}%</span>
            <span className="text-[10px] uppercase tracking-widest">OFF</span>
          </span>
        </div>

        {/* Pedestal */}
        <div className="relative z-0 -mt-4 w-[min(90%,24rem)]">
          <div className="mx-auto h-4 w-[80%] rounded-[100%] bg-black/60 blur-md" />
          <div className="mx-auto -mt-2 w-[88%] rounded-t-2xl border-t border-white/25 bg-gradient-to-b from-white/20 to-white/[0.03] px-6 pb-9 pt-4 text-center backdrop-blur">
            <span
              style={SPACE}
              className="block text-6xl md:text-7xl font-black leading-none text-white/10"
            >
              #1
            </span>
          </div>
        </div>
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {images.slice(0, 6).map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={cn(
                "h-14 w-14 overflow-hidden rounded-xl border bg-white/5 transition-all",
                i === idx ? "border-white scale-105" : "border-white/15 hover:border-white/40",
              )}
            >
              <img src={img} alt="" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== MECÁNICA ============================== */

function MechanicsStrip() {
  const items = [
    { icon: <Clock className="h-6 w-6" />, title: "Todos los viernes", desc: "12:00 pm – 1:00 pm" },
    {
      icon: <Flame className="h-6 w-6" />,
      title: "Hasta 80% OFF",
      desc: "Un producto revelado por semana",
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Solo 60 minutos",
      desc: "Pasada la hora vuelve a su precio normal",
    },
  ];
  return (
    <section className="bg-black border-y border-white/10">
      <div className="container mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {items.map((it) => (
          <div key={it.title} className="flex items-center gap-4 justify-center md:justify-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-secondary">
              {it.icon}
            </div>
            <div>
              <p style={SPACE} className="font-bold text-lg leading-tight">
                {it.title}
              </p>
              <p className="text-sm text-white/50">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================== FRANJA DE DESEADOS ============================== */

function PremiumFranja({ products }: { products: Premium[] }) {
  if (!products || products.length === 0) return null;
  const loop = [...products, ...products];

  return (
    <section className="bg-black py-16 md:py-24 overflow-hidden">
      <div className="container mx-auto px-6 text-center mb-10">
        <span className="text-[10px] uppercase tracking-[0.35em] text-secondary">
          La franja de los deseados
        </span>
        <h2
          style={SPACE}
          className="mt-3 text-3xl md:text-5xl font-bold tracking-[-0.03em] text-white"
        >
          Esto es lo que podrías llevarte
        </h2>
        <p className="mt-3 text-white/50 max-w-xl mx-auto">
          Los productos más top y deseados de la tienda. Imagina cualquiera de estos con hasta 80%
          de descuento… así es el Producto de la Semana.
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-28 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-28 bg-gradient-to-l from-black to-transparent z-10" />
        <motion.div
          className="flex gap-5 w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {loop.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="w-56 md:w-64 shrink-0 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden"
            >
              <div className="relative aspect-square bg-white/5">
                <img
                  src={p.images![0]}
                  alt={p.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-contain p-6"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
                  }}
                />
                <span className="absolute top-3 left-3 rounded-full bg-secondary/90 text-white text-[10px] font-bold px-2 py-0.5">
                  hasta −80%
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm text-white/80 line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                {p.price != null && (
                  <p className="mt-1 text-white/40 text-sm">Normal {formatCOP(p.price)}</p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="container mx-auto px-6 text-center mt-10">
        <Button
          asChild
          variant="ghost"
          className="rounded-full text-white hover:bg-white/10 font-semibold"
        >
          <Link to="/tienda">
            Ver toda la tienda <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

/* ============================== MURO DE ANTERIORES ============================== */

function PastDeals({ deals }: { deals: PastDeal[] }) {
  if (!deals || deals.length === 0) return null;

  return (
    <section className="bg-[#0a0a0a] text-white py-16 md:py-24 border-t border-white/10">
      <div className="container mx-auto px-6">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.35em] text-white/40">
            El muro de la fama
          </span>
          <h2 style={SPACE} className="mt-3 text-3xl md:text-5xl font-bold tracking-[-0.03em]">
            Productos de la semana anteriores
          </h2>
          <p className="mt-3 text-white/50 max-w-xl mx-auto">
            Estas fueron las joyas que se llevaron nuestros clientes. ¿La próxima será para ti?
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map((d) => {
            const p = d.product!;
            const img = (p.images ?? []).filter(Boolean)[0];
            const final = p.price
              ? Math.max(0, Math.round(p.price * (1 - d.discount_percent / 100)))
              : null;
            return (
              <div
                key={d.id}
                className="group rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-white/25 transition-colors"
              >
                <div className="relative aspect-[4/3] bg-white/5">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-5"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20">
                      <ShoppingBag className="h-10 w-10" />
                    </div>
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-[10px] font-bold px-2.5 py-1">
                    −{Math.round(d.discount_percent)}%
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                  <p className="text-[11px] text-white/40 mt-1">
                    {new Date(d.ends_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  {final != null && (
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-bold text-secondary">{formatCOP(final)}</span>
                      <span className="text-xs text-white/30 line-through">
                        {formatCOP(p.price as number)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================== AUXILIARES ============================== */

function Perk({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-neutral-950">{icon}</div>
      <h3 style={SPACE} className="font-bold text-lg">
        {title}
      </h3>
      <p className="text-sm text-neutral-500 max-w-xs leading-relaxed">{text}</p>
    </div>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !consent) {
      setError("Ingresa un correo y acepta el tratamiento de datos.");
      return;
    }
    setLoading(true);
    const emailLc = email.trim().toLowerCase();
    const { error: err } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: emailLc, source: "producto-semana" });
    if (err && !String(err.message).toLowerCase().includes("duplicate")) {
      setLoading(false);
      setError("No pudimos registrar tu correo. Intenta de nuevo.");
      return;
    }
    await syncToBrevo(emailLc, "weekly_deal", { SOURCE: "producto-semana" }).catch(() => {});
    recordLegalAcceptance({
      keys: ["privacidad"],
      origin: "newsletter-producto-semana",
      reference: emailLc,
    }).catch(() => {});
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white">
        <p className="text-lg font-semibold">¡Listo! Te avisaremos.</p>
        <p className="text-white/60 text-sm mt-1">
          Recibirás un correo cuando revelemos el próximo Producto de la Semana.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-left text-white">
      <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 mb-2 text-center">
        No te pierdas el próximo viernes
      </p>
      <h3
        style={SPACE}
        className="text-2xl md:text-3xl font-bold text-center mb-6 tracking-[-0.02em]"
      >
        Recibe las próximas revelaciones
      </h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="flex-1 rounded-full bg-white/10 border border-white/20 px-5 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/40"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-8"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suscribirme"}
        </Button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-xs text-white/60 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/30 bg-white/10"
        />
        <span>
          Acepto el tratamiento de mis datos personales conforme a la{" "}
          <LegalLink doc="privacidad" className="hover:text-white" /> de All For All para recibir
          comunicaciones comerciales.
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </form>
  );
}

function StockBar({ limit }: { limit: number }) {
  // Progreso simulado basado en tiempo dentro del día (placeholder mientras no haya inventario real).
  const [pct, setPct] = useState(30);
  useEffect(() => {
    const compute = () => {
      const seed = (Date.now() / 3600000) % limit;
      const remaining = Math.max(1, Math.floor(limit - (seed % limit)));
      setPct(Math.min(95, Math.round(((limit - remaining) / limit) * 100)));
    };
    compute();
    const id = setInterval(compute, 30000);
    return () => clearInterval(id);
  }, [limit]);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-secondary">¡Últimas unidades!</span>
        <span className="text-white/40">{pct}% reservado</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-secondary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
