import { createClient } from "@/lib/supabase/client";
import { RoutineTeacher, RoutineSubject, RoutineClass } from "./types";
import {
  getLocalRoutineState,
  setLocalRoutineState,
  upsertTeacherAvailabilityDb,
  upsertSubjectDb,
  batchUpsertSubjectsDb,
  deleteSubjectDb,
} from "@/lib/supabase/db-routine";
import {
  getSavedMarksSchemes,
  saveMarksSchemes,
  type ClassMarksScheme,
  isSubjectLab,
} from "@/lib/utils/marks-config";
import {
  detectSubjectStream,
  isHsClass,
  parseSectionAndStream,
} from "./routine-helpers";
import { showToast } from "@/components/ui/toast-banner";

export interface SyncClassItem {
  id: string;
  name: string;
  code: string;
  sections: string[];
  stream?: string;
  streamSections?: Record<string, string[]>;
  classTeacher?: string;
  sectionTeachers?: Record<string, string>;
  roomNo?: string;
  capacity?: number;
  isAutoPass: boolean;
  status: "Active" | "Inactive";
}

/**
 * Standardize class and section label into a unified format: e.g. "Class V - Section A"
 */
export function formatClassSectionLabel(className: string, section: string): string {
  const cleanSec = section.trim().replace(/^Section\s+/i, "");
  return `${className.trim()} - Section ${cleanSec}`;
}

/**
 * Parses a class-section label like "Class V - Section A" or "Class V - A"
 */
export function parseClassSectionLabel(label?: string | null): { className: string; section: string } | null {
  if (!label || label === "__none__") return null;
  const parts = label.split(/\s*-\s*/);
  if (parts.length >= 2) {
    const className = parts[0].trim();
    const section = parts[1].trim().replace(/^Section\s+/i, "");
    return { className, section };
  }
  return { className: label.trim(), section: "A" };
}

/**
 * Sync from Classes tab (School Details) to Routine Teachers tab & Database
 */
export async function syncClassTeachersToRoutine(
  className: string,
  sectionTeachers: Record<string, string>,
  allSections: string[]
): Promise<void> {
  const local = getLocalRoutineState() || {};
  const teachers: RoutineTeacher[] = local && local.teachers ? [...local.teachers] : [];

  for (const sec of allSections) {
    const cleanSec = sec.trim().replace(/^Section\s+/i, "");
    const targetLabel = formatClassSectionLabel(className, cleanSec);
    const assignedTeacherName = (sectionTeachers[sec] || sectionTeachers[cleanSec] || sectionTeachers[`Section ${cleanSec}`] || "").trim();

    // 1. Clear any teacher previously holding this label who is no longer assigned
    for (const t of teachers) {
      if (t.classTeacherOf && (
        t.classTeacherOf.toLowerCase() === targetLabel.toLowerCase() ||
        t.classTeacherOf.toLowerCase() === `${className} - ${cleanSec}`.toLowerCase()
      )) {
        if (!assignedTeacherName || t.name.toLowerCase() !== assignedTeacherName.toLowerCase()) {
          t.classTeacherOf = null;
          await upsertTeacherAvailabilityDb(t);
        }
      }
    }

    // 2. Assign target teacher if specified
    if (assignedTeacherName) {
      const targetTeacher = teachers.find(
        (t) => t.name.trim().toLowerCase() === assignedTeacherName.toLowerCase()
      );
      if (targetTeacher) {
        targetTeacher.classTeacherOf = targetLabel;
        if (!targetTeacher.classTeacherFirstPeriods) {
          targetTeacher.classTeacherFirstPeriods = 3;
        }
        await upsertTeacherAvailabilityDb(targetTeacher);
      }
    }
  }

  setLocalRoutineState({ teachers });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sms_routine_state_updated"));
  }
}

/**
 * Sync from Routine Teachers tab to Classes management (School Details) & Database
 */
