-- ============================================================
-- Migration: 20260926_student_status_lifecycle_foundation.sql
-- Description: Foundation schema for Student Status Lifecycle
--              - Adds present_semester, detention_count, tc_issued,
--                tc_date, tc_reason to students table.
--              - Adds semester, detention_count to academic_history table.
-- ============================================================

-- 1. Student Table additions for Semesters & Status Lifecycle
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS present_semester TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS detention_count INTEGER DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS tc_issued BOOLEAN DEFAULT FALSE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS tc_date DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS tc_reason TEXT;

-- 2. Academic History Table additions for Semester and Detention Tracking
ALTER TABLE public.academic_history ADD COLUMN IF NOT EXISTS semester TEXT;
ALTER TABLE public.academic_history ADD COLUMN IF NOT EXISTS detention_count INTEGER DEFAULT 0;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_students_semester ON public.students (present_semester);
CREATE INDEX IF NOT EXISTS idx_students_tc_issued ON public.students (tc_issued);

-- 4. Documentation Comments
COMMENT ON COLUMN public.students.present_semester IS 'Current active semester for Class 11 & 12 (Sem 1, Sem 2, Sem 3, Sem 4)';
COMMENT ON COLUMN public.students.detention_count IS 'Cumulative detention count for repeated academic years in same class';
COMMENT ON COLUMN public.students.tc_issued IS 'Flag indicating if Transfer Certificate (TC) has been issued';
COMMENT ON COLUMN public.students.tc_date IS 'Date when Transfer Certificate (TC) was issued';
COMMENT ON COLUMN public.students.tc_reason IS 'Reason recorded for student TC exit';
COMMENT ON COLUMN public.academic_history.semester IS 'Historical semester record for higher secondary levels';
COMMENT ON COLUMN public.academic_history.detention_count IS 'Detention count recorded during that academic year';
