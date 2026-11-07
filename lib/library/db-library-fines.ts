import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { libraryToday } from "./dates";
import { LibraryError } from "./errors";
import { dayTotals, isRealDay, type DayTotals, type MoneyRow, type WaiverRow } from "./fine-report";
import { borrowerKey, getBorrowerProfile, getBorrowerSummary, type BorrowerProfile } from "./db-library";
import type { BorrowerKey, BorrowerType } from "./types";

/** Read side of the Fines page (plan T8): who owes, one borrower's ledger, receipts, the daily report. */

const db = () => createAdminClient();

async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

const istDay = (ts: string | null) => (ts ? libraryToday(new Date(ts)) : null);
const num = (v: unknown) => Number(v ?? 0);

/* eslint-disable @typescript-eslint/no-explicit-any -- joined rows from PostgREST */

// ---------- who owes ----------

export interface FineDebtor {
  key: BorrowerKey;
  name: string;
  detail: string | null;
  outstanding: number;
  fines: number;
}

/** Borrowers with stored fines still outstanding, largest first. Accruing overdue is not payable yet, so it is not here. */
export async function listDebtors(q = ""): Promise<FineDebtor[]> {
  const rows = (await must(
    db().from("library_fine_balances").select("student_id, staff_id, outstanding").is("cancelled_at", null).gt("outstanding", 0),
    "library debtors",
  )) as any[];
  const totals = new Map<BorrowerKey, { outstanding: number; fines: number }>();
  for (const r of rows ?? []) {
    const key = r.student_id ? borrowerKey("student", r.student_id) : borrowerKey("staff", r.staff_id);
    const t = totals.get(key) ?? { outstanding: 0, fines: 0 };
    t.outstanding += num(r.outstanding);
    t.fines += 1;
    totals.set(key, t);
  }
  const ids = (type: BorrowerType) => [...totals.keys()].filter((k) => k.startsWith(`${type}:`)).map((k) => k.slice(type.length + 1));
  const studentIds = ids("student");
  const staffIds = ids("staff");
  const [students, staff] = await Promise.all([
    studentIds.length
      ? must(db().from("students").select("id, name, present_class, present_section, school_id").in("id", studentIds), "students")
      : Promise.resolve([]),
    staffIds.length ? must(db().from("staff_profiles").select("id, full_name, unique_id").in("id", staffIds), "staff") : Promise.resolve([]),
  ]);
  const people = new Map<string, { name: string; detail: string | null }>();
  for (const s of (students ?? []) as any[]) {
    people.set(`student:${s.id}`, { name: s.name ?? "", detail: [s.present_class, s.present_section, s.school_id].filter(Boolean).join(" · ") || null });
  }
  for (const s of (staff ?? []) as any[]) people.set(`staff:${s.id}`, { name: s.full_name ?? "", detail: s.unique_id ?? null });

  const needle = q.trim().toLowerCase();
  return [...totals.entries()]
    .map(([key, t]) => ({ key, ...(people.get(key) ?? { name: "", detail: null }), outstanding: Math.round(t.outstanding * 100) / 100, fines: t.fines }))
    .filter((d) => !needle || d.name.toLowerCase().includes(needle) || (d.detail ?? "").toLowerCase().includes(needle))
    .sort((a, b) => b.outstanding - a.outstanding);
}

// ---------- one borrower ----------

export interface LedgerFine {
  fineId: string;
  kind: "overdue" | "lost" | "damaged";
  title: string;
  amount: number;
  paid: number;
  refunded: number;
  waived: number;
  outstanding: number;
  createdAt: string;
  /** Cancelled (e.g. the lost book was found): shown for history, nothing can be done on it. */
  cancelled: boolean;
}

export interface ReceiptLine {
  fineId: string;
  kind: LedgerFine["kind"];
  title: string;
  amount: number;
}

export interface ReceiptView {
  receiptNo: number;
  kind: "payment" | "refund";
  paidOn: string;
  total: number;
  note: string | null;
  voided: boolean;
  voidReason: string | null;
  lines: ReceiptLine[];
}

export interface WaiverView {
  fineId: string;
  title: string;
  amount: number;
  reason: string;
  at: string;
  voided: boolean;
}

