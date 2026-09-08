-- ============================================================
-- Supabase Schema: certificates_registry Table
-- Tracks, records, and verifies all printed student certificates
-- Supports Character, Pass Out, Transfer (TC), and Kanyashree
-- ============================================================

CREATE TABLE IF NOT EXISTS certificates_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_no TEXT NOT NULL UNIQUE,
  certificate_type TEXT NOT NULL, -- 'character-certificate' | 'pass-certificate' | 'transfer-certificate' | 'kanyashree'
  academic_session TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  student_id TEXT,
  student_name TEXT NOT NULL,
  gender TEXT,
  father_name TEXT,
  mother_name TEXT,
  student_class TEXT NOT NULL,
  section TEXT,
  roll_no TEXT,
  date_of_birth TEXT,
  copy_type TEXT NOT NULL DEFAULT 'Original', -- 'Original' | 'Duplicate' | 'Office Copy'
  status TEXT NOT NULL DEFAULT 'Valid',       -- 'Valid' | 'Cancelled'
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Type-specific details (board roll, leaving date, kanyashree ID, etc.)
  printed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ultra-fast verification and analytics queries
CREATE INDEX IF NOT EXISTS idx_certificates_cert_no ON certificates_registry(certificate_no);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates_registry(certificate_type);
CREATE INDEX IF NOT EXISTS idx_certificates_class ON certificates_registry(student_class);
CREATE INDEX IF NOT EXISTS idx_certificates_session ON certificates_registry(academic_session);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates_registry(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON certificates_registry(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE certificates_registry ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations
CREATE POLICY "allow_authenticated_all_certificates" ON certificates_registry
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow public verification lookups
CREATE POLICY "allow_anon_verify_certificates" ON certificates_registry
  FOR SELECT
  TO anon
  USING (true);

-- Allow service_role unrestricted access
CREATE POLICY "service_role_all_certificates" ON certificates_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
