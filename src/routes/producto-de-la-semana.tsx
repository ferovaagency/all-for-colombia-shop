import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Countdown, useCountdown } from "@/components/WeeklyDealCountdown";
import { formatCOP, useCart } from "@/lib/cart";
import { syncToBrevo } from "@/lib/brevo";
import { Sparkles, ShoppingBag, Zap, ShieldCheck, Truck, Loader2 } from "lucide-react";

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

type Deal = {
  id: string;
  product_id: string;
  discount_percent: number;
  reveal_at: string;
  ends_at: string;
  stock_limit: number | null;
  is_active: boolean;
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
          "id, product_id, discount_percent, reveal_at, ends_at, stock_limit, is_active, product:products(id, slug, name, description, short_description, price, images, sku)",
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!deal || !deal.product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <Sparkles className="h-14 w-14 text-primary mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          Muy pronto: Producto de la Semana
        </h1>
        <p className="text-muted-foreground max-w-lg mb-6">
          Estamos preparando una oferta exclusiva con hasta 80% de descuento. Vuelve pronto para
          descubrirla.
        </p>
        <Button asChild size="lg">
          <Link to="/tienda">Explorar la tienda</Link>
        </Button>
      </div>
    );
  }

  return <DealBody deal={deal} />;
}

function DealBody({ deal }: { deal: Deal }) {
  const reveal = useCountdown(deal.reveal_at);
  const revealed = reveal.done;

  if (!revealed) return <TeaserState deal={deal} />;
  return <RevealedState deal={deal} />;
}

/* ============================== ESTADO 1: EXPECTATIVA ============================== */

function TeaserState({ deal }: { deal: Deal }) {
  return (
    <div className="relative min-h-[85vh] overflow-hidden bg-gradient-to-br from-slate-950 via-primary/40 to-slate-900 text-white">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-secondary/40 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/50 blur-3xl animate-pulse" />
      </div>

      <div className="relative container mx-auto px-4 py-20 md:py-28 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.25em] backdrop-blur mb-8">
          <Sparkles className="h-3.5 w-3.5" /> Producto de la Semana
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.05]">
          Algo <span className="text-secondary">increíble</span> está por revelarse
        </h1>

        <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl">
          Un producto seleccionado con hasta{" "}
          <span className="font-bold text-white">{Math.round(deal.discount_percent)}% OFF</span>.
          Stock limitado, tiempo limitado.
        </p>

        <div className="mt-12">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-4">Se revela en</p>
          <Countdown target={deal.reveal_at} />
        </div>

        {/* Silueta / caja misteriosa */}
        <div className="mt-16 relative w-full max-w-lg aspect-square">
          <div className="absolute inset-0 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md" />
          <div className="absolute inset-8 rounded-2xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
            <ShoppingBag className="h-32 w-32 text-white/20" strokeWidth={1} />
          </div>
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 blur-2xl -z-10 animate-pulse" />
        </div>

        <p className="mt-12 text-white/60 text-sm max-w-md">
          Activa las notificaciones o vuelve pronto — cuando el reloj llegue a cero, la oferta se
          revela y comienza la cuenta regresiva para comprar.
        </p>
      </div>
    </div>
  );
}

/* ============================== ESTADO 2: REVELADO ============================== */

