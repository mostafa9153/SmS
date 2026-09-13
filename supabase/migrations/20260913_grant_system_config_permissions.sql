-- ============================================================
-- Migration: Grant Table Privileges on system_config & certificates_registry
-- Resolves 42501 permission denied errors for service_role and authenticated users
-- ============================================================

-- 1. Grant explicit privileges on system_config
GRANT ALL ON TABLE public.system_config TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.system_config TO authenticated;

-- 2. Grant explicit privileges on certificates_registry
GRANT ALL ON TABLE public.certificates_registry TO service_role;
GRANT ALL ON TABLE public.certificates_registry TO authenticated;

-- 3. Grant on all sequences in public schema
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;

-- 4. Ensure RLS policies exist and allow service_role and authenticated
DO $$
BEGIN
    -- Ensure service_role policy on system_config
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_config'
    ) THEN
        DROP POLICY IF EXISTS "service_role_manage_all" ON public.system_config;
        CREATE POLICY "service_role_manage_all" ON public.system_config
            FOR ALL TO service_role USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "authenticated_read_system_config" ON public.system_config;
        CREATE POLICY "authenticated_read_system_config" ON public.system_config
            FOR SELECT TO authenticated USING (true);
    END IF;

    -- Ensure service_role policy on certificates_registry
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'certificates_registry'
    ) THEN
        DROP POLICY IF EXISTS "service_role_all_certificates" ON public.certificates_registry;
        CREATE POLICY "service_role_all_certificates" ON public.certificates_registry
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
