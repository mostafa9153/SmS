import { describe, it, expect } from "vitest";
import { buildSolverGroups, deriveCombinedCommonGroups } from "@/lib/routine/routine-groups";
import type { RoutineClass, RoutineSubject, RoutineTeacher } from "@/lib/routine/types";

const classes: RoutineClass[] = [
  { id: "s", className: "Class XI", section: "A (Science)" },
  { id: "a", className: "Class XI", section: "A (Arts)" },
  { id: "c", className: "Class XI", section: "A (Commerce)" },
];
const subj = (id: string, name: string, stream: string): RoutineSubject => ({
  id, name, className: "Class XI", stream, isHard: false, isLab: false, timePref: "any",
  allowMultiplePerDay: false, periodsPerWeek: 6,
});
const subjects = [subj("ben", "Bengali (1st Language)", "Common"), subj("phy", "Physics", "Science")];
const teacher = (id: string, sections: string[]): RoutineTeacher =>
  ({
    id, name: id,
    sectionSubjects: Object.fromEntries(sections.map((s) => [`Class XI::${s}`, ["Bengali (1st Language)"]])),
  }) as RoutineTeacher;

describe("combined Common subjects", () => {
  it("one teacher in every stream section: one combined block over all three sections", () => {
    const out = deriveCombinedCommonGroups(classes, subjects, [teacher("t1", ["A (Science)", "A (Arts)", "A (Commerce)"])]);
    expect(out).toHaveLength(1);
    expect(out[0].combined).toBe(true);
    expect(out[0].sectionIds.sort()).toEqual(["a", "c", "s"]);
    expect(out[0].options.map((o) => o.teacherId)).toEqual(["t1"]);
    // reaches the solver as a single pooled unit
    expect(buildSolverGroups(out)).toHaveLength(1);
  });

  it("ticked in one stream section only: still covers all three", () => {
    const out = deriveCombinedCommonGroups(classes, subjects, [teacher("t1", ["A (Arts)"])]);
    expect(out).toHaveLength(1);
    expect(out[0].sectionIds.sort()).toEqual(["a", "c", "s"]);
    expect(out[0].periodsPerWeek).toBe(6);
  });

  it("teachers sharing it: one block each, sized by their own periods", () => {
    const share = (id: string, p: number) =>
      ({ ...teacher(id, ["A (Arts)"]), subjectPeriods: { "Class XI::A (Arts)::Bengali (1st Language)": p } }) as RoutineTeacher;
    const out = deriveCombinedCommonGroups(classes, subjects, [share("dk", 2), share("td", 4)]);
    expect(out.map((g) => [g.options[0].teacherId, g.periodsPerWeek, g.sectionIds.length])).toEqual([
      ["dk", 2, 3],
      ["td", 4, 3],
    ]);
    expect(new Set(out.map((g) => g.id)).size).toBe(2);
  });

  it("different teachers per section: stays separate", () => {
    const out = deriveCombinedCommonGroups(classes, subjects, [
      teacher("t1", ["A (Science)", "A (Arts)"]),
      teacher("t2", ["A (Commerce)"]),
    ]);
    expect(out).toHaveLength(0);
  });

  it("a stream subject is never combined", () => {
    const out = deriveCombinedCommonGroups(classes, [subj("ben", "Bengali (1st Language)", "Science")], [
      teacher("t1", ["A (Science)", "A (Arts)", "A (Commerce)"]),
    ]);
    expect(out).toHaveLength(0);
  });
});