function RevealedState({ deal }: { deal: Deal }) {
  const product = deal.product!;
  const images = product.images ?? [];
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">La oferta terminó</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          El Producto de la Semana ya no está disponible. Vuelve pronto para la próxima revelación.
        </p>
        <Button asChild size="lg">
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

  return (
    <div className="bg-white text-neutral-900">
      {/* ============ HERO (Apple-style) ============ */}
      <section
        className={`relative overflow-hidden ${
          urgent ? "bg-gradient-to-b from-red-950 to-neutral-950" : "bg-gradient-to-b from-neutral-950 to-neutral-900"
        } text-white`}
      >
        <div className="container mx-auto px-6 pt-16 pb-8 md:pt-24 md:pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] backdrop-blur mb-6">
            <Zap className="h-3.5 w-3.5 text-secondary" /> Oferta Revelada · Solo por tiempo limitado
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.02] max-w-5xl mx-auto">
            {product.name}
          </h1>
          {product.short_description && (
            <p className="mt-6 text-xl md:text-2xl text-white/70 max-w-2xl mx-auto font-light">
              {product.short_description}
            </p>
          )}

          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              {urgent ? "¡Se acaba pronto!" : "Termina en"}
            </p>
            <Countdown target={deal.ends_at} urgent={urgent} />
          </div>
        </div>

        {/* Imagen protagónica */}
        <div className="container mx-auto px-6 pb-16 md:pb-24">
          <div className="relative mx-auto max-w-4xl aspect-[4/3] md:aspect-[16/10] rounded-3xl bg-white overflow-hidden shadow-2xl">
            {images[idx] ? (
              <img
                src={images[idx]}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-contain p-6 md:p-12"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                Sin imagen
              </div>
            )}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 rounded-full bg-red-600 text-white font-bold px-4 py-2 text-sm md:text-base shadow-lg">
              −{Math.round(deal.discount_percent)}%
            </div>
          </div>
          {images.length > 1 && (
            <div className="mt-6 flex justify-center gap-3">
              {images.slice(0, 5).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition ${
                    i === idx ? "border-white" : "border-white/20 hover:border-white/50"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ PRECIO + CTA ============ */}
      <section className="border-b border-neutral-200 bg-white sticky top-16 z-30 backdrop-blur">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-3 flex-wrap justify-center">
            <span className="text-3xl md:text-4xl font-bold text-red-600">{formatCOP(final)}</span>
            <span className="text-lg text-neutral-400 line-through">{formatCOP(original)}</span>
            <span className="text-sm font-semibold text-green-600">
              Ahorras {formatCOP(savings)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="lg">
              <Link to="/producto/$slug" params={{ slug: product.slug }}>
                Ver detalles
              </Link>
            </Button>
            <Button
              size="lg"
              onClick={buyNow}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8"
            >
              Comprar ahora
            </Button>
          </div>
        </div>
        {deal.stock_limit && deal.stock_limit > 0 && <StockBar limit={deal.stock_limit} />}
      </section>

      {/* ============ BENEFICIOS (Apple-style tipografía grande) ============ */}
      {product.description && (
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-center mb-12 leading-tight">
              Todo lo que necesitas.
              <br />
              <span className="text-neutral-500">Nada de lo que no.</span>
            </h2>
            <div className="prose prose-lg md:prose-xl max-w-none prose-neutral text-neutral-700 leading-relaxed">
              {product.description.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ TRUST BADGES ============ */}
      <section className="bg-neutral-50 py-16">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Truck className="h-10 w-10 text-primary" />
            <h3 className="font-semibold text-lg">Envío a todo Colombia</h3>
            <p className="text-sm text-neutral-500">Coordinamos el despacho en menos de 24h.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <ShieldCheck className="h-10 w-10 text-primary" />
            <h3 className="font-semibold text-lg">Producto 100% original</h3>
            <p className="text-sm text-neutral-500">Garantía del fabricante incluida.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Zap className="h-10 w-10 text-primary" />
            <h3 className="font-semibold text-lg">Checkout rápido</h3>
            <p className="text-sm text-neutral-500">Compra en menos de 60 segundos.</p>
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL + NEWSLETTER ============ */}
      <section className="py-20 bg-gradient-to-b from-neutral-900 to-black text-white text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-5xl font-semibold mb-4">No lo pienses más.</h2>
          <p className="text-white/70 mb-8">Cuando el reloj llegue a cero, la oferta desaparece.</p>
          <Countdown target={deal.ends_at} urgent={urgent} compact />
          <div className="mt-8">
            <Button
              size="lg"
              onClick={buyNow}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-10 py-6 text-lg"
            >
              Comprar ahora por {formatCOP(final)}
            </Button>
          </div>

          <div className="mt-16 max-w-xl mx-auto">
            <NewsletterSignup />
          </div>
        </div>
      </section>
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
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
        <p className="text-lg font-semibold">¡Listo! Te avisaremos.</p>
        <p className="text-white/70 text-sm mt-1">
          Recibirás un correo cuando revelemos el próximo Producto de la Semana.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-left">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-2 text-center">
        No te pierdas el próximo
      </p>
      <h3 className="text-2xl md:text-3xl font-semibold text-center mb-6">
        Recibe las próximas revelaciones
      </h3>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="flex-1 rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suscribirme"}
        </Button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-xs text-white/70 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-white/30 bg-white/10"
        />
        <span>
          Acepto el tratamiento de mis datos personales conforme a la{" "}
          <Link to="/politica-privacidad" className="underline hover:text-white">
            Política de Privacidad
          </Link>{" "}
          de All For All para recibir comunicaciones comerciales.
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
        <span className="font-semibold text-red-600">¡Últimas unidades!</span>
        <span className="text-neutral-500">{pct}% reservado</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
