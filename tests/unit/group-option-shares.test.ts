import { describe, it, expect } from "vitest";
import { optionShares, packShares, teacherPeriodsInGroup, isOptionStaffed } from "@/lib/routine/routine-helpers";
import { buildSolverGroups, isGroupStaffed, splitSharedGroup, validateGroups } from "@/lib/routine/routine-groups";
import type { RoutineSubjectGroup } from "@/lib/routine/types";

const group = (over: Partial<RoutineSubjectGroup> = {}): RoutineSubjectGroup => ({
  id: "g",
  name: "Pol Sc / Sociology",
  scope: "class",
  className: "Class XI",
  pooled: true,
  periodsPerWeek: 5,
  periodSize: 1,
  timePref: "any",
  sectionIds: ["xi-a-arts"],
  options: [
    { id: "pol", groupId: "g", subjectId: "pol", teacherId: "SM", shares: [{ teacherId: "SM", periods: 3 }, { teacherId: "XY", periods: 2 }] },
    { id: "soc", groupId: "g", subjectId: "soc", teacherId: "SG" },
  ],
  ...over,
});

describe("group subject shares", () => {
  it("one teacher without shares takes every period", () => {
    expect(optionShares({ teacherId: "SG" }, { periodsPerWeek: 5, periodSize: 1 })).toEqual([{ teacherId: "SG", periods: 5 }]);
    expect(optionShares({ teacherId: "" }, { periodsPerWeek: 5, periodSize: 1 })).toEqual([]);
  });

  it("shares beyond the group's periods are cut off, a double period is never split", () => {
    const o = { teacherId: "A", shares: [{ teacherId: "A", periods: 4 }, { teacherId: "B", periods: 4 }] };
    expect(optionShares(o, { periodsPerWeek: 5, periodSize: 1 })).toEqual([{ teacherId: "A", periods: 4 }, { teacherId: "B", periods: 1 }]);
    expect(optionShares(o, { periodsPerWeek: 2, periodSize: 2 })).toEqual([{ teacherId: "A", periods: 2 }]);
  });

  it("a subject is staffed only when its shares cover the group", () => {
    const g = { periodsPerWeek: 5, periodSize: 1 as const };
    expect(isOptionStaffed({ teacherId: "A", shares: [{ teacherId: "A", periods: 3 }] }, g)).toBe(false);
    expect(isOptionStaffed({ teacherId: "A", shares: [{ teacherId: "A", periods: 3 }, { teacherId: "B", periods: 2 }] }, g)).toBe(true);
    expect(isGroupStaffed(group({ options: [{ ...group().options[0], shares: [{ teacherId: "SM", periods: 3 }] }, group().options[1]] }))).toBe(false);
  });

  it("packs one full teacher back into the old shape", () => {
    expect(packShares([{ teacherId: "A", periods: 5 }], 5)).toEqual({ teacherId: "A", shares: null });
    expect(packShares([], 5)).toEqual({ teacherId: "", shares: null });
    expect(packShares([{ teacherId: "A", periods: 3 }, { teacherId: "B", periods: 2 }], 5)).toEqual({
      teacherId: "A",
      shares: [{ teacherId: "A", periods: 3 }, { teacherId: "B", periods: 2 }],
    });
  });

  it("each teacher's load is their own part, per section for a section-wise group", () => {
    expect(teacherPeriodsInGroup("SM", group())).toBe(3);
    expect(teacherPeriodsInGroup("XY", group())).toBe(2);
    expect(teacherPeriodsInGroup("SG", group())).toBe(5);
    expect(teacherPeriodsInGroup("XY", group({ scope: "section", pooled: false, sectionIds: ["a", "b"] }))).toBe(4);
  });
});

describe("solver: a shared group runs as parts with one teacher per subject", () => {
  it("SM 3 + XY 2 beside SG 5 → SM+SG for 3 periods, XY+SG for 2", () => {
    const parts = splitSharedGroup(group());
    expect(parts.map((p) => p.periodsPerWeek)).toEqual([3, 2]);
    expect(parts.map((p) => p.options.map((o) => o.teacherId))).toEqual([["SM", "SG"], ["XY", "SG"]]);
    const solver = buildSolverGroups([group()]);
    expect(solver.map((s) => s.gid)).toEqual(["g~0", "g~1"]);
    expect(solver.reduce((n, s) => n + s.periodsPerWeek, 0)).toBe(5);
  });

  it("two shared subjects cut at every teacher change", () => {
    const g = group({
      options: [
        { id: "pol", groupId: "g", subjectId: "pol", teacherId: "SM", shares: [{ teacherId: "SM", periods: 3 }, { teacherId: "XY", periods: 2 }] },
        { id: "soc", groupId: "g", subjectId: "soc", teacherId: "SG", shares: [{ teacherId: "SG", periods: 1 }, { teacherId: "RB", periods: 4 }] },
      ],
    });
    const parts = splitSharedGroup(g);
    expect(parts.map((p) => p.periodsPerWeek)).toEqual([1, 2, 2]);
    expect(parts.map((p) => p.options.map((o) => o.teacherId))).toEqual([["SM", "SG"], ["SM", "RB"], ["XY", "RB"]]);
  });

  it("a group without shares, or not fully staffed, reaches the solver as before", () => {
    const plain = group({ options: [{ id: "a", groupId: "g", subjectId: "a", teacherId: "A" }, { id: "b", groupId: "g", subjectId: "b", teacherId: "B" }] });
    expect(buildSolverGroups([plain]).map((s) => s.gid)).toEqual(["g"]);
    const partial = group({ options: [{ ...group().options[0], shares: [{ teacherId: "SM", periods: 3 }] }, group().options[1]] });
    expect(buildSolverGroups([partial])).toEqual([]);
  });

  it("sharing teachers of one subject are not flagged as one teacher in two subjects", () => {
    const issues = validateGroups({
      groups: [group()],
      assignments: [],
      subjects: [{ id: "pol" }, { id: "soc" }] as never,
      teachers: [{ id: "SM" }, { id: "XY" }, { id: "SG" }] as never,
      classes: [{ id: "xi-a-arts" }] as never,
    });
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });
});
