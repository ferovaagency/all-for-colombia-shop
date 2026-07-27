import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Lock } from "lucide-react";

declare global {
  interface Window {
    OpenPay?: any;
  }
}

const OPENPAY_JS = "https://resources.openpay.co/openpay.v1.min.js";
const OPENPAY_DATA_JS = "https://resources.openpay.co/openpay-data.v1.min.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function paymentErrorMessage(error: unknown) {
  const message = String((error as any)?.data?.description || (error as any)?.message || error || "");
  if (/\[?3004\]?|reported as stolen|sistema de robo/i.test(message)) {
    return "No pudimos procesar esta tarjeta. Usa otra tarjeta o comunícate con tu banco.";
  }
  if (/\[?3005\]?|fraud risk|anti-fraud/i.test(message)) {
    return "Tarjeta rechazada, favor comunicarse con su banco.";
  }
  return "No pudimos procesar el pago con esta tarjeta. Verifica los datos o intenta con otra tarjeta.";
}

export interface OpenpayCardCustomer {
  name: string;
  last_name: string;
  phone_number: string;
  email: string;
}

interface Props {
  orderId: string;
  amount: number;
  customer: OpenpayCardCustomer;
  /** Called just before creating the order/token so the parent can validate the form. */
  onBeforeSubmit?: () => boolean | Promise<boolean>;
  onSuccess: (result: { charge_id?: string }) => void;
}

/**
 * Card tokenization + charge (Openpay Colombia).
 * - Card details never leave the browser as PAN — only the resulting token id.
 * - The private key never appears on the client.
 * - Amount is recalculated on the server; the value here is only shown to the user.
 */
export function OpenpayCardForm({ orderId, amount, customer, onSuccess, onBeforeSubmit }: Props) {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceSessionIdRef = useRef<string | null>(null);

  const [card, setCard] = useState({
    holder: "",
    number: "",
    exp: "", // MM/YY
    cvv: "",
  });

  const [expMonth, expYear] = useMemo(() => {
    const [m, y] = card.exp.split("/");
    return [m?.trim() ?? "", y?.trim() ?? ""];
  }, [card.exp]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetch("/api/openpay/public-config").then((r) => r.json());
        if (cfg?.error_code) throw new Error(cfg.description || "No se pudo obtener la configuración pública de Openpay");
        await Promise.all([loadScript(OPENPAY_JS), loadScript(OPENPAY_DATA_JS)]);
        if (cancelled) return;
        if (!window.OpenPay) throw new Error("Openpay.js no se cargó correctamente");
        window.OpenPay.setId(cfg.merchantId);
        window.OpenPay.setApiKey(cfg.publicKey);
        window.OpenPay.setSandboxMode(Boolean(cfg.sandbox));
        deviceSessionIdRef.current = window.OpenPay.deviceData.setup();
        setReady(true);
      } catch (e: any) {
        if (!cancelled) setInitError(e?.message || "Error inicializando Openpay");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function formatCardNumber(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 19);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExp(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  async function handleSubmit() {
    setError(null);
    if (!ready || !window.OpenPay) {
      setError("Openpay aún no está listo. Espera unos segundos.");
      return;
    }
    if (onBeforeSubmit) {
      const ok = await onBeforeSubmit();
      if (!ok) return;
    }
    const cardNumber = card.number.replace(/\s+/g, "");
    if (cardNumber.length < 13) return setError("Número de tarjeta inválido");
    if (!card.holder.trim()) return setError("Ingresa el nombre del titular");
    if (expMonth.length !== 2 || expYear.length !== 2) return setError("Fecha de vencimiento inválida (MM/YY)");
    if (card.cvv.length < 3) return setError("CVV inválido");

    const deviceSessionId = deviceSessionIdRef.current;
    if (!deviceSessionId) return setError("No se pudo generar el device session id");

    setProcessing(true);
    try {
      const token: any = await new Promise((resolve, reject) => {
        window.OpenPay.token.create(
          {
            card_number: cardNumber,
            holder_name: card.holder,
            expiration_year: expYear,
            expiration_month: expMonth,
            cvv2: card.cvv,
          },
          (res: any) => resolve(res),
          (err: any) => reject(err),
        );
      });

      const tokenId: string | undefined = token?.data?.id;
      if (!tokenId) throw new Error("No se pudo tokenizar la tarjeta");

      const res = await fetch("/api/openpay/card-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          token_id: tokenId,
          device_session_id: deviceSessionId,
          customer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data?.redirect_url) {
        console.error("DETALLE DEL ERROR DE OPENPAY (card):", data);
        throw new Error(`[${data?.error_code ?? res.status}] ${data?.description ?? "El pago con tarjeta falló"}`);
      }
      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      if (data?.status === "completed") {
        onSuccess({ charge_id: data.charge_id });
        return;
      }
      throw new Error(data?.description ?? "El cargo no se completó");
    } catch (e: any) {
      console.error("DETALLE DEL ERROR DE OPENPAY (card, catch):", e);
      setError(paymentErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  }

  if (initError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{initError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-4 bg-secondary/5 border border-secondary/20 rounded-lg p-4 space-y-3">
      <p className="font-semibold flex items-center gap-2">
        <Lock className="h-4 w-4" /> Pago con tarjeta (Openpay)
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label>Nombre del titular *</Label>
        <Input
          value={card.holder}
          onChange={(e) => setCard((c) => ({ ...c, holder: e.target.value }))}
          placeholder="Como aparece en la tarjeta"
          autoComplete="cc-name"
          maxLength={80}
        />
      </div>
      <div>
        <Label>Número de tarjeta *</Label>
        <Input
          value={card.number}
          onChange={(e) => setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))}
          placeholder="0000 0000 0000 0000"
          inputMode="numeric"
          autoComplete="cc-number"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Vencimiento (MM/YY) *</Label>
          <Input
            value={card.exp}
            onChange={(e) => setCard((c) => ({ ...c, exp: formatExp(e.target.value) }))}
            placeholder="MM/YY"
            inputMode="numeric"
            autoComplete="cc-exp"
          />
        </div>
        <div>
          <Label>CVV *</Label>
          <Input
            value={card.cvv}
            onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
            placeholder="123"
            inputMode="numeric"
            autoComplete="cc-csc"
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!ready || processing}
        size="lg"
        className="w-full"
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando pago...
          </>
        ) : (
          `Pagar ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount)}`
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        Tu tarjeta es tokenizada directamente por Openpay. El sitio nunca almacena ni recibe los datos completos.
      </p>
    </div>
  );
}

export default OpenpayCardForm;
