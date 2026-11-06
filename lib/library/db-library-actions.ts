import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, snapshotRows } from "@/lib/undo/journal";
import { libraryToday } from "./dates";
import { LibraryError, libraryError } from "./errors";
import {
  accruedOverdue,
  getBook,
  getBorrowerSummary,
  getCopyView,
  getLibrarySettings,
  getLoan,
  loanBorrower,
  overdueChargedByLoan,
  parseBorrowerKey,
  type BookRow,
  type LoanRow,
} from "./db-library";
import { damageLimit, dueDate, lostCharge, renewCheck, renewQuote, waiveAmount } from "./rules";
import { loanRulesFor } from "./settings";
import type { BorrowerKey } from "./types";

/**
 * Library writes (plan T3). Dates and amounts are computed here from
 * lib/library/rules.ts; the database functions re-check, under locks, what
 * must hold under concurrency (D12). Every action except voiding a receipt is
 * journaled for Undo through the transactional `library_undo` (D6).
 *
 * Idempotency (D8): every action first looks up its request id. A retried
 * request whose first run committed is answered from the stored result and
 * its existing undo entry, without re-running the pre-checks (which would
 * now refuse or compute different amounts).
 */

export interface Actor {
  id: string;
}

export interface ActionResult<T> {
  data: T & { eventId: string; replayed: boolean };
  undoId: string | null;
}

type RpcResult = Record<string, unknown> & { event_id: string; replayed?: boolean };

const db = () => createAdminClient();

/** Calls a library_* function; `LIB:` refusals become LibraryError. */
async function rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw libraryError(error.message) ?? new Error(`${fn}: ${error.message}`);
  return data as RpcResult;
}

/** The stored result of a request that already committed, or null. */
async function storedResult(requestId: string, actor: Actor, kind: string): Promise<RpcResult | null> {
  const { data, error } = await db().from("library_requests").select("actor, kind, result").eq("request_id", requestId).maybeSingle();
  if (error) throw new Error(`library request: ${error.message}`);
  if (!data?.result) return null;
  if (data.actor !== actor.id || data.kind !== kind) throw new LibraryError("request_mismatch");
  return { ...(data.result as RpcResult), replayed: true };
}

