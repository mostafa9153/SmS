// EMS — Exam Management System Types

export type ExamType =
  | "1st Summative Evaluation"
  | "2nd Summative Evaluation"
  | "3rd Summative Evaluation"
  | "Test Examination"
  | "3rd Summative Evaluation / Test Examination"
  | "Sem I"
  | "Sem II";

export const EXAM_TYPES: ExamType[] = [
  "1st Summative Evaluation",
  "2nd Summative Evaluation",
  "3rd Summative Evaluation",
  "Test Examination",
  "3rd Summative Evaluation / Test Examination",
  "Sem I",
  "Sem II",
];

export const EMS_ELIGIBLE_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI"] as const;

export function getExamTypesForClasses(classes: string[]): ExamType[] {
  if (!classes || classes.length === 0) {
    return ["1st Summative Evaluation", "2nd Summative Evaluation", "3rd Summative Evaluation"];
  }
  const cleanCodes = classes.map((c) => c.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, ""));
  const hasHs = cleanCodes.some((c) => c === "XI" || c === "11");
  const has10 = cleanCodes.some((c) => c === "X" || c === "10");
  const hasJunior = cleanCodes.some((c) => ["V", "VI", "VII", "VIII", "IX", "5", "6", "7", "8", "9"].includes(c));

  // If only HS (Class 11) is selected
  if (hasHs && !has10 && !hasJunior) {
    return ["Sem I", "Sem II"];
  }

  // If only Class 10 is selected
  if (has10 && !hasJunior && !hasHs) {
    return ["1st Summative Evaluation", "2nd Summative Evaluation", "Test Examination"];
  }

  // If Class 10 is selected together with junior classes (5 to 9)
  if (has10 && hasJunior && !hasHs) {
    return [
      "1st Summative Evaluation",
      "2nd Summative Evaluation",
      "3rd Summative Evaluation / Test Examination",
    ];
  }

  // If HS is mixed with other classes
  if (hasHs) {
    return [
      "1st Summative Evaluation",
      "2nd Summative Evaluation",
      has10 && hasJunior
        ? "3rd Summative Evaluation / Test Examination"
        : has10
        ? "Test Examination"
        : "3rd Summative Evaluation",
      "Sem I",
      "Sem II",
    ];
  }

  // Default for junior classes (5 to 9)
  return ["1st Summative Evaluation", "2nd Summative Evaluation", "3rd Summative Evaluation"];
}

export function getExamTypesForClass(classCode?: string): ExamType[] {
  return getExamTypesForClasses(classCode ? [classCode] : []);
}

// Compact label helper for UI dropdowns where space is tight
export function getExamTypeDisplayLabel(type: ExamType): string {
  if (type === "3rd Summative Evaluation / Test Examination") {
    return "3rd Summative / Test Examination";
  }
  return type;
}

// Full class-smart exam title resolver for student-specific printouts (admit cards, desk slips)
export function getStudentExamTitle(examType: string, studentClass?: string): string {
  if (
    examType === "3rd Summative Evaluation / Test Examination" ||
    examType === "3rd Summative / Test Examination"
  ) {
    const clean = (studentClass || "").trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
    if (clean === "X" || clean === "10") {
      return "Test Examination";
    }
    return "3rd Summative Evaluation";
  }
  return examType;
}

export type ExamHalf = "1st Half" | "2nd Half";

// Printable document type for EMS print suite
export type PrintDocType = "admit" | "slips" | "attendance" | "gate";

// Configuration for an individual column in a room (allows uneven bench heights)
export interface RoomColumnConfig {
  columnIndex: number; // 1-indexed (1, 2, 3...)
  columnLabel: string; // e.g. "Column 1"
  benchCount: number; // Number of benches in this specific column
  seatsPerBench: number; // Seats per bench in this column (e.g. 2 or 3)
}

