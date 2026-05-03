
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "product_images_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "product_images_public_update" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
CREATE POLICY "product_images_public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

ALTER TABLE products
ADD COLUMN IF NOT EXISTS condition text DEFAULT 'Nuevo',
ADD COLUMN IF NOT EXISTS warranty text DEFAULT '12 meses con fabricante',
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS specs jsonb,
ADD COLUMN IF NOT EXISTS brand_id uuid,
ADD COLUMN IF NOT EXISTS category_id uuid,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
