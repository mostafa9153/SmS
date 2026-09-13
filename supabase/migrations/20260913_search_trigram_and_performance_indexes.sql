-- ============================================================
-- Migration: Trigram and Composite Performance Indexes
-- Eliminates sequential table scans on student directory search and filtering
-- ============================================================

-- 1. Enable pg_trgm for wildcard & substring ilike matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN Trigram indexes on searchable text fields
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_father_name_trgm ON public.students USING gin (father_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_school_id_trgm ON public.students USING gin (school_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_pen_trgm ON public.students USING gin (pen gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_mobile_trgm ON public.students USING gin (mobile gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_admission_no_trgm ON public.students USING gin (admission_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_students_unique_code_trgm ON public.students USING gin (student_unique_code gin_trgm_ops);

-- 3. Composite and B-Tree indexes for fast cohort filtering & sorting
CREATE INDEX IF NOT EXISTS idx_students_class_sec_roll ON public.students (present_class, present_section, present_roll);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (current_status);
CREATE INDEX IF NOT EXISTS idx_academic_history_student_id ON public.academic_history (student_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_desc ON public.audit_log (created_at DESC);
