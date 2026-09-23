-- ============================================================
-- Migration: 20260924_student_profile_additional_fields.sql
-- Description: Add missing Bengali names, CWSN certificate no,
--              Gram Panchayat, Block, Madhyamik 7 subject marks,
--              BPL status & number, Bank Name & Branch to students table.
-- ============================================================

-- 1. Bengali script names
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_name_bengali TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name_bengali TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name_bengali TEXT;

-- 2. CWSN Certificate No
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS disability_certificate_no TEXT;

-- 3. Address details (Gram Panchayat & Block)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gram_panchayat TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS block TEXT;

-- 4. Class XI / Madhyamik 7 Subject Marks
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bengali_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS english_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS math_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS life_sci_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phy_sci_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS history_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS geo_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS total_madhyamik_marks NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS percentage_madhyamik NUMERIC;

-- 5. BPL details
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bpl_status TEXT DEFAULT 'NO';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bpl_no TEXT;

-- 6. Bank Name & Branch
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS bank_branch TEXT;

-- 7. Comments for documentation
COMMENT ON COLUMN public.students.student_name_bengali IS 'Student name in Bengali script';
COMMENT ON COLUMN public.students.father_name_bengali IS 'Father name in Bengali script';
COMMENT ON COLUMN public.students.mother_name_bengali IS 'Mother name in Bengali script';
COMMENT ON COLUMN public.students.disability_certificate_no IS 'CWSN Disability Certificate Registration Number';
COMMENT ON COLUMN public.students.gram_panchayat IS 'Gram Panchayat of present address';
COMMENT ON COLUMN public.students.block IS 'Block or Municipality of present address';
COMMENT ON COLUMN public.students.bengali_marks IS 'Madhyamik Bengali Subject Marks';
COMMENT ON COLUMN public.students.english_marks IS 'Madhyamik English Subject Marks';
COMMENT ON COLUMN public.students.math_marks IS 'Madhyamik Math Subject Marks';
COMMENT ON COLUMN public.students.life_sci_marks IS 'Madhyamik Life Science Subject Marks';
COMMENT ON COLUMN public.students.phy_sci_marks IS 'Madhyamik Physical Science Subject Marks';
COMMENT ON COLUMN public.students.history_marks IS 'Madhyamik History Subject Marks';
COMMENT ON COLUMN public.students.geo_marks IS 'Madhyamik Geography Subject Marks';
COMMENT ON COLUMN public.students.total_madhyamik_marks IS 'Madhyamik Total Marks out of 700';
COMMENT ON COLUMN public.students.percentage_madhyamik IS 'Madhyamik Overall Percentage';
COMMENT ON COLUMN public.students.bpl_status IS 'BPL Status (YES / NO)';
COMMENT ON COLUMN public.students.bpl_no IS 'BPL Ration Card Number';
COMMENT ON COLUMN public.students.bank_name IS 'Bank Name';
COMMENT ON COLUMN public.students.bank_branch IS 'Bank Branch Name';
