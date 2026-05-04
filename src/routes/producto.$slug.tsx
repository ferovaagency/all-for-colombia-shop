import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart, formatCOP } from "@/lib/cart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShoppingCart, ChevronRight, Star, ShieldCheck, Package, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/producto/$slug")({
  component: ProductDetailPage,
});

const WHATSAPP_NUMBER = "573218280762";

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
  condition: string | null;
  warranty: string | null;
  meta_title: string | null;
  meta_description: string | null;
  // Editorial Ferova
  afirmacion_inicial: string | null;
  audiencia: Array<{ grupo: string; perfil: string; caso_uso: string }> | null;
  specs_contexto: Array<{ spec: string; valor: string; significado: string }> | null;
  beneficios_reales: Array<{ feature: string; beneficio: string }> | null;
  info_fabricante: string | null;
  por_que_comprar: Array<{ argumento: string; detalle: string }> | null;
  faq: Array<{ pregunta: string; respuesta: string }> | null;
  cierre_estrategico: string | null;
  brands?: { slug: string; name: string } | null;
  categories?: { id: string; slug: string; name: string; parent_id: string | null } | null;
};

type Review = {
  id: string;
  nombre_completo: string;
  ciudad: string;
  cargo: string;
  rating: number;
  contenido: string;
  pie_nota?: string | null;
};

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);
  const [complements, setComplements] = useState<DBProduct[]>([]);
  const [related, setRelated] = useState<DBProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    setLoading(true);
    setImageIdx(0);
    setComplements([]);
    setRelated([]);
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(id,slug,name,parent_id), brands(slug,name)")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      setProduct(data as DBProduct | null);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!product?.id) return;
    supabase.from('product_reviews').select('*').eq('product_id', product.id).order('created_at', { ascending: true })
      .then(({ data }) => setReviews((data || []) as Review[]));
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    (async () => {
      // Determine parent category
      let parentId = product.categories?.parent_id ?? product.categories?.id ?? null;
      if (!parentId && product.category_id) parentId = product.category_id;

      // Complements: same parent category, different products
      let complementsRes;
      if (parentId) {
        const { data: siblingCats } = await supabase
          .from("categories")
          .select("id")
          .or(`id.eq.${parentId},parent_id.eq.${parentId}`);
        const ids = (siblingCats || []).map((c: { id: string }) => c.id);
        complementsRes = await supabase
          .from("products")
          .select("*")
          .in("category_id", ids.length ? ids : [parentId])
          .eq("active", true)
          .neq("id", product.id)
          .order("updated_at", { ascending: false })
          .limit(4);
      } else {
        complementsRes = { data: [] as DBProduct[] };
      }
      const comps = (complementsRes.data as DBProduct[] | null) ?? [];
      setComplements(comps);

      // Related: same exact category, exclude already shown
      if (product.category_id) {
        const excludeIds = [product.id, ...comps.map((c) => c.id)];
        const { data: rel } = await supabase
          .from("products")
          .select("*")
          .eq("category_id", product.category_id)
          .eq("active", true)
          .not("id", "in", `(${excludeIds.join(",")})`)
          .order("updated_at", { ascending: false })
          .limit(4);
        setRelated((rel as DBProduct[] | null) ?? []);
      }
    })();
  }, [product?.id]);

  // Update document head with meta tags
  useEffect(() => {
    if (!product) return;
    const title = product.meta_title || `${product.name} | All For All`;
    const desc = product.meta_description || product.short_description || "";
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, [product?.id]);

  const finalPrice = product?.sale_price ?? product?.price ?? 0;
  const hasDiscount = !!(product?.sale_price && product?.price && product.sale_price < product.price);
  const inStock = (product?.stock ?? 0) > 0;
  const images = useMemo(() => product?.images ?? [], [product?.images]);

  const productUrl = typeof window !== "undefined" ? window.location.href : "";
  const whatsappLink = product
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola, me interesa el producto ${product.name}: ${productUrl}`)}`
    : "#";

  if (loading) return <div className="container mx-auto px-4 py-12">Cargando...</div>;
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Producto no encontrado</h1>
        <p className="text-muted-foreground mb-6">El producto que buscas no existe o no está disponible.</p>
        <Button asChild>
          <Link to="/tienda">Volver a la tienda</Link>
        </Button>
      </div>
    );
  }

  const handleAdd = () => {
    add({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: finalPrice,
      image: images[0],
      sku: product.sku ?? undefined,
    });
    toast.success(`${product.name} agregado al carrito`);
  };

  const specsEntries = product.specs && typeof product.specs === "object"
    ? Object.entries(product.specs as Record<string, unknown>)
    : [];

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.short_description || product.description || "",
    sku: product.sku || undefined,
    image: images,
    brand: product.brands?.name ? { "@type": "Brand", name: product.brands.name } : undefined,
    offers: {
      "@type": "Offer",
      price: finalPrice,
      priceCurrency: "COP",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: productUrl,
    },
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link to="/" className="hover:text-foreground">Inicio</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/tienda" className="hover:text-foreground">Tienda</Link>
        {product.categories?.name && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link
              to="/tienda"
              search={{ category: product.categories.slug } as never}
              className="hover:text-foreground"
            >
              {product.categories.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-muted rounded-xl overflow-hidden border">
            {images[imageIdx] ? (
              <img src={images[imageIdx]} alt={product.name} className="w-full h-full object-cover" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.endsWith('/placeholder.svg')) t.src = '/placeholder.svg'; }} />
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
                    i === imageIdx ? "border-primary" : "border-transparent",
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { const t = e.target as HTMLImageElement; if (!t.src.endsWith('/placeholder.svg')) t.src = '/placeholder.svg'; }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200">
              <Package className="h-3 w-3" /> {product.condition || "Nuevo"}
            </span>
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">
              <ShieldCheck className="h-3 w-3" /> {product.warranty || "12 meses con fabricante"}
            </span>
          </div>

          {product.brands?.name && (
            <p className="text-sm text-muted-foreground font-medium mb-1">{product.brands.name}</p>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{product.name}</h1>

          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "h-4 w-4",
                      s <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({reviews.length} reseñas)</span>
            </div>
          )}

          <div className="flex items-baseline gap-3 mb-4 flex-wrap">
            <span className="text-3xl font-bold text-primary">{formatCOP(finalPrice)}</span>
            {hasDiscount && (
              <>
                <span className="text-xl line-through text-muted-foreground">{formatCOP(product.price ?? 0)}</span>
                <span className="bg-destructive/10 text-destructive text-sm font-bold px-2 py-1 rounded">
                  -{Math.round((1 - (product.sale_price as number) / (product.price as number)) * 100)}%
                </span>
              </>
            )}
          </div>

          {product.short_description && (
            <p className="text-muted-foreground mb-4">{product.short_description}</p>
          )}

          {inStock ? (
            <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              <Clock className="h-3 w-3" /> Solo quedan {product.stock} unidades
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              Sin stock inmediato
            </div>
          )}

          <div className="flex items-start gap-2 bg-muted/50 border border-border rounded-lg p-3 mb-5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>Solicita disponibilidad, confirmamos en 48h hábiles.</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button onClick={handleAdd} size="lg" className="flex-1 bg-primary">
              <ShoppingCart className="h-4 w-4 mr-2" /> Agregar al carrito
            </Button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-8 rounded-md font-medium text-white shadow transition-colors"
              style={{ backgroundColor: "#25D366" }}
            >
              <MessageCircle className="h-4 w-4" /> Consultar por WhatsApp
            </a>
          </div>

          {specsEntries.length > 0 && (
            <div className="bg-muted/40 border rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Características destacadas
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {specsEntries.slice(0, 4).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <section className="mt-14">
        <Tabs defaultValue="description">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="description">Descripción</TabsTrigger>
            <TabsTrigger value="specs">Especificaciones</TabsTrigger>
            <TabsTrigger value="reviews">Reseñas</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="pt-6">
            {product.description ? (
              product.description.trim().startsWith("<") ? (
                <div
                  className="product-description max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )
            ) : (
              <p className="text-muted-foreground">Sin descripción disponible.</p>
            )}
          </TabsContent>

          <TabsContent value="specs" className="pt-6">
            {specsEntries.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {specsEntries.map(([k, v], i) => (
                      <tr key={k} className={i % 2 === 0 ? "bg-muted/30" : "bg-background"}>
                        <td className="px-4 py-2.5 font-medium text-muted-foreground w-1/3">{k}</td>
                        <td className="px-4 py-2.5">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No hay especificaciones registradas.</p>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="pt-6">
            {reviews.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <Star className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold mb-1">Sé el primero en reseñar</p>
                <p className="text-sm text-muted-foreground">Comparte tu experiencia con este producto.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {rev.nombre_completo.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{rev.nombre_completo}</p>
                        <p className="text-xs text-muted-foreground">{rev.cargo} · {rev.ciudad}</p>
                      </div>
                    </div>
                    <div className="flex mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-3.5 w-3.5",
                            s <= rev.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{rev.contenido}</p>
                    {rev.pie_nota && <p className="text-[10px] text-muted-foreground italic mt-2">{rev.pie_nota}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Complements */}
      {complements.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6">Productos que complementan este producto</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {complements.map((c) => <ProductCard key={c.id} product={c} />)}
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
