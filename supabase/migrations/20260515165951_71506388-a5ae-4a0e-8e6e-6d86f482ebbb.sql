DROP POLICY IF EXISTS "distributors_insert_public" ON public.distributors;
DROP POLICY IF EXISTS "distributors_public_insert" ON public.distributors;
CREATE POLICY "distributors_insert_public" ON public.distributors
  FOR INSERT WITH CHECK (true);

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_id_number TEXT;