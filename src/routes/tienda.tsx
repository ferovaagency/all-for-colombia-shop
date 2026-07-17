import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/shop/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, ChevronDown, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchParams = {
  q?: string;
  categoria?: string;
  marca?: string;
  oferta?: string;
  orden?: string;
};

export const Route = createFileRoute("/tienda")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    categoria: typeof s.categoria === "string" ? s.categoria : undefined,
    marca: typeof s.marca === "string" ? s.marca : undefined,
    oferta: s.oferta === "1" ? "1" : undefined,
    orden: typeof s.orden === "string" ? s.orden : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tienda — All For All" },
      { name: "description", content: "Catálogo completo de productos: tecnología, hogar, equipos corporativos y más." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [maxPrice, setMaxPrice] = useState(10000000);

  const parentCats = useMemo(() => categories.filter((c: any) => !c.parent_id), [categories]);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      const [p, c, b] = await Promise.all([
        supabase.from("products").select("*, categories(slug,name), brands(slug,name)").eq("active", true),
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("brands").select("*"),
      ]);
      if (cancelled) return;
      setProducts(p.data || []);
      setCategories(c.data || []);
      setBrands(b.data || []);
      const max = Math.max(...(p.data || []).map((x: any) => Number(x.sale_price ?? x.price ?? 0)), 1000000);
      setMaxPrice(max);
      setPriceRange([0, max]);
      setLoading(false);
    };
    fetchAll();

    const channel = supabase
      .channel("tienda-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, fetchAll)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);


  const updateSearch = (patch: Partial<SearchParams>) => {
    navigate({ to: "/tienda", search: (prev: any) => ({ ...prev, ...patch }) });
  };

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter((p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }
    if (search.categoria) {
      const selected = categories.find((c: any) => c.slug === search.categoria);
      if (selected) {
        const getDescendantIds = (catId: string): string[] => {
          const children = categories.filter((c: any) => c.parent_id === catId);
          return [catId, ...children.flatMap((c: any) => getDescendantIds(c.id))];
        };
        const ids = new Set(getDescendantIds(selected.id));
        list = list.filter((p) => p.category_id && ids.has(p.category_id));
      } else {
        list = list.filter((p) => p.categories?.slug === search.categoria);
      }
    }
    if (search.marca) list = list.filter((p) => p.brands?.slug === search.marca);
    if (search.oferta === "1") list = list.filter((p) => p.sale_price && p.price && p.sale_price < p.price);
    list = list.filter((p) => {
      const price = Number(p.sale_price ?? p.price ?? 0);
      return price >= priceRange[0] && price <= priceRange[1];
    });
    switch (search.orden) {
      case "precio-asc":
        list.sort((a, b) => Number(a.sale_price ?? a.price ?? 0) - Number(b.sale_price ?? b.price ?? 0));
        break;
      case "precio-desc":
        list.sort((a, b) => Number(b.sale_price ?? b.price ?? 0) - Number(a.sale_price ?? a.price ?? 0));
        break;
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [products, categories, search, priceRange]);

  const activeFilterCount = (search.marca ? 1 : 0) + (search.oferta === "1" ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Tienda</h1>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search.q || ""}
              onChange={(e) => updateSearch({ q: e.target.value || undefined })}
              placeholder="Buscar productos, marcas, SKU..."
              className="pl-9"
            />
          </div>
          <Select value={search.orden || "recientes"} onValueChange={(v) => updateSearch({ orden: v === "recientes" ? undefined : v })}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recientes">Más recientes</SelectItem>
              <SelectItem value="precio-asc">Precio menor</SelectItem>
              <SelectItem value="precio-desc">Precio mayor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Barra de filtros horizontal */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={!search.categoria} onClick={() => updateSearch({ categoria: undefined })}>
            Todos
          </Chip>
          {parentCats.map((cat: any) => (
            <Chip key={cat.id} active={search.categoria === cat.slug} onClick={() => updateSearch({ categoria: cat.slug })}>
              {cat.name}
            </Chip>
          ))}

          <span className="h-6 w-px bg-border shrink-0 mx-1" />

          {brands.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Chip active={!!search.marca}>
                  Marca{search.marca ? `: ${brands.find((b) => b.slug === search.marca)?.name ?? ""}` : ""}
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Chip>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 max-h-80 overflow-y-auto p-2">
                <button
                  onClick={() => updateSearch({ marca: undefined })}
                  className={cn(
                    "block w-full text-left px-3 py-1.5 rounded-md text-sm",
                    !search.marca ? "bg-secondary/10 text-secondary font-medium" : "hover:bg-muted",
                  )}
                >
                  Todas
                </button>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => updateSearch({ marca: b.slug })}
                    className={cn(
                      "block w-full text-left px-3 py-1.5 rounded-md text-sm",
                      search.marca === b.slug ? "bg-secondary/10 text-secondary font-medium" : "hover:bg-muted",
                    )}
                  >
                    {b.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Chip active={priceRange[0] > 0 || priceRange[1] < maxPrice}>
                Precio
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              </Chip>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-4">
              <Label className="font-semibold mb-3 block text-sm">Rango de precio</Label>
              <Slider
                min={0}
                max={maxPrice}
                step={50000}
                value={priceRange}
                onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>${priceRange[0].toLocaleString("es-CO")}</span>
                <span>${priceRange[1].toLocaleString("es-CO")}</span>
              </div>
            </PopoverContent>
          </Popover>

          <Chip active={search.oferta === "1"} onClick={() => updateSearch({ oferta: search.oferta === "1" ? undefined : "1" })}>
            <Tag className="h-3.5 w-3.5 mr-1" /> Ofertas
          </Chip>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                updateSearch({ marca: undefined, oferta: undefined });
                setPriceRange([0, maxPrice]);
              }}
              className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-muted aspect-[3/4] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-muted/40 border rounded-xl p-12 text-center text-muted-foreground">
          No encontramos productos con esos filtros.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {filtered.length} producto{filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}
            {search.q && ` para "${search.q}"`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );
}

const Chip = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }>(
  ({ active, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "shrink-0 inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border hover:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
Chip.displayName = "Chip";
