CREATE TABLE public.weekly_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  discount_percent numeric(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 80),
  reveal_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  stock_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_deals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.weekly_deals TO authenticated;
GRANT ALL ON public.weekly_deals TO service_role;

ALTER TABLE public.weekly_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active weekly deals"
  ON public.weekly_deals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all weekly deals"
  ON public.weekly_deals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert weekly deals"
  ON public.weekly_deals FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update weekly deals"
  ON public.weekly_deals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete weekly deals"
  ON public.weekly_deals FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_weekly_deals_updated_at
  BEFORE UPDATE ON public.weekly_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_conv_updated_at();