-- ============================================================
-- Asset module: item catalog, funds, room-wise stock, serial units, ledger
--
-- Model
--   asset_items   catalog (Bench, Fan, Computer...). tracking = 'count' or 'serial'.
--   asset_stock   counted items: qty per (room, item, condition).
--   asset_units   serial items: one row per unit with its own code (AST/2026/0001).
--   asset_events  append-only ledger. Every change is one event that moves qty
--                 from (from_room, from_condition) to (to_room, to_condition):
--                   add (opening/purchase)  from = null      -> to
--                   move                    room A           -> room B
--                   condition               working          -> damaged (same room)
--                   write_off               room/condition   -> null (gone)
--                   count                   +delta -> to, -delta -> from
--                 Undo applies the same event in reverse and records an 'undo' event.
--
-- All writes go through asset_* functions called by the server (service role).
-- They serialize on one advisory lock: a school's asset traffic is small and this
-- keeps every balance check simple and race-free.
-- Errors are raised as 'AST:<code>' (mapped to messages in lib/assets/errors.ts).
-- Depends on 20261111_rooms_master.sql.
-- ============================================================

-- ---------- tables ----------

CREATE TABLE IF NOT EXISTS public.asset_funds (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL CHECK (length(btrim(name)) > 0),
  financial_year text,
  archived_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS asset_funds_active_name
  ON public.asset_funds (lower(btrim(name)), coalesce(lower(btrim(financial_year)), '')) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.asset_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (length(btrim(name)) > 0),
  category    text NOT NULL DEFAULT 'other'
                CHECK (category IN ('furniture','electrical','it','lab','sports','other')),
  tracking    text NOT NULL DEFAULT 'count' CHECK (tracking IN ('count','serial')),
  -- EMS link: working stock of the 'bench' item is compared with exam layouts
  ems_role    text CHECK (ems_role IN ('bench')),
  sort_order  int NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS asset_items_active_name ON public.asset_items (lower(btrim(name))) WHERE archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS asset_items_one_bench ON public.asset_items (ems_role) WHERE ems_role IS NOT NULL AND archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.asset_stock (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    text NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  item_id    uuid NOT NULL REFERENCES public.asset_items(id) ON DELETE RESTRICT,
  condition  text NOT NULL CHECK (condition IN ('working','repair','damaged')),
  qty        int  NOT NULL DEFAULT 0 CHECK (qty >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, item_id, condition)
);
CREATE INDEX IF NOT EXISTS asset_stock_item ON public.asset_stock (item_id);

CREATE TABLE IF NOT EXISTS public.asset_units (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  item_id        uuid NOT NULL REFERENCES public.asset_items(id) ON DELETE RESTRICT,
  room_id        text NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  condition      text NOT NULL DEFAULT 'working' CHECK (condition IN ('working','repair','damaged')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','written_off')),
  serial_no      text,
  unit_price     numeric(12,2) CHECK (unit_price IS NULL OR unit_price >= 0),
  fund_id        uuid REFERENCES public.asset_funds(id) ON DELETE RESTRICT,
  acquired_on    date,
  written_off_at timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asset_units_room ON public.asset_units (room_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS asset_units_item ON public.asset_units (item_id);

CREATE TABLE IF NOT EXISTS public.asset_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq            bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  at             timestamptz NOT NULL DEFAULT now(),
  occurred_on    date NOT NULL DEFAULT current_date,
  actor          uuid NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('opening','purchase','move','condition','write_off','count','batch','undo')),
  parent_id      uuid REFERENCES public.asset_events(id),
  undo_of        uuid REFERENCES public.asset_events(id),
  item_id        uuid,
  item_name      text,
  unit_ids       uuid[],
  from_room_id   text,
  from_room_name text,
  from_condition text,
  to_room_id     text,
  to_room_name   text,
  to_condition   text,
  qty            int CHECK (qty IS NULL OR qty > 0),
  unit_cost      numeric(12,2),
  value          numeric(14,2),
  fund_id        uuid,
  fund_name      text,
  reason         text CHECK (reason IS NULL OR reason IN ('condemned','lost')),
  note           text
);
CREATE INDEX IF NOT EXISTS asset_events_item ON public.asset_events (item_id, seq);
CREATE INDEX IF NOT EXISTS asset_events_parent ON public.asset_events (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS asset_events_occurred ON public.asset_events (occurred_on);
-- One undo per event
CREATE UNIQUE INDEX IF NOT EXISTS asset_events_one_undo ON public.asset_events (undo_of) WHERE undo_of IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.asset_requests (
  request_id uuid PRIMARY KEY,
  actor      uuid NOT NULL,
  kind       text NOT NULL,
  result     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_counters (
  name       text PRIMARY KEY,
  value      bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- default catalog ----------

INSERT INTO public.asset_items (name, category, tracking, ems_role, sort_order)
SELECT v.name, v.category, v.tracking, v.ems_role, v.ord
FROM (VALUES
  ('Bench','furniture','count','bench',1), ('Desk','furniture','count',NULL,2), ('Chair','furniture','count',NULL,3),
  ('Table','furniture','count',NULL,4), ('Almirah','furniture','count',NULL,5), ('Rack','furniture','count',NULL,6),
  ('Blackboard','furniture','count',NULL,7), ('Whiteboard','furniture','count',NULL,8),
  ('Fan','electrical','count',NULL,10), ('Tube light','electrical','count',NULL,11), ('LED bulb','electrical','count',NULL,12),
  ('Computer','it','serial',NULL,20), ('Laptop','it','serial',NULL,21), ('Projector','it','serial',NULL,22),
  ('Printer','it','serial',NULL,23), ('UPS','it','serial',NULL,24), ('Smart board','it','serial',NULL,25)
) AS v(name, category, tracking, ems_role, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.asset_items i WHERE lower(i.name) = lower(v.name));

-- ---------- updated_at triggers ----------
-- asset_touch_updated_at() comes from 20261111_rooms_master.sql.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['asset_funds','asset_items','asset_stock','asset_units','asset_counters']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.asset_touch_updated_at()',
                   t || '_updated_at', t);
  END LOOP;
END $$;

-- ---------- append-only ledger ----------

CREATE OR REPLACE FUNCTION public.asset_events_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'AST:append_only' USING ERRCODE = 'P0001';
END $$;

DROP TRIGGER IF EXISTS asset_events_no_change ON public.asset_events;
CREATE TRIGGER asset_events_no_change BEFORE UPDATE OR DELETE ON public.asset_events
  FOR EACH ROW EXECUTE FUNCTION public.asset_events_append_only();
DROP TRIGGER IF EXISTS asset_events_no_truncate ON public.asset_events;
CREATE TRIGGER asset_events_no_truncate BEFORE TRUNCATE ON public.asset_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.asset_events_append_only();

-- ---------- helpers ----------

CREATE OR REPLACE FUNCTION public.asset_fail(p_code text, p_detail text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION '%', 'AST:' || p_code || coalesce(':' || p_detail, '') USING ERRCODE = 'P0001';
END $$;

-- Returns the stored result of an earlier run of this request, or NULL on the first run.
CREATE OR REPLACE FUNCTION public.asset_begin(p_request_id uuid, p_actor uuid, p_kind text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE r asset_requests%ROWTYPE;
BEGIN
  IF p_request_id IS NULL THEN PERFORM asset_fail('request_id_required'); END IF;
  IF p_actor IS NULL THEN PERFORM asset_fail('actor_required'); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('asset_ledger'));
  INSERT INTO asset_requests (request_id, actor, kind) VALUES (p_request_id, p_actor, p_kind)
  ON CONFLICT (request_id) DO NOTHING;
  IF FOUND THEN RETURN NULL; END IF;
  SELECT * INTO r FROM asset_requests WHERE request_id = p_request_id;
  IF r.kind <> p_kind OR r.actor <> p_actor OR r.result IS NULL THEN PERFORM asset_fail('request_mismatch'); END IF;
  RETURN r.result || jsonb_build_object('replayed', true);
END $$;

CREATE OR REPLACE FUNCTION public.asset_finish(p_request_id uuid, p_result jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE asset_requests SET result = p_result WHERE request_id = p_request_id;
  RETURN p_result || jsonb_build_object('replayed', false);
END $$;

CREATE OR REPLACE FUNCTION public.asset_item(p_item_id uuid)
RETURNS asset_items LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE r asset_items%ROWTYPE;
BEGIN
  SELECT * INTO r FROM asset_items WHERE id = p_item_id AND archived_at IS NULL;
  IF NOT FOUND THEN PERFORM asset_fail('item_not_found'); END IF;
  RETURN r;
END $$;

-- Name of an active room (for a destination) or any room (for a source).
CREATE OR REPLACE FUNCTION public.asset_room_name(p_room_id text, p_active boolean)
RETURNS text LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v text;
BEGIN
  SELECT name INTO v FROM rooms WHERE id = p_room_id AND (NOT p_active OR archived_at IS NULL);
  IF NOT FOUND THEN PERFORM asset_fail('room_not_found'); END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.asset_check_condition(p_condition text)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF p_condition IS NULL OR p_condition NOT IN ('working','repair','damaged') THEN PERFORM asset_fail('bad_condition'); END IF;
END $$;

-- Change counted stock by p_delta; refuses to go below zero.
CREATE OR REPLACE FUNCTION public.asset_stock_add(p_room text, p_item uuid, p_condition text, p_delta int)
RETURNS int LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_qty int;
BEGIN
  SELECT qty INTO v_qty FROM asset_stock WHERE room_id = p_room AND item_id = p_item AND condition = p_condition FOR UPDATE;
  IF NOT FOUND THEN
    IF p_delta < 0 THEN PERFORM asset_fail('not_enough_stock'); END IF;
    INSERT INTO asset_stock (room_id, item_id, condition, qty) VALUES (p_room, p_item, p_condition, p_delta);
    RETURN p_delta;
  END IF;
  IF v_qty + p_delta < 0 THEN PERFORM asset_fail('not_enough_stock'); END IF;
  UPDATE asset_stock SET qty = v_qty + p_delta WHERE room_id = p_room AND item_id = p_item AND condition = p_condition;
  RETURN v_qty + p_delta;
END $$;

-- Move counted qty from one (room, condition) to another; either side may be NULL.
CREATE OR REPLACE FUNCTION public.asset_shift(p_item uuid, p_from_room text, p_from_cond text,
  p_to_room text, p_to_cond text, p_qty int)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF p_from_room IS NOT NULL THEN PERFORM asset_stock_add(p_from_room, p_item, p_from_cond, -p_qty); END IF;
  IF p_to_room IS NOT NULL THEN PERFORM asset_stock_add(p_to_room, p_item, p_to_cond, p_qty); END IF;
END $$;

-- Average known cost per unit of a counted item: priced opening/purchase events not undone.
CREATE OR REPLACE FUNCTION public.asset_avg_cost(p_item uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT round(sum(e.unit_cost * e.qty) / nullif(sum(e.qty), 0), 2)
  FROM asset_events e
  WHERE e.item_id = p_item AND e.kind IN ('opening','purchase') AND e.unit_cost IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM asset_events u WHERE u.undo_of = e.id);
$$;

CREATE OR REPLACE FUNCTION public.asset_next_code(p_on date)
RETURNS text LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_year text := to_char(p_on, 'YYYY'); v bigint;
BEGIN
  INSERT INTO asset_counters (name, value) VALUES ('unit:' || v_year, 1)
  ON CONFLICT (name) DO UPDATE SET value = asset_counters.value + 1
  RETURNING value INTO v;
  RETURN 'AST/' || v_year || '/' || lpad(v::text, 4, '0');
END $$;

-- ---------- actions ----------

-- Opening stock or a purchase. Serial items create p_qty units with new codes.
CREATE OR REPLACE FUNCTION public.asset_add(p_actor uuid, p_request_id uuid, p_kind text, p_room_id text,
  p_item_id uuid, p_qty int, p_condition text DEFAULT 'working', p_unit_price numeric DEFAULT NULL,
  p_fund_id uuid DEFAULT NULL, p_occurred_on date DEFAULT NULL, p_serials text[] DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; v_item asset_items%ROWTYPE; v_room text; v_fund text; v_on date := coalesce(p_occurred_on, current_date);
  v_units uuid[] := '{}'; v_codes text[] := '{}'; v_id uuid; v_code text; v_event uuid; i int;
BEGIN
  v_prev := asset_begin(p_request_id, p_actor, 'add');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_kind NOT IN ('opening','purchase') THEN PERFORM asset_fail('bad_kind'); END IF;
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 10000 THEN PERFORM asset_fail('bad_qty'); END IF;
  IF p_unit_price IS NOT NULL AND p_unit_price < 0 THEN PERFORM asset_fail('bad_price'); END IF;
  PERFORM asset_check_condition(p_condition);
  v_item := asset_item(p_item_id);
  v_room := asset_room_name(p_room_id, true);
  IF p_fund_id IS NOT NULL THEN
    SELECT name || coalesce(' ' || financial_year, '') INTO v_fund FROM asset_funds WHERE id = p_fund_id AND archived_at IS NULL;
    IF NOT FOUND THEN PERFORM asset_fail('fund_not_found'); END IF;
  END IF;

  IF v_item.tracking = 'serial' THEN
    IF p_qty > 200 THEN PERFORM asset_fail('bad_qty'); END IF;
    FOR i IN 1..p_qty LOOP
      v_code := asset_next_code(v_on);
      INSERT INTO asset_units (code, item_id, room_id, condition, serial_no, unit_price, fund_id, acquired_on)
      VALUES (v_code, v_item.id, p_room_id, p_condition, nullif(btrim(p_serials[i]), ''), p_unit_price, p_fund_id, v_on)
      RETURNING id INTO v_id;
      v_units := v_units || v_id;
      v_codes := v_codes || v_code;
    END LOOP;
  ELSE
    PERFORM asset_stock_add(p_room_id, v_item.id, p_condition, p_qty);
  END IF;

  INSERT INTO asset_events (actor, kind, occurred_on, item_id, item_name, unit_ids, to_room_id, to_room_name,
                            to_condition, qty, unit_cost, value, fund_id, fund_name, note)
  VALUES (p_actor, p_kind, v_on, v_item.id, v_item.name, nullif(v_units, '{}'), p_room_id, v_room,
          p_condition, p_qty, p_unit_price, p_unit_price * p_qty, p_fund_id, v_fund, nullif(btrim(p_note), ''))
  RETURNING id INTO v_event;
  RETURN asset_finish(p_request_id, jsonb_build_object('event_id', v_event, 'codes', to_jsonb(v_codes)));
END $$;

-- Move, change condition or write off. Counted items take a qty; serial items take p_unit_id.
--   p_kind 'move'      : p_to_room required, condition kept
--   p_kind 'condition' : p_to_condition required, room kept
--   p_kind 'write_off' : p_reason 'condemned' | 'lost'
CREATE OR REPLACE FUNCTION public.asset_change(p_actor uuid, p_request_id uuid, p_kind text, p_item_id uuid,
  p_room_id text, p_condition text, p_qty int DEFAULT NULL, p_unit_id uuid DEFAULT NULL,
  p_to_room_id text DEFAULT NULL, p_to_condition text DEFAULT NULL, p_reason text DEFAULT NULL,
  p_occurred_on date DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; v_item asset_items%ROWTYPE; v_unit asset_units%ROWTYPE; v_qty int;
  v_to_room text; v_to_cond text; v_from_name text; v_to_name text; v_cost numeric; v_event uuid;
BEGIN
  v_prev := asset_begin(p_request_id, p_actor, p_kind);
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_kind NOT IN ('move','condition','write_off') THEN PERFORM asset_fail('bad_kind'); END IF;
  v_item := asset_item(p_item_id);
  PERFORM asset_check_condition(p_condition);
  v_from_name := asset_room_name(p_room_id, false);

  IF p_kind = 'move' THEN
    IF p_to_room_id IS NULL OR p_to_room_id = p_room_id THEN PERFORM asset_fail('bad_target'); END IF;
    v_to_room := p_to_room_id; v_to_cond := p_condition;
    v_to_name := asset_room_name(p_to_room_id, true);
  ELSIF p_kind = 'condition' THEN
    PERFORM asset_check_condition(p_to_condition);
    IF p_to_condition = p_condition THEN PERFORM asset_fail('bad_target'); END IF;
    v_to_room := p_room_id; v_to_cond := p_to_condition; v_to_name := v_from_name;
  ELSE
    IF p_reason IS NULL OR p_reason NOT IN ('condemned','lost') THEN PERFORM asset_fail('bad_reason'); END IF;
  END IF;

  IF v_item.tracking = 'serial' THEN
    SELECT * INTO v_unit FROM asset_units WHERE id = p_unit_id AND item_id = v_item.id FOR UPDATE;
    IF NOT FOUND THEN PERFORM asset_fail('unit_not_found'); END IF;
    IF v_unit.status <> 'active' OR v_unit.room_id <> p_room_id OR v_unit.condition <> p_condition THEN
      PERFORM asset_fail('state_changed');
    END IF;
    v_qty := 1; v_cost := v_unit.unit_price;
    IF p_kind = 'write_off' THEN
      UPDATE asset_units SET status = 'written_off', written_off_at = now() WHERE id = v_unit.id;
    ELSE
      UPDATE asset_units SET room_id = v_to_room, condition = v_to_cond WHERE id = v_unit.id;
    END IF;
  ELSE
    IF p_qty IS NULL OR p_qty < 1 THEN PERFORM asset_fail('bad_qty'); END IF;
    v_qty := p_qty;
    v_cost := CASE WHEN p_kind = 'write_off' THEN asset_avg_cost(v_item.id) END;
    PERFORM asset_shift(v_item.id, p_room_id, p_condition, v_to_room, v_to_cond, v_qty);
  END IF;

  INSERT INTO asset_events (actor, kind, occurred_on, item_id, item_name, unit_ids, from_room_id, from_room_name,
                            from_condition, to_room_id, to_room_name, to_condition, qty, unit_cost, value, reason, note)
  VALUES (p_actor, p_kind, coalesce(p_occurred_on, current_date), v_item.id, v_item.name,
          CASE WHEN p_unit_id IS NOT NULL AND v_item.tracking = 'serial' THEN ARRAY[p_unit_id] END,
          p_room_id, v_from_name, p_condition, v_to_room, v_to_name, v_to_cond, v_qty,
          CASE WHEN p_kind = 'write_off' THEN v_cost END,
          CASE WHEN p_kind = 'write_off' THEN v_cost * v_qty END,
          CASE WHEN p_kind = 'write_off' THEN p_reason END, nullif(btrim(p_note), ''))
  RETURNING id INTO v_event;
  RETURN asset_finish(p_request_id, jsonb_build_object('event_id', v_event));
END $$;

-- Room count for counted items. p_lines: [{item_id, condition, counted, expected}].
-- Every line's expected must match the current qty, or nothing is written (stale_count).
-- Writes one 'batch' event with a 'count' child per changed line; undo reverses the whole batch.
CREATE OR REPLACE FUNCTION public.asset_count(p_actor uuid, p_request_id uuid, p_room_id text, p_lines jsonb,
  p_occurred_on date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; v_room text; v_line jsonb; v_item asset_items%ROWTYPE; v_cond text; v_counted int; v_expected int;
  v_current int; v_delta int; v_parent uuid; v_changed int := 0; v_on date := coalesce(p_occurred_on, current_date);
BEGIN
  v_prev := asset_begin(p_request_id, p_actor, 'count');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  v_room := asset_room_name(p_room_id, true);
  IF jsonb_typeof(p_lines) <> 'array' THEN PERFORM asset_fail('bad_lines'); END IF;

  -- Check every line before writing anything.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_item := asset_item((v_line->>'item_id')::uuid);
    IF v_item.tracking <> 'count' THEN PERFORM asset_fail('serial_not_counted', v_item.name); END IF;
    v_cond := v_line->>'condition';
    PERFORM asset_check_condition(v_cond);
    v_counted := (v_line->>'counted')::int; v_expected := (v_line->>'expected')::int;
    IF v_counted IS NULL OR v_counted < 0 OR v_counted > 100000 OR v_expected IS NULL THEN PERFORM asset_fail('bad_qty'); END IF;
    SELECT coalesce(max(qty), 0) INTO v_current FROM asset_stock
      WHERE room_id = p_room_id AND item_id = v_item.id AND condition = v_cond;
    IF v_current <> v_expected THEN PERFORM asset_fail('stale_count', v_item.name); END IF;
  END LOOP;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_item := asset_item((v_line->>'item_id')::uuid);
    v_cond := v_line->>'condition';
    v_delta := (v_line->>'counted')::int - (v_line->>'expected')::int;
    CONTINUE WHEN v_delta = 0;
    IF v_parent IS NULL THEN
      INSERT INTO asset_events (actor, kind, occurred_on, to_room_id, to_room_name)
      VALUES (p_actor, 'batch', v_on, p_room_id, v_room) RETURNING id INTO v_parent;
    END IF;
    PERFORM asset_stock_add(p_room_id, v_item.id, v_cond, v_delta);
    INSERT INTO asset_events (actor, kind, occurred_on, parent_id, item_id, item_name,
                              from_room_id, from_room_name, from_condition, to_room_id, to_room_name, to_condition, qty)
    VALUES (p_actor, 'count', v_on, v_parent, v_item.id, v_item.name,
            CASE WHEN v_delta < 0 THEN p_room_id END, CASE WHEN v_delta < 0 THEN v_room END, CASE WHEN v_delta < 0 THEN v_cond END,
            CASE WHEN v_delta > 0 THEN p_room_id END, CASE WHEN v_delta > 0 THEN v_room END, CASE WHEN v_delta > 0 THEN v_cond END,
            abs(v_delta));
    v_changed := v_changed + 1;
  END LOOP;
  RETURN asset_finish(p_request_id, jsonb_build_object('event_id', v_parent, 'changed', v_changed));
END $$;

-- Reverse one event (or a whole count batch). Refuses when the stock has moved on.
CREATE OR REPLACE FUNCTION public.asset_undo(p_event_id uuid, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; e asset_events%ROWTYPE; c asset_events%ROWTYPE; v_n int; v_event uuid;
BEGIN
  v_prev := asset_begin(p_request_id, p_actor, 'undo');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  SELECT * INTO e FROM asset_events WHERE id = p_event_id;
  IF NOT FOUND THEN PERFORM asset_fail('event_not_found'); END IF;
  IF e.kind = 'undo' OR e.parent_id IS NOT NULL THEN PERFORM asset_fail('not_undoable'); END IF;
  IF EXISTS (SELECT 1 FROM asset_events WHERE undo_of = e.id) THEN PERFORM asset_fail('already_undone'); END IF;

  IF e.kind = 'batch' THEN
    FOR c IN SELECT * FROM asset_events WHERE parent_id = e.id ORDER BY seq DESC LOOP
      PERFORM asset_shift(c.item_id, c.to_room_id, c.to_condition, c.from_room_id, c.from_condition, c.qty);
    END LOOP;
  ELSIF e.unit_ids IS NOT NULL THEN
    IF e.kind IN ('opening','purchase') THEN
      SELECT count(*) INTO v_n FROM asset_units
        WHERE id = ANY(e.unit_ids) AND status = 'active' AND room_id = e.to_room_id AND condition = e.to_condition;
      IF v_n <> cardinality(e.unit_ids) THEN PERFORM asset_fail('state_changed'); END IF;
      DELETE FROM asset_units WHERE id = ANY(e.unit_ids);
    ELSIF e.kind = 'write_off' THEN
      UPDATE asset_units SET status = 'active', written_off_at = NULL
        WHERE id = ANY(e.unit_ids) AND status = 'written_off';
      IF NOT FOUND THEN PERFORM asset_fail('state_changed'); END IF;
    ELSE
      UPDATE asset_units SET room_id = e.from_room_id, condition = e.from_condition
        WHERE id = ANY(e.unit_ids) AND status = 'active' AND room_id = e.to_room_id AND condition = e.to_condition;
      IF NOT FOUND THEN PERFORM asset_fail('state_changed'); END IF;
      PERFORM asset_room_name(e.from_room_id, true);
    END IF;
  ELSE
    IF e.from_room_id IS NOT NULL THEN PERFORM asset_room_name(e.from_room_id, true); END IF;
    PERFORM asset_shift(e.item_id, e.to_room_id, e.to_condition, e.from_room_id, e.from_condition, e.qty);
  END IF;

  INSERT INTO asset_events (actor, kind, undo_of, item_id, item_name, unit_ids, from_room_id, from_room_name,
                            from_condition, to_room_id, to_room_name, to_condition, qty)
  VALUES (p_actor, 'undo', e.id, e.item_id, e.item_name, e.unit_ids, e.to_room_id, e.to_room_name,
          e.to_condition, e.from_room_id, e.from_room_name, e.from_condition, e.qty)
  RETURNING id INTO v_event;
  RETURN asset_finish(p_request_id, jsonb_build_object('event_id', v_event, 'undone', e.id));
EXCEPTION WHEN raise_exception THEN
  -- Stock already moved on (e.g. the added benches were moved away): tell the user, not "not enough stock".
  IF SQLERRM LIKE 'AST:not_enough_stock%' THEN PERFORM asset_fail('state_changed'); END IF;
  RAISE;
END $$;

-- ---------- reporting view ----------
-- Current balance per room x item x condition, counted and serial together.

CREATE OR REPLACE VIEW public.asset_room_balance AS
  SELECT s.room_id, s.item_id, s.condition, s.qty
  FROM public.asset_stock s WHERE s.qty > 0
  UNION ALL
  SELECT u.room_id, u.item_id, u.condition, count(*)::int
  FROM public.asset_units u WHERE u.status = 'active'
  GROUP BY u.room_id, u.item_id, u.condition;

-- ---------- lock down ----------
-- Server-only. Supabase grants EXECUTE on new public functions to anon by default.

DO $$
DECLARE t text; f record;
BEGIN
  FOREACH t IN ARRAY ARRAY['asset_funds','asset_items','asset_stock','asset_units','asset_events',
                           'asset_requests','asset_counters']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
  END LOOP;
  REVOKE ALL ON TABLE public.asset_room_balance FROM PUBLIC, anon, authenticated;
  GRANT SELECT ON TABLE public.asset_room_balance TO service_role;
  REVOKE ALL ON SEQUENCE public.asset_events_seq_seq FROM PUBLIC, anon, authenticated;
  GRANT USAGE, SELECT ON SEQUENCE public.asset_events_seq_seq TO service_role;

  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'asset\_%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
