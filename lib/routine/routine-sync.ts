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
 * Every key the class preset may store a section's class teacher under. An HS stream section
 * ("A (Science)") has its own keys and never the bare letter, so one stream never inherits another's teacher.
 */
export function sectionTeacherKeys(section: string): string[] {
  const clean = section.trim().replace(/^Section\s+/i, "");
  const m = clean.match(/^(.+?)\s*\((.+)\)$/);
  if (!m) return [clean, `Section ${clean}`];
  const [, sec, st] = m;
  return [`${sec} (${st})`, `${st} - ${sec}`, `${st} - Section ${sec}`, `Sec ${sec} (${st})`, `${st}::${sec}`];
}

/**
 * Sync from Classes tab (School Details) to Routine Teachers tab & Database
 */
export async function syncClassTeachersToRoutine(
  className: string,
  sectionTeachers: Record<string, string>,
  allSections: string[],
  streamSections?: Record<string, string[]>
): Promise<void> {
  const local = getLocalRoutineState() || {};
  const teachers: RoutineTeacher[] = local && local.teachers ? [...local.teachers] : [];
  const clean = (s: string) => s.trim().replace(/^Section\s+/i, "");
  const lookup = (section: string) =>
    (sectionTeacherKeys(section).map((k) => sectionTeachers[k]).find(Boolean) || "").trim();

  // HS classes get one class teacher per stream section ("A (Science)"), others one per section
  const targets = streamSections && Object.keys(streamSections).length > 0
    ? Object.entries(streamSections).flatMap(([st, secs]) => secs.map((sec) => `${clean(sec)} (${st})`))
    : allSections.map(clean);

  for (const section of targets) {
    const targetLabel = formatClassSectionLabel(className, section);
    const assignedTeacherName = lookup(section);

    // 1. Clear any teacher previously holding this label who is no longer assigned
    for (const t of teachers) {
      if (t.classTeacherOf && (
        t.classTeacherOf.toLowerCase() === targetLabel.toLowerCase() ||
        t.classTeacherOf.toLowerCase() === `${className} - ${section}`.toLowerCase()
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

  // A stream-less HS label ("Class XI - Section A") left from before streams counted is dropped
  // unless its holder was just given a stream section above.
  if (streamSections && Object.keys(streamSections).length > 0) {
    for (const t of teachers) {
      const parsed = parseClassSectionLabel(t.classTeacherOf);
      if (parsed && parsed.className.toLowerCase() === className.toLowerCase() && !parsed.section.includes("(")) {
        t.classTeacherOf = null;
        await upsertTeacherAvailabilityDb(t);
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
            const keys = sectionTeacherKeys(parsedPrev.section);
            if (keys.some((k) => nextSecTeachers[k]?.toLowerCase() === teacherName.toLowerCase())) {
              keys.forEach((k) => delete nextSecTeachers[k]);
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
            sectionTeacherKeys(parsedNew.section).forEach((k) => (nextSecTeachers[k] = teacherName));
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
    // Allotments and elective-group options cascade with the row: checked in the database (null = unknown)
    const usage = await subjectUsage(createClient(), [...candidateIds]);
    const isAssignedInTimetable =
      !usage ||
      usage.cascades.size > 0 ||
      assignments.some((a) => candidateIds.has(a.subjectId));
    // Teachers tick subjects by name, so while the subject stays under another stream of this
    // class (Bengali moved from Common to Arts) their ticks still point at a row: only this
    // stream's row goes. Rows with allotments are kept, since deleting one cascades them away.
    const survivesElsewhere = currentSubjects.some(
      (s) =>
        s.id &&
        !candidateIds.has(s.id) &&
        s.className &&
        normalizeClassToCode(s.className) === targetCode &&
        isSameSubject(s.name, subjectName)
    );

    if (isAssignedInTimetable || (assignedTeacher && !survivesElsewhere)) {
      const teacherInfo = assignedTeacher ? ` (assigned to ${assignedTeacher.name})` : "";
      showToast({
        type: "warning",
        title: "Subject Retained in Routine",
        description: `"${subjectName}"${stream ? ` (${stream})` : ""} for ${className} is currently assigned to teachers or a subject group in Routine${teacherInfo}. Remove it there first, then remove it again.`,
      });
      return;
    }

    const inRoutine = usage.inRoutine.size > 0;

    // Safe to delete from routine_subjects
    for (const c of candidates) await deleteSubjectDb(c.id);
    window.dispatchEvent(new Event("sms_routine_state_updated"));

    showToast({
      type: inRoutine ? "warning" : "info",
      title: "Subject Removed from Routine",
      description: `"${subjectName}"${stream ? ` (${stream})` : ""} was removed from ${className} in Routine.${
        inRoutine ? " The current routine still shows it: generate the routine again." : ""
      }`,
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
/** removedCount: rows dropped for streams the preset no longer lists; inRoutine: of those, ones the active routine used. */
type SubjectSyncResult = { addedCount: number; removedCount: number; inRoutine: number };

/**
 * How far the sync may remove HS rows under a stream the preset no longer lists:
 * - "off": add and update only (the preset copy may be old: never delete on it)
 * - "safe": also remove rows nothing uses, keeping rows the active routine schedules (page load)
 * - "all": also remove rows the active routine schedules; the caller tells the user to regenerate
 */
export type SubjectPrune = "off" | "safe" | "all";
const PRUNE_RANK: Record<SubjectPrune, number> = { off: 0, safe: 1, all: 2 };
let subjectSyncInFlight: { prune: SubjectPrune; run: Promise<SubjectSyncResult> } | null = null;

export function syncAllSubjectsFromPresetsToRoutine(opts: { prune?: SubjectPrune } = {}): Promise<SubjectSyncResult> {
  const prune = opts.prune ?? "off";
  // A run already going covers this call unless it prunes less than this call asks for
  if (subjectSyncInFlight && PRUNE_RANK[subjectSyncInFlight.prune] >= PRUNE_RANK[prune]) return subjectSyncInFlight.run;
  const before = subjectSyncInFlight?.run.catch(() => undefined) ?? Promise.resolve();
  const run: Promise<SubjectSyncResult> = before
    .then(() => runSubjectSync(prune))
    .finally(() => {
      if (subjectSyncInFlight?.run === run) subjectSyncInFlight = null;
    });
  subjectSyncInFlight = { prune, run };
  return run;
}

async function runSubjectSync(prune: SubjectPrune): Promise<SubjectSyncResult> {
  if (typeof window === "undefined") return { addedCount: 0, removedCount: 0, inRoutine: 0 };

  try {
    const schemes = getSavedMarksSchemes();
    if (!schemes || schemes.length === 0) return { addedCount: 0, removedCount: 0, inRoutine: 0 };

    const supabase = createClient();
    const { data: dbSubjects } = await supabase.from("routine_subjects").select("*").not("class_name", "is", null);
    const routineSubjects = dbSubjects || [];

    const toUpsert: any[] = [];
    const idsToDelete: string[] = [];
    const queuedKeys = new Set<string>();
    const wanted: WantedStreams = new Map();

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
        if (isHs) noteWantedStreams(wanted, classCode, cleanTarget, scheme.subjectStreams);

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

        if (!isPresetSubject && hasFullVersionInPreset && !toUpsert.some((u) => u.id === rSub.id)) {
          idsToDelete.push(rSub.id);
        }
      }
    }

    // HS rows under a stream the preset no longer lists for that subject (Bengali taken off Common
    // and put under Arts) go, unless allotments or groups still use them
    const stale = prune === "off" ? [] : staleStreamRows(routineSubjects, wanted, toUpsert);
    const usage = await subjectUsage(supabase, [...new Set([...idsToDelete, ...stale])]);
    const deletable = usage
      ? [...new Set([...idsToDelete, ...stale])].filter(
          (id) => !usage.cascades.has(id) && (prune === "all" || !usage.inRoutine.has(id))
        )
      : [];
    const removed = stale.filter((id) => deletable.includes(id));

    if (deletable.length > 0) {
      await softWrite(supabase.from("routine_subjects").delete().in("id", deletable), "routine_subjects delete");
    }

    if (toUpsert.length > 0) {
      await batchUpsertSubjectsDb(toUpsert);
    }

    // Do NOT dispatch sms_routine_state_updated here to avoid infinite render/fetch loops
    // callers can refresh their local state or trigger UI reload as needed

    return {
      addedCount: toUpsert.length,
      removedCount: removed.length,
      inRoutine: usage ? removed.filter((id) => usage.inRoutine.has(id)).length : 0,
    };
  } catch (err) {
    console.warn("syncAllSubjectsFromPresetsToRoutine error:", err);
    return { addedCount: 0, removedCount: 0, inRoutine: 0 };
  }
}

/** classCode → subject (lower case) → streams the preset puts it under; null = no saved streams. */
export type WantedStreams = Map<string, Map<string, Set<string> | null>>;

/**
 * Several schemes can list one class: a subject is only pruned by stream when every scheme that
 * lists it saved its streams (a scheme relying on the name heuristic keeps all its rows).
 */
export function noteWantedStreams(
  wanted: WantedStreams,
  classCode: string,
  subject: string,
  saved: Record<string, string[]> | undefined
) {
  const key = subject.trim().toLowerCase();
  const perClass = wanted.get(classCode) || new Map<string, Set<string> | null>();
  wanted.set(classCode, perClass);
  const streams = Object.entries(saved || {}).find(([k]) => k.trim().toLowerCase() === key)?.[1];
  if (!streams || streams.length === 0) {
    perClass.set(key, null);
    return;
  }
  const prev = perClass.get(key);
  if (prev === null) return;
  const next = prev || new Set<string>();
  streams.forEach((s) => next.add(s.trim().toLowerCase()));
  perClass.set(key, next);
}

/** Routine rows whose stream the preset no longer lists for that subject (rows being saved are kept). */
export function staleStreamRows(
  rows: { id: string; name: string; class_name?: string | null; stream?: string | null }[],
  wanted: WantedStreams,
  keep: { id?: string }[] = []
): string[] {
  const kept = new Set(keep.map((k) => k.id).filter(Boolean));
  const out: string[] = [];
  for (const r of rows) {
    if (!r.class_name || kept.has(r.id) || isUnsetStream(r.stream)) continue;
    const streams = wanted.get(normalizeClassToCode(r.class_name))?.get(r.name.trim().toLowerCase());
    if (!streams) continue;
    if (!streams.has((r.stream || "").trim().toLowerCase())) out.push(r.id);
  }
  return out;
}

/**
 * What still uses these subject rows: `cascades` = allotments and group options (deleting the row
 * would cascade them away, so it is never deleted); `inRoutine` = cells of the active routine (its
 * viewers would show "?" until it is generated again). null when unknown: delete nothing.
 */
async function subjectUsage(
  supabase: ReturnType<typeof createClient>,
  ids: string[]
): Promise<{ cascades: Set<string>; inRoutine: Set<string> } | null> {
  if (ids.length === 0) return { cascades: new Set(), inRoutine: new Set() };
  const [a, g, active] = await Promise.all([
    supabase.from("routine_assignments").select("subject_id").in("subject_id", ids),
    supabase.from("routine_subject_group_options").select("subject_id").in("subject_id", ids),
    activeRoutineSubjectIds(supabase),
  ]);
  if (a.error || g.error || !active) return null;
  return {
    cascades: new Set([...(a.data || []), ...(g.data || [])].map((r: { subject_id: string }) => r.subject_id)),
    inRoutine: new Set(ids.filter((id) => active.has(id))),
  };
}

/**
 * Subject ids the active routine's grid points at (cell `sid` and its options'); null when unknown.
 * Only the active one: a curriculum change is meant to be followed by a new routine, and guarding
 * every saved version would keep a moved subject's old row forever.
 */
async function activeRoutineSubjectIds(supabase: ReturnType<typeof createClient>): Promise<Set<string> | null> {
  const { data, error } = await supabase.from("routine_generated_cache").select("grid").eq("is_active", true);
  if (error) return null;
  const ids = new Set<string>();
  (data || []).forEach((r: { grid: unknown }) => collectSids(r.grid, ids));
  return ids;
}

export function collectSids(v: unknown, out: Set<string>): void {
  if (!v || typeof v !== "object") return;
  if (Array.isArray(v)) {
    v.forEach((x) => collectSids(x, out));
    return;
  }
  const o = v as Record<string, unknown>;
  if (typeof o.sid === "string") out.add(o.sid);
  Object.values(o).forEach((x) => collectSids(x, out));
}

/**
 * A stream picked for a subject in the Routine tab is written back to the preset, so the preset
 * (the source the sync follows) agrees and the next sync keeps the row. Only subjects whose preset
 * entry already lists streams are touched; the exam marks subject list never changes here.
 * `from` is the stream the row had before (edit) and `to` the new one; `to` null removes `from`.
 */
export function syncRoutineStreamToPreset(className: string, subjectName: string, from: string | null, to: string | null): void {
  if (typeof window === "undefined" || !isHsClass(className)) return;
  const known = (x: string | null) => (x && ["common", "science", "commerce", "arts"].includes(x.trim().toLowerCase()) ? x.trim() : null);
  const prev = known(from);
  const next = known(to);
  if ((prev || "").toLowerCase() === (next || "").toLowerCase()) return;
  const code = normalizeClassToCode(className);
  const target = subjectName.trim().toLowerCase();
  let changed = false;
  const schemes = getSavedMarksSchemes().map((s) => {
    if (normalizeClassToCode(s.classCode) !== code) return s;
    // The preset's own spelling: a saved streams entry, else the subject list (streams from the name)
    const key =
      Object.keys(s.subjectStreams || {}).find((k) => k.trim().toLowerCase() === target) ??
      (s.subjects || []).find((n) => n.trim().toLowerCase() === target);
    if (!key) return s;
    const cur = schemeSubjectStreams(s, key);
    let streams = prev ? cur.filter((x) => x.toLowerCase() !== prev.toLowerCase()) : cur;
    if (next && !streams.some((x) => x.toLowerCase() === next.toLowerCase())) streams = [...streams, next];
    // The last stream of a subject is removed from the preset itself, never from here
    if (streams.length === 0) return s;
    if (streams.length === cur.length && streams.every((x, i) => x === cur[i])) return s;
    changed = true;
    return { ...s, subjectStreams: { ...(s.subjectStreams || {}), [key]: streams } };
  });
  if (changed) saveMarksSchemes(schemes, { undo: false });
}

/**
 * The server's preset equals the copy this device had before loading it (keys in any order: the
 * server stores JSONB). Only then is the preset certain enough to delete routine rows on: a copy
 * that differs may be an edit still saving, a failed save or another device's newer change.
 */
export function presetMatchesLocal(server: unknown, localRaw: string | null): boolean {
  if (!Array.isArray(server) || !localRaw) return false;
  try {
    return canonicalJson(server) === canonicalJson(JSON.parse(localRaw));
  } catch {
    return false;
  }
}

function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** The raw saved preset on this device, read before a server load overwrites it. */
export function localPresetRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("sms_marks_distribution_schemes");
  } catch {
    return null;
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
