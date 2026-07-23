-- =====================================================================
-- 1) Producto de la Semana: imágenes de expectativa ("sorpresa")
--    Fotos distintas a la ficha del producto que rotan en el cuadro
--    grande del grid dinámico del home antes/durante la revelación.
-- =====================================================================
ALTER TABLE public.weekly_deals
  ADD COLUMN IF NOT EXISTS teaser_images text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.weekly_deals.teaser_images IS
  'URLs de fotos de producto alternativas que se muestran en el home. Si está vacío se usan las imágenes del producto.';


-- =====================================================================
-- 2) Cupones de descuento por producto
--    Se muestran en la vista "Ofertas" del grid dinámico del home,
--    usando la imagen del producto (no la ficha completa).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.promo_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  code text NOT NULL,
  headline text,
  discount_percent numeric(5,2) CHECK (discount_percent IS NULL OR (discount_percent > 0 AND discount_percent <= 90)),
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.promo_coupons IS
  'Cupones de descuento asignados a un producto específico, visibles en el grid dinámico del home.';
COMMENT ON COLUMN public.promo_coupons.headline IS
  'Texto de la tarjeta. Si es NULL se arma con el nombre del producto y el descuento.';
COMMENT ON COLUMN public.promo_coupons.image_url IS
  'Imagen opcional. Si es NULL se usa la primera imagen del producto.';

CREATE INDEX IF NOT EXISTS promo_coupons_active_idx
  ON public.promo_coupons (is_active, sort_order);

GRANT SELECT ON public.promo_coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_coupons TO authenticated;
GRANT ALL ON public.promo_coupons TO service_role;

ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.promo_coupons;
CREATE POLICY "Anyone can view active coupons"
  ON public.promo_coupons FOR SELECT
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

DROP POLICY IF EXISTS "Admins can view all coupons" ON public.promo_coupons;
CREATE POLICY "Admins can view all coupons"
  ON public.promo_coupons FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert coupons" ON public.promo_coupons;
CREATE POLICY "Admins can insert coupons"
  ON public.promo_coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update coupons" ON public.promo_coupons;
CREATE POLICY "Admins can update coupons"
  ON public.promo_coupons FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete coupons" ON public.promo_coupons;
CREATE POLICY "Admins can delete coupons"
  ON public.promo_coupons FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_promo_coupons_updated_at ON public.promo_coupons;
CREATE TRIGGER update_promo_coupons_updated_at
  BEFORE UPDATE ON public.promo_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_conv_updated_at();
