-- ============================================================
-- Undo journal
-- Before a reversible action, the API stores the rows it is about to
-- change (before-images) and the steps that put them back. Undo replays
-- those steps once, within the expiry window, by the same user or an Admin.
-- Server-only (service role): RLS on, no policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.undoable_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(80) NOT NULL,
  label VARCHAR(300) NOT NULL,
  entity VARCHAR(80),
  entity_id TEXT,
  -- Ordered steps: [{ "table": "...", "op": "upsert", "rows": [...] } | { "table": "...", "op": "delete", "column": "id", "values": [...] }]
  restore_steps JSONB NOT NULL,
  -- Optional optimistic-concurrency guard: { "table": "...", "id": "...", "updated_at": "..." }
  guard JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_undoable_actions_actor ON public.undoable_actions (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_undoable_actions_expiry ON public.undoable_actions (expires_at);

ALTER TABLE public.undoable_actions ENABLE ROW LEVEL SECURITY;
