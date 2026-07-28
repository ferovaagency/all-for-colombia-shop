-- Fix type mismatches and missing tables by aligning schema with code assumptions

-- 1. Create promo_coupons table if missing
CREATE TABLE IF NOT EXISTS public.promo_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    code text NOT NULL,
    headline text,
    discount_percent numeric,
    image_url text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_coupons TO authenticated;
GRANT SELECT ON public.promo_coupons TO anon;
GRANT ALL ON public.promo_coupons TO service_role;

ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to promo_coupons"
    ON public.promo_coupons FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow authenticated full access to promo_coupons"
    ON public.promo_coupons FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Add missing teaser_images to weekly_deals
ALTER TABLE public.weekly_deals 
ADD COLUMN IF NOT EXISTS teaser_images text[] DEFAULT '{}';

-- 3. Create missing legal/consent tables
CREATE TABLE IF NOT EXISTS public.legal_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text,
    session_id text NOT NULL,
    terms_accepted boolean DEFAULT false,
    privacy_accepted boolean DEFAULT false,
    marketing_accepted boolean DEFAULT false,
    adult_confirmed boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.legal_consents TO anon, authenticated;
GRANT ALL ON public.legal_consents TO service_role;
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert for legal_consents" ON public.legal_consents FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.cookie_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    necessary boolean DEFAULT true,
    analytics boolean DEFAULT false,
    marketing boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.cookie_consents TO anon, authenticated;
GRANT ALL ON public.cookie_consents TO service_role;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert for cookie_consents" ON public.cookie_consents FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.privacy_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text NOT NULL,
    type text NOT NULL, -- 'deletion', 'access', 'rectification'
    status text DEFAULT 'pending',
    details text,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.privacy_requests TO anon, authenticated;
GRANT ALL ON public.privacy_requests TO service_role;
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert for privacy_requests" ON public.privacy_requests FOR INSERT WITH CHECK (true);