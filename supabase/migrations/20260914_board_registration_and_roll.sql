-- ============================================================
-- Migration: Add board_registration_no and board_roll_no
-- Adds Board Registration and Roll Number fields for Class 10, 11, 12
-- ============================================================

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS board_registration_no TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS board_roll_no TEXT;

CREATE INDEX IF NOT EXISTS idx_students_board_registration_no ON public.students(board_registration_no);
CREATE INDEX IF NOT EXISTS idx_students_board_roll_no ON public.students(board_roll_no);
