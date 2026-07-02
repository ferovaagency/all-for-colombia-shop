import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, ExternalLink, Loader2, Bot, Sparkles, Mail, Check } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { syncToBrevo } from '@/lib/brevo';

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
  role: 'user' | 'assistant';
  content: string;
  suggested_products?: SuggestedProduct[];
  escalate?: boolean;
  whatsapp_url?: string;
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'srv';
  const KEY = 'allforall_chat_session';
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
      role: 'assistant',
      content: '👋 Hola, soy Ali, asesora de All For All. ¿Qué tipo de equipo o solución estás buscando hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const sessionId = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    syncToBrevo(email, 'newsletter', { SOURCE: 'asesor-ia' }).catch(() => {});
    try {
      localStorage.setItem('afa_ai_email', email);
    } catch {}
    setEmailSubscribed(true);
  };

  useEffect(() => {
    try {
      if (localStorage.getItem('afa_ai_email')) setEmailSubscribed(true);
    } catch {}
  }, []);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
    const shown = localStorage.getItem('allforall_chat_shown');
    if (!shown) {
      setShowPopup(true);
    }
  }, []);

  const closePopup = () => {
    setShowPopup(false);
    localStorage.setItem('allforall_chat_shown', 'true');
  };

  const openChat = () => {
    setShowPopup(false);
    setOpen(true);
    localStorage.setItem('allforall_chat_shown', 'true');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('sales-chat', {
        body: {
          session_id: sessionId.current || getOrCreateSessionId(),
          message: userMsg.content,
          history: newMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.reply,
        suggested_products: data.suggested_products,
        escalate: data.escalate,
        whatsapp_url: data.whatsapp_url,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Tuve un problema técnico. ¿Quieres hablar directo con un asesor por WhatsApp? +57 321 828 0762',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {showPopup && !open && (
        <div className="fixed bottom-24 right-6 z-50 bg-white border-2 border-primary rounded-2xl shadow-xl p-4 max-w-[260px]">
          <button onClick={closePopup} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <X className="w-4 h-4" />
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
          <button onClick={openChat} className="w-full mt-3 bg-primary text-white py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
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
            className="fixed bottom-6 right-24 z-50 flex flex-col items-end gap-2"
          >
            <button
              onClick={() => setOpen(true)}
              className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              aria-label="Chat con asesor IA"
            >
              <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
              <Sparkles className="relative z-10 w-7 h-7" />
              <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[400px] h-[600px] max-h-[calc(100vh-3rem)] bg-card border rounded-2xl shadow-elevated flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
            <div>
              <p className="font-semibold text-sm">Ali · Asesora All For All</p>
              <p className="text-xs opacity-80">Respondemos al instante</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="hover:opacity-80">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start flex-col items-start gap-2'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm whitespace-pre-wrap'
                      : 'max-w-[85%] bg-card border rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap'
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
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
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
                    style={{ background: '#25D366', color: 'white' }}
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
              <Button onClick={send} disabled={loading || !input.trim()} size="icon" aria-label="Enviar mensaje">
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
