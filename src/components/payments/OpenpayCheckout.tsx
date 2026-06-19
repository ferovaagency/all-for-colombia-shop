import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, QrCode, CreditCard, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

/**
 * OpenpayCheckout
 * - Tab A: PSE form -> POST backend -> redirect to payment_method.url
 * - Tab B: Bre-B Dynamic QR -> POST backend -> render base64 QR
 *          + 10 min visual countdown, + 30s polling for payment status
 *
 * NOTE: Endpoints are placeholders. Wire to your real backend:
 *   GET  /api/openpay/banks
 *   POST /api/openpay/pse
 *   POST /api/openpay/breb-qr
 *   GET  /api/openpay/status?id={chargeId}
 */

type Bank = { bankCode: string; bankName: string };
type Method = "pse" | "qr";

const pseSchema = z.object({
  firstName: z.string().trim().min(2, "Nombre requerido").max(60),
  lastName: z.string().trim().min(2, "Apellido requerido").max(60),
  email: z.string().trim().email("Correo inválido").max(120),
  docType: z.enum(["CC", "NIT", "CE"], { message: "Selecciona tipo de documento" }),
  docNumber: z.string().trim().regex(/^[\d-]+$/, "Solo números y guion").min(5).max(20),
  bankCode: z.string().min(1, "Selecciona un banco"),
});

type PseForm = z.infer<typeof pseSchema>;

const QR_TOTAL_SECONDS = 10 * 60;
const POLL_INTERVAL_MS = 30_000;

interface Props {
  amount?: number;
  /** Override the default backend endpoints if needed */
  endpoints?: {
    banks?: string;
    pse?: string;
    qr?: string;
    status?: (id: string) => string;
  };
}

const defaultEndpoints = {
  banks: "/api/openpay/banks",
  pse: "/api/openpay/pse",
  qr: "/api/openpay/breb-qr",
  status: (id: string) => `/api/openpay/status?id=${encodeURIComponent(id)}`,
};

export function OpenpayCheckout({ amount, endpoints }: Props) {
  const api = { ...defaultEndpoints, ...endpoints };
  const [method, setMethod] = useState<Method>("pse");

  return (
    <div className="max-w-2xl mx-auto bg-card border rounded-2xl p-6 shadow-sm">
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Pasarela de pago</h2>
        <p className="text-sm text-muted-foreground">
          Elige tu método de pago preferido. Procesado de forma segura por Openpay.
        </p>
        {typeof amount === "number" && (
          <p className="mt-2 text-sm">
            Total a pagar:{" "}
            <span className="font-semibold text-primary">
              {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount)}
            </span>
          </p>
        )}
      </header>

      <RadioGroup
        value={method}
        onValueChange={(v) => setMethod(v as Method)}
        className="grid grid-cols-2 gap-3 mb-6"
      >
        <label
          className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${
            method === "pse" ? "border-primary bg-primary/5" : "hover:bg-muted/40"
          }`}
        >
          <RadioGroupItem value="pse" id="m-pse" />
          <CreditCard className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-sm">Transferencia PSE</p>
            <p className="text-xs text-muted-foreground">Débito desde tu banco</p>
          </div>
        </label>
        <label
          className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${
            method === "qr" ? "border-primary bg-primary/5" : "hover:bg-muted/40"
          }`}
        >
          <RadioGroupItem value="qr" id="m-qr" />
          <QrCode className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-sm">Pago con QR Bre-B</p>
            <p className="text-xs text-muted-foreground">Escanea desde tu app</p>
          </div>
        </label>
      </RadioGroup>

      {method === "pse" ? (
        <PsePanel banksUrl={api.banks} pseUrl={api.pse} amount={amount} />
      ) : (
        <QrPanel qrUrl={api.qr} statusUrl={api.status} amount={amount} />
      )}
    </div>
  );
}

/* -------------------- PSE -------------------- */

