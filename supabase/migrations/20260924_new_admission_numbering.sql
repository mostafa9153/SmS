-- ============================================================
-- Supabase Schema Migration: New Admission Numbering
-- ============================================================

-- 1. Create admission_counters table
CREATE TABLE IF NOT EXISTS admission_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    counter_type TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    last_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(counter_type, academic_year)
);

-- 2. Add form_no column to admission_applications table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admission_applications' AND column_name = 'form_no') THEN
        ALTER TABLE admission_applications ADD COLUMN form_no TEXT;
    END IF;
END $$;

-- 3. RPC to securely increment and get the next counter with an advisory lock
CREATE OR REPLACE FUNCTION next_admission_counter(p_type TEXT, p_year TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_value INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Generate a unique lock key based on the type and year to prevent concurrent inserts/updates racing
    v_lock_key := abs(hashtext(p_type || p_year))::bigint;
    
    -- Acquire advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- Try to insert or update the counter
    INSERT INTO admission_counters (counter_type, academic_year, last_value, updated_at)
    VALUES (p_type, p_year, 1, NOW())
    ON CONFLICT (counter_type, academic_year)
    DO UPDATE SET 
        last_value = admission_counters.last_value + 1,
        updated_at = NOW()
    RETURNING last_value INTO v_next_value;
    
    RETURN v_next_value;
END;
$$;

-- 4. RPC to generate a school ID
CREATE OR REPLACE FUNCTION generate_school_id(p_year TEXT, p_class TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_val INTEGER;
    v_reg_num TEXT;
BEGIN
    -- The REGNUM is a yearly sequential counter across all classes
    v_next_val := next_admission_counter('school_id_regnum', p_year);
    
    -- Format as 001, 002, etc. (3 digits minimum)
    v_reg_num := LPAD(v_next_val::TEXT, 3, '0');
    
    -- Format: MHS-{YEAR}-{CLASS}-{REGNUM}
    RETURN 'MHS-' || p_year || '-' || p_class || '-' || v_reg_num;
END;
$$;
