-- ============================================================
-- Migration: Teacher Management System Architecture
-- Date: 2026-09-16
-- 
-- 1. user_roles Extension: staff_id link and granular permissions
-- 2. teacher_class_assignments: Class & Subject Teacher mapping
-- 3. teacher_tasks & teacher_task_assignees: Multi-teacher task assignment
-- 4. teacher_activity_logs: Real-time action and fee collection tracking
-- 5. teacher_notifications: In-app alerts for tasks and updates
-- 6. admission_invoices: Add collector audit columns
-- 7. High-performance helper RPCs for dashboard analytics
-- ============================================================

-- ------------------------------------------------------------
-- 0. Ensure 'Teacher' exists in app_role enum (if app_role enum exists)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Teacher';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1. Extend user_roles with staff_id and granular permissions
-- ------------------------------------------------------------
DO $$
BEGIN
  -- Add staff_id referencing staff_profiles if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD COLUMN staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add permissions jsonb column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD COLUMN permissions JSONB DEFAULT '{
      "can_generate_invoices": true,
      "can_generate_marksheets": true,
      "can_generate_certificates": false,
      "can_handle_readmission": true,
      "can_generate_admit_cards": true,
      "allowed_classes": []
    }'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_staff_id ON public.user_roles(staff_id);

-- ------------------------------------------------------------
-- 2. Class and Subject Teacher Assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  academic_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  class_name VARCHAR(50) NOT NULL, -- e.g. 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
  section VARCHAR(50) NOT NULL DEFAULT 'ALL', -- 'A', 'B', 'C', 'ALL'
  role_type VARCHAR(50) NOT NULL DEFAULT 'SUBJECT_TEACHER', -- 'CLASS_TEACHER' or 'SUBJECT_TEACHER'
  subject VARCHAR(100), -- Subject taught, e.g. 'Mathematics', 'Bengali', or NULL for class teacher
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher ON public.teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_lookup ON public.teacher_class_assignments(class_name, section, academic_year);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_user ON public.teacher_class_assignments(user_id);

-- ------------------------------------------------------------
-- 3. Teacher Tasks & Multi-Teacher Assignees
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- 'RE_ADMISSION', 'MARKSHEET', 'INVOICE_COLLECTION', 'GENERAL'
  target_class VARCHAR(50),
  target_section VARCHAR(50),
  due_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_tasks_status ON public.teacher_tasks(status);
CREATE INDEX IF NOT EXISTS idx_teacher_tasks_created_at ON public.teacher_tasks(created_at DESC);

CREATE TABLE IF NOT EXISTS public.teacher_task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.teacher_tasks(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED', -- 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'
  completion_report JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "students_count": 15, "fees_collected": 3500, "notes": "Completed for section A", "submitted_at": "..." }
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_task_teacher UNIQUE (task_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_task_assignees_task ON public.teacher_task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_teacher_task_assignees_teacher ON public.teacher_task_assignees(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_task_assignees_user ON public.teacher_task_assignees(user_id);

-- ------------------------------------------------------------
-- 4. Teacher Activity & Fee Collection Logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  teacher_name VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 'RE_ADMISSION', 'INVOICE_GENERATED', 'MARKSHEET_GENERATED', 'CERTIFICATE_GENERATED'
  target_student_id VARCHAR(100),
  target_student_name VARCHAR(255),
  student_class VARCHAR(50),
  section VARCHAR(50),
  amount_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Invoice number, receipt number, subjects, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_activity_user_created ON public.teacher_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_activity_teacher_id ON public.teacher_activity_logs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_activity_action_type ON public.teacher_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_teacher_activity_created_at ON public.teacher_activity_logs(created_at DESC);

-- ------------------------------------------------------------
-- 5. Teacher Notifications
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_notifications_user_read ON public.teacher_notifications(user_id, is_read, created_at DESC);

-- ------------------------------------------------------------
-- 6. Extend admission_invoices with Collector Info
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admission_invoices' AND column_name = 'collected_by'
  ) THEN
    ALTER TABLE public.admission_invoices 
    ADD COLUMN collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'admission_invoices' AND column_name = 'collector_name'
  ) THEN
    ALTER TABLE public.admission_invoices 
    ADD COLUMN collector_name VARCHAR(255);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admission_invoices_collector ON public.admission_invoices(collected_by);

-- ------------------------------------------------------------
-- 7. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_notifications ENABLE ROW LEVEL SECURITY;

-- Revoke anon access
REVOKE ALL ON TABLE public.teacher_class_assignments FROM anon;
REVOKE ALL ON TABLE public.teacher_tasks FROM anon;
REVOKE ALL ON TABLE public.teacher_task_assignees FROM anon;
REVOKE ALL ON TABLE public.teacher_activity_logs FROM anon;
REVOKE ALL ON TABLE public.teacher_notifications FROM anon;

