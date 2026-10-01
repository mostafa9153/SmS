/**
 * Single Source of Truth for Routine Calculations & Domain Heuristics
 */

import {
  getClassStreamList,
  getSchoolConfiguredStreams,
} from "@/lib/utils/school-profile";
import { getDynamicClassList } from "@/lib/ems/ems-config-loader";
import { RoutineClass, RoutineSettings, RoutineSubject, RoutineTeacher } from "./types";

export const HS_STREAM_PRESETS: Record<"Common" | "Science" | "Commerce" | "Arts", string[]> = {
  Common: ["Bengali", "English", "Environmental Studies", "Alternative English", "Hindi", "Urdu"],
  Science: ["Physics", "Chemistry", "Mathematics", "Biological Sciences", "Computer Science", "Nutrition", "Statistics"],
  Commerce: ["Accountancy", "Business Studies", "Economics", "Costing and Taxation", "Commercial Law", "Computer Application"],
  Arts: ["History", "Geography", "Political Science", "Philosophy", "Education", "Sociology", "Sanskrit", "Arabic"],
};

export const PRESET_STREAMS = ["General", "Science", "Arts", "Commerce", "Vocational"] as const;

/**
 * Standardizes delimiter formatting for section key (e.g. "Class 10::A")
 */
export function toSectionKey(className: string, section: string): string {
  return `${(className || "").trim()}::${(section || "").trim()}`;
}

/**
 * Standardizes delimiter formatting for class subject key (e.g. "Class 10::Math")
 */
export function toClassSubjectKey(className: string, subjectName: string): string {
  return `${(className || "").trim()}::${(subjectName || "").trim()}`;
}

/**
 * Standardizes delimiter formatting for section-subject key (e.g. "Class 10::A::Math" or "Class 10::Math")
 */
export function toSubjectKey(
  className: string,
  section: string | null | undefined,
  subjectName: string
): string {
  const cls = (className || "").trim();
  const sub = (subjectName || "").trim();
  const sec = (section || "").trim();
  if (!sec || sec.toUpperCase() === "ALL" || sec.toUpperCase() === "GENERAL") {
    return `${cls}::${sub}`;
  }
  return `${cls}::${sec}::${sub}`;
}

/**
 * Safely retrieves configured weekly periods for a teacher on a specific subject,
 * with full backwards compatibility across legacy delimiters (::, -, _).
 */
export function getTeacherSubjectPeriod(
  teacher: RoutineTeacher,
  className: string,
  section: string,
  subjectName: string,
  fallbackDefault?: number
): number {
  const cls = (className || "").trim();
  const sec = (section || "").trim();
  const sub = (subjectName || "").trim();

  // 1. Direct section-subject specific overrides
  const specificVal =
    teacher.subjectPeriods?.[`${cls}::${sec}::${sub}`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}::${sub}`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}::${sub}`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}-${sub}`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}_${sub}`];
  if (specificVal !== undefined && specificVal !== null && Number(specificVal) > 0) {
    return Number(specificVal);
  }

  // 2. Class-subject general override
  const clsVal =
    teacher.subjectPeriods?.[`${cls}::${sub}`] ??
    teacher.subjectPeriods?.[`${cls}-${sub}`] ??
    teacher.subjectPeriods?.[`${cls}_${sub}`];
  if (clsVal !== undefined && clsVal !== null && Number(clsVal) > 0) {
    return Number(clsVal);
  }

  // 3. Section direct period
  const secPeriod =
    teacher.sectionPeriods?.[`${cls}::${sec}`] ??
    teacher.sectionPeriods?.[`${cls}-${sec}`] ??
    teacher.sectionPeriods?.[`${cls}_${sec}`];
  if (secPeriod !== undefined && secPeriod !== null && Number(secPeriod) > 0) {
    return Number(secPeriod);
  }

  // 4. Class direct period
  const clsPeriod = teacher.classPeriods?.[cls];
  if (clsPeriod !== undefined && clsPeriod !== null && Number(clsPeriod) > 0) {
    return Number(clsPeriod);
  }

  return fallbackDefault ?? 5;
}

/**
 * Safely retrieves section period override with backwards compatibility
 */
