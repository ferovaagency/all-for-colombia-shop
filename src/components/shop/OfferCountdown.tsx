import { useEffect, useState } from "react";
import { Flame, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Temporizador de urgencia para productos en oferta (máximo 1 h 30 min).
 *
 * La cuenta atrás va contra una ventana fija de 90 minutos anclada al reloj
 * (no al momento en que entró cada visitante), así que:
 *  - todos los visitantes ven exactamente el mismo tiempo restante;
 *  - no se reinicia al recargar ni se puede "estirar" limpiando el navegador;
 *  - nunca supera 1:30:00.
 */
const WINDOW_MS = 90 * 60 * 1000;

type Remaining = { hours: number; minutes: number; seconds: number; totalSec: number };

export function useOfferCountdown(): Remaining | null {
  // Arranca en null para que el HTML del servidor y el del cliente coincidan;
  // el reloj sólo existe en el navegador.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  const deadline = Math.ceil(now / WINDOW_MS) * WINDOW_MS;
  const totalSec = Math.max(0, Math.floor((deadline - now) / 1000));

  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalSec,
  };
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

function label(r: Remaining) {
  return r.hours > 0
    ? `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`
    : `${pad(r.minutes)}:${pad(r.seconds)}`;
}

/** Últimos 15 minutos: se resalta en rojo y pulsa. */
function isUrgent(r: Remaining) {
  return r.totalSec <= 15 * 60;
}

/** Versión compacta para las tarjetas del catálogo y la galería. */
export function OfferCountdownBadge({ className }: { className?: string }) {
  const r = useOfferCountdown();
  if (!r) return null;
  const urgent = isUrgent(r);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        urgent
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "bg-destructive/10 text-destructive",
        className,
      )}
    >
      <Timer className="h-3 w-3" />
      {label(r)}
    </span>
  );
}

/**
 * Versión destacada para la ficha de producto: es el bloque que faltaba y
 * que debe empujar la compra.
 */
export function OfferCountdownBanner({ className }: { className?: string }) {
  const r = useOfferCountdown();
  if (!r) return null;
  const urgent = isUrgent(r);

  const cells = [
    { v: r.hours, l: "Horas" },
    { v: r.minutes, l: "Min" },
    { v: r.seconds, l: "Seg" },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        urgent
          ? "border-destructive/40 bg-destructive/10"
          : "border-destructive/25 bg-destructive/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Flame className={cn("h-5 w-5 text-destructive", urgent && "animate-pulse")} />
          <div>
            <p className="text-sm font-bold text-destructive leading-tight">
              {urgent ? "¡Últimos minutos de la oferta!" : "Precio de oferta por tiempo limitado"}
            </p>
            <p className="text-xs text-muted-foreground">
              Cuando el reloj llegue a cero vuelve el precio normal.
            </p>
          </div>
        </div>

        <div className="flex items-stretch gap-1.5">
          {cells.map((c) => (
            <div
              key={c.l}
              className={cn(
                "flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[48px]",
                urgent
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              <span className="text-xl font-bold tabular-nums leading-none">{pad(c.v)}</span>
              <span className="text-[9px] uppercase tracking-widest mt-0.5 opacity-80">{c.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
