import { formatMissingRolls } from "@/lib/ems/allocation-engine";
import { Student } from "@/lib/types";
import { getDynamicSectionsForClass, getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { normalizeClassCode, normalizeSectionCode, isHigherSecondaryClass } from "@/lib/ems/seat-arrangement-algorithm";
import { calculateHsStudentStats } from "@/components/ems/auto-allocation-wizard";


// Sort class groups strictly in consecutive order: 5, 6, 7, 8, 9, 10, 11, 12 (V..XII)
export const sortClassGroups = (groups: ClassGroupConfig[]): ClassGroupConfig[] => {
  return [...groups].sort((a, b) => getClassNumericRank(a.class) - getClassNumericRank(b.class));
};

interface SectionStudentStats {
  count: number;
  totalEnrolled: number;
  minRoll: number;
  maxRoll: number;
  rollFrom: number;
  rollTo: number;
  missingRolls?: number[];
  missingFormatted?: string;
  excludedCount?: number;
}

// Calculate enrolled student stats & roll range for a given class and section from actual DB records
export const calculateSectionStudentStats = (
  students: Student[],
  className: string,
  sectionName: string,
  customRollFrom?: number,
  customRollTo?: number,
  excludedStudentIds: string[] = []
): SectionStudentStats => {
  const targetClass = normalizeClassCode(className);
  const targetSec = normalizeSectionCode(sectionName);

  const matched = students.filter((s) => {
    if (s.currentStatus && s.currentStatus !== "Continuing") return false;
    const sClass = normalizeClassCode(s.presentClass);
    const sSec = normalizeSectionCode(s.presentSection);
    return sClass === targetClass && sSec === targetSec;
  });

  if (matched.length === 0) {
    return {
      count: 0,
      totalEnrolled: 0,
      minRoll: 1,
      maxRoll: 35,
      rollFrom: customRollFrom ?? 1,
      rollTo: customRollTo ?? 35,
      excludedCount: 0,
    };
  }

  // Extract all valid numeric rolls present in DB
  const validRolls = matched
    .map((s) => Number(s.presentRoll))
    .filter((r) => !isNaN(r) && r > 0)
    .sort((a, b) => a - b);

  const minRoll = validRolls.length > 0 ? validRolls[0] : 1;
  const maxRoll = validRolls.length > 0 ? validRolls[validRolls.length - 1] : matched.length;

  const effectiveRollFrom = customRollFrom !== undefined ? customRollFrom : minRoll;
  const effectiveRollTo = customRollTo !== undefined ? customRollTo : maxRoll;

  // Filter actual active students falling inside [effectiveRollFrom, effectiveRollTo]
  const inRange = matched.filter((s) => {
    const r = Number(s.presentRoll);
    if (!isNaN(r) && r > 0) {
      return r >= effectiveRollFrom && r <= effectiveRollTo;
    }
    return true;
  });

  const excludedSet = new Set(excludedStudentIds);
  const excludedCount = inRange.filter((s) => excludedSet.has(s.id)).length;
  const activeCount = inRange.length - excludedCount;

  // Calculate missing roll numbers in range [effectiveRollFrom, effectiveRollTo]
  const presentRollSet = new Set(validRolls);
  const missingRolls: number[] = [];
  for (let r = effectiveRollFrom; r <= effectiveRollTo; r++) {
    if (!presentRollSet.has(r)) {
      missingRolls.push(r);
    }
  }

  return {
    count: activeCount,
    totalEnrolled: matched.length,
    minRoll,
    maxRoll,
    rollFrom: effectiveRollFrom,
    rollTo: effectiveRollTo,
    missingRolls,
    missingFormatted: formatMissingRolls(missingRolls),
    excludedCount,
  };
};

// Get all available sections for a class (configured + present in student records)
export const getSectionsForClass = (
  classCode: string,
  students: Student[] = []
): string[] => {
  const configured = getDynamicSectionsForClass(classCode);
  const targetClass = normalizeClassCode(classCode);
  const fromStudents = students
    .filter((s) => normalizeClassCode(s.presentClass) === targetClass)
    .map((s) => normalizeSectionCode(s.presentSection))
    .filter(Boolean);

  const merged = Array.from(new Set([...configured, ...fromStudents])).sort();
  return merged.length > 0 ? merged : ["A", "B"];
};

export interface ClassGroupSectionConfig {
  section: string;
  rollFrom: number;
  rollTo: number;
  enrolledCount: number; // Actual active continuing students in DB matching [rollFrom, rollTo] minus excluded
  totalEnrolled?: number;
  minRoll?: number;
  maxRoll?: number;
  missingRolls?: number[];
  missingFormatted?: string;
  excludedStudentIds?: string[];
}

export interface ClassGroupConfig {
  id: string;
  class: string;
  sections: ClassGroupSectionConfig[];
  stream?: string;
  gender?: string;
  regNoFrom?: string;
  regNoTo?: string;
  excludedStudentIds?: string[];
}

export const buildClassGroupConfig = (
  code: string,
  students: Student[] = []
): ClassGroupConfig => {
  const isHs = isHigherSecondaryClass(code);
  if (isHs) {
    const stats = calculateHsStudentStats(students, code, "ALL", "ALL");
    return {
      id: `grp-${code.toLowerCase()}-${Date.now()}`,
      class: code,
      sections: [
        {
          section: "ALL",
          rollFrom: 1,
          rollTo: 9999,
          enrolledCount: stats.count,
          totalEnrolled: stats.totalEnrolled,
        },
      ],
      stream: "ALL",
      gender: "ALL",
      regNoFrom: stats.minRegNo,
      regNoTo: stats.maxRegNo,
    };
  }

  const availSecs = getSectionsForClass(code, students);
  return {
    id: `grp-${code.toLowerCase()}-${Date.now()}`,
    class: code,
    sections: availSecs.map((sec) => {
      const stats = calculateSectionStudentStats(students, code, sec);
      return {
        section: sec,
        rollFrom: stats.rollFrom,
        rollTo: stats.rollTo,
        enrolledCount: stats.count,
        totalEnrolled: stats.totalEnrolled,
        minRoll: stats.minRoll,
        maxRoll: stats.maxRoll,
        missingRolls: stats.missingRolls,
        missingFormatted: stats.missingFormatted,
      };
    }),
  };
};