export interface BorrowerLedger {
  profile: BorrowerProfile;
  /** Stored outstanding plus overdue still accruing on books in hand (R5). */
  balance: { stored: number; accruing: number; total: number };
  fines: LedgerFine[];
  receipts: ReceiptView[];
  waivers: WaiverView[];
}

async function loanTitles(loanIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(loanIds)];
  if (!ids.length) return out;
  const rows = await must(db().from("library_loans").select("id, copy:library_copies(code, book:library_books(title))").in("id", ids), "loan titles");
  for (const r of (rows ?? []) as any[]) out.set(r.id, [r.copy?.book?.title, r.copy?.code].filter(Boolean).join(" · "));
  return out;
}

function toReceipts(payments: any[], fineInfo: Map<string, { kind: LedgerFine["kind"]; title: string }>): ReceiptView[] {
  const byNo = new Map<number, ReceiptView>();
  for (const p of payments) {
    const no = Number(p.receipt_no);
    const r =
      byNo.get(no) ??
      ({ receiptNo: no, kind: p.kind, paidOn: p.paid_on, total: 0, note: p.note ?? null, voided: p.voided_at !== null, voidReason: p.void_reason ?? null, lines: [] } as ReceiptView);
    const info = fineInfo.get(p.fine_id);
    r.lines.push({ fineId: p.fine_id, kind: info?.kind ?? "overdue", title: info?.title ?? "", amount: num(p.amount) });
    r.total = Math.round((r.total + num(p.amount)) * 100) / 100;
    byNo.set(no, r);
  }
  return [...byNo.values()].sort((a, b) => b.receiptNo - a.receiptNo);
}

/** Every line of every receipt that touches these fines, so a receipt always shows whole. */
async function receiptRows(fineIds: string[]): Promise<any[]> {
  const touching = (await must(db().from("library_fine_payments").select("receipt_no").in("fine_id", fineIds), "receipt numbers")) as any[];
  const nos = [...new Set((touching ?? []).map((p) => Number(p.receipt_no)))];
  if (!nos.length) return [];
  return (await must(db().from("library_fine_payments").select("*").in("receipt_no", nos).order("receipt_no", { ascending: false }), "payments")) as any[];
}

export async function getBorrowerLedger(type: BorrowerType, id: string): Promise<BorrowerLedger> {
  const column = type === "student" ? "student_id" : "staff_id";
  const [summary, fineRows] = await Promise.all([
    getBorrowerSummary(type, id),
    must(db().from("library_fine_balances").select("*").eq(column, id).order("created_at", { ascending: false }), "fines"),
  ]);
  const fines = (fineRows ?? []) as any[];
  const fineIds = fines.map((f) => f.fine_id);
  const [titles, payments, waivers] = await Promise.all([
    loanTitles(fines.map((f) => f.loan_id)),
    fineIds.length ? receiptRows(fineIds) : Promise.resolve([]),
    fineIds.length
      ? must(db().from("library_fine_waivers").select("*").in("fine_id", fineIds).order("waived_at", { ascending: false }), "waivers")
      : Promise.resolve([]),
  ]);
  const ledger: LedgerFine[] = fines.map((f) => ({
    fineId: f.fine_id,
    kind: f.kind,
    title: titles.get(f.loan_id) ?? "",
    amount: num(f.amount),
    paid: num(f.paid),
    refunded: num(f.refunded),
    waived: num(f.waived),
    outstanding: num(f.outstanding),
    createdAt: f.created_at,
    cancelled: f.cancelled_at !== null,
  }));
  const info = new Map(ledger.map((f) => [f.fineId, { kind: f.kind, title: f.title }]));
  return {
    profile: summary.profile,
    balance: summary.balance,
    fines: ledger,
    receipts: toReceipts((payments ?? []) as any[], info),
    waivers: ((waivers ?? []) as any[]).map((w) => ({
      fineId: w.fine_id,
      title: info.get(w.fine_id)?.title ?? "",
      amount: num(w.amount),
      reason: w.reason,
      at: w.waived_at,
      voided: w.voided_at !== null,
    })),
  };
}

