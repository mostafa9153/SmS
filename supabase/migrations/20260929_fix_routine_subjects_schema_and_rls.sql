-- ============================================================
-- Migration: Fix Routine Subjects Schema & RLS Permissions
-- Date: 2026-09-29
-- ============================================================

-- 1. Ensure columns exist on routine_subjects
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_subjects' AND column_name = 'class_name') THEN
        ALTER TABLE public.routine_subjects ADD COLUMN class_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_subjects' AND column_name = 'class_id') THEN
        ALTER TABLE public.routine_subjects ADD COLUMN class_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_subjects' AND column_name = 'stream') THEN
        ALTER TABLE public.routine_subjects ADD COLUMN stream VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_subjects' AND column_name = 'is_common') THEN
        ALTER TABLE public.routine_subjects ADD COLUMN is_common BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_subjects' AND column_name = 'max_per_day') THEN
        ALTER TABLE public.routine_subjects ADD COLUMN max_per_day INT NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routine_subjects' AND column_name = 'periods_per_week') THEN
        ALTER TABLE public.routine_subjects ADD COLUMN periods_per_week INT NOT NULL DEFAULT 5;
    END IF;

    -- Allow routine_teacher_availability to store custom teachers without strict FK blockage
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'routine_teacher_availability_teacher_id_fkey'
    ) THEN
        ALTER TABLE public.routine_teacher_availability DROP CONSTRAINT routine_teacher_availability_teacher_id_fkey;
    END IF;
END $$;

-- 2. Grant table permissions
GRANT ALL ON TABLE public.routine_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.routine_classes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.routine_subjects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.routine_rooms TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.routine_teacher_availability TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.routine_assignments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.routine_generated_cache TO anon, authenticated, service_role;

-- 3. Update RLS Policies to allow full read & write for active app users
DO $$
BEGIN
    -- routine_settings
    ALTER TABLE public.routine_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_all_routine_settings" ON public.routine_settings;
    CREATE POLICY "public_all_routine_settings" ON public.routine_settings FOR ALL USING (true) WITH CHECK (true);

    -- routine_classes
    ALTER TABLE public.routine_classes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_all_routine_classes" ON public.routine_classes;
    CREATE POLICY "public_all_routine_classes" ON public.routine_classes FOR ALL USING (true) WITH CHECK (true);

    -- routine_subjects
    ALTER TABLE public.routine_subjects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_all_routine_subjects" ON public.routine_subjects;
    CREATE POLICY "public_all_routine_subjects" ON public.routine_subjects FOR ALL USING (true) WITH CHECK (true);

    -- routine_rooms
    ALTER TABLE public.routine_rooms ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_all_routine_rooms" ON public.routine_rooms;
    CREATE POLICY "public_all_routine_rooms" ON public.routine_rooms FOR ALL USING (true) WITH CHECK (true);

    -- routine_teacher_availability
    ALTER TABLE public.routine_teacher_availability ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_all_routine_teacher_avail" ON public.routine_teacher_availability;
    CREATE POLICY "public_all_routine_teacher_avail" ON public.routine_teacher_availability FOR ALL USING (true) WITH CHECK (true);

    -- routine_assignments
    ALTER TABLE public.routine_assignments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_all_routine_assignments" ON public.routine_assignments;
    CREATE POLICY "public_all_routine_assignments" ON public.routine_assignments FOR ALL USING (true) WITH CHECK (true);

    -- routine_generated_cache
    ALTER TABLE public.routine_generated_cache ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_all_routine_cache" ON public.routine_generated_cache;
    CREATE POLICY "public_all_routine_cache" ON public.routine_generated_cache FOR ALL USING (true) WITH CHECK (true);
END $$;