export function getTeacherSectionPeriod(
  teacher: RoutineTeacher,
  className: string,
  section: string
): number | undefined {
  const cls = (className || "").trim();
  const sec = (section || "").trim();
  return (
    teacher.sectionPeriods?.[`${cls}::${sec}`] ??
    teacher.sectionPeriods?.[`${cls}-${sec}`] ??
    teacher.sectionPeriods?.[`${cls}_${sec}`]
  );
}

/**
 * Safely retrieves section subjects with backwards compatibility and class fallback
 */
export function getTeacherSectionSubjects(
  teacher: RoutineTeacher,
  className: string,
  section: string
): string[] {
  const cls = (className || "").trim();
  const sec = (section || "").trim();
  const list =
    teacher.sectionSubjects?.[`${cls}::${sec}`] ??
    teacher.sectionSubjects?.[`${cls}-${sec}`] ??
    teacher.sectionSubjects?.[`${cls}_${sec}`] ??
    teacher.classSubjects?.[cls] ??
    [];
  return list;
}

/**
 * Parses raw section string like "A (Science)", "Science", or "A - Science" into section and stream
 */
export function parseSectionAndStream(rawSection: string): { section: string; stream: string } {
  const trimmed = (rawSection || "").trim();
  const parenMatch = trimmed.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    return { section: parenMatch[1].trim(), stream: parenMatch[2].trim() };
  }
  const dashMatch = trimmed.match(/^(.*?)\s*-\s*(Science|Arts|Commerce|Vocational|General)$/i);
  if (dashMatch) {
    return { section: dashMatch[1].trim(), stream: dashMatch[2].trim() };
  }
  if (["Science", "Arts", "Commerce", "Vocational"].includes(trimmed)) {
    return { section: "A", stream: trimmed };
  }
  return { section: trimmed || "A", stream: "General" };
}

/**
 * Formats section and stream into standard display label
 */
export function formatSectionAndStream(sec: string, str: string): string {
  const cleanSec = (sec || "A").trim();
  const cleanStr = (str || "General").trim();
  if (cleanStr === "General" || cleanStr === "None" || cleanStr === "N/A" || !cleanStr) {
    return cleanSec;
  }
  return `${cleanSec} (${cleanStr})`;
}

/**
 * Checks if a class is an Higher Secondary (XI / XII / 11 / 12) class
 */
export function isHsClass(className: string, code?: string): boolean {
  const norm = (code || className || "").trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  return (
    ["XI", "XII", "11", "12"].includes(norm) ||
    className.toUpperCase().includes("XI") ||
    className.toUpperCase().includes("XII")
  );
}

/**
 * Heuristic to detect stream based on subject name or explicit stream tag
 */
export function detectSubjectStream(
  name: string,
  explicitStream?: string | null
): "Common" | "Science" | "Commerce" | "Arts" | "General" {
  if (explicitStream && ["Common", "Science", "Commerce", "Arts", "General"].includes(explicitStream)) {
    return explicitStream as any;
  }
  const lower = (name || "").trim().toLowerCase();

  // Exclude junior general school subjects before checking keywords
  if (
    lower.startsWith("environment &") ||
    lower.includes("our environment") ||
    lower.includes("health & physical") ||
    lower.includes("work education") ||
    lower.includes("art & work")
  ) {
    return "General";
  }

  if (
    lower.includes("bengali") ||
    lower.includes("english") ||
    lower.includes("environmental") ||
    lower.includes("hindi") ||
    lower.includes("urdu")
  ) {
    return "Common";
  }
  if (
    lower.includes("physics") ||
    lower.includes("chemistry") ||
    lower.includes("math") ||
    lower.includes("biology") ||
    lower.includes("biological") ||
    lower.includes("nutrition") ||
    lower.includes("statistics") ||
    lower.includes("computer science")
  ) {
    return "Science";
  }
  if (
    lower.includes("account") ||
    lower.includes("business") ||
    lower.includes("costing") ||
    lower.includes("taxation") ||
    lower.includes("commercial law") ||
    lower.includes("computer application")
  ) {
    return "Commerce";
  }
  if (
    lower.includes("history") ||
    lower.includes("geography") ||
    lower.includes("political") ||
    lower.includes("philosophy") ||
    lower.includes("education") ||
    lower.includes("sociology") ||
    lower.includes("sanskrit") ||
    lower.includes("arabic") ||
    lower.includes("music") ||
    lower.includes("psychology") ||
    lower.includes("journalism")
  ) {
    return "Arts";
  }
  return "General";
}

