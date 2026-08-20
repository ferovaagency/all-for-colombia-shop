CREATE OR REPLACE FUNCTION public.trigger_inventory_writeback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(coalesce(NEW.status, '')) IN ('paid','pagado','approved','aprobado')
     AND lower(coalesce(OLD.status, '')) IS DISTINCT FROM lower(coalesce(NEW.status, ''))
     AND coalesce(NEW.shipping_address->>'stockWritebackAt', '') = '' THEN
    PERFORM net.http_post(
      url := 'https://mtnkiwjzdxqezelmvtot.supabase.co/functions/v1/inventory-writeback',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', (SELECT token FROM public.internal_tokens WHERE name = 'inventory_cron')
      ),
      body := jsonb_build_object('order_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_inventory_writeback() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_orders_inventory_writeback ON public.orders;
CREATE TRIGGER trg_orders_inventory_writeback
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trigger_inventory_writeback();