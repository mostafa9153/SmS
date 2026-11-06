import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_SETTINGS,
  normalizeHolidays,
  prefixProblem,
  settingsProblems,
  changedKeys,
  validateSettings,
  validateSettingsPatch,
  type LibrarySettings,
} from "@/lib/library/settings";
import { describeDiagnosis, diagnoseScan, showInvisible } from "@/lib/library/scan-code";

const base = (over: Partial<LibrarySettings> = {}): LibrarySettings => ({ ...DEFAULT_LIBRARY_SETTINGS, ...over });

describe("prefixProblem (C8)", () => {
  it("accepts 1-4 letters", () => {
    expect(prefixProblem("B")).toBeNull();
    expect(prefixProblem(" lib ")).toBeNull();
    expect(prefixProblem("ABCD")).toBeNull();
  });

  it("explains what is wrong", () => {
    expect(prefixProblem("")).toBe("Prefix লিখুন");
    expect(prefixProblem("B1")).toBe("শুধু ইংরেজি অক্ষর");
    expect(prefixProblem("B/")).toBe("শুধু ইংরেজি অক্ষর");
    expect(prefixProblem("ABCDE")).toBe("সর্বোচ্চ ৪টি অক্ষর");
  });
});

describe("settingsProblems", () => {
  it("is empty for the defaults", () => {
    expect(settingsProblems(DEFAULT_LIBRARY_SETTINGS)).toEqual({});
  });

  it("refuses a renew window longer than the loan", () => {
    const s = base({ student: { ...DEFAULT_LIBRARY_SETTINGS.student, loanDays: 7, renewWindowDays: 8 } });
    expect(settingsProblems(s)).toHaveProperty(["student.renewWindowDays"]);
  });

  it("flags a holiday that ends before it starts, by its position", () => {
    const s = base({
      holidays: [
        { from: "2026-10-01", to: "2026-10-02" },
        { from: "2026-11-10", to: "2026-11-05" },
      ],
    });
    expect(Object.keys(settingsProblems(s))).toEqual(["holidays.1"]);
  });

  it("flags a sticker grid that does not fit A4", () => {
    const s = base({ sticker: { ...DEFAULT_LIBRARY_SETTINGS.sticker, cols: 4 } });
    expect(settingsProblems(s).sticker).toMatch(/চওড়ায়/);
  });
});

describe("validateSettings", () => {
  it("accepts a complete valid object and sorts holidays", () => {
    const r = validateSettings({
      ...DEFAULT_LIBRARY_SETTINGS,
      holidays: [
        { from: "2026-12-25", to: "2026-12-25", label: "Christmas" },
        { from: "2026-10-20", to: "2026-10-24", label: "Puja" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.settings.holidays.map((h) => h.from)).toEqual(["2026-10-20", "2026-12-25"]);
  });

  it("upper-cases a valid prefix", () => {
    const r = validateSettings({ ...DEFAULT_LIBRARY_SETTINGS, codePrefix: "lib" });
    expect(r.ok && r.settings.codePrefix).toBe("LIB");
  });

  it("rejects bad values instead of defaulting them", () => {
    const r = validateSettings({ ...DEFAULT_LIBRARY_SETTINGS, finePerDay: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.finePerDay).toBeTruthy();
  });

  it("rejects an object with missing keys instead of filling defaults", () => {
    const r = validateSettings({ finePerDay: 3 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty("codePrefix");
  });

  it("rejects a non-object", () => {
    expect(validateSettings(null).ok).toBe(false);
  });

  it("allows an empty fine cap and block threshold (no limit)", () => {
    expect(validateSettings({ ...DEFAULT_LIBRARY_SETTINGS, fineCap: null, blockThreshold: null }).ok).toBe(true);
  });

  it("rejects a fractional day count", () => {
    const r = validateSettings({ ...DEFAULT_LIBRARY_SETTINGS, graceDays: 1.5 });
    expect(r.ok).toBe(false);
  });
});

describe("normalizeHolidays", () => {
  it("orders by start then end", () => {
    const sorted = normalizeHolidays([
      { from: "2026-11-02", to: "2026-11-05" },
      { from: "2026-11-02", to: "2026-11-03" },
      { from: "2026-10-01", to: "2026-10-01" },
    ]);
    expect(sorted.map((h) => `${h.from}/${h.to}`)).toEqual(["2026-10-01/2026-10-01", "2026-11-02/2026-11-03", "2026-11-02/2026-11-05"]);
  });
});

describe("showInvisible (Scanner test)", () => {
  it("shows line ends, tabs and spaces", () => {
    expect(showInvisible("AB 12\r\n")).toBe("AB[·]12[⏎CR][⏎LF]");
    expect(showInvisible("X\tY")).toBe("X[⇥Tab]Y");
  });

  it("shows zero-width and no-break characters by code", () => {
    expect(showInvisible("A​B")).toBe("A[U+200B]B");
    expect(showInvisible("A B")).toBe("A[U+00A0]B");
  });

  it("leaves ordinary characters alone, slashes included", () => {
    expect(showInvisible("SCH/2026/0142")).toBe("SCH/2026/0142");
  });
});

describe("describeDiagnosis", () => {
  it("says a match is a match", () => {
    expect(describeDiagnosis(diagnoseScan("sch/1", "SCH/1"))).toBe("মিলেছে");
  });

  it("names lost leading zeros", () => {
    expect(describeDiagnosis(diagnoseScan("123", "00123"))).toMatch(/শূন্য/);
  });

  it("points at the character a wrong keyboard layout changed", () => {
    const text = describeDiagnosis(diagnoseScan("SCH-2026", "SCH/2026"));
    expect(text).toContain("4 নম্বর");
    expect(text).toContain("layout");
  });

  it("reports a length mismatch", () => {
    expect(describeDiagnosis(diagnoseScan("SCH/20", "SCH/2026"))).toMatch(/কম বা বেশি/);
  });
});

describe("validateSettingsPatch / changedKeys", () => {
  it("merges only the changed keys onto the current rules", () => {
    const current = base({ finePerDay: 2, graceDays: 3 });
    const r = validateSettingsPatch(current, { graceDays: 5 });
    expect(r.ok && r.settings).toMatchObject({ finePerDay: 2, graceDays: 5 });
  });

  it("checks the merged result, not just the patch", () => {
    const current = base({ student: { ...DEFAULT_LIBRARY_SETTINGS.student, loanDays: 14, renewWindowDays: 3 } });
    const r = validateSettingsPatch(current, { student: { ...current.student, loanDays: 2 } });
    expect(r.ok).toBe(false);
  });

  it("refuses unknown keys and non-objects", () => {
    expect(validateSettingsPatch(base(), { nope: 1 }).ok).toBe(false);
    expect(validateSettingsPatch(base(), null).ok).toBe(false);
    expect(validateSettingsPatch(base(), [1]).ok).toBe(false);
  });

  it("lists the keys that differ", () => {
    const saved = base();
    expect(changedKeys(saved, { ...saved, finePerDay: 9, holidays: [{ from: "2026-10-01", to: "2026-10-01" }] })).toEqual({
      finePerDay: 9,
      holidays: [{ from: "2026-10-01", to: "2026-10-01" }],
    });
    expect(changedKeys(saved, { ...saved })).toEqual({});
  });
});