function PsePanel({ banksUrl, pseUrl, amount }: { banksUrl: string; pseUrl: string; amount?: number }) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PseForm>({
    firstName: "",
    lastName: "",
    email: "",
    docType: "CC",
    docNumber: "",
    bankCode: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchBanks() {
      setLoadingBanks(true);
      setError(null);
      try {
        const res = await fetch(banksUrl, { method: "GET" });
        if (!res.ok) {
          const errorRes = await res.json().catch(() => ({ description: res.statusText }));
          console.error("DETALLE DEL ERROR DE OPENPAY (banks):", errorRes);
          if (!cancelled) {
            setError(
              `[${errorRes.error_code ?? res.status}] ${errorRes.description ?? JSON.stringify(errorRes)}`,
            );
            setBanks([]);
          }
          return;
        }
        const data: Bank[] = await res.json();
        if (!cancelled) setBanks(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error("DETALLE DEL ERROR DE OPENPAY (banks, network):", e);
        if (!cancelled) setError(e?.message || "Error cargando bancos");
      } finally {
        if (!cancelled) setLoadingBanks(false);
      }
    }
    fetchBanks();
    return () => {
      cancelled = true;
    };
  }, [banksUrl]);

  const set = <K extends keyof PseForm>(k: K, v: PseForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handlePsePayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = pseSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Revisa los campos");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Monto inválido. Recarga la página.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(pseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          amount,
          description: "Pago en línea",
          redirectUrl: `${window.location.origin}/resultado-pago`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("DETALLE DEL ERROR DE OPENPAY (pse):", data);
        throw new Error(
          `[${data?.error_code ?? res.status}] ${data?.description ?? JSON.stringify(data)}`,
        );
      }
      const redirect = data?.redirectUrl ?? data?.payment_method?.url;
      if (!redirect) throw new Error("Respuesta inválida del servidor (sin URL de redirección).");
      window.location.href = redirect;
    } catch (e: any) {
      console.error("DETALLE DEL ERROR DE OPENPAY (pse, catch):", e);
      setError(e?.message || "Error procesando el pago");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handlePsePayment} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Nombre *</Label>
          <Input id="firstName" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} maxLength={60} required />
        </div>
        <div>
          <Label htmlFor="lastName">Apellido *</Label>
          <Input id="lastName" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} maxLength={60} required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="email">Correo electrónico *</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} required />
        </div>
        <div>
          <Label>Tipo de documento *</Label>
          <Select value={form.docType} onValueChange={(v) => set("docType", v as PseForm["docType"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
              <SelectItem value="NIT">NIT</SelectItem>
              <SelectItem value="CE">Cédula de Extranjería</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="docNumber">Número de documento *</Label>
          <Input
            id="docNumber"
            inputMode="numeric"
            value={form.docNumber}
            onChange={(e) => set("docNumber", e.target.value.replace(/[^\d-]/g, ""))}
            maxLength={20}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Banco *</Label>
          <Select
            value={form.bankCode}
            onValueChange={(v) => set("bankCode", v)}
            disabled={loadingBanks || banks.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingBanks ? "Cargando bancos..." : "Selecciona tu banco"} />
            </SelectTrigger>
            <SelectContent>
              {banks.map((b) => (
                <SelectItem key={b.bankCode} value={b.bankCode}>
                  {b.bankName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting || loadingBanks}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirigiendo al banco...
          </>
        ) : (
          "Pagar con PSE"
        )}
      </Button>
    </form>
  );
}

/* -------------------- QR Bre-B -------------------- */

type QrStatus = "idle" | "loading" | "active" | "expired" | "paid" | "error";

function QrPanel({
  qrUrl,
  statusUrl,
  amount,
}: {
  qrUrl: string;
  statusUrl: (id: string) => string;
  amount?: number;
}) {
  const [status, setStatus] = useState<QrStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_TOTAL_SECONDS);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    countdownRef.current = null;
    pollRef.current = null;
  };

  useEffect(() => () => stopTimers(), []);

  const mmss = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  async function checkPaymentStatus(id: string) {
    try {
      const res = await fetch(statusUrl(id), { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.status === "completed") {
        stopTimers();
        setQrBase64(null);
        setStatus("paid");
      }
    } catch {
      /* swallow polling errors silently */
    }
  }

  async function handleQrPayment() {
    setError(null);
    if (!amount || amount <= 0) {
      setError("Monto inválido para generar QR.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setQrBase64(null);
    stopTimers();
    try {
      const res = await fetch(qrUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: "Pago QR Bre-B" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("DETALLE DEL ERROR DE OPENPAY (qr):", data);
        throw new Error(
          `[${data?.error_code ?? res.status}] ${data?.description ?? JSON.stringify(data)}`,
        );
      }
      const b64: string | undefined = data?.qr_base64 ?? data?.qrBase64 ?? data?.qr;
      const id: string | undefined = data?.id ?? data?.charge_id;
      if (!b64) throw new Error("Respuesta inválida del servidor (sin QR).");
      setQrBase64(b64);
      setChargeId(id ?? null);
      setSecondsLeft(QR_TOTAL_SECONDS);
      setStatus("active");

      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopTimers();
            setQrBase64(null);
            setStatus("expired");
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      if (id) {
        pollRef.current = setInterval(() => checkPaymentStatus(id), POLL_INTERVAL_MS);
      }
    } catch (e: any) {
      console.error("DETALLE DEL ERROR DE OPENPAY (qr, catch):", e);
      setError(e?.message || "Error generando el QR");
      setStatus("error");
    }
  }

  if (status === "paid") {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-1">¡Pago exitoso!</h3>
        <p className="text-sm text-muted-foreground">
          Recibimos tu pago correctamente{chargeId ? ` (ref: ${chargeId.slice(0, 8)})` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status === "idle" && (
        <div className="text-center py-8">
          <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Genera un código QR Bre-B y escanéalo desde tu app bancaria para completar el pago.
          </p>
          <Button onClick={handleQrPayment} size="lg">Generar QR para pagar</Button>
        </div>
      )}

      {status === "loading" && (
        <div className="text-center py-10">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Generando tu código QR...</p>
        </div>
      )}

      {status === "active" && qrBase64 && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="bg-white p-3 rounded-xl border shadow-sm">
            <img
              width={350}
              height={350}
              src={`data:image/png;base64,${qrBase64}`}
              alt="Código QR Bre-B"
              className="block"
            />
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Expira en</p>
            <p className={`text-3xl font-mono font-bold ${secondsLeft < 60 ? "text-destructive" : "text-foreground"}`}>
              {mmss}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verificando el pago automáticamente cada 30 segundos...
            </p>
          </div>
        </div>
      )}

      {status === "expired" && (
        <div className="text-center py-10">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">El código QR expiró</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Por seguridad, los códigos QR Bre-B sólo son válidos por 10 minutos.
          </p>
          <Button onClick={handleQrPayment} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" /> Generar nuevo QR
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="text-center">
          <Button onClick={handleQrPayment} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}

export default OpenpayCheckout;
