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

      // Find qualified teachers for this class and subject
      const qualifiedTeachers = teachers.filter((t) => {
        const qClasses = (t.qualifiedClasses || []).map((c) => c.toLowerCase());
        const classQualified = qClasses.length === 0 || qClasses.includes(clsNameLower);
        if (!classQualified) return false;

        const classSubs = t.classSubjects?.[cls.className] || [];
        if (classSubs.length === 0) return true; // Qualified for all subjects in this class
        return classSubs.some((s) => s.trim().toLowerCase() === subjNameLower);
      });

      let chosenTeacher: RoutineTeacher | null = null;

      if (qualifiedTeachers.length > 0) {
        // Score teachers: prefer matching primarySubject, then classTeacherOf, then lowest relative load
        const fullClassLabel = `${cls.className}${cls.section && cls.section !== "ALL" ? ` - ${cls.section}` : ""}`.toLowerCase();

        qualifiedTeachers.sort((a, b) => {
          const aPrimaryMatch = a.primarySubject && a.primarySubject.trim().toLowerCase() === subjNameLower ? 1 : 0;
          const bPrimaryMatch = b.primarySubject && b.primarySubject.trim().toLowerCase() === subjNameLower ? 1 : 0;
          if (aPrimaryMatch !== bPrimaryMatch) return bPrimaryMatch - aPrimaryMatch;

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
        assignments.push({
          id: `${cls.id}_${subj.id}_${chosenTeacher.id}`,
          classId: cls.id,
          subjectId: subj.id,
          teacherId: chosenTeacher.id,
          roomId: null,
          periodsPerWeek: weeklyPeriods,
        });

        teacherLoads[chosenTeacher.id] = (teacherLoads[chosenTeacher.id] || 0) + weeklyPeriods;
      }
    }
  }

  return assignments;
}
