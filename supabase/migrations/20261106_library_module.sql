-- ============================================================
-- Library module (tasks/plan.md §3, T2)
--
-- Security (S1): RLS on, no policies, and every grant to anon/authenticated
-- revoked. Reads and writes go through server routes with the service-role
-- client; every library_* function is EXECUTE-able by service_role only.
--
-- Split of work (D12): dates and fine amounts are computed in TypeScript
-- (lib/library/rules.ts) and passed in. These functions re-check, under a
-- lock, only what must hold under concurrency: one open loan per copy, the
-- borrower's book limit, renew count, and payment/waiver limits on a fine.
--
-- Errors are raised as `LIB:<code>` (SQLSTATE P0001); the data layer maps
-- the code to a Bengali message.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ---------- helpers ----------

CREATE OR REPLACE FUNCTION public.library_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.library_fail(p_code text, p_detail text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'LIB:%', p_code USING ERRCODE = 'P0001', DETAIL = coalesce(p_detail, '');
END $$;

-- Every money input: NULL stays NULL; otherwise rounded to paise and kept
-- finite, non-negative and inside numeric(10,2). NaN fails the range test.
CREATE OR REPLACE FUNCTION public.library_amount(p numeric)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
DECLARE v numeric;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  IF p = 'NaN'::numeric OR p < 0 OR p >= 100000000 THEN PERFORM library_fail('invalid_amount'); END IF;
  v := round(p, 2);
  IF v >= 100000000 THEN PERFORM library_fail('invalid_amount'); END IF;
  RETURN v;
END $$;

-- ---------- tables ----------

CREATE TABLE IF NOT EXISTS public.library_settings (
  id          int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rules       jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.library_settings (id, rules) VALUES (1, jsonb_build_object(
  'student', jsonb_build_object('maxBooks', 2, 'loanDays', 14, 'renewDays', 7, 'maxRenews', 2, 'renewWindowDays', 3),
  'staff',   jsonb_build_object('maxBooks', 5, 'loanDays', 30, 'renewDays', 14, 'maxRenews', 3, 'renewWindowDays', 5),
  'finePerDay', 1,
  'graceDays', 2,
  'fineCap', 50,
  'renewWhenOverdue', false,
  'blockThreshold', 50,
  'holidays', '[]'::jsonb,
  'lostPolicy', 'price',
  'processingFee', 20,
  'defaultLostAmount', 150,
  'tcMode', 'block',
  'codePrefix', 'B',
  'sticker', jsonb_build_object('cols', 3, 'rows', 8, 'widthMm', 70, 'heightMm', 37, 'gapXMm', 0, 'gapYMm', 0)
)) ON CONFLICT (id) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS public.library_book_code_seq;

-- Book code: prefix (from settings, at insert time) + zero-padded sequence (D4).
CREATE OR REPLACE FUNCTION public.library_next_book_code()
RETURNS text LANGUAGE sql SET search_path = public, pg_temp AS $$
  SELECT coalesce(nullif(upper(trim((SELECT rules->>'codePrefix' FROM public.library_settings WHERE id = 1))), ''), 'B')
         || lpad(nextval('public.library_book_code_seq')::text, 4, '0');
$$;

CREATE TABLE IF NOT EXISTS public.library_books (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_code    text NOT NULL UNIQUE DEFAULT public.library_next_book_code(),
  next_copy_no int  NOT NULL DEFAULT 1 CHECK (next_copy_no >= 1),
  title        text NOT NULL CHECK (length(trim(title)) > 0),
  -- K1: titleKey(title) from lib/library/catalog.ts (NFC, case-folded, no
  -- punctuation or zero-width marks), written by the app; duplicate checks
  -- and search compare keys so Bengali typed in different forms still match.
  title_key    text NOT NULL DEFAULT '',
  author       text,
  publisher    text,
  category     text,
  language     text,
  isbn         text,
  edition      text,
  legacy_no    text,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.library_copies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id            uuid NOT NULL REFERENCES public.library_books(id) ON DELETE RESTRICT,
  copy_no            int  NOT NULL CHECK (copy_no >= 1),
  code               text NOT NULL UNIQUE,
  price              numeric(10,2) CHECK (price IS NULL OR (price >= 0 AND price < 100000000)),
  status             text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'lost', 'withdrawn')),
  legacy_no          text,
  sticker_printed_at timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, copy_no)
);

CREATE TABLE IF NOT EXISTS public.library_loans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id          uuid NOT NULL REFERENCES public.library_copies(id) ON DELETE RESTRICT,
  student_id       uuid REFERENCES public.students(id) ON DELETE RESTRICT,
  staff_id         uuid REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  class_at_issue   text,
  section_at_issue text,
  session_at_issue text,
  issued_on        date NOT NULL,
  due_on           date NOT NULL,
  renew_count      int  NOT NULL DEFAULT 0 CHECK (renew_count >= 0),
  -- R10: set once the loan is renewed after its due date; grace days apply
  -- only to the first overdue stretch.
  overdue_renewed  boolean NOT NULL DEFAULT false,
  returned_on      date,
  cancelled_at     timestamptz,
  outcome          text CHECK (outcome IN ('returned', 'lost')),
  rules            jsonb NOT NULL,
  issued_by        uuid NOT NULL,
  returned_by      uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(student_id, staff_id) = 1),
  CHECK (due_on >= issued_on),
  CHECK ((returned_on IS NULL) = (outcome IS NULL)),
  CHECK (returned_on IS NULL OR returned_on >= issued_on)
);

-- D1: one open loan per copy.
CREATE UNIQUE INDEX IF NOT EXISTS library_loans_one_open_per_copy
  ON public.library_loans (copy_id) WHERE returned_on IS NULL AND cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS library_loans_open_student ON public.library_loans (student_id)
  WHERE returned_on IS NULL AND cancelled_at IS NULL AND student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS library_loans_open_staff ON public.library_loans (staff_id)
  WHERE returned_on IS NULL AND cancelled_at IS NULL AND staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS library_loans_open_due ON public.library_loans (due_on)
  WHERE returned_on IS NULL AND cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS library_loans_copy ON public.library_loans (copy_id, issued_on DESC);
CREATE INDEX IF NOT EXISTS library_loans_student ON public.library_loans (student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS library_loans_staff ON public.library_loans (staff_id) WHERE staff_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.library_fines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id       uuid NOT NULL REFERENCES public.library_loans(id) ON DELETE RESTRICT,
  student_id    uuid REFERENCES public.students(id) ON DELETE RESTRICT,
  staff_id      uuid REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  kind          text NOT NULL CHECK (kind IN ('overdue', 'lost', 'damaged')),
  amount        numeric(10,2) NOT NULL CHECK (amount > 0 AND amount < 100000000),
  note          text,
  created_by    uuid NOT NULL,
  cancelled_at  timestamptz,
  cancel_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(student_id, staff_id) = 1)
);
CREATE INDEX IF NOT EXISTS library_fines_loan ON public.library_fines (loan_id);
CREATE INDEX IF NOT EXISTS library_fines_student ON public.library_fines (student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS library_fines_staff ON public.library_fines (staff_id) WHERE staff_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.library_fine_payments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fine_id      uuid NOT NULL REFERENCES public.library_fines(id) ON DELETE RESTRICT,
  kind         text NOT NULL CHECK (kind IN ('payment', 'refund')),
  amount       numeric(10,2) NOT NULL CHECK (amount > 0 AND amount < 100000000),
  receipt_no   bigint NOT NULL,
  paid_on      date NOT NULL,
  collected_by uuid NOT NULL,
  note         text,
  voided_at    timestamptz,
  void_reason  text,
  voided_by    uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- one receipt can cover several fines of one borrower, once per fine
  UNIQUE (receipt_no, fine_id),
  CHECK ((voided_at IS NULL) = (voided_by IS NULL)),
  CHECK (voided_at IS NULL OR length(trim(coalesce(void_reason, ''))) > 0)
);
CREATE INDEX IF NOT EXISTS library_fine_payments_fine ON public.library_fine_payments (fine_id);
CREATE INDEX IF NOT EXISTS library_fine_payments_paid_on ON public.library_fine_payments (paid_on);

CREATE TABLE IF NOT EXISTS public.library_fine_waivers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fine_id     uuid NOT NULL REFERENCES public.library_fines(id) ON DELETE RESTRICT,
  amount      numeric(10,2) NOT NULL CHECK (amount > 0 AND amount < 100000000),
  reason      text NOT NULL CHECK (length(trim(reason)) > 0),
  waived_by   uuid NOT NULL,
  waived_at   timestamptz NOT NULL DEFAULT now(),
  voided_at   timestamptz,
  void_reason text,
  voided_by   uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((voided_at IS NULL) = (voided_by IS NULL))
);
CREATE INDEX IF NOT EXISTS library_fine_waivers_fine ON public.library_fine_waivers (fine_id);

