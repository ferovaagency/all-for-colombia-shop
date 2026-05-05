import { Link } from "@tanstack/react-router";
import { MapPin, Mail, Phone, Truck, Clock, Instagram } from "lucide-react";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/cart";
import { Logo } from "@/components/layout/Logo";

const INSTAGRAM_URL = "https://www.instagram.com/all4all_col?igsh=MTNhN3cyNWU1czR3cw%3D%3D";
const TIKTOK_URL = "https://www.tiktok.com/@allforallcol?_r=1&_t=ZS-94OG8Q9A7vN";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-20">
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="mb-3">
            <Logo variant="light" className="h-14 w-auto" />
          </div>
          <p className="text-sm font-semibold text-secondary mb-2 italic">
            Something for everyone.
          </p>
          <p className="text-sm text-primary-foreground/75 leading-relaxed">
            Tecnología confiable con respaldo real. Más de 10 años llevando los mejores
            productos a todo Colombia.
          </p>
          <div className="flex gap-2 mt-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-secondary flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.36a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.21z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Tienda</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            <li><Link to="/tienda" className="hover:text-white">Productos</Link></li>
            <li><Link to="/categorias" className="hover:text-white">Categorías</Link></li>
            <li><Link to="/ventas-corporativas" className="hover:text-white">Ventas Corporativas</Link></li>
            <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Compañía</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            <li><Link to="/nosotros" className="hover:text-white">Nosotros</Link></li>
            <li><Link to="/contacto" className="hover:text-white">Contacto</Link></li>
            <li><Link to="/legal" className="hover:text-white">Legal</Link></li>
            <li><Link to="/mi-cuenta" className="hover:text-white">Mi cuenta</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contacto</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5" /> Bogotá, Colombia</li>
            <li className="flex items-start gap-2"><Truck className="h-4 w-4 mt-0.5" /> Envíos a todo Colombia</li>
            <li className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5" /> Lun-Vie 8am-5pm | Sáb 9am-1pm</li>
            <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5" /> {CONTACT_EMAIL}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="container mx-auto px-4 flex flex-col items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-primary-foreground/60 font-semibold">
            Métodos de pago aceptados
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["💳 Wompi", "🛍️ Addi", "🏦 Bancolombia", "🏦 Davivienda", "📱 Nequi"].map((m) => (
              <span
                key={m}
                className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-primary-foreground/90"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-primary-foreground/60">
        <p>All For All S.A.S. — NIT 901.009.310-8</p>
        <p className="mt-1">© {new Date().getFullYear()} All For All. Todos los derechos reservados.</p>
        <p className="text-xs text-primary-foreground/40 mt-2">
          Desarrollado por{" "}
          <a
            href="https://seoparaecommerce.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-white transition-colors"
          >
            Ferova Agency
          </a>
        </p>
      </div>
    </footer>
  );
}
