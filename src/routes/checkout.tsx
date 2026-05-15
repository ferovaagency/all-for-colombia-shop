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
import { Upload, FileCheck2, Info, X, ExternalLink } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { startAddiCheckout } from "@/server/addi.functions";

const schema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(7, "Teléfono requerido").max(20),
  customer_id_type: z.enum(["CC", "CE", "NIT", "PA"], { message: "Selecciona tipo de documento" }),
  customer_id_number: z.string().trim().regex(/^[\d-]+$/, "Solo números y guion").min(5, "Número requerido").max(20),
  address: z.string().trim().min(5, "Dirección requerida").max(200),
  city: z.string().trim().min(2, "Ciudad requerida").max(80),
  notes: z.string().max(500).optional(),
});

const REQUIRES_RECEIPT = ["bancolombia", "davivienda", "nequi", "breb"] as const;

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — All For All" }] }),
  component: CheckoutPage,
});

type PaymentMethod =
  | "wompi"
  | "addi"
  | "bancolombia"
  | "davivienda"
  | "nequi"
  | "breb"
  | "telefono";

const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  description: string;
}[] = [
  { value: "wompi", label: "💳 Tarjeta crédito/débito", description: "Pago inmediato y seguro con Wompi" },
  { value: "addi", label: "🛍️ Addi — Compra ahora, paga después", description: "Divide tu compra en cuotas sin interés" },
  { value: "bancolombia", label: "🏦 Transferencia Bancolombia", description: "Transfiere y sube tu comprobante" },
  { value: "davivienda", label: "🏦 Transferencia Davivienda", description: "Transfiere y sube tu comprobante" },
  { value: "nequi", label: "📱 Nequi", description: "Transfiere por Nequi y sube comprobante" },
  { value: "breb", label: "⚡ Bre-B", description: "Transferencia inmediata sin pasar por entidad bancaria" },
  { value: "telefono", label: "📞 Transferencia directa", description: "Llama o escribe al 321 828 0762" },
];

