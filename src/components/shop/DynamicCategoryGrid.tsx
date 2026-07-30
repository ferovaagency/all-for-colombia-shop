import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Sparkles, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/cart";
import { useCountdown } from "@/components/WeeklyDealCountdown";
import { cn } from "@/lib/utils";

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

type Product = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  sale_price?: number | null;
  images: string[] | null;
  category_id?: string | null;
};

type Deal = {
  id: string;
  discount_percent: number;
  reveal_at: string;
  ends_at: string;
  teaser_images: string[] | null;
  product: { slug: string; name: string; price: number | null; images: string[] | null } | null;
};

type Coupon = {
  id: string;
  code: string;
  headline: string | null;
  discount_percent: number | null;
  image_url: string | null;
  product: { slug: string; name: string; price: number | null; images: string[] | null } | null;
};

const OFERTAS = "__ofertas__";

export function DynamicCategoryGrid({
  categories,
  products,
}: {
  categories: any[];
  products: Product[];
}) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tab, setTab] = useState<string>(OFERTAS);

  useEffect(() => {
    (async () => {
      const [dealRes, couponRes] = await Promise.all([
        supabase
          .from("weekly_deals")
          .select(
            "id, discount_percent, reveal_at, ends_at, teaser_images, product:products(slug, name, price, images)",
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("promo_coupons")
          .select(
            "id, code, headline, discount_percent, image_url, product:products(slug, name, price, images)",
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .limit(4),
      ]);
      setDeal((dealRes.data as unknown as Deal) ?? null);
      // La tabla puede no existir todavía (migración pendiente): degradar sin romper.
      setCoupons(((couponRes.data as unknown as Coupon[]) ?? []).filter((c) => c.product));
    })();
  }, []);

  const parentCats = useMemo(() => categories.filter((c: any) => !c.parent_id), [categories]);

  /** Descendientes de una categoría, para agrupar productos de subcategorías. */
  const productsOf = (catId: string) => {
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
    return products.filter((p) => p.category_id && ids.has(p.category_id));
  };

  // Solo mostramos como pestaña las categorías que ya tienen productos.
  const visibleCats = useMemo(
    () => parentCats.filter((c: any) => productsOf(c.id).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentCats, products, categories],
  );

  const tabs = [
    { key: OFERTAS, label: "Ofertas" },
    ...visibleCats.map((c: any) => ({ key: c.slug, label: c.name })),
  ];

  const activeCat = visibleCats.find((c: any) => c.slug === tab);
  const catProducts = activeCat ? productsOf(activeCat.id) : [];

  const hasOfertas = !!deal?.product || coupons.length > 0;
  // Si aún no hay oferta configurada, arranca en la primera categoría.
  useEffect(() => {
    if (!hasOfertas && tab === OFERTAS && visibleCats.length > 0) setTab(visibleCats[0].slug);
  }, [hasOfertas, tab, visibleCats]);

  if (tabs.length <= 1 && !hasOfertas) return null;

  return (
    <section className="bg-white">
      <div className="container mx-auto px-6 lg:px-10 py-10 md:py-14">
        <h2
          style={SPACE}
          className="text-center text-3xl md:text-5xl font-bold tracking-[-0.03em] text-neutral-950"
        >
          Destacados
        </h2>

        {/* ---- Tabs ---- */}
        <div className="mt-6 md:mt-8 flex justify-center">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "shrink-0 px-4 md:px-5 py-2 text-sm md:text-base font-medium whitespace-nowrap border-b-2 transition-colors",
                  tab === t.key
                    ? "border-neutral-950 text-neutral-950 font-bold"
                    : "border-transparent text-neutral-500 hover:text-neutral-900",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Grid ----
             Al cambiar de pestaña sólo animamos la entrada del panel nuevo:
             una salida encadenada con AnimatePresence mode="wait" retrasa el
             cambio sin aportar nada. La `key` reinicia la animación. */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-3 md:gap-4"
        >
          {tab === OFERTAS ? (
            <>
              <WeeklyDealBigCard deal={deal} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {coupons.map((c) => (
                  <CouponCard key={c.id} coupon={c} />
                ))}
                {coupons.length === 0 && <EmptySlot text="Cupones próximamente" />}
              </div>
            </>
          ) : (
            <>
              <CategoryBigCard product={catProducts[0]} catName={activeCat?.name ?? ""} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {catProducts.slice(1, 5).map((p) => (
                  <SmallProductCard key={p.id} product={p} />
                ))}
                {catProducts.length <= 1 && <EmptySlot text="Muy pronto más productos" />}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ============================ CUADRO GRANDE: PRODUCTO DE LA SEMANA ============================ */

function WeeklyDealBigCard({ deal }: { deal: Deal | null }) {
  const revealed = useCountdown(deal?.reveal_at ?? null).done;
  const end = useCountdown(deal?.ends_at ?? null);

  // Fotos "sorpresa": distintas a la ficha, rotan para no revelar el producto.
  const images = useMemo(() => {
    const teaser = (deal?.teaser_images ?? []).filter(Boolean);
    if (teaser.length > 0) return teaser;
    return (deal?.product?.images ?? []).filter(Boolean);
  }, [deal]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);

  if (!deal || !deal.product || end.done) {
    return (
      <div className="rounded-2xl bg-neutral-950 text-white flex flex-col items-center justify-center p-10 min-h-[320px] text-center">
        <Sparkles className="h-10 w-10 text-white/40 mb-4" />
        <p className="text-xl font-bold" style={SPACE}>
          Producto de la Semana
        </p>
        <p className="text-white/60 text-sm mt-2">Muy pronto revelamos la próxima oferta.</p>
      </div>
    );
  }

  const final = deal.product.price
    ? Math.max(0, Math.round(deal.product.price * (1 - deal.discount_percent / 100)))
    : null;

  return (
    <Link
      to="/producto-de-la-semana"
      className="group rounded-2xl bg-neutral-950 text-white overflow-hidden flex flex-col hover:ring-2 hover:ring-neutral-950/20 transition-all"
    >
      {/* Imagen sorpresa — ocupa toda la altura disponible del contenedor */}
      <div className="relative flex-1 min-h-[240px] bg-neutral-900 overflow-hidden">
        {/* Sin mode="wait": las fotos se superponen para lograr un fundido real. */}
        <AnimatePresence>
          {images[idx] ? (
            <motion.img
              key={images[idx]}
              src={images[idx]}
              alt="Producto de la Semana"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-20 w-20 text-white/20" strokeWidth={1} />
            </div>
          )}
        </AnimatePresence>

        <span className="absolute top-4 left-4 rounded-full bg-red-600 text-white text-xs font-bold px-3 py-1.5 shadow-lg">
          −{Math.round(deal.discount_percent)}%
        </span>

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-5 bg-white" : "w-1.5 bg-white/40",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Título + contador debajo */}
      <div className="p-6 md:p-8 flex-1 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
          <Sparkles className="h-3 w-3" /> Producto de la Semana
        </span>
        <h3 style={SPACE} className="mt-3 text-2xl md:text-3xl font-bold tracking-[-0.02em]">
          {revealed ? deal.product.name : "Algo increíble está por revelarse"}
        </h3>

        {revealed && final !== null && (
          <div className="mt-3 flex items-baseline justify-center gap-3 flex-wrap">
            <span className="text-2xl font-bold">{formatCOP(final)}</span>
            {deal.product.price && (
              <span className="text-white/40 line-through text-sm">
                {formatCOP(deal.product.price)}
              </span>
            )}
          </div>
        )}

        <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-white/50">
          {revealed ? "Termina en" : "Se revela en"}
        </p>
        <InlineCountdown target={revealed ? deal.ends_at : deal.reveal_at} />

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-white/90 group-hover:gap-2.5 transition-all">
          Ver la oferta <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function InlineCountdown({ target }: { target: string }) {
  const { days, hours, minutes, seconds } = useCountdown(target);
  const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");
  const cells = [
    { v: days, l: "Días" },
    { v: hours, l: "Hrs" },
    { v: minutes, l: "Min" },
    { v: seconds, l: "Seg" },
  ];
  return (
    <div className="mt-2 flex items-stretch gap-2">
      {cells.map((c) => (
        <div
          key={c.l}
          className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 min-w-[58px] flex flex-col items-center"
        >
          <span className="text-xl md:text-2xl font-bold tabular-nums leading-none">
            {pad(c.v)}
          </span>
          <span className="text-[9px] uppercase tracking-widest mt-1 text-white/60">{c.l}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================ TARJETAS PEQUEÑAS ============================ */

function CouponCard({ coupon }: { coupon: Coupon }) {
  const product = coupon.product!;
  const img = coupon.image_url || product.images?.[0];
  const headline =
    coupon.headline ||
    `${product.name}${coupon.discount_percent ? `, Dto ${Math.round(coupon.discount_percent)}% con ${coupon.code}` : ` con cupón ${coupon.code}`}`;

  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      className="group relative rounded-2xl bg-neutral-950 text-white overflow-hidden block min-h-[220px] aspect-[4/3] hover:ring-2 hover:ring-neutral-950/20 transition-all"
    >
      {/* La foto ocupa todo el contenedor; el texto va encima con degradado. */}
      {img ? (
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Tag className="h-12 w-12 text-white/20" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/45 to-neutral-950/10" />

      <span className="absolute top-4 left-4 z-10 rounded-full bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 inline-flex items-center gap-1">
        <Tag className="h-3 w-3" /> Cupón {coupon.code}
      </span>

      <p className="absolute inset-x-0 bottom-0 z-10 p-4 text-sm font-semibold text-center leading-snug line-clamp-2 drop-shadow">
        {headline}
      </p>
    </Link>
  );
}

function SmallProductCard({ product }: { product: Product }) {
  const img = product.images?.[0];
  const price = product.sale_price ?? product.price;
  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-neutral-200 hover:shadow-lg hover:border-neutral-300 transition-all"
    >
      {/* Imagen completa sobre fondo claro, sin recortes ni oscurecido. */}
      <div className="relative aspect-[4/3] bg-[#fafafa] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
            Sin imagen
          </div>
        )}
      </div>

      {/* Título en franja negra debajo de la imagen. */}
      <div className="bg-neutral-950 text-white p-3 text-center">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{product.name}</p>
        {price != null && <p className="text-sm font-bold mt-1">{formatCOP(price)}</p>}
      </div>
    </Link>
  );
}

function CategoryBigCard({ product, catName }: { product?: Product; catName: string }) {
  if (!product) {
    return (
      <div className="rounded-2xl bg-neutral-950 text-white flex items-center justify-center p-10 min-h-[320px]">
        <p className="text-white/60">Muy pronto productos de {catName}</p>
      </div>
    );
  }
  const img = product.images?.[0];
  const price = product.sale_price ?? product.price;

  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-neutral-200 h-full min-h-[420px] hover:shadow-lg hover:border-neutral-300 transition-all"
    >
      {/* Imagen completa sobre fondo claro, sin recortes ni oscurecido. */}
      <div className="relative flex-1 bg-[#fafafa] overflow-hidden">
        <span className="absolute top-5 left-5 z-10 rounded-full bg-neutral-950 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5">
          {catName}
        </span>
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-contain p-8 group-hover:scale-[1.03] transition-transform duration-700"
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
      </div>

      {/* Título + precio en franja negra debajo de la imagen. */}
      <div className="bg-neutral-950 text-white p-6 md:p-8 flex flex-col items-center text-center">
        <h3 style={SPACE} className="text-2xl md:text-3xl font-bold tracking-[-0.02em]">
          {product.name}
        </h3>
        {price != null && <p className="mt-2 text-xl font-bold">{formatCOP(price)}</p>}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all">
          Ver producto <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function EmptySlot({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 flex items-center justify-center p-6 min-h-[220px] text-sm text-neutral-400 text-center">
      {text}
    </div>
  );
}