CREATE TABLE IF NOT EXISTS public.library_counters (
  name       text PRIMARY KEY,
  value      bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.library_counters (name, value) VALUES ('receipt', 0) ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.library_requests (
  request_id uuid PRIMARY KEY,
  actor      uuid NOT NULL,
  kind       text NOT NULL,
  result     jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only audit log. copy_id / loan_id carry no FK on purpose: the log
-- must outlive an undone "add copies" (whose copies are deleted).
CREATE TABLE IF NOT EXISTS public.library_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Order of events: taken at insert (after the action's locks), unlike `at`
  -- which is the transaction start.
  seq          bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  at           timestamptz NOT NULL DEFAULT now(),
  actor        uuid NOT NULL,
  kind         text NOT NULL,
  copy_id      uuid,
  loan_id      uuid,
  student_id   uuid,
  staff_id     uuid,
  ref_event_id uuid REFERENCES public.library_events(id) ON DELETE RESTRICT,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS library_events_copy_at ON public.library_events (copy_id, at DESC);
CREATE INDEX IF NOT EXISTS library_events_copy_seq ON public.library_events (copy_id, seq);
CREATE INDEX IF NOT EXISTS library_events_loan ON public.library_events (loan_id, seq);
CREATE INDEX IF NOT EXISTS library_events_ref ON public.library_events (ref_event_id);
CREATE INDEX IF NOT EXISTS library_events_at ON public.library_events (at DESC);
-- An event can be undone once.
CREATE UNIQUE INDEX IF NOT EXISTS library_events_one_undo
  ON public.library_events (ref_event_id) WHERE kind = 'undo';

CREATE INDEX IF NOT EXISTS library_books_title_trgm  ON public.library_books USING gin (title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS library_books_author_trgm ON public.library_books USING gin (author extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS library_books_title_key ON public.library_books (title_key);
CREATE INDEX IF NOT EXISTS library_books_title_key_trgm ON public.library_books USING gin (title_key extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS library_books_legacy ON public.library_books (legacy_no) WHERE legacy_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS library_copies_book ON public.library_copies (book_id);
CREATE INDEX IF NOT EXISTS library_copies_unprinted ON public.library_copies (book_id) WHERE sticker_printed_at IS NULL;

-- ---------- updated_at triggers (D7) ----------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['library_settings','library_books','library_copies','library_loans','library_fines',
                           'library_fine_payments','library_fine_waivers','library_counters','library_requests']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.library_touch_updated_at()',
                   t || '_updated_at', t);
  END LOOP;
END $$;

-- ---------- append-only guards (S1) ----------

CREATE OR REPLACE FUNCTION public.library_events_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'LIB:append_only' USING ERRCODE = 'P0001';
END $$;

DROP TRIGGER IF EXISTS library_events_no_change ON public.library_events;
CREATE TRIGGER library_events_no_change BEFORE UPDATE OR DELETE ON public.library_events
  FOR EACH ROW EXECUTE FUNCTION public.library_events_append_only();

-- Payments and waivers: no DELETE; UPDATE may only void a live row once.
CREATE OR REPLACE FUNCTION public.library_void_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'LIB:append_only' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.voided_at IS NOT NULL
     OR NEW.voided_at IS NULL
     OR (to_jsonb(NEW) - ARRAY['voided_at','void_reason','voided_by','updated_at'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['voided_at','void_reason','voided_by','updated_at']) THEN
    RAISE EXCEPTION 'LIB:append_only' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS library_fine_payments_void_only ON public.library_fine_payments;
CREATE TRIGGER library_fine_payments_void_only BEFORE UPDATE OR DELETE ON public.library_fine_payments
  FOR EACH ROW EXECUTE FUNCTION public.library_void_only();
DROP TRIGGER IF EXISTS library_fine_waivers_void_only ON public.library_fine_waivers;
CREATE TRIGGER library_fine_waivers_void_only BEFORE UPDATE OR DELETE ON public.library_fine_waivers
  FOR EACH ROW EXECUTE FUNCTION public.library_void_only();

-- Fines and loans are cancelled, never deleted. Also used FOR EACH STATEMENT
-- on TRUNCATE, which skips row triggers.
CREATE OR REPLACE FUNCTION public.library_no_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'LIB:append_only' USING ERRCODE = 'P0001';
END $$;
DROP TRIGGER IF EXISTS library_fines_no_delete ON public.library_fines;
CREATE TRIGGER library_fines_no_delete BEFORE DELETE ON public.library_fines
  FOR EACH ROW EXECUTE FUNCTION public.library_no_delete();
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['library_events','library_fine_payments','library_fine_waivers','library_fines','library_loans']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_no_truncate', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.library_no_delete()',
                   t || '_no_truncate', t);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS library_loans_no_delete ON public.library_loans;
CREATE TRIGGER library_loans_no_delete BEFORE DELETE ON public.library_loans
  FOR EACH ROW EXECUTE FUNCTION public.library_no_delete();

-- ---------- balances (D10) ----------

CREATE OR REPLACE VIEW public.library_fine_balances WITH (security_invoker = true) AS
SELECT f.id AS fine_id,
       f.loan_id, f.student_id, f.staff_id, f.kind, f.amount, f.cancelled_at, f.created_at,
       coalesce(p.paid, 0)     AS paid,
       coalesce(p.refunded, 0) AS refunded,
       coalesce(w.waived, 0)   AS waived,
       CASE WHEN f.cancelled_at IS NOT NULL THEN 0
            ELSE f.amount - coalesce(w.waived, 0) - coalesce(p.paid, 0) + coalesce(p.refunded, 0) END AS outstanding
FROM public.library_fines f
LEFT JOIN (
  SELECT fine_id,
         sum(amount) FILTER (WHERE kind = 'payment') AS paid,
         sum(amount) FILTER (WHERE kind = 'refund')  AS refunded
  FROM public.library_fine_payments WHERE voided_at IS NULL GROUP BY fine_id
) p ON p.fine_id = f.id
LEFT JOIN (
  SELECT fine_id, sum(amount) AS waived
  FROM public.library_fine_waivers WHERE voided_at IS NULL GROUP BY fine_id
) w ON w.fine_id = f.id;

-- Totals for one fine; callers hold the fine's row lock.
CREATE OR REPLACE FUNCTION public.library_fine_totals(p_fine_id uuid,
  OUT amount numeric, OUT paid numeric, OUT refunded numeric, OUT waived numeric, OUT cancelled boolean)
LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT f.amount,
         coalesce((SELECT sum(x.amount) FROM library_fine_payments x WHERE x.fine_id = f.id AND x.kind = 'payment' AND x.voided_at IS NULL), 0),
         coalesce((SELECT sum(x.amount) FROM library_fine_payments x WHERE x.fine_id = f.id AND x.kind = 'refund'  AND x.voided_at IS NULL), 0),
         coalesce((SELECT sum(x.amount) FROM library_fine_waivers  x WHERE x.fine_id = f.id AND x.voided_at IS NULL), 0),
         f.cancelled_at IS NOT NULL
  FROM library_fines f WHERE f.id = p_fine_id;
$$;

-- True when money is still held against a fine or part of it was waived; it
-- then cannot be cancelled. A payment fully refunded (R12) does not count.
CREATE OR REPLACE FUNCTION public.library_fine_touched(p_fine_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT (t.paid - t.refunded) > 0 OR t.waived > 0 FROM library_fine_totals(p_fine_id) t;
$$;

-- ---------- idempotency (D8) ----------

-- Returns the stored result of an earlier run of this request, or NULL when
-- this call is the first. A concurrent duplicate blocks on the insert until
-- the first transaction ends, then sees its row.
CREATE OR REPLACE FUNCTION public.library_begin_request(p_request_id uuid, p_actor uuid, p_kind text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE r library_requests%ROWTYPE;
BEGIN
  IF p_request_id IS NULL THEN PERFORM library_fail('request_id_required'); END IF;
  IF p_actor IS NULL THEN PERFORM library_fail('actor_required'); END IF;
  INSERT INTO library_requests (request_id, actor, kind) VALUES (p_request_id, p_actor, p_kind)
  ON CONFLICT (request_id) DO NOTHING;
  IF FOUND THEN RETURN NULL; END IF;
  SELECT * INTO r FROM library_requests WHERE request_id = p_request_id;
  IF r.kind <> p_kind OR r.actor <> p_actor OR r.result IS NULL THEN
    PERFORM library_fail('request_mismatch');
  END IF;
  RETURN r.result || jsonb_build_object('replayed', true);
END $$;

CREATE OR REPLACE FUNCTION public.library_finish_request(p_request_id uuid, p_result jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE library_requests SET result = p_result WHERE request_id = p_request_id;
  RETURN p_result || jsonb_build_object('replayed', false);
END $$;

CREATE OR REPLACE FUNCTION public.library_log(p_actor uuid, p_kind text, p_copy uuid, p_loan uuid,
  p_student uuid, p_staff uuid, p_details jsonb, p_ref uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO library_events (actor, kind, copy_id, loan_id, student_id, staff_id, details, ref_event_id)
  VALUES (p_actor, p_kind, p_copy, p_loan, p_student, p_staff, coalesce(p_details, '{}'::jsonb), p_ref)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.library_add_fine(p_loan library_loans, p_kind text, p_amount numeric,
  p_actor uuid, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  p_amount := library_amount(p_amount);
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;
  INSERT INTO library_fines (loan_id, student_id, staff_id, kind, amount, note, created_by)
  VALUES (p_loan.id, p_loan.student_id, p_loan.staff_id, p_kind, round(p_amount, 2), p_note, p_actor)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- D2: serialise everything that opens a loan for one borrower, then count
-- under the lock. p_exclude is a loan about to be reopened.
CREATE OR REPLACE FUNCTION public.library_assert_limit(p_student_id uuid, p_staff_id uuid, p_exclude uuid)
RETURNS int LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_max int; v_open int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('library:' || coalesce(p_student_id, p_staff_id)::text, 0));
  SELECT (rules -> CASE WHEN p_student_id IS NOT NULL THEN 'student' ELSE 'staff' END ->> 'maxBooks')::int
    INTO v_max FROM library_settings WHERE id = 1;
  SELECT count(*) INTO v_open FROM library_loans
   WHERE returned_on IS NULL AND cancelled_at IS NULL
     AND (student_id = p_student_id OR staff_id = p_staff_id)
     AND id IS DISTINCT FROM p_exclude;
  IF v_max IS NOT NULL AND v_open >= v_max THEN PERFORM library_fail('limit', v_open || '/' || v_max); END IF;
  RETURN v_open;
END $$;

-- Lock order everywhere: copy, then loan, then fines in id order (no deadlocks).
CREATE OR REPLACE FUNCTION public.library_lock_loan_with_copy(p_loan_id uuid)
RETURNS library_loans LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE l library_loans%ROWTYPE;
BEGIN
  PERFORM 1 FROM library_copies WHERE id = (SELECT copy_id FROM library_loans WHERE id = p_loan_id) FOR UPDATE;
  SELECT * INTO l FROM library_loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('loan_not_found'); END IF;
  RETURN l;
END $$;

-- Is there a live (not undone) loan/copy action after p_seq on this loan or copy?
CREATE OR REPLACE FUNCTION public.library_has_newer(p_skip uuid, p_copy uuid, p_loan uuid, p_seq bigint)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM library_events x
     WHERE x.seq > coalesce(p_seq, 0) AND x.id IS DISTINCT FROM p_skip
       AND (x.loan_id = p_loan OR x.copy_id = p_copy)
       AND x.kind IN ('issue','return','renew','return_to_renew','lost','found','damaged','withdraw','restore')
       -- a damage charge that left the copy in use concerns only its own loan
       AND NOT (x.kind = 'damaged' AND NOT coalesce((x.details ->> 'withdrawn')::boolean, false)
                AND x.loan_id IS DISTINCT FROM p_loan)
       AND NOT EXISTS (SELECT 1 FROM library_events u WHERE u.ref_event_id = x.id AND u.kind = 'undo'));
$$;

CREATE OR REPLACE FUNCTION public.library_lock_open_loan(p_loan_id uuid)
RETURNS library_loans LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE l library_loans%ROWTYPE;
BEGIN
  SELECT * INTO l FROM library_loans WHERE id = p_loan_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('loan_not_found'); END IF;
  IF l.cancelled_at IS NOT NULL OR l.returned_on IS NOT NULL THEN PERFORM library_fail('loan_not_open'); END IF;
  RETURN l;
END $$;

-- ---------- RPC: catalog ----------

-- D3: numbers only move forward, never reused. The book row is locked.
CREATE OR REPLACE FUNCTION public.library_insert_copies(b library_books, p_count int, p_price numeric)
RETURNS uuid[] LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_ids uuid[] := '{}'; v_id uuid; i int;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 500 THEN PERFORM library_fail('invalid_count'); END IF;
  FOR i IN 0 .. p_count - 1 LOOP
    INSERT INTO library_copies (book_id, copy_no, code, price)
    VALUES (b.id, b.next_copy_no + i, b.book_code || '-' || (b.next_copy_no + i), library_amount(p_price))
    RETURNING id INTO v_id;
    v_ids := v_ids || v_id;
  END LOOP;
  UPDATE library_books SET next_copy_no = b.next_copy_no + p_count WHERE id = b.id;
  RETURN v_ids;
END $$;

-- A new title and its first copies in one transaction (one undo).
-- p_book: {title, author, publisher, category, language, isbn, edition, legacy_no}, already cleaned.
CREATE OR REPLACE FUNCTION public.library_create_book(p_book jsonb, p_count int, p_price numeric,
  p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; b library_books%ROWTYPE; v_ids uuid[] := '{}'; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'create_book');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF length(trim(coalesce(p_book ->> 'title', ''))) = 0 THEN PERFORM library_fail('title_required'); END IF;
  IF p_count IS NULL OR p_count < 0 OR p_count > 500 THEN PERFORM library_fail('invalid_count'); END IF;
  p_price := library_amount(p_price);
  INSERT INTO library_books (title, title_key, author, publisher, category, language, isbn, edition, legacy_no)
  VALUES (trim(p_book ->> 'title'), coalesce(p_book ->> 'title_key', ''), p_book ->> 'author', p_book ->> 'publisher', p_book ->> 'category',
          p_book ->> 'language', p_book ->> 'isbn', p_book ->> 'edition', p_book ->> 'legacy_no')
  RETURNING * INTO b;
  IF p_count > 0 THEN v_ids := library_insert_copies(b, p_count, p_price); END IF;
  v_ev := library_log(p_actor, 'create_book', NULL, NULL, NULL, NULL,
    jsonb_build_object('book_id', b.id, 'copy_ids', to_jsonb(v_ids)));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'book_id', b.id, 'book_code', b.book_code, 'copy_ids', to_jsonb(v_ids)));
END $$;

CREATE OR REPLACE FUNCTION public.library_add_copies(p_book_id uuid, p_count int, p_price numeric,
  p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; b library_books%ROWTYPE; v_ids uuid[] := '{}'; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'add_copies');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_count IS NULL OR p_count < 1 OR p_count > 500 THEN PERFORM library_fail('invalid_count'); END IF;
  p_price := library_amount(p_price);

  SELECT * INTO b FROM library_books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('book_not_found'); END IF;
  IF b.status <> 'active' THEN PERFORM library_fail('book_withdrawn'); END IF;

  v_ids := library_insert_copies(b, p_count, p_price);

  v_ev := library_log(p_actor, 'add_copies', NULL, NULL, NULL, NULL,
    jsonb_build_object('book_id', b.id, 'copy_ids', to_jsonb(v_ids), 'first_no', b.next_copy_no, 'count', p_count));
  RETURN library_finish_request(p_request_id, jsonb_build_object('event_id', v_ev, 'copy_ids', to_jsonb(v_ids)));
END $$;

-- ---------- RPC: desk ----------

CREATE OR REPLACE FUNCTION public.library_issue_copy(p_copy_id uuid, p_student_id uuid, p_staff_id uuid,
  p_issued_on date, p_due_on date, p_rules jsonb, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; c library_copies%ROWTYPE; v_open int; v_loan uuid; v_ev uuid;
  v_class text; v_section text; v_session text; v_upd timestamptz;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'issue');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF num_nonnulls(p_student_id, p_staff_id) <> 1 THEN PERFORM library_fail('borrower_required'); END IF;
  IF p_issued_on IS NULL OR p_due_on IS NULL OR p_due_on < p_issued_on THEN PERFORM library_fail('invalid_date'); END IF;
  IF p_rules IS NULL OR jsonb_typeof(p_rules) <> 'object' OR NOT (p_rules ? 'maxRenews') THEN
    PERFORM library_fail('rules_required');
  END IF;

  SELECT * INTO c FROM library_copies WHERE id = p_copy_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('copy_not_found'); END IF;
  IF c.status <> 'available' THEN PERFORM library_fail('copy_unavailable', c.status); END IF;
  IF EXISTS (SELECT 1 FROM library_loans WHERE copy_id = c.id AND returned_on IS NULL AND cancelled_at IS NULL) THEN
    PERFORM library_fail('copy_on_loan');
  END IF;

  v_open := library_assert_limit(p_student_id, p_staff_id, NULL);

  IF p_student_id IS NOT NULL THEN
    SELECT present_class, present_section, academic_year INTO v_class, v_section, v_session
      FROM students WHERE id = p_student_id;
    IF NOT FOUND THEN PERFORM library_fail('borrower_not_found'); END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM staff_profiles WHERE id = p_staff_id) THEN
    PERFORM library_fail('borrower_not_found');
  END IF;

  INSERT INTO library_loans (copy_id, student_id, staff_id, class_at_issue, section_at_issue, session_at_issue,
                             issued_on, due_on, rules, issued_by)
  VALUES (c.id, p_student_id, p_staff_id, v_class, v_section, v_session, p_issued_on, p_due_on, p_rules, p_actor)
  RETURNING id, updated_at INTO v_loan, v_upd;

  v_ev := library_log(p_actor, 'issue', c.id, v_loan, p_student_id, p_staff_id,
    jsonb_build_object('due_on', p_due_on));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'loan_id', v_loan, 'due_on', p_due_on, 'updated_at', v_upd, 'open_loans', v_open + 1));
END $$;

CREATE OR REPLACE FUNCTION public.library_return_copy(p_loan_id uuid, p_returned_on date, p_fine numeric,
  p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; l library_loans%ROWTYPE; v_fine uuid; v_ev uuid; v_upd timestamptz;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'return');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  l := library_lock_open_loan(p_loan_id);
  IF p_returned_on IS NULL OR p_returned_on < l.issued_on THEN PERFORM library_fail('invalid_date'); END IF;
  p_fine := library_amount(p_fine);

  UPDATE library_loans SET returned_on = p_returned_on, outcome = 'returned', returned_by = p_actor
   WHERE id = l.id RETURNING updated_at INTO v_upd;
  v_fine := library_add_fine(l, 'overdue', p_fine, p_actor);

  v_ev := library_log(p_actor, 'return', l.copy_id, l.id, l.student_id, l.staff_id,
    jsonb_build_object('returned_on', p_returned_on, 'fine_id', v_fine, 'fine', coalesce(p_fine, 0)));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'loan_id', l.id, 'fine_id', v_fine, 'fine', coalesce(p_fine, 0), 'updated_at', v_upd));
END $$;

-- Shared by renew and return-to-renew; the loan is locked and open.
CREATE OR REPLACE FUNCTION public.library_apply_renew(l library_loans, p_new_due date, p_fine numeric,
  p_renewed_on date, p_actor uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF l.renew_count >= coalesce((l.rules ->> 'maxRenews')::int, 0) THEN PERFORM library_fail('max_renews'); END IF;
  IF p_new_due IS NULL OR p_new_due <= l.due_on THEN PERFORM library_fail('no_gain'); END IF;
  IF p_renewed_on IS NULL OR p_renewed_on < l.issued_on THEN PERFORM library_fail('invalid_date'); END IF;
  p_fine := library_amount(p_fine);
  UPDATE library_loans SET due_on = p_new_due, renew_count = l.renew_count + 1,
         overdue_renewed = l.overdue_renewed OR p_renewed_on > l.due_on
   WHERE id = l.id;
  -- R10: fine accrued up to an overdue renew is fixed now.
  RETURN library_add_fine(l, 'overdue', p_fine, p_actor);
END $$;

CREATE OR REPLACE FUNCTION public.library_renew_loan(p_loan_id uuid, p_new_due date, p_fine numeric,
  p_renewed_on date, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; l library_loans%ROWTYPE; v_fine uuid; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'renew');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  l := library_lock_open_loan(p_loan_id);
  v_fine := library_apply_renew(l, p_new_due, p_fine, p_renewed_on, p_actor);
  v_ev := library_log(p_actor, 'renew', l.copy_id, l.id, l.student_id, l.staff_id,
    jsonb_build_object('old_due', l.due_on, 'new_due', p_new_due, 'fine_id', v_fine,
                       'renew_count', l.renew_count + 1, 'old_overdue_renewed', l.overdue_renewed));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'loan_id', l.id, 'due_on', p_new_due, 'fine_id', v_fine,
    'fine', coalesce(library_amount(p_fine), 0),
    'updated_at', (SELECT updated_at FROM library_loans WHERE id = l.id)));
