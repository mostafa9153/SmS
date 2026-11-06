import { describe, expect, it } from "vitest";
import {
  borrowerBalance,
  damageLimit,
  dueDate,
  fineBalance,
  foundOverdueUntil,
  issueCheck,
  lostCharge,
  overdueFine,
  renewCheck,
  renewQuote,
  waiveAmount,
} from "@/lib/library/rules";
import type { LoanRules } from "@/lib/library/types";

const RULES: LoanRules = {
  loanDays: 14,
  finePerDay: 1,
  graceDays: 2,
  fineCap: 50,
  renewDays: 7,
  maxRenews: 2,
  renewWhenOverdue: false,
  renewWindowDays: 3,
  lostPolicy: "price",
  processingFee: 20,
  defaultLostAmount: 150,
};
const NONE: { from: string; to: string }[] = [];
const PUJA = [{ from: "2026-11-09", to: "2026-11-13" }];

describe("due date", () => {
  it("is issue date + loan days", () => {
    expect(dueDate("2026-11-02", 14, NONE)).toBe("2026-11-16");
  });
  it("moves off a Sunday", () => {
    // 2026-11-01 + 14 = 2026-11-15 (Sunday) → Monday
    expect(dueDate("2026-11-01", 14, NONE)).toBe("2026-11-16");
  });
  it("moves past a holiday range", () => {
    expect(dueDate("2026-10-27", 14, PUJA)).toBe("2026-11-14");
  });
});

describe("overdue fine", () => {
  it("is zero on or before the due date", () => {
    expect(overdueFine({ dueOn: "2026-11-16", asOf: "2026-11-16", rules: RULES, holidays: NONE, applyGrace: true })).toBe(0);
    expect(overdueFine({ dueOn: "2026-11-16", asOf: "2026-11-10", rules: RULES, holidays: NONE, applyGrace: true })).toBe(0);
  });
  it("forgives the grace working days, then charges every later working day", () => {
    // due Mon 16; 17,18 grace; 19,20 charged
    expect(overdueFine({ dueOn: "2026-11-16", asOf: "2026-11-18", rules: RULES, holidays: NONE, applyGrace: true })).toBe(0);
    expect(overdueFine({ dueOn: "2026-11-16", asOf: "2026-11-20", rules: RULES, holidays: NONE, applyGrace: true })).toBe(2);
  });
  it("charges grace days when grace does not apply (second overdue stretch)", () => {
    expect(overdueFine({ dueOn: "2026-11-16", asOf: "2026-11-20", rules: RULES, holidays: NONE, applyGrace: false })).toBe(4);
  });
  it("skips Sundays and holidays", () => {
    // due Fri 6th, returned Mon 16th: 7, (8 Sun), 9-13 holiday, 14, (15 Sun), 16 → 3 working days, 2 grace → 1
    expect(overdueFine({ dueOn: "2026-11-06", asOf: "2026-11-16", rules: RULES, holidays: PUJA, applyGrace: true })).toBe(1);
  });
  it("stops at the cap, counting what the loan was already charged", () => {
    const longLate = { dueOn: "2026-01-01", asOf: "2026-12-31", rules: RULES, holidays: NONE, applyGrace: true };
    expect(overdueFine(longLate)).toBe(50);
    expect(overdueFine({ ...longLate, alreadyCharged: 45 })).toBe(5);
    expect(overdueFine({ ...longLate, alreadyCharged: 60 })).toBe(0);
  });
  it("has no cap when fineCap is null", () => {
    const r = { ...RULES, fineCap: null, graceDays: 0 };
    expect(overdueFine({ dueOn: "2026-11-02", asOf: "2026-11-09", rules: r, holidays: NONE, applyGrace: true })).toBe(6);
  });
});

describe("renew", () => {
  it("opens only inside the renew window", () => {
    const q = renewQuote({ today: "2026-11-05", dueOn: "2026-11-16", renewCount: 0, rules: RULES, holidays: NONE });
    expect(q).toEqual({ ok: false, reason: "too_early", opensOn: "2026-11-13" });
  });
  it("extends from the old due date when renewed before it", () => {
    // Fri 13 (window opens), old due Mon 16 → 16 + 7 = 23, capped at 13 + 14 = 27
    expect(renewQuote({ today: "2026-11-13", dueOn: "2026-11-16", renewCount: 0, rules: RULES, holidays: NONE })).toEqual({
      ok: true,
      newDue: "2026-11-23",
    });
  });
  it("never shortens a loan pushed out by a holiday", () => {
    // Due moved to Sat 14 by Puja; renewing on Wed 11 (inside window) must not give less than 14
    const r = { ...RULES, loanDays: 3, renewDays: 2 };
    const q = renewQuote({ today: "2026-11-11", dueOn: "2026-11-14", renewCount: 0, rules: r, holidays: PUJA });
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.reason).toBe("no_gain");
  });
  it("rejects past the renew limit", () => {
    expect(renewQuote({ today: "2026-11-15", dueOn: "2026-11-16", renewCount: 2, rules: RULES, holidays: NONE })).toEqual({
      ok: false,
      reason: "max_renews",
    });
  });
  it("rejects an overdue loan unless the setting allows it", () => {
    expect(renewQuote({ today: "2026-11-20", dueOn: "2026-11-16", renewCount: 0, rules: RULES, holidays: NONE })).toEqual({
      ok: false,
      reason: "overdue",
    });
    const q = renewQuote({
      today: "2026-11-20",
      dueOn: "2026-11-16",
      renewCount: 0,
      rules: { ...RULES, renewWhenOverdue: true },
      holidays: NONE,
    });
    expect(q).toEqual({ ok: true, newDue: "2026-11-27" });
  });
  it("shifts the new due date off a Sunday", () => {
    // old due Mon 16 + 6 = Sun 22 → Mon 23
    const q = renewQuote({ today: "2026-11-14", dueOn: "2026-11-16", renewCount: 0, rules: { ...RULES, renewDays: 6 }, holidays: NONE });
    expect(q).toEqual({ ok: true, newDue: "2026-11-23" });
  });
});

