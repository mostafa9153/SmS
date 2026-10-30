import { describe, expect, it } from "vitest";
import {
  TARGET_FIELDS,
  RESULT_TARGET_FIELDS,
  TEMPLATE_PRESETS,
  RESULT_TEMPLATE_PRESETS,
  applyMapping,
  applyResultMapping,
  autoSuggestMapping,
  autoSuggestResultMapping,
  buildRowsFromHeader,
  detectBestHeaderRow,
  extractBannerMetadata,
  normalizeClass,
  normalizeDate,
  normalizeGender,
  normalizeSocialCategory,
  normalizeStatus,
  reparseWithHeaderRow,
  validateMappedRows,
  validateResultRows,
  type ParsedExcelResult,
} from "@/lib/utils/excel-parser";

describe("normalizers", () => {
  it("normalizeDate handles DD/MM/YYYY, ISO, Excel serials and Date objects", () => {
    expect(normalizeDate("5/3/2012")).toBe("2012-03-05");
    expect(normalizeDate("05-03-2012")).toBe("2012-03-05");
    expect(normalizeDate("2012/3/5")).toBe("2012-03-05");
    expect(normalizeDate(41000)).toBe("2012-04-01");
    expect(normalizeDate("41000")).toBe("2012-04-01");
    expect(normalizeDate(new Date("2012-04-01T00:00:00Z"))).toBe("2012-04-01");
    expect(normalizeDate("")).toBe("");
    expect(normalizeDate("not a date")).toBe("not a date");
  });

  it("normalizeGender maps common spellings and codes", () => {
    for (const v of ["F", "girl", "Girls", "2", "Female", "meye"]) expect(normalizeGender(v)).toBe("Female");
    for (const v of ["M", "boy", "Boys", "1", "Male", "chele"]) expect(normalizeGender(v)).toBe("Male");
    for (const v of ["", null, undefined, "T", "transgender", "xyz"]) expect(normalizeGender(v)).toBe("Other");
  });

  it("normalizeSocialCategory folds OBC variants and abbreviations", () => {
    expect(normalizeSocialCategory("OBC-A")).toBe("OBC");
    expect(normalizeSocialCategory("obc b")).toBe("OBC");
    expect(normalizeSocialCategory("Scheduled Caste")).toBe("SC");
    expect(normalizeSocialCategory("st")).toBe("ST");
    expect(normalizeSocialCategory("Unreserved")).toBe("General");
    expect(normalizeSocialCategory("Other thing")).toBe("Other thing");
    expect(normalizeSocialCategory(null)).toBe("");
  });

  it("normalizeClass maps digits and 'Class N' to Roman numerals", () => {
    expect(normalizeClass("8")).toBe("VIII");
    expect(normalizeClass("class 10")).toBe("X");
    expect(normalizeClass("Class XI")).toBe("XI");
    expect(normalizeClass("ix")).toBe("IX");
    expect(normalizeClass(undefined)).toBe("");
  });

  it("normalizeStatus maps keywords and falls back to the default", () => {
    expect(normalizeStatus("Passed")).toBe("Passed Out");
    expect(normalizeStatus("dropped out")).toBe("Drop Out");
    expect(normalizeStatus("Active")).toBe("Continuing");
    expect(normalizeStatus("CCHS")).toBe("C.C.H.S.");
    expect(normalizeStatus("", "Drop Out")).toBe("Drop Out");
    expect(normalizeStatus("???", "Drop Out")).toBe("Drop Out");
  });
});

