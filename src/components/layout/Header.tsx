import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/categorias", label: "Categorías" },
  { to: "/tienda", label: "Tienda" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/distribuidores", label: "Distribuidores" },
  { to: "/ventas-corporativas", label: "Ventas Corporativas" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/tienda", search: { q: q.trim() } as any });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-primary text-primary-foreground shadow-elevated">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="All For All — Inicio" className="flex items-center">
            <Logo variant="light" className="h-10 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10 transition-smooth"
                activeProps={{ className: "bg-white/15" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={onSearch} className="hidden md:flex items-center flex-1 max-w-xs ml-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar productos..."
                className="pl-9 bg-white text-foreground border-transparent focus-visible:ring-secondary"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Link to="/carrito" className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-white/10 transition-smooth">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <button
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-white/10"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden pb-4 animate-fade-in-up">
            <form onSubmit={onSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-9 bg-white text-foreground"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm hover:bg-white/10 transition-smooth"
                  )}
                  activeProps={{ className: "bg-white/15" }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