export async function syncRoutineTeacherToClasses(
  teacherName: string,
  newClassTeacherOf: string | null,
  prevClassTeacherOf?: string | null
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    let classes: SyncClassItem[] = [];
    const raw = localStorage.getItem("sms_class_management");
    if (raw) {
      classes = JSON.parse(raw);
    }

    if (!Array.isArray(classes) || classes.length === 0) return;

    let hasChanged = false;

    // 1. If previously assigned to another class/section, remove old assignment
    if (prevClassTeacherOf && prevClassTeacherOf !== newClassTeacherOf) {
      const parsedPrev = parseClassSectionLabel(prevClassTeacherOf);
      if (parsedPrev) {
        classes = classes.map((c) => {
          if (c.name.toLowerCase() === parsedPrev.className.toLowerCase()) {
            const nextSecTeachers = { ...(c.sectionTeachers || {}) };
            if (
              nextSecTeachers[parsedPrev.section]?.toLowerCase() === teacherName.toLowerCase() ||
              nextSecTeachers[`Section ${parsedPrev.section}`]?.toLowerCase() === teacherName.toLowerCase()
            ) {
              delete nextSecTeachers[parsedPrev.section];
              delete nextSecTeachers[`Section ${parsedPrev.section}`];
              hasChanged = true;
              return {
                ...c,
                sectionTeachers: nextSecTeachers,
                classTeacher: c.classTeacher?.toLowerCase() === teacherName.toLowerCase() ? undefined : c.classTeacher,
              };
            }
          }
          return c;
        });
      }
    }

    // 2. Assign to new class & section
    if (newClassTeacherOf && newClassTeacherOf !== "__none__") {
      const parsedNew = parseClassSectionLabel(newClassTeacherOf);
      if (parsedNew) {
        classes = classes.map((c) => {
          if (c.name.toLowerCase() === parsedNew.className.toLowerCase()) {
            const nextSecTeachers = { ...(c.sectionTeachers || {}) };
            nextSecTeachers[parsedNew.section] = teacherName;
            nextSecTeachers[`Section ${parsedNew.section}`] = teacherName;
            hasChanged = true;
            return {
              ...c,
              sectionTeachers: nextSecTeachers,
              classTeacher: c.sections.length <= 1 ? teacherName : (c.classTeacher || teacherName),
            };
          }
          return c;
        });
      }
    }

    if (hasChanged) {
      localStorage.setItem("sms_class_management", JSON.stringify(classes));
      fetch("/api/school-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "class_management", value: classes }),
      })
        .then((res) => {
          if (res.ok) {
            import("@/lib/utils/school-config-client").then(({ invalidateSchoolConfigClientCache }) =>
              invalidateSchoolConfigClientCache()
            );
          }
        })
        .catch((e) => console.warn("syncRoutineTeacherToClasses error:", e));
    }
  } catch (err) {
    console.warn("syncRoutineTeacherToClasses catch:", err);
  }
}

/**
 * Normalizes class strings (e.g. "Class V", "V", "5", "Class 5") to Roman Class Code: "V", "VI", etc.
 */
export function normalizeClassToCode(cls?: string | null): string {
  if (!cls) return "V";
  const raw = cls.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const numMap: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII",
  };
  return numMap[raw] || raw;
}

/**
 * Normalizes class string to full standard display name (e.g. "V" -> "Class V", "Class 5" -> "Class V")
 */
export function normalizeClassToFullName(cls?: string | null): string {
  const code = normalizeClassToCode(cls);
  return `Class ${code}`;
}

/**
 * Checks if two subject names are conceptually the same
 * e.g. "Bengali" and "Bengali (1st Language)" or "Mathematics" and "Mathematics"
 */
