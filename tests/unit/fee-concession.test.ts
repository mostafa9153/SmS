import { describe, expect, it } from "vitest";
import { applyConcession, feeCharge, readFeeCharge } from "@/lib/admission/fee-concession";

const items = [
  { id: "dev", name: "Development", amount: 24 },
  { id: "lib", name: "Library", amount: 5 },
  { id: "mag", name: "Magazine", amount: 7 },
  { id: "session", name: "Session", amount: 523 },
];

describe("applyConcession", () => {
  it("keeps the full structure", () => {
    expect(feeCharge(items, "full")).toMatchObject({ gross: 559, total: 559 });
  });

  it("halves in whole rupees and the items add up to the total", () => {
    const half = feeCharge(items, "half");
    expect(half.total).toBe(280);
    expect(half.items.reduce((s, i) => s + i.amount, 0)).toBe(280);
    expect(half.items.every((i) => Number.isInteger(i.amount))).toBe(true);
    // each item stays within a rupee of its exact half
    half.items.forEach((i, idx) => expect(Math.abs(i.amount - items[idx].amount / 2)).toBeLessThanOrEqual(1));
  });

  it("charges nothing when free but keeps the items", () => {
    const free = feeCharge(items, "free");
    expect(free).toMatchObject({ gross: 559, total: 0 });
    expect(free.items).toHaveLength(4);
  });

  it("handles an empty structure", () => {
    expect(applyConcession([], 50)).toEqual([]);
  });
});

describe("custom percent off", () => {
  it("takes the percent off and the items add up to the total", () => {
    const c = feeCharge(items, "custom", 25);
    expect(c).toMatchObject({ percent: 25, gross: 559, total: 419 });
    expect(c.items.reduce((s, i) => s + i.amount, 0)).toBe(419);
  });

  it("never charges an item more than its own amount", () => {
    const small = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, name: `S${i}`, amount: 1 }));
    const c = feeCharge(small, "custom", 33);
    expect(c.total).toBe(7);
    expect(c.items.every((i) => i.amount <= 1)).toBe(true);
  });

  it("keeps a custom percent between 1 and 99", () => {
    expect(feeCharge(items, "custom", 0).percent).toBe(1);
    expect(feeCharge(items, "custom", 150).percent).toBe(99);
  });

  it("is checked by the server", () => {
    const c = feeCharge(items, "custom", 30);
    const body = { feeItems: c.items, feeConcession: "custom", feeConcessionPercent: 30, feeGrossAmount: c.gross, feeAmount: c.total };
    expect(readFeeCharge(body)).toMatchObject({ concession: "custom", percent: 30, total: c.total });
    expect(readFeeCharge({ ...body, feeConcessionPercent: 40 })).toHaveProperty("error");
    expect(readFeeCharge({ ...body, feeConcessionPercent: 0 })).toHaveProperty("error");
    expect(readFeeCharge({ ...body, feeConcessionPercent: 12.5 })).toHaveProperty("error");
  });
});

describe("readFeeCharge", () => {
  const body = (concession: "full" | "half" | "free") => {
    const c = feeCharge(items, concession);
    return { feeItems: c.items, feeConcession: concession, feeGrossAmount: c.gross, feeAmount: c.total };
  };

  it("accepts what the finalize step sends", () => {
    for (const c of ["full", "half", "free"] as const) {
      expect(readFeeCharge(body(c))).toMatchObject({ concession: c, total: feeCharge(items, c).total });
    }
  });

  it("is null for a client that sends only the amount", () => {
    expect(readFeeCharge({ feeAmount: 600 })).toBeNull();
  });

  it("rejects numbers that do not agree", () => {
    expect(readFeeCharge({ ...body("half"), feeAmount: 559 })).toHaveProperty("error");
    expect(readFeeCharge({ ...body("free"), feeItems: items })).toHaveProperty("error");
    expect(readFeeCharge({ ...body("full"), feeConcession: "quarter" })).toHaveProperty("error");
    expect(readFeeCharge({ ...body("full"), feeItems: [{ name: "X", amount: -5 }] })).toHaveProperty("error");
  });
});

describe("writeWithConcession", () => {
  it("retries without the concession columns before the migration", async () => {
    const { writeWithConcession } = await import("@/lib/admission/fee-concession");
    const calls: Record<string, unknown>[] = [];
    const res = await writeWithConcession({ total_amount: 280, concession_type: "half", gross_amount: 559 }, async (row) => {
      calls.push(row as Record<string, unknown>);
      // a database with none of the columns names them one at a time
      if (calls.length === 1) return { error: { message: "Could not find the 'concession_type' column" } };
      if (calls.length === 2) return { error: { message: "Could not find the 'gross_amount' column" } };
      return { error: null };
    });
    expect(res.error).toBeNull();
    expect(calls[2]).toEqual({ total_amount: 280 });
  });

  it("drops only the column the database does not have", async () => {
    const { writeWithConcession } = await import("@/lib/admission/fee-concession");
    const calls: Record<string, unknown>[] = [];
    await writeWithConcession({ total_amount: 280, concession_type: "half", concession_percent: 50, gross_amount: 559 }, async (row) => {
      calls.push(row as Record<string, unknown>);
      return calls.length === 1 ? { error: { message: "Could not find the 'concession_percent' column" } } : { error: null };
    });
    expect(calls[1]).toEqual({ total_amount: 280, concession_type: "half", gross_amount: 559 });
  });
});
