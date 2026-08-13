import { MessageCircle } from "lucide-react";
import { trackWhatsAppClick } from "@/lib/analytics";

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/573134977955?text=Hola,%20necesito%20asesor%C3%ADa%20sobre%20productos%20de%20All%20For%20All"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackWhatsAppClick("floating_button")}
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 flex size-14 items-center justify-center rounded-full bg-[hsl(145,63%,42%)] text-[hsl(0,0%,100%)] shadow-lg transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(145,63%,32%)] sm:right-6"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="size-7" aria-hidden="true" />
    </a>
  );
}
