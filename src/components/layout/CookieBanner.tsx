import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALL_DENIED,
  ALL_GRANTED,
  COOKIE_PREFS_OPEN_EVENT,
  readCookiePreferences,
  restoreConsentMode,
  saveCookiePreferences,
} from "@/lib/consent";

type Cat = {
  key: "necessary" | "analytics" | "marketing" | "functional";
  label: string;
  description: string;
  locked?: boolean;
};

const CATEGORIES: Cat[] = [
  {
    key: "necessary",
    label: "Necesarias",
    description:
      "Imprescindibles para que el sitio funcione: sesión, carrito de compras, seguridad y preferencias básicas. No se pueden desactivar.",
    locked: true,
  },
  {
    key: "analytics",
    label: "Analíticas",
    description:
      "Nos permiten entender cómo se usa el sitio para mejorarlo (Google Analytics 4, Microsoft Clarity).",
  },
  {
    key: "marketing",
    label: "Marketing",
    description:
      "Miden campañas y permiten mostrarte publicidad relevante (Google Ads, Meta Pixel, TikTok Pixel).",
  },
  {
    key: "functional",
    label: "Personalización",
    description:
      "Recuerdan tus preferencias y nos permiten mostrarte contenido y recomendaciones más relevantes.",
  },
];

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [draft, setDraft] = useState({ ...ALL_DENIED });

  useEffect(() => {
    // Reaplica al cargar lo que el usuario ya decidió antes.
    restoreConsentMode();

    const saved = readCookiePreferences();
    if (saved) {
      setDraft({
        analytics: saved.analytics,
        marketing: saved.marketing,
        functional: saved.functional,
      });
    } else {
      const t = setTimeout(() => setShowBanner(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  // Permite reabrir el centro de preferencias desde el footer o el centro legal.
  useEffect(() => {
    const open = () => {
      const saved = readCookiePreferences();
      if (saved) {
        setDraft({
          analytics: saved.analytics,
          marketing: saved.marketing,
          functional: saved.functional,
        });
      }
      setShowPrefs(true);
    };
    window.addEventListener(COOKIE_PREFS_OPEN_EVENT, open);
    return () => window.removeEventListener(COOKIE_PREFS_OPEN_EVENT, open);
  }, []);

  const decide = (prefs: typeof ALL_DENIED) => {
    saveCookiePreferences(prefs);
    setDraft(prefs);
    setShowBanner(false);
    setShowPrefs(false);
  };

  return (
    <>
      {showBanner && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Consentimiento de cookies"
          className="fixed inset-x-0 bottom-0 z-50 p-3 md:p-4 animate-fade-in-up"
        >
          <div className="mx-auto max-w-4xl bg-card border shadow-elevated rounded-2xl p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <Cookie className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground leading-relaxed">
                  Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el
                  uso del sitio y personalizar contenido y publicidad. Puedes aceptar, rechazar o
                  configurar tus preferencias.
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Consulta nuestra{" "}
                  <Link
                    to="/legal/$slug"
                    params={{ slug: "politica-cookies" }}
                    className="underline text-secondary"
                  >
                    Política de Cookies
                  </Link>{" "}
                  y la{" "}
                  <Link
                    to="/legal/$slug"
                    params={{ slug: "politica-privacidad" }}
                    className="underline text-secondary"
                  >
                    Política de Privacidad
                  </Link>
                  .
                </p>

                <div className="flex flex-wrap justify-end gap-2 mt-4">
                  <Button size="sm" variant="ghost" onClick={() => setShowPrefs(true)}>
                    Configurar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide({ ...ALL_DENIED })}>
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary"
                    onClick={() => decide({ ...ALL_GRANTED })}
                  >
                    Aceptar todas
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showPrefs} onOpenChange={setShowPrefs}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preferencias de cookies</DialogTitle>
            <DialogDescription>
              Elige qué categorías autorizas. Las cookies no esenciales permanecen desactivadas
              mientras no des tu consentimiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {CATEGORIES.map((cat) => {
              const checked = cat.locked ? true : draft[cat.key as keyof typeof draft];
              return (
                <div key={cat.key} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm flex items-center gap-1.5">
                        {cat.label}
                        {cat.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      disabled={cat.locked}
                      aria-label={cat.label}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, [cat.key]: v }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => decide({ ...ALL_DENIED })}>
              Rechazar todas
            </Button>
            <Button variant="outline" onClick={() => decide({ ...ALL_GRANTED })}>
              Aceptar todas
            </Button>
            <Button className="bg-primary" onClick={() => decide(draft)}>
              <Check className="h-4 w-4 mr-1.5" /> Guardar preferencias
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