END $$;

-- W3: the book was scanned back, but the borrower wanted a renew. Reopen the
-- loan (cancelling the overdue fine that return wrote) and renew it.
CREATE OR REPLACE FUNCTION public.library_return_to_renew(p_loan_id uuid, p_new_due date, p_fine numeric,
  p_renewed_on date, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; l library_loans%ROWTYPE; v_ret library_events%ROWTYPE; v_old_fine uuid;
  v_fine uuid; v_ev uuid; v_old_by uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'return_to_renew');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  l := library_lock_loan_with_copy(p_loan_id);
  IF l.cancelled_at IS NOT NULL OR l.outcome IS DISTINCT FROM 'returned' THEN PERFORM library_fail('loan_not_returned'); END IF;
  IF EXISTS (SELECT 1 FROM library_loans WHERE copy_id = l.copy_id AND id <> l.id
               AND returned_on IS NULL AND cancelled_at IS NULL) THEN
    PERFORM library_fail('copy_on_loan');
  END IF;
  IF (SELECT status FROM library_copies WHERE id = l.copy_id) <> 'available' THEN PERFORM library_fail('copy_unavailable'); END IF;

  SELECT * INTO v_ret FROM library_events e
   WHERE e.loan_id = l.id AND e.kind = 'return'
     AND NOT EXISTS (SELECT 1 FROM library_events u WHERE u.ref_event_id = e.id AND u.kind = 'undo')
   ORDER BY e.seq DESC LIMIT 1;
  -- The return must still be the latest action on the loan and the copy.
  IF v_ret.id IS NULL OR library_has_newer(v_ret.id, l.copy_id, l.id, v_ret.seq) THEN
    PERFORM library_fail('newer_action');
  END IF;
  PERFORM library_assert_limit(l.student_id, l.staff_id, l.id);
  v_old_fine := nullif(v_ret.details ->> 'fine_id', '')::uuid;
  IF v_old_fine IS NOT NULL THEN
    PERFORM 1 FROM library_fines WHERE id = v_old_fine FOR UPDATE;
    IF library_fine_touched(v_old_fine) THEN PERFORM library_fail('fine_has_payments'); END IF;
    UPDATE library_fines SET cancelled_at = now(), cancel_reason = 'return_to_renew' WHERE id = v_old_fine AND cancelled_at IS NULL;
  END IF;

  v_old_by := l.returned_by;
  UPDATE library_loans SET returned_on = NULL, outcome = NULL, returned_by = NULL WHERE id = l.id;
  l.returned_on := NULL; l.outcome := NULL; l.returned_by := NULL;
  v_fine := library_apply_renew(l, p_new_due, p_fine, p_renewed_on, p_actor);

  v_ev := library_log(p_actor, 'return_to_renew', l.copy_id, l.id, l.student_id, l.staff_id,
    jsonb_build_object('return_event_id', v_ret.id, 'returned_on', (v_ret.details ->> 'returned_on'),
                       'old_returned_by', v_old_by, 'cancelled_fine_id', v_old_fine,
                       'old_due', l.due_on, 'new_due', p_new_due, 'fine_id', v_fine,
                       'renew_count', l.renew_count + 1, 'old_overdue_renewed', l.overdue_renewed));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'loan_id', l.id, 'due_on', p_new_due, 'fine_id', v_fine,
    'fine', coalesce(library_amount(p_fine), 0)));
