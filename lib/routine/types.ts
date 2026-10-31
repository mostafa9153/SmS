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
  tchMinBefore: number; // min teacher periods before tiffin on a teaching day (0 = off)
  tchMinAfter: number; // min teacher periods after tiffin on a teaching day (0 = off)
}

export const DEFAULT_ROUTINE_SETTINGS: RoutineSettings = {
  workingDays: [0, 1, 2, 3, 4, 5],
  periodsPerDay: 8,
  halfDays: [5],
  halfDayPeriods: 4,
  breaks: [4],
  tchDailyMax: 5,
  tchConsecMax: 3,
  tchMinBefore: 0,
  tchMinAfter: 0,
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
  theoryPeriods?: number | null;
  labPeriods?: number | null;
  timePref: "any" | "morning" | "afternoon";
  allowMultiplePerDay: boolean;
  maxPerDay?: number | null;
  periodsPerWeek?: number | null;
  sortOrder?: number | null;
  allowedSlots?: Record<string, number[]> | null; // hard: dayIndex -> periods this subject may use (null = anywhere)
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

export interface RoutineAssignment {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
  periodsPerWeek: number;
  isLab?: boolean;
}

export interface RoutineGroupOption {
  id: string;
  groupId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string | null;
  sortOrder?: number;
}

export interface RoutineSubjectGroup {
  id: string;
  name: string;
  scope: "class" | "section";
  className?: string | null; // scope='class'
  stream?: string | null;    // optional stream filter when scope='class'
  pooled: boolean;
  periodsPerWeek: number;
  periodSize: 1 | 2;         // single or double period
  timePref: "any" | "morning" | "afternoon";
  maxPerDay?: number | null;
  allowedSlots?: Record<string, number[]> | null;
  sortOrder?: number;
  // Resolved at load time (scope='class') OR explicit (scope='section'):
  sectionIds: string[];
  options: RoutineGroupOption[];
}

export interface RoutineGroupCellOption {
  sid: string;
  tid: string;
  rid?: string | null;
}

export interface RoutineCellData {
  sid: string;
  tid: string;
  rid?: string | null;
  sz: number;
  lab: boolean;
  half?: "start" | "end";
  uid: number;
  gid?: string;                        // group id when this cell is a group unit
  opts?: RoutineGroupCellOption[];     // parallel options when gid is set
}

export type RoutineGrid = Record<string, (RoutineCellData | null)[][]>;

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
    | "subject_slot_restriction"
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

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  diagnosticItems?: DiagnosticItem[];
}
