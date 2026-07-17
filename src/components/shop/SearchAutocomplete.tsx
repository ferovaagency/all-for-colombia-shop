import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { fuzzyIncludes, fuzzyScore } from "@/lib/fuzzy";
import { formatCOP } from "@/lib/cart";
import { trackSearch, trackZeroResults } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type P = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  sale_price: number | null;
  sku: string | null;
  images: string[] | null;
  categories?: { slug: string; name: string } | null;
  brands?: { slug: string; name: string } | null;
};
type Cat = { id: string; slug: string; name: string; parent_id: string | null };

type Props = {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  onSubmitted?: () => void;
};

export function SearchAutocomplete({ className, inputClassName, placeholder = "Buscar productos, marcas, SKU...", onSubmitted }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<P[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounce(q.trim(), 300);

  // Load lightweight catalog once, filter locally for instant autocomplete.
  useEffect(() => {
    let cancel = false;
    (async () => {
      const [p, c] = await Promise.all([
        supabase
          .from("products")
          .select("id,slug,name,price,sale_price,sku,images,categories(slug,name),brands(slug,name)")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("categories").select("id,slug,name,parent_id").order("sort_order"),
      ]);
      if (cancel) return;
      setProducts((p.data as any) || []);
      setCats((c.data as any) || []);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { productMatches, catMatches } = useMemo(() => {
    if (!debounced || debounced.length < 2) return { productMatches: [] as P[], catMatches: [] as Cat[] };
    setLoading(true);
    const pm = products
      .filter((p) => fuzzyIncludes(`${p.name} ${p.sku ?? ""} ${p.brands?.name ?? ""}`, debounced))
      .map((p) => ({ p, s: fuzzyScore(`${p.name} ${p.sku ?? ""}`, debounced) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(({ p }) => p);
    const cm = cats
      .filter((c) => fuzzyIncludes(c.name, debounced))
      .slice(0, 3);
    setLoading(false);
    return { productMatches: pm, catMatches: cm };
  }, [debounced, products, cats]);

  // Silent analytics: fire on the debounced query when the dropdown is open.
  useEffect(() => {
    if (!debounced || debounced.length < 3 || !open) return;
    const total = productMatches.length + catMatches.length;
    trackSearch(debounced, total);
    if (total === 0) trackZeroResults(debounced);
  }, [debounced, productMatches.length, catMatches.length, open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate({ to: "/tienda", search: { q: term } as any });
    setOpen(false);
    onSubmitted?.();
  };

  const goTo = (path: () => void) => {
    path();
    setOpen(false);
    onSubmitted?.();
  };

  const hasQuery = debounced.length >= 2;
  const zero = hasQuery && productMatches.length === 0 && catMatches.length === 0;

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <form onSubmit={submit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            placeholder={placeholder}
            className={cn("pl-9 pr-9", inputClassName)}
            aria-label="Buscar productos"
            autoComplete="off"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {open && hasQuery && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white text-foreground rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando…
            </div>
          )}

          {catMatches.length > 0 && (
            <div className="p-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">
                Categorías
              </p>
              {catMatches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    goTo(() => navigate({ to: "/tienda", search: { categoria: c.slug } as any }))
                  }
                  className="w-full text-left px-2 py-2 rounded-md text-sm hover:bg-muted"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {productMatches.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1">
                Productos
              </p>
              <ul className="divide-y divide-gray-100">
                {productMatches.map((p) => {
                  const price = p.sale_price ?? p.price ?? 0;
                  const hasSale = !!p.sale_price && !!p.price && p.sale_price < p.price;
                  const img = p.images?.[0];
                  return (
                    <li key={p.id}>
                      <Link
                        to="/producto/$slug"
                        params={{ slug: p.slug }}
                        onClick={() => {
                          setOpen(false);
                          onSubmitted?.();
                        }}
                        className="flex items-center gap-3 px-2 py-2 hover:bg-muted rounded-md"
                      >
                        <div className="h-12 w-12 bg-muted rounded-md overflow-hidden shrink-0">
                          {img ? (
                            <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {p.brands?.name}{p.sku ? ` · SKU ${p.sku}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">{formatCOP(price)}</p>
                          {hasSale && (
                            <p className="text-[11px] text-muted-foreground line-through">
                              {formatCOP(p.price!)}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() =>
                  goTo(() => navigate({ to: "/tienda", search: { q: debounced } as any }))
                }
                className="mt-1 block w-full text-center text-sm font-semibold text-secondary hover:underline py-2"
              >
                Ver todos los resultados para “{debounced}” →
              </button>
            </div>
          )}

          {!loading && zero && (
            <div className="p-4 text-sm">
              <p className="text-muted-foreground mb-2">
                No encontramos productos para “{debounced}”.
              </p>
              <a
                href={`https://wa.me/573134977955?text=${encodeURIComponent(
                  `Hola, estoy buscando: ${debounced}. ¿Tienen disponibilidad?`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90"
              >
                Escríbele a Ali por WhatsApp
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