END $$;

-- ---------- RPC: Excel import (K2) ----------

-- The whole confirmed import in one transaction, one event, one undo.
-- p_items: [{"book_id": uuid, "copies": n, "price": x}  -- more copies of an existing title
--          | {"book": {title, title_key, author, ...}, "copies": n, "price": x}]  -- a new title
CREATE OR REPLACE FUNCTION public.library_import_books(p_items jsonb, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; v_item jsonb; b library_books%ROWTYPE; v_ids uuid[]; v_count int; v_price numeric;
  v_out jsonb := '[]'::jsonb; v_created int := 0; v_copies int := 0; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'import');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 2000 THEN
    PERFORM library_fail('invalid_count');
  END IF;
  -- Existing titles locked up front in id order (two imports never deadlock).
  PERFORM 1 FROM library_books
   WHERE id IN (SELECT library_uuid(x, 'book_id') FROM jsonb_array_elements(p_items) x WHERE x ? 'book_id')
   ORDER BY id FOR UPDATE;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_count := coalesce((v_item ->> 'copies')::int, 0);
    v_price := library_amount((v_item ->> 'price')::numeric);
    IF v_item ? 'book_id' THEN
      SELECT * INTO b FROM library_books WHERE id = library_uuid(v_item, 'book_id');
      IF NOT FOUND THEN PERFORM library_fail('book_not_found'); END IF;
      IF b.status <> 'active' THEN PERFORM library_fail('book_withdrawn', b.title); END IF;
      IF v_count < 1 THEN PERFORM library_fail('invalid_count'); END IF;
      v_ids := library_insert_copies(b, v_count, v_price);
      v_out := v_out || jsonb_build_object('book_id', b.id, 'copy_ids', to_jsonb(v_ids), 'created', false);
    ELSE
      IF length(trim(coalesce(v_item #>> '{book,title}', ''))) = 0 THEN PERFORM library_fail('title_required'); END IF;
      IF v_count < 0 OR v_count > 500 THEN PERFORM library_fail('invalid_count'); END IF;
      INSERT INTO library_books (title, title_key, author, publisher, category, language, isbn, edition, legacy_no)
      VALUES (trim(v_item #>> '{book,title}'), coalesce(v_item #>> '{book,title_key}', ''), v_item #>> '{book,author}',
              v_item #>> '{book,publisher}', v_item #>> '{book,category}', v_item #>> '{book,language}',
              v_item #>> '{book,isbn}', v_item #>> '{book,edition}', v_item #>> '{book,legacy_no}')
      RETURNING * INTO b;
      v_ids := CASE WHEN v_count > 0 THEN library_insert_copies(b, v_count, v_price) ELSE '{}'::uuid[] END;
      v_out := v_out || jsonb_build_object('book_id', b.id, 'copy_ids', to_jsonb(v_ids), 'created', true);
      v_created := v_created + 1;
    END IF;
    v_copies := v_copies + coalesce(array_length(v_ids, 1), 0);
  END LOOP;

  v_ev := library_log(p_actor, 'import', NULL, NULL, NULL, NULL, jsonb_build_object('items', v_out));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'created', v_created, 'copies', v_copies, 'items', jsonb_array_length(p_items)));
END $$;

-- ---------- RPC: catalog upkeep (K9) ----------

-- Take a copy off the shelf (worn out, weeded) or put it back. Not while on loan.
CREATE OR REPLACE FUNCTION public.library_set_copy_withdrawn(p_copy_id uuid, p_withdrawn boolean, p_reason text,
  p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; c library_copies%ROWTYPE; v_ev uuid; v_kind text;
BEGIN
  v_kind := CASE WHEN p_withdrawn THEN 'withdraw' ELSE 'restore' END;
  v_prev := library_begin_request(p_request_id, p_actor, v_kind);
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  SELECT * INTO c FROM library_copies WHERE id = p_copy_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('copy_not_found'); END IF;
  IF p_withdrawn THEN
    IF c.status <> 'available' THEN PERFORM library_fail('copy_unavailable', c.status); END IF;
    IF EXISTS (SELECT 1 FROM library_loans WHERE copy_id = c.id AND returned_on IS NULL AND cancelled_at IS NULL) THEN
      PERFORM library_fail('copy_on_loan');
    END IF;
    UPDATE library_copies SET status = 'withdrawn' WHERE id = c.id;
  ELSE
    IF c.status <> 'withdrawn' THEN PERFORM library_fail('state_changed'); END IF;
    UPDATE library_copies SET status = 'available' WHERE id = c.id;
  END IF;
  v_ev := library_log(p_actor, v_kind, c.id, NULL, NULL, NULL,
    jsonb_build_object('reason', nullif(trim(coalesce(p_reason, '')), '')));
  RETURN library_finish_request(p_request_id, jsonb_build_object('event_id', v_ev, 'copy_id', c.id));
END $$;

-- K9: a title nobody ever borrowed can be removed outright; the event keeps
-- the full rows so undo puts back the same ids and codes (stickers stay valid).
-- A title with any loan or copy history is withdrawn instead.
CREATE OR REPLACE FUNCTION public.library_delete_book(p_book_id uuid, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; b library_books%ROWTYPE; v_copies jsonb; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'delete_book');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  SELECT * INTO b FROM library_books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('book_not_found'); END IF;
  PERFORM 1 FROM library_copies WHERE book_id = b.id ORDER BY id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM library_loans l JOIN library_copies c ON c.id = l.copy_id WHERE c.book_id = b.id) THEN
    PERFORM library_fail('copy_has_loans');
  END IF;
  IF EXISTS (SELECT 1 FROM library_events x JOIN library_copies c ON c.id = x.copy_id WHERE c.book_id = b.id) THEN
    PERFORM library_fail('copy_has_history');
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.copy_no), '[]'::jsonb) INTO v_copies
    FROM library_copies c WHERE c.book_id = b.id;
  DELETE FROM library_copies WHERE book_id = b.id;
  DELETE FROM library_books WHERE id = b.id;
  v_ev := library_log(p_actor, 'delete_book', NULL, NULL, NULL, NULL,
    jsonb_build_object('book_id', b.id, 'book', to_jsonb(b), 'copies', v_copies));
  RETURN library_finish_request(p_request_id, jsonb_build_object('event_id', v_ev, 'book_id', b.id, 'title', b.title));
END $$;

-- ---------- RPC: lost / found / damaged ----------

-- With an open loan: the borrower lost it (overdue fine up to today + lost
-- charge, R11). Without one: lost from the shelf, no fine.
CREATE OR REPLACE FUNCTION public.library_mark_lost(p_copy_id uuid, p_lost_on date, p_overdue_fine numeric,
  p_lost_amount numeric, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; c library_copies%ROWTYPE; l library_loans%ROWTYPE; v_over uuid; v_lost uuid; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'lost');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_lost_on IS NULL THEN PERFORM library_fail('invalid_date'); END IF;
  p_overdue_fine := library_amount(p_overdue_fine);
  p_lost_amount := library_amount(p_lost_amount);
  SELECT * INTO c FROM library_copies WHERE id = p_copy_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('copy_not_found'); END IF;
  IF c.status <> 'available' THEN PERFORM library_fail('copy_unavailable', c.status); END IF;

  SELECT * INTO l FROM library_loans WHERE copy_id = c.id AND returned_on IS NULL AND cancelled_at IS NULL FOR UPDATE;
  IF FOUND THEN
    IF p_lost_on < l.issued_on THEN PERFORM library_fail('invalid_date'); END IF;
    UPDATE library_loans SET returned_on = p_lost_on, outcome = 'lost', returned_by = p_actor WHERE id = l.id;
    v_over := library_add_fine(l, 'overdue', p_overdue_fine, p_actor);
    v_lost := library_add_fine(l, 'lost', p_lost_amount, p_actor);
  ELSIF coalesce(p_overdue_fine, 0) > 0 OR coalesce(p_lost_amount, 0) > 0 THEN
    PERFORM library_fail('no_open_loan');
  END IF;
  UPDATE library_copies SET status = 'lost' WHERE id = c.id;

  v_ev := library_log(p_actor, 'lost', c.id, l.id, l.student_id, l.staff_id,
    jsonb_build_object('lost_on', p_lost_on, 'overdue_fine_id', v_over, 'lost_fine_id', v_lost));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'loan_id', l.id, 'overdue_fine_id', v_over, 'lost_fine_id', v_lost,
    'overdue', coalesce(p_overdue_fine, 0), 'lost', coalesce(p_lost_amount, 0)));
