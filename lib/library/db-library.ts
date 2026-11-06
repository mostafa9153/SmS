import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { LibraryError } from "./errors";
import { libraryToday } from "./dates";
import { borrowerBalance, issueCheck, overdueFine, renewQuote, type RenewQuote } from "./rules";
import { isCopyCode, normalizeScan, resolveScan, type ScanMatch } from "./scan-code";
import { parseLibrarySettings, type LibrarySettings } from "./settings";
import type { BorrowerKey, BorrowerType, LoanRules } from "./types";

/**
 * Library reads (plan T3). Every query runs with the service-role client:
 * library tables have RLS on and no policies, so routes must gate access
 * first (lib/api/guard). Writes live in db-library-actions.ts.
 */

const db = () => createAdminClient();

/** Student statuses that may not borrow (they keep returning and paying). */
const INACTIVE_STUDENT = ["Passed Out", "Drop Out", "TC Out"];

const STUDENT_COLUMNS = "id, name, school_id, pen, photo_url, present_class, present_section, present_roll, current_status";
const STAFF_COLUMNS = "id, full_name, unique_id, designation, status";

export function borrowerKey(type: BorrowerType, id: string): BorrowerKey {
  return `${type}:${id}`;
}

export function parseBorrowerKey(key: string): { type: BorrowerType; id: string } | null {
  const m = /^(student|staff):([0-9a-f-]{36})$/i.exec(key);
  return m ? { type: m[1] as BorrowerType, id: m[2].toLowerCase() } : null;
}

async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

// ---------- settings ----------

export async function getLibrarySettings(): Promise<LibrarySettings> {
  const row = await must(db().from("library_settings").select("rules").eq("id", 1).maybeSingle(), "library settings");
  return parseLibrarySettings(row?.rules);
}

// ---------- loans and fines ----------

export interface LoanRow {
  id: string;
  copy_id: string;
  student_id: string | null;
  staff_id: string | null;
  issued_on: string;
  due_on: string;
  renew_count: number;
  /** R10: renewed after its due date at least once; grace no longer applies. */
  overdue_renewed: boolean;
  returned_on: string | null;
  cancelled_at: string | null;
  outcome: "returned" | "lost" | null;
  rules: LoanRules;
  created_at: string;
  updated_at: string;
}

export function loanBorrower(loan: Pick<LoanRow, "student_id" | "staff_id">): BorrowerKey {
  return loan.student_id ? borrowerKey("student", loan.student_id) : borrowerKey("staff", loan.staff_id as string);
}

export async function getLoan(loanId: string): Promise<LoanRow> {
  const loan = await must(db().from("library_loans").select("*").eq("id", loanId).maybeSingle(), "library loan");
  if (!loan) throw new LibraryError("loan_not_found");
  return loan as LoanRow;
}

/** Overdue already fixed on each loan (renew-while-overdue stretches), cancelled fines excluded. */
export async function overdueChargedByLoan(loanIds: string[], exceptFineIds: string[] = []): Promise<Map<string, number>> {
  const charged = new Map<string, number>();
  if (!loanIds.length) return charged;
  const rows = await must(
    db().from("library_fines").select("id, loan_id, amount").in("loan_id", loanIds).eq("kind", "overdue").is("cancelled_at", null),
    "library overdue fines",
  );
  for (const r of rows ?? []) {
    if (exceptFineIds.includes(r.id)) continue;
    charged.set(r.loan_id, (charged.get(r.loan_id) ?? 0) + Number(r.amount));
  }
  return charged;
}

/**
 * Overdue accrued on an open loan up to `asOf`. Grace applies only to the
 * first overdue stretch, i.e. until the loan is renewed after its due date
 * (R10); `alreadyCharged` keeps the whole loan under the cap.
 */
export function accruedOverdue(
  loan: Pick<LoanRow, "due_on" | "rules" | "overdue_renewed">,
  asOf: string,
  holidays: LibrarySettings["holidays"],
  alreadyCharged: number,
) {
  return overdueFine({
    dueOn: loan.due_on,
    asOf,
    rules: loan.rules,
    holidays,
    applyGrace: !loan.overdue_renewed,
    alreadyCharged,
  });
}

// ---------- borrower panel ----------

export interface BorrowerProfile {
  key: BorrowerKey;
  type: BorrowerType;
  id: string;
  name: string;
  photoUrl: string | null;
  active: boolean;
  /** Students: class, section, roll, School ID, PEN. Staff: unique id, designation. */
  className: string | null;
  section: string | null;
  roll: string | null;
  schoolId: string | null;
  pen: string | null;
  uniqueId: string | null;
  designation: string | null;
}

