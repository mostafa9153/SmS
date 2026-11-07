/**
 * Fine money for one day (plan R13): what was collected, refunded, voided and
 * waived that day, each kept apart. A receipt counts as collected on its
 * paid_on day even if it is voided later; the void shows on the day it was
 * made, so a closed day's figures never change.
 */

export interface MoneyRow {
  receiptNo: number;
  kind: "payment" | "refund";
  amount: number;
  paidOn: string;
  /** IST day the receipt was voided, or null. */
  voidedOn: string | null;
}

export interface WaiverRow {
  amount: number;
  /** IST day of the waiver. */
  on: string;
  voidedOn: string | null;
}

export interface DayTotals {
  collected: number;
  refunded: number;
  /** Payments voided this day, whatever day they were collected. */
  voidedPayments: number;
  /** Refund receipts voided this day (money that did not go out after all). */
  voidedRefunds: number;
  waived: number;
  /** Cash that should be in the drawer for the day. */
  net: number;
  receipts: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function dayTotals(day: string, money: MoneyRow[], waivers: WaiverRow[] = []): DayTotals {
  let collected = 0;
  let refunded = 0;
  let voidedPayments = 0;
  let voidedRefunds = 0;
  const receipts = new Set<number>();
  for (const m of money) {
    if (m.paidOn === day) {
      receipts.add(m.receiptNo);
      if (m.kind === "payment") collected += m.amount;
      else refunded += m.amount;
    }
    if (m.voidedOn === day) {
      if (m.kind === "payment") voidedPayments += m.amount;
      else voidedRefunds += m.amount;
    }
  }
  const waived = waivers.filter((w) => w.on === day && w.voidedOn !== day).reduce((s, w) => s + w.amount, 0);
  return {
    collected: round2(collected),
    refunded: round2(refunded),
    voidedPayments: round2(voidedPayments),
    voidedRefunds: round2(voidedRefunds),
    waived: round2(waived),
    net: round2(collected - refunded - voidedPayments + voidedRefunds),
    receipts: receipts.size,
  };
}

/** Default amounts to collect: each selected fine's whole outstanding, never more. */
export function collectLines(
  fines: { fineId: string; outstanding: number }[],
  picks: Record<string, string | undefined>,
): { lines: { fineId: string; amount: number }[]; total: number; error: "none" | "too_much" | "invalid" | null } {
  const lines: { fineId: string; amount: number }[] = [];
  for (const f of fines) {
    const raw = picks[f.fineId];
    if (raw === undefined) continue;
    const amount = round2(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0) return { lines: [], total: 0, error: "invalid" };
    if (amount > round2(f.outstanding)) return { lines: [], total: 0, error: "too_much" };
    lines.push({ fineId: f.fineId, amount });
  }
  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, total, error: lines.length ? null : "none" };
}

/** Refund limit for one fine: what was paid minus what was already refunded. */
export function refundLimit(fine: { paid: number; refunded: number }): number {
  return Math.max(0, round2(fine.paid - fine.refunded));
}

/** "2026-02-31" parses in JS but is not a day: round-trip it. */
export function isRealDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}
