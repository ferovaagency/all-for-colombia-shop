import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Send,
  ExternalLink,
  Loader2,
  Bot,
  Sparkles,
  Mail,
  Check,
  ChevronDown,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { syncToBrevo } from "@/lib/brevo";
import { LegalLink } from "@/components/legal/ConsentControls";
import { COOKIE_PREFS_EVENT, readCookiePreferences, recordLegalAcceptance } from "@/lib/consent";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const WHATSAPP_FALLBACK =
  "https://wa.me/573134977955?text=" +
  encodeURIComponent("Hola, vengo del chat con Ali y necesito ayuda para encontrar un producto.");

const QUICK_STARTS = [
  "Busco un portátil para trabajar",
  "Quiero armar un PC gamer",
  "Necesito un monitor según mi presupuesto",
];

interface SuggestedProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  sale_price: number | null;
  short_description: string | null;
  images: string[] | null;
  stock: number | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggested_products?: SuggestedProduct[];
  escalate?: boolean;
  whatsapp_url?: string;
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "srv";
  const KEY = "allforall_chat_session";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hola, soy Ali, asesora de All For All. ¿Qué tipo de equipo o solución estás buscando hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [aiNoticeOpen, setAiNoticeOpen] = useState(true);
  const sessionId = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    // El envío de comunicaciones comerciales exige autorización expresa.
    if (!emailConsent) return;
    syncToBrevo(email, "newsletter", { SOURCE: "asesor-ia" }).catch(() => {});
    recordLegalAcceptance({
      keys: ["privacidad"],
      origin: "chat-newsletter",
      reference: email,
    }).catch(() => {});
    try {
      localStorage.setItem("afa_ai_email", email);
    } catch {
      // El almacenamiento local puede estar bloqueado; el chat sigue funcionando.
    }
    setEmailSubscribed(true);
  };

  useEffect(() => {
    try {
      if (localStorage.getItem("afa_ai_email")) setEmailSubscribed(true);
      setAiNoticeOpen(localStorage.getItem("afa_ai_notice_minimized") !== "true");
    } catch {
      // El almacenamiento local puede estar bloqueado; se usa el estado de esta sesión.
    }
  }, []);

  const setNoticeOpen = (nextOpen: boolean) => {
    setAiNoticeOpen(nextOpen);
    try {
      localStorage.setItem("afa_ai_notice_minimized", String(!nextOpen));
    } catch {
      // La preferencia no persistirá, pero el aviso conserva su estado actual.
    }
  };

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    const shown = localStorage.getItem("allforall_chat_shown");
    if (shown) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleInvitation = () => {
      timer = setTimeout(() => setShowPopup(true), 3000);
    };

    if (readCookiePreferences()) scheduleInvitation();
    else window.addEventListener(COOKIE_PREFS_EVENT, scheduleInvitation, { once: true });

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(COOKIE_PREFS_EVENT, scheduleInvitation);
    };
  }, []);

  const closePopup = () => {
    setShowPopup(false);
    localStorage.setItem("allforall_chat_shown", "true");
  };

  const openChat = () => {
    setShowPopup(false);
    setOpen(true);
    localStorage.setItem("allforall_chat_shown", "true");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (preset?: string) => {
    const outgoing = (preset ?? input).trim();
    if (!outgoing || loading) return;
    const userMsg: Message = { role: "user", content: outgoing };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("sales-chat", {
        body: {
          session_id: sessionId.current || getOrCreateSessionId(),
          message: userMsg.content,
          history: newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          suggested_products: data.suggested_products,
          escalate: data.escalate,
          whatsapp_url: data.whatsapp_url,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "No pude consultar el catálogo en este momento. Puedes continuar con un asesor por WhatsApp.",
          escalate: true,
          whatsapp_url: WHATSAPP_FALLBACK,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {showPopup && !open && (
        <div className="fixed bottom-24 right-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-2xl border bg-white p-4 shadow-xl sm:right-6 sm:max-w-[260px]">
          <button
            onClick={closePopup}
            className="absolute right-1 top-1 grid size-11 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Cerrar invitación de Ali"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm">Ali</p>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                En línea ahora
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground font-medium leading-relaxed">
            ¡Hola! Soy Ali 👋 Te ayudo a encontrar el equipo perfecto para lo que necesitas.
          </p>
          <button
            onClick={openChat}
            className="mt-3 min-h-11 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Chatear con Ali →
          </button>
        </div>
      )}

      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-24 z-50 flex flex-col items-end gap-2"
          >
            <button
              onClick={() => setOpen(true)}
              className="relative grid size-14 place-items-center rounded-full bg-primary text-white shadow-lg transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Chat con asesor IA"
            >
              <Sparkles className="size-6" aria-hidden="true" />
              <span className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-white bg-green-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <div className="fixed bottom-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] right-3 z-50 flex h-[min(600px,calc(100dvh-7rem))] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-elevated sm:right-6 sm:w-[400px]">
          <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
            <div>
              <p className="font-semibold text-sm">Ali · Asesora All For All</p>
              <p className="text-xs opacity-80">Respondemos al instante</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="grid size-11 place-items-center rounded-full hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Aviso obligatorio de uso de IA (Política de IA, cláusulas 13 y 14) */}
          <Collapsible open={aiNoticeOpen} onOpenChange={setNoticeOpen}>
            <div className="border-b bg-amber-50 text-amber-950">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  aria-label={aiNoticeOpen ? "Minimizar aviso sobre IA" : "Mostrar aviso sobre IA"}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-xs font-semibold hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-amber-700"
                >
                  <span>Ali usa IA y puede cometer errores</span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium">
                    {aiNoticeOpen ? "Minimizar" : "Ver aviso"}
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 transition-transform duration-150 ${aiNoticeOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="px-3 pb-3 text-pretty text-[11px] leading-relaxed">
                  Las respuestas se generan automáticamente y pueden contener errores; no sustituyen
                  la información oficial del fabricante ni constituyen asesoría técnica. La
                  conversación puede almacenarse y ser revisada por personal autorizado para mejorar
                  el servicio, resolver solicitudes, prevenir fraude y cumplir obligaciones legales,
                  conforme a la <LegalLink doc="ia" className="font-semibold underline" /> y la{" "}
                  <LegalLink doc="privacidad" className="font-semibold underline" />. Puedes pedir
                  atención humana para confirmar información importante.
                </p>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {!emailSubscribed ? (
            <form onSubmit={submitEmail} className="px-3 py-2 border-b bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Tu email para novedades (opcional)"
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs px-3"
                  disabled={!emailConsent}
                >
                  OK
                </Button>
              </div>
              <label className="flex items-start gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailConsent}
                  onChange={(e) => setEmailConsent(e.target.checked)}
                  className="mt-px h-3 w-3 shrink-0 accent-[var(--secondary)]"
                />
                <span>
                  Autorizo recibir promociones y novedades. Podré cancelar la suscripción en
                  cualquier momento.
                </span>
              </label>
            </form>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-green-50 text-green-700 text-xs">
              <Check className="w-3.5 h-3.5" /> Te avisaremos de novedades y ofertas.
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start flex-col items-start gap-2"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm whitespace-pre-wrap"
                      : "max-w-[85%] bg-card border rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {m.content}
                </div>

                {m.suggested_products && m.suggested_products.length > 0 && (
                  <div className="w-full space-y-2">
                    {m.suggested_products.map((p) => (
                      <Link
                        key={p.id}
                        to="/producto/$slug"
                        params={{ slug: p.slug }}
                        onClick={() => setOpen(false)}
                        className="flex gap-3 bg-card border rounded-xl p-2 hover:shadow-md transition-smooth"
                      >
                        <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          {p.images?.[0] && (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="h-full w-full object-contain p-1.5"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                          <p className="text-sm font-semibold line-clamp-2">{p.name}</p>
                          <p className="text-sm font-bold text-primary">
                            {formatCOP(p.sale_price || p.price)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {m.escalate && m.whatsapp_url && (
                  <a
                    href={m.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-success text-success-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-smooth"
                    style={{ background: "#25D366", color: "white" }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir WhatsApp con un asesor
                  </a>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-2xl rounded-tl-sm px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ali está escribiendo...
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2" aria-label="Ejemplos de consultas">
                {QUICK_STARTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-full border bg-card px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t bg-card">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu pregunta..."
                disabled={loading}
                className="flex-1"
              />
              <Button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                size="icon"
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by Ali · Si necesitas hablar con humano, pídelo
            </p>
          </div>
        </div>
      )}
    </>
  );
}
