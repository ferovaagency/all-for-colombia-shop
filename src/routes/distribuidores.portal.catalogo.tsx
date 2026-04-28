import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCOP, useCart } from "@/lib/cart";
import { toast } from "sonner";
import { ShoppingCart, Package } from "lucide-react";

export const Route = createFileRoute("/distribuidores/portal/catalogo")({
  component: DistributorCatalogPage,
});

type DBProduct = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  distributor_price: number | null;
  sku: string | null;
  images: string[] | null;
  stock: number | null;
  categories?: { name: string } | null;
  brands?: { name: string } | null;
};

function DistributorCatalogPage() {
  const { add } = useCart();
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name), brands(name)")
        .eq("active", true)
        .not("distributor_price", "is", null)
        .order("created_at", { ascending: false });
      setProducts((data as DBProduct[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAdd = (p: DBProduct) => {
    const qty = qtyMap[p.id] || 1;
    add(
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.distributor_price ?? 0,
        image: p.images?.[0],
        sku: p.sku ?? undefined,
      },
      qty,
    );
    toast.success(`${p.name} ×${qty} agregado al pedido`);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Catálogo distribuidor</h2>
          <p className="text-sm text-muted-foreground">Precios mayoristas exclusivos</p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o SKU"
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando catálogo...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No hay productos con precio de distribuidor todavía</p>
          <p className="text-sm text-muted-foreground mt-1">
            Estamos cargando el catálogo. Contáctanos para más información.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const distPrice = p.distributor_price ?? 0;
            const publicPrice = p.price ?? 0;
            const savings = publicPrice - distPrice;
            const img = p.images?.[0];
            const qty = qtyMap[p.id] || 1;
            return (
              <div key={p.id} className="bg-card border rounded-xl overflow-hidden flex flex-col">
                <div className="aspect-square bg-muted">
                  {img ? (
                    <img src={img} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sin imagen</div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  {p.brands?.name && <p className="text-xs text-secondary font-medium">{p.brands.name}</p>}
                  <h3 className="font-semibold line-clamp-2 mb-1">{p.name}</h3>
                  {p.sku && <p className="text-xs text-muted-foreground mb-3">SKU: {p.sku}</p>}

                  <div className="mt-auto space-y-2">
                    {publicPrice > 0 && (
                      <p className="text-xs text-muted-foreground line-through">
                        Público: {formatCOP(publicPrice)}
                      </p>
                    )}
                    <p className="text-xl font-bold text-primary">{formatCOP(distPrice)}</p>
                    {savings > 0 && (
                      <p className="text-xs font-semibold text-green-600">
                        Ahorras {formatCOP(savings)}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) =>
                          setQtyMap((m) => ({ ...m, [p.id]: Math.max(1, Number(e.target.value) || 1) }))
                        }
                        className="w-16 h-9"
                      />
                      <Button onClick={() => handleAdd(p)} size="sm" className="flex-1 bg-primary">
                        <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Agregar al pedido
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
