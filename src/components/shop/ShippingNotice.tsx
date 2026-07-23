import { Truck, Check, Info } from "lucide-react";
import { formatCOP } from "@/lib/cart";
import {
  FREE_SHIPPING_CITIES_TEXT,
  FREE_SHIPPING_HEADLINE,
  FREE_SHIPPING_REST_TEXT,
  FREE_SHIPPING_THRESHOLD,
  getShippingStatus,
} from "@/lib/shipping";
import { cn } from "@/lib/utils";

/** Banda informativa de la política de envíos (home, fichas, footer de secciones). */
export function FreeShippingStrip({ className }: { className?: string }) {
  return (
    <div className={cn("bg-neutral-950 text-white", className)}>
      <div className="container mx-auto px-6 lg:px-10 py-3 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-1 text-center">
        <span className="inline-flex items-center gap-2 text-sm font-bold">
          <Truck className="h-4 w-4" />
          {FREE_SHIPPING_HEADLINE}
        </span>
        <span className="text-xs text-white/70">{FREE_SHIPPING_CITIES_TEXT}</span>
        <span className="text-xs text-white/50">{FREE_SHIPPING_REST_TEXT}</span>
      </div>
    </div>
  );
}

/**
 * Resumen del envío según subtotal y ciudad. Se usa en el carrito (sin ciudad)
 * y en el checkout (con la ciudad ya seleccionada).
 */
export function ShippingSummary({
  subtotal,
  city,
  className,
}: {
  subtotal: number;
  city?: string | null;
  className?: string;
}) {
  const status = getShippingStatus(subtotal, city);
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  const tone =
    status.kind === "free"
      ? "border-green-600/30 bg-green-50 text-green-900"
      : status.kind === "quote"
        ? "border-amber-500/30 bg-amber-50 text-amber-900"
        : "border-border bg-muted/40 text-foreground";

  return (
    <div className={cn("rounded-xl border p-3 text-sm", tone, className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-medium">
          {status.kind === "free" ? <Check className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
          Envío
        </span>
        <span className={cn("font-bold", status.kind === "free" && "uppercase")}>
          {status.label}
        </span>
      </div>

      {status.kind !== "free" && status.kind !== "quote" && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          {status.missing > 0 && (
            <p className="text-xs mt-1.5 opacity-80">
              Agrega <strong>{formatCOP(status.missing)}</strong> más para envío gratis a ciudades
              principales.
            </p>
          )}
        </div>
      )}

      <p className="text-xs mt-2 opacity-75 flex items-start gap-1.5">
        <Info className="h-3.5 w-3.5 mt-px shrink-0" />
        <span>{status.note}</span>
      </p>
    </div>
  );
}
