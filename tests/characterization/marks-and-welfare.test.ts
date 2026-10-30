// Characterization tests: pin current behaviour before refactoring.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  calculateMarksheetTotals,
  calculateSubjectRow,
  getClassScheme,
  getSampleSubjectsForClass,
  getStandardSubjectsForClass,
  getWBBSEGrade,
  normalizeSubjectName,
} from "@/lib/utils/marksheet-calc";
import {
  computeSchemeTotals,
  DEFAULT_MARKS_SCHEMES,
  getDefaultHsSubjectMarks,
  isDefaultLabSubject,
  resolveExamSlot,
} from "@/lib/utils/marks-config";
import { evaluateStudentScholarships, isMinorityReligion, isMuslimStudent } from "@/lib/utils/welfare-logic";
import { formatDocumentNumber } from "@/lib/utils/document-sequence";
import { parseSectionAndStream, toSectionKey, toSubjectKey } from "@/lib/routine/routine-helpers";

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
});
afterAll(() => vi.useRealTimers());

describe("marksheet calc", () => {
  it("grade scale boundaries", () => {
    expect([-1, 0, 24.9, 25, 34.9, 35, 45, 60, 70, 80, 89.9, 90, 100, 101].map((p) => [p, getWBBSEGrade(p)])).toMatchSnapshot();
  });

  it("subject name normalization", () => {
    expect(
      ["bengali", "BENGALI (FL)", "English", "maths", "Mathematics", "Phy. Sc.", "life science", "hist", "geo", "  Work Edu  "].map(
        (s) => [s, normalizeSubjectName(s)],
      ),
    ).toMatchSnapshot();
  });

  it("class schemes and subject lists", () => {
    expect(
      CLASSES.map((c) => ({ c, scheme: getClassScheme(c), std: getStandardSubjectsForClass(c) })),
    ).toMatchSnapshot();
  });

  it("subject rows and totals", () => {
    const rows = getSampleSubjectsForClass("IX").map((r) => calculateSubjectRow(r));
    expect(rows).toMatchSnapshot();
    expect(calculateMarksheetTotals(rows)).toMatchSnapshot();
    expect(calculateMarksheetTotals([])).toMatchSnapshot();
  });
});

describe("marks config", () => {
  it("defaults", () => {
    expect(DEFAULT_MARKS_SCHEMES.map((s) => computeSchemeTotals(s))).toMatchSnapshot();
    expect(["Physics", "Chemistry", "Biology", "Computer Science", "English", "Bengali"].map((s) => [s, isDefaultLabSubject(s), getDefaultHsSubjectMarks(s)])).toMatchSnapshot();
    expect(["1st Summative", "Second Unit", "Annual", "Final", "", undefined].map((e) => resolveExamSlot(e))).toMatchSnapshot();
  });
});

describe("welfare", () => {
  it("religion helpers", () => {
    expect(
      [["Muslim", null], ["Hindu", null], ["Christian", null], ["Hindu", "Sikh"], [null, null]].map(([r, m]) => [
        isMinorityReligion(r, m),
        isMuslimStudent(r, m),
      ]),
    ).toMatchSnapshot();
  });

  it("scholarship eligibility", () => {
    const inputs = [
      { gender: "Female", dob: "2012-03-01", presentClass: "IX", socialCategory: "SC", religion: "Hindu", previousMarksPercent: 72 },
      { gender: "Female", dob: "2008-03-01", presentClass: "XI", socialCategory: "General", religion: "Muslim", previousMarksPercent: 85 },
      { gender: "Male", dob: "2011-01-01", presentClass: "VII", socialCategory: "OBC-A", religion: "Muslim", previousMarksPercent: 40 },
      { gender: "Male", dob: "2009-01-01", presentClass: "XII", socialCategory: "ST", religion: "Christian", isCwsn: true, hasDisabilityCertificate: true },
      {},
    ];
    expect(inputs.map((i) => evaluateStudentScholarships(i))).toMatchSnapshot();
  });
});

describe("document numbers", () => {
  it("formats", () => {
    const types = ["transfer-certificate", "kanyashree", "admission-form", "certificate", "pass-certificate"] as const;
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      types.map((t) => { try { return formatDocumentNumber(t as any, 7, 2026, "MHS"); } catch (e) { return `throws: ${(e as Error).message}`; } }),
    ).toMatchSnapshot();
  });
});

describe("routine helpers", () => {
  it("keys and section parsing", () => {
    expect([toSectionKey("IX", "A"), toSectionKey("xi", "Science")]).toMatchSnapshot();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((toSubjectKey as any)("IX", "A", "Bengali")).toMatchSnapshot();
    expect(["A", "A (Science)", "B-Arts", "Commerce", "", "XI A Science"].map((s) => parseSectionAndStream(s))).toMatchSnapshot();
  });
});
