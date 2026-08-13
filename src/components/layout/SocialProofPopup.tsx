import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { getSocialProofOrders } from "@/lib/public.functions";

type RealOrder = {
  customerFirstName: string;
  city: string | null;
  productName: string;
};

export function SocialProofPopup() {
  const [item, setItem] = useState<RealOrder | null>(null);
  const [orders, setOrders] = useState<RealOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getSocialProofOrders();
        if (cancelled) return;
        const parsed: RealOrder[] = (res.orders || []).map((o) => ({
          customerFirstName: o.firstName,
          city: o.city,
          productName: o.productName,
        }));
        setOrders(parsed);
      } catch {
        /* ignore — popup is non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (orders.length === 0) return;
    let i = 0;
    const show = () => {
      setItem(orders[i % orders.length]);
      i++;
      setTimeout(() => setItem(null), 6000);
    };
    const initial = setTimeout(show, 12000);
    const interval = setInterval(show, 45000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [orders]);

  if (!item) return null;

  return (
    <div className="fixed bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+4.5rem)] left-3 z-40 max-w-[calc(100vw-1.5rem)] animate-in slide-in-from-bottom-4 fade-in duration-150 sm:left-4 sm:max-w-xs">
      <div className="bg-card border shadow-lg rounded-xl p-3 pr-8 flex gap-3 items-start relative">
        <button
          onClick={() => setItem(null)}
          className="absolute right-0 top-0 grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Cerrar aviso de compra reciente"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <div className="h-9 w-9 rounded-full bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="text-xs leading-relaxed">
          <p>
            <span className="font-semibold">{item.customerFirstName}</span>
            {item.city ? ` desde ${item.city}` : ""} acaba de comprar
          </p>
          <p className="text-muted-foreground truncate">{item.productName}</p>
        </div>
      </div>
    </div>
  );
}
