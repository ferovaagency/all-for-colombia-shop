import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/generador-fichas")({
  head: () => ({ meta: [{ title: "Generador de fichas — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ProductSheetGeneratorPage,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProductSheetGeneratorPage() {
  const [form, setForm] = useState({
    name: "", sku: "", price: "", sale_price: "", stock: "0",
    short_description: "", description: "", images: "", category_id: "",
  });
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    const slug = slugify(form.name);
    const images = form.images.split("\n").map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from("products").insert({
      slug, name: form.name, sku: form.sku || null,
      price: form.price ? Number(form.price) : null,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      stock: Number(form.stock) || 0,
      short_description: form.short_description || null,
      description: form.description || null,
      images: images.length ? images : null,
      category_id: form.category_id || null,
      active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Producto creado");
    setForm({ name: "", sku: "", price: "", sale_price: "", stock: "0", short_description: "", description: "", images: "", category_id: "" });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al admin
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-7 w-7 text-secondary" />
        <h1 className="text-3xl font-bold">Crear ficha de producto</h1>
      </div>

      <form onSubmit={save} className="bg-card border rounded-xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label>Nombre *</Label><Input value={form.name} onChange={e => setF("name", e.target.value)} required /></div>
          <div><Label>SKU</Label><Input value={form.sku} onChange={e => setF("sku", e.target.value)} /></div>
          <div><Label>Stock</Label><Input type="number" min={0} value={form.stock} onChange={e => setF("stock", e.target.value)} /></div>
          <div><Label>Precio (COP)</Label><Input type="number" min={0} value={form.price} onChange={e => setF("price", e.target.value)} /></div>
          <div><Label>Precio oferta (opcional)</Label><Input type="number" min={0} value={form.sale_price} onChange={e => setF("sale_price", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Descripción corta</Label><Input maxLength={200} value={form.short_description} onChange={e => setF("short_description", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Descripción completa</Label><Textarea rows={6} value={form.description} onChange={e => setF("description", e.target.value)} /></div>
          <div className="sm:col-span-2">
            <Label>Imágenes (una URL por línea)</Label>
            <Textarea rows={3} value={form.images} onChange={e => setF("images", e.target.value)} placeholder="https://...&#10;https://..." />
          </div>
        </div>
        <Button type="submit" disabled={saving} size="lg" className="w-full bg-primary">
          {saving ? "Guardando..." : "Crear producto"}
        </Button>
      </form>
    </div>
  );
}
