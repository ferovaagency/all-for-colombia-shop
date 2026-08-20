SELECT cron.unschedule('inventory-sync-15min');
SELECT cron.schedule(
  'inventory-sync-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mtnkiwjzdxqezelmvtot.supabase.co/functions/v1/inventory-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (SELECT token FROM public.internal_tokens WHERE name = 'inventory_cron')
    ),
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);