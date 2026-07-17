import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/cart";

type Category = { id: string; slug: string; name: string; image?: string | null };
type Product = {
  id: string;
  slug: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  images?: string[] | null;
};

export function CategoryBento({
  categories,
  getImage,
}: {
  categories: Category[];
  getImage: (cat: Category) => string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const cats = categories.slice(0, 8);
  const active = cats[activeIdx];

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("products")
      .select("id, slug, name, price, sale_price, images")
      .eq("category_id", active.id)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (cancelled) return;
        setProducts(data || []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active?.id]);

  const tabsRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (dir: "left" | "right") => {
    tabsRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  if (!active) return null;

  return (
    <motion.section
      className="container mx-auto px-4 py-16"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Categorías</h2>
          <p className="text-muted-foreground">Explora por tipo de producto</p>
        </div>
        <Link to="/categorias" className="text-secondary text-sm font-medium hover:underline">
          Ver todas
        </Link>
      </div>

      <div className="relative mb-4">
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto pb-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cats.map((cat, i) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors",
                i === activeIdx
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          aria-label="Anterior"
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border bg-background shadow-card items-center justify-center hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollTabs("right")}
          aria-label="Siguiente"
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border bg-background shadow-card items-center justify-center hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl overflow-hidden bg-primary p-3"
        >
          <CategoryHeroTile cat={active} image={getImage(active)} />
          <div className="grid grid-cols-2 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-white/10 animate-pulse" />
                ))
              : products.length > 0
                ? products.map((p) => <ProductTile key={p.id} product={p} />)
                : Array.from({ length: 4 }).map((_, i) => <SeeAllTile key={i} cat={active} />)}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}

function CategoryHeroTile({ cat, image }: { cat: Category; image: string }) {
  return (
    <Link
      to="/tienda"
      search={{ categoria: cat.slug } as any}
      className="group relative block overflow-hidden rounded-xl aspect-[4/3] md:aspect-auto md:h-full min-h-[280px]"
    >
      <img
        src={image}
        alt={cat.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        onError={(e) => {
          const t = e.target as HTMLImageElement;
          if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 text-white">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 mb-1">Categoría</p>
        <h3 className="font-bold text-xl md:text-2xl leading-tight mb-2">{cat.name}</h3>
        <span className="inline-flex items-center text-sm font-semibold underline underline-offset-4">
          Ver productos
        </span>
      </div>
    </Link>
  );
}

function ProductTile({ product }: { product: Product }) {
  const finalPrice = product.sale_price ?? product.price ?? 0;
  const hasDiscount = !!product.sale_price && !!product.price && product.sale_price < product.price;
  const img = product.images?.[0];

  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      className="group relative block overflow-hidden rounded-xl aspect-square bg-white"
    >
      {img ? (
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          Sin imagen
        </div>
      )}
      {hasDiscount && (
        <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
          Oferta
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-sm text-white px-2 py-1.5">
        <p className="text-[11px] font-medium leading-tight line-clamp-1">{product.name}</p>
        <p className="text-xs font-bold">{formatCOP(finalPrice)}</p>
      </div>
    </Link>
  );
}

function SeeAllTile({ cat }: { cat: Category }) {
  return (
    <Link
      to="/tienda"
      search={{ categoria: cat.slug } as any}
      className="flex items-center justify-center rounded-xl aspect-square bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors text-center px-2"
    >
      Ver {cat.name}
    </Link>
  );
}
