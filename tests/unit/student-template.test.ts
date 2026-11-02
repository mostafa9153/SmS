import { describe, it, expect } from "vitest";
import { STUDENT_SAMPLE, studentTemplateFields } from "@/components/students/bulk-upload/bulk-templates";
import { autoSuggestMapping } from "@/lib/utils/excel/mapping";
import { applyMapping } from "@/lib/utils/excel/students";
import { TARGET_FIELDS } from "@/lib/utils/excel/fields";

describe("student bulk upload template", () => {
  const fields = studentTemplateFields();
  const headers = fields.map((f) => f.label);

  it("has a column for every importable field", () => {
    expect(fields.length).toBe(TARGET_FIELDS.length - 2);
    for (const f of TARGET_FIELDS.filter((t) => t.required)) expect(headers).toContain(f.label);
  });

  it("every header maps back to its own field", () => {
    const mapping = autoSuggestMapping(headers);
    for (const f of fields) expect(mapping[f.label], f.label).toBe(f.key);
  });

  it("the sample row imports", () => {
    const row = Object.fromEntries(fields.map((f) => [f.label, STUDENT_SAMPLE[f.key] ?? ""]));
    const [s] = applyMapping([{ ...row, Class: "V", Section: "A" }], autoSuggestMapping(headers));
    expect(s.name).toBe("Rohit Sharma");
    expect(s.dob).toBe("2012-05-15");
    expect(s.bankIfsc).toBe("SBIN0001234");
    expect(s.aadhaar).toBe("123412341234");
    expect(s.socialCategory).toBe("General");
    expect(s.languageGroup).toEqual(["Bengali", "English"]);
    expect(s.indianNationality).toBe(true);
  });
});
