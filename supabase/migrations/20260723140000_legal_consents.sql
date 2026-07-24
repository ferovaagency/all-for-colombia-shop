-- =====================================================================
-- Cumplimiento Ley 1581 de 2012 / Decreto 1377 de 2013:
-- evidencia verificable del consentimiento otorgado por cada titular.
--
-- Regla de acceso: cualquiera puede DEJAR constancia (INSERT), pero sólo
-- los administradores pueden LEERLA. Un registro de consentimiento es un
-- dato personal en sí mismo y no puede quedar expuesto públicamente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Consentimientos sobre documentos legales
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id text,
  policy text NOT NULL,
  version text NOT NULL,
  accepted boolean NOT NULL DEFAULT true,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  language text,
  origin text NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.legal_consents IS
  'Evidencia de aceptación de documentos legales. No se borra: acredita la autorización del titular.';
COMMENT ON COLUMN public.legal_consents.policy IS 'Slug del documento, ej. terminos-y-condiciones.';
COMMENT ON COLUMN public.legal_consents.version IS 'Versión exacta del documento aceptado, ej. 2.0.';
COMMENT ON COLUMN public.legal_consents.origin IS 'Dónde se otorgó: checkout, registro, newsletter, contacto, chatbot…';
COMMENT ON COLUMN public.legal_consents.reference IS 'Identificador relacionado (pedido, email, sesión) para trazabilidad.';

CREATE INDEX IF NOT EXISTS legal_consents_user_idx ON public.legal_consents (user_id);
CREATE INDEX IF NOT EXISTS legal_consents_guest_idx ON public.legal_consents (guest_id);
CREATE INDEX IF NOT EXISTS legal_consents_policy_idx ON public.legal_consents (policy, version);
CREATE INDEX IF NOT EXISTS legal_consents_reference_idx ON public.legal_consents (reference);

ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.legal_consents TO authenticated;
GRANT ALL ON public.legal_consents TO service_role;

DROP POLICY IF EXISTS "Admins can read legal consents" ON public.legal_consents;
CREATE POLICY "Admins can read legal consents"
  ON public.legal_consents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 2) Consentimiento granular de cookies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id text,
  necessary boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  functional boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL,
  ip text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cookie_consents IS
  'Preferencias de cookies por visitante. Cada cambio queda como fila nueva (histórico).';
COMMENT ON COLUMN public.cookie_consents.functional IS 'Cookies de personalización.';

CREATE INDEX IF NOT EXISTS cookie_consents_guest_idx ON public.cookie_consents (guest_id);
CREATE INDEX IF NOT EXISTS cookie_consents_user_idx ON public.cookie_consents (user_id);

ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.cookie_consents TO authenticated;
GRANT ALL ON public.cookie_consents TO service_role;

DROP POLICY IF EXISTS "Admins can read cookie consents" ON public.cookie_consents;
CREATE POLICY "Admins can read cookie consents"
  ON public.cookie_consents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- 3) Solicitudes de derechos del titular (PQRS de datos personales)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'privacy_request_type') THEN
    CREATE TYPE public.privacy_request_type AS ENUM (
      'acceso', 'actualizacion', 'rectificacion', 'supresion', 'revocatoria', 'consulta', 'reclamo'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'privacy_request_status') THEN
    CREATE TYPE public.privacy_request_status AS ENUM (
      'recibida', 'en_tramite', 'requiere_info', 'resuelta', 'rechazada'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.privacy_request_type NOT NULL,
  status public.privacy_request_status NOT NULL DEFAULT 'recibida',
  full_name text NOT NULL,
  document_id text NOT NULL,
  email text NOT NULL,
  phone text,
  description text NOT NULL,
  response text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

COMMENT ON TABLE public.privacy_requests IS
  'Solicitudes de acceso, rectificación, supresión y revocatoria (art. 14 y 15 Ley 1581 de 2012).';

CREATE INDEX IF NOT EXISTS privacy_requests_status_idx ON public.privacy_requests (status, created_at DESC);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.privacy_requests TO authenticated;
GRANT ALL ON public.privacy_requests TO service_role;

DROP POLICY IF EXISTS "Admins can read privacy requests" ON public.privacy_requests;
CREATE POLICY "Admins can read privacy requests"
  ON public.privacy_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update privacy requests" ON public.privacy_requests;
CREATE POLICY "Admins can update privacy requests"
  ON public.privacy_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
