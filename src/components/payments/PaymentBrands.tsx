/**
 * Openpay branding + accepted card-brand marks.
 * Used inside the charge form to satisfy Openpay certification:
 *  - show the Openpay logo inside the payment form
 *  - specify which card brands are accepted (Visa, Mastercard, AMEX, Diners)
 *
 * Marks are inline SVG (no external requests, always render, theme-safe).
 */

export function OpenpayLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 132 32"
      role="img"
      aria-label="Openpay"
      className={className}
      height={22}
    >
      <text
        x="0"
        y="24"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="26"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        <tspan fill="#1B4B8F">open</tspan>
        <tspan fill="#00A0DF">pay</tspan>
      </text>
    </svg>
  );
}

function BrandBadge({
  label,
  bg,
  fg,
  title,
  italic = false,
}: {
  label: string;
  bg: string;
  fg: string;
  title: string;
  italic?: boolean;
}) {
  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex h-6 min-w-[40px] items-center justify-center rounded border px-1.5 text-[11px] font-bold leading-none"
      style={{ backgroundColor: bg, color: fg, borderColor: "rgba(0,0,0,0.08)", fontStyle: italic ? "italic" : "normal" }}
    >
      {label}
    </span>
  );
}

function MastercardMark({ title }: { title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex h-6 items-center justify-center rounded border bg-white px-1.5"
      style={{ borderColor: "rgba(0,0,0,0.08)" }}
    >
      <svg viewBox="0 0 38 24" height={16} role="img" aria-label={title}>
        <circle cx="15" cy="12" r="9" fill="#EB001B" />
        <circle cx="23" cy="12" r="9" fill="#F79E1B" />
        <path d="M19 5.2a9 9 0 0 1 0 13.6 9 9 0 0 1 0-13.6Z" fill="#FF5F00" />
      </svg>
    </span>
  );
}

/**
 * Row of accepted card brands. Keep in sync with the brands actually
 * enabled in the Openpay merchant account.
 */
export function AcceptedCardBrands({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <BrandBadge label="VISA" bg="#ffffff" fg="#1A1F71" title="Visa" italic />
      <MastercardMark title="Mastercard" />
      <BrandBadge label="AMEX" bg="#2E77BC" fg="#ffffff" title="American Express" />
      <BrandBadge label="Diners" bg="#ffffff" fg="#0079BE" title="Diners Club" />
    </div>
  );
}

export default AcceptedCardBrands;
