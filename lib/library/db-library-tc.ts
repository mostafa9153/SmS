import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { libraryToday } from "./dates";
import { accruedOverdue, getLibrarySettings, INACTIVE_STUDENT, overdueChargedByLoan } from "./db-library";
import type { LibrarySettings } from "./settings";
import type { StudentDues } from "./tc";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Library dues for TC and promotion checks (plan T12). Service role: callers gate first. */

const db = () => createAdminClient();
const ID_CHUNK = 100;
const PAGE = 1000;

async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Open books and total balance (stored fines + overdue still accruing) per student. */
export async function libraryDuesForStudents(
  studentIds: string[],
  settings?: LibrarySettings,
  today = libraryToday(),
): Promise<StudentDues[]> {
  if (!studentIds.length) return [];
  // Keep `in (...)` lists short enough for the URL.
  if (studentIds.length > ID_CHUNK) {
    const cfg = settings ?? (await getLibrarySettings());
    const parts: StudentDues[][] = [];
    for (let i = 0; i < studentIds.length; i += ID_CHUNK) parts.push(await libraryDuesForStudents(studentIds.slice(i, i + ID_CHUNK), cfg, today));
    return parts.flat();
  }
  const [cfg, students, loans, fines] = await Promise.all([
    settings ?? getLibrarySettings(),
    must(db().from("students").select("id, name").in("id", studentIds), "students"),
    must(
      db()
        .from("library_loans")
        .select("id, student_id, due_on, rules, overdue_renewed")
        .in("student_id", studentIds)
        .is("returned_on", null)
        .is("cancelled_at", null),
      "library open loans",
    ),
    must(
      db()
        .from("library_fine_balances")
        .select("student_id, outstanding")
        .in("student_id", studentIds)
        .is("cancelled_at", null)
        .gt("outstanding", 0),
      "library fines",
    ),
  ]);

  const loanRows = (loans ?? []) as { id: string; student_id: string; due_on: string; rules: never; overdue_renewed: boolean }[];
  const charged = await overdueChargedByLoan(loanRows.map((l) => l.id));

  const out = new Map<string, StudentDues>();
  for (const s of (students ?? []) as { id: string; name: string | null }[]) {
    out.set(s.id, { studentId: s.id, name: s.name ?? "", openBooks: 0, balance: 0 });
  }
  for (const l of loanRows) {
    const d = out.get(l.student_id);
    if (!d) continue;
    d.openBooks += 1;
    d.balance += accruedOverdue(l, today, cfg.holidays, charged.get(l.id) ?? 0);
  }
  for (const f of (fines ?? []) as { student_id: string; outstanding: number | string }[]) {
    const d = out.get(f.student_id);
    if (d) d.balance += Number(f.outstanding);
  }
  return [...out.values()].map((d) => ({ ...d, balance: round2(d.balance) }));
}

/** Append a `tc_override` event per student (S1: append-only table). */
export async function recordTcOverride(actor: string, reason: string, dues: StudentDues[]): Promise<void> {
  if (!dues.length) return;
  const rows = dues.map((d) => ({
    actor,
    kind: "tc_override",
    student_id: d.studentId,
    details: { reason, open_books: d.openBooks, balance: d.balance },
  }));
  await must(db().from("library_events").insert(rows).select("id"), "library tc override event");
}

export interface ClassDues {
  className: string;
  students: number;
  books: number;
}

/** Books still out per present class, for the promotion / session-close warning (T-c). */
export async function openBooksByClass(): Promise<ClassDues[]> {
  // Paged: PostgREST caps a response at 1000 rows.
  const loans: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = await must(
      db()
        .from("library_loans")
        .select("id, student_id, student:students!inner(present_class, current_status)")
        .not("student_id", "is", null)
        .is("returned_on", null)
        .is("cancelled_at", null)
        .order("id")
        .range(from, from + PAGE - 1),
      "library open loans by class",
    );
    loans.push(...(page ?? []));
    if ((page ?? []).length < PAGE) break;
  }
  const byClass = new Map<string, { students: Set<string>; books: number }>();
  for (const l of loans as { student_id: string; student: { present_class: string | null; current_status: string | null } | null }[]) {
    const cls = l.student?.present_class;
    // Passed-out / TC / drop-out students are not promoted; clearance lists them.
    if (!cls || INACTIVE_STUDENT.includes(l.student?.current_status ?? "")) continue;
    const g = byClass.get(cls) ?? { students: new Set<string>(), books: 0 };
    g.students.add(l.student_id);
    g.books += 1;
    byClass.set(cls, g);
  }
  return [...byClass.entries()].map(([className, g]) => ({ className, students: g.students.size, books: g.books }));
}
