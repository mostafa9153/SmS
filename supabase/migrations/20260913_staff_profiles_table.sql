-- Migration: Create staff_profiles table and RLS policies
-- Date: 2026-09-13

-- 1. Create Enums for static fields to maintain data integrity
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

-- 2. Create the main staff_profiles table
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unique_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., JZCL2654
    full_name VARCHAR(255) NOT NULL,
    employee_type public.staff_employee_type NOT NULL,
    status public.staff_status DEFAULT 'ACTIVE',
    
    -- Primary Details
    dob DATE,
    gender VARCHAR(20),
    caste VARCHAR(50), -- General, SC, ST, OBC-A, OBC-B
    designation VARCHAR(100), -- TIC, AT, PARA TEACHER, Group D
    joining_date DATE,
    basic_pay NUMERIC(10, 2),
    profile_picture_url TEXT,
    
    -- Consolidating many primary fields into a JSONB for efficiency
    primary_meta JSONB DEFAULT '{}'::jsonb, 
    -- Contains: voter_id, vacancy_status, date_of_retirement, bill_type, first_joining_date, 
    -- date_first_joining_present, employee_group, academic_section, academic_group, 
    -- appointed_subject, approval_qualification, additional_qualification, cell, level,
    -- approval_appointment_no, approval_appointment_date
    
    bank_details JSONB DEFAULT '{}'::jsonb,
    -- Contains: bank_name, bank_branch, branch_code, account_no, ifsc_code, micr_no
    
    -- Personal Details
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    marital_status VARCHAR(50),
    blood_group VARCHAR(10),
    aadhaar_no VARCHAR(20),
    pan_no VARCHAR(20),
    differently_abled BOOLEAN DEFAULT false,
    
    -- Consolidating other personal fields
    personal_meta JSONB DEFAULT '{}'::jsonb,
    -- Contains: religion, mother_tongue, spouse_name, spouse_employed, spouse_employment_details, 
    -- spouse_pay, spouse_hra, health_scheme_opted, residential_status, assembly_constituency_no, 
    -- assembly_part_no, voter_sl_no_in_part, state_details_differently_abled, conveyance_allowance, 
    -- height_inch, identification_mark

    -- Contact Details
    present_address JSONB DEFAULT '{}'::jsonb,
    -- Contains: state, street, post_office, district, block_munc_corp, house_no, town_village, pin_code, sub_division, police_station
    
    permanent_address JSONB DEFAULT '{}'::jsonb,
    
    mobile VARCHAR(20),
    landline VARCHAR(20),
    email VARCHAR(255),

    -- Professional Details
    service_type VARCHAR(100),
    appointment_memo VARCHAR(255),
    
    professional_meta JSONB DEFAULT '{}'::jsonb,
    -- Contains: professional_qualification, year_of_possessing_qualification, other_professional_qualification, 
    -- post_status, mc_resolution_no_date, post_sanctioning_memo_no, opted_under_dcrb_scheme, 
    -- option_exercise_under, post_1981_pension_opted, name_of_treasury, date_cpf_refund, 
    -- amount_refunded, court_case_filed, case_no, case_year, case_related_with
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add Indexes for fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_staff_profiles_employee_type ON public.staff_profiles(employee_type);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_status ON public.staff_profiles(status);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_designation ON public.staff_profiles(designation);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_unique_id ON public.staff_profiles(unique_id);

-- Optional trigram index for full-text search on names
CREATE INDEX IF NOT EXISTS idx_staff_profiles_full_name_trgm ON public.staff_profiles USING GIN (full_name gin_trgm_ops);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies (Admins can do everything, authenticated users can read)
CREATE POLICY "Enable read access for authenticated users" 
    ON public.staff_profiles FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Enable all access for admins"
    ON public.staff_profiles FOR ALL
    TO authenticated
    USING ( true ); -- Temporary open access for development, adjust for production

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
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
    EXECUTE FUNCTION public.handle_updated_at();
