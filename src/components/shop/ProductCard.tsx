import { Link } from "@tanstack/react-router";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, formatCOP, whatsappUrl } from "@/lib/cart";

type Product = {
  id: string;
  slug: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  sku?: string | null;
  images?: string[] | null;
  stock?: number | null;
};

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const finalPrice = product.sale_price ?? product.price ?? 0;
  const hasDiscount =
    !!product.sale_price && !!product.price && product.sale_price < product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - (product.sale_price as number) / (product.price as number)) * 100)
    : 0;
  const hasStock =
    product.stock !== null && product.stock !== undefined && product.stock > 0;
  const img = product.images?.[0];

  return (
    <article className="group bg-card border rounded-xl overflow-hidden hover:shadow-elevated transition-smooth flex flex-col">
      <Link
        to="/producto/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square bg-muted overflow-hidden"
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Sin imagen
          </div>
        )}
        {hasDiscount && hasStock && (
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
            -{discountPct}%
          </span>
        )}
        {!hasStock && (
          <span className="absolute top-2 left-2 bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded border">
            Agotado
          </span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to="/producto/$slug" params={{ slug: product.slug }} className="block">
          <h3 className="font-semibold line-clamp-2 mb-1 group-hover:text-secondary transition-smooth">
            {product.name}
          </h3>
        </Link>
        {product.sku && <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>}

        <div className="mt-auto">
          {hasStock ? (
            <div className="space-y-2">
              {hasDiscount ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-primary">
                    {formatCOP(product.sale_price as number)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCOP(product.price as number)}
                  </span>
                  <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-semibold">
                    -{discountPct}%
                  </span>
                </div>
              ) : (
                product.price != null && (
                  <p className="text-lg font-bold text-primary">{formatCOP(product.price)}</p>
                )
              )}
              <Button
                size="sm"
                className="w-full bg-primary"
                onClick={() =>
                  add({
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    price: finalPrice,
                    image: img,
                    sku: product.sku ?? undefined,
                  })
                }
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Agregar al carrito
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground italic">
                Consulte disponibilidad y precio
              </p>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <a
                  href={whatsappUrl(
                    `Hola, quisiera cotizar: ${product.name} (SKU: ${product.sku || "N/A"})`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Cotizar por WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
