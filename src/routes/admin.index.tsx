import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, ExternalLink, Sparkles, Eye, Pencil, AlertCircle, MessageSquare, Handshake, Check, X as XIcon, Send, Download, UploadCloud } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/cart";
import { Link } from "@tanstack/react-router";
import { formatCOP, whatsappUrl } from "@/lib/cart";
import { toast } from "sonner";
import { WeeklyDealsAdmin } from "@/components/admin/WeeklyDealsAdmin";
import { BulkInventoryUpload } from "@/components/admin/BulkInventoryUpload";

export const Route = createFileRoute("/admin/")({
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
  const [distributors, setDistributors] = useState<any[]>([]);
  const [credDist, setCredDist] = useState<any | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "retail" | "distributor">("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, any>>({});

  const reload = async () => {
    const { adminListDistributors } = await import("@/lib/distributors.functions");
    const [oRes, p, c, b, cu, po, conv, dist, payRes] = await Promise.all([
      supabase.from("orders").select("*, distributors(company_name)").neq("status", "cancelled").order("created_at", { ascending: false }).limit(500),
      supabase.from("products").select("*, categories(name), brands(name)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("brands").select("*"),
      supabase.from("customers").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("chat_conversations").select("*").order("updated_at", { ascending: false }).limit(100),
      adminListDistributors().catch(() => ({ distributors: [] })),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    const payMap: Record<string, any> = {};
    for (const pay of payRes.data || []) {
      if (pay.order_id && !payMap[pay.order_id]) payMap[pay.order_id] = pay;
    }
    setPayments(payMap);
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
    setConversations(conv.data || []);
    setDistributors(dist.distributors || []);
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
    if (status === "cancelled") {
      if (!confirm("Marcar como cancelado eliminará el pedido. ¿Continuar?")) return;
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) toast.error(error.message);
      else toast.success("Pedido cancelado y eliminado");
      reload();
      return;
    }
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Estado actualizado");
    reload();
  };

  const exportOrdersCSV = (rows: any[], filename: string) => {
    if (!rows.length) { toast.info("No hay pedidos para exportar"); return; }
    const headers = [
      "id","fecha","estado","tipo","cliente","email","telefono","doc_tipo","doc_numero",
      "direccion","ciudad","departamento","subtotal","total","metodo_pago","items",
    ];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const o of rows) {
      const addr = o.shipping_address || {};
      const items = Array.isArray(o.items)
        ? o.items.map((it: any) => `${it.quantity || it.qty || 1}x ${it.name || it.title || it.product_name || "Producto"} (${it.sku || ""})`).join(" | ")
        : "";
      lines.push([
        o.id, new Date(o.created_at).toISOString(), o.status,
        o.order_type === "distributor" || o.distributor_id ? "distribuidor" : "cliente",
        o.customer_name, o.customer_email, o.customer_phone,
        o.customer_id_type, o.customer_id_number,
        addr.address || addr.address_line || "", addr.city || "", addr.department || "",
        o.subtotal, o.total, o.payment_method, items,
      ].map(esc).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReceipt = async (path: string) => {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from("payment-receipts")
      .createSignedUrl(path, 60, { download: true });
    if (error || !data?.signedUrl) {
      toast.error("No se pudo generar el enlace de descarga");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const setDistStatus = async (id: string, status: "approved" | "rejected") => {
    if (status === "rejected") {
      try {
        const { adminRejectDistributor } = await import("@/lib/distributors.functions");
        await adminRejectDistributor({ data: { id } });
        toast.success("Solicitud rechazada");
        reload();
      } catch (e: any) {
        toast.error(e?.message || "No se pudo rechazar");
      }
    }
    // Approval is handled via the credentials dialog
  };

  const baseFiltered = orders.filter((o) => {
    if (orderFilter === "all") return true;
    const isDist = o.order_type === "distributor" || !!o.distributor_id;
    return orderFilter === "distributor" ? isDist : !isDist;
  });
  const activeOrders = baseFiltered.filter((o) => o.status !== "completed");
  const completedOrders = baseFiltered.filter((o) => o.status === "completed");
  const completedByMonth: Record<string, any[]> = {};
  for (const o of completedOrders) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (completedByMonth[key] ||= []).push(o);
  }
  const completedMonthKeys = Object.keys(completedByMonth).sort().reverse();
  const filteredOrders = activeOrders;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">Gestiona pedidos, productos y contenido.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link to="/admin/generador-fichas">
              <Sparkles className="h-4 w-4 mr-2" /> Generador de fichas
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin/blog-generator">
              <Sparkles className="h-4 w-4 mr-2" /> Generador de Blog con IA
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="orders">Pedidos ({orders.length})</TabsTrigger>
          <TabsTrigger value="products">Productos ({products.length})</TabsTrigger>
          <TabsTrigger value="bulk-inventory">
            <UploadCloud className="h-3.5 w-3.5 mr-1" /> Inventario masivo
          </TabsTrigger>
          <TabsTrigger value="categories">Categorías ({categories.length})</TabsTrigger>
          <TabsTrigger value="brands">Marcas ({brands.length})</TabsTrigger>
          <TabsTrigger value="customers">Clientes ({customers.length})</TabsTrigger>
          <TabsTrigger value="distributors">
            <Handshake className="h-3.5 w-3.5 mr-1" /> Distribuidores ({distributors.length})
          </TabsTrigger>
          <TabsTrigger value="blog">Blog ({posts.length})</TabsTrigger>
          <TabsTrigger value="weekly-deal">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Producto Semana y Cupones
          </TabsTrigger>
          <TabsTrigger value="conversations">
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Conversaciones IA ({conversations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          {ordersError && (
            <div className="mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <AlertCircle className="h-4 w-4" /> Error cargando pedidos: {ordersError}
            </div>
          )}
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <Label className="text-xs">Filtrar:</Label>
            <select
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value as any)}
              className="border rounded px-2 py-1 text-xs bg-card"
            >
              <option value="all">Todos los pedidos</option>
              <option value="retail">Solo clientes</option>
              <option value="distributor">Solo distribuidores</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => exportOrdersCSV(baseFiltered, `pedidos-${new Date().toISOString().slice(0,10)}.csv`)}>
              <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV (todos)
            </Button>
          </div>
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o) => {
                  const isDist = o.order_type === "distributor" || !!o.distributor_id;
                  const isOpen = expandedOrder === o.id;
                  const items: any[] = Array.isArray(o.items) ? o.items : [];
                  const addr = o.shipping_address || {};
                  return (
                    <React.Fragment key={o.id}>
                    <TableRow>

                      <TableCell className="font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedOrder(isOpen ? null : o.id)}
                          className="hover:underline"
                          title="Ver detalle"
                        >
                          {isOpen ? "▼ " : "▶ "}{o.id.slice(0, 8)}
                        </button>
                      </TableCell>
                      <TableCell>
                        {isDist ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Distribuidor
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            Cliente
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                        {o.customer_phone && (
                          <div className="text-xs text-muted-foreground">📞 {o.customer_phone}</div>
                        )}
                        {isDist && o.distributors?.company_name && (
                          <div className="text-xs text-blue-600 font-medium">🏢 {o.distributors.company_name}</div>
                        )}
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedOrder(isOpen ? null : o.id)}
                            className="text-secondary hover:underline text-xs inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> {isOpen ? "Ocultar" : "Ver"}
                          </button>
                          {o.receipt_url && (
                            <button
                              type="button"
                              onClick={() => downloadReceipt(o.receipt_url)}
                              className="text-secondary hover:underline text-xs inline-flex items-center gap-1"
                              title="Descargar comprobante de pago"
                            >
                              <Download className="h-3 w-3" /> Comprobante
                            </button>
                          )}
                          <a
                            href={whatsappUrl(`Hola ${o.customer_name}, soy de All For All. Tu pedido ${o.id.slice(0, 8)} está siendo procesado.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary hover:underline text-xs inline-flex items-center gap-1"
                          >
                            WhatsApp <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow key={o.id + "-detail"} className="bg-muted/30">
                        <TableCell colSpan={7} className="p-4">
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-semibold mb-2">Productos pedidos ({items.length})</div>
                              {items.length === 0 ? (
                                <div className="text-xs text-muted-foreground">Sin items registrados</div>
                              ) : (
                                <div className="space-y-2">
                                  {items.map((it, idx) => (
                                    <div key={idx} className="flex items-start gap-2 border-b pb-2">
                                      {it.image && (
                                        <img src={it.image} alt={it.name || it.title} className="w-12 h-12 object-cover rounded border" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-xs">{it.name || it.title || it.product_name || "Producto"}</div>
                                        {it.sku && <div className="text-[10px] text-muted-foreground">SKU: {it.sku}</div>}
                                        <div className="text-xs">
                                          {it.quantity || it.qty || 1} × {formatCOP(Number(it.price || it.unit_price || 0))}
                                        </div>
                                      </div>
                                      <div className="font-semibold text-xs">
                                        {formatCOP(Number((it.price || it.unit_price || 0)) * Number(it.quantity || it.qty || 1))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="mt-3 text-xs space-y-1">
                                <div>Subtotal: <span className="font-medium">{formatCOP(Number(o.subtotal || 0))}</span></div>
                                <div>Total: <span className="font-bold">{formatCOP(Number(o.total || 0))}</span></div>
                                <div>Método de pago: <span className="font-medium">{o.payment_method || "—"}</span></div>
                                {o.addi_status && <div>Addi: {o.addi_status}</div>}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold mb-2">Datos de envío y contacto</div>
                              <div className="text-xs space-y-1">
                                <div><span className="text-muted-foreground">Nombre:</span> {o.customer_name}</div>
                                <div><span className="text-muted-foreground">Email:</span> {o.customer_email}</div>
                                <div><span className="text-muted-foreground">Teléfono:</span> {o.customer_phone || "—"}</div>
                                {(o.customer_id_type || o.customer_id_number) && (
                                  <div><span className="text-muted-foreground">Documento:</span> {o.customer_id_type} {o.customer_id_number}</div>
                                )}
                                <div className="pt-2 border-t mt-2">
                                  <div className="font-medium mb-1">Dirección:</div>
                                  {addr && Object.keys(addr).length > 0 ? (
                                    <div className="space-y-0.5">
                                      {addr.address && <div>{addr.address}</div>}
                                      {addr.address_line && <div>{addr.address_line}</div>}
                                      {(addr.city || addr.department) && <div>{addr.city}{addr.city && addr.department ? ", " : ""}{addr.department}</div>}
                                      {addr.postal_code && <div>CP: {addr.postal_code}</div>}
                                      {addr.notes && <div className="italic text-muted-foreground">Notas: {addr.notes}</div>}
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground">Sin dirección registrada</div>
                                  )}
                                </div>
                                <div className="pt-2 mt-2">
                                  ID completo: <span className="font-mono">{o.id}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  );
                })}
                {filteredOrders.length === 0 && !ordersError && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin pedidos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ---------- Pedidos completados por mes ---------- */}
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-1">Pedidos completados por mes</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Historial de pedidos marcados como "Completado", agrupados por mes. Descarga el CSV con toda la información.
            </p>
            {completedMonthKeys.length === 0 && (
              <div className="bg-card border rounded-xl p-6 text-center text-sm text-muted-foreground">
                Aún no hay pedidos completados.
              </div>
            )}
            {completedMonthKeys.map((mk) => {
              const rows = completedByMonth[mk];
              const [y, m] = mk.split("-");
              const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
              const monthTotal = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);
              return (
                <div key={mk} className="bg-card border rounded-xl mb-4 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b bg-muted/30 flex-wrap gap-2">
                    <div>
                      <div className="font-semibold capitalize">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {rows.length} pedido{rows.length !== 1 ? "s" : ""} · Total {formatCOP(monthTotal)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => exportOrdersCSV(rows, `pedidos-completados-${mk}.csv`)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Descargar CSV
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <div className="text-sm">{o.customer_name}</div>
                              <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                            </TableCell>
                            <TableCell className="font-bold">{formatCOP(Number(o.total))}</TableCell>
                            <TableCell className="text-xs">{o.payment_method || "—"}</TableCell>
                            <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("es-CO")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
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

        <TabsContent value="bulk-inventory" className="mt-6">
          <BulkInventoryUpload />
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
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="font-medium">{post.title}</TableCell>
                    <TableCell className="text-xs font-mono">{post.slug}</TableCell>
                    <TableCell className="text-xs">{post.category || "—"}</TableCell>
                    <TableCell>
                      <button
                        onClick={async () => {
                          await supabase
                            .from("blog_posts")
                            .update({ published: !post.published })
                            .eq("id", post.id);
                          reload();
                        }}
                        className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                          post.published
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {post.published ? "● Publicado" : "○ Borrador"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-secondary hover:underline inline-flex items-center gap-1"
                      >
                        Ver <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {posts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Sin artículos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="distributors" className="mt-6">
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributors.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.company_name}</TableCell>
                    <TableCell className="text-xs">{d.nit}</TableCell>
                    <TableCell className="text-xs">
                      <div>{d.contact_name}</div>
                      <div className="text-muted-foreground">{d.phone}</div>
                    </TableCell>
                    <TableCell className="text-xs">{d.email}</TableCell>
                    <TableCell className="text-xs">{d.city}</TableCell>
                    <TableCell>
                      {d.status === "approved" ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          ✓ Aprobado
                        </span>
                      ) : d.status === "rejected" ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Rechazado
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                          Pendiente
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {d.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setCredDist(d)}>
                              <Check className="h-3 w-3 mr-1" /> Aprobar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDistStatus(d.id, "rejected")}>
                              <XIcon className="h-3 w-3 mr-1" /> Rechazar
                            </Button>
                          </>
                        )}
                        {d.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => setCredDist(d)}>
                            <Send className="h-3 w-3 mr-1" /> Enviar credenciales
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {distributors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin solicitudes todavía
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="mt-6">
          <div className="bg-card border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sesión</TableHead>
                  <TableHead>Mensajes</TableHead>
                  <TableHead>Página</TableHead>
                  <TableHead>Última actualización</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((c) => {
                  const msgs = Array.isArray(c.messages) ? c.messages : [];
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.session_id?.slice(0, 24)}</TableCell>
                      <TableCell>{msgs.length}</TableCell>
                      <TableCell className="text-xs max-w-[240px] truncate">{c.page_url || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.updated_at ? new Date(c.updated_at).toLocaleString("es-CO") : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setViewingConv(c)}>
                          Ver detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {conversations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Sin conversaciones todavía
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="weekly-deal" className="mt-6">
          <WeeklyDealsAdmin products={products} />
        </TabsContent>
      </Tabs>

      <EditProductDialog product={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConversationDialog conversation={viewingConv} onClose={() => setViewingConv(null)} />
      <DistributorCredentialsDialog
        distributor={credDist}
        onClose={() => setCredDist(null)}
        onSaved={reload}
      />
    </div>
  );
}

function ConversationDialog({ conversation, onClose }: { conversation: any | null; onClose: () => void }) {
  const msgs: { role: string; content: string }[] = Array.isArray(conversation?.messages)
    ? conversation.messages
    : [];
  return (
    <Dialog open={!!conversation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Conversación con Al</DialogTitle>
        </DialogHeader>
        {conversation && (
          <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
            <div>Sesión: <span className="font-mono">{conversation.session_id}</span></div>
            <div>Página: {conversation.page_url || "—"}</div>
            <div>Actualizada: {conversation.updated_at ? new Date(conversation.updated_at).toLocaleString("es-CO") : "—"}</div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-2 bg-muted/30 rounded-lg p-3">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm"
                    : "max-w-[80%] bg-card border rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {msgs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">Sin mensajes</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
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

function DistributorCredentialsDialog({
  distributor,
  onClose,
  onSaved,
}: {
  distributor: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (distributor) {
      // Auto-suggest a strong temp password
      setPassword(
        Array.from(crypto.getRandomValues(new Uint8Array(9)))
          .map((b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$"[b % 60])
          .join(""),
      );
    }
  }, [distributor]);

  const save = async () => {
    if (!distributor) return;
    if (!password || password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setSaving(true);
    try {
      const { adminApproveDistributor } = await import("@/lib/distributors.functions");
      await adminApproveDistributor({ data: { id: distributor.id, password } });
      toast.success("Distribuidor aprobado y cuenta creada");

      const msg =
        `Hola ${distributor.contact_name}, tu solicitud como distribuidor de All For All fue aprobada.\n\n` +
        `Accede al portal en: allforall.com.co/distribuidores\n` +
        `Usuario: ${distributor.email}\n` +
        `Contraseña: ${password}\n\n` +
        `¡Bienvenido!`;
      const phone = (distributor.phone || "").replace(/\D/g, "");
      const waNumber = phone.length >= 10 ? (phone.startsWith("57") ? phone : `57${phone}`) : "573134977955";
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");

      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo aprobar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!distributor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aprobar distribuidor y crear cuenta</DialogTitle>
        </DialogHeader>
        {distributor && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <div><span className="font-semibold text-foreground">Empresa:</span> {distributor.company_name}</div>
              <div><span className="font-semibold text-foreground">Email:</span> {distributor.email}</div>
            </div>
            <div>
              <Label>Contraseña temporal</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se crea su cuenta de acceso con esta contraseña. Pídele que la cambie en su primer ingreso.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Al confirmar se aprueba al distribuidor y se abre WhatsApp con el mensaje de bienvenida.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-primary">
            {saving ? "Procesando..." : "Aprobar y enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

