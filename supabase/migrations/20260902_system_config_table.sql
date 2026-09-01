-- ============================================================
-- Supabase Schema: Dedicated system_config table
-- Secure store for sensitive system settings (e.g. OAuth tokens)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and restrict access to service_role only
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_all" ON system_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
