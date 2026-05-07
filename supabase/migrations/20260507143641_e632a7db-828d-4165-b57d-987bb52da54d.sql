CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_email TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMPTZ,
  suggested_products UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_conversations_session_id_key UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_session ON public.ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_escalated ON public.ai_conversations(escalated);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_conv_insert_public" ON public.ai_conversations;
CREATE POLICY "ai_conv_insert_public" ON public.ai_conversations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "ai_conv_select_session" ON public.ai_conversations;
CREATE POLICY "ai_conv_select_session" ON public.ai_conversations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "ai_conv_update_session" ON public.ai_conversations;
CREATE POLICY "ai_conv_update_session" ON public.ai_conversations
  FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.update_ai_conv_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ai_conv_updated_at ON public.ai_conversations;
CREATE TRIGGER trg_ai_conv_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_conv_updated_at();