import { addDays, daysBetween, nextWorkingDay, workingDaysBetween } from "./dates";
import type { FineLedger, Holiday, LoanRules } from "./types";

/**
 * Library business rules as pure functions. This is the only place due dates,
 * renewals and fines are calculated; the database RPCs receive these results
 * and re-check only the hard limits under their locks (plan D12).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Issue date + loan days, moved off Sundays and holidays. */
export function dueDate(issuedOn: string, loanDays: number, holidays: readonly Holiday[]): string {
  return nextWorkingDay(addDays(issuedOn, loanDays), holidays);
}

/**
 * Overdue fine for one stretch (dueOn, asOf]: working days only, the first
 * `graceDays` forgiven when grace applies (only the loan's first due date),
 * capped so the loan's total overdue never passes `fineCap`.
 */
export function overdueFine(input: {
  dueOn: string;
  asOf: string;
  rules: LoanRules;
  holidays: readonly Holiday[];
  applyGrace: boolean;
  /** Overdue already charged on this loan (earlier stretches). */
  alreadyCharged?: number;
}): number {
  const { dueOn, asOf, rules, holidays, applyGrace, alreadyCharged = 0 } = input;
  const late = workingDaysBetween(dueOn, asOf, holidays);
  const charged = Math.max(0, late - (applyGrace ? rules.graceDays : 0));
  const amount = round2(charged * rules.finePerDay);
  if (rules.fineCap === null) return amount;
  return round2(Math.max(0, Math.min(amount, rules.fineCap - alreadyCharged)));
}

export type RenewQuote =
  | { ok: true; newDue: string }
  | { ok: false; reason: "max_renews" | "overdue" | "no_gain" }
  | { ok: false; reason: "too_early"; opensOn: string };

/**
 * New due date for a renewal:
 *   max(old, min(max(today, old) + renewDays, today + loanDays)), then off
 *   Sundays/holidays. Refused (without using a renewal) when it gains nothing.
 */
export function renewQuote(input: {
  today: string;
  dueOn: string;
  renewCount: number;
  rules: LoanRules;
  holidays: readonly Holiday[];
}): RenewQuote {
  const { today, dueOn, renewCount, rules, holidays } = input;
  if (renewCount >= rules.maxRenews) return { ok: false, reason: "max_renews" };
  const overdue = today > dueOn;
  if (overdue && !rules.renewWhenOverdue) return { ok: false, reason: "overdue" };
  if (!overdue && daysBetween(today, dueOn) > rules.renewWindowDays) {
    return { ok: false, reason: "too_early", opensOn: addDays(dueOn, -rules.renewWindowDays) };
  }
  const from = today > dueOn ? today : dueOn;
  const extended = addDays(from, rules.renewDays);
  const ceiling = addDays(today, rules.loanDays);
  const capped = extended < ceiling ? extended : ceiling;
  const newDue = nextWorkingDay(capped > dueOn ? capped : dueOn, holidays);
  if (newDue <= dueOn) return { ok: false, reason: "no_gain" };
  return { ok: true, newDue };
}

/** Charge for a lost copy: price (or the default) + processing fee; only the fee when replaced. */
export function lostCharge(input: { price: number | null; rules: LoanRules; replaced?: boolean }): number {
  const { price, rules, replaced } = input;
  if (replaced) return round2(rules.processingFee);
  const base = rules.lostPolicy === "fixed" || price === null ? rules.defaultLostAmount : price;
  return round2(base + rules.processingFee);
}

/** Highest damage charge for a copy: its price, or the default lost amount when it has none. */
export function damageLimit(price: number | null, rules: LoanRules): number {
  return price ?? rules.defaultLostAmount;
}

/**
 * Last day overdue is counted for a lost copy that turned up again. When the
 * borrower had it all along, overdue runs to the found date so declaring a
 * book lost cannot freeze its fine (plan R12).
 */
export function foundOverdueUntil(input: { source: "borrower" | "library"; lostOn: string; foundOn: string }): string {
  return input.source === "borrower" ? input.foundOn : input.lostOn;
}

