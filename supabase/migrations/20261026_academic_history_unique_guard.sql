-- Idempotency guard: one academic_history row per student per year per semester.
-- Aborts (no data changed) if duplicates exist; run the diagnostic below, fix them, then re-apply.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.academic_history
    GROUP BY student_id, year, COALESCE(semester, '')
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate academic_history rows exist for (student_id, year, semester). Resolve them first.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_history_student_year_sem
  ON public.academic_history (student_id, year, COALESCE(semester, ''));

-- Diagnostic (read-only):
-- SELECT student_id, year, COALESCE(semester, '') AS semester, COUNT(*)
-- FROM public.academic_history GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
--
-- Rollback:
-- DROP INDEX IF EXISTS public.uq_academic_history_student_year_sem;
