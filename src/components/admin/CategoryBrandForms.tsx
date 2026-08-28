import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { slugify, isValidSlug } from "@/lib/slugify";
import { Settings2 } from "lucide-react";

const NONE = "__none__";

function isUniqueViolation(err: any) {
  return err?.code === "23505" || /duplicate key|unique/i.test(err?.message || "");
}

export function NewCategoryForm({ categories, onCreated }: { categories: any[]; onCreated: () => Promise<void> | void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState<string>(NONE);
  const [sortOrder, setSortOrder] = useState("0");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setSlug(""); setSlugTouched(false); setParentId(NONE); setSortOrder("0"); setDescription("");
  };

  const submit = async () => {
    const n = name.trim();
    const s = slug.trim();
    if (!n || !s) return toast.error("Nombre y slug son obligatorios");
    if (!isValidSlug(s)) return toast.error("El slug solo puede tener minúsculas, números y guiones");
    if (categories.some((c) => c.slug === s)) return toast.error("Ya existe una categoría con ese slug");

    setSaving(true);
    const { error } = await supabase.from("categories").insert({
      slug: s,
      name: n,
      description: description.trim() || null,
      parent_id: parentId === NONE ? null : parentId,
      sort_order: Number(sortOrder) || 0,
    } as any);
    setSaving(false);

    if (error) {
      toast.error(isUniqueViolation(error) ? "Ya existe una categoría con ese slug" : error.message);
      return;
    }
    toast.success("Categoría creada");
    reset();
    await onCreated();
  };

  const sorted = [...categories].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="border rounded-lg p-4 bg-card mb-6">
      <h3 className="font-semibold mb-4">Nueva categoría</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nombre *</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div>
          <Label>Slug *</Label>
          <Input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} />
        </div>
        <div>
          <Label>Categoría padre</Label>
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Ninguna — categoría principal</SelectItem>
              {sorted.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Orden</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Descripción</Label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <Button className="mt-4" onClick={submit} disabled={saving}>
        {saving ? "Guardando..." : "Crear categoría"}
      </Button>
    </div>
  );
}

export function NewBrandForm({ brands, onCreated }: { brands: any[]; onCreated: () => Promise<void> | void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdNotice, setCreatedNotice] = useState(false);

  const submit = async () => {
    const n = name.trim();
    const s = slug.trim();
    if (!n || !s) return toast.error("Nombre y slug son obligatorios");
    if (!isValidSlug(s)) return toast.error("El slug solo puede tener minúsculas, números y guiones");
    if (brands.some((b) => b.slug === s)) return toast.error("Ya existe una marca con ese slug");

    setSaving(true);
    const { error } = await supabase.from("brands").insert({ slug: s, name: n } as any);
    setSaving(false);

    if (error) {
      toast.error(isUniqueViolation(error) ? "Ya existe una marca con ese slug" : error.message);
      return;
    }
    toast.success("Marca creada");
    setName(""); setSlug(""); setSlugTouched(false);
    setCreatedNotice(true);
    await onCreated();
  };

  return (
    <div className="mb-6 space-y-4">
      <Button asChild variant="secondary">
        <Link to="/admin/marcas">
          <Settings2 className="h-4 w-4 mr-2" />
          Gestionar logos y orden
        </Link>
      </Button>

      {createdNotice && (
        <div className="border rounded-lg p-3 bg-muted text-sm flex flex-wrap items-center gap-2">
          <span>Marca creada. Súbele el logo para que pueda aparecer en el home</span>
          <Link to="/admin/marcas" className="underline font-medium">Ir a gestión de marcas</Link>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-card">
        <h3 className="font-semibold mb-4">Nueva marca</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} />
          </div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={saving}>
          {saving ? "Guardando..." : "Crear marca"}
        </Button>
      </div>
    </div>
  );
}
