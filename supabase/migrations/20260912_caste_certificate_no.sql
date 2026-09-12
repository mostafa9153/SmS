-- Migration: Add caste_certificate_no column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS caste_certificate_no TEXT;
