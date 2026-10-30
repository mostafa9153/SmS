import { describe, it, expect } from "vitest";
import { calculateAllotmentGaps } from "@/lib/routine/allotment-gaps";
import type { RoutineClass, RoutineSubject, RoutineTeacher, RoutineSubjectGroup } from "@/lib/routine/types";

const cls = { id: "c1", className: "Class VII", section: "A" } as RoutineClass;
const sub = (id: string, name: string, p: number) =>
  ({ id, name, className: "Class VII", periodsPerWeek: p }) as RoutineSubject;
const teacher = (id: string, subs: string[], periods: number) =>
  ({
    id,
    name: id,
    classes: ["Class VII"],
    classSections: { "Class VII": ["A"] },
    sectionSubjects: { "Class VII-A": subs },
    subjectPeriods: Object.fromEntries(subs.map((s) => [`Class VII-A-${s}`, periods])),
  }) as unknown as RoutineTeacher;

describe("calculateAllotmentGaps", () => {
  it("reports unassigned subjects and skips matched ones", () => {
    const rows = calculateAllotmentGaps([teacher("t1", ["Math"], 5)], [cls], [sub("s1", "Math", 5), sub("s2", "Science", 5)]);
    expect(rows.map((r) => [r.subject, r.demand, r.allotted])).toEqual([["Science", 5, 0]]);
  });

  it("flags a group with an unstaffed option", () => {
    const g = {
      id: "g1", name: "3rd", scope: "section", sectionIds: ["c1"], pooled: false, periodsPerWeek: 3, periodSize: 1,
      options: [{ id: "o1", groupId: "g1", subjectId: "s1", teacherId: "t1" }, { id: "o2", groupId: "g1", subjectId: "s2", teacherId: "" }],
    } as unknown as RoutineSubjectGroup;
    const rows = calculateAllotmentGaps([], [cls], [sub("s1", "Sanskrit", 3), sub("s2", "Arabic", 3)], [g]);
    expect(rows).toHaveLength(1);
    expect(rows[0].isGroup).toBe(true);
    expect(rows[0].unstaffed).toEqual(["Arabic"]);
  });
});
