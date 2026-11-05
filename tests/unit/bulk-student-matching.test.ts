import { describe, expect, it } from "vitest";
import { splitClassSection, toIsoDate } from "@/lib/utils/excel/normalizers";
import { applyMapping, validateMappedRows } from "@/lib/utils/excel/students";
import { buildIndex, identityValue, matchRow, namesDiffer } from "@/lib/supabase/bulk-upload/student-match";
import { buildCreateRow, buildPatch, missingEssentials } from "@/lib/supabase/bulk-upload/student-fields";

describe("splitClassSection", () => {
  it.each([
    ["5", "V", undefined],
    ["05", "V", undefined],
    ["5.0", "V", undefined],
    ["5th", "V", undefined],
    ["Class-6", "VI", undefined],
    ["Class: VII", "VII", undefined],
    ["Std V", "V", undefined],
    ["Five", "V", undefined],
    ["vi", "VI", undefined],
    ["VI-A", "VI", "A"],
    ["6 (B)", "VI", "B"],
    ["IX A", "IX", "A"],
    ["XI ARTS", "XI", undefined],
    ["১০", "X", undefined],
    ["XII", "XII", undefined],
  ])("%s -> %s", (raw, cls, section) => {
    expect(splitClassSection(raw)).toEqual({ cls, section });
  });

  it("leaves unreadable classes blank", () => {
    expect(splitClassSection("13").cls).toBe("");
    expect(splitClassSection("Nursery").cls).toBe("");
    expect(splitClassSection("").cls).toBe("");
  });
});

describe("toIsoDate", () => {
  it("accepts real dates and rejects text", () => {
    expect(toIsoDate("05/03/2014")).toBe("2014-03-05");
    expect(toIsoDate("2014-3-5")).toBe("2014-03-05");
    expect(toIsoDate("NA")).toBe("");
    expect(toIsoDate("In earlier academic year")).toBe("");
    expect(toIsoDate("31/02/2014")).toBe("");
  });
});

describe("applyMapping keeps blanks blank", () => {
  const mapping = { Name: "name", DOB: "dob", Adm: "admissionDate", Class: "presentClass", Roll: "presentRoll", Religion: "religion" } as const;

  it("notes unreadable cells instead of sending them", () => {
    const [row] = applyMapping([{ Name: "A", DOB: "NA", Adm: "In earlier academic year", Class: "Class-6 B", Roll: "x" }], mapping as never, 2026);
    expect(row.dob).toBeUndefined();
    expect(row.admissionDate).toBeUndefined();
    expect(row.presentClass).toBe("VI");
    expect(row.presentSection).toBe("B");
    expect(row.presentRoll).toBeUndefined();
    expect(row.religion).toBeUndefined();
    expect(row._notes).toHaveLength(1);
    expect(row._defaults).toEqual(["admissionYear", "currentStatus"]);
  });

  it("skips only the second row that repeats an identifier", () => {
    const rows = applyMapping(
      [
        { Name: "A", PEN: "P1" },
        { Name: "B", PEN: "p1" },
      ],
      { Name: "name", PEN: "pen" } as never,
      2026
    );
    const { previewRows } = validateMappedRows(rows, [5, 9]);
    expect(previewRows.map((r) => r.rowNumber)).toEqual([5, 9]);
    expect(previewRows[0].errors).toEqual([]);
    expect(previewRows[1].errors).toEqual(["Duplicate PEN"]);
  });
});

