import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_NUMBER } from "@/lib/cart";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/distribuidores/registro")({
  head: () => ({
    meta: [
      { title: "Solicitud de distribuidor — All For All" },
      { name: "description", content: "Solicita ser distribuidor autorizado de All For All. Respuesta en máximo 2 días hábiles." },
    ],
  }),
  component: DistributorRegisterPage,
});

const schema = z.object({
  company_name: z.string().trim().min(2, "Nombre de empresa requerido").max(150),
  nit: z.string().trim().min(5, "NIT requerido").max(30),
  contact_name: z.string().trim().min(2, "Nombre del representante requerido").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(7, "Teléfono requerido").max(20),
  city: z.string().trim().min(2, "Ciudad requerida").max(80),
  address: z.string().max(200).optional(),
  business_type: z.string().min(1, "Selecciona el tipo de negocio").max(50),
  products_sold: z.string().max(500).optional(),
});

const BUSINESS_TYPES = [
  "Tienda física",
  "E-commerce",
  "Mayorista",
  "Distribuidor",
  "Otro",
];

function DistributorRegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    nit: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    business_type: "",
    products_sold: "",
  });

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) {
      toast.error(res.error.issues[0]?.message || "Revisa los campos");
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("distributors").insert({
      company_name: form.company_name,
      nit: form.nit,
      contact_name: form.contact_name,
      email: form.email.trim().toLowerCase(),
      phone: form.phone,
      city: form.city,
      address: form.address || null,
      business_type: form.business_type,
      products_sold: form.products_sold || null,
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.error("Ya existe una solicitud con ese email");
      } else {
        toast.error("No se pudo enviar la solicitud. Intenta de nuevo.");
      }
      return;
    }

    const msg =
      `Hola, acabo de enviar solicitud para ser distribuidor.\n` +
      `Empresa: ${form.company_name}\nNIT: ${form.nit}\nEmail: ${form.email}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-xl text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-3">¡Solicitud enviada! 🎉</h1>
        <p className="text-muted-foreground mb-2">
          Revisaremos tu información en máximo 2 días hábiles.
        </p>
        <p className="text-muted-foreground mb-8">
          Te enviaremos tus credenciales de acceso al email registrado.
        </p>
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        Solicitud para ser distribuidor All For All
      </h1>
      <p className="text-muted-foreground mb-8">
        Completa el formulario. Te respondemos en máximo 2 días hábiles.
      </p>

      <form onSubmit={submit} className="bg-card border rounded-xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nombre de la empresa *</Label>
            <Input value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} required maxLength={150} />
          </div>
          <div>
            <Label>NIT *</Label>
            <Input value={form.nit} onChange={(e) => setField("nit", e.target.value)} required maxLength={30} />
          </div>
          <div>
            <Label>Nombre del representante *</Label>
            <Input value={form.contact_name} onChange={(e) => setField("contact_name", e.target.value)} required maxLength={100} />
          </div>
          <div>
            <Label>Email corporativo *</Label>
            <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required maxLength={255} />
          </div>
          <div>
            <Label>Teléfono *</Label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} required maxLength={20} />
          </div>
          <div>
            <Label>Ciudad *</Label>
            <Input value={form.city} onChange={(e) => setField("city", e.target.value)} required maxLength={80} />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input value={form.address} onChange={(e) => setField("address", e.target.value)} maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <Label>Tipo de negocio *</Label>
            <select
              value={form.business_type}
              onChange={(e) => setField("business_type", e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="">Selecciona una opción</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>¿Qué productos comercializas actualmente?</Label>
            <Textarea
              value={form.products_sold}
              onChange={(e) => setField("products_sold", e.target.value)}
              maxLength={500}
              rows={4}
            />
          </div>
        </div>

        <Button type="submit" disabled={submitting} size="lg" className="w-full bg-primary">
          {submitting ? "Enviando..." : "Enviar solicitud"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Al enviar, también abriremos WhatsApp para confirmación inmediata.
        </p>
      </form>
    </div>
  );
}
