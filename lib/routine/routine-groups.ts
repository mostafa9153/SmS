import {
  RoutineAssignment,
  RoutineCellData,
  RoutineClass,
  RoutineSubject,
  RoutineSubjectGroup,
  RoutineTeacher,
} from "./types";

// ============================================================
// Subject Group helpers — single source of truth.
//
// A subject group (also called an "elective block" or "parallel
// options block") places two or more parallel options in the same
// slot across one or more sections.
//
// A subject that is listed as an option in any group of a class
// MUST NOT also be counted in that class's ordinary subject demand
// or in auto-assignment, and must be counted ONCE for group-capacity
// purposes, regardless of how many sections share the group.
// ============================================================

/**
 * Groups that apply to a given class (sectionIds includes it).
 */
export function getGroupsForClass(
  classId: string,
  groups: RoutineSubjectGroup[]
): RoutineSubjectGroup[] {
  if (!groups || groups.length === 0) return [];
  return groups.filter((g) => g.sectionIds.includes(classId));
}

/**
 * Subjects that are already represented as a parallel option inside
 * one of this class's groups. These should NOT be counted again in
 * ordinary demand/auto-assignment.
 */
export function getGroupedSubjectIds(
  classId: string,
  groups: RoutineSubjectGroup[]
): Set<string> {
  const out = new Set<string>();
  for (const g of getGroupsForClass(classId, groups)) {
    for (const opt of g.options) {
      out.add(opt.subjectId);
    }
  }
  return out;
}

export interface ClassGroupAllotment {
  group: RoutineSubjectGroup;
  periods: number;
  options: { subjectId: string; subjectName: string; teacher: RoutineTeacher | null }[];
  /** every option has a teacher, so the group's slot is fully staffed */
  complete: boolean;
}

/**
 * Per-class view of a group's allotment: the group's slot cost counted once,
 * with the teacher of each parallel option. The group is the single source of
 * truth for these subjects, never the teacher profiles.
 */
export function getClassGroupAllotments(
  classId: string,
  groups: RoutineSubjectGroup[],
  subjects: RoutineSubject[],
  teachers: RoutineTeacher[]
): ClassGroupAllotment[] {
  return getGroupsForClass(classId, groups).map((g) => {
    const options = g.options.map((o) => ({
      subjectId: o.subjectId,
      subjectName: subjects.find((s) => s.id === o.subjectId)?.name || "Subject",
      teacher: teachers.find((t) => t.id === o.teacherId) || null,
    }));
    return {
      group: g,
      periods: groupSlotCost(g),
      options,
      complete: options.length > 0 && options.every((o) => o.teacher),
    };
  });
}

/**
 * Weekly slot cost a group adds to each of its member sections' routines.
 * One group period = `periodsPerWeek * periodSize` cells inside the grid.
 */
export function groupSlotCost(group: RoutineSubjectGroup): number {
  return Math.max(0, group.periodsPerWeek) * (group.periodSize === 2 ? 2 : 1);
}

/**
 * Teacher load (periods/week) contributed by group options.
 * Each option-teacher gets a single teaching unit per group period,
 * regardless of whether the group spans many sections (pool).
 * For non-pooled groups the solver splits each option into one unit per
 * section, so the per-teacher cost scales with sectionIds.length.
 */
export function teacherGroupLoad(
  teacherId: string,
  groups: RoutineSubjectGroup[]
): number {
  let total = 0;
  for (const g of groups || []) {
    const perSlotLoad = g.options.filter((o) => o.teacherId === teacherId).length;
    if (perSlotLoad === 0) continue;
    const slots = groupSlotCost(g);
    const multiplier = g.pooled ? 1 : Math.max(1, g.sectionIds.length);
    total += perSlotLoad * slots * multiplier;
  }
  return total;
}

/**
 * Classes an option subject originally "belongs to" (via its className).
 * We can't fully trust group.className because scope='section' groups
 * can mix classes; however for ordinary-demand filtering we only use
 * `getGroupedSubjectIds(classId, groups)`, which is per-section already.
 */
export function getCellOptions(cell: RoutineCellData | null | undefined) {
  if (!cell) return [] as Array<{ sid: string; tid: string; rid?: string | null }>;
  if (cell.opts && cell.opts.length > 0) return cell.opts;
  // Legacy single-option cell: treat as a one-option "group".
  return [{ sid: cell.sid, tid: cell.tid, rid: cell.rid ?? null }];
}

export function cellHasTeacher(cell: RoutineCellData | null | undefined, tid: string): boolean {
  if (!cell) return false;
  if (!cell.opts) return cell.tid === tid;
  return cell.opts.some((o) => o.tid === tid);
}

export function cellHasRoom(cell: RoutineCellData | null | undefined, rid: string): boolean {
  if (!cell) return false;
  if (!cell.opts) return (cell.rid || null) === rid;
  return cell.opts.some((o) => (o.rid || null) === rid);
}

export interface GroupValidationIssue {
  groupId: string;
  groupName: string;
  severity: "error" | "warning";
  message: string;
}

