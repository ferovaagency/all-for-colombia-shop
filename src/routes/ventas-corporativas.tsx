import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, BadgePercent, FileCheck, Headphones, Truck, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { whatsappUrl } from "@/lib/cart";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/ventas-corporativas")({
  head: () => ({
    meta: [
      { title: "Ventas Corporativas — All For All" },
      { name: "description", content: "Soluciones empresariales: equipos tecnológicos, aires, plóters y más con precios especiales por volumen." },
    ],
  }),
  component: CorporatePage,
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.string().trim().min(2).max(100),
  nit: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(20),
  description: z.string().trim().min(10).max(1000),
  quantity: z.string().trim().max(50).optional(),
});

function CorporatePage() {
  const [form, setForm] = useState({ name: "", company: "", nit: "", email: "", phone: "", description: "", quantity: "" });
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .order("sort_order")
      .then(({ data }) => setCategories(data || []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) { toast.error(res.error.issues[0]?.message || "Revisa los campos"); return; }
    setSubmitting(true);

    await supabase.from("customers").upsert({
      name: form.name, email: form.email, phone: form.phone, company: form.company, nit: form.nit, notes: form.description,
    }, { onConflict: "email" });

    setSubmitting(false);
    toast.success("¡Solicitud recibida! Te contactaremos pronto.");

    const msg = `🏢 *Solicitud corporativa*\n\nEmpresa: ${form.company}\nNIT: ${form.nit}\nContacto: ${form.name}\nTel: ${form.phone}\nEmail: ${form.email}\nCantidad aprox: ${form.quantity || "N/D"}\n\n${form.description}`;
    window.open(whatsappUrl(msg), "_blank");
    setForm({ name: "", company: "", nit: "", email: "", phone: "", description: "", quantity: "" });
  };

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <Building2 className="h-12 w-12 mb-4 text-white/80" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Soluciones para empresas</h1>
          <p className="text-lg text-white/85 max-w-2xl">
            Equipos tecnológicos, aires acondicionados, plóters y más para tu empresa.
            Precios especiales en compras por volumen.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Benefit icon={<BadgePercent className="h-6 w-6" />} title="Precios por volumen" desc="Descuentos especiales según la cantidad" />
          <Benefit icon={<FileCheck className="h-6 w-6" />} title="Facturación a empresa" desc="Documentos en regla para tu contabilidad" />
          <Benefit icon={<Headphones className="h-6 w-6" />} title="Soporte dedicado" desc="Asesor exclusivo post-venta" />
          <Benefit icon={<Truck className="h-6 w-6" />} title="Entrega Colombia" desc="Cobertura nacional y logística confiable" />
        </div>

        <div className="max-w-2xl mx-auto bg-card border rounded-2xl p-8 shadow-card">
          <h2 className="text-2xl font-bold mb-2">Solicita tu cotización</h2>
          <p className="text-muted-foreground mb-6">Te contactaremos en menos de 24 horas hábiles.</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nombre completo *</Label><Input value={form.name} onChange={e => setField("name", e.target.value)} required /></div>
              <div><Label>Empresa *</Label><Input value={form.company} onChange={e => setField("company", e.target.value)} required /></div>
              <div><Label>NIT *</Label><Input value={form.nit} onChange={e => setField("nit", e.target.value)} required /></div>
              <div><Label>Email corporativo *</Label><Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} required /></div>
              <div><Label>Teléfono *</Label><Input value={form.phone} onChange={e => setField("phone", e.target.value)} required /></div>
              <div><Label>Cantidad aproximada</Label><Input value={form.quantity} onChange={e => setField("quantity", e.target.value)} placeholder="Ej. 20 equipos" /></div>
            </div>
            <div>
              <Label>Descripción del requerimiento *</Label>
              <Textarea rows={4} value={form.description} onChange={e => setField("description", e.target.value)} required maxLength={1000} />
            </div>
            <Button type="submit" disabled={submitting} size="lg" className="w-full bg-primary">
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </form>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">Nuestro catálogo corporativo</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to="/tienda"
                  search={{ category: cat.slug }}
                  className="bg-card border rounded-xl p-5 text-center hover:shadow-card hover:border-secondary transition-smooth group"
                >
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-secondary/20 transition-colors">
                    <Package className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-sm">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ver productos →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Benefit({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-card border rounded-xl p-6 hover:shadow-card transition-smooth">
      <div className="h-12 w-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