// ---------- one receipt ----------

export interface ReceiptDetail extends ReceiptView {
  borrower: BorrowerProfile;
}

export async function getReceipt(receiptNo: number): Promise<ReceiptDetail> {
  const payments = (await must(db().from("library_fine_payments").select("*").eq("receipt_no", receiptNo), "receipt")) as any[];
  if (!payments?.length) throw new LibraryError("receipt_not_found");
  const fines = (await must(
    db().from("library_fines").select("id, kind, loan_id, student_id, staff_id").in("id", payments.map((p) => p.fine_id)),
    "receipt fines",
  )) as any[];
  const titles = await loanTitles(fines.map((f) => f.loan_id));
  const info = new Map(fines.map((f) => [f.id, { kind: f.kind, title: titles.get(f.loan_id) ?? "" }]));
  const first = fines[0];
  const borrower = await getBorrowerProfile(first.student_id ? "student" : "staff", first.student_id ?? first.staff_id);
  return { ...toReceipts(payments, info)[0], borrower };
}

// ---------- daily report ----------

export interface DayReport {
  day: string;
  totals: DayTotals;
  receipts: (ReceiptView & { borrowerName: string; voidedOn: string | null })[];
}

/** IST day → the UTC instants it spans, for timestamptz filters. */
const dayRange = (day: string) => {
  const start = new Date(`${day}T00:00:00+05:30`);
  return { from: start.toISOString(), to: new Date(start.getTime() + 86_400_000).toISOString() };
};

export async function getDayReport(day: string): Promise<DayReport> {
  if (!isRealDay(day)) throw new LibraryError("invalid_date");
  const { from, to } = dayRange(day);
  const [paidThatDay, voidedThatDay, waivers] = await Promise.all([
    must(db().from("library_fine_payments").select("*").eq("paid_on", day), "day payments"),
    must(db().from("library_fine_payments").select("*").gte("voided_at", from).lt("voided_at", to), "day voids"),
    must(db().from("library_fine_waivers").select("amount, waived_at, voided_at").gte("waived_at", from).lt("waived_at", to), "day waivers"),
  ]);
  const all = new Map<string, any>();
  for (const p of [...((paidThatDay ?? []) as any[]), ...((voidedThatDay ?? []) as any[])]) all.set(p.id, p);
  const rows = [...all.values()];

  const money: MoneyRow[] = rows.map((p) => ({
    receiptNo: Number(p.receipt_no),
    kind: p.kind,
    amount: num(p.amount),
    paidOn: p.paid_on,
    voidedOn: istDay(p.voided_at),
  }));
  const waiverRows: WaiverRow[] = ((waivers ?? []) as any[]).map((w) => ({ amount: num(w.amount), on: istDay(w.waived_at)!, voidedOn: istDay(w.voided_at) }));

  const fines = rows.length
    ? ((await must(db().from("library_fines").select("id, kind, loan_id, student_id, staff_id").in("id", [...new Set(rows.map((p) => p.fine_id))]), "day fines")) as any[])
    : [];
  const titles = await loanTitles(fines.map((f) => f.loan_id));
  const info = new Map(fines.map((f) => [f.id, { kind: f.kind, title: titles.get(f.loan_id) ?? "" }]));
  const owner = new Map(fines.map((f) => [f.id, f.student_id ? borrowerKey("student", f.student_id) : borrowerKey("staff", f.staff_id)]));
  const names = new Map<string, string>();
  await Promise.all(
    [...new Set(owner.values())].map(async (key) => {
      const [type, id] = key.split(":") as [BorrowerType, string];
      names.set(key, (await getBorrowerProfile(type, id).catch(() => null))?.name ?? "");
    }),
  );
  const voidedOn = new Map(rows.map((p) => [Number(p.receipt_no), istDay(p.voided_at)]));
  return {
    day,
    totals: dayTotals(day, money, waiverRows),
    receipts: toReceipts(rows, info).map((r) => ({
      ...r,
      borrowerName: names.get(owner.get(r.lines[0]?.fineId) ?? "") ?? "",
      voidedOn: voidedOn.get(r.receiptNo) ?? null,
    })),
  };
}
