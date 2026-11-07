import { describe, expect, it } from "vitest";
import { collectLines, dayTotals, isRealDay, refundLimit, type MoneyRow } from "@/lib/library/fine-report";
import { waiveAmount } from "@/lib/library/rules";

const pay = (receiptNo: number, amount: number, paidOn: string, voidedOn: string | null = null): MoneyRow => ({
  receiptNo,
  kind: "payment",
  amount,
  paidOn,
  voidedOn,
});

describe("dayTotals", () => {
  it("keeps a closed day's collection when its receipt is voided later", () => {
    const rows = [pay(1, 50, "2026-11-05", "2026-11-06")];
    expect(dayTotals("2026-11-05", rows)).toMatchObject({ collected: 50, voidedPayments: 0, net: 50, receipts: 1 });
    expect(dayTotals("2026-11-06", rows)).toMatchObject({ collected: 0, voidedPayments: 50, net: -50, receipts: 0 });
  });

  it("counts a same-day void on both sides, netting to zero", () => {
    expect(dayTotals("2026-11-06", [pay(2, 30, "2026-11-06", "2026-11-06")])).toMatchObject({ collected: 30, voidedPayments: 30, net: 0 });
  });

  it("shows refunds apart and takes them out of the drawer", () => {
    const rows: MoneyRow[] = [pay(3, 100, "2026-11-06"), { receiptNo: 4, kind: "refund", amount: 40, paidOn: "2026-11-06", voidedOn: null }];
    expect(dayTotals("2026-11-06", rows)).toMatchObject({ collected: 100, refunded: 40, net: 60, receipts: 2 });
  });

  it("puts a voided refund back in the drawer", () => {
    const rows: MoneyRow[] = [{ receiptNo: 5, kind: "refund", amount: 20, paidOn: "2026-11-05", voidedOn: "2026-11-06" }];
    expect(dayTotals("2026-11-06", rows)).toMatchObject({ voidedRefunds: 20, net: 20 });
  });

  it("counts one receipt once even when it covers several fines", () => {
    expect(dayTotals("2026-11-06", [pay(6, 10, "2026-11-06"), pay(6, 15, "2026-11-06")])).toMatchObject({ collected: 25, receipts: 1 });
  });

  it("adds waivers apart from cash, skipping ones voided the same day", () => {
    const w = [
      { amount: 10, on: "2026-11-06", voidedOn: null },
      { amount: 5, on: "2026-11-06", voidedOn: "2026-11-06" },
    ];
    expect(dayTotals("2026-11-06", [], w)).toMatchObject({ waived: 10, net: 0 });
  });

  it("rounds to paise", () => {
    expect(dayTotals("2026-11-06", [pay(7, 0.1, "2026-11-06"), pay(8, 0.2, "2026-11-06")]).collected).toBe(0.3);
  });
});

describe("collectLines", () => {
  const fines = [
    { fineId: "a", outstanding: 30 },
    { fineId: "b", outstanding: 12.5 },
  ];

  it("sums the picked fines", () => {
    expect(collectLines(fines, { a: "30", b: "5" })).toEqual({
      lines: [
        { fineId: "a", amount: 30 },
        { fineId: "b", amount: 5 },
      ],
      total: 35,
      error: null,
    });
  });

  it("refuses more than a fine's outstanding", () => {
    expect(collectLines(fines, { b: "12.51" }).error).toBe("too_much");
  });

  it("refuses zero, negative or non-numbers", () => {
    expect(collectLines(fines, { a: "0" }).error).toBe("invalid");
    expect(collectLines(fines, { a: "-1" }).error).toBe("invalid");
    expect(collectLines(fines, { a: "abc" }).error).toBe("invalid");
  });

  it("says when nothing is picked", () => {
    expect(collectLines(fines, {}).error).toBe("none");
  });
});

describe("waiver and refund limits", () => {
  it("never lets payment plus waiver exceed the fine", () => {
    // 100 fine, 70 paid: only 30 is left to waive.
    expect(waiveAmount({ outstanding: 30, mode: "full" })).toEqual({ ok: true, amount: 30 });
    expect(waiveAmount({ outstanding: 30, mode: "custom", custom: 31 })).toEqual({ ok: false, reason: "too_much" });
    expect(waiveAmount({ outstanding: 0, mode: "half" })).toEqual({ ok: false, reason: "nothing_due" });
  });

  it("refunds at most what was paid and not yet refunded", () => {
    expect(refundLimit({ paid: 50, refunded: 20 })).toBe(30);
    expect(refundLimit({ paid: 20, refunded: 20 })).toBe(0);
  });
});

describe("isRealDay", () => {
  it("accepts real days and refuses ones JS would roll over", () => {
    expect(isRealDay("2026-11-06")).toBe(true);
    expect(isRealDay("2028-02-29")).toBe(true);
    expect(isRealDay("2026-02-31")).toBe(false);
    expect(isRealDay("2026-13-01")).toBe(false);
    expect(isRealDay("06-11-2026")).toBe(false);
  });
});
