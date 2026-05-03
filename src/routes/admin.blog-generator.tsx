import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Save, Copy } from "lucide-react";

export const Route = createFileRoute("/admin/blog-generator")({
  head: () => ({ meta: [{ title: "Generador de Blog — Admin" }, { name: "robots", content: "noindex" }] }),
  component: BlogGeneratorPage,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 80);
}

function BlogGeneratorPage() {
  const [form, setForm] = useState({
    title: "",
    category: "",
    keywords: "",
    tone: "profesional",
    length: "800",
  });
  const [generated, setGenerated] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!form.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    setGenerating(true);
    setGenerated("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-post", { body: form });
      if (error) throw error;
      const d = data as { content?: string; error?: string };
      if (d?.error) {
        toast.error(d.error);
        return;
      }
      if (!d?.content) {
        toast.error("La IA no devolvió contenido");
        return;
      }
      setGenerated(d.content);
      toast.success("¡Artículo generado!");
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !generated.trim()) return;
    setSaving(true);
    try {
      let content = generated;
      let excerpt = "";
      const m = generated.match(/EXCERPT:\s*(.+)$/im);
      if (m) {
        excerpt = m[1].trim().slice(0, 150);
        content = generated.replace(/EXCERPT:.*$/im, "").trim();
      }
      const { error } = await supabase.from("blog_posts").upsert(
        {
          slug: slugify(form.title),
          title: form.title,
          content,
          excerpt: excerpt || null,
          category: form.category || null,
          published: false,
        },
        { onConflict: "slug" },
      );
      if (error) throw error;
      toast.success("Artículo guardado (borrador)");
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
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
            <h1 className="font-bold">Generador de Blog con IA</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="h-11" />
            </div>
            <div>
              <Label>Categoría</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Tecnología, Hogar..." />
            </div>
            <div>
              <Label>Palabras clave SEO</Label>
              <Input value={form.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="separadas por coma" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tono</Label>
                <select value={form.tone} onChange={(e) => set("tone", e.target.value)}
                  className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background">
                  <option value="profesional">Profesional</option>
                  <option value="cercano">Cercano</option>
                  <option value="tecnico">Técnico</option>
                  <option value="educativo">Educativo</option>
                </select>
              </div>
              <div>
                <Label>Extensión</Label>
                <select value={form.length} onChange={(e) => set("length", e.target.value)}
                  className="w-full h-10 border border-input rounded-md px-3 text-sm bg-background">
                  <option value="600">600 palabras</option>
                  <option value="800">800 palabras</option>
                  <option value="1200">1200 palabras</option>
                  <option value="1600">1600 palabras</option>
                </select>
              </div>
            </div>
            <Button onClick={generate} disabled={generating || !form.title.trim()} className="w-full h-11 gap-2 font-bold">
              <Sparkles className="w-4 h-4" />
              {generating ? "Generando..." : "Generar artículo con IA"}
            </Button>
            {generated && (
              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={save} disabled={saving} variant="outline" className="flex-1 gap-2">
                  <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar (borrador)"}
                </Button>
                <Button variant="outline" size="icon"
                  onClick={() => { navigator.clipboard.writeText(generated); toast.success("Copiado"); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h2 className="font-bold">Artículo generado</h2>
            <Textarea
              rows={28}
              value={generated}
              onChange={(e) => setGenerated(e.target.value)}
              placeholder="Aquí aparecerá el artículo. Puedes editarlo antes de guardar."
              className="font-mono text-xs resize-none bg-muted/40"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
