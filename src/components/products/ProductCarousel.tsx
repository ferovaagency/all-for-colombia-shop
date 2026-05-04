import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  sale_price: number | null;
  images: string[] | null;
  brand: string | null;
}

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  productId: string;
  categoryId?: string | null;
  parentCategoryId?: string | null;
  mode: 'related' | 'complementary';
  minItems?: number;
  maxItems?: number;
}

const formatCOP = (n: number | null) =>
  n == null ? '' : new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n);

const FALLBACK_IMG = '/placeholder.svg';

export function ProductCarousel({
  title, subtitle, productId, categoryId, parentCategoryId,
  mode, minItems = 4, maxItems = 8,
}: ProductCarouselProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('products')
          .select('id, slug, name, price, sale_price, images, brand, category_id, categories!inner(id, parent_id)')
          .neq('id', productId)
          .eq('active', true)
          .limit(maxItems);

        if (mode === 'related' && categoryId) {
          query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        let result = (data || []) as any[];

        if (mode === 'complementary' && parentCategoryId) {
          result = result.filter((p: any) =>
            p.categories?.parent_id && p.categories.parent_id !== parentCategoryId
          ).slice(0, maxItems);

          if (result.length < minItems) {
            const { data: fallback } = await supabase
              .from('products')
              .select('id, slug, name, price, sale_price, images, brand, category_id, categories!inner(id, parent_id)')
              .neq('id', productId)
              .eq('active', true)
              .limit(maxItems * 2);
            const filtered = (fallback || []).filter((p: any) =>
              p.categories?.parent_id !== parentCategoryId
            ).slice(0, maxItems);
            if (filtered.length > result.length) result = filtered;
          }
        }

        if (mode === 'related' && result.length < minItems && parentCategoryId) {
          const { data: fallback } = await supabase
            .from('products')
            .select('id, slug, name, price, sale_price, images, brand, category_id, categories!inner(id, parent_id)')
            .neq('id', productId)
            .eq('active', true)
            .eq('categories.parent_id', parentCategoryId)
            .limit(maxItems);
          if ((fallback?.length || 0) > result.length) result = fallback as any[];
        }

        setItems(result.slice(0, maxItems));
      } catch (e) {
        console.error('Error cargando carrusel:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, categoryId, parentCategoryId, mode, minItems, maxItems]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollerRef.current) return;
    const amount = scrollerRef.current.clientWidth * 0.8;
    scrollerRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="py-8">
        <div className="h-8 w-64 bg-muted animate-pulse rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded-lg h-72" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length < minItems) return null;

  return (
    <section className="py-10 border-t">
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="hidden md:flex gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={() => scroll('left')} aria-label="Anterior">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => scroll('right')} aria-label="Siguiente">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {items.map((p) => {
          const img = (p.images && p.images[0]) || FALLBACK_IMG;
          const finalPrice = p.sale_price || p.price;
          return (
            <Link
              key={p.id}
              to="/producto/$slug"
              params={{ slug: p.slug }}
              className="group snap-start shrink-0 w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)] rounded-lg border bg-card hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="aspect-square bg-white overflow-hidden flex items-center justify-center p-4">
                <img
                  src={img}
                  alt={p.name}
                  loading="lazy"
                  className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG; }}
                />
              </div>
              <div className="p-4">
                {p.brand && <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{p.brand}</p>}
                <h3 className="font-medium text-sm line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-primary">
                  {p.name}
                </h3>
                <p className="font-bold text-base text-primary">{formatCOP(finalPrice)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
