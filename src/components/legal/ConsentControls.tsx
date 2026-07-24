import { Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { LEGAL_SLUGS, type LegalDocKey } from "@/lib/legal-versions";
import { cn } from "@/lib/utils";

const LABELS: Record<LegalDocKey, string> = {
  terminos: "Términos y Condiciones",
  privacidad: "Política de Privacidad",
  cookies: "Política de Cookies",
  ia: "Política de Inteligencia Artificial",
  envios: "Política de Envíos",
  garantias: "Política de Garantías",
  cambios: "Política de Cambios, Retracto y Reembolsos",
  aviso: "Aviso de Privacidad",
};

/** Enlace a un documento legal. Siempre abierto, nunca detrás de login. */
export function LegalLink({
  doc,
  children,
  className,
}: {
  doc: LegalDocKey;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to="/legal/$slug"
      params={{ slug: LEGAL_SLUGS[doc] }}
      className={cn("underline underline-offset-2 hover:opacity-80", className)}
    >
      {children ?? LABELS[doc]}
    </Link>
  );
}

/**
 * Aviso de privacidad al pie de un formulario.
 * El documento legal exige que TODO formulario que recolecte datos lo muestre.
 */
export function PrivacyNotice({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-muted-foreground flex items-start gap-1.5", className)}>
      <Info className="h-3.5 w-3.5 mt-px shrink-0" />
      <span>
        {children ?? (
          <>
            La información suministrada será utilizada únicamente para responder tu solicitud
            conforme a nuestra <LegalLink doc="privacidad" />.
          </>
        )}
      </span>
    </p>
  );
}

/** Checkbox de consentimiento. Nunca viene premarcado. */
export function ConsentCheckbox({
  checked,
  onChange,
  required,
  id,
  children,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn("flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer", className)}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[var(--secondary)] cursor-pointer"
      />
      <span className="text-muted-foreground">
        {children}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </span>
    </label>
  );
}

export type PurchaseConsentState = {
  terms: boolean;
  adult: boolean;
  marketing: boolean;
};

export const EMPTY_PURCHASE_CONSENT: PurchaseConsentState = {
  terms: false,
  adult: false,
  marketing: false,
};

/**
 * Bloque de consentimientos del checkout.
 * `terms` y `adult` son obligatorios y bloquean el botón de pago;
 * `marketing` es opcional y nunca viene premarcado.
 */
export function PurchaseConsent({
  value,
  onChange,
  className,
}: {
  value: PurchaseConsentState;
  onChange: (v: PurchaseConsentState) => void;
  className?: string;
}) {
  const set = (patch: Partial<PurchaseConsentState>) => onChange({ ...value, ...patch });

  return (
    <div className={cn("space-y-2.5 rounded-xl border bg-muted/30 p-4", className)}>
      <ConsentCheckbox
        id="consent-terms"
        required
        checked={value.terms}
        onChange={(v) => set({ terms: v })}
      >
        Declaro que he leído y acepto los <LegalLink doc="terminos" /> y la{" "}
        <LegalLink doc="privacidad" />, y autorizo el tratamiento de mis datos personales para
        procesar el pedido, emitir la factura electrónica y coordinar el envío.
      </ConsentCheckbox>

      <ConsentCheckbox
        id="consent-adult"
        required
        checked={value.adult}
        onChange={(v) => set({ adult: v })}
      >
        Declaro ser mayor de dieciocho (18) años y tener capacidad legal para celebrar contratos.
      </ConsentCheckbox>

      <ConsentCheckbox
        id="consent-marketing"
        checked={value.marketing}
        onChange={(v) => set({ marketing: v })}
      >
        (Opcional) Deseo recibir promociones, descuentos, novedades y contenido comercial de ALL FOR
        ALL S.A.S. por correo electrónico, WhatsApp u otros medios autorizados.
      </ConsentCheckbox>
    </div>
  );
}
