-- ============================================================
-- Rooms master (shared by EMS seat arrangement and Assets)
--
-- Replaces the system_config 'ems_rooms' JSON blob with a real table.
-- Exam rooms are imported from that blob with their old ids kept
-- ('room-101', 'room-<ts>'), because saved EMS allocations reference them.
-- Non-exam rooms (office, store, lab...) are added from the app later.
--
-- Deploy together with the EMS cut-over (EMS reads/writes /api/rooms).
-- The 'ems_rooms' key is left in place, untouched, as a rollback copy.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                    text NOT NULL CHECK (length(btrim(name)) > 0),
  kind                    text NOT NULL DEFAULT 'classroom'
                            CHECK (kind IN ('classroom','hall','lab','office','store','staff','other')),
  floor                   text,
  building                text,
  notes                   text,
  -- EMS: only rooms with is_exam_room and a non-empty layout are offered for seating
  is_exam_room            boolean NOT NULL DEFAULT false,
  ems_layout              jsonb   NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(ems_layout) = 'array'),
  default_seats_per_bench int     NOT NULL DEFAULT 2 CHECK (default_seats_per_bench BETWEEN 1 AND 6),
  -- Optional room in-charge; never required
  custodian_staff_id      uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  sort_order              int     NOT NULL DEFAULT 0,
  archived_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rooms_active_order ON public.rooms (sort_order, name) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS rooms_custodian ON public.rooms (custodian_staff_id) WHERE custodian_staff_id IS NOT NULL;

-- ---------- updated_at trigger ----------

CREATE OR REPLACE FUNCTION public.asset_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS rooms_updated_at ON public.rooms;
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.asset_touch_updated_at();

-- ---------- import EMS rooms from system_config ----------
-- Idempotent: re-running skips ids already present. Skips malformed entries.
-- A repeated name (case-insensitive) gets a " (2)", " (3)" suffix so the unique index below holds.

INSERT INTO public.rooms (id, name, kind, floor, building, notes, is_exam_room,
                          ems_layout, default_seats_per_bench, sort_order)
SELECT s.id,
       CASE WHEN s.dup = 1 THEN s.base ELSE s.base || ' (' || s.dup || ')' END,
       'classroom', s.floor, s.building, s.notes, true, s.ems_layout, s.seats, s.ord
FROM (
SELECT e.elem->>'id' AS id,
       COALESCE(NULLIF(btrim(e.elem->>'roomNumber'), ''), 'Room ' || e.ord) AS base,
       row_number() OVER (PARTITION BY lower(COALESCE(NULLIF(btrim(e.elem->>'roomNumber'), ''), 'Room ' || e.ord))
                          ORDER BY e.ord) AS dup,
       NULLIF(btrim(e.elem->>'floor'), '') AS floor,
       NULLIF(btrim(e.elem->>'building'), '') AS building,
       NULLIF(btrim(e.elem->>'notes'), '') AS notes,
       CASE WHEN jsonb_typeof(e.elem->'columns') = 'array' THEN e.elem->'columns' ELSE '[]'::jsonb END AS ems_layout,
       CASE WHEN (e.elem->>'defaultSeatsPerBench') ~ '^[1-6]$'
            THEN (e.elem->>'defaultSeatsPerBench')::int ELSE 2 END AS seats,
       e.ord::int AS ord
FROM public.system_config c
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(c.value) = 'array' THEN c.value ELSE '[]'::jsonb END
) WITH ORDINALITY AS e(elem, ord)
WHERE c.key = 'ems_rooms'
  AND jsonb_typeof(e.elem) = 'object'
  AND NULLIF(btrim(e.elem->>'id'), '') IS NOT NULL
) s
WHERE NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = s.id)
ON CONFLICT (id) DO NOTHING;

-- One active room per name (case-insensitive). Archived rooms may repeat a name.
CREATE UNIQUE INDEX IF NOT EXISTS rooms_active_name ON public.rooms (lower(btrim(name))) WHERE archived_at IS NULL;

-- ---------- ordering ----------
-- Sets sort_order = position for the given ids in one statement (reorder and its undo).

CREATE OR REPLACE FUNCTION public.asset_rooms_set_order(p_ids text[])
RETURNS void LANGUAGE sql SET search_path = public, pg_temp AS $$
  UPDATE public.rooms r SET sort_order = x.ord::int - 1
  FROM unnest(p_ids) WITH ORDINALITY AS x(id, ord)
  WHERE r.id = x.id AND r.sort_order IS DISTINCT FROM x.ord::int - 1;
$$;

-- ---------- lock down ----------
-- Server-only access through the service role (lib/rooms, lib/assets).
-- Supabase grants EXECUTE on new public functions to anon by default,
-- so every asset_* function is revoked here; later asset migrations repeat this.

DO $$
DECLARE f record;
BEGIN
  ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.rooms FROM PUBLIC, anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rooms TO service_role;

  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'asset\_%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
