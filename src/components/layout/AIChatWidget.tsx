import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WHATSAPP_NUMBER } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/al-chat`;
const SESSION_KEY = "afa_session";

function getOrCreateSessionId() {
  if (typeof window === "undefined") return `session_${Date.now()}`;
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("afa_chat_shown")) {
      const t = setTimeout(() => {
        setShowWelcome(true);
        localStorage.setItem("afa_chat_shown", "1");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const saveConversation = useCallback(async () => {
    const msgs = messagesRef.current;
    if (msgs.length < 2) return;
    if (typeof window === "undefined") return;
    const sessionId = getOrCreateSessionId();
    try {
      await supabase.from("chat_conversations").upsert(
        [
          {
            session_id: sessionId,
            messages: msgs as unknown as object,
            page_url: window.location.href,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "session_id" },
      );
    } catch {
      /* ignore — chat must keep working */
    }
  }, []);

  // Save every time messages reach a multiple of 5
  useEffect(() => {
    if (messages.length > 0 && messages.length % 5 === 0) {
      saveConversation();
    }
  }, [messages.length, saveConversation]);

  const buildWhatsAppSummary = () => {
    const summary = messagesRef.current
      .map((m) => `${m.role === "user" ? "👤 Cliente" : "🤖 Al"}: ${m.content}`)
      .join("\n\n");
    return encodeURIComponent(
      `Hola, vengo del chat de la página web de All For All.\n\n` +
        `--- Resumen de mi conversación con Al ---\n\n` +
        `${summary}\n\n` +
        `--- Fin del resumen ---\n\n` +
        `¿Me pueden ayudar?`,
    );
  };

  const transferToHuman = async () => {
    await saveConversation();
    const text =
      messagesRef.current.length > 1
        ? buildWhatsAppSummary()
        : encodeURIComponent("Hola, vengo del chat de la web. ¿Me pueden ayudar?");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
  };

  const closeChat = async () => {
    await saveConversation();
    setOpen(false);
  };

  const openChat = () => {
    setShowWelcome(false);
    setOpen(true);
    if (messages.length === 0) {
      setMessages([
        { role: "assistant", content: "¡Hola! 👋 Soy Al, tu asesor virtual. ¿En qué puedo ayudarte hoy?" },
      ]);
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content !== "" && prev[prev.length - 2]?.role === "user") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (resp.status === 429) {
        upsert("Estamos recibiendo muchas consultas en este momento. Por favor intenta en unos segundos o escríbenos por WhatsApp.");
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        upsert("El asistente está temporalmente fuera de servicio. Por favor escríbenos por WhatsApp y te atenderemos.");
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("network");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") {
            done = true;
            break;
          }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch {
      upsert("Hubo un problema de conexión. Por favor intenta de nuevo o escríbenos por WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openChat}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elevated transition-smooth hover:scale-110 animate-pulse-ring"
        aria-label="Chatear con Al"
      >
        <Bot className="h-7 w-7" />
      </button>

      {/* Welcome popup */}
      {showWelcome && !open && (
        <div className="fixed bottom-24 right-6 z-30 max-w-xs bg-card border shadow-elevated rounded-2xl p-4 animate-fade-in-up">
          <button
            onClick={() => setShowWelcome(false)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />
            </div>
            <div>
              <p className="font-semibold text-sm">Al</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success inline-block" /> En línea ahora
              </p>
            </div>
          </div>
          <p className="text-sm mb-3">
            ¡Holaaaaa! 👋 Estoy aquí para ayudarte en todo lo que necesites. ¿En qué te puedo ayudar hoy?
          </p>
          <Button onClick={openChat} className="w-full bg-primary">
            Chatear con Al →
          </Button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[calc(100vw-3rem)] sm:w-96 h-[32rem] bg-card border shadow-elevated rounded-2xl flex flex-col overflow-hidden animate-fade-in-up">
          <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Al · Asesor virtual</p>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success inline-block" /> En línea
              </p>
            </div>
            <button onClick={closeChat} className="hover:bg-white/10 rounded p-1" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm"
                      : "max-w-[80%] bg-card border rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap"
                  }
                >
                  {m.content || "…"}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
                  <span className="inline-block animate-pulse">Al está escribiendo…</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Escribe tu pregunta..."
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="bg-primary">
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <button
            onClick={transferToHuman}
            className="w-full text-xs text-muted-foreground hover:text-primary transition-colors py-2 border-t border-border bg-muted/30"
          >
            💬 Hablar con un asesor humano →
          </button>
        </div>
      )}
    </>
  );
}
