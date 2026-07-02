import { useEffect, useState } from "react";
import { X, Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { syncToBrevo } from "@/lib/brevo";

const SEGMENTS = [
  { id: "discount_5", label: "5% OFF", code: "BIENVENIDA5", winnable: true },
  { id: "free_shipping", label: "Envío gratis", code: "ENVIOGRATIS", winnable: true },
  { id: "discount_3", label: "3% OFF", code: "EXTRA3", winnable: true },
  { id: "no_prize", label: "¡Suerte para la próxima!", code: null, winnable: false },
] as const;

const SEGMENT_DEG = 360 / SEGMENTS.length;


const getClientId = () => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("afa_client_id");
  if (!id) {
    id = `afa_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("afa_client_id", id);
  }
  return id;
};

type Step = "form" | "wheel" | "result";

export function DiscountWheel() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<(typeof SEGMENTS)[number] | null>(null);
  const [copied, setCopied] = useState(false);

  // Mount only on client to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    const clientId = getClientId();
    if (localStorage.getItem(`afa_wheel_${clientId}`)) return;
    const t = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(t);
  }, [mounted]);

  const close = () => {
    setOpen(false);
    try {
      const clientId = getClientId();
      localStorage.setItem(`afa_wheel_${clientId}`, "participated");
    } catch {
      /* ignore */
    }
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    syncToBrevo(email.trim().toLowerCase(), "newsletter", {
      NOMBRE: name.trim(),
      SOURCE: "ruleta",
    }).catch(() => {});
    setStep("wheel");
  };

  const spin = () => {
    if (spinning) return;
    if (typeof window !== "undefined" && localStorage.getItem("roulette_spun") === "true") return;
    setSpinning(true);

    // 1 de cada 10 activaciones gana
    const activations = Number(localStorage.getItem("roulette_activations") || "0") + 1;
    localStorage.setItem("roulette_activations", String(activations));
    const isWinningTurn = activations % 10 === 0;

    let winnerIndex: number;
    if (isWinningTurn) {
      const winnableIdx = SEGMENTS.map((s, i) => (s.winnable ? i : -1)).filter((i) => i >= 0);
      winnerIndex = winnableIdx[Math.floor(Math.random() * winnableIdx.length)];
    } else {
      winnerIndex = SEGMENTS.findIndex((s) => s.id === "no_prize");
    }

    const targetSegmentCenter = winnerIndex * SEGMENT_DEG + SEGMENT_DEG / 2;
    const fullTurns = 6;
    const finalRotation = fullTurns * 360 + (360 - targetSegmentCenter);
    setRotation(finalRotation);
    setTimeout(() => {
      const prize = SEGMENTS[winnerIndex];
      setWinner(prize);
      setSpinning(false);
      setStep("result");
      try {
        localStorage.setItem("roulette_spun", "true");
        if (prize.code) localStorage.setItem("active_coupon", prize.code);
      } catch {
        /* ignore */
      }
    }, 4200);
  };

  const copyCode = async () => {
    if (!winner || !winner.code) return;
    try {
      await navigator.clipboard.writeText(winner.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };


  if (!mounted || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wheel-title"
    >
      <div className="relative w-full max-w-md bg-card rounded-2xl shadow-elevated overflow-hidden">
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "form" && (
          <div className="p-6 md:p-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
              <Gift className="h-7 w-7" />
            </div>
            <h2 id="wheel-title" className="text-2xl font-bold text-foreground mb-2">
              ¡Gira la ruleta y gana!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Déjanos tus datos y obtén un descuento exclusivo en tu primera compra.
            </p>
            <form onSubmit={onSubmitForm} className="space-y-3 text-left">
              <div>
                <label htmlFor="wheel-name" className="text-xs font-medium text-foreground">
                  Nombre
                </label>
                <Input
                  id="wheel-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="wheel-email" className="text-xs font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="wheel-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="mt-1"
                />
              </div>
              <Button type="submit" size="lg" className="w-full bg-secondary hover:bg-secondary/90">
                Girar ruleta
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Al continuar aceptas recibir comunicaciones de All For All.
              </p>
            </form>
          </div>
        )}

        {step === "wheel" && (
          <div className="p-6 md:p-8 text-center bg-gradient-hero text-primary-foreground">
            <h2 className="text-xl font-bold mb-1">¡Gira la ruleta!</h2>
            <p className="text-sm text-white/80 mb-6">Toca el botón para ver qué te tocó.</p>

            <div className="relative mx-auto mb-6 w-[300px] h-[300px]">
              {(() => {
                const SEG_COUNT = SEGMENTS.length;
                const RADIUS = 140;
                const CENTER = 150;
                const colors = ["#020f1e", "#568baf", "#3e4653", "#000e1e", "#568baf", "#cccfd5"];
                const textColors = ["#ffffff", "#ffffff", "#ffffff", "#568baf", "#ffffff", "#020f1e"];
                const angle = (2 * Math.PI) / SEG_COUNT;
                return (
                  <svg
                    viewBox="0 0 300 300"
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: spinning
                        ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 0.99)"
                        : "none",
                      filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
                    }}
                  >
                    {SEGMENTS.map((seg, i) => {
                      const startAngle = i * angle - Math.PI / 2;
                      const endAngle = startAngle + angle;
                      const midAngle = startAngle + angle / 2;
                      const x1 = CENTER + RADIUS * Math.cos(startAngle);
                      const y1 = CENTER + RADIUS * Math.sin(startAngle);
                      const x2 = CENTER + RADIUS * Math.cos(endAngle);
                      const y2 = CENTER + RADIUS * Math.sin(endAngle);
                      const textR = RADIUS * 0.62;
                      const textX = CENTER + textR * Math.cos(midAngle);
                      const textY = CENTER + textR * Math.sin(midAngle);
                      const textRotation = (midAngle * 180) / Math.PI + 90;
                      const lines = seg.label.split(" ");
                      return (
                        <g key={i}>
                          <path
                            d={`M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`}
                            fill={colors[i]}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          <text
                            x={textX}
                            y={textY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={textColors[i]}
                            fontSize="11"
                            fontWeight="bold"
                            transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                          >
                            {lines.length > 1 ? (
                              <>
                                <tspan x={textX} dy="-0.4em">{lines[0].slice(0, 8)}</tspan>
                                <tspan x={textX} dy="1.1em">{lines.slice(1).join(" ").slice(0, 8)}</tspan>
                              </>
                            ) : (
                              seg.label.slice(0, 8)
                            )}
                          </text>
                        </g>
                      );
                    })}
                    <circle cx={CENTER} cy={CENTER} r="30" fill="#ffffff" stroke="#568baf" strokeWidth="3" />
                    <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="middle" fontSize="22">
                      🎯
                    </text>
                  </svg>
                );
              })()}
              {/* Pointer (fixed, doesn't rotate) */}
              <svg
                viewBox="0 0 300 300"
                className="absolute inset-0 pointer-events-none"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
              >
                <polygon points="150,5 140,28 160,28" fill="#568baf" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>

            <Button
              onClick={spin}
              disabled={spinning}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 w-full"
            >
              {spinning ? "Girando…" : "¡Girar!"}
            </Button>
          </div>
        )}

        {step === "result" && winner && (
          <div className="p-6 md:p-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-3xl">
              {winner.winnable ? "🎉" : "🍀"}
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {winner.winnable ? `¡Felicitaciones, ${name.split(" ")[0]}!` : `¡Gracias por participar, ${name.split(" ")[0]}!`}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {winner.winnable ? "Ganaste:" : "Esta vez no fue, pero te esperamos en la tienda:"}
            </p>
            <div className="bg-gradient-hero text-primary-foreground rounded-xl p-6 mb-4">
              <div className="text-3xl font-extrabold mb-1">{winner.label}</div>
              {winner.winnable && <p className="text-xs text-white/80">en tu próxima compra</p>}
            </div>
            {winner.code && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 bg-muted text-foreground font-mono text-sm font-bold py-3 px-4 rounded-lg tracking-wider">
                    {winner.code}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    aria-label="Copiar código"
                    className={cn(copied && "text-success border-success")}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Usa este código al finalizar tu compra. Te enviaremos un recordatorio a {email}.
                </p>
              </>
            )}
            <Button onClick={close} size="lg" className="w-full bg-secondary hover:bg-secondary/90">
              {winner.winnable ? "¡Empezar a comprar!" : "Ir a la tienda"}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
