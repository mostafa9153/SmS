import {
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
} from "./types";

/**
 * Automatically builds workload assignments connecting configured classes,
 * subjects, and qualified teachers with workload balancing.
 */
export function autoBuildRoutineAssignments(
  classes: RoutineClass[],
  subjects: RoutineSubject[],
  teachers: RoutineTeacher[],
  settings?: RoutineSettings
): RoutineAssignment[] {
  if (classes.length === 0 || subjects.length === 0 || teachers.length === 0) {
    return [];
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

    // Find subjects for this class
    const matchingSubjects = subjects.filter(
      (s) => !s.className || s.className.toLowerCase() === clsNameLower
    );

    for (const subj of matchingSubjects) {
      const weeklyPeriods = subj.periodsPerWeek && subj.periodsPerWeek > 0
        ? subj.periodsPerWeek
        : (subj.isLab ? 2 : 5);

      const subjNameLower = subj.name.trim().toLowerCase();

      // Find qualified teachers for this class, section and subject
      const qualifiedTeachers = teachers.filter((t) => {
        // 1. Class qualification
        const qClasses = (t.qualifiedClasses || []).map((c) => c.toLowerCase());
        const classQualified = qClasses.length === 0 || qClasses.includes(clsNameLower);
        if (!classQualified) return false;

        // 2. Section qualification
        const tSections = t.classSections?.[cls.className] || [];
        if (tSections.length > 0) {
          const clsSec = (cls.section || "A").trim().toLowerCase();
          const matchesSec = tSections.some((s) => {
            const sLower = s.trim().toLowerCase();
            return (
              sLower === "all" ||
              sLower === clsSec ||
              clsSec.includes(sLower) ||
              sLower.includes(clsSec)
            );
          });
          if (!matchesSec) return false;
        }

        // 3. Subject qualification (Check section-specific subjects first, then class subjects)
        const secKey = `${cls.className}::${(cls.section || "A").trim()}`;
        const secSubs = t.sectionSubjects?.[secKey] ?? t.sectionSubjects?.[`${cls.className}-${(cls.section || "A").trim()}`];
        if (secSubs && Array.isArray(secSubs) && secSubs.length > 0) {
          return secSubs.some((s) => s.trim().toLowerCase() === subjNameLower);
        }

        const classSubs = t.classSubjects?.[cls.className] || [];
        if (classSubs.length === 0) return true; // Qualified for all subjects in this class
        return classSubs.some((s) => s.trim().toLowerCase() === subjNameLower);
      });

      let chosenTeacher: RoutineTeacher | null = null;

      if (qualifiedTeachers.length > 0) {
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
        chosenTeacher = qualifiedTeachers[0];
      } else {
        // Fallback: Pick any available teacher with lowest load
        const allSorted = [...teachers].sort(
          (a, b) => (teacherLoads[a.id] || 0) - (teacherLoads[b.id] || 0)
        );
        chosenTeacher = allSorted[0] || teachers[0];
      }

      if (chosenTeacher) {
        const secName = (cls.section || "A").trim();

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

        assignments.push({
          id: `${cls.id}_${subj.id}_${chosenTeacher.id}`,
          classId: cls.id,
          subjectId: subj.id,
          teacherId: chosenTeacher.id,
          roomId: null,
          periodsPerWeek: effectivePeriods,
        });

        teacherLoads[chosenTeacher.id] = (teacherLoads[chosenTeacher.id] || 0) + effectivePeriods;
      }
    }
  }

  return assignments;
}
