import { CreditCard, Building2, Smartphone, Wallet } from "lucide-react";

const METHODS = [
  { icon: <CreditCard className="h-5 w-5" />, label: "Tarjetas" },
  { icon: <Building2 className="h-5 w-5" />, label: "PSE" },
  { icon: <Smartphone className="h-5 w-5" />, label: "Bre-B" },
  { icon: <Wallet className="h-5 w-5" />, label: "Wompi" },
];

export function PaymentMethodsBadges() {
  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Aceptamos
      </p>
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map((m) => (
          <div
            key={m.label}
            className="flex flex-col items-center justify-center gap-1 bg-muted/40 border rounded-lg py-2 px-1 text-center"
          >
            <span className="text-secondary">{m.icon}</span>
            <span className="text-[10px] font-semibold text-foreground leading-tight">
              {m.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Compra 100% segura · Garantía oficial
      </p>
    </div>
  );
}
