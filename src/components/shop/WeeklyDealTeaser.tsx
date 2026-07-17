import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Countdown, useCountdown } from "@/components/WeeklyDealCountdown";
import { formatCOP } from "@/lib/cart";
import { Sparkles, ArrowRight } from "lucide-react";

type Deal = {
  id: string;
  discount_percent: number;
  reveal_at: string;
  ends_at: string;
  product: {
    slug: string;
    name: string;
    price: number | null;
    images: string[] | null;
  } | null;
};

export function WeeklyDealTeaser() {
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("weekly_deals")
        .select("id, discount_percent, reveal_at, ends_at, product:products(slug, name, price, images)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setDeal((data as unknown as Deal) ?? null);
    })();
  }, []);

  if (!deal || !deal.product) return null;

  return <DealCard deal={deal} />;
}

function DealCard({ deal }: { deal: Deal }) {
  const reveal = useCountdown(deal.reveal_at);
  const end = useCountdown(deal.ends_at);
  const product = deal.product!;

  if (end.done) return null;

  const revealed = reveal.done;
  const final = product.price
    ? Math.max(0, Math.round(product.price * (1 - deal.discount_percent / 100)))
    : null;

  return (
    <section className="container mx-auto px-4 py-12">
      <Link
        to="/producto-de-la-semana"
        className="group block relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-950 via-primary to-neutral-900 text-white shadow-elevated"
      >
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center p-6 md:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.25em] backdrop-blur mb-4">
              <Sparkles className="h-3.5 w-3.5 text-secondary" /> Producto de la Semana
            </div>
            {revealed ? (
              <>
                <h3 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">{product.name}</h3>
                {final !== null && (
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <span className="text-2xl font-bold text-secondary">{formatCOP(final)}</span>
                    {product.price && (
                      <span className="text-white/50 line-through">{formatCOP(product.price)}</span>
                    )}
                    <span className="text-xs font-semibold bg-red-600 px-2 py-1 rounded-full">
                      -{Math.round(deal.discount_percent)}%
                    </span>
                  </div>
                )}
              </>
            ) : (
              <h3 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">
                Algo increíble está por revelarse — hasta {Math.round(deal.discount_percent)}% OFF
              </h3>
            )}
            <p className="text-white/60 text-sm mb-1">
              {revealed ? "Termina en" : "Se revela en"}
            </p>
            <Countdown target={revealed ? deal.ends_at : deal.reveal_at} compact />
          </div>

          <Button size="lg" className="bg-white text-primary hover:bg-white/90 whitespace-nowrap">
            {revealed ? "Ver oferta" : "Ver detalles"} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Link>
    </section>
  );
}
