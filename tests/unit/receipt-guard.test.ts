import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { receiptConflict } from "@/lib/admission/receipt-guard";

// Minimal stand-in for supabase.from().select().eq().maybeSingle()
const client = (row: unknown, error: { message: string } | null = null) =>
  ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error }) }) }) }),
  }) as unknown as SupabaseClient;

describe("receiptConflict", () => {
  it("allows a free number, a blank slip, or the same student's own invoice", async () => {
    expect(await receiptConflict(client(null), "R1", ["S1"])).toBeNull();
    expect(await receiptConflict(client({ student_id: null, is_blank: true }), "R1", ["S1"])).toBeNull();
    expect(await receiptConflict(client({ student_id: "S1", is_blank: false }), "R1", [null, "S1"])).toBeNull();
  });

  it("blocks a number already filled for another student", async () => {
    const msg = await receiptConflict(client({ student_id: "S2", student_name: "Rina", is_blank: false }), "R1", ["S1"]);
    expect(msg).toContain("Rina");
  });

  it("fails closed when the lookup errors", async () => {
    expect(await receiptConflict(client(null, { message: "timeout" }), "R1", ["S1"])).toContain("Could not check");
  });
});
