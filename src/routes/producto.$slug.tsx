import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart, formatCOP, whatsappUrl } from "@/lib/cart";
import {
  ShoppingCart,
  ArrowLeft,
  Package,
  Truck,
  ShieldCheck,
  Mail,
  Landmark,
  Smartphone,
  KeyRound,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductCard } from "@/components/shop/ProductCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/producto/$slug")({
  component: ProductDetailPage,
});

type DBProduct = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  sale_price: number | null;
  sku: string | null;
  images: string[] | null;
  stock: number | null;
  category_id: string | null;
  short_description: string | null;
  description: string | null;
  specs: Record<string, unknown> | null;
  brands?: { slug: string; name: string } | null;
  categories?: { slug: string; name: string } | null;
};

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [showRequest, setShowRequest] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");

  // Complementary (2) and related (4) products
  const [complements, setComplements] = useState<DBProduct[]>([]);
  const [related, setRelated] = useState<DBProduct[]>([]);
  const [complementSel, setComplementSel] = useState<Record<string, boolean>>({});

  // Sticky bar visibility
  const buyBoxRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    setLoading(true);
    setComplements([]);
    setRelated([]);
    setComplementSel({});
    setImageIdx(0);
    setQty(1);
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(slug,name), brands(slug,name)")
        .eq("slug", slug)
        .maybeSingle();
      setProduct(data as DBProduct | null);
      setLoading(false);
    })();
  }, [slug]);

  // Load complements + related when product (and its category) is known
  useEffect(() => {
    if (!product?.category_id) return;
    (async () => {
      const [complementsRes, relatedRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("category_id", product.category_id!)
          .eq("active", true)
          .neq("id", product.id)
          .limit(2),
        supabase
          .from("products")
          .select("*")
          .eq("category_id", product.category_id!)
          .eq("active", true)
          .neq("id", product.id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      setComplements((complementsRes.data as DBProduct[] | null) ?? []);
      setRelated((relatedRes.data as DBProduct[] | null) ?? []);
    })();
  }, [product?.id, product?.category_id]);

  // IntersectionObserver for sticky bar
  useEffect(() => {
    const node = buyBoxRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { rootMargin: "0px 0px -20px 0px", threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [product?.id, loading]);

  const finalPrice = product?.sale_price ?? product?.price ?? 0;
  const hasDiscount = !!(
    product?.sale_price &&
    product?.price &&
    product.sale_price < product.price
  );
  const inStock = (product?.stock ?? 0) > 0;
  const images = useMemo(() => product?.images ?? [], [product?.images]);

  if (loading) {
    return <div className="container mx-auto px-4 py-12">Cargando...</div>;
  }
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Producto no encontrado</h1>
        <p className="text-muted-foreground mb-6">El producto que buscas no existe.</p>
        <Button asChild>
          <Link to="/tienda">Ver tienda</Link>
        </Button>
      </div>
    );
  }

  const handleAdd = () => {
    add(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: finalPrice,
        image: images[0],
        sku: product.sku ?? undefined,
      },
      qty,
    );

    // Also add selected complements (qty 1 each)
    let extras = 0;
    complements.forEach((c) => {
      if (complementSel[c.id]) {
        add({
          id: c.id,
          slug: c.slug,
          name: c.name,
          price: c.sale_price ?? c.price ?? 0,
          image: c.images?.[0],
          sku: c.sku ?? undefined,
        });
        extras += 1;
      }
    });

    if (extras > 0) {
      toast.success(`${product.name} y ${extras} producto${extras === 1 ? "" : "s"} más al carrito`);
    } else {
      toast.success(`${product.name} agregado al carrito`);
    }
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
      setReqName("");
      setReqEmail("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      <button
        onClick={() => navigate({ to: "/tienda" })}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver a la tienda
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-muted rounded-xl overflow-hidden border">
            {images[imageIdx] ? (
              <img src={images[imageIdx]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sin imagen</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={cn(
                    "h-20 w-20 rounded-lg overflow-hidden border-2",
                    i === imageIdx ? "border-secondary" : "border-transparent",
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info + buy box */}
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
                <span className="text-xl line-through text-muted-foreground">
                  {formatCOP(product.price ?? 0)}
                </span>
                <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
                  OFERTA
                </span>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="text-muted-foreground mb-6">{product.short_description}</p>
          )}

          {/* Buy box (observed by IntersectionObserver) */}
          <div ref={buyBoxRef}>
            {inStock ? (
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <Label htmlFor="qty">Cantidad:</Label>
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    max={product.stock ?? undefined}
                    value={qty}
                    onChange={(e) =>
                      setQty(
                        Math.max(
                          1,
                          Math.min(product.stock ?? 9999, Number(e.target.value) || 1),
                        ),
                      )
                    }
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">{product.stock} disponibles</span>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAdd} size="lg" className="flex-1 bg-primary">
                    <ShoppingCart className="h-4 w-4 mr-2" /> Agregar al carrito
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a
                      href={whatsappUrl(`Hola, quiero cotizar: ${product.name}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
                    <Input
                      placeholder="Tu email"
                      type="email"
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                    />
                    <Button onClick={submitRequest} className="w-full bg-primary">
                      Enviar solicitud
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment methods + extras */}
          <div className="rounded-xl border bg-card p-4 mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Métodos de pago aceptados
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <PayBadge icon={<Landmark className="h-3.5 w-3.5" />} label="Bancolombia" />
              <PayBadge icon={<Smartphone className="h-3.5 w-3.5" />} label="Nequi" />
              <PayBadge icon={<Smartphone className="h-3.5 w-3.5" />} label="Daviplata" />
              <PayBadge icon={<KeyRound className="h-3.5 w-3.5" />} label="Bre-b" />
              <PayBadge icon={<CreditCard className="h-3.5 w-3.5" />} label="Wompi" />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">🚚 Envío a toda Colombia</span>
              <span className="inline-flex items-center gap-1">🛡️ Garantía incluida</span>
            </div>
          </div>

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

      {/* Complementary products */}
      {complements.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-1">Completa tu compra</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Agrega estos productos en un solo paso al añadir al carrito.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {complements.map((c) => {
              const cPrice = c.sale_price ?? c.price ?? 0;
              const cImg = c.images?.[0];
              const checked = !!complementSel[c.id];
              return (
                <label
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 p-3 border rounded-xl bg-card cursor-pointer transition-smooth",
                    checked ? "border-secondary ring-2 ring-secondary/20" : "hover:border-secondary/50",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setComplementSel((prev) => ({ ...prev, [c.id]: !!v }))
                    }
                  />
                  <div className="h-16 w-16 shrink-0 rounded-md bg-muted overflow-hidden">
                    {cImg ? (
                      <img src={cImg} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/producto/$slug"
                      params={{ slug: c.slug }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium line-clamp-2 hover:text-secondary"
                    >
                      {c.name}
                    </Link>
                    <p className="text-sm font-bold text-primary mt-1">{formatCOP(cPrice)}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky bottom bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur shadow-elevated transition-transform duration-300",
          showStickyBar ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!showStickyBar}
      >
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-md bg-muted overflow-hidden">
            {images[0] ? (
              <img src={images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                Sin img
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{product.name}</p>
            <p className="text-sm text-primary font-bold">{formatCOP(finalPrice)}</p>
          </div>
          {inStock ? (
            <Button onClick={handleAdd} className="bg-primary shrink-0">
              <ShoppingCart className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Agregar al carrito</span>
            </Button>
          ) : (
            <Button asChild variant="outline" className="shrink-0">
              <a
                href={whatsappUrl(`Hola, quiero cotizar: ${product.name}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cotizar
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Trust({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="text-secondary">{icon}</span>
      {title}
    </div>
  );
}

function PayBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs font-medium px-2.5 py-1 rounded-md border">
      <span className="text-secondary">{icon}</span>
      {label}
    </span>
  );
}
