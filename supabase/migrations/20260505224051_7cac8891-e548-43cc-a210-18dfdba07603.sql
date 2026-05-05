ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS logo_url TEXT;
NOTIFY pgrst, 'reload schema';