DROP POLICY IF EXISTS "Admins can view distributors" ON public.distributors;
DROP POLICY IF EXISTS "Admins can update distributors" ON public.distributors;
DROP POLICY IF EXISTS "Admins can delete distributors" ON public.distributors;

CREATE POLICY "Admins can view distributors"
ON public.distributors
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update distributors"
ON public.distributors
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete distributors"
ON public.distributors
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));