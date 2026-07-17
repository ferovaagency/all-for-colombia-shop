import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatCOP } from "@/lib/cart";
import { Trash2, Sparkles, Pencil, X } from "lucide-react";

type Product = { id: string; name: string; price: number | null; slug: string };
type Deal = {
  id: string;
  product_id: string;
  discount_percent: number;
  reveal_at: string;
  ends_at: string;
  stock_limit: number | null;
  is_active: boolean;
  products?: { name: string; price: number | null } | null;
};

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WeeklyDealsAdmin({ products }: { products: Product[] }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [discount, setDiscount] = useState<number>(50);
  const [revealAt, setRevealAt] = useState(toLocalInput(new Date().toISOString()));
  const [endsAt, setEndsAt] = useState(
    toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()),
  );
  const [stockLimit, setStockLimit] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("weekly_deals")
      .select("*, products(name, price)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDeals((data as Deal[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedProduct = products.find((p) => p.id === productId);
  const previewFinal = selectedProduct?.price
    ? Math.max(0, Math.round(selectedProduct.price * (1 - Number(discount) / 100)))
    : null;

  const resetForm = () => {
    setEditingId(null);
    setProductId("");
    setDiscount(50);
    setRevealAt(toLocalInput(new Date().toISOString()));
    setEndsAt(toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()));
    setStockLimit("");
    setIsActive(true);
  };

  const startEdit = (deal: Deal) => {
    setEditingId(deal.id);
    setProductId(deal.product_id);
    setDiscount(Number(deal.discount_percent));
    setRevealAt(toLocalInput(deal.reveal_at));
    setEndsAt(toLocalInput(deal.ends_at));
    setStockLimit(deal.stock_limit ? String(deal.stock_limit) : "");
    setIsActive(deal.is_active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!productId) return toast.error("Selecciona un producto");
    if (!revealAt || !endsAt) return toast.error("Configura las fechas");
    if (new Date(endsAt) <= new Date(revealAt))
      return toast.error("La fecha de fin debe ser posterior a la revelación");
    const d = Number(discount);
    if (!(d > 0 && d <= 80)) return toast.error("El descuento debe estar entre 1 y 80");

    setLoading(true);
    // Desactivar otros deals si este va activo
    if (isActive) {
      const deactivate = supabase.from("weekly_deals").update({ is_active: false }).eq("is_active", true);
      await (editingId ? deactivate.neq("id", editingId) : deactivate);
    }

    const payload = {
      product_id: productId,
      discount_percent: d,
      reveal_at: new Date(revealAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      stock_limit: stockLimit ? Number(stockLimit) : null,
      is_active: isActive,
    };

    const { error } = editingId
      ? await supabase.from("weekly_deals").update(payload).eq("id", editingId)
      : await supabase.from("weekly_deals").insert(payload);

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Producto de la Semana actualizado" : "Producto de la Semana configurado");
    resetForm();
    load();
  };

  const toggleActive = async (deal: Deal, next: boolean) => {
    if (next) {
      await supabase.from("weekly_deals").update({ is_active: false }).eq("is_active", true);
    }
    const { error } = await supabase
      .from("weekly_deals")
      .update({ is_active: next })
      .eq("id", deal.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (deal: Deal) => {
    if (!confirm("¿Eliminar esta configuración?")) return;
    const { error } = await supabase.from("weekly_deals").delete().eq("id", deal.id);
    if (error) return toast.error(error.message);
    toast.success("Eliminada");
    if (editingId === deal.id) resetForm();
    load();
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border p-5 bg-card">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          {editingId ? "Editar configuración" : "Nueva configuración"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Producto</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Selecciona un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCOP(p.price ?? 0)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Descuento (%) — máx 80</Label>
            <Input
              type="number"
              min={1}
              max={80}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
            {selectedProduct?.price && previewFinal !== null && (
              <p className="text-xs mt-1 text-muted-foreground">
                Precio final:{" "}
                <span className="font-semibold text-red-600">{formatCOP(previewFinal)}</span>{" "}
                <span className="line-through ml-2">{formatCOP(selectedProduct.price)}</span>
              </p>
            )}
          </div>
          <div>
            <Label>Fecha y hora de revelación</Label>
            <Input
              type="datetime-local"
              value={revealAt}
              onChange={(e) => setRevealAt(e.target.value)}
            />
          </div>
          <div>
            <Label>Fecha y hora de fin</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <div>
            <Label>Stock limitado (opcional)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Ej: 20"
              value={stockLimit}
              onChange={(e) => setStockLimit(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="!m-0">Activar ahora (desactiva las anteriores)</Label>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {editingId && (
            <Button variant="outline" onClick={resetForm} disabled={loading}>
              <X className="h-4 w-4 mr-1" /> Cancelar edición
            </Button>
          )}
          <Button onClick={submit} disabled={loading}>
            {loading ? "Guardando…" : editingId ? "Guardar cambios" : "Guardar configuración"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Revelación</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.products?.name ?? "—"}</TableCell>
                <TableCell>{Math.round(Number(d.discount_percent))}%</TableCell>
                <TableCell className="text-xs">{new Date(d.reveal_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{new Date(d.ends_at).toLocaleString()}</TableCell>
                <TableCell>{d.stock_limit ?? "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={d.is_active}
                    onCheckedChange={(v) => toggleActive(d, v)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(d)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(d)} title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {deals.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                  No hay configuraciones aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
