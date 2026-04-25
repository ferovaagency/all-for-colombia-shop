import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart, formatCOP, whatsappUrl } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(7, "Teléfono requerido").max(20),
  address: z.string().trim().min(5, "Dirección requerida").max(200),
  city: z.string().trim().min(2, "Ciudad requerida").max(80),
  notes: z.string().max(500).optional(),
});

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — All For All" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, clear, count } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", notes: "",
  });
  const [payment, setPayment] = useState("transferencia");

  if (count === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">No hay productos en tu carrito</h1>
        <Button asChild><Link to="/tienda">Ir a la tienda</Link></Button>
      </div>
    );
  }

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) {
      toast.error(res.error.issues[0]?.message || "Revisa los campos");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      status: "pending",
      items: items,
      subtotal,
      total: subtotal,
      payment_method: payment,
      shipping_address: { address: form.address, city: form.city, notes: form.notes },
    }).select().maybeSingle();

    setSubmitting(false);

    if (error || !data) {
      toast.error("No se pudo crear el pedido. Intenta de nuevo.");
      return;
    }

    // Save customer
    await supabase.from("customers").upsert({
      name: form.name,
      email: form.email,
      phone: form.phone,
    }, { onConflict: "email" });

    const summary = items.map(i => `• ${i.name} x${i.quantity} — ${formatCOP(i.price * i.quantity)}`).join("\n");
    const msg = `🛒 *Nuevo pedido All For All*\n\nPedido: ${data.id.slice(0,8)}\nCliente: ${form.name}\nTel: ${form.phone}\nCiudad: ${form.city}\n\n${summary}\n\n*Total:* ${formatCOP(subtotal)}\nMétodo: ${payment}`;
    window.open(whatsappUrl(msg), "_blank");

    clear();
    navigate({ to: "/resultado-pago", search: { id: data.id, status: "ok" } as any });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Finalizar compra</h1>
      <form onSubmit={submit} className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-6">
          <section className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Datos de contacto</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nombre completo *</Label><Input value={form.name} onChange={e => setField("name", e.target.value)} required maxLength={100} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} required maxLength={255} /></div>
              <div className="sm:col-span-2"><Label>Teléfono *</Label><Input value={form.phone} onChange={e => setField("phone", e.target.value)} required maxLength={20} /></div>
            </div>
          </section>

          <section className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Dirección de envío</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label>Dirección *</Label><Input value={form.address} onChange={e => setField("address", e.target.value)} required maxLength={200} /></div>
              <div className="sm:col-span-2"><Label>Ciudad *</Label><Input value={form.city} onChange={e => setField("city", e.target.value)} required maxLength={80} /></div>
              <div className="sm:col-span-2"><Label>Notas (opcional)</Label><Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} maxLength={500} /></div>
            </div>
          </section>

          <section className="bg-card border rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Método de pago</h2>
            <RadioGroup value={payment} onValueChange={setPayment} className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="transferencia" id="t" />
                <div>
                  <p className="font-medium">Transferencia / Consignación</p>
                  <p className="text-xs text-muted-foreground">Te enviaremos los datos por WhatsApp</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="contraentrega" id="c" />
                <div>
                  <p className="font-medium">Pago contraentrega</p>
                  <p className="text-xs text-muted-foreground">Disponible en ciudades principales</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="pse" id="p" />
                <div>
                  <p className="font-medium">PSE / Tarjeta</p>
                  <p className="text-xs text-muted-foreground">Coordinamos enlace de pago seguro</p>
                </div>
              </label>
            </RadioGroup>
          </section>
        </div>

        <aside className="bg-card border rounded-xl p-6 h-fit sticky top-20">
          <h2 className="font-semibold text-lg mb-4">Tu pedido</h2>
          <div className="space-y-2 text-sm mb-4 max-h-64 overflow-y-auto">
            {items.map(it => (
              <div key={it.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground line-clamp-1">{it.name} ×{it.quantity}</span>
                <span className="font-medium whitespace-nowrap">{formatCOP(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span><span className="text-primary">{formatCOP(subtotal)}</span>
            </div>
          </div>
          <Button type="submit" disabled={submitting} size="lg" className="w-full bg-primary">
            {submitting ? "Procesando..." : "Confirmar pedido"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Al confirmar serás contactado por WhatsApp para coordinar el pago y la entrega.
          </p>
        </aside>
      </form>
    </div>
  );
}
