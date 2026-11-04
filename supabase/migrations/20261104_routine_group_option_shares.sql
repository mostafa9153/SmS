-- A group subject can be shared by teachers, like an ordinary subject: Political Science 5 p/wk
-- taught 3 by SM and 2 by XY. shares = [{"teacherId": "<uuid>", "periods": 3}, ...] in group
-- periods; NULL means the option's teacher_id takes all of them (the old behaviour).
-- teacher_id keeps the first share's teacher so older readers still see a teacher.
ALTER TABLE public.routine_subject_group_options ADD COLUMN IF NOT EXISTS shares JSONB;

-- Rollback:
-- ALTER TABLE public.routine_subject_group_options DROP COLUMN IF EXISTS shares;
