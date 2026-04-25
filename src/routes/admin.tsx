import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Trash2, ExternalLink, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatCOP, whatsappUrl } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — All For All" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  const reload = async () => {
    const [o, p, c, b, cu, po] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("*, categories(name), brands(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("brands").select("*"),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
    ]);
    setOrders(o.data || []); setProducts(p.data || []); setCategories(c.data || []);
    setBrands(b.data || []); setCustomers(cu.data || []); setPosts(po.data || []);
  };

  useEffect(() => { reload(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("products").update({ active: !active }).eq("id", id);
    toast.success(`Producto ${!active ? "activado" : "desactivado"}`);
    reload();
  };
  const removeProduct = async (id: string) => {
    if (!confirm("¿Eliminar producto?")) return;
    await supabase.from("products").delete().eq("id", id);
    reload();
  };
  const setOrderStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
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
          <Link to="/admin/generador-fichas"><Sparkles className="h-4 w-4 mr-2" /> Generador de fichas</Link>
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
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead></TableHead>
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
                        value={o.status}
                        onChange={(e) => setOrderStatus(o.id, e.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-card"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("es-CO")}</TableCell>
                    <TableCell>
                      <a href={whatsappUrl(`Hola ${o.customer_name}, soy de All For All. Tu pedido ${o.id.slice(0,8)} está siendo procesado.`)} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline text-xs inline-flex items-center gap-1">
                        WhatsApp <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin pedidos aún</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead><TableHead>SKU</TableHead><TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead><TableHead>Categoría</TableHead><TableHead>Activo</TableHead><TableHead></TableHead>
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
                    <TableCell><Switch checked={p.active} onCheckedChange={() => toggleActive(p.id, p.active)} /></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeProduct(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin productos. Usa el generador de fichas para crear el primero.</TableCell></TableRow>}
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
    </div>
  );
}

function SimpleList({ items, cols }: { items: any[]; cols: string[] }) {
  return (
    <div className="bg-card border rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{cols.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              {cols.map((c) => <TableCell key={c}>{String(it[c] ?? "—")}</TableCell>)}
            </TableRow>
          ))}
          {items.length === 0 && <TableRow><TableCell colSpan={cols.length} className="text-center text-muted-foreground py-8">Sin datos</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
