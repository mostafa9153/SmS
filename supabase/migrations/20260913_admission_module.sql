-- ============================================================
-- Supabase Schema Migration: Admission Module
-- Adds admission_applications, admission_settings,
-- and re_admission tracking to students table
-- ============================================================

-- 1. Create admission_applications table for Staging new admissions
CREATE TABLE IF NOT EXISTS admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no TEXT UNIQUE NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026',
  admission_type TEXT NOT NULL DEFAULT 'new', -- 'new' | 're'
  form_method TEXT NOT NULL DEFAULT 'offline', -- 'offline' | 'online' | 'ai_scan'
  target_class TEXT NOT NULL,
  target_section TEXT DEFAULT 'A',
  target_roll INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'admitted' | 'rejected'
  
  -- Student Personal Details
  student_name TEXT NOT NULL,
  photo_url TEXT,
  gender TEXT DEFAULT 'Male',
  date_of_birth DATE,
  father_name TEXT,
  mother_name TEXT,
  guardian_name TEXT,
  student_contact TEXT,
  alt_mobile TEXT,
  email TEXT,
  
  -- Address Details
  address TEXT,
  village TEXT,
  post_office TEXT,
  police_station TEXT,
  district TEXT,
  pincode TEXT,
  
  -- Category & Demographics
  religion TEXT DEFAULT 'Islam',
  social_category TEXT DEFAULT 'General',
  caste_certificate_no TEXT,
  aadhaar TEXT,
  blood_group TEXT,
  
  -- Previous Academic Records
  previous_school TEXT,
  previous_class TEXT,
  previous_roll TEXT,
  previous_marks TEXT,
  
  -- Fee & Payment Info
  fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_receipt_no TEXT,
  payment_mode TEXT DEFAULT 'Cash',
  
  -- Admission Confirmation & Register Linkage
  admitted_student_id TEXT,
  admitted_class TEXT,
  admitted_section TEXT,
  admitted_roll INTEGER,
  admitted_at TIMESTAMPTZ,
  admitted_by TEXT,
  
  -- AI Extraction & Metadata
  ai_extracted_data JSONB,
  scanned_image_url TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for admission_applications
CREATE INDEX IF NOT EXISTS idx_admission_app_no ON admission_applications(application_no);
CREATE INDEX IF NOT EXISTS idx_admission_status ON admission_applications(status);
CREATE INDEX IF NOT EXISTS idx_admission_target_class ON admission_applications(target_class);
CREATE INDEX IF NOT EXISTS idx_admission_created_at ON admission_applications(created_at DESC);

-- Enable RLS for admission_applications
ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated_all_admission_applications" ON admission_applications;
CREATE POLICY "allow_authenticated_all_admission_applications" ON admission_applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_select_admission_applications" ON admission_applications;
CREATE POLICY "allow_anon_select_admission_applications" ON admission_applications
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "allow_anon_insert_admission_applications" ON admission_applications;
CREATE POLICY "allow_anon_insert_admission_applications" ON admission_applications
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_admission_applications" ON admission_applications;
CREATE POLICY "service_role_all_admission_applications" ON admission_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 2. Create admission_settings table for AI Keys and Admission configurations
CREATE TABLE IF NOT EXISTS admission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL DEFAULT 'default' UNIQUE,
  ai_provider TEXT NOT NULL DEFAULT 'gemini', -- 'gemini' | 'openai'
  ai_api_key TEXT,
  ai_model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
  current_academic_year TEXT NOT NULL DEFAULT '2026',
  new_admission_active BOOLEAN NOT NULL DEFAULT TRUE,
  readmission_active BOOLEAN NOT NULL DEFAULT TRUE,
  fee_structure JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row if not exists
INSERT INTO admission_settings (school_id, ai_provider, ai_model, current_academic_year)
VALUES ('default', 'gemini', 'gemini-1.5-flash', '2026')
ON CONFLICT (school_id) DO NOTHING;

-- Enable RLS for admission_settings
ALTER TABLE admission_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_authenticated_all_admission_settings" ON admission_settings;
CREATE POLICY "allow_authenticated_all_admission_settings" ON admission_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_anon_read_admission_settings" ON admission_settings;
CREATE POLICY "allow_anon_read_admission_settings" ON admission_settings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "service_role_all_admission_settings" ON admission_settings;
CREATE POLICY "service_role_all_admission_settings" ON admission_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 3. Enhance students table for Re-admission tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS re_admission_status TEXT DEFAULT 'pending';
-- 'pending' | 'admitted' | 'not_admitted'
ALTER TABLE students ADD COLUMN IF NOT EXISTS re_admitted_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS re_admitted_session TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_invoice_queued BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS invoice_printed_at TIMESTAMPTZ;

-- Add index on re_admission_status
CREATE INDEX IF NOT EXISTS idx_students_re_admission ON students(re_admission_status);
CREATE INDEX IF NOT EXISTS idx_students_present_class_sec ON students(present_class, present_section);