export interface OpenLoanView {
  loanId: string;
  copyId: string;
  code: string;
  title: string;
  author: string | null;
  issuedOn: string;
  dueOn: string;
  renewCount: number;
  issuedAt: string;
  accruing: number;
  renew: RenewQuote;
}

export interface FineView {
  fineId: string;
  loanId: string;
  kind: "overdue" | "lost" | "damaged";
  amount: number;
  paid: number;
  refunded: number;
  waived: number;
  outstanding: number;
  createdAt: string;
  title: string | null;
}

export interface BorrowerSummary {
  profile: BorrowerProfile;
  openLoans: OpenLoanView[];
  fines: FineView[];
  balance: { stored: number; accruing: number; total: number };
  maxBooks: number;
  issue: ReturnType<typeof issueCheck>;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- joined rows from PostgREST */
function toProfile(type: BorrowerType, row: any): BorrowerProfile {
  if (type === "student") {
    return {
      key: borrowerKey("student", row.id),
      type,
      id: row.id,
      name: row.name ?? "",
      photoUrl: row.photo_url ?? null,
      active: !INACTIVE_STUDENT.includes(row.current_status),
      className: row.present_class ?? null,
      section: row.present_section ?? null,
      roll: row.present_roll != null ? String(row.present_roll) : null,
      schoolId: row.school_id ?? null,
      pen: row.pen ?? null,
      uniqueId: null,
      designation: null,
    };
  }
  return {
    key: borrowerKey("staff", row.id),
    type,
    id: row.id,
    name: row.full_name ?? "",
    photoUrl: null,
    active: row.status === "ACTIVE",
    className: null,
    section: null,
    roll: null,
    schoolId: null,
    pen: null,
    uniqueId: row.unique_id ?? null,
    designation: row.designation ?? null,
  };
}

export async function getBorrowerProfile(type: BorrowerType, id: string): Promise<BorrowerProfile> {
  const row =
    type === "student"
      ? await must(db().from("students").select(STUDENT_COLUMNS).eq("id", id).maybeSingle(), "student")
      : await must(db().from("staff_profiles").select(STAFF_COLUMNS).eq("id", id).maybeSingle(), "staff");
  if (!row) throw new LibraryError("borrower_not_found");
  return toProfile(type, row);
}

export async function getBorrowerSummary(
  type: BorrowerType,
  id: string,
  settings?: LibrarySettings,
  today = libraryToday(),
): Promise<BorrowerSummary> {
  const cfg = settings ?? (await getLibrarySettings());
  const column = type === "student" ? "student_id" : "staff_id";
  const [profile, loans, fines] = await Promise.all([
    getBorrowerProfile(type, id),
    must(
      db()
        .from("library_loans")
        .select("*, copy:library_copies(code, book:library_books(title, author))")
        .eq(column, id)
        .is("returned_on", null)
        .is("cancelled_at", null)
        .order("due_on"),
      "library open loans",
    ),
    must(
      db().from("library_fine_balances").select("*").eq(column, id).is("cancelled_at", null).neq("outstanding", 0),
      "library fines",
    ),
  ]);

  const loanRows = (loans ?? []) as any[];
  const charged = await overdueChargedByLoan(loanRows.map((l) => l.id));
  const openLoans: OpenLoanView[] = loanRows.map((l) => {
    const already = charged.get(l.id) ?? 0;
    return {
      loanId: l.id,
      copyId: l.copy_id,
      code: l.copy?.code ?? "",
      title: l.copy?.book?.title ?? "",
      author: l.copy?.book?.author ?? null,
      issuedOn: l.issued_on,
      dueOn: l.due_on,
      renewCount: l.renew_count,
      issuedAt: l.created_at,
      accruing: accruedOverdue(l, today, cfg.holidays, already),
      renew: renewQuote({ today, dueOn: l.due_on, renewCount: l.renew_count, rules: l.rules, holidays: cfg.holidays }),
    };
  });

  const fineRows = (fines ?? []) as any[];
  const titles = await fineTitles(fineRows.map((f) => f.loan_id));
  const fineViews: FineView[] = fineRows.map((f) => ({
    fineId: f.fine_id,
    loanId: f.loan_id,
    kind: f.kind,
    amount: Number(f.amount),
    paid: Number(f.paid),
    refunded: Number(f.refunded),
    waived: Number(f.waived),
    outstanding: Number(f.outstanding),
    createdAt: f.created_at ?? "",
    title: titles.get(f.loan_id) ?? null,
  }));

  // The view already nets payments, refunds and waivers, so each fine enters
  // borrowerBalance as a ledger whose amount is its outstanding.
  const balance = borrowerBalance({
    today,
    holidays: cfg.holidays,
    fines: fineViews.map((f) => ({ amount: f.outstanding, payments: [], waivers: [] })),
    openLoans: openLoans.map((l) => ({
      dueOn: l.dueOn,
      rules: loanRows.find((r) => r.id === l.loanId).rules,
      applyGrace: !loanRows.find((r) => r.id === l.loanId).overdue_renewed,
      alreadyCharged: charged.get(l.loanId) ?? 0,
    })),
  });
  const maxBooks = cfg[type].maxBooks;
  return {
    profile,
    openLoans,
    fines: fineViews,
    balance,
    maxBooks,
    issue: issueCheck({
      active: profile.active,
      openLoans: openLoans.length,
      maxBooks,
      balance: balance.total,
      blockThreshold: cfg.blockThreshold,
    }),
  };
}

async function fineTitles(loanIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(loanIds)];
  if (!ids.length) return out;
  const rows = await must(
    db().from("library_loans").select("id, copy:library_copies(book:library_books(title))").in("id", ids),
    "library fine titles",
  );
  for (const r of (rows ?? []) as any[]) out.set(r.id, r.copy?.book?.title ?? "");
  return out;
}

