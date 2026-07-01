import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart, formatCOP, whatsappUrl } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Upload, FileCheck2, Info, X, ExternalLink, Loader2, CheckCircle2, AlertTriangle, RefreshCw, QrCode, Lock } from "lucide-react";
import { OpenpayCardForm } from "@/components/payments/OpenpayCardForm";

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
const QR_TOTAL_SECONDS = 10 * 60;
const POLL_INTERVAL_MS = 30_000;

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — All For All" }] }),
  component: CheckoutPage,
});

type PaymentMethod =
  | "openpay_card"
  | "openpay_pse"
  | "openpay_qr_breb"
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
  { value: "openpay_card", label: "💳 Tarjeta crédito/débito", description: "Visa, Mastercard, Amex — procesado por Openpay" },
  { value: "openpay_pse", label: "🏛️ PSE — Openpay", description: "Débito desde tu banco con PSE (procesado por Openpay)" },
  { value: "openpay_qr_breb", label: "📲 QR Bre-B — Openpay", description: "Escanea el QR desde tu app bancaria. Pago inmediato." },
  { value: "bancolombia", label: "🏦 Transferencia Bancolombia", description: "Transfiere y sube tu comprobante" },
  { value: "davivienda", label: "🏦 Transferencia Davivienda", description: "Transfiere y sube tu comprobante" },
  { value: "nequi", label: "📱 Nequi", description: "Transfiere por Nequi y sube comprobante" },
  { value: "breb", label: "⚡ Bre-B (transferencia manual)", description: "Transferencia inmediata con llave Bre-B" },
  { value: "telefono", label: "📞 Transferencia directa", description: "Llama o escribe al 321 828 0762" },
];

// Map our doc types to Openpay accepted ones (CC | NIT | CE). PA -> CE as fallback.
function mapDocType(t: string): "CC" | "NIT" | "CE" {
  if (t === "CC" || t === "NIT" || t === "CE") return t;
  return "CE";
}

