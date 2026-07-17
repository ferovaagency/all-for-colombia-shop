import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Category = { id: string; slug: string; name: string; image?: string | null };

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

  const smallTiles = useMemo(() => {
    if (!active) return [];
    const rest = cats.filter((_, i) => i !== activeIdx);
    return rest.slice(0, 4);
  }, [cats, activeIdx, active]);

  if (!active) return null;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Categorías</h2>
          <p className="text-muted-foreground">Explora por tipo de producto</p>
        </div>
        <Link to="/categorias" className="text-secondary text-sm font-medium hover:underline">
          Ver todas
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl overflow-hidden bg-primary p-3">
        <Tile cat={active} image={getImage(active)} large />
        <div className="grid grid-cols-2 gap-3">
          {smallTiles.map((cat) => (
            <Tile key={cat.id} cat={cat} image={getImage(cat)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Tile({ cat, image, large }: { cat: Category; image: string; large?: boolean }) {
  return (
    <Link
      to="/tienda"
      search={{ categoria: cat.slug } as any}
      className={cn(
        "group relative block overflow-hidden rounded-xl",
        large ? "aspect-[4/3] md:aspect-auto md:h-full min-h-[280px]" : "aspect-square",
      )}
    >
      <img
        src={image}
        alt={cat.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        onError={(e) => {
          const t = e.target as HTMLImageElement;
          if (!t.src.endsWith("/placeholder.svg")) t.src = "/placeholder.svg";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 text-white">
        <h3 className={cn("font-bold leading-tight", large ? "text-xl md:text-2xl" : "text-sm")}>{cat.name}</h3>
      </div>
    </Link>
  );
}
