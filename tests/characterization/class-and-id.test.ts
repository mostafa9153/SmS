// Characterization tests: pin current behaviour before refactoring.
// Snapshots record what the code does today, not what it "should" do.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  CLASS_LADDER,
  classVariations,
  getAllowedTargetClasses,
  getNextClass,
  isExitStatus,
  isLegalClassTransition,
  normalizeClass,
} from "@/lib/academic/class-ladder";
import {
  calculateDetailedAge,
  calculateExactAge,
  compareStudentsByClassAndRoll,
  formatAadhaar,
  getClassRank,
  getKanyashreeCategory,
  maskAadhaar,
  normalizeClassName,
  sortClasses,
} from "@/lib/utils";
import {
  buildSchoolId,
  formatRegisterNo,
  formatRollNo,
  normalizeClassForId,
  parseSchoolId,
} from "@/lib/utils/school-id";
import { CLASS_NEXT, AUTO_PASS_CLASSES } from "@/lib/supabase/db-academic-session";

const CLASS_INPUTS = ["V", "v", "5", 5, "Class VIII", "ix", "10", "XI", "12", "XIII", "", null, undefined, "abc"] as const;

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
});
afterAll(() => vi.useRealTimers());

describe("class ladder", () => {
  it("normalizes and steps classes", () => {
    const table = CLASS_INPUTS.map((v) => ({
      input: v,
      normalized: normalizeClass(v),
      next: getNextClass(v),
      allowed: getAllowedTargetClasses(v),
      variations: classVariations(v),
    }));
    expect(table).toMatchSnapshot();
  });

  it("transition legality matrix", () => {
    const matrix = CLASS_LADDER.flatMap((from) =>
      CLASS_LADDER.map((to) => `${from}->${to}:${isLegalClassTransition(from, to) ? 1 : 0}`),
    );
    expect(matrix).toMatchSnapshot();
  });

  it("exit statuses", () => {
    expect(
      ["Passed Out", "TC Out", "Sent Up M.P.", "Sent Up H.S.", "Active", "", null].map((s) => isExitStatus(s)),
    ).toMatchSnapshot();
  });

  it("promotion map constants", () => {
    expect({ CLASS_NEXT, AUTO_PASS: [...AUTO_PASS_CLASSES] }).toMatchSnapshot();
  });
});

describe("lib/utils class helpers", () => {
  it("normalizeClassName / getClassRank", () => {
    expect(
      CLASS_INPUTS.filter((v) => typeof v !== "number").map((v) => [
        v,
        normalizeClassName(v as string),
        getClassRank(v as string),
      ]),
    ).toMatchSnapshot();
  });

  it("sortClasses", () => {
    expect(sortClasses(["XII", "V", "IX", "x", "VII", "XI", "Other"])).toMatchSnapshot();
  });

  it("compareStudentsByClassAndRoll", () => {
    const students = [
      { class: "IX", roll_no: 3, section: "B" },
      { class: "V", roll_no: 10, section: "A" },
      { class: "IX", roll_no: 1, section: "A" },
      { class: "V", roll_no: 2, section: "A" },
      { class: "XI", roll_no: null, section: "A" },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect([...students].sort(compareStudentsByClassAndRoll as any)).toMatchSnapshot();
  });

  it("aadhaar formatting", () => {
    expect(["123456789012", "1234", "", null, undefined].map((a) => maskAadhaar(a))).toMatchSnapshot();
    expect(formatAadhaar("123456789012")).toMatchSnapshot();
  });

  it("age and kanyashree category (system date 2026-06-15)", () => {
    const dobs = ["2010-06-15", "2010-06-16", "2008-01-01", "2013-12-31", "", null, "bad"];
    expect(
      dobs.map((d) => ({
        d,
        exact: calculateExactAge(d),
        detailed: calculateDetailedAge(d),
        kf: getKanyashreeCategory({ gender: "Female", dob: d }),
        km: getKanyashreeCategory({ gender: "Male", dob: d }),
      })),
    ).toMatchSnapshot();
  });
});

describe("school id", () => {
  it("builds and formats ids", () => {
    expect([
      buildSchoolId("V", 2026, 1),
      buildSchoolId("Class IX", "2025", "7", "ABC"),
      buildSchoolId("12", 2024, 123),
      formatRegisterNo(5),
      formatRegisterNo("0012"),
      formatRollNo(3),
      formatRollNo(""),
      ...CLASS_INPUTS.filter((c) => typeof c !== "number").map((c) => normalizeClassForId(c as string)),
    ]).toMatchSnapshot();
  });

  it("parses ids including legacy formats", () => {
    expect(
      ["MHS/V/2026/01", "ABC/IX/2025/07", "MHS-V-A-12", "garbage", ""].map((v) => parseSchoolId(v)),
    ).toMatchSnapshot();
  });
});
