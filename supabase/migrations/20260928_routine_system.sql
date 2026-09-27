-- ============================================================
-- Migration: Routine Forge Pro Timetable Generator System
-- Date: 2026-09-28
--
-- Tables:
-- 1. routine_settings: Global scheduling constraints and settings
-- 2. routine_classes: Classes and sections with daily period limits
-- 3. routine_subjects: Subjects, difficulty, lab format, time preferences
-- 4. routine_rooms: General classrooms and specialized laboratories
-- 5. routine_teacher_availability: Teacher slot availability & max limits
-- 6. routine_assignments: Workload mapping (Class + Subject + Teacher + Room)
-- 7. routine_generated_cache: Stored generated timetable results
-- ============================================================

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS public.routine_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  working_days INT[] NOT NULL DEFAULT '{0,1,2,3,4,5}',
  periods_per_day INT NOT NULL DEFAULT 8,
  half_days INT[] NOT NULL DEFAULT '{5}',
  half_day_periods INT NOT NULL DEFAULT 4,
  breaks INT[] NOT NULL DEFAULT '{4}',
  tch_daily_max INT NOT NULL DEFAULT 5,
  tch_consec_max INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Classes Table
CREATE TABLE IF NOT EXISTS public.routine_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name VARCHAR(100) NOT NULL,
  section VARCHAR(50) NOT NULL DEFAULT 'A',
  daily_periods INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_routine_class_section UNIQUE (class_name, section)
);

-- 3. Subjects Table
CREATE TABLE IF NOT EXISTS public.routine_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50),
  is_hard BOOLEAN NOT NULL DEFAULT false,
  is_lab BOOLEAN NOT NULL DEFAULT false,
  time_pref VARCHAR(20) NOT NULL DEFAULT 'any', -- 'any', 'morning', 'afternoon'
  allow_multiple_per_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Rooms Table
CREATE TABLE IF NOT EXISTS public.routine_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  is_lab BOOLEAN NOT NULL DEFAULT false,
  capacity INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Teacher Availability Table
CREATE TABLE IF NOT EXISTS public.routine_teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  teacher_name VARCHAR(255) NOT NULL,
  short_name VARCHAR(10),
  max_periods INT NOT NULL DEFAULT 24,
  available_slots JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "0": [1,2,3,4,5,6,7,8], ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_routine_teacher_id UNIQUE (teacher_id)
);

-- 6. Workload Assignments Table
CREATE TABLE IF NOT EXISTS public.routine_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.routine_classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.routine_subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.routine_teacher_availability(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.routine_rooms(id) ON DELETE SET NULL,
  periods_per_week INT NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_routine_class_subject UNIQUE (class_id, subject_id)
);

-- 7. Generated Routine Cache Table
CREATE TABLE IF NOT EXISTS public.routine_generated_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL DEFAULT 'Main Academic Routine',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  grid JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_routine_assignments_class ON public.routine_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_routine_assignments_teacher ON public.routine_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_routine_assignments_subject ON public.routine_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_routine_teacher_avail_tid ON public.routine_teacher_availability(teacher_id);
CREATE INDEX IF NOT EXISTS idx_routine_generated_active ON public.routine_generated_cache(is_active);

-- Enable RLS
ALTER TABLE public.routine_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_generated_cache ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for Authenticated Users (and Admin)
CREATE POLICY "authenticated_select_routine_settings" ON public.routine_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_routine_settings" ON public.routine_settings FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_routine_classes" ON public.routine_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_routine_classes" ON public.routine_classes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_routine_subjects" ON public.routine_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_routine_subjects" ON public.routine_subjects FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_routine_rooms" ON public.routine_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_routine_rooms" ON public.routine_rooms FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_routine_teacher_avail" ON public.routine_teacher_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_routine_teacher_avail" ON public.routine_teacher_availability FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_routine_assignments" ON public.routine_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_routine_assignments" ON public.routine_assignments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_routine_cache" ON public.routine_generated_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_routine_cache" ON public.routine_generated_cache FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
