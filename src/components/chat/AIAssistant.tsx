import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 Hola, soy Ali, asesora de All For All. ¿Qué tipo de equipo o solución estás buscando hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useRef<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
  }, []);

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
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-elevated flex items-center justify-center transition-transform hover:scale-105 bg-primary text-primary-foreground"
          aria-label="Abrir asesor Ali"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

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
