/**
 * Single Source of Truth for Routine Calculations & Domain Heuristics
 */

import {
  getClassStreamList,
  getSchoolConfiguredStreams,
} from "@/lib/utils/school-profile";
import { getDynamicClassList } from "@/lib/ems/ems-config-loader";
import { RoutineClass, RoutineSettings } from "./types";

export const HS_STREAM_PRESETS: Record<"Common" | "Science" | "Commerce" | "Arts", string[]> = {
  Common: ["Bengali", "English", "Environmental Studies", "Alternative English", "Hindi", "Urdu"],
  Science: ["Physics", "Chemistry", "Mathematics", "Biological Sciences", "Computer Science", "Nutrition", "Statistics"],
  Commerce: ["Accountancy", "Business Studies", "Economics", "Costing and Taxation", "Commercial Law", "Computer Application"],
  Arts: ["History", "Geography", "Political Science", "Philosophy", "Education", "Sociology", "Sanskrit", "Arabic"],
};

export const PRESET_STREAMS = ["General", "Science", "Arts", "Commerce", "Vocational"] as const;

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
  if (typeof window === "undefined") return ["Science", "Commerce", "Arts"];
  const dynamicClasses = getDynamicClassList();
  const cleanCode = className.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const target = dynamicClasses.find(
    (c: any) =>
      c.code.toUpperCase() === cleanCode ||
      c.name.toUpperCase().includes(cleanCode) ||
      c.name.toLowerCase() === className.toLowerCase()
  );

  let rawStreams: string[] = [];
  if (target?.stream && target.stream.trim()) {
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

  return result.length > 0 ? result : ["Science", "Commerce", "Arts"];
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
