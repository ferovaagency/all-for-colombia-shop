import { Link } from "@tanstack/react-router";
import { ShoppingCart, Menu, X, ChevronDown, Sparkles, ArrowUpRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";
import { Logo } from "@/components/layout/Logo";
import { supabase } from "@/integrations/supabase/client";
import { SearchAutocomplete } from "@/components/shop/SearchAutocomplete";
import { FREE_SHIPPING_CITIES_TEXT, FREE_SHIPPING_HEADLINE } from "@/lib/shipping";
import { cn } from "@/lib/utils";

type Cat = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
};

/** Páginas que ya no viven en la barra principal y se consultan desde "Menú". */
const PAGES = [
  { label: "Nosotros", path: "/nosotros" as const },
  { label: "Categorías", path: "/categorias" as const },
  { label: "Blog", path: "/blog" as const },
  { label: "Distribuidores", path: "/distribuidores" as const },
  { label: "Ventas corporativas", path: "/ventas-corporativas" as const },
  { label: "Contacto", path: "/contacto" as const },
  { label: "Mi cuenta", path: "/mi-cuenta" as const },
  { label: "Legal", path: "/legal" as const },
];

export function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<Cat[]>([]);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileCats, setMobileCats] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("categories_with_products" as any)
        .select("id, slug, name, parent_id, sort_order, product_count")
        .order("sort_order", { ascending: true });
      setCats(((data as any) || []) as Cat[]);
    })();
  }, []);

  const parents = cats.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMegaOpen(false), 140);
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Banda de envío gratis */}
      <div className="bg-neutral-950 text-white text-center py-1.5 px-4">
        <p className="text-[11px] md:text-xs">
          <span className="font-bold">{FREE_SHIPPING_HEADLINE}</span>
          <span className="hidden sm:inline text-white/60"> · {FREE_SHIPPING_CITIES_TEXT}</span>
          <span className="hidden md:inline text-white/40">
            {" "}
            · Resto del país se cotiza al confirmar
          </span>
        </p>
      </div>

      <div className="w-full bg-primary text-primary-foreground shadow-elevated">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 h-20 md:h-24">
            <Link to="/" aria-label="All For All — Inicio" className="flex items-center shrink-0">
              <Logo variant="light" className="h-16 md:h-20 w-auto object-contain" />
            </Link>

            {/* ---------- NAV PRINCIPAL: Menú · Tienda · Producto de la semana · Logitech ---------- */}
            <nav className="hidden lg:flex items-center gap-1">
              <div className="relative" onMouseEnter={openMega} onMouseLeave={scheduleClose}>
                <button
                  type="button"
                  onClick={() => setMegaOpen((v) => !v)}
                  aria-expanded={megaOpen}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10 transition-smooth inline-flex items-center gap-1.5",
                    megaOpen && "bg-white/15",
                  )}
                >
                  <Menu className="h-4 w-4" />
                  Menú
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", megaOpen && "rotate-180")}
                  />
                </button>

                {megaOpen && (
                  <MegaMenu
                    parents={parents}
                    childrenOf={childrenOf}
                    onNavigate={() => setMegaOpen(false)}
                    onMouseEnter={openMega}
                    onMouseLeave={scheduleClose}
                  />
                )}
              </div>

              <Link
                to="/tienda"
                className="px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10 transition-smooth"
                activeProps={{ className: "bg-white/15" }}
              >
                Tienda
              </Link>

              <Link
                to="/producto-de-la-semana"
                className="px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10 transition-smooth inline-flex items-center gap-1.5"
                activeProps={{ className: "bg-white/15" }}
              >
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                Producto de la semana
              </Link>

              <Link
                to="/marcas/logitech"
                className="px-3 py-2 text-sm font-medium rounded-md hover:bg-white/10 transition-smooth"
                activeProps={{ className: "bg-white/15" }}
              >
                Logitech
              </Link>
            </nav>

            <div className="hidden md:flex items-center flex-1 max-w-xs ml-2">
              <SearchAutocomplete
                inputClassName="bg-white text-foreground border-transparent focus-visible:ring-secondary"
                placeholder="Buscar productos..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/carrito"
                aria-label={`Carrito de compras${count > 0 ? `, ${count} artículos` : ""}`}
                className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-white/10 transition-smooth"
              >
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

          {/* ---------- MENÚ MÓVIL ---------- */}
          {open && (
            <div className="lg:hidden pb-4 animate-fade-in-up">
              <div className="mb-3">
                <SearchAutocomplete
                  inputClassName="bg-white text-foreground"
                  placeholder="Buscar..."
                  onSubmitted={() => setOpen(false)}
                />
              </div>

              <nav className="flex flex-col gap-1">
                <Link
                  to="/tienda"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-md text-sm font-semibold hover:bg-white/10"
                  activeProps={{ className: "bg-white/15" }}
                >
                  Tienda
                </Link>
                <Link
                  to="/producto-de-la-semana"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-md text-sm font-semibold hover:bg-white/10 inline-flex items-center gap-2"
                  activeProps={{ className: "bg-white/15" }}
                >
                  <Sparkles className="h-4 w-4 text-secondary" /> Producto de la semana
                </Link>
                <Link
                  to="/marcas/logitech"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-md text-sm font-semibold hover:bg-white/10"
                  activeProps={{ className: "bg-white/15" }}
                >
                  Logitech
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileCats((v) => !v)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-semibold hover:bg-white/10"
                >
                  Categorías
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", mobileCats && "rotate-180")}
                  />
                </button>
                {mobileCats && (
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

                <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-1">
                  {PAGES.map((p) => (
                    <Link
                      key={p.path}
                      to={p.path}
                      onClick={() => setOpen(false)}
                      className="px-3 py-2 rounded-md text-xs text-white/75 hover:bg-white/10 hover:text-white"
                    >
                      {p.label}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** Panel desplegable de "Menú": categorías + el resto de páginas del sitio. */
function MegaMenu({
  parents,
  childrenOf,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  parents: Cat[];
  childrenOf: (id: string) => Cat[];
  onNavigate: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 mt-1 bg-white text-foreground rounded-2xl shadow-2xl border border-neutral-100 z-50 p-6 w-[min(92vw,860px)]"
    >
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
        {/* Categorías */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400 mb-3">
            Categorías
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 max-h-[52vh] overflow-y-auto pr-1">
            {parents.map((parent) => (
              <div key={parent.id}>
                <Link
                  to="/tienda"
                  search={{ categoria: parent.slug } as any}
                  onClick={onNavigate}
                  className="block text-sm font-bold text-neutral-950 hover:text-secondary transition-colors"
                >
                  {parent.name}
                </Link>
                <ul className="mt-1 space-y-0.5">
                  {childrenOf(parent.id)
                    .slice(0, 4)
                    .map((child) => (
                      <li key={child.id}>
                        <Link
                          to="/tienda"
                          search={{ categoria: child.slug } as any}
                          onClick={onNavigate}
                          className="block text-xs text-neutral-500 hover:text-secondary transition-colors"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {parents.length === 0 && (
              <p className="text-sm text-neutral-400">Cargando categorías…</p>
            )}
          </div>
          <Link
            to="/tienda"
            onClick={onNavigate}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-secondary hover:underline"
          >
            Ver todo el catálogo <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Resto de páginas */}
        <div className="md:border-l md:border-neutral-100 md:pl-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400 mb-3">
            Explora
          </p>
          <ul className="space-y-1">
            {PAGES.map((p) => (
              <li key={p.path}>
                <Link
                  to={p.path}
                  onClick={onNavigate}
                  className="block px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 hover:text-secondary transition-colors"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
