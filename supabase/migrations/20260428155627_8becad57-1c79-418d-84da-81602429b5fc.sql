CREATE TABLE IF NOT EXISTS public.distributors (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  nit text not null,
  contact_name text not null,
  email text unique not null,
  phone text not null,
  city text not null,
  address text,
  business_type text,
  products_sold text,
  status text default 'pending',
  password_hash text,
  username text unique,
  created_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  approved_by text
);

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distributors_public_insert" ON public.distributors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "distributors_public_select" ON public.distributors
  FOR SELECT USING (true);

CREATE POLICY "distributors_public_update" ON public.distributors
  FOR UPDATE USING (true);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'retail';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distributor_id uuid REFERENCES public.distributors(id);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS distributor_price numeric;