describe("extractBannerMetadata", () => {
  it("reads school, DISE, class, section and session from a banner line", () => {
    const meta = extractBannerMetadata("School Name: ABC High Academy Dise Code: 19012345678 CLASS VIII Section-B 2026-27");
    expect(meta.schoolName).toBe("ABC High Academy");
    expect(meta.diseCode).toBe("19012345678");
    expect(meta.detectedClass).toBe("VIII");
    expect(meta.detectedSection).toBe("B");
    expect(meta.detectedAcademicYear).toBe("2026-27");
  });

  it("cuts a trailing 'School' off the name when 'Dise' follows (known quirk, pinned)", () => {
    expect(extractBannerMetadata("School Name: ABC High School Dise Code: 1").schoolName).toBe("ABC High");
  });

  it("falls back to a bare year and leaves absent fields undefined", () => {
    const meta = extractBannerMetadata("Enrolment 2025");
    expect(meta.detectedAcademicYear).toBe("2025");
    expect(meta.schoolName).toBeUndefined();
    expect(meta.diseCode).toBeUndefined();
  });
});

describe("detectBestHeaderRow", () => {
  const header = ["Student Name", "Roll No", "Class", "Section", "Gender", "Date of Birth"];
  const data = ["Rahim Sk", "1", "VIII", "A", "M", "05/03/2012"];

  it("picks the real header under a banner and aggregates banner metadata", () => {
    const sheet = [["School Name: ABC High School"], ["Class VIII Section A 2026-27"], header, data];
    const out = detectBestHeaderRow(sheet);
    expect(out.headerRowIndex).toBe(2);
    expect(out.metadata.schoolName).toBe("ABC High School");
    expect(out.metadata.detectedClass).toBe("VIII");
  });

  it("picks row 0 when the header is first", () => {
    expect(detectBestHeaderRow([header, data]).headerRowIndex).toBe(0);
  });

  it("falls back to the first row with 3+ cells when nothing looks like a header", () => {
    const out = detectBestHeaderRow([[""], ["zz", "yy", "xx"], ["a", "b", "c"]]);
    expect(out.headerRowIndex).toBe(1);
  });
});

describe("buildRowsFromHeader", () => {
  it("de-duplicates and fills blank header names, skips empty rows, stringifies values", () => {
    const sheet = [
      ["Name", "Name", ""],
      ["A", "B", 5],
      ["", "", ""],
      ["C", "D", null],
    ];
    const { headers, rawRows } = buildRowsFromHeader(sheet, 0);
    expect(headers).toEqual(["Name", "Name_2", "Column_3"]);
    expect(rawRows).toEqual([
      { Name: "A", Name_2: "B", Column_3: "5" },
      { Name: "C", Name_2: "D", Column_3: "" },
    ]);
  });

  it("extends the column range when data rows are wider than the header", () => {
    const { headers } = buildRowsFromHeader([["A"], ["x", "y", "z"]], 0);
    expect(headers).toEqual(["A", "Column_2", "Column_3"]);
  });
});

describe("reparseWithHeaderRow", () => {
  it("rebuilds headers and rows from the cached sheet and clamps the index", () => {
    const parsed: ParsedExcelResult = {
      sheetNames: ["S"],
      selectedSheet: "S",
      headers: [],
      rawRows: [],
      headerRowIndex: 0,
      totalRows: 0,
      allRows2D: [["banner"], ["Name", "Roll"], ["A", "1"]],
    };
    const out = reparseWithHeaderRow(parsed, 1);
    expect(out.headers).toEqual(["Name", "Roll"]);
    expect(out.totalRows).toBe(1);
    expect(reparseWithHeaderRow(parsed, 99).headerRowIndex).toBe(2);
    expect(reparseWithHeaderRow(parsed, -4).headerRowIndex).toBe(0);
  });
});

describe("field tables and presets", () => {
  it("has unique target keys and every preset points at a known field or ignore", () => {
    const keys = TARGET_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    const known = new Set<string>([...keys, "ignore"]);
    for (const p of Object.values(TEMPLATE_PRESETS)) {
      for (const target of Object.values(p.mapping)) expect(known.has(target as string)).toBe(true);
    }
    const resultKeys = new Set<string>([...RESULT_TARGET_FIELDS.map((f) => f.key), "ignore"]);
    for (const p of Object.values(RESULT_TEMPLATE_PRESETS)) {
      for (const target of Object.values(p.mapping)) expect(resultKeys.has(target)).toBe(true);
    }
  });
});