// ---------- scan ----------

export interface CopyView {
  id: string;
  code: string;
  copyNo: number;
  status: "available" | "lost" | "withdrawn";
  price: number | null;
  bookId: string;
  title: string;
  author: string | null;
}

export type ScanResult =
  | {
      kind: "copy";
      copy: CopyView;
      openLoan: { loanId: string; borrower: BorrowerKey; borrowerName: string; issuedAtMs: number; dueOn: string } | null;
      returnedAtMs: number | null;
    }
  | { kind: "borrower"; borrower: BorrowerSummary }
  | { kind: "ambiguous"; options: (ScanMatch & { name: string; detail: string | null })[] }
  | { kind: "unknown"; code: string };

/** `ilike` pattern matching `value` exactly (case-insensitive). */
const exactLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Resolves one scanned or typed code (plan C1): copy → School ID → PEN → staff unique id. */
export async function resolveLibraryScan(raw: string): Promise<ScanResult> {
  const code = normalizeScan(raw);
  // PostgREST reads `*` in a like pattern as a wildcard; no real code contains one.
  if (!code || code.includes("*")) return { kind: "unknown", code };
  const settings = await getLibrarySettings();
  const client = db();

  const [copies, bySchoolId, byPen, staff] = await Promise.all([
    isCopyCode(code, settings.codePrefix)
      ? must(client.from("library_copies").select("id").eq("code", code), "copy lookup")
      : Promise.resolve([] as { id: string }[]),
    must(client.from("students").select("id").ilike("school_id", exactLike(code)).limit(5), "School ID lookup"),
    must(client.from("students").select("id").eq("pen", code).limit(5), "PEN lookup"),
    must(client.from("staff_profiles").select("id").ilike("unique_id", exactLike(code)).limit(5), "staff lookup"),
  ]);

  const match = resolveScan({ copies: copies ?? [], bySchoolId: bySchoolId ?? [], byPen: byPen ?? [], staff: staff ?? [] });
  switch (match.kind) {
    case "unknown":
      return { kind: "unknown", code };
    case "copy":
      return scanCopy(match.id);
    case "student":
    case "staff":
      return { kind: "borrower", borrower: await getBorrowerSummary(match.kind, match.id, settings) };
    case "ambiguous": {
      const options = await Promise.all(
        match.options.map(async (o) => {
          if (o.kind === "copy") return { ...o, name: code, detail: null };
          const p = await getBorrowerProfile(o.kind, o.id);
          const detail = p.type === "student" ? [p.className, p.section, p.schoolId].filter(Boolean).join(" · ") : p.uniqueId;
          return { ...o, name: p.name, detail };
        }),
      );
      return { kind: "ambiguous", options };
    }
  }
}

export async function getCopyView(copyId: string): Promise<CopyView> {
  const row = (await must(
    db().from("library_copies").select("id, code, copy_no, status, price, book_id, book:library_books(title, author)").eq("id", copyId).maybeSingle(),
    "library copy",
  )) as any;
  if (!row) throw new LibraryError("copy_not_found");
  return {
    id: row.id,
    code: row.code,
    copyNo: row.copy_no,
    status: row.status,
    price: row.price === null ? null : Number(row.price),
    bookId: row.book_id,
    title: row.book?.title ?? "",
    author: row.book?.author ?? null,
  };
}

