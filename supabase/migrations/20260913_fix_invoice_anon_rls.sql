-- ============================================================
-- Migration: Fix Broken Anon RLS Policy on admission_invoices
-- Security hardening: Revokes public anon table access & enforces strict RLS
-- ============================================================

-- 1. Drop dangerous anon policies
DROP POLICY IF EXISTS "anon_all_admission_invoices" ON public.admission_invoices;
DROP POLICY IF EXISTS "allow_anon_verify_admission_invoices" ON public.admission_invoices;

-- 2. Revoke blanket table access from anon
REVOKE ALL ON TABLE public.admission_invoices FROM anon;

-- Explicitly revoke sequence permissions from anon
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 3. Ensure Row Level Security is active on admission_invoices
ALTER TABLE public.admission_invoices ENABLE ROW LEVEL SECURITY;

-- 4. Re-affirm/ensure authenticated and service_role maintain full operational access
DROP POLICY IF EXISTS "service_role_all_admission_invoices" ON public.admission_invoices;
CREATE POLICY "service_role_all_admission_invoices" ON public.admission_invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_admission_invoices" ON public.admission_invoices;
CREATE POLICY "authenticated_all_admission_invoices" ON public.admission_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Create a secure, restricted SECURITY DEFINER function for public invoice verification
-- This exposes ONLY non-sensitive verification fields and prevents anon from querying the table directly.
CREATE OR REPLACE FUNCTION public.verify_invoice_public(p_invoice_number TEXT)
RETURNS TABLE (
  invoice_number TEXT,
  student_name TEXT,
  student_class TEXT,
  section TEXT,
  issue_date TEXT,
  total_amount NUMERIC(10, 2),
  payment_status TEXT,
  invoice_status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    invoice_number,
    student_name,
    student_class,
    section,
    issue_date,
    total_amount,
    payment_status,
    invoice_status
  FROM public.admission_invoices
  WHERE LOWER(TRIM(invoice_number)) = LOWER(TRIM(p_invoice_number))
  LIMIT 1;
$$;

-- Revoke all function permissions from public, then selectively grant EXECUTE
REVOKE ALL ON FUNCTION public.verify_invoice_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invoice_public(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.verify_invoice_public IS 
  'Securely returns only public verification data for an invoice without exposing sensitive student contact info or granting table access to anon.';
