import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart, formatCOP, whatsappUrl } from "@/lib/cart";
import { ShoppingCart, ArrowLeft, Package, Truck, ShieldCheck, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/producto/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [showRequest, setShowRequest] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(slug,name), brands(slug,name)")
        .eq("slug", slug)
        .maybeSingle();
      setProduct(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="container mx-auto px-4 py-12">Cargando...</div>;
  }
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Producto no encontrado</h1>
        <p className="text-muted-foreground mb-6">El producto que buscas no existe.</p>
        <Button asChild><Link to="/tienda">Ver tienda</Link></Button>
      </div>
    );
  }

  const finalPrice = product.sale_price ?? product.price ?? 0;
  const hasDiscount = product.sale_price && product.price && product.sale_price < product.price;
  const inStock = (product.stock ?? 0) > 0;
  const images = product.images?.length ? product.images : [];

  const handleAdd = () => {
    add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: finalPrice,
      image: images[0],
      sku: product.sku,
    }, qty);
    toast.success(`${product.name} agregado al carrito`);
  };

  const submitRequest = async () => {
    if (!reqName || !reqEmail) {
      toast.error("Completa nombre y email");
      return;
    }
    const { error } = await supabase.from("availability_requests").insert({
      customer_name: reqName,
      customer_email: reqEmail,
      items: [{ product_id: product.id, name: product.name, slug: product.slug }],
    });
    if (error) {
      toast.error("No se pudo enviar la solicitud");
    } else {
      toast.success("Te avisaremos cuando esté disponible");
      setShowRequest(false);
      setReqName(""); setReqEmail("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate({ to: "/tienda" })} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la tienda
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square bg-muted rounded-xl overflow-hidden border">
            {images[imageIdx] ? (
              <img src={images[imageIdx]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sin imagen</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={`h-20 w-20 rounded-lg overflow-hidden border-2 ${i === imageIdx ? "border-secondary" : "border-transparent"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.brands?.name && (
            <p className="text-sm text-secondary font-medium mb-1">{product.brands.name}</p>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
          {product.sku && <p className="text-sm text-muted-foreground mb-4">SKU: {product.sku}</p>}

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-primary">{formatCOP(finalPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-xl line-through text-muted-foreground">{formatCOP(product.price)}</span>
                <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">OFERTA</span>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="text-muted-foreground mb-6">{product.short_description}</p>
          )}

          {inStock ? (
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Label htmlFor="qty">Cantidad:</Label>
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  max={product.stock}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">{product.stock} disponibles</span>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleAdd} size="lg" className="flex-1 bg-primary">
                  <ShoppingCart className="h-4 w-4 mr-2" /> Agregar al carrito
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={whatsappUrl(`Hola, quiero cotizar: ${product.name}`)} target="_blank" rel="noopener noreferrer">
                    Cotizar
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <div className="bg-warning/10 border border-warning/30 text-foreground px-4 py-3 rounded-lg text-sm">
                Producto sin stock. Avísanos para coordinar disponibilidad.
              </div>
              {!showRequest ? (
                <Button onClick={() => setShowRequest(true)} variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" /> Solicitar disponibilidad
                </Button>
              ) : (
                <div className="bg-card border rounded-lg p-4 space-y-3">
                  <Input placeholder="Tu nombre" value={reqName} onChange={(e) => setReqName(e.target.value)} />
                  <Input placeholder="Tu email" type="email" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} />
                  <Button onClick={submitRequest} className="w-full bg-primary">Enviar solicitud</Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            <Trust icon={<Truck className="h-4 w-4" />} title="Envío Colombia" />
            <Trust icon={<ShieldCheck className="h-4 w-4" />} title="Garantía" />
            <Trust icon={<Package className="h-4 w-4" />} title="Empaque seguro" />
          </div>

          {product.description && (
            <div className="mt-8">
              <h2 className="font-semibold mb-2">Descripción</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-muted-foreground">
                {product.description}
              </div>
            </div>
          )}

          {product.specs && typeof product.specs === "object" && Object.keys(product.specs).length > 0 && (
            <div className="mt-8">
              <h2 className="font-semibold mb-3">Especificaciones</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b py-1.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Trust({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="text-secondary">{icon}</span>{title}
    </div>
  );
}
