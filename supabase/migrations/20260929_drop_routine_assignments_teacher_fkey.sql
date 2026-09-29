-- ============================================================
-- Migration: Drop Restrictive Foreign Key on Routine Assignments
-- Date: 2026-09-29
-- Allows teacher_id in routine_assignments to reference staff profiles
-- or custom routine teachers without foreign key constraints failing.
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'routine_assignments_teacher_id_fkey'
    ) THEN
        ALTER TABLE public.routine_assignments DROP CONSTRAINT routine_assignments_teacher_id_fkey;
    END IF;
END $$;
