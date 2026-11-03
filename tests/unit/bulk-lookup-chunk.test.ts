import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("bulk upload lookups", () => {
  it("never sends a single unchunked .in() for existing students", () => {
    const src = readFileSync("lib/supabase/bulk-upload/students.ts", "utf8");
    expect(src).not.toMatch(/\.select\("\*"\)\.in\("(school_id|pen|aadhaar|student_unique_code|admission_no)", lookup/);
  });
});
