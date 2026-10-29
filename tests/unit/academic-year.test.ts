import { describe, expect, it } from "vitest";
import { currentYearIST, sessionLabel, sessionYears } from "@/lib/utils/academic-year";

describe("academic year helpers", () => {
  it("uses the IST calendar year", () => {
    // 31 Dec 2026 20:00 UTC is already 1 Jan 2027 in IST
    expect(currentYearIST(new Date("2026-12-31T20:00:00Z"))).toBe(2027);
  });

  it("builds dropdown years newest first", () => {
    expect(sessionYears(2027)).toEqual(["2027", "2026", "2025"]);
    expect(sessionYears("2027", 1, 1)).toEqual(["2028", "2027", "2026"]);
  });

  it("labels a session", () => {
    expect(sessionLabel(2026)).toBe("2026-27");
    expect(sessionLabel(2099)).toBe("2099-00");
  });
});
