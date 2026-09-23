-- ============================================================
-- Supabase Schema Migration: Admission Form & Receipt Tracker
-- ============================================================

-- Ensure helpful indexes on admission_applications for global tracking
CREATE INDEX IF NOT EXISTS idx_admission_app_form_method ON admission_applications(form_method);
CREATE INDEX IF NOT EXISTS idx_admission_app_academic_year ON admission_applications(academic_year);
CREATE INDEX IF NOT EXISTS idx_admission_app_type ON admission_applications(admission_type);
CREATE INDEX IF NOT EXISTS idx_admission_app_admitted_at ON admission_applications(admitted_at);
CREATE INDEX IF NOT EXISTS idx_admission_app_created_at ON admission_applications(created_at);

-- Ensure comment on admission_applications to document usage
COMMENT ON TABLE admission_applications IS 'Stores both online applicant records and offline printed blank/prefilled admission forms for unified tracking.';
