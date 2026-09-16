-- ============================================================
-- Migration: Production Security Hardening & RLS Lockdown
-- Date: 2026-09-16
-- 
-- 1. Helper Functions: Security Definer STABLE role resolvers (prevents RLS recursion)
-- 2. admission_settings: Lock down secrets & AI keys
-- 3. admission_applications: Revoke anon & enforce RBAC
-- 4. certificates_registry: Revoke anon, secure RPC verification
-- 5. staff_profiles: Revoke anon read policy & protect confidential employee data
-- 6. user_roles: Prevent privilege escalation & RLS infinite recursion
-- 7. students, student_results, academic_history, audit_log: Production RLS enforcement
-- 8. get_student_distinct_metadata: Fast server-side distinct metadata extraction
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper Functions: Non-recursive Role Resolvers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'Admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('Admin', 'Staff')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_staff_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated, service_role;

-- ------------------------------------------------------------
-- 2. Harden admission_settings (Protects AI Keys & System Secrets)
-- ------------------------------------------------------------
REVOKE ALL ON TABLE public.admission_settings FROM anon;
ALTER TABLE public.admission_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_read_admission_settings" ON public.admission_settings;
DROP POLICY IF EXISTS "allow_authenticated_all_admission_settings" ON public.admission_settings;
DROP POLICY IF EXISTS "service_role_all_admission_settings" ON public.admission_settings;
DROP POLICY IF EXISTS "service_role_admission_settings" ON public.admission_settings;
DROP POLICY IF EXISTS "admin_all_admission_settings" ON public.admission_settings;

CREATE POLICY "service_role_admission_settings" ON public.admission_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "admin_all_admission_settings" ON public.admission_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 3. Harden admission_applications (Protects Student PII)
-- ------------------------------------------------------------
REVOKE ALL ON TABLE public.admission_applications FROM anon;
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_select_admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "allow_anon_insert_admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "allow_authenticated_all_admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "service_role_all_admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "service_role_admission_applications" ON public.admission_applications;
DROP POLICY IF EXISTS "authenticated_admission_applications" ON public.admission_applications;

CREATE POLICY "service_role_admission_applications" ON public.admission_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_admission_applications" ON public.admission_applications
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- ------------------------------------------------------------
-- 4. Harden certificates_registry (Fixes full certificate table dump)
-- ------------------------------------------------------------
REVOKE ALL ON TABLE public.certificates_registry FROM anon;
ALTER TABLE public.certificates_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_anon_verify_certificates" ON public.certificates_registry;
DROP POLICY IF EXISTS "allow_authenticated_all_certificates" ON public.certificates_registry;
DROP POLICY IF EXISTS "service_role_all_certificates" ON public.certificates_registry;
DROP POLICY IF EXISTS "service_role_certificates_registry" ON public.certificates_registry;
DROP POLICY IF EXISTS "authenticated_certificates_registry" ON public.certificates_registry;

CREATE POLICY "service_role_certificates_registry" ON public.certificates_registry
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_certificates_registry" ON public.certificates_registry
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- Secure RPC function for public certificate verification
CREATE OR REPLACE FUNCTION public.verify_certificate_public(p_certificate_no TEXT)
RETURNS TABLE (
  certificate_no TEXT,
  certificate_type TEXT,
  academic_session TEXT,
  issue_date TEXT,
  student_name TEXT,
  student_class TEXT,
  section TEXT,
  roll_no TEXT,
  copy_type TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    certificate_no,
    certificate_type,
    academic_session,
    issue_date,
    student_name,
    student_class,
    section,
    roll_no,
    copy_type,
    status
  FROM public.certificates_registry
  WHERE LOWER(TRIM(certificate_no)) = LOWER(TRIM(p_certificate_no))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT) TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 5. Harden staff_profiles (Revokes anon read & secures confidential employee data)
-- ------------------------------------------------------------
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke table privileges from anon
REVOKE ALL ON TABLE public.staff_profiles FROM anon;

-- Drop all old development and anon policies
DROP POLICY IF EXISTS "anon_read_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.staff_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.staff_profiles;
DROP POLICY IF EXISTS "service_role_all_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "authenticated_all_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "service_role_staff_profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_read_authenticated" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_admin_all" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_profiles_admin_mutate" ON public.staff_profiles;

CREATE POLICY "service_role_staff_profiles" ON public.staff_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated staff & admin can read staff list
CREATE POLICY "staff_profiles_read_authenticated" ON public.staff_profiles
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

