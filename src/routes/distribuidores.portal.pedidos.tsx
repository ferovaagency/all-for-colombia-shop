import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCOP } from "@/lib/cart";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/distribuidores/portal/pedidos")({
  component: DistributorOrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  pending_verification: "Verificando pago",
  confirmed: "Confirmado",
  processing: "En proceso",
  shipped: "Enviado",
  completed: "Completado",
  cancelled: "Cancelado",
};

function DistributorOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = localStorage.getItem("afa_distributor");
      if (!raw) {
        setLoading(false);
        return;
      }
      const distributor = JSON.parse(raw);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("distributor_id", distributor.id)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Mis pedidos</h2>
      <p className="text-sm text-muted-foreground mb-6">Historial y seguimiento de tus pedidos como distribuidor.</p>

      {loading ? (
        <p className="text-muted-foreground">Cargando pedidos...</p>
      ) : orders.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">Aún no tienes pedidos</p>
          <p className="text-sm text-muted-foreground mt-1">Cuando hagas tu primer pedido aparecerá aquí.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const items = Array.isArray(o.items) ? o.items : [];
                const itemCount = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("es-CO")}</TableCell>
                    <TableCell>{itemCount}</TableCell>
                    <TableCell className="font-bold">{formatCOP(Number(o.total))}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
