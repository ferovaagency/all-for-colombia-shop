
CREATE OR REPLACE FUNCTION public.set_order_addi_refs(
  _order_id uuid,
  _application_id text,
  _status text,
  _checkout_url text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.orders
     SET addi_application_id = _application_id,
         addi_status = _status,
         addi_checkout_url = _checkout_url
   WHERE id = _order_id;
$$;

GRANT EXECUTE ON FUNCTION public.set_order_addi_refs(uuid, text, text, text) TO anon, authenticated, service_role;