-- Only Admins can INSERT, UPDATE, or DELETE staff records
CREATE POLICY "staff_profiles_admin_mutate" ON public.staff_profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------
-- 6. Harden user_roles (Prevents privilege escalation & RLS recursion)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.user_roles FROM anon;

    DROP POLICY IF EXISTS "service_role_user_roles" ON public.user_roles;
    CREATE POLICY "service_role_user_roles" ON public.user_roles
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "authenticated_read_user_roles" ON public.user_roles;
    CREATE POLICY "authenticated_read_user_roles" ON public.user_roles
      FOR SELECT TO authenticated USING (true);

    -- Safe Admin mutation without recursive query on user_roles
    DROP POLICY IF EXISTS "admin_mutate_user_roles" ON public.user_roles;
    CREATE POLICY "admin_mutate_user_roles" ON public.user_roles
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. Harden students, student_results, academic_history, audit_log
-- ------------------------------------------------------------
DO $$
BEGIN
  -- students table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.students FROM anon;

    DROP POLICY IF EXISTS "service_role_students" ON public.students;
    CREATE POLICY "service_role_students" ON public.students
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "authenticated_students" ON public.students;
    CREATE POLICY "authenticated_students" ON public.students
      FOR ALL TO authenticated
      USING (public.is_staff_or_admin())
      WITH CHECK (public.is_staff_or_admin());
  END IF;

  -- student_results table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_results') THEN
    ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.student_results FROM anon;

    DROP POLICY IF EXISTS "service_role_student_results" ON public.student_results;
    CREATE POLICY "service_role_student_results" ON public.student_results
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "authenticated_student_results" ON public.student_results;
    CREATE POLICY "authenticated_student_results" ON public.student_results
      FOR ALL TO authenticated
      USING (public.is_staff_or_admin())
      WITH CHECK (public.is_staff_or_admin());
  END IF;

  -- academic_history table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_history') THEN
    ALTER TABLE public.academic_history ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.academic_history FROM anon;

    DROP POLICY IF EXISTS "service_role_academic_history" ON public.academic_history;
    CREATE POLICY "service_role_academic_history" ON public.academic_history
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "authenticated_academic_history" ON public.academic_history;
    CREATE POLICY "authenticated_academic_history" ON public.academic_history
      FOR ALL TO authenticated
      USING (public.is_staff_or_admin())
      WITH CHECK (public.is_staff_or_admin());
  END IF;

  -- audit_log table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_log') THEN
    ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.audit_log FROM anon;

    DROP POLICY IF EXISTS "service_role_audit_log" ON public.audit_log;
    CREATE POLICY "service_role_audit_log" ON public.audit_log
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    -- Only Admins can view audit logs
    DROP POLICY IF EXISTS "admin_read_audit_log" ON public.audit_log;
    CREATE POLICY "admin_read_audit_log" ON public.audit_log
      FOR SELECT TO authenticated
      USING (public.is_admin());

    -- Any authenticated user can insert audit trail records
    DROP POLICY IF EXISTS "authenticated_insert_audit_log" ON public.audit_log;
    CREATE POLICY "authenticated_insert_audit_log" ON public.audit_log
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  -- admission_invoices table: restrict authenticated access to staff/admin
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admission_invoices') THEN
    DROP POLICY IF EXISTS "authenticated_all_admission_invoices" ON public.admission_invoices;
    DROP POLICY IF EXISTS "authenticated_admission_invoices" ON public.admission_invoices;
    CREATE POLICY "authenticated_admission_invoices" ON public.admission_invoices
      FOR ALL TO authenticated
      USING (public.is_staff_or_admin())
      WITH CHECK (public.is_staff_or_admin());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 8. Optimization: Fast Server-Side Distinct Metadata RPC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_distinct_metadata()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'classes', COALESCE((SELECT json_agg(DISTINCT present_class) FROM public.students WHERE present_class IS NOT NULL), '[]'::json),
    'sections', COALESCE((SELECT json_agg(DISTINCT present_section) FROM public.students WHERE present_section IS NOT NULL), '[]'::json),
    'admissionYears', COALESCE((SELECT json_agg(DISTINCT admission_year ORDER BY admission_year DESC) FROM public.students WHERE admission_year IS NOT NULL), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_distinct_metadata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_distinct_metadata() TO authenticated, service_role;
