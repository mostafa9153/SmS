import { getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import {
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
  RoutineRoom,
} from "./types";
import {
  isHsClass,
  parseSectionAndStream,
  detectSubjectStream,
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
  rooms: RoutineRoom[] = []
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
    const isHs = isHsClass(cls.className);
    const { stream: sectionStream } = parseSectionAndStream(cls.section || "");

    const explicitClassSubs = subjects.filter(
      (s) => s.className && s.className.toLowerCase() === clsNameLower
    );
    const hasExplicitSubs = explicitClassSubs.length > 0;

    // Find subjects for this class and stream (for HS classes)
    const candidates = hasExplicitSubs ? explicitClassSubs : subjects;
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
      const canonicalName = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
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

      // Find qualified teachers for this class, section and subject
      const qualifiedTeachers = teachers.filter((t) => {
        // 1. Class qualification
        const qClasses = (t.qualifiedClasses || []).map((c) => c.toLowerCase());
        const classQualified = qClasses.length === 0 || qClasses.includes(clsNameLower);
        if (!classQualified) return false;

        // 2. Section qualification
        if (t.classSections?.[cls.className] !== undefined) {
          const tSections = t.classSections[cls.className];
          if (!Array.isArray(tSections) || tSections.length === 0) return false;
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
        const secSubs =
          t.sectionSubjects?.[secKey] ??
          t.sectionSubjects?.[`${cls.className}-${(cls.section || "A").trim()}`] ??
          t.sectionSubjects?.[`${cls.className}_${(cls.section || "A").trim()}`];

        if (secSubs !== undefined) {
          return Array.isArray(secSubs) && secSubs.some((s) => s.trim().toLowerCase() === subjNameLower);
        }

        // If teacher has ANY sectionSubjects configured for this class, strictly do NOT fall back to classSubjects
        const hasAnySecConfig = Object.keys(t.sectionSubjects || {}).some(
          (k) =>
            k.startsWith(`${cls.className}::`) ||
            k.startsWith(`${cls.className}-`) ||
            k.startsWith(`${cls.className}_`)
        );
        if (hasAnySecConfig) {
          return false;
        }

        const classSubs = t.classSubjects?.[cls.className] || [];
        if (classSubs.length === 0) return true; // Qualified for all subjects in this class
        return classSubs.some((s) => s.trim().toLowerCase() === subjNameLower);
      });

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

      if (explicitTeachers.length > 0) {
        // Allocate strictly the configured explicit periods without artificial inflation
        explicitTeachers.forEach(({ teacher, periods }) => {
          assignments.push({
            id: crypto.randomUUID(),
            classId: cls.id,
            subjectId: subj.id,
            teacherId: teacher.id,
            roomId: assignedRoomId,
            periodsPerWeek: periods,
          });
          teacherLoads[teacher.id] = (teacherLoads[teacher.id] || 0) + periods;
        });
        continue;
      }

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
          id: crypto.randomUUID(),
          classId: cls.id,
          subjectId: subj.id,
          teacherId: chosenTeacher.id,
          roomId: assignedRoomId,
          periodsPerWeek: effectivePeriods,
        });

        teacherLoads[chosenTeacher.id] = (teacherLoads[chosenTeacher.id] || 0) + effectivePeriods;
      }
    }
  }

  return assignments;
}
