import { RoutineSubject } from "./types";
import { detectSubjectStream, normalizeSubjectName } from "./routine-helpers";

// ============================================================
// Routine domain rules shared by the screens and the solver payload.
// One definition per quantity, so the tab badge, the table, the
// demand total and the engine can never disagree.
// ============================================================

/** Weekly periods a subject asks for, with the same defaults everywhere. */
export const subjectPeriods = (s: RoutineSubject): number =>
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

/**
 * Weekly load of one section. The options of a parallel group share one slot, so each group
 * costs its largest member once instead of every member.
 */
export const sectionLoad = (subs: RoutineSubject[], groupMemberIds: string[][]): number => {
  const grouped = new Set(groupMemberIds.flat());
  let total = subs.filter((s) => !grouped.has(s.id)).reduce((sum, s) => sum + subjectPeriods(s), 0);
  for (const ids of groupMemberIds) {
    const members = subs.filter((s) => ids.includes(s.id));
    if (members.length > 0) total += Math.max(...members.map(subjectPeriods));
  }
  return total;
};
