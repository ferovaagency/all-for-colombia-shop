import { supabase } from '@/integrations/supabase/client';

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number | null;
  image: string | null;
  description: string | null;
  product_count: number;
}

export async function getVisibleCategories(): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from('categories_with_products' as any)
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false });
  if (error) {
    console.error('Error cargando categorías:', error);
    return [];
  }
  return (data || []) as unknown as CategoryWithCount[];
}

export async function getVisibleParentCategories(): Promise<CategoryWithCount[]> {
  const all = await getVisibleCategories();
  return all.filter((c) => !c.parent_id);
}