describe("matchRow", () => {
  const students = [
    { id: "1", name: "RAHIM SK", pen: "PEN1", student_unique_code: "19112", school_id: null, aadhaar: null, admission_no: "18" },
    { id: "2", name: "KARIM SK", pen: "PEN2", student_unique_code: null, school_id: "MHS/1", aadhaar: "123412341234", admission_no: "18" },
    { id: "3", name: "TWIN ONE", pen: "SHARED", student_unique_code: null, school_id: null, aadhaar: null, admission_no: null },
    { id: "4", name: "TWIN TWO", pen: "SHARED", student_unique_code: null, school_id: null, aadhaar: null, admission_no: null },
  ];
  const index = buildIndex(students);

  it("matches on PEN first, then Banglar Shiksha ID, School ID, Aadhaar", () => {
    expect(matchRow({ pen: "pen1" }, index)).toMatchObject({ kind: "match", matchedBy: "pen", student: { id: "1" } });
    expect(matchRow({ studentUniqueCode: "19112" }, index)).toMatchObject({ kind: "match", matchedBy: "studentUniqueCode" });
    expect(matchRow({ schoolId: "mhs/1" }, index)).toMatchObject({ kind: "match", matchedBy: "schoolId", student: { id: "2" } });
    expect(matchRow({ aadhaar: "1234 1234 1234" }, index)).toMatchObject({ kind: "match", matchedBy: "aadhaar", student: { id: "2" } });
  });

  it("never matches on Admission No", () => {
    expect(matchRow({ admissionNo: "18" }, index)).toEqual({ kind: "new" });
  });

  it("treats placeholders as blank", () => {
    expect(identityValue("pen", "NA")).toBe("");
    expect(identityValue("studentUniqueCode", "0")).toBe("");
    expect(matchRow({ pen: "N/A" }, index)).toEqual({ kind: "new" });
  });

  it("does not pick one of several students sharing an id, and never creates a duplicate for it", () => {
    expect(matchRow({ pen: "SHARED" }, index)).toMatchObject({ kind: "ambiguous" });
    expect(matchRow({ pen: "SHARED", schoolId: "MHS/1" }, index)).toMatchObject({ kind: "match", student: { id: "2" } });
  });

  it("reports ids that point to different students", () => {
    const m = matchRow({ pen: "PEN1", schoolId: "MHS/1" }, index);
    expect(m).toMatchObject({ kind: "match", student: { id: "1" } });
    expect(m.kind === "match" && m.conflict).toBeTruthy();
  });
});

describe("namesDiffer", () => {
  it("allows extra words and case, flags different people", () => {
    expect(namesDiffer("Md Rahim Sk", "RAHIM SK")).toBe(false);
    expect(namesDiffer("NASIMA KHATUN", "MOSIBOUL MONDAL")).toBe(true);
  });
});

describe("buildPatch", () => {
  const existing = { name: "RAHIM", dob: null, father_name: "OLD", language_group: ["A", "B"], is_cwsn: false, present_class: "V", admission_year: 2020 };

  it("fill_blanks only fills empty fields", () => {
    const { patch } = buildPatch(existing, { name: "RAHIM SK", dob: "2014-01-02", fatherName: "NEW", isCwsn: true }, "fill_blanks");
    expect(patch).toEqual({ dob: "2014-01-02", is_cwsn: true });
  });

  it("overwrite corrects values, but a blank cell never erases one", () => {
    const { patch, changes } = buildPatch(existing, { fatherName: "NEW", presentClass: "" }, "overwrite");
    expect(patch).toEqual({ father_name: "NEW" });
    expect(changes).toEqual([{ label: "Father Name", from: "OLD", to: "NEW" }]);
  });

  it("does not count an identical list as a change", () => {
    expect(buildPatch(existing, { languageGroup: ["B", "A"] }, "overwrite").changes).toEqual([]);
  });

  it("skips values the upload settings supplied", () => {
    const { patch } = buildPatch(existing, { admissionYear: 2026, _defaults: ["admissionYear"] }, "overwrite");
    expect(patch).toEqual({});
  });
});

describe("buildCreateRow / missingEssentials", () => {
  it("leaves blanks null and flags missing essentials", () => {
    const row = buildCreateRow({ name: "A", presentClass: "VI" }, { admissionYear: 2026, status: "Continuing" });
    expect(row.school_id).toBeNull();
    expect(row.dob).toBeNull();
    expect(row.present_roll).toBeNull();
    expect(row.admission_year).toBe(2026);
    expect(row.current_status).toBe("Continuing");
    expect("is_cwsn" in row).toBe(false);
    expect(missingEssentials(row)).toEqual(["Date of Birth", "Gender", "Father Name", "Mother Name", "Section", "Roll", "PEN"]);
  });
});