END $$;

-- R12. p_overdue_total is the loan's whole overdue fine recomputed by TS up to
-- the found date (borrower) or the lost date (library), cap included; only
-- the difference to what is already charged is added. p_keep_lost_fine keeps
-- a lost charge that was already paid (the "রেখে দিন" choice).
CREATE OR REPLACE FUNCTION public.library_mark_found(p_copy_id uuid, p_source text, p_found_on date,
  p_overdue_total numeric, p_keep_lost_fine boolean, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; c library_copies%ROWTYPE; l library_loans%ROWTYPE; v_charged numeric := 0;
  v_extra uuid; v_cancelled uuid[] := '{}'; v_lost library_events%ROWTYPE; v_fine uuid; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'found');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_source NOT IN ('borrower', 'library') THEN PERFORM library_fail('invalid_source'); END IF;
  IF p_found_on IS NULL THEN PERFORM library_fail('invalid_date'); END IF;
  p_overdue_total := library_amount(p_overdue_total);
  SELECT * INTO c FROM library_copies WHERE id = p_copy_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('copy_not_found'); END IF;
  IF c.status <> 'lost' THEN PERFORM library_fail('copy_not_lost'); END IF;

  -- The loss being resolved is the copy's latest live 'lost' event. A loss
  -- from the shelf has no loan; an older borrower's loan is never touched.
  SELECT * INTO v_lost FROM library_events e
   WHERE e.copy_id = c.id AND e.kind = 'lost'
     AND NOT EXISTS (SELECT 1 FROM library_events u WHERE u.ref_event_id = e.id AND u.kind = 'undo')
   ORDER BY e.seq DESC LIMIT 1;
  IF v_lost.loan_id IS NOT NULL THEN
    SELECT * INTO l FROM library_loans WHERE id = v_lost.loan_id AND outcome = 'lost' AND cancelled_at IS NULL FOR UPDATE;
  END IF;
  IF l.id IS NOT NULL THEN
    v_fine := library_uuid(v_lost.details, 'lost_fine_id');
    IF v_fine IS NOT NULL AND NOT coalesce(p_keep_lost_fine, false) THEN
      PERFORM 1 FROM library_fines WHERE id = v_fine FOR UPDATE;
      IF library_fine_touched(v_fine) THEN PERFORM library_fail('fine_has_payments'); END IF;
      UPDATE library_fines SET cancelled_at = now(), cancel_reason = 'found' WHERE id = v_fine AND cancelled_at IS NULL;
      IF FOUND THEN v_cancelled := v_cancelled || v_fine; END IF;
    END IF;
    SELECT coalesce(sum(amount), 0) INTO v_charged FROM library_fines
     WHERE loan_id = l.id AND kind = 'overdue' AND cancelled_at IS NULL;
    IF p_source = 'borrower' AND coalesce(p_overdue_total, 0) > v_charged THEN
      v_extra := library_add_fine(l, 'overdue', p_overdue_total - v_charged, p_actor, 'found');
    END IF;
  END IF;
  UPDATE library_copies SET status = 'available' WHERE id = c.id;

  v_ev := library_log(p_actor, 'found', c.id, l.id, l.student_id, l.staff_id,
    jsonb_build_object('source', p_source, 'found_on', p_found_on,
                       'cancelled_fine_ids', to_jsonb(v_cancelled), 'extra_fine_id', v_extra));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'loan_id', l.id, 'extra_fine_id', v_extra, 'cancelled_fine_ids', to_jsonb(v_cancelled)));
