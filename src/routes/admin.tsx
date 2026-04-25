import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, ExternalLink, Sparkles, Eye, Pencil, AlertCircle, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatCOP, whatsappUrl } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — All For All" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

const ORDER_STATUSES = [
  { value: "pending", label: "Pendiente" },
  { value: "pending_verification", label: "Verificando pago" },
  { value: "confirmed", label: "Confirmado" },
  { value: "processing", label: "En proceso" },
  { value: "shipped", label: "Enviado" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersError, setOrdersError] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [viewingConv, setViewingConv] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = async () => {
    const [oRes, p, c, b, cu, po] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("*, categories(name), brands(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("brands").select("*"),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
    ]);
    if (oRes.error) {
      setOrdersError(oRes.error.message);
      setOrders([]);
    } else {
      setOrdersError("");
      setOrders(oRes.data || []);
    }
    setProducts(p.data || []);
    setCategories(c.data || []);
    setBrands(b.data || []);
    setCustomers(cu.data || []);
    setPosts(po.data || []);
  };

  useEffect(() => {
    reload();
  }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("products").update({ active: !active }).eq("id", id);
    toast.success(`Producto ${!active ? "activado" : "desactivado"}`);
    reload();
  };
  const confirmDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Producto eliminado");
    reload();
  };
  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Estado actualizado");
    reload();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">Gestiona pedidos, productos y contenido.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/generador-fichas">
            <Sparkles className="h-4 w-4 mr-2" /> Generador de fichas
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="orders">Pedidos ({orders.length})</TabsTrigger>
          <TabsTrigger value="products">Productos ({products.length})</TabsTrigger>
          <TabsTrigger value="categories">Categorías ({categories.length})</TabsTrigger>
          <TabsTrigger value="brands">Marcas ({brands.length})</TabsTrigger>
          <TabsTrigger value="customers">Clientes ({customers.length})</TabsTrigger>
          <TabsTrigger value="blog">Blog ({posts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          {ordersError && (
            <div className="mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertCircle className="h-4 w-4" /> Error cargando pedidos: {ordersError}
            </div>
          )}
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                    </TableCell>
                    <TableCell className="font-bold">{formatCOP(Number(o.total))}</TableCell>
                    <TableCell>
                      <select
                        value={o.status || "pending"}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                        className="border rounded px-2 py-1 text-xs bg-card"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("es-CO")}</TableCell>
                    <TableCell>
                      <a
                        href={whatsappUrl(`Hola ${o.customer_name}, soy de All For All. Tu pedido ${o.id.slice(0, 8)} está siendo procesado.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-secondary hover:underline text-xs inline-flex items-center gap-1"
                      >
                        WhatsApp <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && !ordersError && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sin pedidos aún
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-xs">{p.sku}</TableCell>
                    <TableCell>{formatCOP(Number(p.sale_price ?? p.price ?? 0))}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell className="text-xs">{p.categories?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" asChild>
                          <a href={`/producto/${p.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver">
                            <Eye className="w-3 h-3" />
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(p)} aria-label="Editar">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={p.active ? "default" : "outline"}
                          onClick={() => toggleActive(p.id, p.active)}
                        >
                          {p.active ? "Activo" : "Inactivo"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => confirmDelete(p.id, p.name)} aria-label="Eliminar">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sin productos. Usa el generador de fichas para crear el primero.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <SimpleList items={categories} cols={["name", "slug", "sort_order"]} />
        </TabsContent>
        <TabsContent value="brands" className="mt-6">
          <SimpleList items={brands} cols={["name", "slug"]} />
        </TabsContent>
        <TabsContent value="customers" className="mt-6">
          <SimpleList items={customers} cols={["name", "email", "phone", "company"]} />
        </TabsContent>
        <TabsContent value="blog" className="mt-6">
          <SimpleList items={posts} cols={["title", "slug", "category", "published"]} />
        </TabsContent>
      </Tabs>

      <EditProductDialog product={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}

function EditProductDialog({
  product,
  onClose,
  onSaved,
}: {
  product: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        price: product.price ?? "",
        sale_price: product.sale_price ?? "",
        stock: product.stock ?? 0,
        sku: product.sku || "",
        active: !!product.active,
        description: product.description || "",
      });
    }
  }, [product]);

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!product) return;
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: form.name,
        price: form.price === "" ? null : Number(form.price),
        sale_price: form.sale_price === "" ? null : Number(form.sale_price),
        stock: Number(form.stock) || 0,
        sku: form.sku || null,
        active: !!form.active,
        description: form.description || null,
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Producto actualizado");
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nombre</Label>
            <Input value={form.name || ""} onChange={(e) => setF("name", e.target.value)} />
          </div>
          <div>
            <Label>SKU</Label>
            <Input value={form.sku || ""} onChange={(e) => setF("sku", e.target.value)} />
          </div>
          <div>
            <Label>Stock</Label>
            <Input type="number" min={0} value={form.stock ?? 0} onChange={(e) => setF("stock", e.target.value)} />
          </div>
          <div>
            <Label>Precio (COP)</Label>
            <Input type="number" min={0} value={form.price ?? ""} onChange={(e) => setF("price", e.target.value)} />
          </div>
          <div>
            <Label>Precio oferta</Label>
            <Input
              type="number"
              min={0}
              value={form.sale_price ?? ""}
              onChange={(e) => setF("sale_price", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Descripción</Label>
            <Textarea rows={5} value={form.description || ""} onChange={(e) => setF("description", e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Switch checked={!!form.active} onCheckedChange={(v) => setF("active", v)} />
            <Label className="!m-0">Activo</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimpleList({ items, cols }: { items: any[]; cols: string[] }) {
  return (
    <div className="bg-card border rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              {cols.map((c) => (
                <TableCell key={c}>{String(it[c] ?? "—")}</TableCell>
              ))}
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={cols.length} className="text-center text-muted-foreground py-8">
                Sin datos
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
