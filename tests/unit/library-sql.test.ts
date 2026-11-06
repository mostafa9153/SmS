/**
 * Runs the library migration in PGlite (Postgres in WASM) and exercises every
 * RPC: locks, idempotency, undo, money limits, append-only guards, grants.
 * Concurrency between connections is not covered here (PGlite is one session):
 * scripts/test-library-rpc.ts checks that against a real database.
 */
import { randomUUID as uid } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { beforeAll, describe, expect, it } from "vitest";

type Row = Record<string, unknown>;
type Result = Record<string, unknown> & { event_id: string };

const MIGRATION = join(process.cwd(), "supabase/migrations/20261106_library_module.sql");
const RULES = JSON.stringify({
  loanDays: 14, finePerDay: 1, graceDays: 2, fineCap: 50, renewDays: 7, maxRenews: 2,
  renewWhenOverdue: false, renewWindowDays: 3, lostPolicy: "price", processingFee: 20, defaultLostAmount: 150,
});
const actor = uid();
let db: PGlite;

const q = async (text: string, params: unknown[] = []) => (await db.query<Row>(text, params)).rows;
const one = async (text: string, params: unknown[] = []) => (await q(text, params))[0];
const rpc = async (fn: string, args: unknown[]): Promise<Result> => {
  const ph = args.map((_, i) => `$${i + 1}`).join(",");
  return (await one(`select public.${fn}(${ph}) as r`, args)).r as Result;
};
const fails = async (fn: string, args: unknown[]): Promise<string> => {
  try {
    await rpc(fn, args);
    return "succeeded";
  } catch (e) {
    return (e as Error).message;
  }
};
const sqlFails = async (text: string): Promise<string> => {
  try {
    await db.exec(text);
    return "succeeded";
  } catch (e) {
    return (e as Error).message;
  }
};
const issue = (copyId: unknown, student: unknown, staff: unknown, due = "2026-11-20") =>
  rpc("library_issue_copy", [copyId, student, staff, "2026-11-06", due, RULES, actor, uid()]);
const fineState = (id: unknown) => one(`select * from library_fine_balances where fine_id = $1`, [id]);

let s1: Row, s2: Row, t1: Row, book: Row, copies: Row[];

