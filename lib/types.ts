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
  | "10th test fail"
  | "exam fail - C.C"
  | "Sent Up H.S."
  | "12th test fail"
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
  schoolId: string;              // Permanent school-issued ID — format: MHS/CLASS/ADMISSION_YEAR/REG (e.g. MHS/IX/2024/105)
  name: string;
  photoUrl?: string;             // 3:4 Passport photo public URL (WebP)
  pen?: string;                  // Permanent Education Number (govt)
  hasAadhaar?: boolean | string; // Aadhaar availability: Yes / No
  aadhaar?: string;              // 12-digit Aadhaar — SENSITIVE: masked in UI by default
  dob: string;                   // ISO date string, e.g. "2012-04-15"
  gender: Gender;
  socialCategory?: string;       // e.g. "General", "OBC", "SC", "ST"
  casteCertificateNo?: string;   // Social category / Caste certificate number
  fatherName: string;
  fatherOccupation?: string;     // e.g. "Cultivator / Farmer", "Daily Wage Labourer", etc.
  motherName: string;
  motherOccupation?: string;     // e.g. "Homemaker / Housewife", "Teacher", etc.
  studentContact?: string;       // 10-digit mobile
  address?: string;
  presentClass: string;          // Current enrolled class
  presentSection: string;        // Current section
  presentRoll: number;           // Current roll number
  currentStatus: StudentStatus;
  reAdmissionStatus?: ReAdmissionStatus;
  reAdmittedAt?: string;
  reAdmittedSession?: string;
  isInvoiceQueued?: boolean;
  invoicePrintedAt?: string;
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
  religion?: string;
  minorityGroup?: string;
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
  kanyashreeId?: string;         // Kanyashree ID for female students
  diseCode?: string;
  healthId?: string;
  annualFamilyIncome?: number;
  birthRegistrationNo?: string;
  identificationMark?: string;
  relationshipWithGuardian?: string;
  guardianOccupation?: string;
  guardianQualification?: string;
  bankIfsc?: string;
  bankAccountNo?: string;

  // B. Enrolment Information
  admissionNo?: string;
  admissionType?: string;
  academicYear?: string;
  mediumOfInstruction?: string;
  presentClassAdmissionDate?: string;
  boardRegistrationNo?: string; // WBBSE / WBCHSE Board Registration No (Classes 9, 10, 11, 12)
  wbbseRegNo?: string;          // Alias for WBBSE Board Registration No (Classes 9 & 10)
  wbchseRegNo?: string;         // Alias for WBCHSE Board Registration No (Classes 11 & 12)
  boardRollNo?: string;         // Board Exam Roll Number
  wbbseRollNo?: string;         // Alias for WBBSE Board Roll Number
  wbchseRollNo?: string;        // Alias for WBCHSE Board Roll Number
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
  createdAt?: string;
  updatedAt?: string;
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
  scheme?:
    | "kanyashree"
    | "kanyashree_k1"
    | "kanyashree_k2"
    | "sikshashree"
    | "shikshashree"
    | "oasis"
    | "oasis_pre"
    | "oasis_post"
    | "svmcm"
    | "nsp"
    | "nsp_pre"
    | "nsp_post"
    | "sabooj_sathi"
    | "sabooj_sarathi"
    | "cwsn";
  hasAadhaar?: "yes" | "no";
  ageSlab?: string;
  studentType?: "active" | "old";
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
  pen?: string;
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

// ============================================================
// Admission Module Types
// ============================================================

export type AdmissionApplicationStatus = "pending" | "admitted" | "rejected";
export type AdmissionFormMethod = "offline" | "online" | "ai_scan";
export type ReAdmissionStatus = "pending" | "admitted" | "not_admitted";

export interface AdmissionApplication {
  id: string;
  applicationNo: string;
  academicYear: string;
  admissionType: "new" | "re";
  formMethod: AdmissionFormMethod;
  targetClass: string;
  targetSection?: string;
  targetRoll?: number;
  status: AdmissionApplicationStatus;

  // Student Personal Details
  studentName: string;
  photoUrl?: string;
  gender: Gender;
  dob?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  studentContact?: string;
  altMobile?: string;
  email?: string;

  // Address Details
  address?: string;
  village?: string;
  postOffice?: string;
  policeStation?: string;
  district?: string;
  pincode?: string;

  // Demographics
  religion?: string;
  socialCategory?: string;
  casteCertificateNo?: string;
  aadhaar?: string;
  bloodGroup?: string;

  // Previous Academic Records
  previousSchool?: string;
  previousClass?: string;
  previousRoll?: string;
  previousMarks?: string;

  // Payment
  feePaid: boolean;
  feeAmount: number;
  paymentReceiptNo?: string;
  paymentMode?: string;

  // Linkage upon admission
  admittedStudentId?: string;
  admittedClass?: string;
  admittedSection?: string;
  admittedRoll?: number;
  admittedAt?: string;
  admittedBy?: string;

  aiExtractedData?: Record<string, any>;
  scannedImageUrl?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionSettings {
  id?: string;
  schoolId: string;
  aiProvider: "gemini" | "openai";
  aiApiKey?: string;
  aiModel: string;
  currentAcademicYear: string;
  newAdmissionActive: boolean;
  readmissionActive: boolean;
  feeStructure?: Record<string, number>;
}


