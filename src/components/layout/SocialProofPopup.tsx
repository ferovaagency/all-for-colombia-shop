import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type RealOrder = {
  customerFirstName: string;
  city: string | null;
  productName: string;
};

function firstName(name: string | null | undefined): string {
  if (!name) return "Alguien";
  const parts = name.trim().split(/\s+/);
  return parts[0] || "Alguien";
}

function extractCity(addr: unknown): string | null {
  if (!addr || typeof addr !== "object") return null;
  const a = addr as Record<string, unknown>;
  const candidates = [a.city, a.ciudad, a.locality, a.town];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function extractProductName(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const first = items[0] as Record<string, unknown>;
  const candidates = [first?.name, first?.product_name, first?.title];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export function SocialProofPopup() {
  const [item, setItem] = useState<RealOrder | null>(null);
  const [orders, setOrders] = useState<RealOrder[]>([]);

  // Fetch real completed orders. If none, the popup never shows.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("customer_name, items, created_at, shipping_address")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled || error || !data) return;

      const parsed: RealOrder[] = data
        .map((row: any) => {
          const productName = extractProductName(row.items);
          if (!productName) return null;
          return {
            customerFirstName: firstName(row.customer_name),
            city: extractCity(row.shipping_address),
            productName,
          } as RealOrder;
        })
        .filter((o): o is RealOrder => o !== null);

      setOrders(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Rotation loop: only runs if we actually have real orders.
  useEffect(() => {
    if (orders.length === 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const showOne = () => {
      const next = orders[Math.floor(Math.random() * orders.length)];
      setItem(next);
      timer = setTimeout(() => {
        setItem(null);
        timer = setTimeout(showOne, 12000 + Math.random() * 8000);
      }, 6000);
    };
    timer = setTimeout(showOne, 15000);
    return () => clearTimeout(timer);
  }, [orders]);

  if (!item) return null;

  const place = item.city ? `${item.customerFirstName} en ${item.city}` : `${item.customerFirstName}`;

  return (
    <div
      className="fixed bottom-24 left-6 z-30 max-w-xs bg-card border shadow-elevated rounded-lg p-3 flex items-start gap-3 animate-fade-in-up"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
        <ShoppingBag className="h-5 w-5 text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{place}</p>
        <p className="text-sm font-medium line-clamp-2">acaba de comprar {item.productName}</p>
      </div>
      <button
        onClick={() => setItem(null)}
        aria-label="Cerrar"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
