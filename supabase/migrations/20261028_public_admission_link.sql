-- ============================================================
-- Public admission link
-- Settings live on admission_settings (single row). Every public
-- submission attempt is logged (hashed IP / contact only) for rate
-- limiting and abuse review. Both are server-only (service role):
-- RLS is on with no policies, so anon/authenticated clients get nothing.
-- ============================================================

ALTER TABLE public.admission_settings ADD COLUMN IF NOT EXISTS public_link_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.admission_settings ADD COLUMN IF NOT EXISTS public_link_token TEXT;
ALTER TABLE public.admission_settings ADD COLUMN IF NOT EXISTS public_link_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.public_admission_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  contact_hash TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'rate_limited', 'captcha_failed', 'invalid', 'honeypot', 'duplicate', 'error')),
  application_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_admission_attempts_ip ON public.public_admission_attempts (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_admission_attempts_contact ON public.public_admission_attempts (contact_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_admission_attempts_time ON public.public_admission_attempts (created_at DESC);

ALTER TABLE public.public_admission_attempts ENABLE ROW LEVEL SECURITY;
