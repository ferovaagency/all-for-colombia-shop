CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.internal_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_tokens FROM anon, authenticated;
GRANT ALL ON public.internal_tokens TO service_role;
ALTER TABLE public.internal_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_tokens (name) VALUES ('inventory_cron')
ON CONFLICT (name) DO NOTHING;

SELECT cron.unschedule('inventory-sync-15min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'inventory-sync-15min');

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
    body := '{"source":"pg_cron"}'::jsonb
  );
  $$
);