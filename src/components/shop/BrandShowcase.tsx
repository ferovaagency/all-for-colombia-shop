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

/**
 * Bandas dedicadas a marcas, alternando fondo negro y blanco.
 * Cada banda muestra el logo, un claim y fotos reales de producto.
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
        items: products.filter((p) => p.brand_id === b.id && p.images?.[0]).slice(0, 4),
      }))
      .filter((x) => x.items.length >= 2)
      .slice(0, max);
  }, [brands, products, max]);

  if (bands.length === 0) return null;

  return (
    <>
      {bands.map(({ brand, items }, i) => (
        <BrandBand key={brand.id} brand={brand} items={items} dark={i % 2 === 0} />
      ))}
    </>
  );
}

function BrandBand({ brand, items, dark }: { brand: Brand; items: Product[]; dark: boolean }) {
  const logo = brand.logo_url || brand.logo;
  const isLogitech = brand.slug === "logitech";

  return (
    <section className={cn(dark ? "bg-neutral-950 text-white" : "bg-white text-neutral-950")}>
      <div className="container mx-auto px-6 lg:px-10 py-12 md:py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {logo ? (
              <img
                src={logo}
                alt={brand.name}
                loading="lazy"
                className={cn("h-8 md:h-10 w-auto object-contain", dark && "brightness-0 invert")}
              />
            ) : (
              <span style={SPACE} className="text-2xl font-bold">
                {brand.name}
              </span>
            )}
            <div className={cn("h-8 w-px", dark ? "bg-white/20" : "bg-neutral-200")} />
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
