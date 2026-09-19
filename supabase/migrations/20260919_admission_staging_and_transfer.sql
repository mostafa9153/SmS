-- ============================================================
-- Supabase Schema Migration: Staged Admission & Transfer
-- Adds staging columns, stream for Class XI, bank details,
-- document verification checklist, and transfer tracking
-- ============================================================

ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS stream TEXT;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS is_transferred_to_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS transferred_to_active_at TIMESTAMPTZ;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS kanyashree_id TEXT;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS verified_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS subject_combinations JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admission_is_transferred ON admission_applications(is_transferred_to_active);
CREATE INDEX IF NOT EXISTS idx_admission_admitted_class_sec ON admission_applications(admitted_class, admitted_section);
CREATE INDEX IF NOT EXISTS idx_admission_academic_year ON admission_applications(academic_year);
