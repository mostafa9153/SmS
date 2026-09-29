import { createClient } from "@/lib/supabase/client";
import { RoutineTeacher, RoutineSubject } from "./types";
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
} from "@/lib/utils/marks-config";
import { detectSubjectStream } from "./routine-helpers";

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
  subjectName: string
): Promise<void> {
  if (typeof window === "undefined" || !subjectName.trim()) return;

  try {
    const className = normalizeClassToFullName(classCode);
    const cleanName = subjectName.trim();
    const local = getLocalRoutineState();
    const currentSubjects: RoutineSubject[] = local?.subjects || [];

    const existing = currentSubjects.find(
      (s) =>
        s.className &&
        normalizeClassToCode(s.className) === normalizeClassToCode(classCode) &&
        isSameSubject(s.name, cleanName)
    );

    if (!existing) {
      const lower = cleanName.toLowerCase();
      const isLab = lower.includes("lab") || lower.includes("practical");
      const periods = isLab
        ? 2
        : lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental")
        ? 2
        : 5;

      const newSubject: RoutineSubject = {
        id: crypto.randomUUID(),
        name: cleanName,
        className,
        periodsPerWeek: periods,
        isLab,
        isHard: false,
        timePref: "any",
        allowMultiplePerDay: false,
        maxPerDay: 1,
        stream: detectSubjectStream(cleanName),
      };

      await upsertSubjectDb(newSubject);
      window.dispatchEvent(new Event("sms_routine_state_updated"));
    }
  } catch (err) {
    console.warn("syncMarksSchemeSubjectToRoutine error:", err);
  }
}

/**
 * Sync Subject Removal from Marks Schemes (School Details) -> Routine Subjects
 */
export async function syncRemoveMarksSchemeSubjectFromRoutine(
  classCode: string,
  subjectName: string
): Promise<void> {
  if (typeof window === "undefined" || !subjectName.trim()) return;

  try {
    const targetCode = normalizeClassToCode(classCode);
    const local = getLocalRoutineState();
    const currentSubjects: RoutineSubject[] = local?.subjects || [];

    const toDelete = currentSubjects.find(
      (s) =>
        s.className &&
        normalizeClassToCode(s.className) === targetCode &&
        isSameSubject(s.name, subjectName)
    );

    if (toDelete && toDelete.id) {
      await deleteSubjectDb(toDelete.id);
      window.dispatchEvent(new Event("sms_routine_state_updated"));
    }
  } catch (err) {
    console.warn("syncRemoveMarksSchemeSubjectFromRoutine error:", err);
  }
}

/**
 * Sync Subject Removal from Routine -> Marks Schemes
 */
export function syncRemoveRoutineSubjectFromMarksSchemes(
  classNameOrCode: string,
  subjectName: string
): void {
  if (typeof window === "undefined" || !subjectName.trim()) return;

  try {
    const classCode = normalizeClassToCode(classNameOrCode);
    const schemes = getSavedMarksSchemes();
    let hasChanged = false;

    const updatedSchemes = schemes.map((scheme) => {
      if (normalizeClassToCode(scheme.classCode) === classCode) {
        const existingSubjects = scheme.subjects || [];
        const nextSubjects = existingSubjects.filter((s) => !isSameSubject(s, subjectName));
        if (nextSubjects.length !== existingSubjects.length) {
          hasChanged = true;
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
    console.warn("syncRemoveRoutineSubjectFromMarksSchemes error:", err);
  }
}

/**
 * Bidirectional Full Sync between Routine Subjects and Marks Schemes
 */
export async function syncAllSubjectsBidirectional(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const schemes = getSavedMarksSchemes();
    const local = getLocalRoutineState();
    const routineSubjects: RoutineSubject[] = local?.subjects || [];
    let marksSchemesChanged = false;
    const subjectsToUpsert: {
      id?: string;
      name: string;
      className?: string | null;
      periodsPerWeek?: number | null;
      isLab?: boolean;
      isHard?: boolean;
      timePref?: "any" | "morning" | "afternoon";
      allowMultiplePerDay?: boolean;
      maxPerDay?: number | null;
      stream?: string | null;
    }[] = [];

    // 1. From Marks Schemes -> Routine
    for (const scheme of schemes) {
      const classCode = normalizeClassToCode(scheme.classCode);
      const className = normalizeClassToFullName(scheme.classCode);
      const schemeSubjects = scheme.subjects || [];

      for (const subName of schemeSubjects) {
        const existsInRoutine = routineSubjects.some(
          (s) =>
            s.className &&
            normalizeClassToCode(s.className) === classCode &&
            isSameSubject(s.name, subName)
        );

        if (!existsInRoutine) {
          const lower = subName.toLowerCase();
          const isLab = lower.includes("lab") || lower.includes("practical");
          subjectsToUpsert.push({
            id: crypto.randomUUID(),
            name: subName,
            className,
            periodsPerWeek: isLab ? 2 : 5,
            isLab,
            isHard: false,
            timePref: "any",
            allowMultiplePerDay: false,
            maxPerDay: 1,
            stream: detectSubjectStream(subName),
          });
        }
      }
    }

    if (subjectsToUpsert.length > 0) {
      await batchUpsertSubjectsDb(subjectsToUpsert);
      window.dispatchEvent(new Event("sms_routine_state_updated"));
    }

    // 2. From Routine -> Marks Schemes
    const updatedSchemes = schemes.map((scheme) => {
      const classCode = normalizeClassToCode(scheme.classCode);
      const existingSubjects = [...(scheme.subjects || [])];
      let schemeChanged = false;

      const matchingRoutineSubjs = routineSubjects.filter(
        (s) => s.className && normalizeClassToCode(s.className) === classCode
      );

      for (const rSub of matchingRoutineSubjs) {
        if (!existingSubjects.some((s) => isSameSubject(s, rSub.name))) {
          existingSubjects.push(rSub.name);
          schemeChanged = true;
          marksSchemesChanged = true;
        }
      }

      if (schemeChanged) {
        return {
          ...scheme,
          subjects: existingSubjects,
          subjectCount: existingSubjects.length,
        };
      }
      return scheme;
    });

    if (marksSchemesChanged) {
      saveMarksSchemes(updatedSchemes);
    }
  } catch (err) {
    console.warn("syncAllSubjectsBidirectional error:", err);
  }
}

