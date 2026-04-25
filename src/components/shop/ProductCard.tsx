import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
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
  const hasDiscount = product.sale_price && product.price && product.sale_price < product.price;
  const img = product.images?.[0];

  return (
    <article className="group bg-card border rounded-xl overflow-hidden hover:shadow-elevated transition-smooth flex flex-col">
      <Link to="/producto/$slug" params={{ slug: product.slug }} className="relative block aspect-square bg-muted overflow-hidden">
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
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
            OFERTA
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
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-primary">{formatCOP(finalPrice)}</span>
            {hasDiscount && (
              <span className="text-sm line-through text-muted-foreground">{formatCOP(product.price!)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-primary"
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
              Agregar
            </Button>
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a
                href={whatsappUrl(`Hola, quiero cotizar: ${product.name} (${product.slug})`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cotizar
              </a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