function CheckoutPage() {
  const { items, subtotal, clear, count } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", customer_id_type: "CC", customer_id_number: "", address: "", city: "", notes: "",
  });
  const [payment, setPayment] = useState<PaymentMethod>("openpay_pse");
  const [receipt, setReceipt] = useState<File | null>(null);

  // ----- Openpay PSE bank list -----
  const [banks, setBanks] = useState<{ bankCode: string; bankName: string }[]>([]);
  const [bankCode, setBankCode] = useState<string>("");
  const [loadingBanks, setLoadingBanks] = useState(false);

  useEffect(() => {
    if (payment !== "openpay_pse") return;
    if (banks.length > 0) return;
    let cancelled = false;
    setLoadingBanks(true);
    fetch("/api/openpay/banks")
      .then(async (r) => {
        if (!r.ok) {
          const errorRes = await r.json().catch(() => ({ description: r.statusText }));
          console.error("DETALLE DEL ERROR DE OPENPAY (banks):", errorRes);
          throw new Error(
            `[${errorRes.error_code ?? r.status}] ${errorRes.description ?? JSON.stringify(errorRes)}`,
          );
        }
        return r.json();
      })
      .then((list: { bankCode: string; bankName: string }[]) => {
        if (!cancelled) setBanks(list);
      })
      .catch(e => {
        console.error("DETALLE DEL ERROR DE OPENPAY (banks, catch):", e);
        if (!cancelled) toast.error(e.message);
      })
      .finally(() => { if (!cancelled) setLoadingBanks(false); });
    return () => { cancelled = true; };
  }, [payment, banks.length]);

  // ----- Openpay QR Bre-B state -----
  const [qrOpen, setQrOpen] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrChargeId, setQrChargeId] = useState<string | null>(null);
  const [qrSeconds, setQrSeconds] = useState(QR_TOTAL_SECONDS);
  const [qrStatus, setQrStatus] = useState<"loading" | "active" | "expired" | "paid">("loading");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [cardOrderId, setCardOrderId] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    countdownRef.current = null;
    pollRef.current = null;
  };
  useEffect(() => () => stopTimers(), []);

  const qrMmss = useMemo(() => {
    const m = Math.floor(qrSeconds / 60);
    const s = qrSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [qrSeconds]);

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
    if (file.size > 5 * 1024 * 1024) { toast.error("El archivo no debe superar 5MB"); return; }
    const valid = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!valid.includes(file.type)) { toast.error("Solo JPG, PNG o PDF"); return; }
    setReceipt(file);
  };

  async function startQrPolling(orderId: string, chargeId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/openpay/status?id=${encodeURIComponent(chargeId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.status === "completed") {
          stopTimers();
          setQrStatus("paid");
          await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
          setTimeout(() => {
            setQrOpen(false);
            clear();
            navigate({ to: "/resultado-pago", search: { id: orderId, status: "ok" } as any });
          }, 1500);
        }
      } catch { /* ignore polling errors */ }
    }, POLL_INTERVAL_MS);
  }

  async function generateQr(orderId: string) {
    setQrOpen(true);
    setQrStatus("loading");
    setQrBase64(null);
    setQrSeconds(QR_TOTAL_SECONDS);
    stopTimers();
    try {
      const [first, ...rest] = form.name.trim().split(/\s+/);
      const last = rest.join(" ") || first;
      const res = await fetch("/api/openpay/breb-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: subtotal,
          description: `Pedido ${orderId.slice(0, 8)}`,
          customer: {
            name: first,
            last_name: last,
            email: form.email,
            phone_number: form.phone,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("DETALLE DEL ERROR DE OPENPAY (qr):", data);
        throw new Error(
          `[${data?.error_code ?? res.status}] ${data?.description ?? JSON.stringify(data)}`,
        );
      }
      setQrBase64(data.qr_base64);
      setQrChargeId(data.id);
      setQrStatus("active");
      countdownRef.current = setInterval(() => {
        setQrSeconds((s) => {
          if (s <= 1) { stopTimers(); setQrStatus("expired"); setQrBase64(null); return 0; }
          return s - 1;
        });
      }, 1000);
      if (data.id) startQrPolling(orderId, data.id);
    } catch (e: any) {
      console.error("DETALLE DEL ERROR DE OPENPAY (qr, catch):", e);
      toast.error(e?.message || "Error generando el QR");
      setQrOpen(false);
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = schema.safeParse(form);
    if (!res.success) { toast.error(res.error.issues[0]?.message || "Revisa los campos"); return; }
    if (payment === "openpay_pse" && !bankCode) { toast.error("Selecciona tu banco PSE"); return; }
    if (payment === "openpay_card" && cardOrderId) { toast.info("Ya creaste el pedido. Completa los datos de tu tarjeta abajo."); return; }
    if (requiresReceipt && !receipt) { toast.error("Sube el comprobante de pago para continuar"); return; }
    setSubmitting(true);

    let receiptUrl: string | null = null;
    if (receipt) {
      const ext = receipt.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-receipts")
        .upload(path, receipt, { contentType: receipt.type });
      if (upErr) { setSubmitting(false); toast.error("No se pudo subir el comprobante. Intenta de nuevo."); return; }
      receiptUrl = path;
    }

    const { data, error } = await supabase.from("orders").insert({
      customer_name: form.name,
      customer_email: form.email,
      customer_phone: form.phone,
      customer_id_type: form.customer_id_type,
      customer_id_number: form.customer_id_number.replace(/[^\d-]/g, ""),
      status: "pending",
      items: items,
      subtotal,
      total: subtotal,
      payment_method: payment,
      receipt_url: receiptUrl,
      shipping_address: { address: form.address, city: form.city, notes: form.notes },
    }).select().maybeSingle();

    setSubmitting(false);

    if (error || !data) { toast.error("No se pudo crear el pedido. Intenta de nuevo."); return; }

    await supabase.from("customers").upsert({
      name: form.name, email: form.email, phone: form.phone,
    }, { onConflict: "email" });

    // ------- Openpay PSE -------
    if (payment === "openpay_pse") {
      const toastId = toast.loading("Conectando con PSE...");
      try {
        const [first, ...rest] = form.name.trim().split(/\s+/);
        const last = rest.join(" ") || first;
        const r = await fetch("/api/openpay/pse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: first,
            lastName: last,
            email: form.email,
            docType: mapDocType(form.customer_id_type),
            docNumber: form.customer_id_number.replace(/-/g, ""),
            bankCode,
            amount: subtotal,
            description: `Pedido ${data.id.slice(0, 8)}`,
            redirectUrl: `${window.location.origin}/resultado-pago?id=${data.id}`,
          }),
        });
        const json = await r.json().catch(() => ({}));
        toast.dismiss(toastId);
        if (!r.ok || !json?.redirectUrl) {
          console.error("DETALLE DEL ERROR DE OPENPAY (pse):", json);
          toast.error(
            `[${json?.error_code ?? r.status}] ${json?.description ?? "PSE no devolvió URL de pago"}`,
          );
          return;
        }
        clear();
        window.location.href = json.redirectUrl;
        return;
      } catch (err: any) {
        console.error("DETALLE DEL ERROR DE OPENPAY (pse, catch):", err);
        toast.dismiss(toastId);
        toast.error("No se pudo iniciar PSE: " + (err?.message || "error"));
        return;
      }
    }

    // ------- Openpay QR Bre-B -------
    if (payment === "openpay_qr_breb") {
      setPendingOrderId(data.id);
      await generateQr(data.id);
      return;
    }

    // ------- Openpay Tarjeta -------
    if (payment === "openpay_card") {
      setCardOrderId(data.id);
      toast.success("Pedido creado. Completa los datos de tu tarjeta abajo para pagar.");
      return;
    }

    // ------- Métodos manuales (WhatsApp) -------
    const summary = items.map(i => `• ${i.name} x${i.quantity} — ${formatCOP(i.price * i.quantity)}`).join("\n");
    const msg = `🛒 *Nuevo pedido All For All*\n\nPedido: ${data.id.slice(0,8)}\nCliente: ${form.name}\nTel: ${form.phone}\nCiudad: ${form.city}\n\n${summary}\n\n*Total:* ${formatCOP(subtotal)}\nMétodo: ${payment}${receiptUrl ? "\n📎 Comprobante adjunto" : ""}`;
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
              <div><Label>Teléfono *</Label><Input value={form.phone} onChange={e => setField("phone", e.target.value)} required maxLength={20} /></div>
              <div>
                <Label>Tipo de documento *</Label>
                <select
                  value={form.customer_id_type}
                  onChange={e => setField("customer_id_type", e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="NIT">NIT</option>
                  <option value="PA">Pasaporte (PA)</option>
                </select>
              </div>
              <div>
                <Label>Número de documento *</Label>
                <Input
                  value={form.customer_id_number}
                  onChange={e => setField("customer_id_number", e.target.value.replace(/[^\d-]/g, ""))}
                  required
                  maxLength={20}
                  placeholder="Solo números y guion"
                  inputMode="numeric"
                />
              </div>
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

            {/* Openpay PSE: selector de banco */}
            {payment === "openpay_pse" && (
              <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4 space-y-3">
                <p className="font-semibold">Selecciona tu banco</p>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  required
                  disabled={loadingBanks || banks.length === 0}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{loadingBanks ? "Cargando bancos..." : "Selecciona tu banco"}</option>
                  {banks.map(b => (
                    <option key={b.bankCode} value={b.bankCode}>{b.bankName}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Te redirigiremos al portal seguro de tu banco para confirmar el pago.
                </p>
              </div>
            )}

            {/* Openpay QR Bre-B info */}
            {payment === "openpay_qr_breb" && (
              <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                <p className="font-semibold mb-1 flex items-center gap-2"><QrCode className="h-4 w-4" /> Pago QR Bre-B</p>
                <p className="text-sm text-muted-foreground">
                  Al confirmar el pedido generaremos un código QR dinámico. Tendrás 10 minutos para escanearlo desde tu app bancaria.
                </p>
              </div>
            )}

            {/* Openpay Tarjeta */}
            {payment === "openpay_card" && !cardOrderId && (
              <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                <p className="font-semibold mb-1 flex items-center gap-2"><Lock className="h-4 w-4" /> Pago con tarjeta</p>
                <p className="text-sm text-muted-foreground">
                  Al confirmar el pedido te pediremos los datos de tu tarjeta de forma segura (tokenización Openpay).
                </p>
              </div>
            )}
            {payment === "openpay_card" && cardOrderId && (
              <OpenpayCardForm
                orderId={cardOrderId}
                amount={subtotal}
                customer={{
                  name: form.name.trim().split(/\s+/)[0] || form.name,
                  last_name: form.name.trim().split(/\s+/).slice(1).join(" ") || form.name,
                  phone_number: form.phone,
                  email: form.email,
                }}
                onSuccess={({ charge_id }) => {
                  clear();
                  navigate({ to: "/resultado-pago", search: { id: cardOrderId, status: "ok", ref: charge_id } as any });
                }}
              />
            )}

            {payment === "bancolombia" && (
              <BankDetails items={[["Banco","Bancolombia"],["Tipo","Cuenta de Ahorros NUEVO"],["Número","69800001277"],["Titular","ALL FOR ALL SAS"],["NIT","901.009.310-8"]]} />
            )}
            {payment === "davivienda" && (
              <BankDetails items={[["Banco","Davivienda"],["Tipo","Cuenta de Ahorros"],["Número","462970017556"],["Titular","ALL FOR ALL SAS"],["NIT","901.009.310-8"]]} />
            )}
            {payment === "nequi" && (
              <BankDetails items={[["Llave Nequi","@9010093108"],["Titular","ALL FOR ALL SAS"]]} />
            )}
            {payment === "breb" && (
              <BankDetails items={[["Llave Bre-B","@9010093108"],["Titular","ALL FOR ALL SAS"],["Tipo","Empresa"]]} />
            )}
            {payment === "telefono" && (
              <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                <p className="font-semibold mb-1">📞 Teléfono: 321 828 0762</p>
                <p className="text-sm text-muted-foreground">Coordina tu pago directamente con nuestro equipo.</p>
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
                        <p className="text-xs text-muted-foreground">{(receipt.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button type="button" onClick={() => setReceipt(null)} className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1">
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
            disabled={submitting || (requiresReceipt && !receipt) || (payment === "openpay_card" && !!cardOrderId)}
            size="lg"
            className="w-full bg-primary"
          >
            {submitting
              ? "Procesando..."
              : payment === "openpay_card" && cardOrderId
                ? "Ingresa los datos de tu tarjeta ↓"
                : requiresReceipt && !receipt
                  ? "⬆️ Primero sube el comprobante"
                  : payment === "openpay_card"
                    ? "Continuar al pago con tarjeta →"
                    : "Confirmar pedido →"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Pagos PSE y QR procesados de forma segura por Openpay.
          </p>
        </aside>
      </form>

      {/* Diálogo de QR Bre-B */}
      <Dialog
        open={qrOpen}
        onOpenChange={(open) => {
          if (!open) { stopTimers(); setQrOpen(false); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pago QR Bre-B</DialogTitle>
            <DialogDescription>
              Escanea este código desde tu app bancaria para completar el pago.
            </DialogDescription>
          </DialogHeader>

          {qrStatus === "loading" && (
            <div className="py-10 text-center">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Generando tu código QR...</p>
            </div>
          )}

          {qrStatus === "active" && qrBase64 && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-xl border shadow-sm">
                <img
                  width={300}
                  height={300}
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="Código QR Bre-B"
                  className="block"
                />
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Expira en</p>
                <p className={`text-3xl font-mono font-bold ${qrSeconds < 60 ? "text-destructive" : "text-foreground"}`}>
                  {qrMmss}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verificando el pago automáticamente cada 30 segundos...
                </p>
              </div>
            </div>
          )}

          {qrStatus === "expired" && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">El código QR expiró</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Los códigos QR Bre-B sólo son válidos por 10 minutos.
              </p>
              <Button onClick={() => pendingOrderId && generateQr(pendingOrderId)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Generar nuevo QR
              </Button>
            </div>
          )}

          {qrStatus === "paid" && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-1">¡Pago exitoso!</h3>
              <p className="text-sm text-muted-foreground">Recibimos tu pago correctamente.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
