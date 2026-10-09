/**
 * Single Source of Truth for Routine Calculations & Domain Heuristics
 */

import {
  getClassStreamList,
  getSchoolConfiguredStreams,
} from "@/lib/utils/school-profile";
import { getDynamicClassList, getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { RoutineClass, RoutineSettings, RoutineSubject, RoutineTeacher, RoutineAssignment } from "./types";

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

  // 1b. Check if split Theory and Lab / Practical variants exist in subjectPeriods and sum them
  const theoryVal =
    teacher.subjectPeriods?.[`${cls}::${sec}::${sub} (Theory)`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}::${sub} (Theory)`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}::${sub} (Theory)`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}-${sub} (Theory)`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}_${sub} (Theory)`];

  const labVal =
    teacher.subjectPeriods?.[`${cls}::${sec}::${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}::${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}::${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}-${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}_${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}::${sec}::${sub} (Practical)`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}::${sub} (Practical)`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}::${sub} (Practical)`] ??
    teacher.subjectPeriods?.[`${cls}-${sec}-${sub} (Practical)`] ??
    teacher.subjectPeriods?.[`${cls}_${sec}_${sub} (Practical)`];

  const splitSum = (Number(theoryVal) || 0) + (Number(labVal) || 0);
  if (splitSum > 0) {
    return splitSum;
  }

  // 2. Class-subject general override
  const clsVal =
    teacher.subjectPeriods?.[`${cls}::${sub}`] ??
    teacher.subjectPeriods?.[`${cls}-${sub}`] ??
    teacher.subjectPeriods?.[`${cls}_${sub}`];
  if (clsVal !== undefined && clsVal !== null && Number(clsVal) > 0) {
    return Number(clsVal);
  }

  // 2b. Class-level split Theory + Lab override
  const clsTheory =
    teacher.subjectPeriods?.[`${cls}::${sub} (Theory)`] ??
    teacher.subjectPeriods?.[`${cls}-${sub} (Theory)`] ??
    teacher.subjectPeriods?.[`${cls}_${sub} (Theory)`];
  const clsLab =
    teacher.subjectPeriods?.[`${cls}::${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}-${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}_${sub} (Lab)`] ??
    teacher.subjectPeriods?.[`${cls}::${sub} (Practical)`] ??
    teacher.subjectPeriods?.[`${cls}-${sub} (Practical)`] ??
    teacher.subjectPeriods?.[`${cls}_${sub} (Practical)`];
  const clsSplitSum = (Number(clsTheory) || 0) + (Number(clsLab) || 0);
  if (clsSplitSum > 0) {
    return clsSplitSum;
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
 * Checks whether a teacher is assigned to teach a specific subject in a class and section.
 * Handles split Theory/Lab subject variants (e.g., "Geography" matches "Geography (Theory)" or "Geography (Lab)").
 */
export function isTeacherAssignedToSubject(
  teacher: RoutineTeacher,
  className: string,
  section: string,
  subjectName: string
): boolean {
  const cls = (className || "").trim();
  const sec = (section || "").trim();
  const sub = (subjectName || "").trim().toLowerCase();
  const subClean = sub.replace(/\s*\((theory|lab|practical)\)/i, "").trim();

  const allowedSecs = teacher.classSections?.[cls];
  if (allowedSecs !== undefined && Array.isArray(allowedSecs)) {
    const isAllowed = allowedSecs.some(
      (s) => s.trim().toLowerCase() === "all" || s.trim().toLowerCase() === sec.toLowerCase()
    );
    if (!isAllowed) return false;
  }

  const hasSecConfig = Object.keys(teacher.sectionSubjects || {}).some(
    (k) => k.startsWith(`${cls}::`) || k.startsWith(`${cls}-`) || k.startsWith(`${cls}_`)
  );

  const matchesSub = (s: string) => {
    const sLower = s.trim().toLowerCase();
    const sClean = sLower.replace(/\s*\((theory|lab|practical)\)/i, "").trim();
    return sLower === sub || sClean === subClean || sClean === sub;
  };

  const secKey = `${cls}::${sec}`;
  const altSecKey = `${cls}-${sec}`;
  const altSecKey2 = `${cls}_${sec}`;

  const secSubs =
    teacher.sectionSubjects?.[secKey] ??
    teacher.sectionSubjects?.[altSecKey] ??
    teacher.sectionSubjects?.[altSecKey2];

  const hasSecSub = Array.isArray(secSubs) && secSubs.some(matchesSub);
  if (hasSecSub) return true;

  // If teacher has section configuration for this class, strictly DO NOT fall back to classSubjects
  if (hasSecConfig) return false;

  if (allowedSecs === undefined && teacher.qualifiedClasses?.includes(cls)) {
    const classSubs = teacher.classSubjects?.[cls] || [];
    if (classSubs.some(matchesSub)) return true;
  }

  // Check explicit subjectPeriods map as well
  if (teacher.subjectPeriods && Object.keys(teacher.subjectPeriods).length > 0) {
    const hasExplicit = Object.keys(teacher.subjectPeriods).some((k) => {
      const parts = k.includes("::") ? k.split("::") : k.includes("-") ? k.split("-") : k.split("_");
      if (parts.length >= 2 && parts[0].trim().toLowerCase() === cls.toLowerCase()) {
        const keySub = parts[parts.length - 1].trim().toLowerCase();
        const keySubClean = keySub.replace(/\s*\((theory|lab|practical)\)/i, "").trim();
        return keySub === sub || keySubClean === subClean;
      }
      return false;
    });
    if (hasExplicit) return true;
  }

  return false;
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
 * Safely retrieves section subjects with backwards compatibility and section isolation.
 * If the teacher has section-level configurations or section restrictions for the class,
 * unlisted sections strictly return [].
 */
export function getTeacherSectionSubjects(
  teacher: RoutineTeacher,
  className: string,
  section: string
): string[] {
  const cls = (className || "").trim();
  const sec = (section || "").trim();

  // If teacher has classSections configured for this class, strictly verify that sec is allowed
  const allowedSecs = teacher.classSections?.[cls];
  if (allowedSecs !== undefined) {
    if (!Array.isArray(allowedSecs) || allowedSecs.length === 0) {
      return [];
    }
    const isAllowed = allowedSecs.some(
      (s) => s.trim().toLowerCase() === "all" || s.trim().toLowerCase() === sec.toLowerCase()
    );
    if (!isAllowed) {
      return [];
    }
  }

  const direct =
    teacher.sectionSubjects?.[`${cls}::${sec}`] ??
    teacher.sectionSubjects?.[`${cls}-${sec}`] ??
    teacher.sectionSubjects?.[`${cls}_${sec}`];

  if (direct !== undefined) {
    return direct;
  }

  // If the teacher has any sectionSubjects configured for this class, do NOT fall back to classSubjects
  const hasAnySecConfig = Object.keys(teacher.sectionSubjects || {}).some(
    (k) => k.startsWith(`${cls}::`) || k.startsWith(`${cls}-`) || k.startsWith(`${cls}_`)
  );
  if (hasAnySecConfig) {
    return [];
  }

  // If classSections was defined, it only falls through here if sec was allowed
  if (allowedSecs !== undefined) {
    return teacher.classSubjects?.[cls] ?? [];
  }

  return teacher.classSubjects?.[cls] ?? [];
}

/**
 * Strips orphaned entries from teacher.subjectPeriods in-memory if the subject
 * is not actively assigned in sectionSubjects or classSubjects, or if the section is excluded.
 */
export function sanitizeTeacherSubjectPeriods(teacher: RoutineTeacher): RoutineTeacher {
  if (!teacher.subjectPeriods || Object.keys(teacher.subjectPeriods).length === 0) {
    return teacher;
  }

  const cleanedSubjectPeriods: Record<string, number> = {};

  Object.entries(teacher.subjectPeriods).forEach(([k, val]) => {
    if (val === undefined || val === null || Number(val) <= 0) return;

    let parts = k.split("::");
    if (parts.length === 1) {
      parts = k.split("-");
      if (parts.length === 1) {
        parts = k.split("_");
      }
    }

    if (parts.length === 3) {
      const cls = parts[0].trim();
      const sec = parts[1].trim();
      const sub = parts[2].trim().toLowerCase();

      // Check allowed sections if classSections is defined
      const allowedSecs = teacher.classSections?.[cls];
      if (allowedSecs !== undefined && Array.isArray(allowedSecs)) {
        const isAllowed = allowedSecs.some(
          (s) => s.trim().toLowerCase() === "all" || s.trim().toLowerCase() === sec.toLowerCase()
        );
        if (!isAllowed) {
          return; // Orphaned period for excluded section
        }
      }

      const secSubs =
        teacher.sectionSubjects?.[`${cls}::${sec}`] ??
        teacher.sectionSubjects?.[`${cls}-${sec}`] ??
        teacher.sectionSubjects?.[`${cls}_${sec}`];

      if (secSubs !== undefined) {
        if (secSubs.some((s) => s.trim().toLowerCase() === sub)) {
          cleanedSubjectPeriods[k] = Number(val);
        }
        return;
      }

      const hasAnySecConfig = Object.keys(teacher.sectionSubjects || {}).some(
        (sk) => sk.startsWith(`${cls}::`) || sk.startsWith(`${cls}-`) || sk.startsWith(`${cls}_`)
      );
      if (hasAnySecConfig) {
        return; // Orphaned period
      }

      const clsSubs = teacher.classSubjects?.[cls] || [];
      if (clsSubs.some((s) => s.trim().toLowerCase() === sub)) {
        cleanedSubjectPeriods[k] = Number(val);
      }
    } else if (parts.length === 2) {
      const cls = parts[0].trim();
      const sub = parts[1].trim().toLowerCase();

      const clsSubs = teacher.classSubjects?.[cls] || [];
      if (clsSubs.some((s) => s.trim().toLowerCase() === sub)) {
        cleanedSubjectPeriods[k] = Number(val);
        return;
      }

      const hasInAnySec = Object.entries(teacher.sectionSubjects || {}).some(
        ([sk, subs]) =>
          (sk.startsWith(`${cls}::`) || sk.startsWith(`${cls}-`) || sk.startsWith(`${cls}_`)) &&
          Array.isArray(subs) &&
          subs.some((s) => s.trim().toLowerCase() === sub)
      );
      if (hasInAnySec) {
        cleanedSubjectPeriods[k] = Number(val);
      }
    } else {
      cleanedSubjectPeriods[k] = Number(val);
    }
  });

  return {
    ...teacher,
    subjectPeriods: cleanedSubjectPeriods,
  };
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
 * Calculates total teaching period capacity across all configured classes and sections
 */
export function calculateTotalSchoolClassCapacity(
  classes: RoutineClass[],
  settings?: RoutineSettings | null
): number {
  if (!classes || classes.length === 0) return 0;
  return classes.reduce((sum, cls) => sum + calculateClassWeeklyCapacity(cls, settings), 0);
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

/**
 * Single Source of Truth: Total weekly periods across ALL classes and sections combined (School-wide Period Demand)
 */
export function calculateTotalSchoolSectionDemand(
  classes: RoutineClass[],
  subjects: RoutineSubject[]
): number {
  if (!classes || classes.length === 0) {
    return subjects.reduce(
      (sum, s) => sum + (s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : (s.isLab ? 2 : 5)),
      0
    );
  }

  let totalDemand = 0;

  classes.forEach((cls) => {
    const clsLower = cls.className.toLowerCase();
    const isHs = isHsClass(cls.className);

    if (isHs) {
      const configuredStreams = getConfiguredStreamsForClass(cls.className);
      const { stream: parsedStream } = parseSectionAndStream(cls.section || "");
      const sectionLower = (cls.section || "").toLowerCase();

      let matchedStream: "Science" | "Commerce" | "Arts" | null = null;
      if (parsedStream && parsedStream.toLowerCase() !== "general" && parsedStream.toLowerCase() !== "all") {
        const found = configuredStreams.find(
          (st) => st.toLowerCase() === parsedStream.toLowerCase()
        );
        if (found) matchedStream = found;
      }

      if (!matchedStream) {
        for (const st of configuredStreams) {
          const stLower = st.toLowerCase();
          if (
            sectionLower === stLower ||
            sectionLower.includes(`(${stLower})`) ||
            sectionLower.includes(`-${stLower}`) ||
            sectionLower.includes(` ${stLower}`) ||
            sectionLower.includes(stLower)
          ) {
            matchedStream = st;
            break;
          }
        }
      }

      const streamsToProcess = matchedStream ? [matchedStream] : configuredStreams;
      const explicitClassSubs = subjects.filter(
        (s) => s.className && s.className.toLowerCase() === clsLower
      );
      const hasExplicitSubs = explicitClassSubs.length > 0;

      streamsToProcess.forEach((st) => {
        const candidates = hasExplicitSubs ? explicitClassSubs : subjects;
        const streamSubs = candidates.filter((s) => {
          if (s.className && s.className.toLowerCase() !== clsLower) return false;
          const detStream = detectSubjectStream(s.name, s.stream);
          const isStreamMatch = detStream === "Common" || s.isCommon || detStream === st;
          if (!isStreamMatch) return false;
          if (hasExplicitSubs) {
            return Boolean(s.className && s.className.toLowerCase() === clsLower);
          }
          const hsPresetSubs = [
            ...HS_STREAM_PRESETS.Common,
            ...(HS_STREAM_PRESETS[st] || []),
          ].map((p) => p.toLowerCase());
          return hsPresetSubs.includes(s.name.trim().toLowerCase());
        });

        const dedupedStreamSubs: RoutineSubject[] = [];
        const seenHs = new Set<string>();
        for (const s of streamSubs) {
          const cName = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
          const streamKey = (s.stream || detectSubjectStream(s.name) || "Common").toLowerCase();
          const key = `${cName}::${streamKey}`;
          if (!seenHs.has(key)) {
            seenHs.add(key);
            dedupedStreamSubs.push(s);
          }
        }

        const demand = dedupedStreamSubs.reduce(
          (sum, s) => sum + (s.periodsPerWeek || (s.isLab ? 2 : 5)),
          0
        );
        totalDemand += demand;
      });
    } else {
      const explicitClassSubs = subjects.filter(
        (s) => s.className && s.className.toLowerCase() === clsLower
      );
      const hasExplicitSubs = explicitClassSubs.length > 0;
      const presets = new Set(
        getDatabaseSubjectsForClass(cls.className).map((sub: string) => sub.trim().toLowerCase())
      );

      const candidates = hasExplicitSubs ? explicitClassSubs : subjects;
      const classSubs = candidates.filter((s) => {
        if (s.className && s.className.toLowerCase() !== clsLower) return false;
        if (hasExplicitSubs) {
          return Boolean(s.className && s.className.toLowerCase() === clsLower);
        }
        return presets.has(s.name.trim().toLowerCase());
      });

      const dedupedSubs: RoutineSubject[] = [];
      const seen = new Set<string>();
      for (const s of classSubs) {
        const cName = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        if (!seen.has(cName)) {
          seen.add(cName);
          dedupedSubs.push(s);
        }
      }

      const demand = dedupedSubs.reduce(
        (sum, s) => sum + (s.periodsPerWeek || (s.isLab ? 2 : 5)),
        0
      );
      totalDemand += demand;
    }
  });

  return totalDemand;
}

/**
 * Single Source of Truth: Total faculty assigned weekly workload across all classes and sections
 */
export function calculateTotalTeacherAllottedWorkload(
  teachers: RoutineTeacher[],
  classes: RoutineClass[],
  subjects: RoutineSubject[],
  assignments: RoutineAssignment[] = []
): { totalWorkload: number; assignedTeacherCount: number } {
  let totalWorkload = 0;
  let assignedTeacherCount = 0;

  teachers.forEach((t) => {
    let teacherAssignedPeriods = 0;
    const directTeacherAssignments = assignments.filter((a) => a.teacherId === t.id);

    if (directTeacherAssignments.length > 0) {
      directTeacherAssignments.forEach((a) => {
        teacherAssignedPeriods += a.periodsPerWeek;
      });
    } else {
      classes.forEach((c) => {
        const secKey = `${c.className}::${c.section}`;
        const altSecKey = `${c.className}-${c.section}`;
        const altSecKey2 = `${c.className}_${c.section}`;

        const allowedSecs = t.classSections?.[c.className];
        if (allowedSecs !== undefined && Array.isArray(allowedSecs)) {
          const isAllowed = allowedSecs.some(
            (s) => s.trim().toLowerCase() === "all" || s.trim().toLowerCase() === c.section.toLowerCase()
          );
          if (!isAllowed) {
            return;
          }
        }

        const hasSecConfig = Object.keys(t.sectionSubjects || {}).some(
          (k) =>
            k.startsWith(`${c.className}::`) ||
            k.startsWith(`${c.className}-`) ||
            k.startsWith(`${c.className}_`)
        );

        let activeSubs: string[] = [];
        if (hasSecConfig) {
          activeSubs =
            t.sectionSubjects?.[secKey] ??
            t.sectionSubjects?.[altSecKey] ??
            t.sectionSubjects?.[altSecKey2] ??
            [];
        } else if (
          allowedSecs === undefined &&
          t.qualifiedClasses?.includes(c.className)
        ) {
          activeSubs = t.classSubjects?.[c.className] || [];
        }

        activeSubs.forEach((subName) => {
          const matchedSubject = subjects.find(
            (s) =>
              s.name.trim().toLowerCase() === subName.trim().toLowerCase() &&
              (!s.className || s.className.trim().toLowerCase() === c.className.trim().toLowerCase())
          );
          const p = getTeacherSubjectPeriod(
            t,
            c.className,
            c.section,
            subName,
            matchedSubject?.periodsPerWeek || 5
          );
          teacherAssignedPeriods += p;
        });
      });
    }

    if (teacherAssignedPeriods > 0) {
      assignedTeacherCount += 1;
      totalWorkload += teacherAssignedPeriods;
    }
  });

  return { totalWorkload, assignedTeacherCount };
}
