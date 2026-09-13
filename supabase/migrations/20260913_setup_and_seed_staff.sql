-- =========================================================================
-- COMPLETE STAFF MODULE SETUP & SEED SCRIPT
-- Run this entire script in your Supabase Dashboard -> SQL Editor
-- =========================================================================

-- 1. Enable pg_trgm extension for fast search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create Enums for staff types and statuses
DO $$ BEGIN
    CREATE TYPE public.staff_employee_type AS ENUM ('TEACHING', 'NON_TEACHING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.staff_status AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create the staff_profiles table
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    employee_type public.staff_employee_type NOT NULL,
    status public.staff_status DEFAULT 'ACTIVE',
    
    -- Primary Details
    dob DATE,
    gender VARCHAR(20),
    caste VARCHAR(50),
    designation VARCHAR(100),
    joining_date DATE,
    basic_pay NUMERIC(10, 2),
    profile_picture_url TEXT,
    
    -- JSONB Meta fields for high-performance scale (50+ fields)
    primary_meta JSONB DEFAULT '{}'::jsonb, 
    bank_details JSONB DEFAULT '{}'::jsonb,
    
    -- Personal Details
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    marital_status VARCHAR(50),
    blood_group VARCHAR(10),
    aadhaar_no VARCHAR(20),
    pan_no VARCHAR(20),
    differently_abled BOOLEAN DEFAULT false,
    personal_meta JSONB DEFAULT '{}'::jsonb,

    -- Contact Details
    present_address JSONB DEFAULT '{}'::jsonb,
    permanent_address JSONB DEFAULT '{}'::jsonb,
    mobile VARCHAR(20),
    landline VARCHAR(20),
    email VARCHAR(255),

    -- Professional Details
    service_type VARCHAR(100),
    appointment_memo VARCHAR(255),
    professional_meta JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_staff_profiles_employee_type ON public.staff_profiles(employee_type);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_status ON public.staff_profiles(status);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_designation ON public.staff_profiles(designation);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_unique_id ON public.staff_profiles(unique_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_full_name_trgm ON public.staff_profiles USING GIN (full_name gin_trgm_ops);

-- 5. Permissions & Grants
GRANT ALL ON TABLE public.staff_profiles TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.staff_profiles TO anon;

-- 6. Row Level Security (RLS)
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_staff" ON public.staff_profiles;
CREATE POLICY "service_role_all_staff" ON public.staff_profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_staff" ON public.staff_profiles;
CREATE POLICY "authenticated_all_staff" ON public.staff_profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_staff" ON public.staff_profiles;
CREATE POLICY "anon_read_staff" ON public.staff_profiles
    FOR SELECT TO anon USING (true);

-- 7. Auto updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER set_staff_profiles_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_staff_updated_at();

-- 8. Seed Initial 20 Staff Records
INSERT INTO public.staff_profiles 
  (unique_id, full_name, caste, designation, mobile, dob, employee_type)
VALUES
  ('JZCL2654', 'SHAHIDULLAH GAYEN', 'General', 'TIC', '9800971797', '1978-01-05', 'TEACHING'),
  ('VHXJ9073', 'JYOTIRMAYEE MONDAL BAIDYA', 'General', 'AT', '9735654959', '1970-09-23', 'TEACHING'),
  ('YBFJ5304', 'SOUMITRA DAS', 'General', 'AT', '7585853874', '1980-10-09', 'TEACHING'),
  ('QVIM5922', 'ZULFIQUAR ALI BHANGI', 'General', 'AT', '7602272836', '1988-08-01', 'TEACHING'),
  ('JIJL3956', 'ANANYA KAYAL', 'General', 'AT', '9735754323', '1986-10-18', 'TEACHING'),
  ('JJOZ6427', 'PRATIK KAYAL', 'General', 'AT', '9932702385', '1989-03-29', 'TEACHING'),
  ('DZMU9189', 'ROSY BEGUM', 'General', 'AT', '9434400821', '1979-12-30', 'TEACHING'),
  ('MVON2065', 'DILIP KUMAR DAS', 'SC', 'AT', '9748633986', '1974-05-15', 'TEACHING'),
  ('GGNO6645', 'RIMA SANPUI', 'SC', 'AT', '9874070937', '1988-04-30', 'TEACHING'),
  ('DJQB1346', 'ASHIS KUMAR SHIT', 'SC', 'AT', '8918781252', '1977-06-30', 'TEACHING'),
  ('ROPO9605', 'MIHIR HEMBRAM', 'ST', 'AT', '9732272072', '1986-11-19', 'TEACHING'),
  ('AVAZ6656', 'BURHANUDDIN MOLLA', 'OBC-A', 'AT', '9679990246', '1989-08-15', 'TEACHING'),
  ('FDBV3581', 'TRIDIB DAS', 'OBC-B', 'AT', '9474873755', '1978-06-22', 'TEACHING'),
  ('ARRH2079', 'ANIMESH GHOSH', 'OBC-B', 'AT', '8013106869', '1991-03-21', 'TEACHING'),
  ('EEBP8337', 'MEGHNAD PAIK', 'SC', 'GROUP D', '8910381768', '1988-03-08', 'NON_TEACHING'),
  ('557253', 'ABDUL ALIM AKHAN', 'OBC-A', 'PARA TEACHER', '9732413884', '1965-11-19', 'TEACHING'),
  ('557394', 'SAHANA KHATUN', 'OBC-A', 'PARA TEACHER', '7980678354', '1981-11-05', 'TEACHING'),
  ('557295', 'MD DULA ROHIM GAZI', 'OBC-A', 'PARA TEACHER', '9932332576', '1982-03-10', 'TEACHING'),
  ('557327', 'NASIMA KHATUN', 'OBC-A', 'PARA TEACHER', '9732447335', '1981-02-27', 'TEACHING'),
  ('YHKY2646', 'SALMAN MOLLA', 'General', 'ICT instructor', '7602681067', '1980-01-09', 'TEACHING')
ON CONFLICT (unique_id) DO NOTHING;
