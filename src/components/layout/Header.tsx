import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Menu, Search, X, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/layout/Logo";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Cat = { id: string; slug: string; name: string; parent_id: string | null; sort_order: number | null };

const NAV = [
  { label: "Inicio", path: "/" as const, hasMegaMenu: false },
  { label: "Tienda", path: "/tienda" as const, hasMegaMenu: true },
  { label: "Nosotros", path: "/nosotros" as const, hasMegaMenu: false },
  { label: "Distribuidores", path: "/distribuidores" as const, hasMegaMenu: false },
  { label: "Blog", path: "/blog" as const, hasMegaMenu: false },
];

export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cats, setCats] = useState<Cat[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileShop, setMobileShop] = useState(false);
  const navigate = useNavigate();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name, parent_id, sort_order")
        .order("sort_order", { ascending: true });
      setCats((data as Cat[]) || []);
    })();
  }, []);

  const parents = cats.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/tienda", search: { q: q.trim() } as any });
    setOpen(false);
  };

  const openMega = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHovered(label);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(null), 120);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-primary text-primary-foreground shadow-elevated">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="All For All — Inicio" className="flex items-center">
            <Logo variant="light" className="h-10 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 relative">
            {NAV.map((n) => (
              <div
                key={n.path}
                className="relative"
                onMouseEnter={() => n.hasMegaMenu && openMega(n.label)}
                onMouseLeave={() => n.hasMegaMenu && scheduleClose()}
              >
                <Link
                  to={n.path}
                  className="px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10 transition-smooth inline-flex items-center gap-1"
                  activeProps={{ className: "bg-white/15" }}
                  activeOptions={{ exact: n.path === "/" }}
                >
                  {n.label}
                  {n.hasMegaMenu && <ChevronDown className="h-3.5 w-3.5" />}
                </Link>

                {n.hasMegaMenu && hovered === n.label && parents.length > 0 && (
                  <div
                    onMouseEnter={() => openMega(n.label)}
                    onMouseLeave={scheduleClose}
                    className="absolute top-full left-0 mt-1 bg-white text-foreground border border-border rounded-2xl shadow-elevated p-6 z-50 w-[640px] grid grid-cols-3 gap-4"
                  >
                    {parents.map((parent) => (
                      <div key={parent.id}>
                        <Link
                          to="/tienda"
                          search={{ categoria: parent.slug } as any}
                          onClick={() => setHovered(null)}
                          className="font-bold text-sm text-foreground hover:text-secondary block mb-2"
                        >
                          {parent.name}
                        </Link>
                        <ul className="space-y-1">
                          {childrenOf(parent.id).map((child) => (
                            <li key={child.id}>
                              <Link
                                to="/tienda"
                                search={{ categoria: child.slug } as any}
                                onClick={() => setHovered(null)}
                                className="text-xs text-muted-foreground hover:text-secondary transition-colors block py-0.5"
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <div key={n.path}>
                  <div className="flex items-center">
                    <Link
                      to={n.path}
                      onClick={() => setOpen(false)}
                      className={cn("flex-1 px-3 py-2 rounded-md text-sm hover:bg-white/10 transition-smooth")}
                      activeProps={{ className: "bg-white/15" }}
                    >
                      {n.label}
                    </Link>
                    {n.hasMegaMenu && (
                      <button
                        onClick={() => setMobileShop((v) => !v)}
                        className="px-3 py-2 rounded-md hover:bg-white/10"
                        aria-label="Ver categorías"
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", mobileShop && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  {n.hasMegaMenu && mobileShop && (
                    <div className="pl-4 pb-2 space-y-3">
                      {parents.map((parent) => (
                        <div key={parent.id}>
                          <Link
                            to="/tienda"
                            search={{ categoria: parent.slug } as any}
                            onClick={() => setOpen(false)}
                            className="block text-sm font-semibold text-white py-1"
                          >
                            {parent.name}
                          </Link>
                          <ul className="pl-3 space-y-0.5">
                            {childrenOf(parent.id).map((child) => (
                              <li key={child.id}>
                                <Link
                                  to="/tienda"
                                  search={{ categoria: child.slug } as any}
                                  onClick={() => setOpen(false)}
                                  className="block text-xs text-white/70 hover:text-white py-0.5"
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
