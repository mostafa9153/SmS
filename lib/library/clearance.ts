import { addDays } from "./dates";
import type { BorrowerKey } from "./types";

/**
 * Overdue, clearance and report maths (plan T9). Pure: the DB layer fetches
 * rows, these functions group and rank them.
 */

export interface OpenLoanRow {
  loanId: string;
  borrower: BorrowerKey;
  type: "student" | "staff";
  name: string;
  active: boolean;
  /** Class and section the borrower was in when the book was issued (T-c). */
  classAtIssue: string | null;
  sectionAtIssue: string | null;
  /** Their class and section now; a promoted or passed-out student differs. */
  classNow: string | null;
  sectionNow: string | null;
  roll: string | null;
  idLabel: string | null;
  title: string;
  code: string;
  dueOn: string;
  /** Overdue fine accrued so far on this loan. */
  accruing: number;
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };

/** Roman numeral classes in order; anything else sorts after them, by name. */
export function classRank(cls: string | null): number {
  if (!cls) return Number.MAX_SAFE_INTEGER;
  const key = cls.trim().toUpperCase();
  return ROMAN[key] ?? 1000;
}

/** Calendar days past due (0 when not late). */
export function daysOverdue(dueOn: string, today: string): number {
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueOn}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export type ClearanceBasis = "issue" | "now";

export interface BorrowerLoans {
  borrower: BorrowerKey;
  name: string;
  roll: string | null;
  idLabel: string | null;
  active: boolean;
  loans: OpenLoanRow[];
  fine: number;
  maxDaysOverdue: number;
}

export interface ClassGroup {
  key: string;
  label: string;
  borrowers: BorrowerLoans[];
  books: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "VIII A", or just the class, or a dash. */
export function classLabel(cls: string | null, section: string | null): string {
  return [cls, section].filter(Boolean).join(" ") || "Class নেই";
}

const rollNumber = (roll: string | null) => (roll !== null && /^\d+$/.test(roll) ? Number(roll) : Number.MAX_SAFE_INTEGER);

/**
 * Open loans grouped by class and section (T-c). `issue` uses the class the
 * borrower had at issue, so a slip reaches the class teacher who lent the book;
 * `now` uses the present class. Passed-out and inactive borrowers stay in.
 * Staff form one group at the end.
 */
export function groupClearance(rows: OpenLoanRow[], basis: ClearanceBasis, today: string): ClassGroup[] {
  const groups = new Map<string, { cls: string | null; section: string | null; staff: boolean; byBorrower: Map<BorrowerKey, BorrowerLoans> }>();
  for (const r of rows) {
    const staff = r.type === "staff";
    // A loan issued with no class recorded falls back to the present class, so it still lands on a slip.
    const atIssue = r.classAtIssue !== null;
    const cls = staff ? null : basis === "issue" && atIssue ? r.classAtIssue : r.classNow;
    const section = staff ? null : basis === "issue" && atIssue ? r.sectionAtIssue : r.sectionNow;
    const key = staff ? "staff" : `${cls ?? ""}|${section ?? ""}`;
    const g = groups.get(key) ?? { cls, section, staff, byBorrower: new Map() };
    const b =
      g.byBorrower.get(r.borrower) ??
      ({ borrower: r.borrower, name: r.name, roll: r.roll, idLabel: r.idLabel, active: r.active, loans: [], fine: 0, maxDaysOverdue: 0 } as BorrowerLoans);
    b.loans.push(r);
    b.fine = round2(b.fine + r.accruing);
    b.maxDaysOverdue = Math.max(b.maxDaysOverdue, daysOverdue(r.dueOn, today));
    g.byBorrower.set(r.borrower, b);
    groups.set(key, g);
  }
  return [...groups.entries()]
    .sort(([, a], [, b]) => {
      if (a.staff !== b.staff) return a.staff ? 1 : -1;
      return classRank(a.cls) - classRank(b.cls) || (a.cls ?? "").localeCompare(b.cls ?? "") || (a.section ?? "").localeCompare(b.section ?? "");
    })
    .map(([key, g]) => {
      const borrowers = [...g.byBorrower.values()].sort((a, b) => rollNumber(a.roll) - rollNumber(b.roll) || a.name.localeCompare(b.name));
      for (const b of borrowers) b.loans.sort((x, y) => x.dueOn.localeCompare(y.dueOn));
      return {
        key,
        label: g.staff ? "Teacher / Staff" : classLabel(g.cls, g.section),
        borrowers,
        books: borrowers.reduce((s, b) => s + b.loans.length, 0),
      };
    });
}

/** Overdue only: open loans whose due date has passed. */
export function onlyOverdue(rows: OpenLoanRow[], today: string): OpenLoanRow[] {
  return rows.filter((r) => r.dueOn < today);
}

/** Case-insensitive match on name, ID, title or code. */
export function matchesLoan(row: OpenLoanRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [row.name, row.idLabel, row.title, row.code].some((v) => (v ?? "").toLowerCase().includes(needle));
}

// ---------- reports ----------

export interface Ranked {
  key: string;
  label: string;
  count: number;
}

function rank(items: { key: string; label: string }[], limit: number): Ranked[] {
  const counts = new Map<string, Ranked>();
  for (const it of items) {
    const r = counts.get(it.key) ?? { key: it.key, label: it.label, count: 0 };
    r.count += 1;
    counts.set(it.key, r);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, limit);
}

/** Most-read titles: one count per loan, however many copies. */
export const topBooks = (loans: { bookId: string; title: string }[], limit = 10): Ranked[] =>
  rank(loans.map((l) => ({ key: l.bookId, label: l.title })), limit);

/** Most active readers by number of loans. */
export const topReaders = (loans: { borrower: BorrowerKey; name: string }[], limit = 10): Ranked[] =>
  rank(loans.map((l) => ({ key: l.borrower, label: l.name })), limit);

/** Titles no copy of which was ever lent. */
export function neverLent<T extends { id: string }>(books: T[], lentBookIds: Iterable<string>): T[] {
  const lent = new Set(lentBookIds);
  return books.filter((b) => !lent.has(b.id));
}

export interface WaiverLine {
  /** IST day, "YYYY-MM-DD". */
  day: string;
  amount: number;
  by: string;
}

export interface WaiverMonth {
  month: string;
  total: number;
  count: number;
  byPerson: { by: string; total: number; count: number }[];
}

/** Waivers per month, newest first, with who waived how much (R14). */
export function waiversByMonth(lines: WaiverLine[]): WaiverMonth[] {
  const months = new Map<string, Map<string, { total: number; count: number }>>();
  for (const l of lines) {
    const month = l.day.slice(0, 7);
    const people = months.get(month) ?? new Map();
    const p = people.get(l.by) ?? { total: 0, count: 0 };
    p.total = round2(p.total + l.amount);
    p.count += 1;
    people.set(l.by, p);
    months.set(month, people);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, people]) => {
      const byPerson = [...people.entries()].map(([by, v]) => ({ by, ...v })).sort((a, b) => b.total - a.total);
      return {
        month,
        total: round2(byPerson.reduce((s, p) => s + p.total, 0)),
        count: byPerson.reduce((s, p) => s + p.count, 0),
        byPerson,
      };
    });
}

/** First day of the month a day falls in, and the day after its last: a half-open range for queries. */
export function monthRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const next = addDays(from, 31).slice(0, 7) + "-01";
  return { from, to: next };
}
