import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { formatCOP } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

type Product = {
  id: string;
  slug: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  images?: string[] | null;
  brand_id?: string | null;
};

type Brand = {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  logo_url?: string | null;
};

// Marcas que queremos destacar primero (Logitech, MSI y gaming).
const PRIORITY_BRANDS = ["logitech", "msi"];
const priorityRank = (slug: string) => {
  const i = PRIORITY_BRANDS.indexOf(slug);
  return i === -1 ? PRIORITY_BRANDS.length : i;
};

const hasOffer = (p: Product) =>
  p.sale_price != null && p.price != null && (p.sale_price as number) < (p.price as number);

/**
 * Bandas dedicadas a marcas, alternando fondo negro y blanco.
 * Logitech y MSI se muestran primero y, dentro de cada marca, los productos
 * en oferta van al frente. Al final se agrega una banda "Ofertas" con todos
 * los descuentos activos.
 */
export function BrandShowcase({
  brands,
  products,
  max = 4,
}: {
  brands: Brand[];
  products: Product[];
  max?: number;
}) {
  const bands = useMemo(() => {
    return brands
      .map((b) => ({
        brand: b,
        // Dentro de cada marca: primero las ofertas, luego el resto.
        items: products
          .filter((p) => p.brand_id === b.id && p.images?.[0])
          .sort((a, c) => Number(hasOffer(c)) - Number(hasOffer(a)))
          .slice(0, 4),
      }))
      .filter((x) => x.items.length >= 2)
      .sort((a, c) => priorityRank(a.brand.slug) - priorityRank(c.brand.slug))
      .slice(0, max);
  }, [brands, products, max]);

  // Banda de Ofertas: todos los productos con descuento activo, sin importar marca.
  const offers = useMemo(
    () => products.filter((p) => hasOffer(p) && p.images?.[0]).slice(0, 4),
    [products],
  );

  if (bands.length === 0 && offers.length < 2) return null;

  return (
    <>
      {bands.map(({ brand, items }, i) => (
        <BrandBand key={brand.id} brand={brand} items={items} dark={i % 2 === 0} />
      ))}
      {offers.length >= 2 && <OffersBand items={offers} dark={bands.length % 2 === 0} />}
    </>
  );
}

function OffersBand({ items, dark }: { items: Product[]; dark: boolean }) {
  return (
    <section className={cn(dark ? "bg-neutral-950 text-white" : "bg-white text-neutral-950")}>
      <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5">
              Ofertas
            </span>
            <p
              style={SPACE}
              className="text-xl md:text-3xl font-bold tracking-[-0.03em] leading-none"
            >
              Los mejores descuentos
            </p>
          </div>

          <Link
            to="/tienda"
            search={{ oferta: "1" } as any}
            className={cn(
              "group inline-flex items-center gap-2 text-sm font-bold whitespace-nowrap",
              dark ? "text-white hover:text-white/80" : "text-neutral-950 hover:text-neutral-600",
            )}
          >
            Ver todas las ofertas
            <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((p, i) => {
            const price = p.price as number;
            const sale = p.sale_price as number;
            const pct = Math.round((1 - sale / price) * 100);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
              >
                <Link
                  to="/producto/$slug"
                  params={{ slug: p.slug }}
                  className={cn(
                    "group block rounded-2xl overflow-hidden h-full transition-all hover:-translate-y-1",
                    dark
                      ? "bg-white/[0.04] border border-white/10 hover:border-white/25"
                      : "bg-[#f5f5f7] border border-transparent hover:border-neutral-300",
                  )}
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <span className="absolute top-3 left-3 z-10 rounded-full bg-red-600 text-white text-[10px] font-bold px-2.5 py-1">
                      −{pct}%
                    </span>
                    <img
                      src={p.images![0]}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-contain p-5 group-hover:scale-[1.06] transition-transform duration-500"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2">{p.name}</h3>
                    <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                      <span className={cn("font-bold", dark ? "text-white" : "text-neutral-950")}>
                        {formatCOP(sale)}
                      </span>
                      <span
                        className={cn(
                          "text-xs line-through",
                          dark ? "text-white/40" : "text-neutral-400",
                        )}
                      >
                        {formatCOP(price)}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BrandBand({ brand, items, dark }: { brand: Brand; items: Product[]; dark: boolean }) {
  
  const isLogitech = brand.slug === "logitech";

  return (
    <section className={cn(dark ? "bg-neutral-950 text-white" : "bg-white text-neutral-950")}>
      <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <p
              style={SPACE}
              className="text-xl md:text-3xl font-bold tracking-[-0.03em] leading-none"
            >
              Lo mejor de {brand.name}
            </p>
          </div>

          <Link
            to={isLogitech ? "/marcas/logitech" : "/tienda"}
            search={isLogitech ? undefined : ({ marca: brand.slug } as any)}
            className={cn(
              "group inline-flex items-center gap-2 text-sm font-bold whitespace-nowrap",
              dark ? "text-white hover:text-white/80" : "text-neutral-950 hover:text-neutral-600",
            )}
          >
            Ver todo {brand.name}
            <ArrowUpRight className="h-4 w-4 group-hover:rotate-45 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <Link
                to="/producto/$slug"
                params={{ slug: p.slug }}
                className={cn(
                  "group block rounded-2xl overflow-hidden h-full transition-all hover:-translate-y-1",
                  dark
                    ? "bg-white/[0.04] border border-white/10 hover:border-white/25"
                    : "bg-[#f5f5f7] border border-transparent hover:border-neutral-300",
                )}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={p.images![0]}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-contain p-5 group-hover:scale-[1.06] transition-transform duration-500"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2">{p.name}</h3>
                  {(p.sale_price ?? p.price) != null && (
                    <p
                      className={cn(
                        "mt-1.5 font-bold",
                        dark ? "text-white/90" : "text-neutral-950",
                      )}
                    >
                      {formatCOP((p.sale_price ?? p.price) as number)}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
