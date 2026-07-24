import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { Sparkles, ShoppingBag, Zap, ShieldCheck, Truck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/producto-de-la-semana")({
  head: () => ({
    meta: [
      { title: "Producto de la Semana — Hasta 80% OFF | All For All" },
      {
        name: "description",
        content:
          "Cada semana revelamos un producto seleccionado con hasta 80% de descuento. Tiempo y stock limitados.",
      },
      { property: "og:title", content: "Producto de la Semana — Hasta 80% OFF" },
      {
        property: "og:description",
        content: "Descuentos exclusivos por tiempo limitado. Solo esta semana.",
      },
    ],
  }),
  component: WeeklyDealPage,
});

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

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

function WeeklyDealPage() {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("weekly_deals")
        .select(
          "id, product_id, discount_percent, reveal_at, ends_at, stock_limit, is_active, teaser_images, product:products(id, slug, name, description, short_description, price, images, sku)",
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setDeal((data as unknown as Deal) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!deal || !deal.product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-black text-white">
        <Sparkles className="h-14 w-14 text-white/40 mb-6" />
        <h1 style={SPACE} className="text-4xl md:text-6xl font-bold tracking-[-0.04em] mb-3">
          Muy pronto: Producto de la Semana
        </h1>
        <p className="text-white/60 max-w-lg mb-8">
          Estamos preparando una oferta exclusiva con hasta 80% de descuento. Vuelve pronto para
          descubrirla.
        </p>
        <Button
          asChild
          size="lg"
          className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-8"
        >
          <Link to="/tienda">Explorar la tienda</Link>
        </Button>
      </div>
    );
  }

  return <DealBody deal={deal} />;
}

function DealBody({ deal }: { deal: Deal }) {
  const reveal = useCountdown(deal.reveal_at);
  if (!reveal.done) return <TeaserState deal={deal} />;
  return <RevealedState deal={deal} />;
}

/* ============================== ESTADO 1: EXPECTATIVA ============================== */

function TeaserState({ deal }: { deal: Deal }) {
  const teasers = (deal.teaser_images ?? []).filter(Boolean);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (teasers.length < 2) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % teasers.length), 3500);
    return () => clearInterval(t);
  }, [teasers.length]);

  return (
    <div className="bg-black text-white">
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-secondary/25 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/40 blur-[120px]" />
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

          <h1
            style={SPACE}
            className="text-[clamp(2.5rem,9vw,7rem)] font-bold tracking-[-0.05em] leading-[0.92] max-w-5xl bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent"
          >
            Algo increíble
            <br />
            está por llegar.
          </h1>

          <p className="mt-8 text-lg md:text-2xl text-white/50 max-w-2xl font-light">
            Un producto seleccionado con hasta{" "}
            <span className="text-white font-medium">
              {Math.round(deal.discount_percent)}% menos
            </span>
            . Stock limitado. Tiempo limitado.
          </p>

          <p className="mt-14 text-[10px] uppercase tracking-[0.35em] text-white/40 mb-4">
            Se revela en
          </p>
          <Countdown target={deal.reveal_at} />
        </motion.div>

        {/* Silueta o foto sorpresa */}
        <div className="relative z-10 mt-16 w-full max-w-2xl aspect-square rounded-[2rem] border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
          {teasers[idx] ? (
            <motion.img
              key={teasers[idx]}
              src={teasers[idx]}
              alt="Pista del Producto de la Semana"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9 }}
              className="h-full w-full object-cover"
            />
          ) : (
            <ShoppingBag className="h-40 w-40 text-white/10" strokeWidth={0.75} />
          )}
        </div>
      </section>

      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-6 max-w-xl">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}

/* ============================== ESTADO 2: REVELADO ============================== */

