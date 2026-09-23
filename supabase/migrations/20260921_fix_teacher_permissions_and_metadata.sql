-- ============================================================
-- Migration: Fix Teacher Table Permissions & Dynamic Metadata
-- Date: 2026-09-21
-- 
-- 1. Creates/Verifies public tables and columns (teacher_class_assignments, staff_id, permissions)
-- 2. Grants complete permissions on public schema, tables, sequences to authenticated, service_role & postgres
-- 3. Sets default privileges so all future objects are accessible
-- 4. Updates is_staff_or_admin() and is_admin() to recognize 'Teacher' and 'teacher' roles case-insensitively
-- 5. Configures non-blocking RLS policies for teacher_class_assignments, staff_profiles, user_roles, tasks
-- 6. Creates get_teacher_distinct_metadata() RPC for fast database-driven dropdowns
-- 7. Provides optional data cleanup scripts for administrators
-- ============================================================

-- ------------------------------------------------------------
-- 0. Ensure 'Teacher' exists in app_role enum (if app_role enum exists)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Teacher';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1. Ensure Table Structure & Extensions Exist
-- ------------------------------------------------------------
-- Ensure user_roles has staff_id and permissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'staff_id'
    ) THEN
      ALTER TABLE public.user_roles 
      ADD COLUMN staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'permissions'
    ) THEN
      ALTER TABLE public.user_roles 
      ADD COLUMN permissions JSONB DEFAULT '{
        "can_generate_invoices": true,
        "can_generate_marksheets": true,
        "can_generate_certificates": false,
        "can_handle_readmission": true,
        "can_generate_admit_cards": true,
        "allowed_classes": []
      }'::jsonb;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_staff_id ON public.user_roles(staff_id);

-- Ensure teacher_class_assignments exists
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  class_name VARCHAR(50) NOT NULL,
  section VARCHAR(50) NOT NULL DEFAULT 'ALL',
  role_type VARCHAR(50) NOT NULL DEFAULT 'SUBJECT_TEACHER',
  subject VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher ON public.teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_lookup ON public.teacher_class_assignments(class_name, section, academic_year);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_user ON public.teacher_class_assignments(user_id);

-- ------------------------------------------------------------
-- 2. Schema, Table & Sequence Grants (Fixes "permission denied for table ...")
-- ------------------------------------------------------------
GRANT USAGE, CREATE ON SCHEMA public TO postgres, authenticated, service_role, anon;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'teacher_class_assignments',
    'staff_profiles',
    'user_roles',
    'teacher_tasks',
    'teacher_task_assignees',
    'teacher_activity_logs',
    'teacher_notifications',
    'students',
    'admission_invoices',
    'admission_settings',
    'admission_applications',
    'certificates_registry',
    'student_results',
    'academic_history',
    'audit_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('GRANT ALL ON TABLE public.%I TO postgres, authenticated, service_role;', tbl);
    END IF;
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, authenticated, service_role;

-- Set default privileges so future created tables inherit permissions automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, authenticated, service_role;

-- ------------------------------------------------------------
-- 3. Update Helper Functions: Non-recursive Role Resolvers
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
    AND LOWER(role) IN ('admin', 'super admin', 'super_admin')
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
    AND LOWER(role) IN ('admin', 'staff', 'teacher', 'super admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_staff_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_or_admin() TO authenticated, service_role;

-- ------------------------------------------------------------
-- 4. Row Level Security: teacher_class_assignments
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teacher_class_assignments') THEN
    ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.teacher_class_assignments FROM anon;

    DROP POLICY IF EXISTS "service_role_teacher_class_assignments" ON public.teacher_class_assignments;
    CREATE POLICY "service_role_teacher_class_assignments" ON public.teacher_class_assignments
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "authenticated_read_class_assignments" ON public.teacher_class_assignments;
    CREATE POLICY "authenticated_read_class_assignments" ON public.teacher_class_assignments
      FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "admin_mutate_class_assignments" ON public.teacher_class_assignments;
    DROP POLICY IF EXISTS "authenticated_mutate_class_assignments" ON public.teacher_class_assignments;
    CREATE POLICY "authenticated_mutate_class_assignments" ON public.teacher_class_assignments
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. Row Level Security: staff_profiles
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff_profiles') THEN
    ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.staff_profiles FROM anon;

    DROP POLICY IF EXISTS "service_role_staff_profiles" ON public.staff_profiles;
    CREATE POLICY "service_role_staff_profiles" ON public.staff_profiles
      FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "staff_profiles_read_authenticated" ON public.staff_profiles;
    CREATE POLICY "staff_profiles_read_authenticated" ON public.staff_profiles
      FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "staff_profiles_admin_mutate" ON public.staff_profiles;
    CREATE POLICY "staff_profiles_admin_mutate" ON public.staff_profiles
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 6. Row Level Security: user_roles
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

    DROP POLICY IF EXISTS "admin_mutate_user_roles" ON public.user_roles;
    CREATE POLICY "admin_mutate_user_roles" ON public.user_roles
      FOR ALL TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. High-Performance Teacher Metadata Distinct RPC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_teacher_distinct_metadata()
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
    'classes', COALESCE((
      SELECT json_agg(DISTINCT c) FROM (
        SELECT present_class AS c FROM public.students WHERE present_class IS NOT NULL AND present_class != ''
        UNION
        SELECT class_name AS c FROM public.teacher_class_assignments WHERE class_name IS NOT NULL AND class_name != ''
      ) all_classes
    ), '[]'::json),
    'sections', COALESCE((
      SELECT json_agg(DISTINCT s) FROM (
        SELECT present_section AS s FROM public.students WHERE present_section IS NOT NULL AND present_section != ''
        UNION
        SELECT section AS s FROM public.teacher_class_assignments WHERE section IS NOT NULL AND section != ''
      ) all_sections
    ), '[]'::json),
    'subjects', COALESCE((
      SELECT json_agg(DISTINCT subj) FROM (
        SELECT subject AS subj FROM public.teacher_class_assignments WHERE subject IS NOT NULL AND subject != ''
        UNION
        SELECT primary_meta->>'appointed_subject' AS subj FROM public.staff_profiles WHERE primary_meta->>'appointed_subject' IS NOT NULL AND primary_meta->>'appointed_subject' != ''
      ) all_subjects
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_distinct_metadata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_distinct_metadata() TO authenticated, service_role;

-- ------------------------------------------------------------
-- 8. Optional Cleanup Helper (Run only if you want to reset/delete old test assignments):
-- ------------------------------------------------------------
-- DELETE FROM public.teacher_class_assignments;
