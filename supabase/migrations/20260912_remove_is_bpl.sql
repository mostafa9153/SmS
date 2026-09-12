-- Migration: Remove is_bpl column from students table as per user requirement
-- Date: 2026-09-12

ALTER TABLE IF EXISTS public.students DROP COLUMN IF EXISTS is_bpl;
