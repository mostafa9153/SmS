import type { StudentStatus, Semester } from "@/lib/types";
import { getNextClass } from "@/lib/academic/class-ladder";

export const SECONDARY_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X"];
export const HIGHER_SECONDARY_CLASSES = ["XI", "XII"];

export const SECONDARY_CLASS_NEXT: Record<string, string> = Object.fromEntries(
  SECONDARY_CLASSES.slice(0, -1).map((c) => [c, getNextClass(c)!])
);

export const HIGHER_SECONDARY_CLASS_NEXT: Record<string, string> = { XI: "XII" };

export const CLASS_NEXT: Record<string, string> = {
  ...SECONDARY_CLASS_NEXT,
  ...HIGHER_SECONDARY_CLASS_NEXT,
};

export const AUTO_PASS_CLASSES = new Set(["V", "VI", "VII", "VIII"]);

export interface DetainedStudentInfo {
  id: string;
  name: string;
  presentClass: string;
  presentSection: string;
  presentRoll: number;
  presentSemester?: Semester | null;
  percentage: number | null;
  marksObtained: number | null;
  reason: string;
  failedSubjectNames?: string[];
  evaluatedStatus?: StudentStatus;
}

export interface ClassReadinessStat {
  className: string;
  totalStudents: number;
  resultsEntered: number;
  passedCount: number;
  pendingCount: number;
  promotedCount: number;
  sentToMpCount?: number;
  detainedCount: number;
  supplementaryCount?: number;
  compartmentalCount?: number;
  passedOutCount?: number;
  isAutoPass: boolean;
  isReady: boolean;
}

export interface SessionReadinessReport {
  currentYear: number;
  nextYear: number;
  minPassPercentage: number;
  totalStudents: number;
  totalEvaluated: number;
  totalPromoted: number;
  totalSentToMp?: number;
  totalDetained: number;
  totalSupplementary?: number;
  totalCompartmental?: number;
  totalPassedOut?: number;
  readinessPercentage: number;
  classes: ClassReadinessStat[];
  detainedStudents: DetainedStudentInfo[];
}

export interface SessionTransitionParams {
  fromYear: number;
  toYear: number;
  rollStrategy: "rank" | "preserve" | "alphabetical";
  examName?: string;
  minPassPercentage?: number;
  overriddenStudentIds?: string[];
}

export interface SessionTransitionResult {
  success: boolean;
  promotedCount: number;
  sentToMpCount: number;
  detainedCount: number;
  supplementaryCount?: number;
  compartmentalCount?: number;
  passedOutCount: number;
  archivedHistoryCount: number;
  classesProcessed: string[];
}
