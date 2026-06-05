import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Package, ShoppingBag, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/distribuidores/portal")({
  head: () => ({
    meta: [
      { title: "Portal Distribuidor — All For All" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DistributorPortalLayout,
});

type Distributor = { id: string; company_name: string; email: string };

function DistributorPortalLayout() {
  const navigate = useNavigate();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (active) navigate({ to: "/distribuidores" });
        return;
      }
      const { data, error } = await supabase
        .from("distributors")
        .select("id, company_name, email, status")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (!active) return;
      if (error || !data || data.status !== "approved") {
        await supabase.auth.signOut();
        navigate({ to: "/distribuidores" });
        return;
      }
      setDistributor({ id: data.id, company_name: data.company_name, email: data.email });
      setLoaded(true);
    };
    load();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setDistributor(null);
        navigate({ to: "/distribuidores" });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
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
            <h1 className="text-xl md:text-2xl font-bold">{distributor.company_name}</h1>
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
