import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCOP } from "@/lib/cart";
import { Tag, Trash2, Pencil, X } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number | null;
  slug: string;
  images?: string[] | null;
};

type Coupon = {
  id: string;
  product_id: string;
  code: string;
  headline: string | null;
  discount_percent: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  products?: { name: string; price: number | null; images: string[] | null } | null;
};

/**
 * Cupones de descuento por producto. Se muestran en la vista "Ofertas"
 * del grid dinámico del home usando la imagen del producto.
 */
export function PromoCouponsAdmin({ products }: { products: Product[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [code, setCode] = useState("");
  const [headline, setHeadline] = useState("");
  const [discount, setDiscount] = useState<string>("10");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState<string>("0");
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("promo_coupons")
      .select("*, products(name, price, images)")
      .order("sort_order", { ascending: true });
    if (error) {
      // La migración puede no estar aplicada todavía.
      if (/does not exist|schema cache/i.test(error.message)) {
        setMissingTable(true);
        return;
      }
      toast.error(error.message);
      return;
    }
    setMissingTable(false);
    setCoupons((data as unknown as Coupon[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const selected = products.find((p) => p.id === productId);
  const previewFinal =
    selected?.price && Number(discount) > 0
      ? Math.max(0, Math.round(selected.price * (1 - Number(discount) / 100)))
      : null;

  const resetForm = () => {
    setEditingId(null);
    setProductId("");
    setCode("");
    setHeadline("");
    setDiscount("10");
    setImageUrl("");
    setSortOrder(String(coupons.length));
    setIsActive(true);
  };

  const startEdit = (c: Coupon) => {
    setEditingId(c.id);
    setProductId(c.product_id);
    setCode(c.code);
    setHeadline(c.headline ?? "");
    setDiscount(c.discount_percent != null ? String(c.discount_percent) : "");
    setImageUrl(c.image_url ?? "");
    setSortOrder(String(c.sort_order));
    setIsActive(c.is_active);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!productId) return toast.error("Selecciona un producto");
    if (!code.trim()) return toast.error("Escribe el código del cupón");
    const d = discount.trim() ? Number(discount) : null;
    if (d !== null && !(d > 0 && d <= 90))
      return toast.error("El descuento debe estar entre 1 y 90");

    setLoading(true);
    const payload = {
      product_id: productId,
      code: code.trim().toUpperCase(),
      headline: headline.trim() || null,
      discount_percent: d,
      image_url: imageUrl.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    const { error } = editingId
      ? await supabase.from("promo_coupons").update(payload).eq("id", editingId)
      : await supabase.from("promo_coupons").insert(payload);

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Cupón actualizado" : "Cupón creado");
    resetForm();
    load();
  };

  const toggleActive = async (c: Coupon, next: boolean) => {
    const { error } = await supabase
      .from("promo_coupons")
      .update({ is_active: next })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    const { error } = await supabase.from("promo_coupons").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Cupón eliminado");
    if (editingId === c.id) resetForm();
    load();
  };

  if (missingTable) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold mb-1">Falta aplicar la migración de cupones</p>
        <p>
          Ejecuta{" "}
          <code className="px-1 py-0.5 rounded bg-amber-100">
            supabase/migrations/20260723120000_promo_coupons_and_teaser_images.sql
          </code>{" "}
          en el proyecto de Supabase para habilitar esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-5 bg-card">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Tag className="h-4 w-4 text-primary" />
          {editingId ? "Editar cupón" : "Nuevo cupón de descuento"}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Estos cupones aparecen en el cuadro <strong>Ofertas</strong> del home, junto al Producto
          de la Semana, usando la imagen del producto.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
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
            <Label>Código del cupón</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: SPOWER"
              maxLength={30}
            />
          </div>

          <div>
            <Label>Descuento (%) — opcional</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="Ej: 10"
            />
            {previewFinal !== null && selected?.price && (
              <p className="text-xs mt-1 text-muted-foreground">
                Con cupón:{" "}
                <span className="font-semibold text-red-600">{formatCOP(previewFinal)}</span>{" "}
                <span className="line-through ml-1">{formatCOP(selected.price)}</span>
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <Label>Texto de la tarjeta (opcional)</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ej: Galaxy S26 Ultra, Dto 10% con SPOWER"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Si lo dejas vacío se arma automáticamente con el nombre del producto y el cupón.
            </p>
          </div>

          <div className="md:col-span-2">
            <Label>Imagen alternativa (opcional)</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Por defecto se usa la primera imagen del producto.
            </p>
          </div>

          <div>
            <Label>Orden</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Se muestran los 4 primeros en el home.
            </p>
          </div>

          <div className="flex items-end">
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="!m-0">Visible en el home</Label>
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
            {loading ? "Guardando…" : editingId ? "Guardar cambios" : "Crear cupón"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cupón</TableHead>
              <TableHead>Dto.</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {(c.image_url || c.products?.images?.[0]) && (
                      <img
                        src={c.image_url || c.products!.images![0]}
                        alt=""
                        className="h-8 w-8 rounded object-contain bg-muted"
                      />
                    )}
                    <span className="line-clamp-1">{c.products?.name ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="rounded-full bg-red-600/10 text-red-700 text-xs font-bold px-2 py-1">
                    {c.code}
                  </span>
                </TableCell>
                <TableCell>
                  {c.discount_percent ? `${Math.round(c.discount_percent)}%` : "—"}
                </TableCell>
                <TableCell>{c.sort_order}</TableCell>
                <TableCell>
                  <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c, v)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(c)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(c)} title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  Aún no hay cupones creados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
