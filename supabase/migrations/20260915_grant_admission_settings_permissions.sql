-- ============================================================
-- Migration: Grant Table Privileges on admission_settings and admission_applications
-- Resolves 42501 permission denied errors for service_role and authenticated users
-- ============================================================

-- 1. Grant explicit privileges on admission_settings
GRANT ALL ON TABLE public.admission_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admission_settings TO authenticated;
GRANT SELECT ON TABLE public.admission_settings TO anon;

-- 2. Grant explicit privileges on admission_applications
GRANT ALL ON TABLE public.admission_applications TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admission_applications TO authenticated;
GRANT SELECT ON TABLE public.admission_applications TO anon;

-- 3. Ensure RLS policies exist and allow service_role and authenticated
DO $$
BEGIN
    -- Ensure service_role policy on admission_settings
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admission_settings'
    ) THEN
        DROP POLICY IF EXISTS "service_role_all_admission_settings" ON public.admission_settings;
        CREATE POLICY "service_role_all_admission_settings" ON public.admission_settings
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    -- Ensure service_role policy on admission_applications
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admission_applications'
    ) THEN
        DROP POLICY IF EXISTS "service_role_all_admission_applications" ON public.admission_applications;
        CREATE POLICY "service_role_all_admission_applications" ON public.admission_applications
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
