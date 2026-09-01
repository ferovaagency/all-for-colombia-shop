import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public read-only server functions used by route loaders so the SSR HTML
// includes real content (crucial for search engines and LLM crawlers that
// don't execute JS or bail before the client hydrates).
//
// Uses the service-role client purely for reads and returns only public,
// non-sensitive fields.

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // El home necesita el árbol completo de categorías (para agrupar por
    // subcategoría en el grid dinámico) y suficientes productos para el
    // catálogo con "Ver más".
    const [cats, prods, brs, blog] = await Promise.all([
      supabaseAdmin.from("categories").select("*").order("sort_order"),
      supabaseAdmin
        .from("products")
        .select(
          "id,slug,name,price,sale_price,sku,images,stock,category_id,brand_id,featured,updated_at",
        )
        .eq("active", true)
        .order("updated_at", { ascending: false })
        .limit(60),
      supabaseAdmin
        .from("brands")
        .select("id,slug,name,logo,logo_url,show_in_home,display_order")
        .eq("show_in_home", true)
        .order("display_order", { ascending: true })
        .limit(20),
      supabaseAdmin
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image, category, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    return {
      categories: cats.data ?? [],
      products: (prods.data ?? []).map((product) => ({
        ...product,
        images: product.images?.slice(0, 1) ?? [],
      })),
      brands: brs.data ?? [],
      posts: blog.data ?? [],
    };
  } catch (e) {
    console.error("getHomeData failed:", e);
    return { categories: [], products: [], brands: [], posts: [] };
  }
});

export const getShopData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [p, c, b] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select(
          "id,slug,name,price,sale_price,sku,images,stock,category_id,created_at,categories(slug,name),brands(slug,name)",
        )
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("categories")
        .select("id,slug,name,parent_id,sort_order")
        .order("sort_order"),
      supabaseAdmin.from("brands").select("id,slug,name").order("name"),
    ]);
    return {
      products: (p.data ?? []).map((product) => ({
        ...product,
        images: product.images?.slice(0, 1) ?? [],
      })),
      categories: c.data ?? [],
      brands: b.data ?? [],
    };
  } catch (e) {
    console.error("getShopData failed:", e);
    return { products: [], categories: [], brands: [] };
  }
});

export const getCategoriesData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("categories_with_products" as any)
      .select("*")
      .order("sort_order");
    return { categories: (data as any[]) ?? [] };
  } catch (e) {
    console.error("getCategoriesData failed:", e);
    return { categories: [] as any[] };
  }
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("*, categories(id,slug,name,parent_id), brands(slug,name)")
        .eq("slug", data.slug)
        .eq("active", true)
        .maybeSingle();
      return { product: product ?? null };
    } catch (e) {
      console.error("getProductBySlug failed:", e);
      return { product: null };
    }
  });