END $$;

-- R15: damage on a returned loan; amount limited to price, else default lost amount.
CREATE OR REPLACE FUNCTION public.library_mark_damaged(p_loan_id uuid, p_amount numeric, p_withdraw boolean,
  p_note text, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; l library_loans%ROWTYPE; c library_copies%ROWTYPE; v_limit numeric; v_fine uuid; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'damaged');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  l := library_lock_loan_with_copy(p_loan_id);
  IF l.cancelled_at IS NOT NULL OR l.outcome IS DISTINCT FROM 'returned' THEN PERFORM library_fail('loan_not_returned'); END IF;
  SELECT * INTO c FROM library_copies WHERE id = l.copy_id FOR UPDATE;
  v_limit := coalesce(c.price, (l.rules ->> 'defaultLostAmount')::numeric, 0);
  p_amount := library_amount(p_amount);
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > v_limit THEN PERFORM library_fail('invalid_amount', v_limit::text); END IF;

  v_fine := library_add_fine(l, 'damaged', p_amount, p_actor, p_note);
  IF coalesce(p_withdraw, false) THEN
    IF c.status <> 'available' OR EXISTS (SELECT 1 FROM library_loans WHERE copy_id = c.id
                                           AND returned_on IS NULL AND cancelled_at IS NULL) THEN
      PERFORM library_fail('copy_on_loan');
    END IF;
    UPDATE library_copies SET status = 'withdrawn' WHERE id = c.id;
  END IF;

  v_ev := library_log(p_actor, 'damaged', c.id, l.id, l.student_id, l.staff_id,
    jsonb_build_object('fine_id', v_fine, 'amount', p_amount, 'withdrawn', coalesce(p_withdraw, false),
                       'old_status', c.status));
  RETURN library_finish_request(p_request_id, jsonb_build_object('event_id', v_ev, 'fine_id', v_fine));
END $$;

-- ---------- RPC: money ----------

-- Parses [{fine_id, amount}, ...]; malformed ids or amounts fail as LIB: codes.
CREATE OR REPLACE FUNCTION public.library_payment_lines(p_lines jsonb)
RETURNS TABLE (fine_id uuid, amount numeric) LANGUAGE plpgsql STABLE SET search_path = public, pg_temp AS $$
DECLARE x jsonb;
BEGIN
  FOR x IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    BEGIN
      fine_id := (x ->> 'fine_id')::uuid;
      amount := (x ->> 'amount')::numeric;
    EXCEPTION WHEN data_exception THEN
      PERFORM library_fail('invalid_amount');
    END;
    IF fine_id IS NULL THEN PERFORM library_fail('fine_not_found'); END IF;
    amount := library_amount(amount);
    RETURN NEXT;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.library_next_receipt()
RETURNS bigint LANGUAGE sql SET search_path = public, pg_temp AS $$
  UPDATE library_counters SET value = value + 1 WHERE name = 'receipt' RETURNING value;
$$;

-- D9/D10: one receipt for one or more fines of the same borrower.
-- p_lines = [{"fine_id": uuid, "amount": number}, ...]
CREATE OR REPLACE FUNCTION public.library_record_payment(p_lines jsonb, p_paid_on date, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; v_line record; t record; v_receipt bigint; v_ids uuid[] := '{}'; v_id uuid; v_ev uuid;
  v_borrower text; v_this text; v_student uuid; v_staff uuid; v_total numeric := 0;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'payment');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_paid_on IS NULL THEN PERFORM library_fail('invalid_date'); END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    PERFORM library_fail('invalid_amount');
  END IF;
  IF (SELECT count(DISTINCT fine_id) FROM library_payment_lines(p_lines)) <> jsonb_array_length(p_lines) THEN
    PERFORM library_fail('duplicate_fine');
  END IF;

  -- Lock every fine in id order so two receipts never deadlock.
  PERFORM 1 FROM library_fines
   WHERE id IN (SELECT fine_id FROM library_payment_lines(p_lines))
   ORDER BY id FOR UPDATE;

  v_receipt := library_next_receipt();
  FOR v_line IN SELECT * FROM library_payment_lines(p_lines) LOOP
    SELECT f.student_id, f.staff_id INTO v_student, v_staff FROM library_fines f WHERE f.id = v_line.fine_id;
    IF NOT FOUND THEN PERFORM library_fail('fine_not_found'); END IF;
    v_this := coalesce(v_student, v_staff)::text;
    IF v_borrower IS NOT NULL AND v_borrower <> v_this THEN PERFORM library_fail('mixed_borrowers'); END IF;
    v_borrower := v_this;
    SELECT * INTO t FROM library_fine_totals(v_line.fine_id);
    IF t.cancelled THEN PERFORM library_fail('fine_cancelled'); END IF;
    IF v_line.amount IS NULL OR v_line.amount <= 0
       OR v_line.amount > t.amount - t.waived - t.paid + t.refunded THEN
      PERFORM library_fail('over_balance');
    END IF;
    INSERT INTO library_fine_payments (fine_id, kind, amount, receipt_no, paid_on, collected_by)
    VALUES (v_line.fine_id, 'payment', v_line.amount, v_receipt, p_paid_on, p_actor) RETURNING id INTO v_id;
    v_ids := v_ids || v_id;
    v_total := v_total + v_line.amount;
  END LOOP;

  v_ev := library_log(p_actor, 'payment', NULL, NULL, v_student, v_staff,
    jsonb_build_object('receipt_no', v_receipt, 'payment_ids', to_jsonb(v_ids), 'total', v_total));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'receipt_no', v_receipt, 'payment_ids', to_jsonb(v_ids), 'total', v_total));
END $$;

-- R13: money handed back later, with its own receipt number.
CREATE OR REPLACE FUNCTION public.library_record_refund(p_fine_id uuid, p_amount numeric, p_paid_on date,
  p_note text, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; f library_fines%ROWTYPE; t record; v_receipt bigint; v_id uuid; v_ev uuid; v_amt numeric;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'refund');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF p_paid_on IS NULL THEN PERFORM library_fail('invalid_date'); END IF;
  SELECT * INTO f FROM library_fines WHERE id = p_fine_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('fine_not_found'); END IF;
  SELECT * INTO t FROM library_fine_totals(f.id);
  v_amt := library_amount(p_amount);
  IF v_amt IS NULL OR v_amt <= 0 OR v_amt > t.paid - t.refunded THEN PERFORM library_fail('over_paid'); END IF;
  v_receipt := library_next_receipt();
  INSERT INTO library_fine_payments (fine_id, kind, amount, receipt_no, paid_on, collected_by, note)
  VALUES (f.id, 'refund', v_amt, v_receipt, p_paid_on, p_actor, p_note) RETURNING id INTO v_id;
  v_ev := library_log(p_actor, 'refund', NULL, f.loan_id, f.student_id, f.staff_id,
    jsonb_build_object('receipt_no', v_receipt, 'payment_id', v_id, 'amount', v_amt));
  RETURN library_finish_request(p_request_id, jsonb_build_object(
    'event_id', v_ev, 'receipt_no', v_receipt, 'payment_id', v_id, 'amount', v_amt));
END $$;

-- R13: a receipt entered by mistake. Voids every line of the receipt.
CREATE OR REPLACE FUNCTION public.library_void_payment(p_receipt_no bigint, p_reason text, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; v_ids uuid[]; r record; t record; v_ev uuid;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'void_payment');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF length(trim(coalesce(p_reason, ''))) = 0 THEN PERFORM library_fail('reason_required'); END IF;
  PERFORM 1 FROM library_fines WHERE id IN (SELECT fine_id FROM library_fine_payments WHERE receipt_no = p_receipt_no)
   ORDER BY id FOR UPDATE;
  SELECT array_agg(id) INTO v_ids FROM library_fine_payments WHERE receipt_no = p_receipt_no AND voided_at IS NULL;
  IF v_ids IS NULL THEN PERFORM library_fail('receipt_not_found'); END IF;
  UPDATE library_fine_payments SET voided_at = now(), voided_by = p_actor, void_reason = trim(p_reason)
   WHERE id = ANY (v_ids);
  -- Voiding a payment must not leave more refunded than paid; voiding a
  -- refund must not push the fine over its amount.
  FOR r IN SELECT DISTINCT fine_id FROM library_fine_payments WHERE id = ANY (v_ids) LOOP
    SELECT * INTO t FROM library_fine_totals(r.fine_id);
    IF t.paid - t.refunded < 0 THEN PERFORM library_fail('refund_first'); END IF;
    IF NOT t.cancelled AND t.waived + t.paid - t.refunded > t.amount THEN PERFORM library_fail('over_balance'); END IF;
    -- A cancelled fine must not end up holding the borrower's money.
    IF t.cancelled AND t.paid - t.refunded > 0 THEN PERFORM library_fail('fine_cancelled'); END IF;
  END LOOP;
  v_ev := library_log(p_actor, 'void_payment', NULL, NULL, NULL, NULL,
    jsonb_build_object('receipt_no', p_receipt_no, 'payment_ids', to_jsonb(v_ids), 'reason', trim(p_reason)));
  RETURN library_finish_request(p_request_id, jsonb_build_object('event_id', v_ev, 'payment_ids', to_jsonb(v_ids)));
