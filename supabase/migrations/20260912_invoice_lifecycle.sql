-- ============================================================
-- Migration: Invoice Lifecycle Management
-- Adds teacher assignment & status tracking to admission_invoices
-- ============================================================

-- 1. Add new lifecycle columns
ALTER TABLE admission_invoices
  ADD COLUMN IF NOT EXISTS invoice_status TEXT NOT NULL DEFAULT 'active'
    CHECK (invoice_status IN ('active', 'blank_assigned', 'cancelled')),
  ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS batch_id TEXT DEFAULT NULL;

-- 2. Backfill: existing blank invoices → blank_assigned
UPDATE admission_invoices
  SET invoice_status = 'blank_assigned'
  WHERE is_blank = true AND invoice_status = 'active';

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_inv_status      ON admission_invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_inv_assigned_to ON admission_invoices(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inv_batch_id    ON admission_invoices(batch_id);

-- 4. Essential Permissions (Grants full access to service_role, anon, authenticated)
GRANT ALL ON TABLE public.admission_invoices TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;

-- Ensure RLS allows full operations for our app
ALTER TABLE public.admission_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_admission_invoices" ON admission_invoices;
CREATE POLICY "service_role_all_admission_invoices" ON admission_invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_admission_invoices" ON admission_invoices;
CREATE POLICY "anon_all_admission_invoices" ON admission_invoices
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_admission_invoices" ON admission_invoices;
CREATE POLICY "authenticated_all_admission_invoices" ON admission_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Comment for documentation
COMMENT ON COLUMN admission_invoices.invoice_status IS
  'active = filled/used invoice | blank_assigned = blank given to teacher, pending settlement | cancelled = returned unused, excluded from financial totals';
COMMENT ON COLUMN admission_invoices.assigned_to IS
  'Name of the teacher to whom blank invoice slips were assigned for distribution';
COMMENT ON COLUMN admission_invoices.batch_id IS
  'Batch identifier grouping blank invoices assigned together (e.g. 20260912-RKS for date-teacher-initials)';
