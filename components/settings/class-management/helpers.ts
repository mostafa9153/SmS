import { getClassStreamList } from "@/lib/utils/school-profile";
import { ClassItem } from "@/components/settings/class-management/types";

/**
 * Helper to identify Higher Secondary classes (Classes XI and XII / 11 and 12).
 * Stream is ONLY applicable to Classes XI and XII.
 */
export function isHigherSecondaryClass(code?: string, name?: string): boolean {
  const normCode = (code || "").trim().toUpperCase();
  const normName = (name || "").trim().toUpperCase();
  return (
    normCode === "XI" ||
    normCode === "XII" ||
    normCode === "11" ||
    normCode === "12" ||
    normName.includes("XI") ||
    normName.includes("XII") ||
    normName.includes("11") ||
    normName.includes("12")
  );
}

/**
 * Returns the next available section letter (A -> B -> C -> D ...)
 */
export function getNextAvailableLetter(existing: string[]): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const set = new Set(existing.map((x) => x.trim().toUpperCase()));
  for (const char of alphabet) {
    if (!set.has(char)) return char;
  }
  return "+";
}

/**
 * Resolves the class teacher for a specific section and optional stream.
 */
export function getSectionTeacher(cls: ClassItem, sec: string, stream?: string): string | undefined {
  const cleanSec = sec.trim().replace(/^Section\s+/i, "");
  const st = cls.sectionTeachers;

  if (stream) {
    const streamKeys = [
      `${stream} - ${cleanSec}`,
      `${stream} - Section ${cleanSec}`,
      `${stream}::${cleanSec}`,
      `${cleanSec} (${stream})`,
      `Sec ${cleanSec} (${stream})`,
      cleanSec,
      `Section ${cleanSec}`,
    ];
    for (const k of streamKeys) {
      if (st && st[k]?.trim()) return st[k].trim();
    }
  } else {
    const keys = [
      cleanSec,
      `Section ${cleanSec}`,
      `Sec ${cleanSec}`,
      sec,
    ];
    for (const k of keys) {
      if (st && st[k]?.trim()) return st[k].trim();
    }
  }

  // Fallback:
  // If class has only 1 section, or if this is the first section and no other section is assigned:
  if (cls.classTeacher?.trim()) {
    if (!cls.sections || cls.sections.length <= 1) {
      return cls.classTeacher.trim();
    }
    if (!st || Object.keys(st).length === 0) {
      if (cleanSec === (cls.sections[0] || "A")) {
        return cls.classTeacher.trim();
      }
    }
  }

  return undefined;
}

/**
 * Returns a normalized list of all sections and their teachers for rendering.
 */
export function getClassSectionTeacherItems(cls: ClassItem): { key: string; label: string; teacher?: string }[] {
  const isHs = isHigherSecondaryClass(cls.code, cls.name);
  const activeStreams = isHs ? getClassStreamList(cls.stream) : [];

  if (isHs && activeStreams.length > 0) {
    const items: { key: string; label: string; teacher?: string }[] = [];
    activeStreams.forEach((st) => {
      const sList = (cls.streamSections && cls.streamSections[st]) || cls.sections || ["A"];
      sList.forEach((sec) => {
        const cleanSec = sec.trim().replace(/^Section\s+/i, "");
        const teacher = getSectionTeacher(cls, sec, st);
        items.push({
          key: `${st}-${cleanSec}`,
          label: activeStreams.length > 1 ? `${st} Sec ${cleanSec}` : `Sec ${cleanSec}`,
          teacher,
        });
      });
    });
    return items;
  }

  const sList = cls.sections && cls.sections.length > 0 ? cls.sections : ["A"];
  return sList.map((sec) => {
    const cleanSec = sec.trim().replace(/^Section\s+/i, "");
    return {
      key: cleanSec,
      label: `Sec ${cleanSec}`,
      teacher: getSectionTeacher(cls, sec),
    };
  });
}
