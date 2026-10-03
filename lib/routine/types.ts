export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export interface RoutineSettings {
  id?: string;
  workingDays: number[]; // 0 = Mon, 1 = Tue, ..., 6 = Sun
  periodsPerDay: number; // e.g. 8
  halfDays: number[]; // e.g. [5] (Saturday)
  halfDayPeriods: number; // e.g. 4
  breaks: number[]; // e.g. [4] (Break interval placed after period 4, between period 4 & 5)
  tchDailyMax: number; // e.g. 5
  tchConsecMax: number; // e.g. 3
}

export const DEFAULT_ROUTINE_SETTINGS: RoutineSettings = {
  workingDays: [0, 1, 2, 3, 4, 5],
  periodsPerDay: 8,
  halfDays: [5],
  halfDayPeriods: 4,
  breaks: [4],
  tchDailyMax: 5,
  tchConsecMax: 3,
};

export interface RoutineRoom {
  id: string;
  name: string;
  isLab?: boolean;
}

export interface RoutineClass {
  id: string;
  className: string;
  section: string;
  dailyPeriods?: number | null;
}

export interface RoutineSubject {
  id: string;
  name: string;
  className?: string | null;
  classId?: string | null;
  stream?: string | null; // e.g. "Science" | "Commerce" | "Arts" | "Common" | "General"
  isCommon?: boolean; // true if common across all streams of the class (e.g. Bengali, English)
  isHard: boolean;
  isLab: boolean;
  timePref: "any" | "morning" | "afternoon";
  allowMultiplePerDay: boolean;
  maxPerDay?: number | null;
  periodsPerWeek?: number | null;
  sortOrder?: number | null;
}

export interface RoutineTeacher {
  id: string; // staff_profiles.id or generated uuid
  name: string; // staff_profiles.full_name or name
  shortName: string;
  maxPeriods: number;
  availableSlots: Record<number | string, number[]>; // dayIndex -> period numbers (1-indexed)
  qualifiedClasses?: string[]; // e.g. ["Class V", "Class VI"]
  classSubjects?: Record<string, string[]>; // e.g. { "Class V": ["Bengali", "Mathematics"], "Class IX": ["Physical Science"] }
  sectionSubjects?: Record<string, string[]>; // e.g. { "Class V::A": ["Bengali"], "Class V::B": ["English"] }
  classSections?: Record<string, string[]>; // e.g. { "Class V": ["A", "B"], "Class XI": ["Science"] }
  classPeriods?: Record<string, number>; // e.g. { "Class V": 5, "Class XI": 6 }
  sectionPeriods?: Record<string, number>; // e.g. { "Class V::A": 3, "Class V::B": 2 }
  subjectPeriods?: Record<string, number>; // e.g. { "Class V::A::Bengali": 4, "Class V::Bengali": 5 }
  primarySubject?: string | null; // e.g. "Mathematics", "Bengali", etc.
  classTeacherOf?: string | null; // e.g. "Class V - A", "Class VII", etc.
  classTeacherFirstPeriods?: number | null; // e.g. target number of 1st periods / week in their CT class (default 3)
}

export type TeacherAvailability = RoutineTeacher;

export interface RoutineAssignment {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
  periodsPerWeek: number;
}

export interface RoutineCellData {
  sid: string;
  tid: string;
  rid?: string | null;
  sz: number;
  lab: boolean;
  half?: "start" | "end";
  uid: number;
}

export type SlotPlacement = RoutineCellData;

export type RoutineGrid = Record<string, (RoutineCellData | null)[][]>;
export type GeneratedRoutineGrid = RoutineGrid;

export interface DiagnosticItem {
  id?: string;
  type:
    | "teacher_daily_max"
    | "consecutive_fatigue"
    | "half_day_starvation"
    | "time_pref_saturation"
    | "teacher_availability"
    | "faculty_shortage"
    | "capacity_overflow"
    | "room_capacity"
    | "general";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  solution?: string;
  teacherName?: string;
  className?: string;
  subjectName?: string;
}

export interface GeneratedRoutine {
  id?: string;
  success: boolean;
  days: number[];
  teachingPeriods: number[];
  breaks: number[];
  grid: RoutineGrid;
  iterations?: number;
  executionTimeMs?: number;
  generatedAt?: string;
  metadata?: Record<string, any>;
  stats?: {
    totalUnits: number;
    placedUnits: number;
    iterations: number;
    executionTimeMs: number;
    phase?: number;
    relaxedConstraints?: string[];
  };
  diagnostics?: string[];
  diagnosticItems?: DiagnosticItem[];
}

export type SolverResult = GeneratedRoutine;

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  diagnosticItems?: DiagnosticItem[];
}

export type SolverValidationResult = ValidationReport;

