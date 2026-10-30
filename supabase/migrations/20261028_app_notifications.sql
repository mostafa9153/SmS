-- ============================================================
-- App notifications (dashboard bell)
-- One row per event, addressed to a single user or to a role.
-- Per-user read/clear state lives in app_notification_receipts so a
-- role-wide alert is stored once, not copied per recipient.
-- Accessed through /api/notifications (service role, explicit filters);
-- RLS mirrors the same rules for any direct client access.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_role TEXT CHECK (recipient_role IN ('Admin', 'Staff', 'Teacher')),
  category TEXT NOT NULL DEFAULT 'activity' CHECK (category IN ('activity', 'system')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
  title VARCHAR(200) NOT NULL,
  message VARCHAR(2000) NOT NULL DEFAULT '',
  link TEXT,
  source VARCHAR(80),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_notifications_has_recipient CHECK (recipient_user_id IS NOT NULL OR recipient_role IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user ON public.app_notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_role ON public.app_notifications (recipient_role, created_at DESC);

CREATE TABLE IF NOT EXISTS public.app_notification_receipts (
  notification_id UUID NOT NULL REFERENCES public.app_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  cleared_at TIMESTAMPTZ,
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_app_notification_receipts_user ON public.app_notification_receipts (user_id);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notification_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_notifications_select_own" ON public.app_notifications;
CREATE POLICY "app_notifications_select_own" ON public.app_notifications
  FOR SELECT TO authenticated
  USING (
    recipient_user_id = (SELECT auth.uid())
    OR recipient_role = (SELECT role::text FROM public.user_roles WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "app_notification_receipts_own" ON public.app_notification_receipts;
CREATE POLICY "app_notification_receipts_own" ON public.app_notification_receipts
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Housekeeping: keep 90 days.
CREATE OR REPLACE FUNCTION public.prune_app_notifications() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.app_notifications WHERE created_at < NOW() - INTERVAL '90 days';
$$;
REVOKE ALL ON FUNCTION public.prune_app_notifications() FROM PUBLIC, anon, authenticated;
