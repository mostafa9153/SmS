import { describe, expect, it } from "vitest";
import { autoBuildRoutineAssignmentsWithReport } from "@/lib/routine/routine-auto-assign";
import {
  calculateTeacherConfiguredLoads,
  dropEmptyClasses,
  isTeacherAssignedToSubject,
  isTeacherQualifiedForSubject,
} from "@/lib/routine/routine-helpers";
import { countRunIssues } from "@/components/routine/routine-run-issues";
import type { RoutineClass, RoutineSubject, RoutineTeacher } from "@/lib/routine/types";

const teacher = (over: Partial<RoutineTeacher>): RoutineTeacher => ({
  id: over.id || "t1",
  name: over.name || "Teacher",
  shortName: "T",
  maxPeriods: 24,
  availableSlots: {},
  ...over,
});

const classes: RoutineClass[] = [
  { id: "c-a", className: "Class VI", section: "A" },
  { id: "c-b", className: "Class VI", section: "B" },
];
const subjects: RoutineSubject[] = [
  { id: "s-math", name: "Mathematics", className: "Class VI", periodsPerWeek: 6 } as RoutineSubject,
  { id: "s-bng", name: "Bengali", className: "Class VI", periodsPerWeek: 5 } as RoutineSubject,
];

const mathInA = teacher({
  id: "math",
  name: "Math Teacher",
  qualifiedClasses: ["Class VI"],
  classSections: { "Class VI": ["A"] },
  sectionSubjects: { "Class VI::A": ["Mathematics"] },
  classSubjects: { "Class VI": ["Mathematics"] },
});
const blank = teacher({ id: "blank", name: "New Teacher" });

describe("teacher subject rule", () => {
  it("a teacher with no classes ticked teaches nothing", () => {
    expect(isTeacherAssignedToSubject(blank, "Class VI", "A", "Mathematics")).toBe(false);
    expect(isTeacherQualifiedForSubject(blank, "Class VI", "Mathematics")).toBe(false);
  });

  it("a class ticked with no subjects teaches nothing", () => {
    const t = teacher({ qualifiedClasses: ["Class VI"], classSubjects: { "Class VI": [] } });
    expect(isTeacherAssignedToSubject(t, "Class VI", "A", "Bengali")).toBe(false);
    expect(isTeacherQualifiedForSubject(t, "Class VI", "Bengali")).toBe(false);
  });

  it("only the ticked subject in the ticked section", () => {
    expect(isTeacherAssignedToSubject(mathInA, "Class VI", "A", "Mathematics")).toBe(true);
    expect(isTeacherAssignedToSubject(mathInA, "Class VI", "B", "Mathematics")).toBe(false);
    expect(isTeacherAssignedToSubject(mathInA, "Class VI", "A", "Bengali")).toBe(false);
  });

  it("theory/lab variants count as the same subject", () => {
    const t = teacher({
      qualifiedClasses: ["Class VI"],
      sectionSubjects: { "Class VI::A": ["Mathematics (Theory)"] },
    });
    expect(isTeacherAssignedToSubject(t, "Class VI", "A", "Mathematics")).toBe(true);
  });
});

describe("auto-assign never guesses a teacher", () => {
  it("leaves unticked subjects unstaffed instead of giving them to the least-loaded teacher", () => {
    const r = autoBuildRoutineAssignmentsWithReport(classes, subjects, [mathInA, blank]);
    expect(r.assignments).toEqual([
      expect.objectContaining({ classId: "c-a", subjectId: "s-math", teacherId: "math", periodsPerWeek: 6 }),
    ]);
    expect(r.assignments.some((a) => a.teacherId === "blank")).toBe(false);
    expect(r.unstaffed.map((u) => `${u.section} ${u.subjectName}`).sort()).toEqual([
      "A Bengali",
      "B Bengali",
      "B Mathematics",
    ]);
  });
});

describe("split theory/lab subjects", () => {
  it("a lab-only teacher does not get the theory periods", () => {
    const phy = { id: "s-phy", name: "Physics", className: "Class VI", isLab: true, periodsPerWeek: 6, theoryPeriods: 4, labPeriods: 2 } as RoutineSubject;
    const labOnly = teacher({ id: "lab", qualifiedClasses: ["Class VI"], sectionSubjects: { "Class VI::A": ["Physics (Lab)"] } });
    const r = autoBuildRoutineAssignmentsWithReport([classes[0]], [phy], [labOnly]);
    expect(r.assignments).toEqual([expect.objectContaining({ teacherId: "lab", isLab: true, periodsPerWeek: 2 })]);
    expect(r.unstaffed).toEqual([expect.objectContaining({ subjectName: "Physics (Theory)", periods: 4 })]);
  });
});

describe("dropEmptyClasses", () => {
  it("removes a class with nothing ticked but keeps one held for a group", () => {
    const t = teacher({
      qualifiedClasses: ["Class V", "Class XI", "Class XII"],
      classSubjects: { "Class V": ["Mathematics"], "Class XI": [], "Class XII": [] },
      sectionSubjects: { "Class V::A": ["Mathematics"], "Class XI::A": [], "Class XII::A": [] },
      classSections: { "Class V": ["A"], "Class XI": ["A"], "Class XII": ["A"] },
      subjectPeriods: { "Class V::A::Mathematics": 2, "Class XI::A::History": 3 },
    });
    const out = dropEmptyClasses(t, new Set(["Class XII"]));
    expect(out.qualifiedClasses).toEqual(["Class V", "Class XII"]);
    expect(Object.keys(out.sectionSubjects || {})).toEqual(["Class V::A", "Class XII::A"]);
    expect(out.subjectPeriods).toEqual({ "Class V::A::Mathematics": 2 });
  });
});

describe("teacher load", () => {
  it("counts only ticked subjects in real sections", () => {
    const loads = calculateTeacherConfiguredLoads([mathInA, blank], classes, subjects);
    expect(loads.get("math")).toBe(6);
    expect(loads.get("blank")).toBe(0);
  });
});

describe("history issue count", () => {
  it("adds broken-rule cases and setup warnings", () => {
    expect(countRunIssues(undefined)).toBe(0);
    expect(
      countRunIssues({
        relaxations: [{ rule: "fatigue", title: "Fatigue", count: 3, details: ["a", "b", "c"] }],
        setupWarnings: ["x"],
      })
    ).toBe(4);
  });
});
