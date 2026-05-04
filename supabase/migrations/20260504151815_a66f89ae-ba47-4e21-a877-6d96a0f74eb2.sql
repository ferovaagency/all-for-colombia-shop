ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS audiencia JSONB,
  ADD COLUMN IF NOT EXISTS specs_contexto JSONB,
  ADD COLUMN IF NOT EXISTS beneficios_reales JSONB,
  ADD COLUMN IF NOT EXISTS info_fabricante TEXT,
  ADD COLUMN IF NOT EXISTS por_que_comprar JSONB,
  ADD COLUMN IF NOT EXISTS faq JSONB,
  ADD COLUMN IF NOT EXISTS afirmacion_inicial TEXT,
  ADD COLUMN IF NOT EXISTS cierre_estrategico TEXT;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  cargo TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 4 AND 5),
  contenido TEXT NOT NULL,
  pie_nota TEXT NOT NULL DEFAULT 'Experiencia representativa de cliente de All For All',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_product_reviews"
ON public.product_reviews
FOR ALL
USING (true)
WITH CHECK (true);