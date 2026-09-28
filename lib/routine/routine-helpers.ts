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
  settings: RoutineSettings
): number {
  const cLimit = cls.dailyPeriods && cls.dailyPeriods >= 4 ? cls.dailyPeriods : settings.periodsPerDay;
  let totalSlots = 0;
  for (const d of settings.workingDays) {
    const isHalf = settings.halfDays.includes(d);
    const dayMax = isHalf ? Math.min(settings.halfDayPeriods, cLimit) : cLimit;
    const teachingInDay = Array.from({ length: dayMax }, (_, i) => i + 1).filter(
      (p) => !settings.breaks.includes(p)
    ).length;
    totalSlots += teachingInDay;
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
