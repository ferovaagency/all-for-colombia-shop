import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/cart";
import { Package, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mi-cuenta")({
  head: () => ({ meta: [{ title: "Mi cuenta — All For All" }] }),
  component: MyAccountPage,
});

function MyAccountPage() {
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("afa_email") : "";
    if (saved) {
      setEmail(saved);
      lookup(saved);
    }
  }, []);

  const lookup = async (e: string) => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").eq("customer_email", e).order("created_at", { ascending: false });
    setOrders(data || []);
    setSearched(true);
    setLoading(false);
    if (typeof window !== "undefined") localStorage.setItem("afa_email", e);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email.includes("@")) { toast.error("Email inválido"); return; }
    lookup(email);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Mi cuenta</h1>
          <p className="text-sm text-muted-foreground">Consulta el estado de tus pedidos</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-card border rounded-xl p-6 mb-8 flex gap-3">
        <div className="flex-1">
          <Label>Email del pedido</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" className="bg-primary self-end">Consultar</Button>
      </form>

      {loading && <p className="text-muted-foreground">Buscando...</p>}

      {searched && !loading && orders.length === 0 && (
        <div className="bg-muted/40 border rounded-xl p-8 text-center text-muted-foreground">
          No encontramos pedidos para ese email.
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-card border rounded-xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-secondary" />
                <div>
                  <p className="font-semibold">Pedido #{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("es-CO")}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary font-medium">{o.status}</span>
            </div>
            <div className="text-sm space-y-1">
              {(o.items || []).map((i: any, idx: number) => (
                <p key={idx} className="text-muted-foreground">• {i.name} x{i.quantity}</p>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCOP(Number(o.total))}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        ¿Necesitas ayuda? <Link to="/contacto" className="text-secondary hover:underline">Contáctanos</Link>
      </div>
    </div>
  );
}
