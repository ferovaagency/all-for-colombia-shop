-- Distribuidores: agregar campos comerciales
ALTER TABLE public.distributors
  ADD COLUMN IF NOT EXISTS years_active INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_purchase_estimate NUMERIC,
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 15,
  ADD COLUMN IF NOT EXISTS min_order_value NUMERIC DEFAULT 500000,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'contado',
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Productos: campos B2B
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC,
  ADD COLUMN IF NOT EXISTS wholesale_min_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS available_for_distributors BOOLEAN DEFAULT TRUE;

-- Pedidos B2B
CREATE TABLE IF NOT EXISTS public.distributor_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  subtotal NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'preparing', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.distributor_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.distributor_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dist_orders_dist ON public.distributor_orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_dist_order_items_order ON public.distributor_order_items(order_id);

ALTER TABLE public.distributor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_dist_orders" ON public.distributor_orders;
CREATE POLICY "public_all_dist_orders" ON public.distributor_orders
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_all_dist_order_items" ON public.distributor_order_items;
CREATE POLICY "public_all_dist_order_items" ON public.distributor_order_items
  FOR ALL USING (true) WITH CHECK (true);

-- Newsletter
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  brevo_synced BOOLEAN DEFAULT FALSE,
  brevo_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_insert_public" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_insert_public" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_select_public" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_select_public" ON public.newsletter_subscribers
  FOR SELECT USING (true);

-- Trigger updated_at distribuidores
CREATE OR REPLACE FUNCTION public.update_distributors_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_distributors_updated_at ON public.distributors;
CREATE TRIGGER trg_distributors_updated_at BEFORE UPDATE ON public.distributors
  FOR EACH ROW EXECUTE FUNCTION public.update_distributors_updated_at();

DROP TRIGGER IF EXISTS trg_dist_orders_updated_at ON public.distributor_orders;
CREATE TRIGGER trg_dist_orders_updated_at BEFORE UPDATE ON public.distributor_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_distributors_updated_at();

-- Generador de número de pedido B2B
CREATE OR REPLACE FUNCTION public.generate_distributor_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  next_seq INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'DIST-' || year_part || '-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_seq
  FROM public.distributor_orders
  WHERE order_number LIKE 'DIST-' || year_part || '-%';
  RETURN 'DIST-' || year_part || '-' || LPAD(next_seq::TEXT, 4, '0');
END;
$$;