function RevealedState({ deal }: { deal: Deal }) {
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

  const end = useCountdown(deal.ends_at);
  const urgent = end.totalSec > 0 && end.totalSec < 60 * 60 * 6; // últimas 6h

  if (end.done) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-black text-white">
        <h1 style={SPACE} className="text-4xl md:text-6xl font-bold tracking-[-0.04em] mb-3">
          La oferta terminó
        </h1>
        <p className="text-white/60 mb-8 max-w-md">
          El Producto de la Semana ya no está disponible. Vuelve pronto para la próxima revelación.
        </p>
        <Button
          asChild
          size="lg"
          className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-8"
        >
          <Link to="/tienda">Ir a la tienda</Link>
        </Button>
      </div>
    );
  }

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

  // Los párrafos de la descripción se muestran como bloques grandes alternando fondo.
  const paragraphs = (product.description ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="bg-black text-white">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-6 pt-16 md:pt-24 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] backdrop-blur mb-8">
              <Zap className="h-3 w-3 text-secondary" /> Producto de la Semana
            </span>

            <h1
              style={SPACE}
              className="text-[clamp(2.5rem,8vw,6.5rem)] font-bold tracking-[-0.05em] leading-[0.92] max-w-5xl mx-auto bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent"
            >
              {product.name}
            </h1>

            {product.short_description && (
              <p className="mt-7 text-xl md:text-3xl text-white/50 max-w-3xl mx-auto font-light leading-snug">
                {product.short_description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
              <span style={SPACE} className="text-4xl md:text-6xl font-bold tracking-[-0.03em]">
                {formatCOP(final)}
              </span>
              <span className="text-lg md:text-2xl text-white/30 line-through">
                {formatCOP(original)}
              </span>
              <span className="text-sm md:text-base font-semibold text-secondary">
                Ahorras {formatCOP(savings)}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Imagen protagónica a sangre */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative mx-auto max-w-6xl aspect-[16/10] md:aspect-[16/9]"
          >
            {images[idx] ? (
              <img
                src={images[idx]}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-contain"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                Sin imagen
              </div>
            )}
            <span className="absolute top-2 left-2 md:top-6 md:left-6 rounded-full bg-secondary text-white font-bold px-4 py-2 text-sm">
              −{Math.round(deal.discount_percent)}%
            </span>
          </motion.div>

          {images.length > 1 && (
            <div className="mt-6 flex justify-center gap-2.5 pb-4">
              {images.slice(0, 6).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  className={cn(
                    "h-14 w-14 rounded-xl overflow-hidden border transition-all",
                    i === idx ? "border-white scale-105" : "border-white/15 hover:border-white/40",
                  )}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contador */}
        <div className="container mx-auto px-6 pb-16 md:pb-24 flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 mb-4">
            {urgent ? "¡Se acaba pronto!" : "Termina en"}
          </p>
          <Countdown target={deal.ends_at} urgent={urgent} />
        </div>
      </section>

      {/* ============ BARRA STICKY DE COMPRA ============ */}
      <section className="sticky top-[calc(5rem+1.75rem)] md:top-[calc(6rem+1.75rem)] z-30 bg-black/80 backdrop-blur-xl border-y border-white/10">
        <div className="container mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold">{formatCOP(final)}</span>
            <span className="text-sm text-white/30 line-through">{formatCOP(original)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="rounded-full text-white hover:bg-white/10 font-semibold"
            >
              <Link to="/producto/$slug" params={{ slug: product.slug }}>
                Ver detalles
              </Link>
            </Button>
            <Button
              onClick={buyNow}
              className="rounded-full bg-white text-black hover:bg-white/90 font-bold px-8"
            >
              Comprar ahora
            </Button>
          </div>
        </div>
        {deal.stock_limit && deal.stock_limit > 0 && <StockBar limit={deal.stock_limit} />}
      </section>

      {/* ============ BLOQUES DE BENEFICIOS (alternando negro/blanco) ============ */}
      <section className="bg-white text-neutral-950">
        <div className="container mx-auto px-6 py-24 md:py-36 text-center max-w-4xl">
          <h2
            style={SPACE}
            className="text-[clamp(2rem,6vw,4.5rem)] font-bold tracking-[-0.04em] leading-[1.02]"
          >
            Todo lo que necesitas.
            <br />
            <span className="text-neutral-400">Nada de lo que no.</span>
          </h2>
          {paragraphs[0] && (
            <p className="mt-8 text-lg md:text-2xl text-neutral-600 font-light leading-relaxed">
              {paragraphs[0]}
            </p>
          )}
        </div>
      </section>

      {images[1] && (
        <section className="bg-black">
          <img
            src={images[1]}
            alt={product.name}
            className="w-full max-h-[80vh] object-contain mx-auto"
          />
        </section>
      )}

      {paragraphs.slice(1).map((text, i) => (
        <section
          key={i}
          className={cn(i % 2 === 0 ? "bg-black text-white" : "bg-white text-neutral-950")}
        >
          <div className="container mx-auto px-6 py-20 md:py-28 max-w-3xl text-center">
            <p
              className={cn(
                "text-xl md:text-3xl font-light leading-relaxed",
                i % 2 === 0 ? "text-white/70" : "text-neutral-600",
              )}
            >
              {text}
            </p>
          </div>
        </section>
      ))}

      {/* ============ GARANTÍAS ============ */}
      <section className="bg-[#f5f5f7] text-neutral-950">
        <div className="container mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <Perk
            icon={<Truck className="h-8 w-8" />}
            title="Envío gratis desde $200.000"
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

      {/* ============ CIERRE ============ */}
      <section className="bg-black text-white text-center">
        <div className="container mx-auto px-6 py-24 md:py-32">
          <h2
            style={SPACE}
            className="text-[clamp(2rem,6vw,4.5rem)] font-bold tracking-[-0.04em] leading-[1.02]"
          >
            No lo pienses más.
          </h2>
          <p className="text-white/50 mt-4 text-lg">
            Cuando el reloj llegue a cero, la oferta desaparece.
          </p>

          <div className="mt-10 flex justify-center">
            <Countdown target={deal.ends_at} urgent={urgent} compact />
          </div>

          <Button
            size="lg"
            onClick={buyNow}
            className="mt-10 rounded-full bg-white text-black hover:bg-white/90 font-bold px-10 py-6 text-lg"
          >
            Comprar ahora por {formatCOP(final)}
          </Button>

          <div className="mt-20 max-w-xl mx-auto">
            <NewsletterSignup />
          </div>
        </div>
      </section>
    </div>
  );
}

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
        No te pierdas el próximo
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
    <div className="container mx-auto px-6 pb-3">
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
