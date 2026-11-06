/**
 * "আমার বই" (plan T11): what a signed-in staff member sees of their own
 * loans. Pure helpers; the data comes from db-library-my.ts, which reads only
 * the borrower named by the session (S4), never one named by the request.
 */

export type DueStatus = "overdue" | "soon" | "ok";

/** Books due within this many days (or already past due) get attention. */
export const DUE_SOON_DAYS = 2;

const DAY_MS = 86_400_000;

/** Whole days from today to the due date: negative when late. */
export function daysUntil(dueOn: string, today: string): number {
  return Math.round((Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

export function dueStatus(dueOn: string, today: string): DueStatus {
  const days = daysUntil(dueOn, today);
  if (days < 0) return "overdue";
  return days <= DUE_SOON_DAYS ? "soon" : "ok";
}

export interface MySummary {
  overdue: number;
  dueSoon: number;
  /** Something to show on the portal home: a late book or one due soon. */
  needsAttention: boolean;
}

export function summarizeMine(loans: { dueOn: string }[], today: string): MySummary {
  let overdue = 0;
  let dueSoon = 0;
  for (const l of loans) {
    const s = dueStatus(l.dueOn, today);
    if (s === "overdue") overdue++;
    else if (s === "soon") dueSoon++;
  }
  return { overdue, dueSoon, needsAttention: overdue + dueSoon > 0 };
}

/** A loan is the caller's only when both ids exist and match. A null staff id never owns anything. */
export function ownsLoan(loan: { staff_id: string | null }, staffId: string | null | undefined): boolean {
  return Boolean(staffId) && loan.staff_id === staffId;
}
