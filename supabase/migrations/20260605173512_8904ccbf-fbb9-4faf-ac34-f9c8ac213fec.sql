
-- Step 1: Distributor auth migration

-- 1. Add auth_user_id column linking to auth.users
ALTER TABLE public.distributors
  ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX distributors_auth_user_id_key ON public.distributors(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- 2. Reset the one existing test distributor so admin re-approves with new flow
UPDATE public.distributors SET status = 'pending', password_hash = NULL;

-- 3. Drop plaintext password column
ALTER TABLE public.distributors DROP COLUMN password_hash;

-- 4. Drop legacy permissive policies
DROP POLICY IF EXISTS distributors_public_select ON public.distributors;
DROP POLICY IF EXISTS distributors_public_update ON public.distributors;
DROP POLICY IF EXISTS distributors_insert_public ON public.distributors;
DROP POLICY IF EXISTS public_all_dist_orders ON public.distributor_orders;
DROP POLICY IF EXISTS public_all_dist_order_items ON public.distributor_order_items;

-- 5. Revoke anon access on now-protected tables
REVOKE ALL ON public.distributors FROM anon;
REVOKE ALL ON public.distributor_orders FROM anon;
REVOKE ALL ON public.distributor_order_items FROM anon;

-- Allow anon to INSERT registration only (no SELECT)
GRANT INSERT ON public.distributors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_order_items TO authenticated;
GRANT ALL ON public.distributors TO service_role;
GRANT ALL ON public.distributor_orders TO service_role;
GRANT ALL ON public.distributor_order_items TO service_role;

-- 6. New scoped policies on distributors
-- Public registration form may insert a pending application
CREATE POLICY distributors_anon_register
  ON public.distributors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending' AND auth_user_id IS NULL);

-- A signed-in distributor sees and updates only their own record
CREATE POLICY distributors_owner_select
  ON public.distributors
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY distributors_owner_update
  ON public.distributors
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid() AND status = (SELECT status FROM public.distributors WHERE id = distributors.id));

-- 7. Scoped policies on distributor_orders
CREATE POLICY dist_orders_owner_all
  ON public.distributor_orders
  FOR ALL
  TO authenticated
  USING (distributor_id IN (SELECT id FROM public.distributors WHERE auth_user_id = auth.uid()))
  WITH CHECK (distributor_id IN (SELECT id FROM public.distributors WHERE auth_user_id = auth.uid()));

-- 8. Scoped policies on distributor_order_items
CREATE POLICY dist_order_items_owner_all
  ON public.distributor_order_items
  FOR ALL
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.distributor_orders o
      JOIN public.distributors d ON d.id = o.distributor_id
      WHERE d.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    order_id IN (
      SELECT o.id FROM public.distributor_orders o
      JOIN public.distributors d ON d.id = o.distributor_id
      WHERE d.auth_user_id = auth.uid()
    )
  );