function CheckoutPage() {
  const { items, subtotal, clear, count } = useCart();
  const navigate = useNavigate();
  const startAddi = useServerFn(startAddiCheckout);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", notes: "",
  });
  const [payment, setPayment] = useState<PaymentMethod>("wompi");
  const [receipt, setReceipt] = useState<File | null>(null);

  const requiresReceipt = (REQUIRES_RECEIPT as readonly string[]).includes(payment);

  if (count === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">No hay productos en tu carrito</h1>
        <Button asChild><Link to="/tienda">Ir a la tienda</Link></Button>
      </div>
    );
  }

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe superar 5MB");
      return;
    }
    const valid = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!valid.includes(file.type)) {
      toast.error("Solo JPG, PNG o PDF");
      return;
    }
    setReceipt(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) {
      toast.error(res.error.issues[0]?.message || "Revisa los campos");
      return;
    }
    if (requiresReceipt && !receipt) {
      toast.error("Sube el comprobante de pago para continuar");
      return;
    }
    setSubmitting(true);

    // Upload receipt first if present
    let receiptUrl: string | null = null;
    if (receipt) {
      const ext = receipt.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-receipts")
        .upload(path, receipt, { contentType: receipt.type });
      if (upErr) {
        setSubmitting(false);
        toast.error("No se pudo subir el comprobante. Intenta de nuevo.");
        return;
      }
      receiptUrl = path;
    }

    const { data, error } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      status: "pending",
      items: items,
      subtotal,
      total: subtotal,
      payment_method: payment,
      receipt_url: receiptUrl,
      shipping_address: { address: form.address, city: form.city, notes: form.notes },
    }).select().maybeSingle();

    setSubmitting(false);

    if (error || !data) {
      toast.error("No se pudo crear el pedido. Intenta de nuevo.");
      return;
    }

    await supabase.from("customers").upsert({
      name: form.name,
      email: form.email,
      phone: form.phone,
    }, { onConflict: "email" });

    const summary = items.map(i => `• ${i.name} x${i.quantity} — ${formatCOP(i.price * i.quantity)}`).join("\n");
    const msg = `🛒 *Nuevo pedido All For All*\n\nPedido: ${data.id.slice(0,8)}\nCliente: ${form.name}\nTel: ${form.phone}\nCiudad: ${form.city}\n\n${summary}\n\n*Total:* ${formatCOP(subtotal)}\nMétodo: ${payment}${receiptUrl ? "\n📎 Comprobante adjunto" : ""}`;

    // Addi: crear aplicación y redirigir al checkout de Addi
    if (payment === "addi") {
      const toastId = toast.loading("Conectando con Addi...");
      try {
        const result = await startAddi({
          data: { orderId: data.id, origin: window.location.origin },
        });
        toast.dismiss(toastId);
        if (!result.ok || !result.redirectUrl) {
          toast.error(result.ok ? "Addi no devolvió URL de pago" : result.error);
          return;
        }
        clear();
        window.location.href = result.redirectUrl;
        return;
      } catch (err: any) {
        toast.dismiss(toastId);
        toast.error("No se pudo iniciar Addi: " + (err?.message || "error"));
        return;
      }
    }

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
            <RadioGroup value={payment} onValueChange={(v) => { setPayment(v as PaymentMethod); setReceipt(null); }} className="space-y-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    payment === opt.value ? "border-secondary bg-secondary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>

            {/* Detalles según método seleccionado */}
            {payment === "addi" && (
              <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                <p className="font-semibold mb-1">Paga con Addi</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Al confirmar el pedido te llevaremos al checkout seguro de Addi
                  para validar tu identidad y aprobar tu crédito en minutos.
                </p>
                <a
                  href="https://www.addi.com/co/como-funciona"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
                >
                  ¿Cómo funciona Addi? <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {payment === "bancolombia" && (
              <BankDetails
                items={[
                  ["Banco", "Bancolombia"],
                  ["Tipo", "Cuenta de Ahorros NUEVO"],
                  ["Número", "69800001277"],
                  ["Titular", "ALL FOR ALL SAS"],
                  ["NIT", "901.009.310-8"],
                ]}
              />
            )}

            {payment === "davivienda" && (
              <BankDetails
                items={[
                  ["Banco", "Davivienda"],
                  ["Tipo", "Cuenta de Ahorros"],
                  ["Número", "462970017556"],
                  ["Titular", "ALL FOR ALL SAS"],
                  ["NIT", "901.009.310-8"],
                ]}
              />
            )}

            {payment === "nequi" && (
              <BankDetails
                items={[
                  ["Llave Nequi", "@9010093108"],
                  ["Titular", "ALL FOR ALL SAS"],
                ]}
              />
            )}

            {payment === "breb" && (
              <BankDetails
                items={[
                  ["Llave Bre-B", "@9010093108"],
                  ["Titular", "ALL FOR ALL SAS"],
                  ["Tipo", "Empresa"],
                ]}
              />
            )}

            {payment === "telefono" && (
              <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                <p className="font-semibold mb-1">📞 Teléfono: 321 828 0762</p>
                <p className="text-sm text-muted-foreground">
                  Coordina tu pago directamente con nuestro equipo.
                </p>
              </div>
            )}

            {/* Subida de comprobante */}
            {requiresReceipt && (
              <div className="mt-4 space-y-3">
                <div className="border-2 border-dashed border-secondary/40 rounded-lg p-5 bg-secondary/5">
                  {!receipt ? (
                    <label className="cursor-pointer flex flex-col items-center text-center">
                      <Upload className="h-8 w-8 text-secondary mb-2" />
                      <p className="font-semibold text-sm">Subir comprobante de pago *</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG o PDF — máximo 5MB</p>
                      <p className="text-xs text-secondary mt-2">Click aquí para seleccionar el archivo</p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        className="hidden"
                        onChange={handleReceiptChange}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center gap-3">
                      <FileCheck2 className="h-6 w-6 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{receipt.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(receipt.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceipt(null)}
                        className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1"
                      >
                        <X className="h-3 w-3" /> Cambiar
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 border rounded-lg p-4 flex gap-3">
                  <Info className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm mb-2">¿Cómo funciona el proceso?</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                      <li>Realiza la transferencia a los datos indicados</li>
                      <li>Sube aquí la foto o PDF del comprobante</li>
                      <li>Nuestro equipo verificará el pago (máx. 2 horas hábiles)</li>
                      <li>Recibirás confirmación por WhatsApp y email</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
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
          <Button
            type="submit"
            disabled={submitting || (requiresReceipt && !receipt)}
            size="lg"
            className="w-full bg-primary"
          >
            {submitting
              ? "Procesando..."
              : requiresReceipt && !receipt
              ? "⬆️ Primero sube el comprobante"
              : "Confirmar pedido →"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Al confirmar serás contactado por WhatsApp para coordinar el pago y la entrega.
          </p>
        </aside>
      </form>
    </div>
  );
}

function BankDetails({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}:</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