/** Outstanding on one fine: amount − waived − paid + refunded, voided rows ignored. */
export function fineBalance(fine: FineLedger): number {
  if (fine.cancelled) return 0;
  const paid = fine.payments
    .filter((p) => !p.voided)
    .reduce((sum, p) => sum + (p.kind === "payment" ? p.amount : -p.amount), 0);
  const waived = fine.waivers.filter((w) => !w.voided).reduce((sum, w) => sum + w.amount, 0);
  return round2(fine.amount - paid - waived);
}

export type WaiveResult = { ok: true; amount: number } | { ok: false; reason: "nothing_due" | "invalid" | "too_much" };

/** Waiver amount: all, half of what is outstanding, or a custom amount up to it. */
export function waiveAmount(input: { outstanding: number; mode: "full" | "half" | "custom"; custom?: number }): WaiveResult {
  const { outstanding, mode, custom } = input;
  if (outstanding <= 0) return { ok: false, reason: "nothing_due" };
  if (mode === "full") return { ok: true, amount: round2(outstanding) };
  if (mode === "half") return { ok: true, amount: round2(outstanding / 2) };
  if (custom === undefined || !Number.isFinite(custom)) return { ok: false, reason: "invalid" };
  // Round before checking: 0.001 must not become a 0 waiver, and 0.1 + 0.2 must equal 0.3.
  const amount = round2(custom);
  if (amount <= 0) return { ok: false, reason: "invalid" };
  if (amount > round2(outstanding)) return { ok: false, reason: "too_much" };
  return { ok: true, amount };
}

export interface OpenLoanForBalance {
  dueOn: string;
  rules: LoanRules;
  applyGrace: boolean;
  alreadyCharged: number;
}

/**
 * The one definition of what a borrower owes: stored fines still outstanding
 * plus overdue still accruing on books not yet returned (plan R5). Used by
 * issue, renew, the desk panel, TC checks, clearance and the teacher portal.
 */
export function borrowerBalance(input: {
  today: string;
  holidays: readonly Holiday[];
  fines: FineLedger[];
  openLoans: OpenLoanForBalance[];
}): { stored: number; accruing: number; total: number } {
  const stored = round2(input.fines.reduce((sum, f) => sum + Math.max(0, fineBalance(f)), 0));
  const accruing = round2(
    input.openLoans.reduce(
      (sum, l) =>
        sum +
        overdueFine({
          dueOn: l.dueOn,
          asOf: input.today,
          rules: l.rules,
          holidays: input.holidays,
          applyGrace: l.applyGrace,
          alreadyCharged: l.alreadyCharged,
        }),
      0,
    ),
  );
  return { stored, accruing, total: round2(stored + accruing) };
}

type BlockReason = "inactive" | "limit" | "balance";

const overThreshold = (balance: number, threshold: number | null) => threshold !== null && balance > threshold;

/** Can this borrower take one more book? Lists every reason it is refused. */
export function issueCheck(input: {
  active: boolean;
  openLoans: number;
  maxBooks: number;
  balance: number;
  blockThreshold: number | null;
}): { ok: true; remaining: number } | { ok: false; reasons: BlockReason[] } {
  const reasons: BlockReason[] = [];
  if (!input.active) reasons.push("inactive");
  if (input.openLoans >= input.maxBooks) reasons.push("limit");
  if (overThreshold(input.balance, input.blockThreshold)) reasons.push("balance");
  if (reasons.length) return { ok: false, reasons };
  // Books this borrower may still take, counting the one being issued now.
  return { ok: true, remaining: input.maxBooks - input.openLoans };
}

/** Renew follows the inactive and balance rules but not the book limit (the count does not grow). */
export function renewCheck(input: {
  active: boolean;
  balance: number;
  blockThreshold: number | null;
}): { ok: true } | { ok: false; reasons: Exclude<BlockReason, "limit">[] } {
  const reasons: Exclude<BlockReason, "limit">[] = [];
  if (!input.active) reasons.push("inactive");
  if (overThreshold(input.balance, input.blockThreshold)) reasons.push("balance");
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