-- Service Role policies
DROP POLICY IF EXISTS "service_role_teacher_class_assignments" ON public.teacher_class_assignments;
CREATE POLICY "service_role_teacher_class_assignments" ON public.teacher_class_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_teacher_tasks" ON public.teacher_tasks;
CREATE POLICY "service_role_teacher_tasks" ON public.teacher_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_teacher_task_assignees" ON public.teacher_task_assignees;
CREATE POLICY "service_role_teacher_task_assignees" ON public.teacher_task_assignees
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_teacher_activity_logs" ON public.teacher_activity_logs;
CREATE POLICY "service_role_teacher_activity_logs" ON public.teacher_activity_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_teacher_notifications" ON public.teacher_notifications;
CREATE POLICY "service_role_teacher_notifications" ON public.teacher_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Policies
-- Class Assignments: All authenticated can read, only Admin can mutate
DROP POLICY IF EXISTS "authenticated_read_class_assignments" ON public.teacher_class_assignments;
CREATE POLICY "authenticated_read_class_assignments" ON public.teacher_class_assignments
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "admin_mutate_class_assignments" ON public.teacher_class_assignments;
CREATE POLICY "admin_mutate_class_assignments" ON public.teacher_class_assignments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tasks: Authenticated can read, Admin can mutate all
DROP POLICY IF EXISTS "authenticated_read_tasks" ON public.teacher_tasks;
CREATE POLICY "authenticated_read_tasks" ON public.teacher_tasks
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "admin_mutate_tasks" ON public.teacher_tasks;
CREATE POLICY "admin_mutate_tasks" ON public.teacher_tasks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Task Assignees: Authenticated can read, Assignee can update their own status, Admin can do all
DROP POLICY IF EXISTS "authenticated_read_task_assignees" ON public.teacher_task_assignees;
CREATE POLICY "authenticated_read_task_assignees" ON public.teacher_task_assignees
  FOR SELECT TO authenticated USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "assignee_update_own_status" ON public.teacher_task_assignees;
CREATE POLICY "assignee_update_own_status" ON public.teacher_task_assignees
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "admin_mutate_task_assignees" ON public.teacher_task_assignees;
CREATE POLICY "admin_mutate_task_assignees" ON public.teacher_task_assignees
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Activity Logs: Admins can view all, teachers can view own and insert their own actions
DROP POLICY IF EXISTS "authenticated_read_activity_logs" ON public.teacher_activity_logs;
CREATE POLICY "authenticated_read_activity_logs" ON public.teacher_activity_logs
  FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "authenticated_insert_activity_logs" ON public.teacher_activity_logs;
CREATE POLICY "authenticated_insert_activity_logs" ON public.teacher_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Notifications: Users can view and update their own notifications
DROP POLICY IF EXISTS "user_own_notifications" ON public.teacher_notifications;
CREATE POLICY "user_own_notifications" ON public.teacher_notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------
-- 8. High Performance Dashboard Aggregate RPCs
-- ------------------------------------------------------------
-- Teacher Dashboard Stats RPC (Zero latency aggregation)
CREATE OR REPLACE FUNCTION public.get_teacher_portal_stats(p_user_id UUID, p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_readmission_count INT;
  v_total_collected NUMERIC(10,2);
  v_tasks_pending INT;
  v_tasks_completed INT;
  v_marksheets_count INT;
BEGIN
  -- Re-admissions done by this user
  SELECT COUNT(*) INTO v_readmission_count
  FROM public.teacher_activity_logs
  WHERE user_id = p_user_id 
    AND action_type = 'RE_ADMISSION'
    AND EXTRACT(YEAR FROM created_at) = p_year;

  -- Total fee collected by this user
  SELECT COALESCE(SUM(amount_collected), 0) INTO v_total_collected
  FROM public.teacher_activity_logs
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM created_at) = p_year;

  -- Pending and completed tasks
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('ASSIGNED', 'IN_PROGRESS')),
    COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'APPROVED'))
  INTO v_tasks_pending, v_tasks_completed
  FROM public.teacher_task_assignees
  WHERE user_id = p_user_id;

  -- Marksheets generated
  SELECT COUNT(*) INTO v_marksheets_count
  FROM public.teacher_activity_logs
  WHERE user_id = p_user_id
    AND action_type = 'MARKSHEET_GENERATED'
    AND EXTRACT(YEAR FROM created_at) = p_year;

  RETURN json_build_object(
    'readmissionsCount', COALESCE(v_readmission_count, 0),
    'totalCollected', COALESCE(v_total_collected, 0.00),
    'tasksPending', COALESCE(v_tasks_pending, 0),
    'tasksCompleted', COALESCE(v_tasks_completed, 0),
    'marksheetsCount', COALESCE(v_marksheets_count, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_portal_stats(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_portal_stats(UUID, INT) TO authenticated, service_role;

-- Admin Teacher Performance Summary RPC
CREATE OR REPLACE FUNCTION public.get_admin_teacher_performance_summary(p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 
      sp.id AS teacher_id,
      sp.full_name AS teacher_name,
      sp.designation,
      ur.user_id,
      COALESCE(COUNT(tal.id) FILTER (WHERE tal.action_type = 'RE_ADMISSION'), 0) AS total_readmissions,
      COALESCE(SUM(tal.amount_collected), 0) AS total_fees_collected,
      COALESCE(COUNT(tal.id) FILTER (WHERE tal.action_type = 'MARKSHEET_GENERATED'), 0) AS total_marksheets,
      COALESCE(COUNT(tta.id) FILTER (WHERE tta.status = 'SUBMITTED' OR tta.status = 'APPROVED'), 0) AS tasks_completed,
      COALESCE(COUNT(tta.id) FILTER (WHERE tta.status IN ('ASSIGNED', 'IN_PROGRESS')), 0) AS tasks_pending
    FROM public.staff_profiles sp
    LEFT JOIN public.user_roles ur ON ur.staff_id = sp.id
    LEFT JOIN public.teacher_activity_logs tal ON tal.teacher_id = sp.id AND EXTRACT(YEAR FROM tal.created_at) = p_year
    LEFT JOIN public.teacher_task_assignees tta ON tta.teacher_id = sp.id
    WHERE sp.employee_type = 'TEACHING'
    GROUP BY sp.id, sp.full_name, sp.designation, ur.user_id
    ORDER BY total_fees_collected DESC, total_readmissions DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_teacher_performance_summary(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_teacher_performance_summary(INT) TO authenticated, service_role;
