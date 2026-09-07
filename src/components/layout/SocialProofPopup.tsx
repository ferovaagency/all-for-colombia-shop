import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { getSocialProofOrders } from "@/lib/public.functions";

type RealOrder = {
  customerFirstName: string;
  city: string | null;
  productName: string;
};

export function SocialProofPopup() {
  const [item, setItem] = useState<RealOrder | null>({
    customerFirstName: "Laura",
    city: "Bogotá",
    productName: "Mouse Logitech M650 Signature inalámbrico color grafito",
  });
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [visible, setVisible] = useState(true);

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
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setItem(orders[i % orders.length]);
      i++;
      // Espera un frame para que la animación de entrada se vea
      requestAnimationFrame(() => setVisible(true));
      hideTimeout = setTimeout(() => {
        setVisible(false);
        // Quita el elemento del DOM cuando termina la animación de salida
        setTimeout(() => setItem(null), 250);
      }, 6000);
    };
    const initial = setTimeout(show, 12000);
    const interval = setInterval(show, 45000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [orders]);

  if (!item) return null;

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => setItem(null), 200);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-3 bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+4.25rem)] z-40 w-[min(20rem,calc(100vw-1.5rem))] sm:right-6 transition-all duration-200 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative flex items-center gap-3 rounded-xl border bg-card/95 p-3 pr-10 shadow-xl backdrop-blur-sm">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary/10 text-secondary">
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 text-xs leading-snug">
          <p className="text-foreground">
            <span className="font-semibold">{item.customerFirstName}</span>
            {item.city ? ` desde ${item.city}` : ""} acaba de comprar
          </p>
          <p
            className="mt-0.5 text-muted-foreground overflow-hidden"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.productName}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="absolute right-1 top-1 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Cerrar aviso de compra reciente"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
