import { describe, expect, it } from "vitest";
import { splitCsvFields } from "@/lib/utils/csv-fields";

describe("splitCsvFields", () => {
  it("trims entries and drops empty ones", () => {
    expect(splitCsvFields(" a, b ,, c ,")).toEqual(["a", "b", "c"]);
  });

  it("returns an empty list for empty or missing input", () => {
    expect(splitCsvFields("")).toEqual([]);
    expect(splitCsvFields(undefined)).toEqual([]);
    expect(splitCsvFields(null)).toEqual([]);
  });
});
