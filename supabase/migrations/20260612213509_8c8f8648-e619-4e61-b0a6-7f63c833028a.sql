
-- ============ ai_conversations ============
DROP POLICY IF EXISTS "ai_conv_select_session" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conv_update_session" ON public.ai_conversations;
DROP POLICY IF EXISTS "ai_conv_insert_public" ON public.ai_conversations;
-- Admin SELECT policy already exists; writes happen via service role from edge function.

-- ============ availability_requests ============
DROP POLICY IF EXISTS "public_all_availability" ON public.availability_requests;
-- Existing admin SELECT/UPDATE/DELETE and anon INSERT policies remain.

-- ============ chat_conversations ============
DROP POLICY IF EXISTS "public_all_chat_conversations" ON public.chat_conversations;
-- Admin SELECT remains; writes happen via server function with service role.

-- ============ customers ============
DROP POLICY IF EXISTS "public_all_customers" ON public.customers;
CREATE POLICY "Anyone can register as customer"
  ON public.customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============ orders ============
DROP POLICY IF EXISTS "public_all_orders" ON public.orders;
CREATE POLICY "Anyone can place an order"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Distributors can read their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    distributor_id IS NOT NULL
    AND distributor_id IN (
      SELECT id FROM public.distributors WHERE auth_user_id = auth.uid()
    )
  );

-- ============ distributors privilege escalation fix ============
DROP POLICY IF EXISTS "distributors_owner_update" ON public.distributors;
CREATE POLICY "distributors_owner_update"
  ON public.distributors FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_distributor_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins (and service_role, which bypasses RLS entirely) can update anything.
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Not authorized to change status';
  END IF;
  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Not authorized to change auth_user_id';
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'Not authorized to change approved_at';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS distributors_prevent_escalation ON public.distributors;
CREATE TRIGGER distributors_prevent_escalation
  BEFORE UPDATE ON public.distributors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_distributor_privilege_escalation();

-- ============ Storage: product-images ============
DROP POLICY IF EXISTS "product_images_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_public_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
-- "Public can read product images" + admin write policies remain.

-- ============ Storage: payment-receipts ============
DROP POLICY IF EXISTS "Authenticated can read payment receipts" ON storage.objects;
CREATE POLICY "Admins can read payment receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND has_role(auth.uid(), 'admin'::app_role)
  );
-- "Anyone can upload payment receipts" stays — guest checkout needs to attach a receipt.
