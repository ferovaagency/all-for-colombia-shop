-- Categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  description text,
  image text,
  parent_id uuid references public.categories(id) on delete set null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Brands
create table public.brands (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  logo text,
  created_at timestamptz default now()
);

-- Products
create table public.products (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  description text,
  short_description text,
  price numeric,
  sale_price numeric,
  sku text,
  stock integer default 0,
  images text[],
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  specs jsonb,
  meta_title text,
  meta_description text,
  active boolean default true,
  featured boolean default false,
  created_at timestamptz default now()
);

-- Orders
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text default 'pending',
  items jsonb,
  subtotal numeric,
  total numeric,
  payment_method text,
  receipt_url text,
  shipping_address jsonb,
  created_at timestamptz default now()
);

-- Availability requests
create table public.availability_requests (
  id uuid default gen_random_uuid() primary key,
  order_id text,
  customer_name text,
  customer_email text,
  items jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Blog posts
create table public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  excerpt text,
  content text,
  cover_image text,
  category text,
  published boolean default false,
  meta_title text,
  meta_description text,
  created_at timestamptz default now()
);

-- Customers
create table public.customers (
  id uuid default gen_random_uuid() primary key,
  name text,
  email text unique,
  phone text,
  company text,
  nit text,
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.orders enable row level security;
alter table public.availability_requests enable row level security;
alter table public.blog_posts enable row level security;
alter table public.customers enable row level security;

-- Public access policies (per project requirements)
create policy "public_all_products" on public.products for all using (true) with check (true);
create policy "public_all_categories" on public.categories for all using (true) with check (true);
create policy "public_all_brands" on public.brands for all using (true) with check (true);
create policy "public_all_orders" on public.orders for all using (true) with check (true);
create policy "public_all_availability" on public.availability_requests for all using (true) with check (true);
create policy "public_all_blog" on public.blog_posts for all using (true) with check (true);
create policy "public_all_customers" on public.customers for all using (true) with check (true);

-- Seed categories
insert into public.categories (slug, name, sort_order) values
('tecnologia', 'Tecnología', 1),
('hogar', 'Hogar', 2),
('equipos-corporativos', 'Equipos Corporativos', 3),
('aires-acondicionados', 'Aires Acondicionados', 4),
('ploters', 'Plóters e Impresión', 5),
('otros', 'Otros', 6);

-- Indexes
create index idx_products_category on public.products(category_id);
create index idx_products_brand on public.products(brand_id);
create index idx_products_active on public.products(active);
create index idx_products_featured on public.products(featured);
create index idx_categories_parent on public.categories(parent_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);