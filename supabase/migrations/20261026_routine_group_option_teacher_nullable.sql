-- Group options are created with subjects only; teachers are assigned later
-- from the Teachers tab, so teacher_id must allow NULL.
ALTER TABLE public.routine_subject_group_options
  ALTER COLUMN teacher_id DROP NOT NULL;
