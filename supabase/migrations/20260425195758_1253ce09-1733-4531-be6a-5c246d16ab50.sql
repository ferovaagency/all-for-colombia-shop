
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  messages jsonb NOT NULL,
  page_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at
  ON public.chat_conversations (updated_at DESC);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all_chat_conversations" ON public.chat_conversations;
CREATE POLICY "public_all_chat_conversations"
  ON public.chat_conversations
  FOR ALL
  USING (true)
  WITH CHECK (true);
