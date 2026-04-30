ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS addi_application_id text,
  ADD COLUMN IF NOT EXISTS addi_status text,
  ADD COLUMN IF NOT EXISTS addi_checkout_url text;
CREATE INDEX IF NOT EXISTS idx_orders_addi_app ON public.orders(addi_application_id);