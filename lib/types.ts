// ============================================================
//  lib/types.ts
//  Central TypeScript types for the SMS application.
//  ⚠️  This file is the single source of truth for all data
//      shapes used throughout the UI.
// ============================================================

export type StudentStatus =
  | "Continuing"
  | "Drop Out"
  | "Passed Out"
  | "Sent Up M.P."
  | "C.C.H.S.";

export type Gender = "Male" | "Female" | "Other";

export interface AcademicHistoryEntry {
  year: number;          // Academic year, e.g. 2024
  class: string;         // Roman or numeric class string, e.g. "V", "VI", "XII"
  section: string;       // Section letter, e.g. "A", "B"
  roll: number;          // Roll number within class-section
  status: StudentStatus;
}

export interface Student {
  id: string;                    // Internal UUID / unique key
  schoolId: string;              // Permanent school-issued ID — format: MHS/YYYY/NN/CLASS/SECTION/NNN
  name: string;
  pen?: string;                  // Permanent Education Number (govt)
  hasAadhaar?: boolean | string; // Aadhaar availability: Yes / No
  aadhaar?: string;              // 12-digit Aadhaar — SENSITIVE: masked in UI by default
  dob: string;                   // ISO date string, e.g. "2012-04-15"
  gender: Gender;
  socialCategory?: string;       // e.g. "General", "OBC", "SC", "ST"
  religion?: string;
  fatherName: string;
  motherName: string;
  studentContact?: string;       // 10-digit mobile
  address?: string;
  presentClass: string;          // Current enrolled class
  presentSection: string;        // Current section
  presentRoll: number;           // Current roll number
  currentStatus: StudentStatus;
  admissionYear: number;         // Year of first admission
  admissionDate?: string;        // ISO date of admission
  previousSchool?: string;       // Name of school before joining
  academicHistory: AcademicHistoryEntry[];

  // --- NEW FIELDS ---
  // A. General / Personal Information
  guardianName?: string;
  nameAsPerAadhaar?: string;
  pincode?: string;
  altMobile?: string;
  email?: string;
  motherTongue?: string;
  minorityGroup?: string;
  isBpl?: boolean;
  isAay?: boolean;
  isEws?: boolean;
  isCwsn?: boolean;
  impairmentType?: string;
  hasDisabilityCertificate?: boolean;
  disabilityPercentage?: number;
  sldType?: string;
  indianNationality?: boolean;
  isOutOfSchool?: boolean;
  mainstreamedDate?: string;
  bloodGroup?: string;
  weightKg?: number;
  heightCm?: number;
  studentUniqueCode?: string;    // Banglar Shiksha / BSP Student Unique Code
  diseCode?: string;
  healthId?: string;
  annualFamilyIncome?: number;
  birthRegistrationNo?: string;
  identificationMark?: string;
  relationshipWithGuardian?: string;
  guardianQualification?: string;
  bankIfsc?: string;
  bankAccountNo?: string;

  // B. Enrolment Information
  admissionNo?: string;
  admissionType?: string;
  academicYear?: string;
  mediumOfInstruction?: string;
  presentClassAdmissionDate?: string;
  languageGroup?: string[];
  foreignLanguage?: string;
  mandatorySubjects?: string[];
  additionalSubjects?: string[];
  coCurricularSubjects?: string[];
  academicStream?: string;
  previousStatus?: string;
  previousClass?: string;
  previousSection?: string;
  previousStream?: string;
  previousRollNo?: number;
  previousAppearedForExams?: boolean;
  previousResult?: string;
  previousMarksPercent?: number;
  previousDaysAttended?: number;
  rteSection12C?: boolean;
  rteAmountClaimed?: number;

  // C. Facility Profile
  facilitiesProvided?: string[];
  cwsnFacilities?: string[];
  competitionsOlympiads?: string[];
  ncc?: boolean;
  nss?: boolean;
  scoutsGuides?: boolean;
  distanceToSchool?: number;
  highestEducationParents?: string;
}

// ---------------------------------------------------------------
//  Filter shape used by the student search / list page.
// ---------------------------------------------------------------
export interface StudentFilters {
  query?: string;          // Free-text: matches name, father, mother, DOB, aadhaar, schoolId, PEN, studentUniqueCode
  class?: string;          // Filter by present class
  section?: string;        // Filter by present section
  status?: StudentStatus;
  admissionYear?: number;
  gender?: "Male" | "Female" | "Other";
  socialCategory?: "General" | "SC" | "ST" | "OBC" | string;
  scheme?: "kanyashree" | "kanyashree_k1" | "kanyashree_k2" | "aikyashree" | "shikshashree" | "cwsn" | "bpl";
  hasAadhaar?: "yes" | "no";
}

// Pagination meta returned alongside list results
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedStudents {
  data: Student[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------
//  Bulk Upload Types
// ---------------------------------------------------------------
export type ColumnMapping = Record<string, keyof Student | "ignore">;

export interface ValidationIssue {
  row: number;
  field: string;
  issue: string;
  severity: "error" | "warning";
  studentName?: string;
}

export interface BulkPreviewRow {
  rowNumber: number;
  action: "create" | "update" | "skip";
  matchedStudentId?: string;
  matchedBy?: "schoolId" | "pen" | "aadhaar" | "studentUniqueCode";
  name: string;
  schoolId?: string;
  pen?: string;
  aadhaar?: string;
  presentClass: string;
  presentSection: string;
  presentRoll: number;
  data: Partial<Student>;
  warnings?: string[];
  errors?: string[];
}

export interface ImportBatchSummary {
  batchId: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  timestamp: string;
  performedBy: string;
}

export type BulkUploadType = "current_students" | "old_students" | "exam_results";

export interface ImportBatchRecord {
  batchId: string;
  action: string;
  uploadType: BulkUploadType;
  targetYear?: number;
  totalAffected: number;
  createdCount: number;
  updatedCount: number;
  createdAt: string;
  performedBy?: string;
  performedByEmail?: string;
  status: "Active" | "Rolled_Back";
}

export interface BulkResultRow {
  schoolId?: string;
  studentUniqueCode?: string;
  name?: string;
  presentClass?: string;
  presentSection?: string;
  presentRoll?: number;
  academicYear: number;
  examName: string;
  fullMarks?: number;
  marksObtained: number;
  percentage?: number;
  grade?: string;
  subjectMarks?: Record<string, number>;
  remarks?: string;
}

// ---------------------------------------------------------------
//  Results & Marks Module Types
// ---------------------------------------------------------------
export interface StudentResult {
  id: string;
  studentId: string;
  academicYear: number;
  class: string;
  section: string;
  roll: number;
  examName: string;
  fullMarks: number;
  marksObtained: number;
  percentage: number;
  grade?: string;
  rankInSection?: number;
  rankInClass?: number;
  subjectMarks?: Record<string, number>;
  remarks?: string;
  batchId?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: {
    id: string;
    name: string;
    schoolId: string;
    pen?: string;
    gender: Gender;
    studentUniqueCode?: string;
  };
}

export interface ResultEntryInput {
  studentId: string;
  academicYear: number;
  class: string;
  section: string;
  roll: number;
  examName: string;
  fullMarks: number;
  marksObtained: number;
  subjectMarks?: Record<string, number>;
  remarks?: string;
  batchId?: string;
}

export interface ClassResultsSummary {
  academicYear: number;
  class: string;
  examName: string;
  fullMarks: number;
  totalStudents: number;
  evaluatedCount: number;
  highestMarks: number;
  averageMarks: number;
  results: StudentResult[];
}