describe("lost, damaged and found", () => {
  it("charges price + processing fee, or the default when there is no price", () => {
    expect(lostCharge({ price: 220, rules: RULES })).toBe(240);
    expect(lostCharge({ price: null, rules: RULES })).toBe(170);
    expect(lostCharge({ price: 220, rules: { ...RULES, lostPolicy: "fixed" } })).toBe(170);
  });
  it("charges only the processing fee when the borrower replaces the book", () => {
    expect(lostCharge({ price: 220, rules: RULES, replaced: true })).toBe(20);
  });
  it("limits a damage charge to the price, or the default lost amount", () => {
    expect(damageLimit(220, RULES)).toBe(220);
    expect(damageLimit(null, RULES)).toBe(150);
  });
  it("keeps charging overdue until the found date when the borrower had the book", () => {
    expect(foundOverdueUntil({ source: "borrower", lostOn: "2026-11-20", foundOn: "2026-12-10" })).toBe("2026-12-10");
    expect(foundOverdueUntil({ source: "library", lostOn: "2026-11-20", foundOn: "2026-12-10" })).toBe("2026-11-20");
  });
});

describe("fines, waivers and balance", () => {
  it("derives the outstanding amount from payments, refunds and waivers, ignoring voided rows", () => {
    expect(
      fineBalance({
        amount: 100,
        payments: [
          { kind: "payment", amount: 30, voided: false },
          { kind: "payment", amount: 50, voided: true },
          { kind: "refund", amount: 10, voided: false },
        ],
        waivers: [{ amount: 20, voided: false }],
      }),
    ).toBe(60);
  });
  it("is zero for a cancelled fine", () => {
    expect(fineBalance({ amount: 100, payments: [], waivers: [], cancelled: true })).toBe(0);
  });
  it("waives 50% of what is outstanding, not of the original fine", () => {
    expect(waiveAmount({ outstanding: 30, mode: "half" })).toEqual({ ok: true, amount: 15 });
    expect(waiveAmount({ outstanding: 25, mode: "half" })).toEqual({ ok: true, amount: 12.5 });
    expect(waiveAmount({ outstanding: 30, mode: "full" })).toEqual({ ok: true, amount: 30 });
  });
  it("refuses a custom waiver above the outstanding amount or not positive", () => {
    expect(waiveAmount({ outstanding: 30, mode: "custom", custom: 31 })).toEqual({ ok: false, reason: "too_much" });
    expect(waiveAmount({ outstanding: 30, mode: "custom", custom: 0 })).toEqual({ ok: false, reason: "invalid" });
    expect(waiveAmount({ outstanding: 0, mode: "full" })).toEqual({ ok: false, reason: "nothing_due" });
  });
  it("rounds a custom waiver before checking it", () => {
    expect(waiveAmount({ outstanding: 10, mode: "custom", custom: 0.001 })).toEqual({ ok: false, reason: "invalid" });
    expect(waiveAmount({ outstanding: 0.3, mode: "custom", custom: 0.1 + 0.2 })).toEqual({ ok: true, amount: 0.3 });
  });
  it("counts accruing fines on books not yet returned", () => {
    const balance = borrowerBalance({
      today: "2026-11-30",
      holidays: NONE,
      fines: [{ amount: 10, payments: [], waivers: [] }],
      openLoans: [{ dueOn: "2026-11-16", rules: RULES, applyGrace: true, alreadyCharged: 0 }],
    });
    // 17..30 = 12 working days (22, 29 Sundays), 2 grace → 10, + stored 10
    expect(balance).toEqual({ stored: 10, accruing: 10, total: 20 });
  });
});

describe("issue and renew checks", () => {
  const base = { active: true, openLoans: 1, maxBooks: 2, balance: 0, blockThreshold: 50 };
  it("allows a normal issue", () => {
    expect(issueCheck(base)).toEqual({ ok: true, remaining: 1 });
  });
  it("lists every reason an issue is refused", () => {
    expect(issueCheck({ ...base, active: false, openLoans: 2, balance: 80 })).toEqual({
      ok: false,
      reasons: ["inactive", "limit", "balance"],
    });
  });
  it("does not block on balance when no threshold is set", () => {
    expect(issueCheck({ ...base, balance: 999, blockThreshold: null })).toEqual({ ok: true, remaining: 1 });
  });
  it("blocks only above the threshold", () => {
    expect(issueCheck({ ...base, balance: 50 }).ok).toBe(true);
    expect(issueCheck({ ...base, balance: 50.5 }).ok).toBe(false);
  });
  it("applies inactive and balance to renew, but not the book limit", () => {
    expect(renewCheck({ active: true, balance: 0, blockThreshold: 50 })).toEqual({ ok: true });
    expect(renewCheck({ active: false, balance: 80, blockThreshold: 50 })).toEqual({ ok: false, reasons: ["inactive", "balance"] });
  });
});