describe("autoSuggestMapping", () => {
  it("maps common student headers and keeps parent names out of 'name'", () => {
    const m = autoSuggestMapping([
      "Student Name",
      "Father's Name",
      "Mother Name",
      "Roll No",
      "Date of Birth",
      "Gender",
      "Mother Tongue",
      "Totally Unknown Column",
    ]);
    expect(m["Student Name"]).toBe("name");
    expect(m["Father's Name"]).toBe("fatherName");
    expect(m["Mother Name"]).toBe("motherName");
    expect(m["Roll No"]).toBe("presentRoll");
    expect(m["Date of Birth"]).toBe("dob");
    expect(m["Gender"]).toBe("gender");
    expect(m["Mother Tongue"]).toBe("motherTongue");
    expect(m["Totally Unknown Column"]).toBe("ignore");
  });
});

describe("applyMapping", () => {
  const mapping = {
    Name: "name",
    DOB: "dob",
    Sex: "gender",
    Class: "presentClass",
    Roll: "presentRoll",
    Cat: "socialCategory",
    Mob: "studentContact",
    IFSC: "bankIfsc",
    Aadhaar: "aadhaar",
    CWSN: "isCwsn",
    Height: "heightCm",
    Subjects: "mandatorySubjects",
    Skip: "ignore",
  } as any;

  it("normalizes each field by its kind", () => {
    const [s] = applyMapping(
      [
        {
          Name: " Rahim ",
          DOB: "05/03/2012",
          Sex: "Boy",
          Class: "8",
          Roll: "Roll 12",
          Cat: "OBC-A",
          Mob: "98 7654 3210",
          IFSC: "sbin0001234",
          Aadhaar: "1234 5678 9012",
          CWSN: "Yes",
          Height: "142.5 cm",
          Subjects: "Bengali, English;Math",
          Skip: "zzz",
        },
      ],
      mapping,
      2026
    );
    expect(s).toMatchObject({
      name: "Rahim",
      dob: "2012-03-05",
      gender: "Male",
      presentClass: "VIII",
      presentRoll: 12,
      socialCategory: "OBC",
      studentContact: "9876543210",
      bankIfsc: "SBIN0001234",
      aadhaar: "123456789012",
      hasAadhaar: "Yes",
      isCwsn: true,
      heightCm: 142.5,
      mandatorySubjects: ["Bengali", "English", "Math"],
      admissionYear: 2026,
      currentStatus: "Continuing",
    });
    expect((s as any).Skip).toBeUndefined();
  });

  it("applies class, section and status defaults, ignoring AUTO", () => {
    const rows = [{ Name: "A" }];
    const withDefaults = applyMapping(rows, { Name: "name" } as any, 2025, "9", "b", "Drop Out")[0];
    expect(withDefaults).toMatchObject({ presentClass: "IX", presentSection: "B", currentStatus: "Drop Out", admissionYear: 2025 });
    const auto = applyMapping(rows, { Name: "name" } as any, 2025, "AUTO", "AUTO")[0];
    expect(auto.presentClass).toBeUndefined();
    expect(auto.presentSection).toBeUndefined();
  });

  it("skips blank cells and treats a non-numeric contact with letters as the guardian name", () => {
    const [s] = applyMapping([{ Name: "A", Mob: "REJAUL LASKAR", DOB: "" }], { Name: "name", Mob: "studentContact", DOB: "dob" } as any, 2025);
    expect(s.guardianName).toBe("REJAUL LASKAR");
    expect(s.studentContact).toBeUndefined();
    expect(s.dob).toBeUndefined();
  });

  it("records 'No' Aadhaar with an empty number and mirrors board numbers", () => {
    const [s] = applyMapping(
      [{ A: "No", R: "123", B: "999" }],
      { A: "aadhaar", R: "wbbseRegNo", B: "wbbseRollNo" } as any,
      2025
    );
    expect(s).toMatchObject({ hasAadhaar: "No", aadhaar: "", boardRegistrationNo: "123", wbbseRegNo: "123", boardRollNo: "999", wbbseRollNo: "999" });
  });
});