/**
 * Structural checks on a group list. Does NOT touch the solver —
 * only guards against obviously-broken configurations:
 *   - a group with fewer than 2 options
 *   - a group with no member sections
 *   - the same teacher appearing twice inside one group
 *   - an option subject that is also assigned the ordinary way to
 *     the same class (duplication risk)
 *   - a group option referring to a subject/teacher/room that no
 *     longer exists in the catalog (dangling after a stale cache)
 */
export function validateGroups(args: {
  groups: RoutineSubjectGroup[];
  assignments: RoutineAssignment[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  classes: RoutineClass[];
}): GroupValidationIssue[] {
  const { groups, assignments, subjects, teachers, classes } = args;
  const issues: GroupValidationIssue[] = [];
  const subjectIds = new Set(subjects.map((s) => s.id));
  const teacherIds = new Set(teachers.map((t) => t.id));
  const classIds = new Set(classes.map((c) => c.id));

  for (const g of groups) {
    if (g.options.length < 2) {
      issues.push({
        groupId: g.id,
        groupName: g.name,
        severity: "error",
        message: "Group needs at least 2 parallel options.",
      });
    }
    if (g.sectionIds.length === 0) {
      issues.push({
        groupId: g.id,
        groupName: g.name,
        severity: "error",
        message: "Group has no member sections.",
      });
    }

    const seenTeachers = new Set<string>();
    for (const opt of g.options) {
      if (!subjectIds.has(opt.subjectId)) {
        issues.push({
          groupId: g.id,
          groupName: g.name,
          severity: "error",
          message: `Option refers to a deleted subject (id ${opt.subjectId}).`,
        });
      }
      if (!teacherIds.has(opt.teacherId)) {
        issues.push({
          groupId: g.id,
          groupName: g.name,
          severity: "error",
          message: `Option refers to a deleted teacher (id ${opt.teacherId}).`,
        });
      }
      if (seenTeachers.has(opt.teacherId)) {
        issues.push({
          groupId: g.id,
          groupName: g.name,
          severity: "error",
          message: "The same teacher is listed twice in this group — a teacher can only run one option.",
        });
      }
      seenTeachers.add(opt.teacherId);
    }

    // Dangling member sections
    for (const sid of g.sectionIds) {
      if (!classIds.has(sid)) {
        issues.push({
          groupId: g.id,
          groupName: g.name,
          severity: "warning",
          message: `Group references a section that no longer exists (id ${sid}).`,
        });
      }
    }

    // Duplication with ordinary assignments
    for (const sid of g.sectionIds) {
      for (const opt of g.options) {
        const dup = assignments.find(
          (a) => a.classId === sid && a.subjectId === opt.subjectId
        );
        if (dup) {
          issues.push({
            groupId: g.id,
            groupName: g.name,
            severity: "warning",
            message:
              "An option subject is also assigned the ordinary way to a member section — it will be removed from the ordinary demand.",
          });
          break;
        }
      }
    }
  }

  return issues;
}

/**
 * Subjects effectively taught to a class as ORDINARY (non-group) periods.
 * All four stream-filter copy-paste sites across the codebase should route
 * through this helper so filtering stays consistent and never double-counts
 * a group option.
 */
export function filterOutGroupedSubjects(
  classId: string,
  subjects: RoutineSubject[],
  groups: RoutineSubjectGroup[]
): RoutineSubject[] {
  if (!groups || groups.length === 0) return subjects;
  const grouped = getGroupedSubjectIds(classId, groups);
  if (grouped.size === 0) return subjects;
  return subjects.filter((s) => !grouped.has(s.id));
}

/**
 * For solver / payload construction: flatten groups into solver-ready
 * records. The solver sees only classIds[] + options and does not know
 * about scope. Non-pooled groups are expanded into one record per section.
 */
export interface SolverGroupPayload {
  gid: string;
  name: string;
  classIds: string[];
  periodsPerWeek: number;
  periodSize: 1 | 2;
  timePref: "any" | "morning" | "afternoon";
  maxPerDay?: number | null;
  options: Array<{ subjectId: string; teacherId: string; roomId?: string | null }>;
}

export function buildSolverGroups(groups: RoutineSubjectGroup[]): SolverGroupPayload[] {
  const out: SolverGroupPayload[] = [];
  for (const g of groups) {
    if (g.sectionIds.length === 0 || g.options.length < 2) continue;
    const opts = g.options.map((o) => ({
      subjectId: o.subjectId,
      teacherId: o.teacherId,
      roomId: o.roomId ?? null,
    }));

    if (g.pooled || g.sectionIds.length === 1) {
      out.push({
        gid: g.id,
        name: g.name,
        classIds: [...g.sectionIds],
        periodsPerWeek: g.periodsPerWeek,
        periodSize: g.periodSize,
        timePref: g.timePref,
        maxPerDay: g.maxPerDay ?? null,
        options: opts,
      });
    } else {
      // Non-pooled: each section schedules the same template independently.
      // Use "<gid>::<sid>" so each unit carries a unique solver id while
      // the viewer/exports can map back to the originating group via gid.
      for (const cid of g.sectionIds) {
        out.push({
          gid: `${g.id}::${cid}`,
          name: g.name,
          classIds: [cid],
          periodsPerWeek: g.periodsPerWeek,
          periodSize: g.periodSize,
          timePref: g.timePref,
          maxPerDay: g.maxPerDay ?? null,
          options: opts,
        });
      }
    }
  }
  return out;
}
