-- A class-subject can be taught in parts: several teachers sharing the periods, or a theory part
-- and a lab part. The old UNIQUE(class_id, subject_id) forced one row, so splits overwrote each other.
ALTER TABLE public.routine_assignments
  ADD COLUMN IF NOT EXISTS is_lab BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.routine_assignments
  DROP CONSTRAINT IF EXISTS uq_routine_class_subject;

CREATE UNIQUE INDEX IF NOT EXISTS uq_routine_assignment_part
  ON public.routine_assignments (class_id, subject_id, teacher_id, is_lab);

-- A subject appears once per class and stream (natural key), so concurrent preset syncs cannot
-- create duplicates. Fails if duplicates already exist: clean them first.
CREATE UNIQUE INDEX IF NOT EXISTS uq_routine_subject_class_name
  ON public.routine_subjects (class_name, lower(btrim(name)), COALESCE(stream, ''))
  WHERE class_name IS NOT NULL;
