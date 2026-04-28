import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, ShoppingBag, FileDown } from "lucide-react";

export const Route = createFileRoute("/distribuidores/portal/")({
  component: PortalHome,
});

function PortalHome() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Bienvenido a tu portal</h2>
        <p className="text-muted-foreground">Accede a tu catálogo con precios mayoristas, gestiona pedidos y descarga material.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tile
          to="/distribuidores/portal/catalogo"
          icon={<Package className="h-6 w-6" />}
          title="Catálogo distribuidor"
          desc="Productos con precios especiales mayoristas"
        />
        <Tile
          to="/distribuidores/portal/pedidos"
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Mis pedidos"
          desc="Estado y seguimiento en tiempo real"
        />
        <a
          href="/catalogo-distribuidores.pdf"
          download
          className="bg-card border rounded-xl p-6 hover:border-secondary transition-colors group"
        >
          <div className="h-12 w-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-3 group-hover:bg-secondary/20">
            <FileDown className="h-6 w-6" />
          </div>
          <h3 className="font-bold mb-1">📥 Descargar catálogo</h3>
          <p className="text-sm text-muted-foreground">PDF actualizado del catálogo de distribuidores</p>
        </a>
      </div>
    </div>
  );
}

function Tile({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="bg-card border rounded-xl p-6 hover:border-secondary transition-colors group block">
      <div className="h-12 w-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-3 group-hover:bg-secondary/20">
        {icon}
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
