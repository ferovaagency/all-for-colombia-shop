import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/shop/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
  const [expanded, setExpanded] = useState<string[]>([]);

  const parentCats = useMemo(() => categories.filter((c: any) => !c.parent_id), [categories]);
  const getChildren = (parentId: string) => categories.filter((c: any) => c.parent_id === parentId);

  useEffect(() => {
    (async () => {
      const [p, c, b] = await Promise.all([
        supabase.from("products").select("*, categories(slug,name), brands(slug,name)").eq("active", true),
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("brands").select("*"),
      ]);
      setProducts(p.data || []);
      setCategories(c.data || []);
      setBrands(b.data || []);
      const max = Math.max(...(p.data || []).map((x: any) => Number(x.sale_price ?? x.price ?? 0)), 1000000);
      setMaxPrice(max);
      setPriceRange([0, max]);
      setLoading(false);
    })();
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

  const Filters = (
    <div className="space-y-6">
      <div>
        <Label className="font-semibold mb-3 block">Categorías</Label>
        <div className="space-y-1.5">
          <button
            onClick={() => updateSearch({ categoria: undefined })}
            className={`block text-sm w-full text-left px-2 py-1 rounded ${!search.categoria ? "bg-secondary/10 text-secondary font-medium" : "hover:bg-muted"}`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => updateSearch({ categoria: c.slug })}
              className={`block text-sm w-full text-left px-2 py-1 rounded ${search.categoria === c.slug ? "bg-secondary/10 text-secondary font-medium" : "hover:bg-muted"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <Label className="font-semibold mb-3 block">Marcas</Label>
          <div className="space-y-1.5">
            <button
              onClick={() => updateSearch({ marca: undefined })}
              className={`block text-sm w-full text-left px-2 py-1 rounded ${!search.marca ? "bg-secondary/10 text-secondary font-medium" : "hover:bg-muted"}`}
            >
              Todas
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => updateSearch({ marca: b.slug })}
                className={`block text-sm w-full text-left px-2 py-1 rounded ${search.marca === b.slug ? "bg-secondary/10 text-secondary font-medium" : "hover:bg-muted"}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label className="font-semibold mb-3 block">Precio</Label>
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
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="oferta"
          checked={search.oferta === "1"}
          onCheckedChange={(v) => updateSearch({ oferta: v ? "1" : undefined })}
        />
        <Label htmlFor="oferta" className="cursor-pointer">Solo en oferta</Label>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Tienda</h1>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search.q || ""}
              onChange={(e) => updateSearch({ q: e.target.value || undefined })}
              placeholder="Buscar productos, marcas, SKU..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={search.orden || "recientes"} onValueChange={(v) => updateSearch({ orden: v === "recientes" ? undefined : v })}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recientes">Más recientes</SelectItem>
                <SelectItem value="precio-asc">Precio menor</SelectItem>
                <SelectItem value="precio-desc">Precio mayor</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="mt-6">{Filters}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          {Filters}
        </aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
