import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCOP, useCart } from "@/lib/cart";
import { trackAddToCart } from "@/lib/analytics";
import { OfferCountdownBadge } from "@/components/shop/OfferCountdown";
import { cn } from "@/lib/utils";

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };
const PAGE_SIZE = 8; // 2 filas de 4

type Product = {
  id: string;
  slug: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  sku?: string | null;
  images?: string[] | null;
  stock?: number | null;
  category_id?: string | null;
};

/**
 * Catálogo del home al estilo Samsung: tarjetas anchas, 4 por vista y un
 * "Ver más" que expande en el sitio sin sacar al usuario del home.
 */
export function HomeCatalog({
  products,
  categories,
  title = "Catálogo",
  eyebrow = "Lo más vendido",
}: {
  products: Product[];
  categories: any[];
  title?: string;
  eyebrow?: string;
}) {
  const [tab, setTab] = useState<string>("todos");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const parentCats = useMemo(
    () => categories.filter((c: any) => !c.parent_id).slice(0, 5),
    [categories],
  );

  const descendantIds = (catId: string) => {
    const ids = new Set<string>([catId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of categories) {
        if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) {
          ids.add(c.id);
          grew = true;
        }
      }
    }
    return ids;
  };

  const filtered = useMemo(() => {
    if (tab === "todos") return products;
    const cat = parentCats.find((c: any) => c.slug === tab);
    if (!cat) return products;
    const ids = descendantIds(cat.id);
    return products.filter((p) => p.category_id && ids.has(p.category_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categories, tab, parentCats]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  const selectTab = (key: string) => {
    setTab(key);
    setVisible(PAGE_SIZE);
  };

  if (products.length === 0) return null;

  return (
    <section className="bg-[#f5f5f7]">
      <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
        <div className="text-center">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-500">
            {eyebrow}
          </span>
          <h2
            style={SPACE}
            className="mt-2 text-3xl md:text-5xl font-bold tracking-[-0.03em] text-neutral-950"
          >
            {title}
          </h2>
        </div>

        {parentCats.length > 0 && (
          <div className="mt-6 md:mt-8 flex justify-center">
            <div className="flex items-center gap-1 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ slug: "todos", name: "Todos" }, ...parentCats].map((c: any) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => selectTab(c.slug)}
                  className={cn(
                    "shrink-0 px-4 md:px-5 py-2 text-sm md:text-base whitespace-nowrap border-b-2 transition-colors",
                    tab === c.slug
                      ? "border-neutral-950 text-neutral-950 font-bold"
                      : "border-transparent text-neutral-500 hover:text-neutral-900",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {shown.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, delay: (i % 4) * 0.05 }}
            >
              <WideProductCard product={p} />
            </motion.div>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="text-center text-neutral-500 py-10">
            No hay productos en esta categoría por ahora.
          </p>
        )}

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 hover:border-neutral-950 hover:shadow-sm transition-all"
            >
              Ver más <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** Tarjeta ancha estilo Samsung: imagen grande, precio y CTA directo. */
export function WideProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const img = product.images?.[0];
  const price = product.price ?? null;
  const sale = product.sale_price ?? null;
  const hasDiscount = !!sale && !!price && sale < price;
  const finalPrice = sale ?? price ?? 0;
  const discountPct = hasDiscount
    ? Math.round((1 - (sale as number) / (price as number)) * 100)
    : 0;
  const inStock = product.stock == null || product.stock > 0;

  return (
    <article className="group relative h-full bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col hover:shadow-lg hover:border-neutral-300 transition-all">
      {hasDiscount && (
        <span className="absolute z-10 m-3 rounded-full bg-neutral-950 text-white text-[10px] font-bold px-2.5 py-1">
          −{discountPct}%
        </span>
      )}

      <Link
        to="/producto/$slug"
        params={{ slug: product.slug }}
        className="block bg-[#fafafa] aspect-[4/3] relative overflow-hidden"
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain p-5 group-hover:scale-[1.04] transition-transform duration-500"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
            Sin imagen
          </div>
        )}
      </Link>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <Link to="/producto/$slug" params={{ slug: product.slug }}>
          <h3
            style={SPACE}
            className="font-bold text-base leading-snug text-neutral-950 line-clamp-2 min-h-[2.75rem] group-hover:underline"
          >
            {product.name}
          </h3>
        </Link>
        {product.sku && <p className="text-[11px] text-neutral-400 mt-1">SKU: {product.sku}</p>}

        <div className="mt-auto pt-4">
          {inStock && finalPrice > 0 ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-bold text-neutral-950">{formatCOP(finalPrice)}</span>
                {hasDiscount && (
                  <span className="text-sm text-neutral-400 line-through">
                    {formatCOP(price as number)}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-semibold text-destructive uppercase tracking-wide">
                    Termina en
                  </span>
                  <OfferCountdownBadge />
                </div>
              )}
              <p className="text-xs text-neutral-500 mt-0.5">
                Desde {formatCOP(Math.round(finalPrice / 12))} en 12 cuotas
              </p>
              <Button
                className="w-full mt-3 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-semibold"
                onClick={() => {
                  add({
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    price: finalPrice,
                    image: img,
                    sku: product.sku ?? undefined,
                  });
                  trackAddToCart({
                    item_id: product.sku || product.id,
                    item_name: product.name,
                    price: finalPrice,
                    quantity: 1,
                  });
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                Agregar al carrito
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/producto/$slug" params={{ slug: product.slug }}>
                Consultar disponibilidad
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
