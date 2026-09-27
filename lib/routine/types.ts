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
  breaks: number[]; // e.g. [4] (4th period is break)
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
  isHard: boolean;
  isLab: boolean;
  timePref: "any" | "morning" | "afternoon";
  allowMultiplePerDay: boolean;
  maxPerDay?: number | null;
  periodsPerWeek?: number | null;
}

export interface RoutineTeacher {
  id: string; // staff_profiles.id or generated uuid
  name: string; // staff_profiles.full_name or name
  shortName: string;
  maxPeriods: number;
  availableSlots: Record<number | string, number[]>; // dayIndex -> period numbers (1-indexed)
  qualifiedClasses?: string[]; // e.g. ["Class V", "Class VI"]
  classSubjects?: Record<string, string[]>; // e.g. { "Class V": ["Bengali", "Mathematics"], "Class IX": ["Physical Science"] }
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
  };
  diagnostics?: string[];
}

export type SolverResult = GeneratedRoutine;

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type SolverValidationResult = ValidationReport;
