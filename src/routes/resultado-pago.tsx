import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type S = { id?: string; status?: string };

export const Route = createFileRoute("/resultado-pago")({
  validateSearch: (s: Record<string, unknown>): S => ({
    id: typeof s.id === "string" ? s.id : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({ meta: [{ title: "Resultado del pago — All For All" }, { name: "robots", content: "noindex" }] }),
  component: PaymentResultPage,
});

function PaymentResultPage() {
  const { id, status } = Route.useSearch();
  const ok = status === "ok" || status === "approved";
  const failed = status === "failed" || status === "rejected";

  const Icon = ok ? CheckCircle2 : failed ? XCircle : Clock;
  const color = ok ? "text-success" : failed ? "text-destructive" : "text-warning";

  return (
    <div className="container mx-auto px-4 py-20 max-w-md text-center">
      <Icon className={`h-20 w-20 mx-auto mb-4 ${color}`} />
      <h1 className="text-3xl font-bold mb-2">
        {ok ? "¡Pedido confirmado!" : failed ? "Pago no completado" : "Pago en proceso"}
      </h1>
      <p className="text-muted-foreground mb-6">
        {ok
          ? "Te hemos enviado un mensaje por WhatsApp para coordinar el pago y la entrega."
          : failed
          ? "Hubo un problema procesando tu pago. Inténtalo de nuevo o escríbenos."
          : "Estamos verificando tu pago. Te avisaremos pronto."}
      </p>
      {id && <p className="text-xs text-muted-foreground mb-6">Pedido #{id.slice(0, 8)}</p>}
      <div className="flex justify-center gap-3">
        <Button asChild className="bg-primary"><Link to="/">Ir al inicio</Link></Button>
        <Button asChild variant="outline"><Link to="/mi-cuenta">Mis pedidos</Link></Button>
      </div>
    </div>
  );
}