END $$;

-- R14 / D10. The amount (full / half / custom) is chosen in TS; here it must fit.
CREATE OR REPLACE FUNCTION public.library_waive(p_fine_id uuid, p_amount numeric, p_reason text,
  p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_prev jsonb; f library_fines%ROWTYPE; t record; v_id uuid; v_ev uuid; v_amt numeric;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'waive');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  IF length(trim(coalesce(p_reason, ''))) = 0 THEN PERFORM library_fail('reason_required'); END IF;
  SELECT * INTO f FROM library_fines WHERE id = p_fine_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('fine_not_found'); END IF;
  SELECT * INTO t FROM library_fine_totals(f.id);
  IF t.cancelled THEN PERFORM library_fail('fine_cancelled'); END IF;
  v_amt := library_amount(p_amount);
  IF v_amt IS NULL OR v_amt <= 0 OR v_amt > t.amount - t.waived - t.paid + t.refunded THEN
    PERFORM library_fail('over_balance');
  END IF;
  INSERT INTO library_fine_waivers (fine_id, amount, reason, waived_by)
  VALUES (f.id, v_amt, trim(p_reason), p_actor) RETURNING id INTO v_id;
  v_ev := library_log(p_actor, 'waive', NULL, f.loan_id, f.student_id, f.staff_id,
    jsonb_build_object('fine_id', f.id, 'waiver_id', v_id, 'amount', v_amt));
  RETURN library_finish_request(p_request_id, jsonb_build_object('event_id', v_ev, 'waiver_id', v_id, 'amount', v_amt));
END $$;

-- ---------- RPC: undo (D6) ----------

-- Reverse of adding copies (and of creating their title when p_remove_book):
-- refused once a copy was lent, printed or has any history, or when the title
-- holds copies that were not part of the action.
CREATE OR REPLACE FUNCTION public.library_remove_copies(p_book_id uuid, p_copy_ids uuid[], p_remove_book boolean)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  -- Lock order book -> copies; nothing else takes the book lock while holding a copy.
  PERFORM 1 FROM library_books WHERE id = p_book_id FOR UPDATE;
  IF NOT FOUND THEN PERFORM library_fail('state_changed'); END IF;
  PERFORM 1 FROM library_copies WHERE book_id = p_book_id ORDER BY id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM library_loans WHERE copy_id = ANY (p_copy_ids)) THEN
    PERFORM library_fail('copy_has_loans');
  END IF;
  -- A printed sticker is already on a book, and any later event (lost,
  -- found, ...) is history: deleting the copy would orphan either.
  IF EXISTS (SELECT 1 FROM library_copies WHERE id = ANY (p_copy_ids)
               AND (sticker_printed_at IS NOT NULL OR status <> 'available'))
     OR EXISTS (SELECT 1 FROM library_events x WHERE x.copy_id = ANY (p_copy_ids)) THEN
    PERFORM library_fail('state_changed');
  END IF;
  IF p_remove_book AND EXISTS (SELECT 1 FROM library_copies WHERE book_id = p_book_id AND NOT (id = ANY (p_copy_ids))) THEN
    PERFORM library_fail('state_changed');
  END IF;
  -- D3: next_copy_no is not rolled back, so the deleted numbers are never reused.
  DELETE FROM library_copies WHERE id = ANY (p_copy_ids) AND sticker_printed_at IS NULL AND status = 'available';
  IF EXISTS (SELECT 1 FROM library_copies WHERE id = ANY (p_copy_ids)) THEN
    PERFORM library_fail('state_changed');
  END IF;
  IF p_remove_book THEN
    DELETE FROM library_books WHERE id = p_book_id;
  END IF;
END $$;

