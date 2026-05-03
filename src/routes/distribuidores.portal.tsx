import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Package, FileDown, ShoppingBag, LayoutGrid } from "lucide-react";

export const Route = createFileRoute("/distribuidores/portal")({
  head: () => ({
    meta: [
      { title: "Portal Distribuidor — All For All" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DistributorPortalLayout,
});

type Distributor = { id: string; company: string; email: string };

function DistributorPortalLayout() {
  const navigate = useNavigate();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("afa_distributor") : null;
      if (!stored) {
        navigate({ to: "/distribuidores" });
        return;
      }
      const parsed = JSON.parse(stored);
      if (!parsed?.email) {
        localStorage.removeItem("afa_distributor");
        navigate({ to: "/distribuidores" });
        return;
      }
      setDistributor(parsed);
    } catch {
      localStorage.removeItem("afa_distributor");
      navigate({ to: "/distribuidores" });
    } finally {
      setLoaded(true);
    }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("afa_distributor");
    navigate({ to: "/distribuidores" });
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!distributor) return null;

  return (
    <div className="min-h-[60vh]">
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Portal Distribuidor — All For All</p>
            <h1 className="text-xl md:text-2xl font-bold">{distributor.company}</h1>
            <p className="text-xs text-white/70">{distributor.email}</p>
          </div>
          <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
        <div className="container mx-auto px-4">
          <nav className="flex flex-wrap gap-1 -mb-px">
            <PortalLink to="/distribuidores/portal" exact icon={<LayoutGrid className="h-4 w-4" />} label="Inicio" />
            <PortalLink to="/distribuidores/portal/catalogo" icon={<Package className="h-4 w-4" />} label="Catálogo" />
            <PortalLink to="/distribuidores/portal/pedidos" icon={<ShoppingBag className="h-4 w-4" />} label="Mis pedidos" />
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}

function PortalLink({ to, label, icon, exact }: { to: string; label: string; icon: React.ReactNode; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: !!exact }}
      activeProps={{ className: "border-b-2 border-secondary text-white" }}
      className="px-4 py-3 text-sm font-medium text-white/80 hover:text-white inline-flex items-center gap-2 border-b-2 border-transparent"
    >
      {icon} {label}
    </Link>
  );
}

export function getDistributor(): Distributor | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("afa_distributor");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