/** The undo entry already recorded for an event (a replay must not add a second one). */
async function existingUndo(eventId: string): Promise<string | null> {
  const { data } = await db()
    .from("undoable_actions")
    .select("id")
    .contains("restore_steps", [{ args: { p_event_id: eventId } }])
    .is("undone_at", null)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Runs one journaled library action: replay check, pre-checks and amounts
 * (`plan`), the RPC, then the undo entry. A failure after the RPC committed
 * (label lookup, journal) never turns a done action into an error.
 */
async function run<T extends Record<string, unknown>>(spec: {
  kind: string;
  fn: string;
  requestId: string;
  actor: Actor;
  plan: () => Promise<Record<string, unknown>>;
  label: (r: RpcResult) => Promise<string>;
  data: (r: RpcResult) => T;
  entityId?: string;
}): Promise<ActionResult<T>> {
  const prior = await storedResult(spec.requestId, spec.actor, spec.kind);
  const r = prior ?? (await rpc(spec.fn, { ...(await spec.plan()), p_actor: spec.actor.id, p_request_id: spec.requestId }));
  let undoId: string | null = null;
  if (r.replayed) {
    undoId = await existingUndo(r.event_id);
  } else {
    let label = spec.kind;
    try {
      label = await spec.label(r);
    } catch (err) {
      console.error("[library] label lookup failed:", err);
    }
    undoId = await recordUndo({
      actorId: spec.actor.id,
      action: `library.${spec.kind}`,
      label,
      entity: "library",
      entityId: spec.entityId,
      steps: [{ op: "rpc", fn: "library_undo", args: { p_event_id: r.event_id }, actorArgs: true }],
    });
  }
  return { data: { ...spec.data(r), eventId: r.event_id, replayed: r.replayed === true }, undoId };
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

const copyLabel = async (copyId: string, suffix: string) => {
  const c = await getCopyView(copyId);
  return `"${c.title}" (${c.code}) ${suffix}`;
};

const borrowerArgs = (key: BorrowerKey) => {
  const b = parseBorrowerKey(key);
  if (!b) throw new LibraryError("borrower_required");
  return { b, args: { p_student_id: b.type === "student" ? b.id : null, p_staff_id: b.type === "staff" ? b.id : null } };
};

// ---------- desk ----------

export function issueCopy(input: { copyId: string; borrower: BorrowerKey; requestId: string; actor: Actor }) {
  const { b, args } = borrowerArgs(input.borrower);
  let borrowerName = "";
  return run({
    kind: "issue",
    fn: "library_issue_copy",
    requestId: input.requestId,
    actor: input.actor,
    entityId: input.copyId,
    plan: async () => {
      const settings = await getLibrarySettings();
      const today = libraryToday();
      const summary = await getBorrowerSummary(b.type, b.id, settings, today);
      borrowerName = summary.profile.name;
      // Soft rules (inactive, balance) are checked here; the limit is re-checked under a lock in SQL.
      if (!summary.issue.ok) throw new LibraryError(summary.issue.reasons[0], summary.issue.reasons.join(","));
      const rules = loanRulesFor(settings, b.type);
      return { p_copy_id: input.copyId, ...args, p_issued_on: today, p_due_on: dueDate(today, rules.loanDays, settings.holidays), p_rules: rules };
    },
    label: () => copyLabel(input.copyId, `→ ${borrowerName}`),
    data: (r) => ({ loanId: String(r.loan_id), dueOn: String(r.due_on) }),
  });
}

/** Overdue for an open loan up to `asOf`, with what earlier renew stretches already fixed. */
async function overdueNow(loan: LoanRow, asOf: string, exceptFineIds: string[] = []) {
  const settings = await getLibrarySettings();
  const charged = (await overdueChargedByLoan([loan.id], exceptFineIds)).get(loan.id) ?? 0;
  return { settings, charged, fine: accruedOverdue(loan, asOf, settings.holidays, charged) };
}

export function returnLoan(input: { loanId: string; requestId: string; actor: Actor }) {
  let copyId = "";
  return run({
    kind: "return",
    fn: "library_return_copy",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => {
      const loan = await getLoan(input.loanId);
      if (loan.returned_on || loan.cancelled_at) throw new LibraryError("loan_not_open");
      copyId = loan.copy_id;
      const today = libraryToday();
      const { fine } = await overdueNow(loan, today);
      return { p_loan_id: loan.id, p_returned_on: today, p_fine: fine };
    },
    label: async () => copyLabel(copyId || (await getLoan(input.loanId)).copy_id, "ফেরত"),
    data: (r) => ({ loanId: String(r.loan_id), fine: num(r.fine), fineId: str(r.fine_id) }),
  });
}

/** Renew checks shared by renew and return-to-renew; `exceptFineIds` are fines about to be cancelled. */
async function renewPlan(loanId: string, opts: { reopen: boolean; exceptFineIds?: string[] }) {
  const settings = await getLibrarySettings();
  const loan = await getLoan(loanId);
  if (loan.cancelled_at) throw new LibraryError("loan_not_found");
  if (opts.reopen ? loan.outcome !== "returned" : loan.returned_on !== null) {
    throw new LibraryError(opts.reopen ? "loan_not_returned" : "loan_not_open");
  }
  const today = libraryToday();
  const who = parseBorrowerKey(loanBorrower(loan))!;
  const summary = await getBorrowerSummary(who.type, who.id, settings, today);
  const check = renewCheck({ active: summary.profile.active, balance: summary.balance.total, blockThreshold: settings.blockThreshold });
  if (!check.ok) throw new LibraryError(check.reasons[0], check.reasons.join(","));
  const quote = renewQuote({ today, dueOn: loan.due_on, renewCount: loan.renew_count, rules: loan.rules, holidays: settings.holidays });
  if (!quote.ok) throw new LibraryError(quote.reason, quote.reason === "too_early" ? quote.opensOn : undefined);
  // R10: an overdue renew fixes the fine accrued so far.
  const { fine } = await overdueNow(loan, today, opts.exceptFineIds);
  return { loan, args: { p_loan_id: loan.id, p_new_due: quote.newDue, p_fine: fine, p_renewed_on: today } };
}

export function renewLoan(input: { loanId: string; requestId: string; actor: Actor }) {
  let copyId = "";
  return run({
    kind: "renew",
    fn: "library_renew_loan",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => {
      const { loan, args } = await renewPlan(input.loanId, { reopen: false });
      copyId = loan.copy_id;
      return args;
    },
    label: async (r) => copyLabel(copyId, `renew → ${r.due_on}`),
    data: (r) => ({ loanId: String(r.loan_id), dueOn: String(r.due_on), fine: num(r.fine) }),
  });
}

/** W3: the book was scanned back but the borrower wanted a renew. */
export function returnToRenew(input: { loanId: string; requestId: string; actor: Actor }) {
  let copyId = "";
  return run({
    kind: "return_to_renew",
    fn: "library_return_to_renew",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => {
      const { data: ret } = await db()
        .from("library_events")
        .select("details")
        .eq("loan_id", input.loanId)
        .eq("kind", "return")
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle();
      const returnFine = (ret?.details as { fine_id?: string | null } | null)?.fine_id;
      const { loan, args } = await renewPlan(input.loanId, { reopen: true, exceptFineIds: returnFine ? [returnFine] : [] });
      copyId = loan.copy_id;
      return args;
    },
    label: async (r) => copyLabel(copyId, `ফেরতের বদলে renew → ${r.due_on}`),
    data: (r) => ({ loanId: String(r.loan_id), dueOn: String(r.due_on), fine: num(r.fine) }),
  });
}

/** R11. With an open loan the borrower is charged overdue to today + the lost charge. */
export function markLost(input: { copyId: string; replaced?: boolean; requestId: string; actor: Actor }) {
  return run({
    kind: "lost",
    fn: "library_mark_lost",
    requestId: input.requestId,
    actor: input.actor,
    entityId: input.copyId,
    plan: async () => {
      const copy = await getCopyView(input.copyId);
      const { data: open, error } = await db()
        .from("library_loans")
        .select("*")
        .eq("copy_id", input.copyId)
        .is("returned_on", null)
        .is("cancelled_at", null)
        .maybeSingle();
      if (error) throw new Error(`library loan: ${error.message}`);
      const today = libraryToday();
      let overdue = 0;
      let lost = 0;
      if (open) {
        overdue = (await overdueNow(open as LoanRow, today)).fine;
        lost = lostCharge({ price: copy.price, rules: (open as LoanRow).rules, replaced: input.replaced });
      }
      return { p_copy_id: input.copyId, p_lost_on: today, p_overdue_fine: overdue, p_lost_amount: lost };
    },
    label: () => copyLabel(input.copyId, "হারানো"),
    data: (r) => ({ overdue: num(r.overdue), lost: num(r.lost), loanId: str(r.loan_id) }),
  });
}

/** R12. From the borrower: overdue runs to today; from the library: it stops at the lost date. */
export function markFound(input: {
  copyId: string;
  source: "borrower" | "library";
  keepLostFine?: boolean;
  requestId: string;
  actor: Actor;
}) {
  return run({
    kind: "found",
    fn: "library_mark_found",
    requestId: input.requestId,
    actor: input.actor,
    entityId: input.copyId,
    plan: async () => {
      const today = libraryToday();
      const { data: lostEvent } = await db()
        .from("library_events")
        .select("loan_id, details")
        .eq("copy_id", input.copyId)
        .eq("kind", "lost")
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle();
      let overdueTotal = 0;
      if (lostEvent?.loan_id && input.source === "borrower") {
        const loan = await getLoan(lostEvent.loan_id);
        const lostOverdue = (lostEvent.details as { overdue_fine_id?: string | null }).overdue_fine_id ?? null;
        // Overdue fixed before the loss (renew stretches) plus this stretch recounted to today, cap included.
        const { charged, fine } = await overdueNow(loan, today, lostOverdue ? [lostOverdue] : []);
        overdueTotal = charged + fine;
      }
      return {
        p_copy_id: input.copyId,
        p_source: input.source,
        p_found_on: today,
        p_overdue_total: overdueTotal,
        p_keep_lost_fine: input.keepLostFine ?? false,
      };
    },
    label: () => copyLabel(input.copyId, "পাওয়া গেছে"),
    data: (r) => ({ extraFineId: str(r.extra_fine_id) }),
  });
}

/** R15. The amount is limited to the price (or the default lost amount). */
export function markDamaged(input: {
  loanId: string;
  amount: number;
  withdraw: boolean;
  note?: string;
  requestId: string;
  actor: Actor;
}) {
  let copyId = "";
  return run({
    kind: "damaged",
    fn: "library_mark_damaged",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => {
      const loan = await getLoan(input.loanId);
      copyId = loan.copy_id;
      const copy = await getCopyView(loan.copy_id);
      const limit = damageLimit(copy.price, loan.rules);
      if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > limit) throw new LibraryError("invalid_amount", String(limit));
      return { p_loan_id: loan.id, p_amount: input.amount, p_withdraw: input.withdraw, p_note: input.note?.trim() || null };
    },
    label: () => copyLabel(copyId, `ক্ষতিগ্রস্ত (₹${input.amount})`),
    data: (r) => ({ fineId: str(r.fine_id) }),
  });
}

// ---------- money ----------

export function recordPayment(input: { lines: { fineId: string; amount: number }[]; requestId: string; actor: Actor }) {
  return run({
    kind: "payment",
    fn: "library_record_payment",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => {
      if (!input.lines.length) throw new LibraryError("invalid_amount");
      return { p_lines: input.lines.map((l) => ({ fine_id: l.fineId, amount: l.amount })), p_paid_on: libraryToday() };
    },
    label: async (r) => `রসিদ #${r.receipt_no} (₹${r.total})`,
    data: (r) => ({ receiptNo: num(r.receipt_no), total: num(r.total) }),
  });
}

export function recordRefund(input: { fineId: string; amount: number; note?: string; requestId: string; actor: Actor }) {
  return run({
    kind: "refund",
    fn: "library_record_refund",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => ({ p_fine_id: input.fineId, p_amount: input.amount, p_paid_on: libraryToday(), p_note: input.note?.trim() || null }),
    label: async (r) => `ফেরত রসিদ #${r.receipt_no} (₹${r.amount})`,
    data: (r) => ({ receiptNo: num(r.receipt_no), amount: num(r.amount) }),
  });
}

/** R13: a receipt entered by mistake. Not journaled: the client confirms first. */
export async function voidReceipt(input: { receiptNo: number; reason: string; requestId: string; actor: Actor }) {
  if (!input.reason.trim()) throw new LibraryError("reason_required");
  const r =
    (await storedResult(input.requestId, input.actor, "void_payment")) ??
    (await rpc("library_void_payment", {
      p_receipt_no: input.receiptNo,
      p_reason: input.reason,
      p_actor: input.actor.id,
      p_request_id: input.requestId,
    }));
  return { data: { receiptNo: input.receiptNo, eventId: r.event_id, replayed: r.replayed === true }, undoId: null };
}

/** R14: full, half of what is outstanding, or a custom amount; a reason is required. */
export function waiveFine(input: {
  fineId: string;
  mode: "full" | "half" | "custom";
  custom?: number;
  reason: string;
  requestId: string;
  actor: Actor;
}) {
  return run({
    kind: "waive",
    fn: "library_waive",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => {
      if (!input.reason.trim()) throw new LibraryError("reason_required");
      const { data: fine, error } = await db()
        .from("library_fine_balances")
        .select("outstanding, cancelled_at")
        .eq("fine_id", input.fineId)
        .maybeSingle();
      if (error) throw new Error(`library fine: ${error.message}`);
      if (!fine) throw new LibraryError("fine_not_found");
      if (fine.cancelled_at) throw new LibraryError("fine_cancelled");
      const w = waiveAmount({ outstanding: Number(fine.outstanding), mode: input.mode, custom: input.custom });
      if (!w.ok) throw new LibraryError(w.reason === "nothing_due" ? "nothing_due" : w.reason === "too_much" ? "over_balance" : "invalid_amount");
      return { p_fine_id: input.fineId, p_amount: w.amount, p_reason: input.reason };
    },
    label: async (r) => `মওকুফ ₹${r.amount}`,
    data: (r) => ({ amount: num(r.amount) }),
  });
}

// ---------- catalog ----------

export interface BookInput {
  title: string;
  author?: string | null;
  publisher?: string | null;
  category?: string | null;
  language?: string | null;
  isbn?: string | null;
  edition?: string | null;
  legacy_no?: string | null;
}

const BOOK_FIELDS = ["title", "author", "publisher", "category", "language", "isbn", "edition", "legacy_no"] as const;

/** Trims, NFC-normalises and drops empty strings (K1). */
export function cleanBookInput(input: Partial<BookInput>): Partial<BookInput> {
  const out: Partial<BookInput> = {};
  for (const key of BOOK_FIELDS) {
    if (!(key in input)) continue;
    const v = input[key];
    const s = typeof v === "string" ? v.normalize("NFC").replace(/\s+/g, " ").trim() : null;
    (out as Record<string, string | null>)[key] = s ? s.slice(0, 300) : null;
  }
  return out;
}

/** A new title with its first copies: one transaction, one undo (library_create_book). */
export function createBook(input: { book: BookInput; copies: number; price: number | null; requestId: string; actor: Actor }) {
  return run({
    kind: "create_book",
    fn: "library_create_book",
    requestId: input.requestId,
    actor: input.actor,
    plan: async () => {
      const fields = cleanBookInput(input.book);
      if (!fields.title) throw new LibraryError("title_required");
      return { p_book: fields, p_count: input.copies, p_price: input.price };
    },
    label: async () => `বই যোগ: "${cleanBookInput(input.book).title}"`,
    data: (r) => ({ bookId: String(r.book_id), bookCode: String(r.book_code), copyIds: (r.copy_ids as string[]) ?? [] }),
  });
}

export function addCopies(input: { bookId: string; count: number; price: number | null; requestId: string; actor: Actor }) {
  return run({
    kind: "add_copies",
    fn: "library_add_copies",
    requestId: input.requestId,
    actor: input.actor,
    entityId: input.bookId,
    plan: async () => ({ p_book_id: input.bookId, p_count: input.count, p_price: input.price }),
    label: async () => `"${(await getBook(input.bookId)).title}"-এ ${input.count}টি কপি যোগ`,
    data: (r) => ({ copyIds: (r.copy_ids as string[]) ?? [] }),
  });
}

/** Catalog columns an edit may change and its undo may restore (never next_copy_no or book_code). */
const EDITABLE_BOOK_COLUMNS = [...BOOK_FIELDS, "status"] as const;

export async function updateBook(input: { bookId: string; changes: Partial<BookInput> & { status?: "active" | "withdrawn" }; actor: Actor }) {
  const client = db();
  const before = await snapshotRows(client, "library_books", "id", input.bookId);
  if (!before.length) throw new LibraryError("book_not_found");
  const changes: Record<string, unknown> = cleanBookInput(input.changes);
  if ("title" in changes && !changes.title) throw new LibraryError("title_required");
  if (input.changes.status === "active" || input.changes.status === "withdrawn") changes.status = input.changes.status;
  const { data: after, error } = await client.from("library_books").update(changes).eq("id", input.bookId).select("*").single();
  if (error) throw new Error(`library book: ${error.message}`);
  // Restore only catalog columns: a full-row upsert could roll next_copy_no back (D3).
  const restore = before.map((row) => ({
    id: row.id,
    ...Object.fromEntries(EDITABLE_BOOK_COLUMNS.map((c) => [c, row[c]])),
  }));
  const undoId = await recordUndo({
    actorId: input.actor.id,
    action: "library.update_book",
    label: `বই বদল: "${after.title}"`,
    entity: "library_books",
    entityId: input.bookId,
    steps: [{ op: "upsert", table: "library_books", rows: restore }],
    guard: { table: "library_books", id: input.bookId, updated_at: after.updated_at },
  });
  return { data: after as BookRow, undoId };
}
