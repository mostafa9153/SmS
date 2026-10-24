-- ============================================================
-- Migration: Routine Subject Groups (parallel elective blocks)
-- Date: 2026-10-25
--
-- Adds support for subject groups (parallel options in the same
-- time slot), e.g. 3rd language (Arabic | Sanskrit), XI Science
-- (Math | Biology | Computer), or XI Arts elective columns.
--
-- Tables:
-- 1. routine_subject_groups           (group header)
-- 2. routine_subject_group_sections   (members, scope='section')
-- 3. routine_subject_group_options    (parallel options per group)
-- ============================================================

-- 1. Group Header
CREATE TABLE IF NOT EXISTS public.routine_subject_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  scope VARCHAR(16) NOT NULL CHECK (scope IN ('class', 'section')),
  class_name VARCHAR(100),            -- used when scope='class'
  stream VARCHAR(50),                 -- optional stream filter for scope='class'
  pooled BOOLEAN NOT NULL DEFAULT false,
  periods_per_week INT NOT NULL DEFAULT 1,
  period_size SMALLINT NOT NULL DEFAULT 1 CHECK (period_size IN (1, 2)),
  time_pref VARCHAR(20) NOT NULL DEFAULT 'any', -- 'any' | 'morning' | 'afternoon'
  max_per_day INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Section Membership (scope='section' only)
--    When a section is removed from routine_classes, group membership
--    is cleaned up automatically via CASCADE.
CREATE TABLE IF NOT EXISTS public.routine_subject_group_sections (
  group_id UUID NOT NULL REFERENCES public.routine_subject_groups(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.routine_classes(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, class_id)
);

-- 3. Parallel Options
--    When a subject is removed from routine_subjects, the related
--    option row is removed as well. room_id is nullable (SET NULL on
--    room delete). teacher_id follows the existing project pattern of
--    NOT constraining via FK (teacher ids can originate from
--    staff_profiles or be locally generated).
CREATE TABLE IF NOT EXISTS public.routine_subject_group_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.routine_subject_groups(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.routine_subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL,
  room_id UUID REFERENCES public.routine_rooms(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rsg_scope ON public.routine_subject_groups(scope);
CREATE INDEX IF NOT EXISTS idx_rsg_class_name ON public.routine_subject_groups(class_name);
CREATE INDEX IF NOT EXISTS idx_rsg_sort ON public.routine_subject_groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_rsgs_group ON public.routine_subject_group_sections(group_id);
CREATE INDEX IF NOT EXISTS idx_rsgs_class ON public.routine_subject_group_sections(class_id);
CREATE INDEX IF NOT EXISTS idx_rsgo_group ON public.routine_subject_group_options(group_id);
CREATE INDEX IF NOT EXISTS idx_rsgo_subject ON public.routine_subject_group_options(subject_id);
CREATE INDEX IF NOT EXISTS idx_rsgo_teacher ON public.routine_subject_group_options(teacher_id);
CREATE INDEX IF NOT EXISTS idx_rsgo_room ON public.routine_subject_group_options(room_id);

-- RLS: match existing routine_* open-policy pattern
ALTER TABLE public.routine_subject_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_subject_group_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_subject_group_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_rsg" ON public.routine_subject_groups
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_rsg" ON public.routine_subject_groups
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_rsgs" ON public.routine_subject_group_sections
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_rsgs" ON public.routine_subject_group_sections
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_select_rsgo" ON public.routine_subject_group_options
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_all_rsgo" ON public.routine_subject_group_options
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
