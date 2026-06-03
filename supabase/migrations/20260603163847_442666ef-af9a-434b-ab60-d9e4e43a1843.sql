DROP POLICY IF EXISTS "newsletter_select_public" ON public.newsletter_subscribers;
REVOKE SELECT ON public.newsletter_subscribers FROM anon;