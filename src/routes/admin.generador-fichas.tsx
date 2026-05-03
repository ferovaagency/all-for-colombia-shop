import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Upload, Package, Copy, Save } from "lucide-react";

export const Route = createFileRoute("/admin/generador-fichas")({
  head: () => ({ meta: [{ title: "Generador de fichas — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ProductSheetGeneratorPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

type CSVRow = Record<string, string>;

function ProductSheetGeneratorPage() {
  const [form, setForm] = useState({
    name: "",
    sku: "",
    brand: "",
    category: "",
    price: "",
    salePrice: "",
    stock: "",
    specs: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState("");
  const [saving, setSaving] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const generateSheet = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre del producto es obligatorio");
      return;
    }
    setGenerating(true);
    setGenerated("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-sheet", { body: form });
      if (error) throw error;
      const content = (data as { content?: string; error?: string })?.content;
      if ((data as { error?: string })?.error) {
        toast.error((data as { error: string }).error);
        return;
      }
      if (!content) {
        toast.error("La IA no devolvió contenido");
        return;
      }
      setGenerated(content);
      toast.success("¡Ficha generada con IA!");
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const saveProduct = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const slug = slugify(form.name);
      const { error } = await supabase.from("products").upsert(
        {
          slug,
          name: form.name,
          sku: form.sku || null,
          price: form.price ? parseFloat(form.price) : null,
          sale_price: form.salePrice ? parseFloat(form.salePrice) : null,
          stock: form.stock ? parseInt(form.stock) : 0,
          description: generated || null,
          active: true,
        },
        { onConflict: "slug" },
      );
      if (error) throw error;
      toast.success("Producto guardado en la tienda");
      setForm({ name: "", sku: "", brand: "", category: "", price: "", salePrice: "", stock: "", specs: "" });
      setGenerated("");
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("El CSV debe tener encabezado y al menos una fila");
        return;
      }
      const sep = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0]
        .split(sep)
        .map((h) => h.trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, "_"));
      const rows = lines
        .slice(1)
        .map((line) => {
          const vals = line.split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ""));
          return Object.fromEntries(headers.map((h, i) => [h, vals[i] || ""])) as CSVRow;
        })
        .filter((r) => (r.nombre || r.name || "").trim());
      setCsvPreview(rows);
      toast.success(`${rows.length} productos detectados`);
    };
    reader.readAsText(file, "UTF-8");
  };

  const uploadBulk = async () => {
    if (!csvPreview.length) return;
    setUploading(true);
    setProgress(0);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < csvPreview.length; i++) {
      const r = csvPreview[i];
      const name = (r.nombre || r.name || "").trim();
      if (!name) {
        setProgress(i + 1);
        continue;
      }
      const slug = slugify(name);
      const { error } = await supabase.from("products").upsert(
        {
          slug,
          name,
          sku: (r.sku || r.referencia || "").trim() || null,
          price: parseFloat((r.precio || r.price || "0").replace(/[^0-9.]/g, "")) || null,
          sale_price: parseFloat((r.precio_oferta || r.sale_price || "0").replace(/[^0-9.]/g, "")) || null,
          stock: parseInt(r.stock || "0") || 0,
          description: (r.descripcion || r.description || "").trim() || null,
          short_description: (r.descripcion_corta || r.short_desc || "").trim() || null,
          active: true,
        },
        { onConflict: "slug" },
      );
      if (error) fail++;
      else ok++;
      setProgress(i + 1);
      if (i % 10 === 9) await new Promise((res) => setTimeout(res, 100));
    }
    setUploading(false);
    setCsvPreview([]);
    setProgress(0);
    if (fail > 0) toast.warning(`${ok} subidos, ${fail} con error`);
    else toast.success(`${ok} productos subidos`);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link to="/admin" className="inline-flex items-center text-muted-foreground hover:text-foreground gap-1">
            <ArrowLeft className="w-4 h-4" /> Admin
          </Link>
          <span className="text-muted-foreground">|</span>
          <div className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h1 className="font-bold">Generador de Fichas de Producto</h1>
          </div>
        </div>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="w-4 h-4" /> Generar con IA
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Upload className="w-4 h-4" /> Carga masiva CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl border p-6 space-y-4">
                <h2 className="font-bold flex items-center gap-2">
                  <span className="w-6 h-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-black">
                    1
                  </span>
                  Datos del producto
                </h2>

                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-11" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>SKU</Label>
                    <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Precio (COP)</Label>
                    <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
                  </div>
                  <div>
                    <Label>Precio oferta</Label>
                    <Input type="number" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Stock</Label>
                    <Input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
                  </div>
                  <div>
                    <Label>Categoría</Label>
                    <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Especificaciones / notas</Label>
                  <Textarea
                    rows={4}
                    value={form.specs}
                    onChange={(e) => set("specs", e.target.value)}
                    className="resize-none"
                  />
                </div>

                <Button
                  onClick={generateSheet}
                  disabled={generating || !form.name.trim()}
                  className="w-full h-11 font-bold gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {generating ? "Generando con IA..." : "Generar ficha con IA"}
                </Button>

                {generated && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button onClick={saveProduct} disabled={saving} variant="outline" className="flex-1 gap-2">
                      <Save className="w-4 h-4" />
                      {saving ? "Guardando..." : "Guardar en tienda"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(generated);
                        toast.success("Copiado");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-card rounded-2xl border p-6 space-y-4">
                <h2 className="font-bold flex items-center gap-2">
                  <span className="w-6 h-6 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-black">
                    2
                  </span>
                  Ficha generada
                  {generated && (
                    <span className="ml-auto text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">✓ Lista</span>
                  )}
                </h2>
                <Textarea
                  placeholder={`Aquí aparecerá la ficha generada.

La IA generará:
- Descripción completa (SEO)
- Descripción corta
- Beneficios principales
- Preguntas frecuentes
- Palabras clave

Puedes editar antes de guardar.`}
                  rows={20}
                  value={generated}
                  onChange={(e) => setGenerated(e.target.value)}
                  className="font-mono text-xs resize-none bg-muted/40"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-card rounded-2xl border p-6">
                <h3 className="font-bold mb-3">Formato del CSV</h3>
                <div className="bg-foreground text-background rounded-xl p-4 font-mono text-xs overflow-x-auto">
                  nombre,sku,descripcion,descripcion_corta,precio,precio_oferta,stock
                </div>
                <p className="text-xs text-muted-foreground mt-2">✓ Solo "nombre" es obligatorio</p>
              </div>

              <label className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-all block group bg-card">
                <input type="file" accept=".csv,.txt" onChange={handleCSV} className="hidden" />
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3 group-hover:text-secondary" />
                <p className="font-semibold">Arrastra tu CSV aquí</p>
                <p className="text-sm text-muted-foreground mt-1">o haz click para seleccionar</p>
              </label>

              {csvPreview.length > 0 && (
                <div className="bg-card rounded-2xl border overflow-hidden">
                  <div className="px-6 py-3 border-b bg-muted/40 flex items-center justify-between">
                    <span className="font-semibold text-sm">{csvPreview.length} productos</span>
                    <button
                      onClick={() => setCsvPreview([])}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      × Limpiar
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y">
                    {csvPreview.slice(0, 30).map((row, i) => (
                      <div key={i} className="flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-muted/30">
                        <span className="text-muted-foreground text-xs w-6">{i + 1}</span>
                        <span className="font-medium flex-1 truncate">{row.nombre || row.name}</span>
                        <span className="text-muted-foreground text-xs font-mono">{row.sku || "—"}</span>
                        <span className="text-secondary text-xs font-bold">
                          {row.precio
                            ? `$${parseInt((row.precio || "0").replace(/[^0-9]/g, "") || "0").toLocaleString("es-CO")}`
                            : "Sin precio"}
                        </span>
                      </div>
                    ))}
                    {csvPreview.length > 30 && (
                      <div className="px-6 py-2 text-xs text-muted-foreground text-center">
                        ... y {csvPreview.length - 30} más
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-4 border-t bg-muted/40">
                    {uploading && (
                      <div className="mb-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subiendo...</span>
                          <span className="font-bold text-secondary">
                            {progress}/{csvPreview.length}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-secondary h-2 rounded-full transition-all"
                            style={{ width: `${Math.round((progress / csvPreview.length) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button onClick={uploadBulk} disabled={uploading} className="w-full h-11 font-bold gap-2">
                      <Package className="w-4 h-4" />
                      {uploading
                        ? `Subiendo ${progress}/${csvPreview.length}...`
                        : `Subir ${csvPreview.length} productos`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