// Classroom & Hall Definition
export interface EmsRoom {
  id: string;
  roomNumber: string; // e.g. "Room 101", "Hall A"
  floor?: string; // e.g. "Ground Floor", "1st Floor"
  building?: string; // e.g. "Main Building", "Science Block"
  columns: RoomColumnConfig[]; // Flexible columns (each with custom benches)
  defaultSeatsPerBench: number; // 2 or 3
  totalCapacity: number; // Sum of (benchCount * seatsPerBench) across columns
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Individual seat inside a bench
export interface SeatAssignment {
  seatId: string; // e.g. "R101-C1-B1-S1"
  roomId: string;
  roomNumber: string;
  columnIndex: number; // 1-indexed
  benchIndex: number; // 1-indexed (row from front to back)
  seatPosition: number; // 1-indexed (1=Left, 2=Middle, 3=Right)
  globalSeatNumber: number; // Sequential seat number for the room (1, 2, 3...)
  studentId?: string;
  studentName?: string;
  studentRoll?: number;
  studentClass?: string;
  studentSection?: string;
  studentRegNo?: string;
  studentStream?: string;
  studentGender?: string;
  schoolId?: string;
  fatherName?: string;
  contact?: string;
  isVacant: boolean;
}

// Allocated room data structure
export interface AllocatedRoom {
  roomId: string;
  roomNumber: string;
  floor?: string;
  building?: string;
  columns: RoomColumnConfig[];
  seats: SeatAssignment[];
  totalSeats: number;
  occupiedSeats: number;
  vacantSeats: number;
  classesPresent: string[];
}

// Full exam allocation record
export interface ExamAllocation {
  id: string;
  title: string; // e.g. "1st Summative 2026 - Class VIII & IX"
  academicYear: number; // e.g. 2026
  examType: ExamType;
  mode: "manual" | "auto";
  createdAt: string;
  updatedAt: string;
  roomAllocations: AllocatedRoom[];
  summary: {
    totalStudents: number;
    totalRooms: number;
    classesAllocated: string[];
    mismatches?: MismatchReport;
  };
}

// Data mismatch notification structures
export type MismatchType =
  | "ROLL_NOT_FOUND"
  | "ROLL_INACTIVE"
  | "CAPACITY_OVERFLOW"
  | "SEATS_DEFICIT"
  | "DUPLICATE_ALLOCATION"
  | "CLASS_EMPTY";

export interface MismatchItem {
  type: MismatchType;
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  details?: string[];
  class?: string;
  section?: string;
  rollsAffected?: number[];
  suggestedAction?: string;
}

export interface MismatchReport {
  hasErrors: boolean;
  hasWarnings: boolean;
  items: MismatchItem[];
}

// Auto Allocation Request configuration
export interface AutoAllocationClassInput {
  class: string; // e.g. "IX", "XI"
  section: string; // e.g. "A" or "ALL"
  rollFrom: number; // e.g. 1
  rollTo: number; // e.g. 50
  stream?: string; // e.g. "Science", "Arts", "Commerce", "ALL" (For HS Class 11 & 12)
  gender?: string; // e.g. "Male", "Female", "ALL" (Boys / Girls filter)
  regNoFrom?: string; // e.g. "WB10001" (For HS Class 11 & 12)
  regNoTo?: string; // e.g. "WB10050" (For HS Class 11 & 12)
  isHsClass?: boolean;
  excludedStudentIds?: string[]; // IDs of manually deselected/excluded students
}

export interface AutoAllocationConfig {
  academicYear: number;
  examType: ExamType;
  classes: AutoAllocationClassInput[];
  selectedRoomIds: string[];
  strategy?: "alternate-columns" | "interleaved-seats";
  studentsPerBench?: number; // Direct user input for students per bench!
  roomClassMap?: Record<string, string[]>; // Map roomId -> allowed class codes (e.g. ["VIII", "IX"])
}

// Manual Column Allocation configuration
export interface ManualColumnInput {
  columnIndex: number;
  class: string;
  section: string;
  rollFrom: number;
  rollTo: number;
}

export interface ManualRoomAllocationConfig {
  academicYear: number;
  examType: ExamType;
  roomId: string;
  columns: ManualColumnInput[];
  studentsPerBench?: number; // Direct user input for students per bench!
}
