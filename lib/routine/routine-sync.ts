import { createClient } from "@/lib/supabase/client";
import { RoutineTeacher, RoutineSubject, RoutineClass } from "./types";
import {
  getLocalRoutineState,
  setLocalRoutineState,
  upsertTeacherAvailabilityDb,
  upsertSubjectDb,
  batchUpsertSubjectsDb,
  batchUpsertClassesDb,
  deleteSubjectDb,
} from "@/lib/supabase/db-routine";
import {
  getSavedMarksSchemes,
  saveMarksSchemes,
  isSubjectLab,
} from "@/lib/utils/marks-config";
import {
  detectSubjectStream,
  formatSectionAndStream,
  isHsClass,
  parseSectionAndStream,
  presetSectionItems,
  schemeSubjectStreams,
} from "./routine-helpers";
import { showToast } from "@/components/ui/toast-banner";
import { softWrite } from "@/lib/supabase/write";

interface SyncClassItem {
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
function normalizeClassToFullName(cls?: string | null): string {
  const code = normalizeClassToCode(cls);
  return `Class ${code}`;
}

/**
 * Checks if two subject names are conceptually the same
 * e.g. "Bengali" and "Bengali (1st Language)" or "Mathematics" and "Mathematics"
 */
function isSameSubject(a: string, b: string): boolean {
  if (!a || !b) return false;
  const clean = (s: string) => s.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
  const cleanA = clean(a);
  const cleanB = clean(b);
  return cleanA === cleanB || a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Sync from Routine Subjects -> Marks Schemes (School Details & Exam Marks)
 */
function syncRoutineSubjectToMarksSchemes(subj: {
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
function syncBatchRoutineSubjectsToMarksSchemes(
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
        const currentSubjs = [...(scheme.subjects || [])];
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

/** Same stream, case-insensitive. */
function sameStream(a?: string | null, b?: string | null): boolean {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
}
/** A routine row saved before streams were stored: no stream or the "General" default. */
const isUnsetStream = (x?: string | null) => !x || x.trim().toLowerCase() === "general";

/**
 * Sync single Subject from School Details / Exam Marks (Marks Schemes) -> Routine Subjects.
 * With `stream` (HS add): one routine row per subject per stream; a row saved without a stream is
 * upgraded instead of duplicated. Without `stream` (lab toggle): every row of that subject is updated.
 */
export async function syncMarksSchemeSubjectToRoutine(
  classCode: string,
  subjectName: string,
  isLabExplicit?: boolean,
  stream?: string
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

    // "Bengali" and "Bengali (1st Language)" are the same subject: a row is renamed, not duplicated
    const sameName = (dbSubjects || []).filter((s: any) => isSameSubject(s.name, cleanName));

    const schemes = getSavedMarksSchemes();
    const targetScheme = schemes.find((s) => normalizeClassToCode(s.classCode) === normalizeClassToCode(classCode));
    const isLab = isLabExplicit !== undefined ? isLabExplicit : isSubjectLab(targetScheme, cleanName);
    const theoryPeriods = isLab ? 4 : 5;
    const labPeriods = isLab ? 2 : 0;
    const totalPeriods = theoryPeriods + labPeriods;

    const needsUpdate = (row: any, rowStream: string | null) =>
      row.is_lab !== isLab || row.name.trim() !== cleanName || !sameStream(row.stream, rowStream);

    const updateRow = (row: any, rowStream: string | null) => {
      const labChanged = row.is_lab !== isLab;
      return upsertSubjectDb({
        id: row.id,
        name: cleanName,
        className,
        periodsPerWeek: labChanged ? totalPeriods : row.periods_per_week || totalPeriods,
        theoryPeriods: labChanged ? theoryPeriods : row.theory_periods || theoryPeriods,
        labPeriods: labChanged ? labPeriods : row.lab_periods ?? labPeriods,
        isLab,
        isHard: Boolean(row.is_hard),
        timePref: row.time_pref || "any",
        allowMultiplePerDay: Boolean(row.allow_multiple_per_day) || isLab,
        maxPerDay: row.max_per_day || (isLab ? 2 : 1),
        stream: rowStream,
      });
    };

    if (stream === undefined) {
      if (sameName.length > 0) {
        const changed = sameName.filter((row: any) => needsUpdate(row, row.stream ?? null));
        for (const row of changed) await updateRow(row, row.stream ?? null);
        if (changed.length) window.dispatchEvent(new Event("sms_routine_state_updated"));
        return;
      }
    } else {
      const match =
        sameName.find((row: any) => sameStream(row.stream, stream)) ||
        sameName.find((row: any) => isUnsetStream(row.stream));
      if (match) {
        if (needsUpdate(match, stream)) {
          await updateRow(match, stream);
          window.dispatchEvent(new Event("sms_routine_state_updated"));
        }
        return;
      }
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
      stream: stream ?? schemeSubjectStreams(targetScheme, cleanName)[0] ?? null,
    };

    await upsertSubjectDb(newSubject);
    window.dispatchEvent(new Event("sms_routine_state_updated"));

    showToast({
      type: "success",
      title: "Subject Synced to Routine",
      description: `"${cleanName}"${stream ? ` (${stream})` : ""} was added to ${className} (${isLab ? "4 Th + 2 Lab = 6 p/wk" : "5 p/wk"}) in Routine.`,
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
  subjectName: string,
  stream?: string
): Promise<void> {
  if (typeof window === "undefined" || !subjectName.trim()) return;

  try {
    const targetCode = normalizeClassToCode(classCode);
    const className = normalizeClassToFullName(classCode);
    const local = getLocalRoutineState();
    const currentSubjects: RoutineSubject[] = local?.subjects || [];
    const teachers: RoutineTeacher[] = local?.teachers || [];
    const assignments: any[] = local?.assignments || [];

    // Without a stream the subject left the class entirely: every stream's row goes
    const candidates = currentSubjects.filter(
      (s) =>
        s.id &&
        s.className &&
        normalizeClassToCode(s.className) === targetCode &&
        isSameSubject(s.name, subjectName) &&
        (stream === undefined || sameStream(s.stream, stream))
    );

    if (candidates.length === 0) return;

    // Safety Guard: Check if any teacher is assigned to this subject for this class
    const cleanSubLower = subjectName.trim().toLowerCase();
    const cleanSubTrimmed = cleanSubLower.replace(/\s*\((theory|lab|practical)\)/i, "").trim();
    const isMatch = (s: string) => {
      const sLower = s.trim().toLowerCase();
      const sClean = sLower.replace(/\s*\((theory|lab|practical)\)/i, "").trim();
      return sLower === cleanSubLower || sClean === cleanSubTrimmed || sClean === cleanSubLower;
    };
    const assignedTeacher = teachers.find((t) => {
      const classSubs = t.classSubjects?.[className] || t.classSubjects?.[classCode] || [];
      if (classSubs.some(isMatch)) {
        return true;
      }
      if (t.sectionSubjects) {
        for (const [key, subs] of Object.entries(t.sectionSubjects)) {
          if (
            (key.startsWith(`${className}::`) || key.startsWith(`${classCode}::`)) &&
            subs.some(isMatch)
          ) {
            return true;
          }
        }
      }
      return false;
    });

    const candidateIds = new Set(candidates.map((c) => c.id));
    const isAssignedInTimetable = assignments.some((a) => candidateIds.has(a.subjectId));

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
    for (const c of candidates) await deleteSubjectDb(c.id);
    window.dispatchEvent(new Event("sms_routine_state_updated"));

    showToast({
      type: "info",
      title: "Subject Removed from Routine",
      description: `"${subjectName}"${stream ? ` (${stream})` : ""} was removed from ${className} in Routine.`,
    });
  } catch (err) {
    console.warn("syncRemoveMarksSchemeSubjectFromRoutine error:", err);
  }
}

/**
 * Sync all subjects from Presets (/settings/presets?section=marks_scheme) to Routine Subjects
 */
// Single-flight: page auto-sync, strict-mode double effects and the manual button must not
// run concurrently, otherwise each run misses the other's inserts and creates duplicate subjects.
let subjectSyncInFlight: Promise<{ addedCount: number }> | null = null;

export function syncAllSubjectsFromPresetsToRoutine(): Promise<{ addedCount: number }> {
  if (!subjectSyncInFlight) {
    subjectSyncInFlight = runSubjectSync().finally(() => {
      subjectSyncInFlight = null;
    });
  }
  return subjectSyncInFlight;
}

async function runSubjectSync(): Promise<{ addedCount: number }> {
  if (typeof window === "undefined") return { addedCount: 0 };

  try {
    const schemes = getSavedMarksSchemes();
    if (!schemes || schemes.length === 0) return { addedCount: 0 };

    const supabase = createClient();
    const { data: dbSubjects } = await supabase.from("routine_subjects").select("*").not("class_name", "is", null);
    const routineSubjects = dbSubjects || [];

    const toUpsert: any[] = [];
    const idsToDelete: string[] = [];
    const queuedKeys = new Set<string>();

    for (const scheme of schemes) {
      const classCode = normalizeClassToCode(scheme.classCode);
      const className = normalizeClassToFullName(scheme.classCode);
      const schemeSubjects = scheme.subjects || [];

      const isHs = isHsClass(className);
      // Rows already claimed by a stream in this run, so two streams never share one legacy row
      const claimed = new Set<string>();

      for (const subName of schemeSubjects) {
        const cleanTarget = subName.trim();
        const isLab = isSubjectLab(scheme, cleanTarget);
        const theoryPeriods = isLab ? 4 : 5;
        const labPeriods = isLab ? 2 : 0;
        const totalPeriods = theoryPeriods + labPeriods;
        // HS: one routine row per stream the subject was added under; other classes: one row
        const streams: (string | null)[] = isHs
          ? schemeSubjectStreams(scheme, cleanTarget)
          : [detectSubjectStream(cleanTarget)];

        const classRows = routineSubjects.filter(
          (s: any) => s.class_name && normalizeClassToCode(s.class_name) === classCode
        );

        for (const stream of streams) {
          // Several schemes can list the same subject for one class: queue it once
          const queueKey = `${classCode}::${cleanTarget.toLowerCase()}::${isHs ? (stream || "").toLowerCase() : ""}`;
          if (queuedKeys.has(queueKey)) continue;
          queuedKeys.add(queueKey);

          const sameName = classRows.filter((s: any) => !claimed.has(s.id) && isSameSubject(s.name, cleanTarget));
          const exact = sameName.find(
            (s: any) => s.name.trim().toLowerCase() === cleanTarget.toLowerCase() && (!isHs || sameStream(s.stream, stream))
          );
          if (exact) {
            claimed.add(exact.id);
            continue;
          }
          const reuse = isHs
            ? sameName.find((s: any) => sameStream(s.stream, stream)) || sameName.find((s: any) => isUnsetStream(s.stream))
            : sameName[0];

          if (reuse) {
            claimed.add(reuse.id);
            toUpsert.push({
              id: reuse.id,
              name: cleanTarget,
              className,
              periodsPerWeek: reuse.periods_per_week || totalPeriods,
              theoryPeriods: reuse.theory_periods || theoryPeriods,
              labPeriods: reuse.lab_periods || labPeriods,
              isLab,
              isHard: Boolean(reuse.is_hard),
              timePref: reuse.time_pref || "any",
              allowMultiplePerDay: Boolean(reuse.allow_multiple_per_day) || isLab,
              maxPerDay: reuse.max_per_day || (isLab ? 2 : 1),
              stream: isHs ? stream : detectSubjectStream(cleanTarget, reuse.stream),
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
              stream,
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
      await softWrite(supabase.from("routine_subjects").delete().in("id", idsToDelete), "routine_subjects delete");
    }

    if (toUpsert.length > 0) {
      await batchUpsertSubjectsDb(toUpsert);
    }

    // Do NOT dispatch sms_routine_state_updated here to avoid infinite render/fetch loops
    // callers can refresh their local state or trigger UI reload as needed

    return { addedCount: toUpsert.length };
  } catch (err) {
    console.warn("syncAllSubjectsFromPresetsToRoutine error:", err);
    return { addedCount: 0 };
  }
}

/**
 * Routine sections follow the school preset (Settings → Classes & Sections): every preset
 * class / section / stream missing from routine_classes is created. Nothing is ever deleted here:
 * a section carries assignments, groups and generated routines, so a section the preset no longer
 * lists is only reported (see presetOrphanSections) and removed by the user with a confirm.
 */
export async function syncConfiguredClassesToRoutine(configuredClasses?: SyncClassItem[]): Promise<{ added: number }> {
  if (typeof window === "undefined") return { added: 0 };

  try {
    let rawClasses = configuredClasses;
    if (!rawClasses || rawClasses.length === 0) {
      const stored = localStorage.getItem("sms_class_management");
      if (stored) rawClasses = JSON.parse(stored);
    }
    // No saved preset yet: the fallback defaults must not create sections
    if (!Array.isArray(rawClasses) || rawClasses.length === 0) return { added: 0 };

    const supabase = createClient();
    const { data: rows, error } = await supabase.from("routine_classes").select("class_name, section");
    if (error) return { added: 0 };

    const have = new Set(
      (rows || []).map((r: { class_name: string; section: string }) => {
        const p = parseSectionAndStream(r.section || "");
        return sectionIdentity(r.class_name, p.section, p.stream);
      })
    );
    const missing = presetSectionItems(rawClasses).filter(
      (i) => !have.has(sectionIdentity(i.className, i.section, i.stream))
    );
    if (missing.length === 0) return { added: 0 };

    await batchUpsertClassesDb(
      missing.map((i) => ({
        className: i.className,
        section: formatSectionAndStream(i.section, i.stream),
        dailyPeriods: null,
      }))
    );
    window.dispatchEvent(new Event("sms_routine_state_updated"));
    showToast({
      type: "success",
      title: "Sections synced from preset",
      description: missing.map((i) => `${i.className} ${formatSectionAndStream(i.section, i.stream)}`).join(", "),
    });
    return { added: missing.length };
  } catch (err) {
    console.warn("syncConfiguredClassesToRoutine error:", err);
    return { added: 0 };
  }
}

function sectionIdentity(className: string, section: string, stream: string): string {
  const st = (stream || "general").trim().toLowerCase();
  return `${className.trim().toLowerCase()}::${section.trim().toLowerCase()}::${isHsClass(className) ? st : "general"}`;
}

/** Routine sections the preset no longer lists (only for classes the preset knows). */
export function presetOrphanSections(routineClasses: RoutineClass[], presetList: Parameters<typeof presetSectionItems>[0]): RoutineClass[] {
  const items = presetSectionItems(presetList);
  const known = new Set(items.map((i) => i.className.toLowerCase()));
  const wanted = new Set(items.map((i) => sectionIdentity(i.className, i.section, i.stream)));
  return routineClasses.filter((c) => {
    if (!known.has(c.className.trim().toLowerCase())) return false;
    const p = parseSectionAndStream(c.section || "");
    return !wanted.has(sectionIdentity(c.className, p.section, p.stream));
  });
}
