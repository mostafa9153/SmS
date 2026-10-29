import { beforeEach, describe, expect, it, vi } from "vitest";

let afterRows: Record<string, unknown>[] = [];
const eqCalls: [string, unknown][] = [];
const recorded: Record<string, any>[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const builder: Record<string, unknown> = {
        then: (resolve: (r: unknown) => unknown) => Promise.resolve(resolve({ data: afterRows, error: null })),
        select: () => builder,
        eq: (col: string, val: unknown) => (eqCalls.push([col, val]), builder),
      };
      return builder;
    },
  }),
}));

vi.mock("@/lib/undo/journal", () => ({
  recordUndo: async (input: Record<string, any>) => (recorded.push(input), "undo-1"),
}));

const { recordResultsUndo, snapshotClassResults } = await import("@/lib/academic/results-undo");

beforeEach(() => {
  eqCalls.length = 0;
  recorded.length = 0;
});

describe("snapshotClassResults", () => {
  it("reads every row of the class, year and exam, with the class upper-cased", async () => {
    afterRows = [{ id: "r1" }];
    const rows = await snapshotClassResults(2026, " viii ", "Annual Examination");
    expect(rows).toEqual([{ id: "r1" }]);
    expect(eqCalls).toEqual([
      ["academic_year", 2026],
      ["class", "VIII"],
      ["exam_name", "Annual Examination"],
    ]);
  });
});

describe("recordResultsUndo", () => {
  it("restores the old rows and deletes rows the save created", async () => {
    const before = [{ id: "r1", marks_obtained: 40 }];
    afterRows = [{ id: "r1", marks_obtained: 55 }, { id: "r2", marks_obtained: 70 }];

    const id = await recordResultsUndo({
      actorId: "u1",
      action: "results.save",
      label: "Save student marks",
      academicYear: 2026,
      className: "VIII",
      examName: "Annual Examination",
      before,
    });

    expect(id).toBe("undo-1");
    expect(recorded[0].steps).toEqual([
      { table: "student_results", op: "upsert", rows: before },
      { table: "student_results", op: "delete", column: "id", values: ["r2"] },
    ]);
    expect(recorded[0].entityId).toBe("2026:VIII:Annual Examination");
  });

  it("restores nothing to delete when the save only edited existing rows", async () => {
    afterRows = [{ id: "r1" }];
    await recordResultsUndo({ actorId: "u1", action: "a", label: "l", academicYear: 2026, className: "V", examName: "E", before: [{ id: "r1" }] });
    expect((recorded[0].steps[1] as { values: string[] }).values).toEqual([]);
  });
});
