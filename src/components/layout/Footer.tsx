import { Link } from "@tanstack/react-router";
import { MapPin, Mail, Phone, Truck } from "lucide-react";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/cart";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-20">
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="text-2xl font-bold mb-3">All For All</div>
          <p className="text-sm text-primary-foreground/75 leading-relaxed">
            Todo lo que necesitas, para todos. Tecnología, hogar y soluciones
            corporativas en toda Colombia.
          </p>
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
            <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5" /> +{WHATSAPP_NUMBER.slice(0,2)} {WHATSAPP_NUMBER.slice(2,5)} {WHATSAPP_NUMBER.slice(5,8)} {WHATSAPP_NUMBER.slice(8)}</li>
            <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5" /> {CONTACT_EMAIL}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} All For All. Todos los derechos reservados.
      </div>
    </footer>
  );
}
