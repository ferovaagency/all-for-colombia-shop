DROP POLICY IF EXISTS "public_all_blog" ON public.blog_posts;
DROP POLICY IF EXISTS "public_all_blogs" ON public.blogs;
DROP POLICY IF EXISTS "public_all_brands" ON public.brands;
DROP POLICY IF EXISTS "public_all_categories" ON public.categories;
DROP POLICY IF EXISTS "public_all_product_reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "public_all_products" ON public.products;

REVOKE INSERT, UPDATE, DELETE ON public.blog_posts, public.blogs, public.brands, public.categories, public.product_reviews, public.products FROM anon;

DROP POLICY IF EXISTS "Anyone can upload payment receipts" ON storage.objects;
CREATE POLICY "Guests can upload uniquely named payment receipts"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9]{1,10}$'
);