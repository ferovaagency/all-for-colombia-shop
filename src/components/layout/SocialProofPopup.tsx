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
    <div className="fixed bottom-24 left-4 z-40 max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-card border shadow-lg rounded-xl p-3 pr-8 flex gap-3 items-start relative">
        <button
          onClick={() => setItem(null)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
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
