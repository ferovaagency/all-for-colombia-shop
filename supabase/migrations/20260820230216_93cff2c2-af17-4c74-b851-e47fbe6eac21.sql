SELECT net.http_post(
  url := 'https://mtnkiwjzdxqezelmvtot.supabase.co/functions/v1/inventory-sync',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT token FROM public.internal_tokens WHERE name='inventory_cron')),
  body := '{"source":"manual-test"}'::jsonb
);