async function freshDb() {
  db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    CREATE TABLE public.students (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text,
      present_class text, present_section text, academic_year text);
    CREATE TABLE public.staff_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text);
    GRANT ALL ON public.students, public.staff_profiles TO service_role;
  `);
  const sql = readFileSync(MIGRATION, "utf8");
  await db.exec(sql);
  await db.exec(sql); // re-runnable
}

beforeAll(async () => {
  await freshDb();
  s1 = await one(`insert into students(name, present_class, present_section, academic_year) values('A','VI','A','2026') returning id`);
  s2 = await one(`insert into students(name) values('B') returning id`);
  t1 = await one(`insert into staff_profiles(full_name) values('T') returning id`);
  book = await one(`insert into library_books(title) values('পথের পাঁচালী') returning *`);
}, 60_000);

describe("library migration (PGlite)", () => {
  it("numbers books and copies and never reuses a copy number", async () => {
    expect(book.book_code).toBe("B0001");
    await rpc("library_add_copies", [book.id, 3, 120, actor, uid()]);
    const req = uid();
    const added = await rpc("library_add_copies", [book.id, 1, null, actor, req]);
    await rpc("library_undo", [added.event_id, actor, uid()]);
    await rpc("library_add_copies", [book.id, 1, null, actor, uid()]);
    copies = await q(`select * from library_copies order by copy_no`);
    expect(copies.map((c) => c.code)).toEqual(["B0001-1", "B0001-2", "B0001-3", "B0001-5"]);

    const printed = await rpc("library_add_copies", [book.id, 1, null, actor, uid()]);
    await db.query(`update library_copies set sticker_printed_at = now() where id = $1`, [(printed.copy_ids as string[])[0]]);
    expect(await fails("library_undo", [printed.event_id, actor, uid()])).toContain("LIB:state_changed");

    const replay = await rpc("library_add_copies", [book.id, 1, null, actor, req]);
    expect(replay).toMatchObject({ replayed: true, event_id: added.event_id });
    expect(await fails("library_add_copies", [book.id, 1, null, uid(), req])).toContain("LIB:request_mismatch");
  });

  it("issues once per copy, snapshots the class and enforces the limit", async () => {
    const [c1, c2, c3] = copies;
    const i1 = await issue(c1.id, s1.id, null);
    expect((await one(`select class_at_issue from library_loans where id = $1`, [i1.loan_id])).class_at_issue).toBe("VI");
    expect(await fails("library_issue_copy", [c1.id, s2.id, null, "2026-11-06", "2026-11-20", RULES, actor, uid()])).toContain("LIB:copy_on_loan");
    await issue(c2.id, s1.id, null);
    expect(await fails("library_issue_copy", [c3.id, s1.id, null, "2026-11-06", "2026-11-20", RULES, actor, uid()])).toContain("LIB:limit");
    expect(await fails("library_issue_copy", [c3.id, s1.id, t1.id, "2026-11-06", "2026-11-20", RULES, actor, uid()])).toContain("LIB:borrower_required");
    expect(await fails("library_issue_copy", [c3.id, s2.id, null, "2026-11-06", "2026-11-20", "{}", actor, uid()])).toContain("LIB:rules_required");
    expect(await fails("library_issue_copy", [c3.id, s2.id, null, "2026-11-06", "2026-11-01", RULES, actor, uid()])).toContain("LIB:invalid_date");
  });

  it("undoes a return (cancelling its fine), then the issue, and only the latest action", async () => {
    const loan = await one(`select id from library_loans where copy_id = $1 and returned_on is null`, [copies[0].id]);
    const issueEvent = await one(`select id from library_events where loan_id = $1 and kind = 'issue'`, [loan.id]);
    const ret = await rpc("library_return_copy", [loan.id, "2026-11-25", 3, actor, uid()]);
    expect(Number((await fineState(ret.fine_id)).outstanding)).toBe(3);
    expect(await fails("library_undo", [issueEvent.id, actor, uid()])).toContain("LIB:newer_action");
    await rpc("library_undo", [ret.event_id, actor, uid()]);
    expect((await one(`select cancelled_at from library_fines where id = $1`, [ret.fine_id])).cancelled_at).not.toBeNull();
    expect(await fails("library_undo", [ret.event_id, actor, uid()])).toContain("LIB:already_undone");
    await rpc("library_undo", [issueEvent.id, actor, uid()]);
    expect((await issue(copies[0].id, s2.id, null)).loan_id).toBeTruthy();
  });

  it("renews forward only, up to the snapshot's limit", async () => {
    const i = await issue(copies[2].id, null, t1.id);
    expect((await rpc("library_renew_loan", [i.loan_id, "2026-11-27", 0, "2026-11-10", actor, uid()])).due_on).toBe("2026-11-27");
    expect(await fails("library_renew_loan", [i.loan_id, "2026-11-27", 0, "2026-11-10", actor, uid()])).toContain("LIB:no_gain");
    const second = await rpc("library_renew_loan", [i.loan_id, "2026-12-04", 2, "2026-11-10", actor, uid()]);
    expect(second.fine_id).toBeTruthy();
    expect(await fails("library_renew_loan", [i.loan_id, "2026-12-11", 0, "2026-11-10", actor, uid()])).toContain("LIB:max_renews");
    await rpc("library_undo", [second.event_id, actor, uid()]);
    const l = await one(`select due_on, renew_count from library_loans where id = $1`, [i.loan_id]);
    expect(l).toMatchObject({ renew_count: 1 });
  });

  it("turns a return into a renew and undoes it back to the return", async () => {
    const i = await issue(copies[3].id, s2.id, null);
    const ret = await rpc("library_return_copy", [i.loan_id, "2026-11-23", 1, actor, uid()]);
    const rr = await rpc("library_return_to_renew", [i.loan_id, "2026-11-30", 0, "2026-11-10", actor, uid()]);
    expect(await one(`select returned_on, renew_count from library_loans where id = $1`, [i.loan_id])).toEqual({ returned_on: null, renew_count: 1 });
    expect((await one(`select cancelled_at from library_fines where id = $1`, [ret.fine_id])).cancelled_at).not.toBeNull();
    await rpc("library_undo", [rr.event_id, actor, uid()]);
    expect(await one(`select outcome, renew_count, returned_by from library_loans where id = $1`, [i.loan_id])).toEqual({
      outcome: "returned", renew_count: 0, returned_by: actor,
    });
    expect((await one(`select cancelled_at from library_fines where id = $1`, [ret.fine_id])).cancelled_at).toBeNull();
  });

  it("keeps payments, refunds and waivers within the fine", async () => {
    const loan = await one(`select * from library_loans where copy_id = $1`, [copies[3].id]);
    const small = await one(`select id from library_fines where loan_id = $1 and kind = 'overdue'`, [loan.id]);
    const big = await one(`insert into library_fines(loan_id, student_id, kind, amount, created_by) values($1, $2, 'damaged', 10, $3) returning id`, [loan.id, s2.id, actor]);

    const pay = await rpc("library_record_payment", [JSON.stringify([{ fine_id: big.id, amount: 6 }, { fine_id: small.id, amount: 1 }]), "2026-11-23", actor, uid()]);
    expect(pay).toMatchObject({ receipt_no: 1, total: 7 });
    expect(await fails("library_waive", [big.id, 5, "দরিদ্র", actor, uid()])).toContain("LIB:over_balance");
    const waive = await rpc("library_waive", [big.id, 4, "দরিদ্র", actor, uid()]);
    expect(await fails("library_waive", [big.id, 1, " ", actor, uid()])).toContain("LIB:reason_required");
    expect(await fails("library_record_payment", [JSON.stringify([{ fine_id: big.id, amount: 0.01 }]), "2026-11-23", actor, uid()])).toContain("LIB:over_balance");
    expect(await fails("library_record_payment", [JSON.stringify([{ fine_id: big.id, amount: 1 }, { fine_id: big.id, amount: 1 }]), "2026-11-23", actor, uid()])).toContain("LIB:duplicate_fine");
    expect(await fails("library_record_refund", [big.id, 7, "2026-11-24", null, actor, uid()])).toContain("LIB:over_paid");
    expect((await rpc("library_record_refund", [big.id, 2, "2026-11-24", "ভুল", actor, uid()])).receipt_no).toBe(2);
    expect(await fails("library_void_payment", [1, "ভুল", actor, uid()])).toContain("LIB:refund_first");
    // a failed call does not burn a receipt number
    expect((await rpc("library_record_payment", [JSON.stringify([{ fine_id: big.id, amount: 2 }]), "2026-11-24", actor, uid()])).receipt_no).toBe(3);
    expect(Number((await fineState(big.id)).outstanding)).toBe(0);
    await rpc("library_undo", [waive.event_id, actor, uid()]);
    expect(Number((await fineState(big.id)).outstanding)).toBe(4);
    const ret = await one(`select id from library_events where loan_id = $1 and kind = 'return' order by at desc`, [loan.id]);
    expect(await fails("library_undo", [ret.id, actor, uid()])).not.toBe("succeeded");
  });

  it("makes the log and the money rows append-only", async () => {
    expect(await sqlFails(`update library_events set kind = 'x'`)).toContain("LIB:append_only");
    expect(await sqlFails(`delete from library_fine_payments`)).toContain("LIB:append_only");
    expect(await sqlFails(`update library_fine_payments set amount = 1, voided_at = now(), voided_by = '${actor}', void_reason = 'x'`)).toContain("LIB:append_only");
    expect(await sqlFails(`delete from library_fines`)).toContain("LIB:append_only");
    expect(await sqlFails(`delete from library_loans`)).toContain("LIB:append_only");
  });

  it("handles lost, found (from the borrower) and damaged, each undoable", async () => {
    const c2 = copies[1];
    const loan = await one(`select id from library_loans where copy_id = $1 and returned_on is null and cancelled_at is null`, [c2.id]);
    const lost = await rpc("library_mark_lost", [c2.id, "2026-11-30", 5, 140, actor, uid()]);
    expect((await one(`select status from library_copies where id = $1`, [c2.id])).status).toBe("lost");
    expect(await fails("library_issue_copy", [c2.id, s2.id, null, "2026-11-06", "2026-11-20", RULES, actor, uid()])).toContain("LIB:copy_unavailable");

    const found = await rpc("library_mark_found", [c2.id, "borrower", "2026-12-10", 12, false, actor, uid()]);
    expect(Number((await one(`select amount from library_fines where id = $1`, [found.extra_fine_id])).amount)).toBe(7);
    expect((await one(`select cancelled_at from library_fines where id = $1`, [lost.lost_fine_id])).cancelled_at).not.toBeNull();
    await rpc("library_undo", [found.event_id, actor, uid()]);
    expect((await one(`select status from library_copies where id = $1`, [c2.id])).status).toBe("lost");
    expect((await one(`select cancelled_at from library_fines where id = $1`, [lost.lost_fine_id])).cancelled_at).toBeNull();
    await rpc("library_undo", [lost.event_id, actor, uid()]);
    expect((await one(`select returned_on from library_loans where id = $1`, [loan.id])).returned_on).toBeNull();

    const ret = await rpc("library_return_copy", [loan.id, "2026-11-20", 0, actor, uid()]);
    expect(ret.fine_id).toBeNull();
    expect(await fails("library_mark_damaged", [loan.id, 121, false, null, actor, uid()])).toContain("LIB:invalid_amount");
    const dmg = await rpc("library_mark_damaged", [loan.id, 50, true, "পাতা ছেঁড়া", actor, uid()]);
    expect((await one(`select status from library_copies where id = $1`, [c2.id])).status).toBe("withdrawn");
    await rpc("library_undo", [dmg.event_id, actor, uid()]);
    expect((await one(`select status from library_copies where id = $1`, [c2.id])).status).toBe("available");
  });

  it("locks anon and authenticated out of tables, the view and every function", async () => {
    const fine = await one(`select id from library_fines limit 1`);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      expect(await sqlFails(`select * from library_books`)).toContain("permission denied");
      expect(await sqlFails(`select * from library_fine_balances`)).toContain("permission denied");
      expect(await sqlFails(`insert into library_events(actor, kind) values('${actor}', 'x')`)).toContain("permission denied");
      expect(await sqlFails(`select library_waive('${fine.id}', 1, 'x', '${actor}', '${uid()}')`)).toContain("permission denied");
      expect(await sqlFails(`select library_next_book_code()`)).toContain("permission denied");
      await db.exec(`reset role`);
    }
    await db.exec(`set role service_role`);
    expect(await sqlFails(`select library_add_copies('${book.id}', 1, null, '${actor}', '${uid()}')`)).toBe("succeeded");
    await db.exec(`reset role`);
  });
});

describe("library migration: review regressions", () => {
  let st: Row, st2: Row, bk: Row, cps: string[];
  beforeAll(async () => {
    await freshDb();
    st = await one(`insert into students(name) values('S') returning id`);
    st2 = await one(`insert into students(name) values('S2') returning id`);
    bk = await one(`insert into library_books(title) values('আরণ্যক') returning *`);
    cps = (await rpc("library_add_copies", [bk.id, 4, 120, actor, uid()])).copy_ids as string[];
  }, 60_000);

  it("charges 'found' to the loss it resolves, never an older borrower's loan", async () => {
    const i = await issue(cps[0], st.id, null);
    await rpc("library_mark_lost", [cps[0], "2026-11-30", 5, 120, actor, uid()]);
    await rpc("library_mark_found", [cps[0], "library", "2026-12-01", 0, false, actor, uid()]);
    await rpc("library_mark_lost", [cps[0], "2026-12-05", 0, 0, actor, uid()]); // lost from the shelf
    const found = await rpc("library_mark_found", [cps[0], "borrower", "2026-12-20", 50, false, actor, uid()]);
    expect(found).toMatchObject({ loan_id: null, extra_fine_id: null });
    const fines = await q(`select kind from library_fines where loan_id = $1 and cancelled_at is null`, [i.loan_id]);
    expect(fines.map((f) => f.kind)).toEqual(["overdue"]);
  });

  it("lets a fully refunded lost charge be cancelled when the book turns up", async () => {
    await issue(cps[1], st.id, null);
    const lost = await rpc("library_mark_lost", [cps[1], "2026-11-30", 0, 120, actor, uid()]);
    await rpc("library_record_payment", [JSON.stringify([{ fine_id: lost.lost_fine_id, amount: 120 }]), "2026-11-30", actor, uid()]);
    expect(await fails("library_mark_found", [cps[1], "library", "2026-12-01", 0, false, actor, uid()])).toContain("LIB:fine_has_payments");
    await rpc("library_record_refund", [lost.lost_fine_id, 120, "2026-12-01", "পাওয়া গেছে", actor, uid()]);
    const found = await rpc("library_mark_found", [cps[1], "library", "2026-12-01", 0, false, actor, uid()]);
    expect(found.cancelled_fine_ids).toEqual([lost.lost_fine_id]);
  });

  it("keeps the book limit when undo or return-to-renew reopens a loan", async () => {
    const a = await issue(cps[2], st2.id, null);
    await issue(cps[3], st2.id, null);
    const ret = await rpc("library_return_copy", [a.loan_id, "2026-11-10", 0, actor, uid()]);
    const extra = await rpc("library_add_copies", [bk.id, 1, null, actor, uid()]);
    await issue((extra.copy_ids as string[])[0], st2.id, null);
    expect(await fails("library_undo", [ret.event_id, actor, uid()])).toContain("LIB:limit");
    expect(await fails("library_return_to_renew", [a.loan_id, "2026-11-30", 0, "2026-11-10", actor, uid()])).toContain("LIB:limit");
  });

  it("refuses to undo 'found' or a return once the copy has moved on", async () => {
    const [c] = (await rpc("library_add_copies", [bk.id, 1, null, actor, uid()])).copy_ids as string[];
    const lost = await rpc("library_mark_lost", [c, "2026-11-30", 0, 0, actor, uid()]);
    const found = await rpc("library_mark_found", [c, "library", "2026-12-01", 0, false, actor, uid()]);
    const other = await one(`insert into students(name) values('S3') returning id`);
    const i = await issue(c, other.id, null);
    await rpc("library_return_copy", [i.loan_id, "2026-11-10", 0, actor, uid()]);
    expect(await fails("library_undo", [found.event_id, actor, uid()])).toContain("LIB:newer_action");
    expect(await fails("library_undo", [lost.event_id, actor, uid()])).toContain("LIB:newer_action");
  });

  it("treats one fine id in two letter cases as a duplicate", async () => {
    const f = await one(`select id from library_fines where cancelled_at is null limit 1`);
    const id = String(f.id);
    const lines = JSON.stringify([{ fine_id: id, amount: 1 }, { fine_id: id.toUpperCase(), amount: 1 }]);
    expect(await fails("library_record_payment", [lines, "2026-12-01", actor, uid()])).toContain("LIB:duplicate_fine");
  });

  it("does not let a damage charge on an old loan block the copy's next borrower", async () => {
    const [c] = (await rpc("library_add_copies", [bk.id, 1, 100, actor, uid()])).copy_ids as string[];
    const p = await one(`insert into students(name) values('P') returning id`);
    const r = await one(`insert into students(name) values('R') returning id`);
    const a = await issue(c, p.id, null);
    await rpc("library_return_copy", [a.loan_id, "2026-11-10", 0, actor, uid()]);
    const b = await issue(c, r.id, null);
    await rpc("library_mark_damaged", [a.loan_id, 30, false, null, actor, uid()]);
    expect(await fails("library_undo", [b.event_id, actor, uid()])).toBe("succeeded");
  });

  it("never leaves money held on a cancelled fine", async () => {
    const [c] = (await rpc("library_add_copies", [bk.id, 1, 100, actor, uid()])).copy_ids as string[];
    const p = await one(`insert into students(name) values('Q') returning id`);
    const a = await issue(c, p.id, null);
    const ret = await rpc("library_return_copy", [a.loan_id, "2026-11-25", 10, actor, uid()]);
    await rpc("library_record_payment", [JSON.stringify([{ fine_id: ret.fine_id, amount: 10 }]), "2026-11-25", actor, uid()]);
    const refund = await rpc("library_record_refund", [ret.fine_id, 10, "2026-11-25", "renew", actor, uid()]);
    await rpc("library_return_to_renew", [a.loan_id, "2026-11-30", 0, "2026-11-10", actor, uid()]);
    expect(await fails("library_undo", [refund.event_id, actor, uid()])).toContain("LIB:fine_cancelled");
    expect(await fails("library_void_payment", [refund.receipt_no, "ভুল", actor, uid()])).toContain("LIB:fine_cancelled");
  });

  it("keeps a copy that has any history when 'add copies' is undone", async () => {
    const added = await rpc("library_add_copies", [bk.id, 1, null, actor, uid()]);
    const [c] = added.copy_ids as string[];
    await rpc("library_mark_lost", [c, "2026-11-30", 0, 0, actor, uid()]);
    await rpc("library_mark_found", [c, "library", "2026-12-01", 0, false, actor, uid()]);
    expect(await fails("library_undo", [added.event_id, actor, uid()])).toContain("LIB:state_changed");
    expect(await one(`select id from library_copies where id = $1`, [c])).toBeTruthy();
  });

  it("rejects NaN, infinite, oversized and malformed amounts with LIB codes", async () => {
    const [c] = (await rpc("library_add_copies", [bk.id, 1, null, actor, uid()])).copy_ids as string[];
    const p = await one(`insert into students(name) values('N') returning id`);
    const a = await issue(c, p.id, null);
    for (const bad of ["NaN", "Infinity", "1e9", "-1"]) {
      expect(await fails("library_return_copy", [a.loan_id, "2026-11-25", bad, actor, uid()])).toContain("LIB:invalid_amount");
    }
    expect(await fails("library_add_copies", [bk.id, 1, "NaN", actor, uid()])).toContain("LIB:invalid_amount");
    const f = await one(`select id from library_fines where cancelled_at is null limit 1`);
    for (const amount of ["abc", "NaN", 1e12]) {
      const lines = JSON.stringify([{ fine_id: f.id, amount }]);
      expect(await fails("library_record_payment", [lines, "2026-12-01", actor, uid()])).toContain("LIB:invalid_amount");
    }
    expect(await fails("library_record_payment", [JSON.stringify([{ fine_id: "x", amount: 1 }]), "2026-12-01", actor, uid()])).toContain("LIB:invalid_amount");
  });

  it("creates a title with its copies in one step, replays it, and undoes both", async () => {
    const req = uid();
    const book = JSON.stringify({ title: "চাঁদের পাহাড়", author: "বিভূতিভূষণ" });
    const made = await rpc("library_create_book", [book, 2, 80, actor, req]);
    expect((made.copy_ids as string[]).length).toBe(2);
    const again = await rpc("library_create_book", [book, 2, 80, actor, req]);
    expect(again).toMatchObject({ replayed: true, book_id: made.book_id });
    expect(Number((await one(`select count(*) n from library_books where title = 'চাঁদের পাহাড়'`)).n)).toBe(1);
    await rpc("library_undo", [made.event_id, actor, uid()]);
    expect(await one(`select id from library_books where id = $1`, [made.book_id])).toBeUndefined();
  });

  it("keeps a title whose later copies would be orphaned by undoing its creation", async () => {
    const made = await rpc("library_create_book", [JSON.stringify({ title: "ইছামতী" }), 1, null, actor, uid()]);
    await rpc("library_add_copies", [made.book_id, 1, null, actor, uid()]);
    expect(await fails("library_undo", [made.event_id, actor, uid()])).toContain("LIB:state_changed");
    expect(Number((await one(`select count(*) n from library_copies where book_id = $1`, [made.book_id])).n)).toBe(2);
  });

  it("marks an overdue renew so grace is not given twice, and undo clears it", async () => {
    const [c] = (await rpc("library_add_copies", [bk.id, 1, null, actor, uid()])).copy_ids as string[];
    const p = await one(`insert into students(name) values('G') returning id`);
    const a = await issue(c, p.id, null, "2026-11-16");
    const early = await rpc("library_renew_loan", [a.loan_id, "2026-11-23", 0, "2026-11-14", actor, uid()]);
    expect((await one(`select overdue_renewed from library_loans where id = $1`, [a.loan_id])).overdue_renewed).toBe(false);
    await rpc("library_undo", [early.event_id, actor, uid()]);
    const late = await rpc("library_renew_loan", [a.loan_id, "2026-11-25", 0, "2026-11-18", actor, uid()]);
    expect((await one(`select overdue_renewed from library_loans where id = $1`, [a.loan_id])).overdue_renewed).toBe(true);
    await rpc("library_undo", [late.event_id, actor, uid()]);
    expect((await one(`select overdue_renewed from library_loans where id = $1`, [a.loan_id])).overdue_renewed).toBe(false);
  });

  it("withdraws a copy off the shelf and undoes it, but never one on loan", async () => {
    const made = await rpc("library_create_book", [JSON.stringify({ title: "দেবদাস" }), 2, null, actor, uid()]);
    const [c1, c2] = made.copy_ids as string[];
    const w = await rpc("library_set_copy_withdrawn", [c1, true, "ছেঁড়া", actor, uid()]);
    expect((await one(`select status from library_copies where id = $1`, [c1])).status).toBe("withdrawn");
    expect(await fails("library_issue_copy", [c1, st.id, null, "2026-11-06", "2026-11-20", RULES, actor, uid()])).toContain("LIB:copy_unavailable");
    await rpc("library_undo", [w.event_id, actor, uid()]);
    expect((await one(`select status from library_copies where id = $1`, [c1])).status).toBe("available");
    const p = await one(`insert into students(name) values('W') returning id`);
    await issue(c2, p.id, null);
    expect(await fails("library_set_copy_withdrawn", [c2, true, null, actor, uid()])).toContain("LIB:copy_on_loan");
  });

  it("deletes a never-borrowed title and undo brings back the same codes", async () => {
    const made = await rpc("library_create_book", [JSON.stringify({ title: "শ্রীকান্ত" }), 2, 50, actor, uid()]);
    const codes = (await q(`select code from library_copies where book_id = $1 order by copy_no`, [made.book_id])).map((r) => r.code);
    const del = await rpc("library_delete_book", [made.book_id, actor, uid()]);
    expect(await one(`select id from library_books where id = $1`, [made.book_id])).toBeUndefined();
    // undoing the creation now has nothing to remove
    expect(await fails("library_undo", [made.event_id, actor, uid()])).toContain("LIB:state_changed");
    await rpc("library_undo", [del.event_id, actor, uid()]);
    const back = (await q(`select code, price from library_copies where book_id = $1 order by copy_no`, [made.book_id]));
    expect(back.map((r) => r.code)).toEqual(codes);
    expect(Number(back[0].price)).toBe(50);
  });

  it("stores the title key and will not restore a deleted title over one that came back", async () => {
    const made = await rpc("library_create_book", [JSON.stringify({ title: "কপালকুণ্ডলা", title_key: "কপালকুণ্ডলা" }), 0, null, actor, uid()]);
    expect((await one(`select title_key from library_books where id = $1`, [made.book_id])).title_key).toBe("কপালকুণ্ডলা");
    const del = await rpc("library_delete_book", [made.book_id, actor, uid()]);
    await db.query(`insert into library_books(id, title) values($1, 'x')`, [made.book_id]);
    expect(await fails("library_undo", [del.event_id, actor, uid()])).toContain("LIB:state_changed");
  });

  it("refuses to delete a title that was ever borrowed or has copy history", async () => {
    const made = await rpc("library_create_book", [JSON.stringify({ title: "গৃহদাহ" }), 1, null, actor, uid()]);
    const [c] = made.copy_ids as string[];
    const p = await one(`insert into students(name) values('D') returning id`);
    const i = await issue(c, p.id, null);
    await rpc("library_undo", [i.event_id, actor, uid()]); // cancelled loans still count as history
    expect(await fails("library_delete_book", [made.book_id, actor, uid()])).toContain("LIB:copy_has_loans");
    const other = await rpc("library_create_book", [JSON.stringify({ title: "পরিণীতা" }), 1, null, actor, uid()]);
    await rpc("library_set_copy_withdrawn", [(other.copy_ids as string[])[0], true, null, actor, uid()]);
    expect(await fails("library_delete_book", [other.book_id, actor, uid()])).toContain("LIB:copy_has_history");
  });

  it("imports new titles and extra copies in one step, and undo removes exactly that", async () => {
    const existing = await rpc("library_create_book", [JSON.stringify({ title: "অপরাজিত" }), 1, null, actor, uid()]);
    const items = JSON.stringify([
      { book: { title: "দৃষ্টিপ্রদীপ", title_key: "দৃষ্টিপ্রদীপ", author: "বিভূতিভূষণ" }, copies: 2, price: 90 },
      { book_id: existing.book_id, copies: 3, price: null },
      { book: { title: "শুধু নাম" }, copies: 0, price: null },
    ]);
    const req = uid();
    const imp = await rpc("library_import_books", [items, actor, req]);
    expect(imp).toMatchObject({ created: 2, copies: 5 });
    expect((await rpc("library_import_books", [items, actor, req])).replayed).toBe(true);
    const codes = (await q(`select code from library_copies where book_id = $1 order by copy_no`, [existing.book_id])).map((r) => r.code);
    expect(codes).toHaveLength(4);
    await rpc("library_undo", [imp.event_id, actor, uid()]);
    expect(Number((await one(`select count(*) n from library_copies where book_id = $1`, [existing.book_id])).n)).toBe(1);
    expect(await one(`select id from library_books where title = 'দৃষ্টিপ্রদীপ'`)).toBeUndefined();
  });

  it("rolls the whole import back when one entry is refused", async () => {
    const gone = await rpc("library_create_book", [JSON.stringify({ title: "পুরোনো" }), 0, null, actor, uid()]);
    await db.query(`update library_books set status = 'withdrawn' where id = $1`, [gone.book_id]);
    const items = JSON.stringify([{ book: { title: "নতুন বই এক" }, copies: 1, price: null }, { book_id: gone.book_id, copies: 1, price: null }]);
    expect(await fails("library_import_books", [items, actor, uid()])).toContain("LIB:book_withdrawn");
    expect(await one(`select id from library_books where title = 'নতুন বই এক'`)).toBeUndefined();
  });

  it("will not undo an import once one of its copies was lent", async () => {
    const imp = await rpc("library_import_books", [JSON.stringify([{ book: { title: "আলোর পথে" }, copies: 1, price: null }]), actor, uid()]);
    const c = await one(`select c.id from library_copies c join library_books b on b.id = c.book_id where b.title = 'আলোর পথে'`);
    const p = await one(`insert into students(name) values('I') returning id`);
    await issue(c.id, p.id, null);
    expect(await fails("library_undo", [imp.event_id, actor, uid()])).toContain("LIB:copy_has_loans");
  });

  it("blocks TRUNCATE of the ledger, even for service_role", async () => {
    expect(await sqlFails(`truncate library_fine_payments cascade`)).toContain("LIB:append_only");
    await db.exec(`set role service_role`);
    expect(await sqlFails(`truncate library_events cascade`)).toContain("permission denied");
    await db.exec(`reset role`);
  });
});
