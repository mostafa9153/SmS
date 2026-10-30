import type { RoutineClass, RoutineSubject, RoutineSubjectGroup, RoutineTeacher } from "./types";
import {
  detectSubjectStream,
  getTeacherSectionSubjects,
  getTeacherSubjectPeriod,
  groupSlotPeriods,
  isHsClass,
  normalizeSubjectName,
  parseSectionAndStream,
} from "./routine-helpers";

export interface AllotmentGapRow {
  id: string;
  className: string;
  section: string;
  subject: string;
  isGroup: boolean;
  demand: number;
  allotted: number;
  /** teachers that carry this subject in this section */
  teachers: { id: string; name: string; periods: number }[];
  /** group options that still have no teacher */
  unstaffed: string[];
}

const baseKey = (name: string) => normalizeSubjectName(name).replace(/\s*\((theory|lab|practical)\)/g, "");

/**
 * Per section and subject: what the Subjects tab demands against what the Teachers tab hands out.
 * Rows with demand !== allotted are the gaps: positive diff = over-allotted, negative = still unassigned.
 */
export function calculateAllotmentGaps(
  teachers: RoutineTeacher[],
  classes: RoutineClass[],
  subjects: RoutineSubject[],
  groups: RoutineSubjectGroup[] = []
): AllotmentGapRow[] {
  const rows: AllotmentGapRow[] = [];

  for (const cls of classes) {
    const clsLower = cls.className.trim().toLowerCase();
    const grouped = new Set<string>();
    const sectionGroups = groups.filter((g) => g.sectionIds?.includes(cls.id));
    sectionGroups.forEach((g) => g.options.forEach((o) => grouped.add(o.subjectId)));

    const { stream } = parseSectionAndStream(cls.section || "");
    const streamKnown = isHsClass(cls.className) && stream && !["general", "all"].includes(stream.toLowerCase());

    const classSubjects = subjects.filter((s) => !s.className || s.className.trim().toLowerCase() === clsLower);
    // Group members are staffed through the group, never from a teacher's own subject list
    const groupedKeys = new Set(classSubjects.filter((s) => grouped.has(s.id)).map((s) => baseKey(s.name)));
    const own = classSubjects.filter((s) => !grouped.has(s.id));
    const subjectByKey = new Map<string, RoutineSubject>();
    for (const s of own) {
      if (streamKnown) {
        const det = detectSubjectStream(s.name, s.stream);
        if (!(det === "Common" || s.isCommon || det.toLowerCase() === stream.toLowerCase())) continue;
      }
      const key = baseKey(s.name);
      if (!subjectByKey.has(key)) subjectByKey.set(key, s);
    }

    const byKey = new Map<string, AllotmentGapRow>();
    for (const [key, s] of subjectByKey) {
      byKey.set(key, {
        id: `${cls.id}:${s.id}`,
        className: cls.className,
        section: cls.section,
        subject: s.name,
        isGroup: false,
        demand: s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : s.isLab ? 2 : 5,
        allotted: 0,
        teachers: [],
        unstaffed: [],
      });
    }

    for (const t of teachers) {
      for (const subName of getTeacherSectionSubjects(t, cls.className, cls.section)) {
        const key = baseKey(subName);
        const matched = subjectByKey.get(key);
        if (groupedKeys.has(key)) continue;
        if (!matched && own.some((s) => baseKey(s.name) === key)) continue; // another stream
        const periods = getTeacherSubjectPeriod(t, cls.className, cls.section, subName, matched?.periodsPerWeek || 5);
        let row = byKey.get(key);
        if (!row) {
          row = {
            id: `${cls.id}:x:${key}`,
            className: cls.className,
            section: cls.section,
            subject: subName,
            isGroup: false,
            demand: 0,
            allotted: 0,
            teachers: [],
            unstaffed: [],
          };
          byKey.set(key, row);
        }
        row.allotted += periods;
        row.teachers.push({ id: t.id, name: t.name, periods });
      }
    }
    rows.push(...byKey.values());

    for (const g of sectionGroups) {
      const names = g.options.map((o) => subjects.find((s) => s.id === o.subjectId)?.name || "Subject");
      const staffed = g.options.filter((o) => o.teacherId);
      const unstaffed = g.options.filter((o) => !o.teacherId).map((o) => subjects.find((s) => s.id === o.subjectId)?.name || "Subject");
      const slot = groupSlotPeriods(g);
      rows.push({
        id: `${cls.id}:g:${g.id}`,
        className: cls.className,
        section: cls.section,
        subject: `${g.name} (${names.join(" / ") || "no subjects"})`,
        isGroup: true,
        demand: slot,
        allotted: g.options.length > 0 && unstaffed.length === 0 ? slot : 0,
        teachers: staffed.map((o) => {
          const t = teachers.find((x) => x.id === o.teacherId);
          return { id: o.teacherId, name: t?.name || "Teacher", periods: slot };
        }),
        unstaffed: g.options.length === 0 ? ["No subjects in this group"] : unstaffed,
      });
    }
  }

  return rows.filter((r) => r.demand !== r.allotted);
}
