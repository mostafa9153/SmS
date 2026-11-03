import { RoutineSubject } from "./types";
import { detectSubjectStream, normalizeSubjectName, isPooledGroup } from "./routine-helpers";

// ============================================================
// Routine domain rules shared by the screens and the solver payload.
// One definition per quantity, so the tab badge, the table, the
// demand total and the engine can never disagree.
// ============================================================

/** Weekly periods a subject asks for, with the same defaults everywhere. */
const subjectPeriods = (s: RoutineSubject): number =>
  s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : s.isLab ? 2 : 5;

/** Identity of a subject within a class. Streams only split HS subjects. */
export const subjectDedupeKey = (s: RoutineSubject, isHs: boolean): string => {
  const stream = isHs ? (s.stream || detectSubjectStream(s.name) || "Common").toLowerCase() : "general";
  return `${normalizeSubjectName(s.name)}::${stream}`;
};

export const dedupeSubjects = (list: RoutineSubject[], isHs: boolean): RoutineSubject[] => {
  const seen = new Set<string>();
  return list.filter((s) => {
    const key = subjectDedupeKey(s, isHs);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export { isPooledGroup };

/**
 * Teacher periods a group costs per week. Each option teacher teaches once per unit: one unit
 * for a class-wise group or a combined Common block, one per section for a section-wise group.
 */
export const groupTeacherLoad = (g: {
  scope: string;
  sectionIds: string[];
  options: unknown[];
  periodsPerWeek: number;
  periodSize: 1 | 2;
  combined?: boolean;
}): number =>
  g.options.length *
  (isPooledGroup(g.scope) || g.combined ? 1 : Math.max(1, g.sectionIds.length)) *
  Math.max(0, g.periodsPerWeek) *
  (g.periodSize === 2 ? 2 : 1);

/**
 * "ordinary + group slots = capacity load [+ extra option periods] [− shared combined periods] = total".
 * The slots part is what fits in class capacity; extra is the remaining group periods to assign;
 * shared is what combined Common blocks save (several sections, one teacher period).
 */
export const formatDemandBreakdown = (ordinary: number, slots: number, extra: number, shared = 0): string => {
  const base = `${ordinary} + ${slots} = ${ordinary + slots}`;
  if (extra === 0 && shared === 0) return base;
  const tail = `${extra > 0 ? ` + ${extra}` : ""}${shared > 0 ? ` − ${shared}` : ""}`;
  return `${base}${tail} = ${ordinary + slots + extra - shared}`;
};

/**
 * Weekly load of one section: ordinary subjects plus each group's periods for this section
 * (its slot plus any extra option periods). Group members are left out, so the group is
 * counted once.
 */
export const sectionLoad = (
  subs: RoutineSubject[],
  groups: { memberIds: string[]; periods: number }[]
): number => {
  const grouped = new Set(groups.flatMap((g) => g.memberIds));
  const ordinary = subs.filter((s) => !grouped.has(s.id)).reduce((sum, s) => sum + subjectPeriods(s), 0);
  return groups.reduce((sum, g) => sum + g.periods, ordinary);
};
