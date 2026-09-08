-- ============================================================
-- Supabase Schema: admission_invoices Table
-- Tracks, records, and verifies all printed student fee receipts & invoices
-- Supports both pre-filled roster records and blank manual-entry slips
-- ============================================================

CREATE TABLE IF NOT EXISTS admission_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  academic_session TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  issue_time TEXT,
  student_id TEXT,
  student_name TEXT,
  student_class TEXT NOT NULL,
  section TEXT,
  roll_no TEXT,
  guardian_name TEXT,
  contact_number TEXT,
  pen_number TEXT,
  fee_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  payment_status TEXT NOT NULL DEFAULT 'Paid',
  remarks TEXT,
  generator_mode TEXT NOT NULL DEFAULT 'single', -- 'single' | 'bulk'
  copy_type TEXT NOT NULL DEFAULT 'both',        -- 'both' | 'student' | 'school'
  is_blank BOOLEAN NOT NULL DEFAULT false,       -- true for blank manual write-in slips
  printed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast lookups, verification, and analytics
CREATE INDEX IF NOT EXISTS idx_admission_invoices_inv_num ON admission_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_admission_invoices_class ON admission_invoices(student_class);
CREATE INDEX IF NOT EXISTS idx_admission_invoices_session ON admission_invoices(academic_session);
CREATE INDEX IF NOT EXISTS idx_admission_invoices_is_blank ON admission_invoices(is_blank);
CREATE INDEX IF NOT EXISTS idx_admission_invoices_mode ON admission_invoices(generator_mode);
CREATE INDEX IF NOT EXISTS idx_admission_invoices_created_at ON admission_invoices(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE admission_invoices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations
CREATE POLICY "allow_authenticated_all_admission_invoices" ON admission_invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to verify invoices by invoice_number
CREATE POLICY "allow_anon_verify_admission_invoices" ON admission_invoices
  FOR SELECT
  TO anon
  USING (true);

-- Allow service_role unrestricted access
CREATE POLICY "service_role_all_admission_invoices" ON admission_invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
