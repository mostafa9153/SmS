import { getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import {
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
  RoutineRoom,
  RoutineSubjectGroup,
} from "./types";
import {
  isHsClass,
  parseSectionAndStream,
  detectSubjectStream,
  getEffectiveClassSubjects,
  normalizeSubjectName,
  isTeacherAssignedToSubject,
  getTeacherSectionSubjects,
} from "./routine-helpers";

/**
 * Automatically builds workload assignments connecting configured classes,
 * subjects, and qualified teachers with workload balancing.
 */
export function autoBuildRoutineAssignments(
  classes: RoutineClass[],
  subjects: RoutineSubject[],
  teachers: RoutineTeacher[],
  settings?: RoutineSettings,
  rooms: RoutineRoom[] = [],
  groups: RoutineSubjectGroup[] = []
): RoutineAssignment[] {
  return autoBuildRoutineAssignmentsWithReport(classes, subjects, teachers, settings, rooms, groups).assignments;
}

interface UnstaffedSubject {
  className: string;
  section: string;
  subjectName: string;
  periods: number;
}

interface AutoAssignReport {
  assignments: RoutineAssignment[];
  /** Silent decisions the builder had to make; each one is something the owner may want to fix */
  warnings: string[];
  /** Subjects no teacher was given in the Teachers tab; they get no assignment (never a guessed teacher) */
  unstaffed: UnstaffedSubject[];
}

/**
 * Same as autoBuildRoutineAssignments, but also returns every decision that overrode the
 * configured data (unqualified fallback teacher, teacher period overrides, split totals).
 */
export function autoBuildRoutineAssignmentsWithReport(
  classes: RoutineClass[],
  subjects: RoutineSubject[],
  teachers: RoutineTeacher[],
  settings?: RoutineSettings,
  rooms: RoutineRoom[] = [],
  groups: RoutineSubjectGroup[] = []
): AutoAssignReport {
  const warnings: string[] = [];
  const unstaffed: UnstaffedSubject[] = [];
  if (classes.length === 0 || subjects.length === 0) {
    return { assignments: [], warnings, unstaffed };
  }

  const assignments: RoutineAssignment[] = [];
  const teacherLoads: Record<string, number> = {};
  teachers.forEach((t) => {
    teacherLoads[t.id] = 0;
  });

  // Sort classes in standard grade sequence
  const sortedClasses = [...classes];

  for (const cls of sortedClasses) {
    const clsNameLower = cls.className.toLowerCase();
    const isHs = isHsClass(cls.className);
    const { stream: sectionStream } = parseSectionAndStream(cls.section || "");

    // Drop subjects already represented as a group option on this class —
    // the group handles them and auto-assign must not create a parallel
    // ordinary assignment that would double-book the same slot.
    const effSubjects = getEffectiveClassSubjects(cls, subjects, groups);
    const explicitClassSubs = effSubjects.filter(
      (s) => s.className && s.className.toLowerCase() === clsNameLower
    );
    const hasExplicitSubs = explicitClassSubs.length > 0;

    // Find subjects for this class and stream (for HS classes)
    const candidates = hasExplicitSubs ? explicitClassSubs : effSubjects;
    const rawMatchingSubjects = candidates.filter((s) => {
      if (s.className && s.className.toLowerCase() !== clsNameLower) {
        return false;
      }
      if (hasExplicitSubs && !s.className) {
        return false;
      }
      if (!isHs) {
        if (hasExplicitSubs) {
          return Boolean(s.className && s.className.toLowerCase() === clsNameLower);
        }
        const presets = new Set(
          getDatabaseSubjectsForClass(cls.className).map((sub: string) => sub.trim().toLowerCase())
        );
        return presets.has(s.name.trim().toLowerCase());
      }
      // Higher Secondary stream filtering
      const isCommon =
        Boolean(s.isCommon) ||
        (s.stream && s.stream.toLowerCase() === "common") ||
        detectSubjectStream(s.name, s.stream) === "Common";
      if (isCommon) return true;

      if (sectionStream && sectionStream.toLowerCase() !== "general" && sectionStream.toLowerCase() !== "all") {
        const subjStream = (s.stream || detectSubjectStream(s.name, s.stream) || "General").toLowerCase();
        return subjStream === sectionStream.toLowerCase();
      }
      return true;
    });

    // Deduplicate matching subjects by canonical subject name
    const matchingSubjects: RoutineSubject[] = [];
    const seenNames = new Set<string>();
    for (const s of rawMatchingSubjects) {
      const canonicalName = normalizeSubjectName(s.name);
      const key = `${canonicalName}::${(s.stream || detectSubjectStream(s.name) || "Common").toLowerCase()}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        matchingSubjects.push(s);
      }
    }

    for (const subj of matchingSubjects) {
      const weeklyPeriods = subj.periodsPerWeek && subj.periodsPerWeek > 0
        ? subj.periodsPerWeek
        : (subj.isLab ? 2 : 5);

      const subjNameLower = subj.name.trim().toLowerCase();

      const secName = (cls.section || "A").trim();

      // Only teachers who were given this subject for this section in the Teachers tab
      const qualifiedTeachers = teachers.filter((t) => isTeacherAssignedToSubject(t, cls.className, secName, subj.name));
      if (qualifiedTeachers.length === 0) {
        unstaffed.push({ className: cls.className, section: secName, subjectName: subj.name, periods: weeklyPeriods });
        continue;
      }

      // Auto-assign lab room if subject is practical/lab
      let assignedRoomId: string | null = null;
      if (subj.isLab && rooms && rooms.length > 0) {
        const labRooms = rooms.filter((r) => r.isLab);
        if (labRooms.length > 0) {
          const isComp = subjNameLower.includes("comp");
          const matchingLab =
            labRooms.find((r) =>
              isComp ? r.name.toLowerCase().includes("comp") : !r.name.toLowerCase().includes("comp")
            ) || labRooms[0];
          assignedRoomId = matchingLab.id;
        }
      }

      // Check if this is a split Theory + Lab subject
      const isSplitSubject =
        subj.isLab && (subj.theoryPeriods ?? 0) > 0 && (subj.labPeriods ?? 0) > 0;

      if (isSplitSubject) {
        const theoryDemand = subj.theoryPeriods || Math.max(1, weeklyPeriods - (subj.labPeriods || 2));
        const labDemand = subj.labPeriods || 2;

        const sectionSubs = (t: RoutineTeacher) =>
          getTeacherSectionSubjects(t, cls.className, secName).map((s) => s.trim().toLowerCase());
        // 1. Theory portion: a teacher given "X (Theory)" or plain "X"
        const theoryTeachers = qualifiedTeachers.filter((t) =>
          sectionSubs(t).some((sc) => sc === `${subjNameLower} (theory)` || sc === subjNameLower)
        );
        // 2. Lab portion: a teacher given "X (Lab)" / "X (Practical)" or plain "X"
        const labTeachers = qualifiedTeachers.filter((t) =>
          sectionSubs(t).some(
            (sc) => sc === `${subjNameLower} (lab)` || sc === `${subjNameLower} (practical)` || sc === subjNameLower
          )
        );

        // A portion nobody was given stays unstaffed; it never borrows the other portion's teacher
        const byLoad = (a: RoutineTeacher, b: RoutineTeacher) =>
          (teacherLoads[a.id] || 0) / (a.maxPeriods || 24) - (teacherLoads[b.id] || 0) / (b.maxPeriods || 24);
        const chosenTheoryTeacher = theoryTeachers.sort(byLoad)[0];
        const chosenLabTeacher = labTeachers.sort(byLoad)[0];
        if (!chosenTheoryTeacher) {
          unstaffed.push({ className: cls.className, section: secName, subjectName: `${subj.name} (Theory)`, periods: theoryDemand });
        }
        if (!chosenLabTeacher) {
          unstaffed.push({ className: cls.className, section: secName, subjectName: `${subj.name} (Lab)`, periods: labDemand });
        }

        if (chosenTheoryTeacher) {
          assignments.push({
            id: crypto.randomUUID(),
            classId: cls.id,
            subjectId: subj.id,
            teacherId: chosenTheoryTeacher.id,
            roomId: null,
            periodsPerWeek: theoryDemand,
            isLab: false,
          });
          teacherLoads[chosenTheoryTeacher.id] = (teacherLoads[chosenTheoryTeacher.id] || 0) + theoryDemand;
        }

        if (chosenLabTeacher) {
          assignments.push({
            id: crypto.randomUUID(),
            classId: cls.id,
            subjectId: subj.id,
            teacherId: chosenLabTeacher.id,
            roomId: assignedRoomId,
            periodsPerWeek: labDemand,
            isLab: true,
          });
          teacherLoads[chosenLabTeacher.id] = (teacherLoads[chosenLabTeacher.id] || 0) + labDemand;
        }

        continue;
      }

      // Check if any qualified teachers have explicit subjectPeriods configured for this class, section & subject
      const explicitTeachers: { teacher: RoutineTeacher; periods: number }[] = [];
      qualifiedTeachers.forEach((t) => {
        const p =
          t.subjectPeriods?.[`${cls.className}::${secName}::${subj.name}`] ??
          t.subjectPeriods?.[`${cls.className}-${secName}-${subj.name}`] ??
          t.subjectPeriods?.[`${cls.className}_${secName}_${subj.name}`] ??
          t.subjectPeriods?.[`${cls.className}-${secName}::${subj.name}`] ??
          t.subjectPeriods?.[`${cls.className}_${secName}::${subj.name}`] ??
          t.subjectPeriods?.[`${cls.className}::${subj.name}`] ??
          t.subjectPeriods?.[`${cls.className}-${subj.name}`] ??
          t.subjectPeriods?.[`${cls.className}_${subj.name}`];
        if (p && Number(p) > 0) {
          explicitTeachers.push({
            teacher: t,
            periods: Number(p),
          });
        }
      });

      if (explicitTeachers.length > 0) {
        // Allocate strictly the configured explicit periods without artificial inflation
        const splitTotal = explicitTeachers.reduce((n, e) => n + e.periods, 0);
        if (splitTotal !== weeklyPeriods) {
          warnings.push(
            `${cls.className} ${cls.section} - ${subj.name}: teachers' periods add up to ${splitTotal}, but the subject needs ${weeklyPeriods}`
          );
        }
        explicitTeachers.forEach(({ teacher, periods }) => {
          assignments.push({
            id: crypto.randomUUID(),
            classId: cls.id,
            subjectId: subj.id,
            teacherId: teacher.id,
            roomId: assignedRoomId,
            periodsPerWeek: periods,
            isLab: Boolean(subj.isLab),
          });
          teacherLoads[teacher.id] = (teacherLoads[teacher.id] || 0) + periods;
        });
        continue;
      }

      // Score teachers: prefer matching primarySubject, then explicit section, then classTeacherOf, then lowest relative load
      const fullClassLabel = `${cls.className}${cls.section && cls.section !== "ALL" ? ` - ${cls.section}` : ""}`.toLowerCase();

      qualifiedTeachers.sort((a, b) => {
        const aPrimaryMatch = a.primarySubject && a.primarySubject.trim().toLowerCase() === subjNameLower ? 1 : 0;
        const bPrimaryMatch = b.primarySubject && b.primarySubject.trim().toLowerCase() === subjNameLower ? 1 : 0;
        if (aPrimaryMatch !== bPrimaryMatch) return bPrimaryMatch - aPrimaryMatch;

        // Section specific bonus
        const aSecs = a.classSections?.[cls.className] || [];
        const bSecs = b.classSections?.[cls.className] || [];
        const aHasExplicitSec = aSecs.length > 0 ? 1 : 0;
        const bHasExplicitSec = bSecs.length > 0 ? 1 : 0;
        if (aHasExplicitSec !== bHasExplicitSec) return bHasExplicitSec - aHasExplicitSec;

        const aIsClassTeacher = a.classTeacherOf && (a.classTeacherOf.toLowerCase() === fullClassLabel || a.classTeacherOf.toLowerCase() === clsNameLower) ? 1 : 0;
        const bIsClassTeacher = b.classTeacherOf && (b.classTeacherOf.toLowerCase() === fullClassLabel || b.classTeacherOf.toLowerCase() === clsNameLower) ? 1 : 0;
        if (aIsClassTeacher !== bIsClassTeacher) return bIsClassTeacher - aIsClassTeacher;

        const loadA = teacherLoads[a.id] || 0;
        const loadB = teacherLoads[b.id] || 0;
        const capA = a.maxPeriods || 24;
        const capB = b.maxPeriods || 24;
        return loadA / capA - loadB / capB;
      });
      const chosenTeacher = qualifiedTeachers[0];

      if (chosenTeacher) {
        // 1. Subject-specific period override (highest priority)
        const customSubjectPeriod =
          chosenTeacher.subjectPeriods?.[`${cls.className}::${secName}::${subj.name}`] ??
          chosenTeacher.subjectPeriods?.[`${cls.className}::${subj.name}`];

        // 2. Section-specific period override
        const customSectionPeriod =
          chosenTeacher.sectionPeriods?.[`${cls.className}::${secName}`] ??
          chosenTeacher.sectionPeriods?.[`${cls.className}-${secName}`] ??
          chosenTeacher.sectionPeriods?.[`${cls.className}_${secName}`] ??
          chosenTeacher.sectionPeriods?.[secName];

        // 3. Class-specific period override
        const customClassPeriod = chosenTeacher.classPeriods?.[cls.className];

        const customTeacherPeriods =
          customSubjectPeriod && customSubjectPeriod > 0
            ? customSubjectPeriod
            : customSectionPeriod && customSectionPeriod > 0
            ? customSectionPeriod
            : customClassPeriod;

        const effectivePeriods =
          customTeacherPeriods && customTeacherPeriods > 0
            ? customTeacherPeriods
            : weeklyPeriods;
        if (effectivePeriods !== weeklyPeriods) {
          warnings.push(
            `${cls.className} ${cls.section} - ${subj.name}: ${chosenTeacher.name}'s period setting (${effectivePeriods}) replaced the subject's ${weeklyPeriods} p/wk`
          );
        }

        assignments.push({
          id: crypto.randomUUID(),
          classId: cls.id,
          subjectId: subj.id,
          teacherId: chosenTeacher.id,
          roomId: assignedRoomId,
          periodsPerWeek: effectivePeriods,
          isLab: Boolean(subj.isLab),
        });

        teacherLoads[chosenTeacher.id] = (teacherLoads[chosenTeacher.id] || 0) + effectivePeriods;
      }
    }
  }

  return { assignments, warnings, unstaffed };
}