/**
 * Resolves streams configured in School Profile for a given HS class
 */
export function getConfiguredStreamsForClass(className: string): Array<"Science" | "Commerce" | "Arts"> {
  if (typeof window === "undefined") return ["Arts"];
  const dynamicClasses = getDynamicClassList();
  const cleanCode = className.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const target = dynamicClasses.find(
    (c: any) =>
      c.code.toUpperCase() === cleanCode ||
      c.name.toUpperCase().includes(cleanCode) ||
      c.name.toLowerCase() === className.toLowerCase()
  );

  let rawStreams: string[] = [];
  if (target?.streamSections && Object.keys(target.streamSections).length > 0) {
    rawStreams = Object.keys(target.streamSections);
  } else if (target?.stream && target.stream.trim()) {
    rawStreams = getClassStreamList(target.stream);
  } else {
    rawStreams = getSchoolConfiguredStreams();
  }

  const result: Array<"Science" | "Commerce" | "Arts"> = [];
  rawStreams.forEach((s) => {
    const lower = s.trim().toLowerCase();
    if ((lower.includes("sci") || lower.includes("science")) && !result.includes("Science")) {
      result.push("Science");
    }
    if ((lower.includes("com") || lower.includes("commerce")) && !result.includes("Commerce")) {
      result.push("Commerce");
    }
    if ((lower.includes("art") || lower.includes("humanities")) && !result.includes("Arts")) {
      result.push("Arts");
    }
  });

  return result.length > 0 ? result : ["Arts"];
}

/**
 * Filters subjects appropriate for a given class and section/stream
 */
export function filterSubjectsForClassStream(
  subjects: RoutineSubject[],
  className: string,
  section?: string
): RoutineSubject[] {
  const clsLower = (className || "").trim().toLowerCase();
  const isHs = isHsClass(className);

  const classSubs = subjects.filter(
    (s) => !s.className || s.className.trim().toLowerCase() === clsLower
  );

  if (!isHs) {
    return classSubs;
  }

  const { stream: parsedStream } = parseSectionAndStream(section || "");
  const configuredStreams = getConfiguredStreamsForClass(className);
  const targetStream =
    parsedStream && parsedStream.toLowerCase() !== "general" && parsedStream.toLowerCase() !== "all"
      ? parsedStream
      : configuredStreams[0] || "Arts";

  return classSubs.filter((s) => {
    const detStream = detectSubjectStream(s.name, s.stream);
    return (
      detStream === "Common" ||
      Boolean(s.isCommon) ||
      detStream.toLowerCase() === targetStream.toLowerCase()
    );
  });
}

/**
 * Calculates total teaching periods capacity in a week for a specific class
 */
export function calculateClassWeeklyCapacity(
  cls: RoutineClass,
  settings?: RoutineSettings | null
): number {
  const workingDays =
    settings && Array.isArray(settings.workingDays) && settings.workingDays.length > 0
      ? settings.workingDays
      : [0, 1, 2, 3, 4, 5];
  const periodsPerDay = (settings && Number(settings.periodsPerDay)) || 8;
  const cLimit =
    cls && cls.dailyPeriods && cls.dailyPeriods >= 1 ? cls.dailyPeriods : periodsPerDay;
  const halfDays = (settings && Array.isArray(settings.halfDays) ? settings.halfDays : [5]);
  const halfDayPeriods = (settings && Number(settings.halfDayPeriods)) || 4;

  let totalSlots = 0;
  for (const d of workingDays) {
    const isHalf = halfDays.includes(d);
    const dayMax = isHalf ? Math.min(halfDayPeriods, cLimit) : cLimit;
    totalSlots += dayMax;
  }
  return totalSlots;
}

/**
 * Auto-generates initials / short code from full name
 */
export function generateInitials(name: string): string {
  const words = (name || "").trim().split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (name || "").slice(0, 3).toUpperCase();
}
