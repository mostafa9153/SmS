import { describe, it, expect } from "vitest";
import { calculateSchoolGroupDemand, groupExtraPeriods, groupTotalPeriods } from "@/lib/routine/routine-helpers";

const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ subjectId: `s${i}` }));
const g = (scope: string, sections: number, n: number, p = 5) => ({
  scope, sectionIds: Array.from({ length: sections }, (_, i) => `c${i}`), options: opts(n), periodsPerWeek: p, periodSize: 1 as const,
});

describe("group demand", () => {
  it("class-wise group in one section: one teacher period per option", () => {
    const x = g("class", 1, 2);
    expect(groupTotalPeriods(x)).toBe(10);
    expect(groupExtraPeriods(x)).toBe(5);
    expect(calculateSchoolGroupDemand([x])).toEqual({ slots: 5, extra: 5 });
  });
  it("section-wise group repeats per section", () => {
    const x = g("section", 2, 2, 3);
    expect(groupTotalPeriods(x)).toBe(12);
    expect(groupExtraPeriods(x)).toBe(3);
    expect(calculateSchoolGroupDemand([x])).toEqual({ slots: 6, extra: 6 });
  });
});
