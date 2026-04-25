import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart, formatCOP } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/carrito")({
  head: () => ({ meta: [{ title: "Carrito — All For All" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, count } = useCart();

  if (count === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tu carrito está vacío</h1>
        <p className="text-muted-foreground mb-6">Explora nuestro catálogo y agrega productos.</p>
        <Button asChild className="bg-primary"><Link to="/tienda">Ir a la tienda</Link></Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Mi carrito</h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="bg-card border rounded-xl p-4 flex gap-4 items-center">
              <Link to="/producto/$slug" params={{ slug: it.slug }} className="h-20 w-20 bg-muted rounded-lg overflow-hidden shrink-0">
                {it.image ? <img src={it.image} alt={it.name} className="w-full h-full object-cover" /> : null}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to="/producto/$slug" params={{ slug: it.slug }} className="font-semibold line-clamp-2 hover:text-secondary">
                  {it.name}
                </Link>
                {it.sku && <p className="text-xs text-muted-foreground">SKU: {it.sku}</p>}
                <p className="text-sm text-primary font-bold mt-1">{formatCOP(it.price)}</p>
              </div>
              <div className="flex items-center border rounded-md">
                <button onClick={() => setQty(it.id, it.quantity - 1)} className="p-2 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                <Input
                  value={it.quantity}
                  onChange={(e) => setQty(it.id, Number(e.target.value) || 1)}
                  className="w-12 h-8 border-0 text-center p-0"
                />
                <button onClick={() => setQty(it.id, it.quantity + 1)} className="p-2 hover:bg-muted"><Plus className="h-3 w-3" /></button>
              </div>
              <div className="text-right w-28">
                <p className="font-bold">{formatCOP(it.price * it.quantity)}</p>
              </div>
              <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <aside className="bg-card border rounded-xl p-6 h-fit sticky top-20">
          <h2 className="font-semibold text-lg mb-4">Resumen</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({count} items)</span>
              <span className="font-medium">{formatCOP(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Envío</span>
              <span className="text-muted-foreground">Calculado en checkout</span>
            </div>
          </div>
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCOP(subtotal)}</span>
            </div>
          </div>
          <Button asChild size="lg" className="w-full bg-primary">
            <Link to="/checkout">Finalizar compra</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full mt-2">
            <Link to="/tienda">Seguir comprando</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
