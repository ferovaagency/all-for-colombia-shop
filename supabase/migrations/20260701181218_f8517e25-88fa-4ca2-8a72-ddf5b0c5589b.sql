
CREATE OR REPLACE FUNCTION public.get_order_for_payment(_order_id uuid)
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.orders WHERE id = _order_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_for_payment(uuid) TO anon, authenticated, service_role;
