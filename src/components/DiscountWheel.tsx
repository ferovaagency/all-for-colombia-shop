import { useEffect, useState } from "react";
import { X, Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SEGMENTS = [
  { label: "5% OFF", code: "AFA5OFF" },
  { label: "10% OFF", code: "AFA10OFF" },
  { label: "Envío gratis", code: "ENVIOAFA" },
  { label: "8% OFF", code: "AFA8OFF" },
  { label: "15% OFF", code: "AFA15OFF" },
  { label: "3% OFF", code: "AFA3OFF" },
] as const;

const COLORS = ["#020f1e", "#568baf"]; // brand-dark / brand-blue
const STORAGE_KEY = "afa_wheel_shown";
const SEGMENT_DEG = 360 / SEGMENTS.length;

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
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    const t = setTimeout(() => setOpen(true), 5000);
    return () => clearTimeout(t);
  }, [mounted]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStep("wheel");
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    const winnerIndex = Math.floor(Math.random() * SEGMENTS.length);
    const targetSegmentCenter = winnerIndex * SEGMENT_DEG + SEGMENT_DEG / 2;
    // Pointer is at the top (0deg). We rotate the wheel CW so the chosen
    // segment lands under the pointer. Add several full turns for effect.
    const fullTurns = 6;
    const finalRotation = fullTurns * 360 + (360 - targetSegmentCenter);
    setRotation(finalRotation);
    setTimeout(() => {
      setWinner(SEGMENTS[winnerIndex]);
      setSpinning(false);
      setStep("result");
    }, 4200);
  };

  const copyCode = async () => {
    if (!winner) return;
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

            <div className="relative mx-auto mb-6 w-[280px] h-[280px]">
              {/* Pointer */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-2 z-20"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "12px solid transparent",
                  borderRight: "12px solid transparent",
                  borderTop: "20px solid #fff",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
              {/* Wheel */}
              <div
                className="absolute inset-0 rounded-full border-4 border-white shadow-elevated"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning
                    ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 0.99)"
                    : "none",
                  background: `conic-gradient(${SEGMENTS.map((_, i) => {
                    const start = i * SEGMENT_DEG;
                    const end = (i + 1) * SEGMENT_DEG;
                    return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
                  }).join(", ")})`,
                }}
              >
                {SEGMENTS.map((seg, i) => {
                  const angle = i * SEGMENT_DEG + SEGMENT_DEG / 2;
                  return (
                    <div
                      key={i}
                      className="absolute left-1/2 top-1/2 origin-[0_0] text-white text-[11px] font-bold uppercase tracking-wide"
                      style={{
                        transform: `rotate(${angle}deg) translate(0, -110px) rotate(90deg)`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span className="inline-block -translate-x-1/2">{seg.label}</span>
                    </div>
                  );
                })}
              </div>
              {/* Hub */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white shadow-lg z-10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary" />
              </div>
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
              🎉
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">¡Felicitaciones, {name.split(" ")[0]}!</h2>
            <p className="text-sm text-muted-foreground mb-6">Ganaste:</p>
            <div className="bg-gradient-hero text-primary-foreground rounded-xl p-6 mb-4">
              <div className="text-3xl font-extrabold mb-1">{winner.label}</div>
              <p className="text-xs text-white/80">en tu próxima compra</p>
            </div>
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
            <Button onClick={close} size="lg" className="w-full bg-secondary hover:bg-secondary/90">
              ¡Empezar a comprar!
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
