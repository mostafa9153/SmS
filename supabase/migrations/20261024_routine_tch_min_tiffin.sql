-- Min teacher periods before/after tiffin on days the teacher teaches (0 = off)
ALTER TABLE public.routine_settings
  ADD COLUMN IF NOT EXISTS tch_min_before INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tch_min_after INT NOT NULL DEFAULT 0;
