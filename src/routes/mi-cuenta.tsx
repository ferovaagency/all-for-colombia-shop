import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCOP } from "@/lib/cart";
import { Package, User } from "lucide-react";
import { toast } from "sonner";
import { lookupGuestOrder } from "@/lib/public.functions";

export const Route = createFileRoute("/mi-cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta — All For All" },
      // Sobrescribe el "index, follow" del head global de __root.tsx.
      { name: "robots", content: "noindex, follow" },
      { name: "googlebot", content: "noindex, follow" },
    ],
  }),
  component: MyAccountPage,
});

function MyAccountPage() {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [searched, setSearched] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email.includes("@")) { toast.error("Email inválido"); return; }
    if (!/^[0-9a-f-]{36}$/i.test(orderId.trim())) { toast.error("ID de pedido inválido"); return; }
    setLoading(true);
    try {
      const { order } = await lookupGuestOrder({ data: { email, order_id: orderId.trim() } });
      setOrder(order);
    } catch {
      setOrder(null);
    }
    setSearched(true);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Mi cuenta</h1>
          <p className="text-sm text-muted-foreground">Consulta el estado de un pedido con tu email y el ID que recibiste al pagar.</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-card border rounded-xl p-6 mb-8 space-y-3">
        <div>
          <Label>Email del pedido</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label>ID del pedido (UUID)</Label>
          <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
        </div>
        <Button type="submit" className="bg-primary">Consultar</Button>
      </form>

      {loading && <p className="text-muted-foreground">Buscando...</p>}

      {searched && !loading && !order && (
        <div className="bg-muted/40 border rounded-xl p-8 text-center text-muted-foreground">
          No encontramos un pedido con ese email e ID.
        </div>
      )}

      {order && (
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-secondary" />
              <div>
                <p className="font-semibold">Pedido #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("es-CO")}</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary font-medium">{order.status}</span>
          </div>
          <div className="text-sm space-y-1">
            {(order.items || []).map((i: any, idx: number) => (
              <p key={idx} className="text-muted-foreground">• {i.name} x{i.quantity}</p>
            ))}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCOP(Number(order.total))}</span>
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-sm text-muted-foreground">
        ¿Necesitas ayuda? <Link to="/contacto" className="text-secondary hover:underline">Contáctanos</Link>
      </div>
    </div>
  );
}
