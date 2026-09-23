-- ============================================================
-- Migration: Teacher Workspace System v2 Architecture
-- Date: 2026-09-22
--
-- 1. teacher_permission_grants: Time-bound auto-expiring permissions
-- 2. teacher_chat_messages: Real-time Teacher Lounge chat
-- 3. teacher_absences: Multi-date teacher absence records & alerts
-- 4. student_marks: Summative marks entry (S1, S2, S3)
-- 5. teacher_push_subscriptions: Web push notification endpoints
-- 6. teacher_routine_slots: Teacher timetable & routine scheduling
-- ============================================================

-- ------------------------------------------------------------
-- 1. Teacher Permission Grants (Time-bound auto-expiring perms)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  task_id UUID REFERENCES public.teacher_tasks(id) ON DELETE SET NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_permission_grants_lookup ON public.teacher_permission_grants(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_teacher_permission_grants_task ON public.teacher_permission_grants(task_id);

-- ------------------------------------------------------------
-- 2. Teacher Lounge Chat Messages (Real-time communications)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  sender_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_chat_messages_created ON public.teacher_chat_messages(created_at DESC);

-- ------------------------------------------------------------
-- 3. Teacher Absences (Multi-date absence tracker & admin alerts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  dates DATE[] NOT NULL DEFAULT '{}',
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'RECORDED', -- 'RECORDED', 'APPROVED', 'CANCELLED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_absences_dates ON public.teacher_absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_teacher_absences_teacher ON public.teacher_absences(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_absences_created ON public.teacher_absences(created_at DESC);

-- ------------------------------------------------------------
-- 4. Student Summative Marks (S1, S2, S3 exam scores)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name VARCHAR(255),
  roll_no VARCHAR(50),
  class_name VARCHAR(50) NOT NULL,
  section VARCHAR(50) NOT NULL DEFAULT 'ALL',
  subject VARCHAR(100) NOT NULL,
  exam_type VARCHAR(50) NOT NULL, -- 'S1', 'S2', 'S3'
  full_marks NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  marks_obtained NUMERIC(5,2),
  grade VARCHAR(10),
  remarks TEXT,
  entered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_subject_exam UNIQUE (student_id, academic_year, class_name, subject, exam_type)
);

CREATE INDEX IF NOT EXISTS idx_student_marks_lookup ON public.student_marks(class_name, section, subject, academic_year, exam_type);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON public.student_marks(student_id);

-- ------------------------------------------------------------
-- 5. Teacher Web Push Subscriptions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_push_subscriptions_user ON public.teacher_push_subscriptions(user_id);

-- ------------------------------------------------------------
-- 6. Teacher Routine / Timetable Slots
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_routine_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  day_of_week VARCHAR(20) NOT NULL, -- 'Monday', 'Tuesday', etc.
  period_number INT NOT NULL,
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  class_name VARCHAR(50) NOT NULL,
  section VARCHAR(50) NOT NULL DEFAULT 'A',
  subject VARCHAR(100) NOT NULL,
  room_no VARCHAR(50),
  academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_routine_teacher ON public.teacher_routine_slots(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_teacher_routine_class ON public.teacher_routine_slots(class_name, section, day_of_week);

-- ------------------------------------------------------------
-- 7. Student Attendance (Daily class roll-call & headcount)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name VARCHAR(255),
  roll_no VARCHAR(50),
  class_name VARCHAR(50) NOT NULL,
  section VARCHAR(50) NOT NULL DEFAULT 'A',
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
  remarks TEXT,
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_daily_attendance UNIQUE (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_lookup ON public.student_attendance(class_name, section, attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON public.student_attendance(student_id);

-- ------------------------------------------------------------
-- 8. Row Level Security & Access Grants
-- ------------------------------------------------------------
GRANT ALL ON TABLE public.teacher_permission_grants TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.teacher_chat_messages TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.teacher_absences TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.student_marks TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.teacher_push_subscriptions TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.teacher_routine_slots TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.student_attendance TO postgres, authenticated, service_role;

ALTER TABLE public.teacher_permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_routine_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_student_attendance" ON public.student_attendance;
CREATE POLICY "service_role_student_attendance" ON public.student_attendance
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_manage_student_attendance" ON public.student_attendance;
CREATE POLICY "authenticated_manage_student_attendance" ON public.student_attendance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.teacher_permission_grants FROM anon;
REVOKE ALL ON TABLE public.teacher_chat_messages FROM anon;
REVOKE ALL ON TABLE public.teacher_absences FROM anon;
REVOKE ALL ON TABLE public.student_marks FROM anon;
REVOKE ALL ON TABLE public.teacher_push_subscriptions FROM anon;
REVOKE ALL ON TABLE public.teacher_routine_slots FROM anon;

-- Service Role Policies
CREATE POLICY "service_role_teacher_permission_grants" ON public.teacher_permission_grants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_teacher_chat_messages" ON public.teacher_chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_teacher_absences" ON public.teacher_absences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_student_marks" ON public.student_marks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_teacher_push_subscriptions" ON public.teacher_push_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_teacher_routine_slots" ON public.teacher_routine_slots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Policies
-- Permission Grants
CREATE POLICY "authenticated_read_permission_grants" ON public.teacher_permission_grants
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_mutate_permission_grants" ON public.teacher_permission_grants
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Chat Messages
CREATE POLICY "authenticated_read_chat_messages" ON public.teacher_chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_chat_messages" ON public.teacher_chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_update_chat_messages" ON public.teacher_chat_messages
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Absences
CREATE POLICY "authenticated_read_absences" ON public.teacher_absences
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_absences" ON public.teacher_absences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admin_mutate_absences" ON public.teacher_absences
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Student Marks
CREATE POLICY "authenticated_read_student_marks" ON public.student_marks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_mutate_student_marks" ON public.student_marks
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Push Subscriptions
CREATE POLICY "user_manage_push_subscriptions" ON public.teacher_push_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Routine Slots
CREATE POLICY "authenticated_read_routine_slots" ON public.teacher_routine_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_mutate_routine_slots" ON public.teacher_routine_slots
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Realtime Publication for Teacher Chat
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_chat_messages;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