async function scanCopy(copyId: string): Promise<ScanResult> {
  const [copy, loans] = await Promise.all([
    getCopyView(copyId),
    must(
      db()
        .from("library_loans")
        .select("id, student_id, staff_id, due_on, returned_on, created_at, updated_at")
        .eq("copy_id", copyId)
        .is("cancelled_at", null)
        .order("created_at", { ascending: false })
        .limit(2),
      "copy loans",
    ),
  ]);
  const open = (loans ?? []).find((l) => l.returned_on === null) ?? null;
  const lastReturned = (loans ?? []).find((l) => l.returned_on !== null) ?? null;
  let openLoan = null;
  if (open) {
    const who = loanBorrower(open);
    const parsed = parseBorrowerKey(who)!;
    const profile = await getBorrowerProfile(parsed.type, parsed.id);
    openLoan = {
      loanId: open.id,
      borrower: who,
      borrowerName: profile.name,
      issuedAtMs: Date.parse(open.created_at),
      dueOn: open.due_on,
    };
  }
  return {
    kind: "copy",
    copy,
    openLoan,
    // The last return's write time; a re-scan within seconds is a double beep (decideScanAction).
    returnedAtMs: lastReturned ? Date.parse(lastReturned.updated_at) : null,
  };
}

// ---------- catalog ----------

export interface BookRow {
  id: string;
  book_code: string;
  title: string;
  author: string | null;
  publisher: string | null;
  category: string | null;
  language: string | null;
  isbn: string | null;
  edition: string | null;
  legacy_no: string | null;
  status: "active" | "withdrawn";
  next_copy_no: number;
  created_at: string;
  updated_at: string;
}

export interface BookListItem extends BookRow {
  stock: { total: number; onShelf: number; onLoan: number; lost: number; withdrawn: number; unprinted: number };
}

/** Escapes PostgREST `or()` filter syntax inside a search term. */
const orSafe = (q: string) => q.replace(/[,()*\\%_]/g, " ").trim();

export async function listBooks(input: { q?: string; limit?: number; offset?: number } = {}): Promise<BookListItem[]> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  let query = db().from("library_books").select("*").order("title").range(input.offset ?? 0, (input.offset ?? 0) + limit - 1);
  const q = orSafe(input.q ?? "");
  if (q) query = query.or(`title.ilike.*${q}*,author.ilike.*${q}*,book_code.ilike.*${q}*,legacy_no.ilike.*${q}*`);
  const books = ((await must(query, "library books")) ?? []) as BookRow[];
  return withStock(books);
}

export async function getBook(bookId: string): Promise<BookListItem & { copies: (CopyView & { onLoan: boolean; stickerPrintedAt: string | null })[] }> {
  const book = (await must(db().from("library_books").select("*").eq("id", bookId).maybeSingle(), "library book")) as BookRow | null;
  if (!book) throw new LibraryError("book_not_found");
  const [withCounts] = await withStock([book]);
  const copies = ((await must(
    db().from("library_copies").select("id, code, copy_no, status, price, book_id, sticker_printed_at").eq("book_id", bookId).order("copy_no"),
    "library copies",
  )) ?? []) as any[];
  const open = await openCopyIds(copies.map((c) => c.id));
  return {
    ...withCounts,
    copies: copies.map((c) => ({
      id: c.id,
      code: c.code,
      copyNo: c.copy_no,
      status: c.status,
      price: c.price === null ? null : Number(c.price),
      bookId: c.book_id,
      title: book.title,
      author: book.author,
      onLoan: open.has(c.id),
      stickerPrintedAt: c.sticker_printed_at,
    })),
  };
}

async function openCopyIds(copyIds: string[]): Promise<Set<string>> {
  if (!copyIds.length) return new Set();
  const rows = await must(
    db().from("library_loans").select("copy_id").in("copy_id", copyIds).is("returned_on", null).is("cancelled_at", null),
    "open loans",
  );
  return new Set((rows ?? []).map((r) => r.copy_id));
}

async function withStock(books: BookRow[]): Promise<BookListItem[]> {
  if (!books.length) return [];
  const copies = ((await must(
    db().from("library_copies").select("id, book_id, status, sticker_printed_at").in("book_id", books.map((b) => b.id)),
    "library stock",
  )) ?? []) as { id: string; book_id: string; status: string; sticker_printed_at: string | null }[];
  const open = await openCopyIds(copies.map((c) => c.id));
  return books.map((b) => {
    const mine = copies.filter((c) => c.book_id === b.id);
    const onLoan = mine.filter((c) => open.has(c.id)).length;
    const available = mine.filter((c) => c.status === "available").length;
    return {
      ...b,
      stock: {
        total: mine.length,
        onShelf: available - onLoan,
        onLoan,
        lost: mine.filter((c) => c.status === "lost").length,
        withdrawn: mine.filter((c) => c.status === "withdrawn").length,
        unprinted: mine.filter((c) => !c.sticker_printed_at && c.status !== "withdrawn").length,
      },
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */
