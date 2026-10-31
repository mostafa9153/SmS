-- Custom weekly slots a subject (or subject group) may use: {"<dayIndex>": [period, ...]}.
-- NULL = no restriction. A day missing from the map is unrestricted. Hard rule in the solver.
ALTER TABLE routine_subjects ADD COLUMN IF NOT EXISTS allowed_slots JSONB NULL;
ALTER TABLE routine_subject_groups ADD COLUMN IF NOT EXISTS allowed_slots JSONB NULL;
