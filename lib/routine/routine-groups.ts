import {
  RoutineAssignment,
  RoutineCellData,
  RoutineClass,
  RoutineSubject,
  RoutineSubjectGroup,
  RoutineTeacher,
} from "./types";
import {
  detectSubjectStream,
  getTeacherSubjectPeriod,
  isHsClass,
  isTeacherAssignedToSubject,
  normalizeSubjectName,
  isOptionStaffed,
  optionCovered,
  optionShares,
  optionTeacherIds,
  parseSectionAndStream,
  resolveIsCommon,
  teacherPeriodsInGroup,
} from "./routine-helpers";

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
function getGroupedSubjectIds(
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

/** Every group period of every option has a teacher: the group can be handed to the solver. */
export const isGroupStaffed = (g: RoutineSubjectGroup): boolean =>
  g.options.length > 0 && g.options.every((o) => isOptionStaffed(o, g));

/**
 * Period settings of a group come from its member subjects (Subjects tab), never from the group itself,
 * so editing a subject can never leave the group stale. Periods = the largest member load; time
 * preference = the first member that asks for one.
 */
export function withDerivedGroupSettings(
  groups: RoutineSubjectGroup[],
  subjects: RoutineSubject[]
): RoutineSubjectGroup[] {
  if (!groups || groups.length === 0) return groups || [];
  const byId = new Map(subjects.map((s) => [s.id, s]));
  return groups.map((g) => {
    const members = g.options.map((o) => byId.get(o.subjectId)).filter(Boolean) as RoutineSubject[];
    if (members.length === 0) return g;
    const periodsPerWeek = Math.max(
      1,
      ...members.map((s) => (s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : s.isLab ? 2 : 5))
    );
    const timePref = members.find((s) => s.timePref && s.timePref !== "any")?.timePref ?? "any";
    const pooled = g.scope === "class";
    if (periodsPerWeek === g.periodsPerWeek && timePref === g.timePref && pooled === g.pooled) return g;
    return { ...g, periodsPerWeek, timePref, pooled };
  });
}

/**
 * Common subjects of an HS class are taught to every stream section of the same section letter
 * together: XI-A (Science), XI-A (Arts) and XI-A (Commerce) sit in one slot with one teacher.
 * A school that teaches a subject separately puts it under each stream instead of Common.
 *
 * Built from the Teachers tab, never saved. Ticking the subject in any one of those sections is enough:
 * the block covers all of them. Several teachers sharing it (Bengali: 2p + 4p) get one block each, sized
 * by their own periods. Sections given different teachers are taught separately and stay as they are,
 * as do split theory + lab subjects and subjects already in a user group.
 */
export function deriveCombinedCommonGroups(
  classes: RoutineClass[],
  subjects: RoutineSubject[],
  teachers: RoutineTeacher[],
  userGroups: RoutineSubjectGroup[] = []
): RoutineSubjectGroup[] {
  const clusters = new Map<string, RoutineClass[]>();
  for (const c of classes) {
    if (!isHsClass(c.className)) continue;
    const { section, stream } = parseSectionAndStream(c.section || "");
    if (!stream || stream.toLowerCase() === "general") continue;
    const key = `${c.className.trim().toLowerCase()}::${section.trim().toLowerCase()}`;
    clusters.set(key, [...(clusters.get(key) || []), c]);
  }

  const out: RoutineSubjectGroup[] = [];
  for (const sections of clusters.values()) {
    if (sections.length < 2) continue;
    const className = sections[0].className;
    const clsLower = className.trim().toLowerCase();
    const sectionIds = sections.map((c) => c.id);
    const inUserGroup = new Set(
      userGroups.filter((g) => g.sectionIds.some((id) => sectionIds.includes(id))).flatMap((g) => g.options.map((o) => o.subjectId))
    );
    const seen = new Set<string>();
    for (const s of subjects) {
      if ((s.className || "").trim().toLowerCase() !== clsLower) continue;
      if (!(resolveIsCommon(s.stream, s.isCommon) || detectSubjectStream(s.name, s.stream) === "Common")) continue;
      if (s.isLab && (s.labPeriods ?? 0) > 0) continue;
      if (inUserGroup.has(s.id) || seen.has(normalizeSubjectName(s.name))) continue;
      seen.add(normalizeSubjectName(s.name));

      // Teachers per section; every section that has any must have the same set
      const perSection = sections.map((c) =>
        teachers.filter((t) => isTeacherAssignedToSubject(t, c.className, c.section, s.name))
      );
      const staffed = perSection.filter((ts) => ts.length > 0);
      if (staffed.length === 0) continue;
      const setKey = (ts: RoutineTeacher[]) => ts.map((t) => t.id).sort().join("|");
      if (staffed.some((ts) => setKey(ts) !== setKey(staffed[0]))) continue;

      const demand = s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : 5;
      const share = (t: RoutineTeacher) =>
        Math.max(
          ...sections
            .filter((c) => isTeacherAssignedToSubject(t, c.className, c.section, s.name))
            .map((c) => getTeacherSubjectPeriod(t, c.className, c.section, s.name, demand))
        );

      const { section: letter } = parseSectionAndStream(sections[0].section || "");
      const baseId = `combined:${clsLower}:${letter.toLowerCase()}:${s.id}`;
      const single = staffed[0].length === 1;
      // "XI-A": XI and XII blocks of the same subject must not read as duplicates
      const where = `${className.replace(/^class\s+/i, "").trim()}-${letter}`;
      for (const t of staffed[0]) {
        const id = single ? baseId : `${baseId}:${t.id}`;
        out.push({
          id,
          name: single ? `${s.name} (${where} Combined)` : `${s.name} (${where} Combined · ${t.shortName || t.name})`,
          scope: "section",
          className,
          stream: null,
          pooled: true,
          periodsPerWeek: single ? demand : share(t),
          periodSize: 1,
          timePref: s.timePref || "any",
          maxPerDay: s.maxPerDay ?? null,
          allowedSlots: s.allowedSlots ?? null,
          sectionIds,
          options: [{ id: `${id}:opt`, groupId: id, subjectId: s.id, teacherId: t.id, roomId: null, sortOrder: 0 }],
          combined: true,
        });
      }
    }
  }
  return out;
}

/** Saved groups plus the derived combined Common blocks (any stale derived ones dropped first). */
export function withCombinedCommonGroups(
  groups: RoutineSubjectGroup[],
  classes: RoutineClass[],
  subjects: RoutineSubject[],
  teachers: RoutineTeacher[]
): RoutineSubjectGroup[] {
  const saved = (groups || []).filter((g) => !g.combined);
  return [...saved, ...deriveCombinedCommonGroups(classes, subjects, teachers, saved)];
}

interface ClassGroupAllotment {
  group: RoutineSubjectGroup;
  periods: number;
  options: {
    subjectId: string;
    subjectName: string;
    /** first teacher (the only one unless the subject is shared) */
    teacher: RoutineTeacher | null;
    /** every teacher of the subject with their periods, in timetable cells */
    teachers: { teacher: RoutineTeacher; periods: number }[];
    /** periods (cells) of the subject that have a teacher */
    covered: number;
  }[];
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
    const size = g.periodSize === 2 ? 2 : 1;
    const options = g.options.map((o) => {
      const list = optionShares(o, g)
        .map((s) => ({ teacher: teachers.find((t) => t.id === s.teacherId), periods: s.periods * size }))
        .filter((x): x is { teacher: RoutineTeacher; periods: number } => Boolean(x.teacher));
      return {
        subjectId: o.subjectId,
        subjectName: subjects.find((s) => s.id === o.subjectId)?.name || "Subject",
        teacher: list[0]?.teacher || null,
        teachers: list,
        covered: list.reduce((n, x) => n + x.periods, 0),
      };
    });
    const periods = groupSlotCost(g);
    return {
      group: g,
      periods,
      options,
      complete: options.length > 0 && options.every((o) => o.covered >= periods),
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
  return (groups || []).reduce((total, g) => total + teacherPeriodsInGroup(teacherId, g), 0);
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

interface GroupValidationIssue {
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
    if (g.options.length < 2 && !g.combined) {
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

    // A teacher runs one subject of a group at a time: listed under two subjects they would clash
    const teacherOption = new Map<string, string>();
    for (const opt of g.options) {
      const optTeachers = optionTeacherIds(opt, g);
      if (!subjectIds.has(opt.subjectId)) {
        issues.push({
          groupId: g.id,
          groupName: g.name,
          severity: "error",
          message: `Option refers to a deleted subject (id ${opt.subjectId}).`,
        });
      }
      for (const tid of optTeachers) {
        if (!teacherIds.has(tid)) {
          issues.push({
            groupId: g.id,
            groupName: g.name,
            severity: "error",
            message: `Option refers to a deleted teacher (id ${tid}).`,
          });
        }
        const other = teacherOption.get(tid);
        if (other !== undefined && other !== opt.subjectId) {
          issues.push({
            groupId: g.id,
            groupName: g.name,
            severity: "error",
            message: "The same teacher is listed twice in this group — a teacher can only run one option.",
          });
        }
        teacherOption.set(tid, opt.subjectId);
      }
    }

    const unstaffed = g.options.filter((o) => !isOptionStaffed(o, g));
    if (unstaffed.length > 0) {
      const names = unstaffed
        .map((o) => {
          const name = subjects.find((s) => s.id === o.subjectId)?.name || "Subject";
          const covered = optionCovered(o, g);
          return covered > 0 ? `${name} (${covered}/${g.periodsPerWeek})` : name;
        })
        .join(", ");
      issues.push({
        groupId: g.id,
        groupName: g.name,
        severity: "warning",
        message: `No teacher yet for ${names}. Assign from the Teachers tab.`,
      });
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
 * For solver / payload construction: flatten groups into solver-ready
 * records. The solver sees only classIds[] + options and does not know
 * about scope. Non-pooled groups are expanded into one record per section.
 */
interface SolverGroupPayload {
  gid: string;
  name: string;
  classIds: string[];
  periodsPerWeek: number;
  periodSize: 1 | 2;
  timePref: "any" | "morning" | "afternoon";
  maxPerDay?: number | null;
  allowedSlots?: Record<string, number[]> | null;
  options: Array<{ subjectId: string; teacherId: string; roomId?: string | null }>;
}

export function buildSolverGroups(groups: RoutineSubjectGroup[]): SolverGroupPayload[] {
  return groups.flatMap((g) => splitSharedGroup(g)).flatMap(solverUnitsOf);
}

/**
 * A group whose subjects are shared by teachers (Political Science SM 3 + XY 2 beside Sociology
 * SG 5) runs as consecutive parts in which every subject has one teacher: SM + SG for 3 periods,
 * XY + SG for 2. Each part is a group of its own for the solver; without shares the group is kept.
 */
export function splitSharedGroup(g: RoutineSubjectGroup): RoutineSubjectGroup[] {
  if (!g.options.some((o) => (o.shares?.length ?? 0) > 0) || g.periodSize !== 1) return [g];
  if (!isGroupStaffed(g)) return [g];
  const total = g.periodsPerWeek;
  const cuts = new Set<number>([0, total]);
  const runs = g.options.map((o) => {
    let at = 0;
    return optionShares(o, g).map((s) => {
      const run = { from: at, to: at + s.periods, teacherId: s.teacherId };
      at += s.periods;
      cuts.add(run.to);
      return run;
    });
  });
  const points = [...cuts].filter((n) => n >= 0 && n <= total).sort((a, b) => a - b);
  if (points.length <= 2) {
    // Every subject has one teacher after all (a share list of one)
    return [{ ...g, options: g.options.map((o, i) => ({ ...o, teacherId: runs[i][0]?.teacherId || o.teacherId, shares: null })) }];
  }
  const parts: RoutineSubjectGroup[] = [];
  for (let k = 0; k + 1 < points.length; k++) {
    const from = points[k];
    const to = points[k + 1];
    if (to <= from) continue;
    parts.push({
      ...g,
      id: `${g.id}~${k}`,
      periodsPerWeek: to - from,
      options: g.options.map((o, i) => ({
        ...o,
        teacherId: runs[i].find((r) => r.from <= from && r.to >= to)?.teacherId || o.teacherId,
        shares: null,
      })),
    });
  }
  return parts;
}

function solverUnitsOf(g: RoutineSubjectGroup): SolverGroupPayload[] {
  const out: SolverGroupPayload[] = [];
  {
    // A combined Common block has one option shared by several sections
    if (g.sectionIds.length === 0 || g.options.length < (g.combined ? 1 : 2) || !isGroupStaffed(g)) return out;
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
        allowedSlots: g.allowedSlots ?? null,
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
          allowedSlots: g.allowedSlots ?? null,
          options: opts,
        });
      }
    }
  }
  return out;
}
