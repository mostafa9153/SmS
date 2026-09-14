-- ============================================================
-- Migration: Add father_occupation and mother_occupation
-- Adds parental occupation fields to public.students table
-- ============================================================

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_occupation TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_occupation TEXT;

CREATE INDEX IF NOT EXISTS idx_students_father_occupation ON public.students(father_occupation);
CREATE INDEX IF NOT EXISTS idx_students_mother_occupation ON public.students(mother_occupation);
