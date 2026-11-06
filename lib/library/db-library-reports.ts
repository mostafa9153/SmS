import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { libraryToday } from "./dates";
import { LibraryError } from "./errors";
import { isRealDay } from "./fine-report";
import {
  neverLent,
  topBooks,
  topReaders,
  waiversByMonth,
  type OpenLoanRow,
  type Ranked,
  type WaiverMonth,
} from "./clearance";
import { accruedOverdue, getLibrarySettings, overdueChargedByLoan, type LoanRow } from "./db-library";
import { borrowerKey } from "./db-library";

/** Read side of Overdue / Clearance and Reports (plan T9). */

const db = () => createAdminClient();
const PAGE = 1000;

/* eslint-disable @typescript-eslint/no-explicit-any -- joined rows from PostgREST */

/** PostgREST returns at most 1000 rows a call; read the rest in pages. */
async function fetchAll(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: { message: string } | null }>, what: string) {
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${what}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return out;
  }
}

const INACTIVE_STUDENT = ["Passed Out", "Drop Out", "TC Out"];

// ---------- open loans (overdue and clearance) ----------

/**
 * Every book still out, with its borrower's class at issue and now. Callers
 * narrow to overdue or group by class (clearance.ts). Inactive and passed-out
 * borrowers are included on purpose: their books are still owed.
 */
export async function listOpenLoans(today = libraryToday()): Promise<OpenLoanRow[]> {
  const settings = await getLibrarySettings();
  const loans = await fetchAll(
    (from, to) =>
      db()
        .from("library_loans")
        .select(
          "*, copy:library_copies(code, book:library_books(title)), student:students(id, name, school_id, present_class, present_section, present_roll, current_status), staff:staff_profiles(id, full_name, unique_id, status)",
        )
        .is("returned_on", null)
        .is("cancelled_at", null)
        .order("due_on")
        .order("id")
        .range(from, to),
    "open loans",
  );
  // An `in (...)` list rides in the URL, so ask in chunks.
  const charged = new Map<string, number>();
  const ids = loans.map((l) => l.id);
  for (let i = 0; i < ids.length; i += 100) {
    for (const [id, amount] of await overdueChargedByLoan(ids.slice(i, i + 100))) charged.set(id, amount);
  }
  return loans.map((l): OpenLoanRow => {
    const accruing = l.due_on < today ? accruedOverdue(l as LoanRow, today, settings.holidays, charged.get(l.id) ?? 0) : 0;
    const base = { loanId: l.id, title: l.copy?.book?.title ?? "", code: l.copy?.code ?? "", dueOn: l.due_on, accruing };
    if (l.student) {
      return {
        ...base,
        borrower: borrowerKey("student", l.student.id),
        type: "student",
        name: l.student.name ?? "",
        active: !INACTIVE_STUDENT.includes(l.student.current_status),
        classAtIssue: l.class_at_issue ?? null,
        sectionAtIssue: l.section_at_issue ?? null,
        classNow: l.student.present_class ?? null,
        sectionNow: l.student.present_section ?? null,
        roll: l.student.present_roll != null ? String(l.student.present_roll) : null,
        idLabel: l.student.school_id ?? null,
      };
    }
    return {
      ...base,
      borrower: borrowerKey("staff", l.staff.id),
      type: "staff",
      name: l.staff?.full_name ?? "",
      active: l.staff?.status === "ACTIVE",
      classAtIssue: null,
      sectionAtIssue: null,
      classNow: null,
      sectionNow: null,
      roll: null,
      idLabel: l.staff?.unique_id ?? null,
    };
  });
}

// ---------- reports ----------

export interface NeverLentBook {
  id: string;
  title: string;
  author: string | null;
  copies: number;
}

export interface LibraryReports {
  from: string;
  to: string;
  topBooks: Ranked[];
  topReaders: Ranked[];
  neverLent: NeverLentBook[];
  waivers: WaiverMonth[];
}

async function actorNames(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(
    [...new Set(ids)].map(async (id) => {
      const { data } = await db().auth.admin.getUserById(id);
      const u = data?.user;
      out.set(id, (u?.user_metadata?.full_name as string | undefined) || u?.email || "অজানা");
    }),
  );
  return out;
}

/** Most-read titles and readers in a date range; titles never lent (ever); waivers by month in the range. */
export async function getReports(from: string, to: string): Promise<LibraryReports> {
  if (!isRealDay(from) || !isRealDay(to) || from > to) throw new LibraryError("invalid_date");
  const client = db();
  const range = { from: new Date(`${from}T00:00:00+05:30`).toISOString(), to: new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000).toISOString() };

  const [loans, books, everLent, waivers] = await Promise.all([
    fetchAll(
      (a, b) =>
        client
          .from("library_loans")
          .select("id, student_id, staff_id, copy:library_copies(book_id, book:library_books(title)), student:students(name), staff:staff_profiles(full_name)")
          .is("cancelled_at", null)
          .gte("issued_on", from)
          .lte("issued_on", to)
          .order("id")
          .range(a, b),
      "report loans",
    ),
    fetchAll((a, b) => client.from("library_books").select("id, title, author, copies:library_copies(id, status)").eq("status", "active").order("id").range(a, b), "report books"),
    fetchAll((a, b) => client.from("library_loans").select("id, copy:library_copies(book_id)").is("cancelled_at", null).order("id").range(a, b), "ever lent"),
    fetchAll(
      (a, b) =>
        client
          .from("library_fine_waivers")
          .select("id, amount, waived_by, waived_at")
          .is("voided_at", null)
          .gte("waived_at", range.from)
          .lt("waived_at", range.to)
          .order("id")
          .range(a, b),
      "report waivers",
    ),
  ]);

  const names = await actorNames(waivers.map((w) => w.waived_by));
  return {
    from,
    to,
    topBooks: topBooks(loans.map((l) => ({ bookId: l.copy?.book_id ?? "", title: l.copy?.book?.title ?? "" })).filter((l) => l.bookId)),
    topReaders: topReaders(
      loans.map((l) => ({
        borrower: l.student_id ? borrowerKey("student", l.student_id) : borrowerKey("staff", l.staff_id),
        name: l.student?.name ?? l.staff?.full_name ?? "",
      })),
    ),
    neverLent: neverLent(
      books
        .map((b) => ({ id: b.id, title: b.title, author: b.author ?? null, copies: (b.copies ?? []).filter((c: { status: string }) => c.status !== "withdrawn").length }))
        .filter((b) => b.copies > 0),
      everLent.map((l) => l.copy?.book_id).filter(Boolean),
    ),
    waivers: waiversByMonth(
      waivers.map((w) => ({ day: libraryToday(new Date(w.waived_at)), amount: Number(w.amount), by: names.get(w.waived_by) ?? "অজানা" })),
    ),
  };
}
