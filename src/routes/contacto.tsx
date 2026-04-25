import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { CONTACT_EMAIL, WHATSAPP_NUMBER, whatsappUrl } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(1000),
});

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto — All For All" },
      { name: "description", content: "Contáctanos: WhatsApp, email y formulario. Estamos en Bogotá y atendemos toda Colombia." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) { toast.error(res.error.issues[0]?.message || "Revisa los campos"); return; }
    setSending(true);
    await supabase.from("customers").upsert({
      name: form.name, email: form.email, notes: form.message,
    }, { onConflict: "email" });
    setSending(false);
    toast.success("¡Mensaje enviado! Te responderemos pronto.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Contáctanos</h1>
        <p className="text-muted-foreground text-lg">Estamos para ayudarte. Elige el canal que prefieras.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="space-y-4">
          <a href={whatsappUrl("Hola, quiero información.")} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-4 bg-card border rounded-xl p-5 hover:shadow-card transition-smooth">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: "#25D366" }}>
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">WhatsApp</p>
              <p className="text-sm text-muted-foreground">+{WHATSAPP_NUMBER}</p>
            </div>
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-4 bg-card border rounded-xl p-5 hover:shadow-card transition-smooth">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Email</p>
              <p className="text-sm text-muted-foreground">{CONTACT_EMAIL}</p>
            </div>
          </a>
          <div className="flex items-center gap-4 bg-card border rounded-xl p-5">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">Ubicación</p>
              <p className="text-sm text-muted-foreground">Bogotá, Colombia · Envíos a todo el país</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Escríbenos</h2>
          <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
          <div><Label>Mensaje *</Label><Textarea rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required /></div>
          <Button type="submit" disabled={sending} className="w-full bg-primary">
            {sending ? "Enviando..." : "Enviar mensaje"}
          </Button>
        </form>
      </div>
    </div>
  );
}