-- Cancels fines written by the undone action; refuses if any carries money.
CREATE OR REPLACE FUNCTION public.library_cancel_fines(p_ids uuid[], p_reason text)
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v uuid;
BEGIN
  FOR v IN SELECT DISTINCT x FROM unnest(coalesce(p_ids, '{}'::uuid[])) x WHERE x IS NOT NULL ORDER BY x LOOP
    PERFORM 1 FROM library_fines WHERE id = v FOR UPDATE;
    IF library_fine_touched(v) THEN PERFORM library_fail('fine_has_payments'); END IF;
    UPDATE library_fines SET cancelled_at = now(), cancel_reason = p_reason WHERE id = v AND cancelled_at IS NULL;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.library_uuid(p jsonb, p_key text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$ SELECT nullif(p ->> p_key, '')::uuid $$;

CREATE OR REPLACE FUNCTION public.library_uuids(p jsonb, p_key text)
RETURNS uuid[] LANGUAGE sql IMMUTABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(array_agg(x::uuid), '{}') FROM jsonb_array_elements_text(coalesce(p -> p_key, '[]'::jsonb)) x
$$;

CREATE OR REPLACE FUNCTION public.library_undo(p_event_id uuid, p_actor uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  v_prev jsonb; e library_events%ROWTYPE; l library_loans%ROWTYPE; c library_copies%ROWTYPE;
  d jsonb; v_ev uuid; v_newer boolean; v_item jsonb;
BEGIN
  v_prev := library_begin_request(p_request_id, p_actor, 'undo');
  IF v_prev IS NOT NULL THEN RETURN v_prev; END IF;
  SELECT * INTO e FROM library_events WHERE id = p_event_id;
  IF NOT FOUND THEN PERFORM library_fail('event_not_found'); END IF;
  -- Serialise undos of one event; the unique index is the final guard.
  PERFORM pg_advisory_xact_lock(hashtextextended('library-undo:' || e.id::text, 0));
  IF EXISTS (SELECT 1 FROM library_events WHERE ref_event_id = e.id AND kind = 'undo') THEN
    PERFORM library_fail('already_undone');
  END IF;
  d := e.details;

  IF e.copy_id IS NOT NULL THEN
    SELECT * INTO c FROM library_copies WHERE id = e.copy_id FOR UPDATE;
  END IF;
  IF e.loan_id IS NOT NULL THEN
    SELECT * INTO l FROM library_loans WHERE id = e.loan_id FOR UPDATE;
  END IF;
  -- Only the latest action on a loan or copy can be undone (a renew after a
  -- return, a re-issue after "found", ...). A damage charge that left the
  -- copy in use depends only on its own loan.
  IF e.kind IN ('issue','return','renew','return_to_renew','lost','found','damaged','withdraw','restore') THEN
    v_newer := library_has_newer(e.id,
      CASE WHEN e.kind = 'damaged' AND NOT coalesce((d ->> 'withdrawn')::boolean, false) THEN NULL ELSE e.copy_id END,
      e.loan_id, e.seq);
    IF v_newer THEN PERFORM library_fail('newer_action'); END IF;
  END IF;

  CASE e.kind
    WHEN 'issue' THEN
      IF l.cancelled_at IS NOT NULL OR l.returned_on IS NOT NULL THEN PERFORM library_fail('loan_not_open'); END IF;
      IF EXISTS (SELECT 1 FROM library_fines WHERE loan_id = l.id AND cancelled_at IS NULL) THEN
        PERFORM library_fail('state_changed');
      END IF;
      UPDATE library_loans SET cancelled_at = now() WHERE id = l.id;

    WHEN 'return' THEN
      IF l.cancelled_at IS NOT NULL OR l.outcome IS DISTINCT FROM 'returned' THEN PERFORM library_fail('loan_not_returned'); END IF;
      IF c.status <> 'available' THEN PERFORM library_fail('copy_unavailable'); END IF;
      IF EXISTS (SELECT 1 FROM library_loans WHERE copy_id = l.copy_id AND id <> l.id
                   AND returned_on IS NULL AND cancelled_at IS NULL) THEN
        PERFORM library_fail('copy_on_loan');
      END IF;
      PERFORM library_assert_limit(l.student_id, l.staff_id, l.id);
      PERFORM library_cancel_fines(ARRAY[library_uuid(d, 'fine_id')], 'undo');
      UPDATE library_loans SET returned_on = NULL, outcome = NULL, returned_by = NULL WHERE id = l.id;

    WHEN 'renew' THEN
      IF l.cancelled_at IS NOT NULL OR l.returned_on IS NOT NULL
         OR l.renew_count <> (d ->> 'renew_count')::int OR l.due_on <> (d ->> 'new_due')::date THEN
        PERFORM library_fail('state_changed');
      END IF;
      PERFORM library_cancel_fines(ARRAY[library_uuid(d, 'fine_id')], 'undo');
      UPDATE library_loans SET due_on = (d ->> 'old_due')::date, renew_count = l.renew_count - 1,
             overdue_renewed = coalesce((d ->> 'old_overdue_renewed')::boolean, false)
       WHERE id = l.id;

    WHEN 'return_to_renew' THEN
      IF l.cancelled_at IS NOT NULL OR l.returned_on IS NOT NULL
         OR l.renew_count <> (d ->> 'renew_count')::int OR l.due_on <> (d ->> 'new_due')::date THEN
        PERFORM library_fail('state_changed');
      END IF;
      PERFORM library_cancel_fines(ARRAY[library_uuid(d, 'fine_id')], 'undo');
      UPDATE library_loans SET due_on = (d ->> 'old_due')::date, renew_count = l.renew_count - 1,
             overdue_renewed = coalesce((d ->> 'old_overdue_renewed')::boolean, false),
             returned_on = (d ->> 'returned_on')::date, outcome = 'returned',
             returned_by = library_uuid(d, 'old_returned_by')
       WHERE id = l.id;
      UPDATE library_fines SET cancelled_at = NULL, cancel_reason = NULL
       WHERE id = library_uuid(d, 'cancelled_fine_id') AND cancel_reason = 'return_to_renew';

    WHEN 'lost' THEN
      IF c.status <> 'lost' THEN PERFORM library_fail('state_changed'); END IF;
      IF e.loan_id IS NOT NULL THEN
        IF l.cancelled_at IS NOT NULL OR l.outcome IS DISTINCT FROM 'lost' THEN PERFORM library_fail('state_changed'); END IF;
        PERFORM library_assert_limit(l.student_id, l.staff_id, l.id);
        PERFORM library_cancel_fines(ARRAY[library_uuid(d, 'overdue_fine_id'), library_uuid(d, 'lost_fine_id')], 'undo');
        UPDATE library_loans SET returned_on = NULL, outcome = NULL, returned_by = NULL WHERE id = l.id;
      END IF;
      UPDATE library_copies SET status = 'available' WHERE id = c.id;

    WHEN 'found' THEN
      IF c.status <> 'available' OR EXISTS (SELECT 1 FROM library_loans WHERE copy_id = c.id
                                              AND returned_on IS NULL AND cancelled_at IS NULL) THEN
        PERFORM library_fail('state_changed');
      END IF;
      PERFORM library_cancel_fines(ARRAY[library_uuid(d, 'extra_fine_id')], 'undo');
      UPDATE library_fines SET cancelled_at = NULL, cancel_reason = NULL
       WHERE id = ANY (library_uuids(d, 'cancelled_fine_ids')) AND cancel_reason = 'found';
      UPDATE library_copies SET status = 'lost' WHERE id = c.id;

    WHEN 'damaged' THEN
      PERFORM library_cancel_fines(ARRAY[library_uuid(d, 'fine_id')], 'undo');
      IF (d ->> 'withdrawn')::boolean THEN
        IF c.status <> 'withdrawn' THEN PERFORM library_fail('state_changed'); END IF;
        UPDATE library_copies SET status = d ->> 'old_status' WHERE id = c.id;
      END IF;

    WHEN 'payment' THEN
      PERFORM 1 FROM library_fines WHERE id IN (SELECT fine_id FROM library_fine_payments
                                                 WHERE id = ANY (library_uuids(d, 'payment_ids'))) ORDER BY id FOR UPDATE;
      IF EXISTS (SELECT 1 FROM library_fine_payments WHERE id = ANY (library_uuids(d, 'payment_ids')) AND voided_at IS NOT NULL) THEN
        PERFORM library_fail('state_changed');
      END IF;
      UPDATE library_fine_payments SET voided_at = now(), voided_by = p_actor, void_reason = 'undo'
       WHERE id = ANY (library_uuids(d, 'payment_ids'));
      IF EXISTS (SELECT 1 FROM library_fine_payments p WHERE p.id = ANY (library_uuids(d, 'payment_ids'))
                   AND (SELECT t.paid - t.refunded FROM library_fine_totals(p.fine_id) t) < 0) THEN
        PERFORM library_fail('refund_first');
      END IF;

    WHEN 'refund' THEN
      PERFORM 1 FROM library_fines WHERE id = (SELECT fine_id FROM library_fine_payments
                                                WHERE id = library_uuid(d, 'payment_id')) FOR UPDATE;
      UPDATE library_fine_payments SET voided_at = now(), voided_by = p_actor, void_reason = 'undo'
       WHERE id = library_uuid(d, 'payment_id') AND voided_at IS NULL;
      IF NOT FOUND THEN PERFORM library_fail('state_changed'); END IF;
      IF EXISTS (SELECT 1 FROM library_fine_payments p, library_fine_totals(p.fine_id) t
                  WHERE p.id = library_uuid(d, 'payment_id') AND NOT t.cancelled
                    AND t.waived + t.paid - t.refunded > t.amount) THEN
        PERFORM library_fail('over_balance');
      END IF;
      IF EXISTS (SELECT 1 FROM library_fine_payments p, library_fine_totals(p.fine_id) t
                  WHERE p.id = library_uuid(d, 'payment_id') AND t.cancelled AND t.paid - t.refunded > 0) THEN
        PERFORM library_fail('fine_cancelled');
      END IF;

    WHEN 'waive' THEN
      PERFORM 1 FROM library_fines WHERE id = library_uuid(d, 'fine_id') FOR UPDATE;
      UPDATE library_fine_waivers SET voided_at = now(), voided_by = p_actor, void_reason = 'undo'
       WHERE id = library_uuid(d, 'waiver_id') AND voided_at IS NULL;
      IF NOT FOUND THEN PERFORM library_fail('state_changed'); END IF;
      IF EXISTS (SELECT 1 FROM library_fine_totals(library_uuid(d, 'fine_id')) t
                  WHERE NOT t.cancelled AND t.waived + t.paid - t.refunded > t.amount) THEN
        PERFORM library_fail('over_balance');
      END IF;

    WHEN 'withdraw', 'restore' THEN
      IF (e.kind = 'withdraw' AND c.status <> 'withdrawn') OR (e.kind = 'restore' AND c.status <> 'available') THEN
        PERFORM library_fail('state_changed');
      END IF;
      IF e.kind = 'restore' AND EXISTS (SELECT 1 FROM library_loans WHERE copy_id = c.id
                                          AND returned_on IS NULL AND cancelled_at IS NULL) THEN
        PERFORM library_fail('copy_on_loan');
      END IF;
      UPDATE library_copies SET status = (CASE WHEN e.kind = 'withdraw' THEN 'available' ELSE 'withdrawn' END) WHERE id = c.id;

    WHEN 'delete_book' THEN
      IF EXISTS (SELECT 1 FROM library_books WHERE id = library_uuid(d, 'book_id')) THEN
        PERFORM library_fail('state_changed');
      END IF;
      -- Codes are never reused, so the same book_code and copy codes are still free.
      INSERT INTO library_books SELECT * FROM jsonb_populate_record(NULL::library_books, d -> 'book');
      INSERT INTO library_copies SELECT * FROM jsonb_populate_recordset(NULL::library_copies, d -> 'copies');

    WHEN 'add_copies', 'create_book' THEN
      PERFORM library_remove_copies(library_uuid(d, 'book_id'), library_uuids(d, 'copy_ids'), e.kind = 'create_book');

    WHEN 'import' THEN
      -- Books in id order, the same order everything else locks them in.
      FOR v_item IN SELECT x FROM jsonb_array_elements(d -> 'items') x ORDER BY x ->> 'book_id' LOOP
        PERFORM library_remove_copies(library_uuid(v_item, 'book_id'), library_uuids(v_item, 'copy_ids'),
                                      coalesce((v_item ->> 'created')::boolean, false));
      END LOOP;

    ELSE
      PERFORM library_fail('not_undoable', e.kind);
  END CASE;

  v_ev := library_log(p_actor, 'undo', e.copy_id, e.loan_id, e.student_id, e.staff_id,
    jsonb_build_object('undone_kind', e.kind), e.id);
  RETURN library_finish_request(p_request_id, jsonb_build_object('event_id', v_ev, 'undone_event_id', e.id));
END $$;

-- ---------- lock down (S1) ----------
-- Supabase's default privileges grant EXECUTE on new public functions to
-- anon/authenticated. Any later migration that adds a library_* function
-- must repeat this REVOKE/GRANT for it.

DO $$
DECLARE t text; f record;
BEGIN
  FOREACH t IN ARRAY ARRAY['library_settings','library_books','library_copies','library_loans','library_fines',
                           'library_fine_payments','library_fine_waivers','library_counters','library_requests',
                           'library_events']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM service_role', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
  END LOOP;

  REVOKE ALL ON TABLE public.library_fine_balances FROM PUBLIC, anon, authenticated;
  GRANT SELECT ON TABLE public.library_fine_balances TO service_role;
  REVOKE ALL ON SEQUENCE public.library_book_code_seq FROM PUBLIC, anon, authenticated;
  GRANT USAGE, SELECT ON SEQUENCE public.library_book_code_seq TO service_role;
  REVOKE ALL ON SEQUENCE public.library_events_seq_seq FROM PUBLIC, anon, authenticated;
  GRANT USAGE, SELECT ON SEQUENCE public.library_events_seq_seq TO service_role;

  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname LIKE 'library\_%'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