export function isSameSubject(a: string, b: string): boolean {
  if (!a || !b) return false;
  const clean = (s: string) => s.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
  const cleanA = clean(a);
  const cleanB = clean(b);
  return cleanA === cleanB || a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Sync from Routine Subjects -> Marks Schemes (School Details & Exam Marks)
 */
export function syncRoutineSubjectToMarksSchemes(subj: {
  name: string;
  className?: string | null;
  stream?: string | null;
}): void {
  if (typeof window === "undefined" || !subj.name.trim() || !subj.className) return;

  try {
    const classCode = normalizeClassToCode(subj.className);
    const schemes = getSavedMarksSchemes();
    let hasChanged = false;

    const updatedSchemes = schemes.map((scheme) => {
      if (normalizeClassToCode(scheme.classCode) === classCode) {
        const existingSubjects = scheme.subjects || [];
        const alreadyExists = existingSubjects.some((s) => isSameSubject(s, subj.name));
        if (!alreadyExists) {
          hasChanged = true;
          const nextSubjects = [...existingSubjects, subj.name.trim()];
          return {
            ...scheme,
            subjects: nextSubjects,
            subjectCount: nextSubjects.length,
          };
        }
      }
      return scheme;
    });

    if (hasChanged) {
      saveMarksSchemes(updatedSchemes);
    }
  } catch (err) {
    console.warn("syncRoutineSubjectToMarksSchemes error:", err);
  }
}

/**
 * Sync from Routine Batch Subjects -> Marks Schemes
 */
export function syncBatchRoutineSubjectsToMarksSchemes(
  subjectsList: { name: string; className?: string | null; stream?: string | null }[]
): void {
  if (typeof window === "undefined" || !Array.isArray(subjectsList) || subjectsList.length === 0) return;

  try {
    const schemes = getSavedMarksSchemes();
    let hasChanged = false;

    const updatedSchemes = schemes.map((scheme) => {
      const classCode = normalizeClassToCode(scheme.classCode);
      const matchingItems = subjectsList.filter(
        (sub) => sub.className && normalizeClassToCode(sub.className) === classCode
      );

      if (matchingItems.length > 0) {
        let currentSubjs = [...(scheme.subjects || [])];
        let schemeModified = false;

        for (const item of matchingItems) {
          if (!currentSubjs.some((s) => isSameSubject(s, item.name))) {
            currentSubjs.push(item.name.trim());
            schemeModified = true;
            hasChanged = true;
          }
        }

        if (schemeModified) {
          return {
            ...scheme,
            subjects: currentSubjs,
            subjectCount: currentSubjs.length,
          };
        }
      }
      return scheme;
    });

    if (hasChanged) {
      saveMarksSchemes(updatedSchemes);
    }
  } catch (err) {
    console.warn("syncBatchRoutineSubjectsToMarksSchemes error:", err);
  }
}

/**
 * Sync single Subject from School Details / Exam Marks (Marks Schemes) -> Routine Subjects
 */
export async function syncMarksSchemeSubjectToRoutine(
  classCode: string,
  subjectName: string,
  isLabExplicit?: boolean
): Promise<void> {
  if (typeof window === "undefined" || !subjectName.trim()) return;

  try {
    const className = normalizeClassToFullName(classCode);
    const cleanName = subjectName.trim();
    const supabase = createClient();
    const { data: dbSubjects } = await supabase
      .from("routine_subjects")
      .select("*")
      .eq("class_name", className);

    const currentSubjects = dbSubjects || [];
    const exactMatch = currentSubjects.find(
      (s: any) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    const schemes = getSavedMarksSchemes();
    const targetScheme = schemes.find((s) => normalizeClassToCode(s.classCode) === normalizeClassToCode(classCode));
    const isLab = isLabExplicit !== undefined ? isLabExplicit : isSubjectLab(targetScheme, cleanName);
    const theoryPeriods = isLab ? 4 : 5;
    const labPeriods = isLab ? 2 : 0;
    const totalPeriods = theoryPeriods + labPeriods;

    if (exactMatch) {
      // If isLab changed, update existing
      if (exactMatch.is_lab !== isLab) {
        await upsertSubjectDb({
          id: exactMatch.id,
          name: cleanName,
          className,
          periodsPerWeek: totalPeriods,
          theoryPeriods,
          labPeriods,
          isLab,
          isHard: Boolean(exactMatch.is_hard),
          timePref: exactMatch.time_pref || "any",
          allowMultiplePerDay: Boolean(exactMatch.allow_multiple_per_day) || isLab,
          maxPerDay: exactMatch.max_per_day || (isLab ? 2 : 1),
          stream: detectSubjectStream(cleanName, exactMatch.stream),
        });
        window.dispatchEvent(new Event("sms_routine_state_updated"));
      }
      return;
    }

    // Check if stripped match exists that can be renamed (e.g. "Bengali" -> "Bengali (1st Language)")
    const strippedMatch = currentSubjects.find((s: any) => isSameSubject(s.name, cleanName));

    if (strippedMatch) {
      await upsertSubjectDb({
        id: strippedMatch.id,
        name: cleanName,
        className,
        periodsPerWeek: strippedMatch.periods_per_week || totalPeriods,
        theoryPeriods: strippedMatch.theory_periods || theoryPeriods,
        labPeriods: strippedMatch.lab_periods || labPeriods,
        isLab,
        isHard: false,
        timePref: strippedMatch.time_pref || "any",
        allowMultiplePerDay: Boolean(strippedMatch.allow_multiple_per_day) || isLab,
        maxPerDay: strippedMatch.max_per_day || (isLab ? 2 : 1),
        stream: detectSubjectStream(cleanName, strippedMatch.stream),
      });
      window.dispatchEvent(new Event("sms_routine_state_updated"));
      return;
    }

    const newSubject: RoutineSubject = {
      id: crypto.randomUUID(),
      name: cleanName,
      className,
      periodsPerWeek: totalPeriods,
      theoryPeriods,
      labPeriods,
      isLab,
      isHard: false,
      timePref: "any",
      allowMultiplePerDay: isLab,
      maxPerDay: isLab ? 2 : 1,
      stream: detectSubjectStream(cleanName),
    };

    await upsertSubjectDb(newSubject);
    window.dispatchEvent(new Event("sms_routine_state_updated"));

    showToast({
      type: "success",
      title: "Subject Synced to Routine",
      description: `"${cleanName}" was added to ${className} (${isLab ? "4 Th + 2 Lab = 6 p/wk" : "5 p/wk"}) in Routine.`,
    });
  } catch (err) {
    console.warn("syncMarksSchemeSubjectToRoutine error:", err);
  }
}

/**
 * Sync Subject Removal from Marks Schemes (School Details) -> Routine Subjects (with Safety Guard)
 */
export async function syncRemoveMarksSchemeSubjectFromRoutine(
  classCode: string,
  subjectName: string
): Promise<void> {
  if (typeof window === "undefined" || !subjectName.trim()) return;

  try {
    const targetCode = normalizeClassToCode(classCode);
    const className = normalizeClassToFullName(classCode);
    const local = getLocalRoutineState();
    const currentSubjects: RoutineSubject[] = local?.subjects || [];
    const teachers: RoutineTeacher[] = local?.teachers || [];
    const assignments: any[] = local?.assignments || [];

    const toDelete = currentSubjects.find(
      (s) =>
        s.className &&
        normalizeClassToCode(s.className) === targetCode &&
        isSameSubject(s.name, subjectName)
    );

    if (!toDelete || !toDelete.id) return;

    // Safety Guard: Check if any teacher is assigned to this subject for this class
    const cleanSubLower = subjectName.trim().toLowerCase();
    const assignedTeacher = teachers.find((t) => {
      const classSubs = t.classSubjects?.[className] || t.classSubjects?.[classCode] || [];
      if (classSubs.some((s) => s.trim().toLowerCase() === cleanSubLower)) {
        return true;
      }
      if (t.sectionSubjects) {
        for (const [key, subs] of Object.entries(t.sectionSubjects)) {
          if (
            (key.startsWith(`${className}::`) || key.startsWith(`${classCode}::`)) &&
            subs.some((s) => s.trim().toLowerCase() === cleanSubLower)
          ) {
            return true;
          }
        }
      }
      return false;
    });

    const isAssignedInTimetable = assignments.some((a) => a.subjectId === toDelete.id);

    if (assignedTeacher || isAssignedInTimetable) {
      const teacherInfo = assignedTeacher ? ` (assigned to ${assignedTeacher.name})` : "";
      showToast({
        type: "warning",
        title: "Subject Retained in Routine",
        description: `"${subjectName}" for ${className} is currently assigned to teachers in Routine${teacherInfo}. To prevent schedule corruption, it was kept in Routine.`,
      });
      return;
    }

    // Safe to delete from routine_subjects
    await deleteSubjectDb(toDelete.id);
    window.dispatchEvent(new Event("sms_routine_state_updated"));

    showToast({
      type: "info",
      title: "Subject Removed from Routine",
      description: `"${subjectName}" was removed from ${className} in Routine.`,
    });
  } catch (err) {
    console.warn("syncRemoveMarksSchemeSubjectFromRoutine error:", err);
  }
}

/**
 * Routine subjects are downstream; no-op to prevent routine from modifying academic marks schemes
 */
export function syncRemoveRoutineSubjectFromMarksSchemes(
  _classNameOrCode: string,
  _subjectName: string
): void {
  // Presets is the authoritative academic catalog; Routine does not mutate Marks Schemes.
}

/**
 * Sync all subjects from Presets (/settings/presets?section=marks_scheme) to Routine Subjects
 */
export async function syncAllSubjectsFromPresetsToRoutine(): Promise<{ addedCount: number }> {
  if (typeof window === "undefined") return { addedCount: 0 };

  try {
    const schemes = getSavedMarksSchemes();
    if (!schemes || schemes.length === 0) return { addedCount: 0 };

    const supabase = createClient();
    const { data: dbSubjects } = await supabase.from("routine_subjects").select("*");
    const routineSubjects = dbSubjects || [];

    const toUpsert: any[] = [];
    const idsToDelete: string[] = [];

    for (const scheme of schemes) {
      const classCode = normalizeClassToCode(scheme.classCode);
      const className = normalizeClassToFullName(scheme.classCode);
      const schemeSubjects = scheme.subjects || [];

      for (const subName of schemeSubjects) {
        const cleanTarget = subName.trim();
        const isLab = isSubjectLab(scheme, cleanTarget);
        const theoryPeriods = isLab ? 4 : 5;
        const labPeriods = isLab ? 2 : 0;
        const totalPeriods = theoryPeriods + labPeriods;

        const exactMatch = routineSubjects.find(
          (s: any) =>
            s.class_name &&
            normalizeClassToCode(s.class_name) === classCode &&
            s.name.trim().toLowerCase() === cleanTarget.toLowerCase()
        );

        if (!exactMatch) {
          const strippedMatch = routineSubjects.find(
            (s: any) =>
              s.class_name &&
              normalizeClassToCode(s.class_name) === classCode &&
              isSameSubject(s.name, cleanTarget)
          );

          if (strippedMatch) {
            toUpsert.push({
              id: strippedMatch.id,
              name: cleanTarget,
              className,
              periodsPerWeek: strippedMatch.periods_per_week || totalPeriods,
              theoryPeriods: strippedMatch.theory_periods || theoryPeriods,
              labPeriods: strippedMatch.lab_periods || labPeriods,
              isLab,
              isHard: false,
              timePref: strippedMatch.time_pref || "any",
              allowMultiplePerDay: Boolean(strippedMatch.allow_multiple_per_day) || isLab,
              maxPerDay: strippedMatch.max_per_day || (isLab ? 2 : 1),
              stream: detectSubjectStream(cleanTarget, strippedMatch.stream),
            });
          } else {
            toUpsert.push({
              id: crypto.randomUUID(),
              name: cleanTarget,
              className,
              periodsPerWeek: totalPeriods,
              theoryPeriods,
              labPeriods,
              isLab,
              isHard: false,
              timePref: "any",
              allowMultiplePerDay: isLab,
              maxPerDay: isLab ? 2 : 1,
              stream: detectSubjectStream(cleanTarget),
            });
          }
        }
      }

      // Check for orphan duplicate subjects in routine_subjects for this class
      const classRoutineSubs = routineSubjects.filter(
        (s: any) => s.class_name && normalizeClassToCode(s.class_name) === classCode
      );
      for (const rSub of classRoutineSubs) {
        const isPresetSubject = schemeSubjects.some(
          (p) => p.trim().toLowerCase() === rSub.name.trim().toLowerCase()
        );
        const hasFullVersionInPreset = schemeSubjects.some((p) => isSameSubject(p, rSub.name));

        if (!isPresetSubject && hasFullVersionInPreset) {
          idsToDelete.push(rSub.id);
        }
      }
    }

    if (idsToDelete.length > 0) {
      await supabase.from("routine_subjects").delete().in("id", idsToDelete);
    }

    if (toUpsert.length > 0) {
      await batchUpsertSubjectsDb(toUpsert);
    }

    if (idsToDelete.length > 0 || toUpsert.length > 0) {
      window.dispatchEvent(new Event("sms_routine_state_updated"));
    }

    return { addedCount: toUpsert.length };
  } catch (err) {
    console.warn("syncAllSubjectsFromPresetsToRoutine error:", err);
    return { addedCount: 0 };
  }
}

/**
 * Backward compatibility alias for syncAllSubjectsFromPresetsToRoutine
 */
export async function syncAllSubjectsBidirectional(): Promise<void> {
  await syncAllSubjectsFromPresetsToRoutine();
}

/**
 * Prunes / syncs routine classes to match configured school classes & streams.
 * Removes orphaned streams (e.g. Science/Commerce if school only runs Arts).
 */
export async function syncConfiguredClassesToRoutine(configuredClasses?: SyncClassItem[]): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    let rawClasses = configuredClasses;
    if (!rawClasses || rawClasses.length === 0) {
      const stored = localStorage.getItem("sms_class_management");
      if (stored) rawClasses = JSON.parse(stored);
    }
    if (!Array.isArray(rawClasses) || rawClasses.length === 0) return;

    const local = getLocalRoutineState() || {};
    const existingRoutineClasses = local.classes || [];
    if (existingRoutineClasses.length === 0) return;

    // Build lookup of allowed (className -> Set of allowed streams/sections)
    const allowedMap = new Map<string, { streams: Set<string>; sections: Set<string> }>();

    rawClasses.forEach((c) => {
      const normClass = (c.name || `Class ${c.code}`).trim().toLowerCase();
      const isHs = isHsClass(c.name, c.code);
      const streamsSet = new Set<string>();
      const sectionsSet = new Set<string>();

      if (isHs) {
        if (c.streamSections && Object.keys(c.streamSections).length > 0) {
          Object.keys(c.streamSections).forEach((st) => streamsSet.add(st.trim().toLowerCase()));
        } else if (c.stream) {
          const parts = c.stream.split(/[\/,•|]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
          parts.forEach((st: string) => streamsSet.add(st));
        } else {
          streamsSet.add("arts");
        }
      }

      (c.sections || ["A", "B"]).forEach((s: string) => sectionsSet.add(s.trim().toLowerCase()));

      allowedMap.set(normClass, { streams: streamsSet, sections: sectionsSet });
      const altCodeName = `class ${c.code.trim().toLowerCase()}`;
      allowedMap.set(altCodeName, { streams: streamsSet, sections: sectionsSet });
    });

    const toKeep: RoutineClass[] = [];
    const idsToDelete: string[] = [];

    existingRoutineClasses.forEach((rc) => {
      const normName = (rc.className || "").trim().toLowerCase();
      const parsed = parseSectionAndStream(rc.section);
      const allowed = allowedMap.get(normName);

      if (!allowed) {
        toKeep.push(rc);
        return;
      }

      const isHs = isHsClass(rc.className);
      if (isHs) {
        const streamLower = (parsed.stream || "").trim().toLowerCase();
        // If the stream is not in the allowed active streams for this HS class, prune it
        if (streamLower && streamLower !== "general" && !allowed.streams.has(streamLower)) {
          if (rc.id) idsToDelete.push(rc.id);
          return;
        }
      }

      toKeep.push(rc);
    });

    if (idsToDelete.length > 0) {
      setLocalRoutineState({ classes: toKeep });
      const supabase = createClient();
      await supabase.from("routine_classes").delete().in("id", idsToDelete);
      window.dispatchEvent(new Event("sms_routine_state_updated"));
    }
  } catch (err) {
    console.warn("syncConfiguredClassesToRoutine error:", err);
  }
}

