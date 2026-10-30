import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rollConflict } from "@/lib/admission/roll-guard";

type Rows = Record<string, unknown>[];

// Chainable stand-in: every filter returns the builder; awaiting it yields the table's rows.
const client = (tables: Record<string, Rows | Error>) =>
  ({
    from: (table: string) => {
      const rows = tables[table] ?? [];
      const result = rows instanceof Error ? { data: null, error: { message: rows.message } } : { data: rows, error: null };
      const builder: Record<string, unknown> = {
        then: (resolve: (r: unknown) => unknown) => resolve(result),
      };
      for (const m of ["select", "eq", "neq", "limit"]) builder[m] = () => builder;
      return builder;
    },
  }) as unknown as SupabaseClient;

const slot = { className: "VI", section: "A", roll: 7, academicYear: 2026 };

describe("rollConflict", () => {
  it("allows a free roll", async () => {
    expect(await rollConflict(client({}), slot)).toBeNull();
  });

  it("blocks a roll held by a continuing student or an admitted applicant", async () => {
    expect(await rollConflict(client({ students: [{ id: "S2", name: "Rina" }] }), slot)).toContain("Rina");
    expect(await rollConflict(client({ admission_applications: [{ id: "A2", student_name: "Joy" }] }), slot)).toContain("Joy");
  });

  it("fails closed when a lookup errors", async () => {
    expect(await rollConflict(client({ students: new Error("timeout") }), slot)).toContain("Could not check");
  });
});
