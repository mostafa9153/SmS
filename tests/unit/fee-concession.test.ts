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
    // the rounding remainder goes on the largest item
    expect(half.items.find((i) => i.id === "session")!.amount).toBe(263);
  });

  it("charges nothing when free but keeps the items", () => {
    const free = feeCharge(items, "free");
    expect(free).toMatchObject({ gross: 559, total: 0 });
    expect(free.items).toHaveLength(4);
  });

  it("handles an empty structure", () => {
    expect(applyConcession([], "half")).toEqual([]);
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
      return calls.length === 1 ? { error: { message: "Could not find the 'concession_type' column" } } : { error: null };
    });
    expect(res.error).toBeNull();
    expect(calls[1]).toEqual({ total_amount: 280 });
  });
});
