import { MessageCircle } from "lucide-react";

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/573134977955?text=Hola,%20necesito%20asesor%C3%ADa%20sobre%20productos%20de%20All%20For%20All"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[hsl(145,63%,42%)] text-[hsl(0,0%,100%)] flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}
