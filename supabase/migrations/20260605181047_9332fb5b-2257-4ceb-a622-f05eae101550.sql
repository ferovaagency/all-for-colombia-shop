
-- Enum and roles table
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon;

-- ============================================================
-- PRODUCTS: public read, admin write
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Public can read products" ON public.products;
DROP POLICY IF EXISTS "Admins can write products" ON public.products;

CREATE POLICY "Public can read products" ON public.products
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- ============================================================
-- CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;

CREATE POLICY "Public can read categories" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.categories FROM anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;

-- ============================================================
-- BRANDS
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on brands" ON public.brands;

CREATE POLICY "Public can read brands" ON public.brands
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert brands" ON public.brands
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update brands" ON public.brands
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete brands" ON public.brands
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.brands FROM anon;
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;

-- ============================================================
-- BLOGS
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on blogs" ON public.blogs;

CREATE POLICY "Public can read blogs" ON public.blogs
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert blogs" ON public.blogs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update blogs" ON public.blogs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete blogs" ON public.blogs
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.blogs FROM anon;
GRANT SELECT ON public.blogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blogs TO authenticated;

-- ============================================================
-- BLOG_POSTS
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on blog_posts" ON public.blog_posts;

CREATE POLICY "Public can read blog_posts" ON public.blog_posts
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert blog_posts" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update blog_posts" ON public.blog_posts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete blog_posts" ON public.blog_posts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.blog_posts FROM anon;
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;

-- ============================================================
-- CUSTOMERS: only admin can read; insert goes through server fn (Step 3)
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;

CREATE POLICY "Admins can read customers" ON public.customers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update customers" ON public.customers
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.customers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

-- ============================================================
-- ORDERS: only admin read; insert goes through server fn (Step 3)
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;

CREATE POLICY "Admins can read orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- ============================================================
-- AVAILABILITY_REQUESTS: public can insert, only admin can read
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on availability_requests" ON public.availability_requests;

CREATE POLICY "Anyone can submit availability requests" ON public.availability_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read availability requests" ON public.availability_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update availability requests" ON public.availability_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete availability requests" ON public.availability_requests
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT, UPDATE, DELETE ON public.availability_requests FROM anon;
GRANT INSERT ON public.availability_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_requests TO authenticated;
GRANT ALL ON public.availability_requests TO service_role;

-- ============================================================
-- PRODUCT_REVIEWS: public read, admin write (UI write goes via server fn later)
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on product_reviews" ON public.product_reviews;

CREATE POLICY "Public can read product reviews" ON public.product_reviews
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert reviews" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reviews" ON public.product_reviews
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reviews" ON public.product_reviews
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.product_reviews FROM anon;
GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;

-- ============================================================
-- CHAT / AI CONVERSATIONS: only admin reads; writes via edge functions (service role)
-- ============================================================
DROP POLICY IF EXISTS "Allow all operations on chat_conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow all operations on ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Anyone can insert ai conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Anyone can update ai conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Anyone can read ai conversations" ON public.ai_conversations;

CREATE POLICY "Admins can read chat_conversations" ON public.chat_conversations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read ai_conversations" ON public.ai_conversations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations FROM anon, authenticated;
GRANT SELECT ON public.chat_conversations TO authenticated;
GRANT SELECT ON public.ai_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
GRANT ALL ON public.ai_conversations TO service_role;

-- ============================================================
-- STORAGE: product-images bucket — public read individual objects, admin write, no listing
-- ============================================================
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

CREATE POLICY "Public can read product images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Create the admin user
-- ============================================================
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'ventasecommerce@allforall.com.co';

  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'ventasecommerce@allforall.com.co',
      crypt('AllForAll#2016', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false, '', '', '', ''
    )
    RETURNING id INTO v_user_id;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'ventasecommerce@allforall.com.co', 'email_verified', true),
      'email',
      v_user_id::text,
      now(), now(), now()
    );
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
