import { describe, it, expect } from "vitest";
import {
  detectBestHeaderRow,
  buildRowsFromHeader,
  autoSuggestMapping,
  applyMapping,
  validateMappedRows,
} from "@/lib/utils/excel-parser";

// Shape of a UDISE+ SDMS "List of Active Students" export (made-up people)
const header = [
  "Class", "Section", "DOB", "Name", "Gender", "Mother Name", "Father Name", "Guardian Name", "AADHAAR No.",
  "Mobile No.", "Contact Email Id", "Mother Tongue", "Social Category", "Minority Group", "Blood Group",
  "Admission No.", "Academic Stream", "Status of student in Previous Academic Year",
  "Grade/Class Studied in the Previous/Last Academic Year", "Whether Admitted under Section 12C of RTE Act",
  "In the previous class studied – Result of the examination", "Highest Education Level of Mother/Father/Legal Guardian",
  "Sector", "Percentage of Marks obtained in Previous Class for Vocational Subject", "Student State Code",
  "AADHAAR Validation Status", "APAAR Status",
];
const student = (cls: string, sec: string, name: string, code: string, minority = "NA") => [
  cls, sec, "14/04/2010", name, "Female", "RINA DAS", "TAPAN DAS", "TAPAN DAS", "********0184",
  "83******80", "/", "1 - Bengali - Bengali", "GENERAL", minority, "Unknown Blood Group",
  "NA", "NA", "1", "9", "NO", "3", "4", "NA", "999", code, "Not Defined", "NA",
];
const sheet = [
  ["List_of_Active_Students_19100000001_DEMO HIGH SCHOOL_AY_2026-27"],
  ["DEMO HIGH SCHOOL-19100000001"],
  ["Generated Date(DD-MM-YYYY) : 06-10-2026 03:30:13 PM"],
  header,
  header.map((_, i) => `(${i + 1})`),
  student("X", "B", "PRIYA DAS", "02375900000001", "1 - MUSLIM"),
  student("IX", "A", "MOU SEN", "02375900000002"),
  student("11", "A", "ANU ROY", "02375900000003"),
  student("999", "NA", "NO CLASS GIRL", ""),
];

function run() {
  const { headerRowIndex, metadata } = detectBestHeaderRow(sheet);
  const { headers, rawRows } = buildRowsFromHeader(sheet, headerRowIndex);
  const mapping = autoSuggestMapping(headers);
  const rows = applyMapping(rawRows, mapping, 2026, "AUTO", "AUTO", "Continuing");
  return { headerRowIndex, metadata, mapping, rows, ...validateMappedRows(rows) };
}

describe("UDISE+ SDMS export", () => {
  it("finds the header, skips the column-number row and reads the year from the banner only", () => {
    const { headerRowIndex, metadata, rows } = run();
    expect(headerRowIndex).toBe(3);
    expect(rows).toHaveLength(4);
    expect(metadata.detectedAcademicYear).toMatch(/^2026/);
    expect(metadata.detectedClass).toBeUndefined();
    expect(metadata.detectedSection).toBeUndefined();
  });

  it("keeps each row's own class (roman or number) and never lets a later column overwrite it", () => {
    const { rows } = run();
    expect(rows.map((r) => [r.presentClass, r.presentSection])).toEqual([
      ["X", "B"],
      ["IX", "A"],
      ["XI", "A"],
      [undefined, undefined],
    ]);
    expect(rows[0].previousClass).toBe("IX");
  });

  it("ignores wrongly matching columns, placeholders and masked values", () => {
    const { mapping, rows } = run();
    for (const h of ["Sector", "Highest Education Level of Mother/Father/Legal Guardian", "AADHAAR Validation Status", "APAAR Status"]) {
      expect(mapping[h]).toBe("ignore");
    }
    expect(mapping["Contact Email Id"]).toBe("email");
    const r = rows[0];
    expect(r.aadhaar).toBeUndefined();
    expect(r.studentContact).toBeUndefined();
    expect(r.email).toBeUndefined();
    expect(r.bloodGroup).toBeUndefined();
    expect(r.admissionNo).toBeUndefined();
    expect(r.studentUniqueCode).toBe("02375900000001");
    expect(r.motherTongue).toBe("Bengali");
    expect(r.minorityGroup).toBe("Muslim");
    expect(r.religion).toBe("Islam");
  });

  it("a row whose class cannot be read stays blank and is flagged, not a guessed Class V", () => {
    const { issues, previewRows } = run();
    const classIssues = issues.filter((i) => i.field === "presentClass");
    expect(classIssues).toHaveLength(1);
    expect(classIssues[0].severity).toBe("warning");
    expect(previewRows[3].presentClass).toBe("");
  });
});