describe("validateMappedRows", () => {
  it("flags missing names, duplicate PEN, duplicate Aadhaar and builds create/update actions", () => {
    const year = new Date().getFullYear() - 12;
    const dob = `${year}-01-01`;
    const { issues, previewRows } = validateMappedRows([
      { name: "A", dob, pen: "p1", aadhaar: "123456789012" },
      { name: "B", dob, pen: "P1", aadhaar: "123456789012" },
      { name: "", dob: "" },
    ] as any);

    expect(previewRows.map((r) => r.action)).toEqual(["update", "update", "create"]);
    expect(previewRows[0].rowNumber).toBe(2);
    expect(issues.find((i) => i.field === "pen" && i.severity === "error")?.row).toBe(3);
    expect(issues.find((i) => i.field === "aadhaar" && i.severity === "warning")?.row).toBe(3);
    expect(issues.find((i) => i.field === "name")?.row).toBe(4);
    expect(issues.find((i) => i.field === "dob" && i.row === 4)?.severity).toBe("warning");
    expect(previewRows[1].errors).toContain("Duplicate PEN");
    expect(previewRows[2].presentClass).toBe("V");
    expect(previewRows[2].name).toBe("Unknown");
  });

  it("warns about implausible age and an over-age Class V student", () => {
    const old = `${new Date().getFullYear() - 18}-01-01`;
    const { issues } = validateMappedRows([{ name: "A", dob: old, presentClass: "V" }] as any);
    expect(issues.some((i) => i.field === "presentClass")).toBe(true);
    expect(issues.some((i) => i.field === "dob")).toBe(false);
  });
});

describe("result mapping", () => {
  it("auto-suggests exam headers, with Full Marks winning over Marks", () => {
    const m = autoSuggestResultMapping(["Student Name", "Roll No", "Full Marks", "Total Marks", "Bengali", "Mystery"]);
    expect(m["Student Name"]).toBe("name");
    expect(m["Roll No"]).toBe("presentRoll");
    expect(m["Full Marks"]).toBe("fullMarks");
    expect(m["Bengali"]).toBe("bengali");
    expect(m["Mystery"]).toBe("ignore");
  });

  it("sums subject marks, recalculates percentage and drops a per-subject full mark", () => {
    const [r] = applyResultMapping(
      [{ B: "80", E: "70", F: "100", Roll: "7" }],
      { B: "bengali", E: "english", F: "fullMarks", Roll: "presentRoll" },
      2026,
      "Final"
    );
    expect(r.subjectMarks).toEqual({ Bengali: 80, English: 70 });
    expect(r.marksObtained).toBe(150);
    expect(r.fullMarks).toBeUndefined();
    expect(r.presentRoll).toBe(7);
    expect(r.academicYear).toBe(2026);
    expect(r.examName).toBe("Final");
  });

  it("computes percentage from explicit marks and full marks", () => {
    const [r] = applyResultMapping([{ M: "45", F: "60" }], { M: "marksObtained", F: "fullMarks" }, 2026);
    expect(r.percentage).toBe(75);
    expect(r.examName).toBe("1st Summative Evaluation");
  });

  it("validates identifiers, marks and the marks > full marks warning", () => {
    const { issues, previewRows } = validateResultRows([
      { name: "A", marksObtained: 50, fullMarks: 40, academicYear: 2026, examName: "X", schoolId: "S1" },
      { name: "B", marksObtained: 10, academicYear: 2026, examName: "X" },
    ] as any);
    expect(issues.find((i) => i.row === 2)?.severity).toBe("warning");
    expect(issues.find((i) => i.row === 3)?.field).toBe("schoolId");
    expect(previewRows[1].errors).toContain("Missing Identifier");
  });
});
