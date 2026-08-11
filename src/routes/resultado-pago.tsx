import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/cart";

type S = { id?: string; status?: string };

type OrderItem = { name?: string; price?: number; quantity?: number };
type OrderDetail = {
  id: string;
  status: string | null;
  items: OrderItem[] | null;
  subtotal: number | null;
  total: number | null;
  payment_method: string | null;
  customer_name: string | null;
};

export const Route = createFileRoute("/resultado-pago")({
  validateSearch: (s: Record<string, unknown>): S => ({
    id: typeof s.id === "string" ? s.id : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({ meta: [{ title: "Resultado del pago — All For All" }, { name: "robots", content: "noindex" }] }),
  component: PaymentResultPage,
});

// Normalize the transaction status from both the URL param and the order row.
function resolveStatus(urlStatus?: string, orderStatus?: string | null): "ok" | "failed" | "pending" {
  const paid = ["paid", "completed", "approved", "ok"];
  const failed = ["failed", "rejected", "cancelled", "canceled", "declined", "error"];
  if (orderStatus && paid.includes(orderStatus)) return "ok";
  if (orderStatus && failed.includes(orderStatus)) return "failed";
  if (urlStatus && paid.includes(urlStatus)) return "ok";
  if (urlStatus && failed.includes(urlStatus)) return "failed";
  return "pending";
}

function PaymentResultPage() {
  const { id, status } = Route.useSearch();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_order_for_payment", { _order_id: id });
        if (cancelled) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (!error && row) setOrder(row as OrderDetail);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const state = resolveStatus(status, order?.status);
  const ok = state === "ok";
  const failed = state === "failed";

  const Icon = ok ? CheckCircle2 : failed ? XCircle : Clock;
  const color = ok ? "text-success" : failed ? "text-destructive" : "text-warning";

  const items = order?.items ?? [];
  const total = order?.total ?? order?.subtotal ?? null;

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <div className="text-center">
        <Icon className={`h-20 w-20 mx-auto mb-4 ${color}`} />
        <h1 className="text-3xl font-bold mb-2">
          {ok ? "¡Pago completado!" : failed ? "Pago fallido" : "Pago en proceso"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {ok
            ? "Tu transacción fue aprobada. Te contactaremos para coordinar la entrega."
            : failed
              ? "Tu transacción no pudo completarse. No se realizó ningún cobro. Puedes intentar de nuevo o escribirnos."
              : "Estamos verificando el estado de tu transacción. Te avisaremos apenas se confirme."}
        </p>
      </div>

      {/* Detalle de la compra */}
      <div className="bg-card border rounded-xl p-5 text-left">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Detalle de la compra</h2>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              ok
                ? "bg-success/10 text-success"
                : failed
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/10 text-warning"
            }`}
          >
            {ok ? "Completada" : failed ? "Fallida" : "En proceso"}
          </span>
        </div>

        {id && <p className="text-xs text-muted-foreground mb-3">Pedido #{id.slice(0, 8)}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando el detalle...
          </div>
        ) : items.length > 0 ? (
          <>
            <ul className="divide-y">
              {items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {it.name ?? "Producto"} ×{it.quantity ?? 1}
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    {formatCOP((it.price ?? 0) * (it.quantity ?? 1))}
                  </span>
                </li>
              ))}
            </ul>
            {total != null && (
              <div className="flex justify-between border-t pt-3 mt-1 font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCOP(total)}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            No pudimos cargar el detalle del pedido. Guarda tu número de pedido para cualquier consulta.
          </p>
        )}
      </div>

      <div className="flex justify-center gap-3 mt-6">
        <Button asChild className="bg-primary">
          <Link to="/">Ir al inicio</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/mi-cuenta">Mis pedidos</Link>
        </Button>
      </div>
    </div>
  );
}
