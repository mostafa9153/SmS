import type {
  Student,
  StudentFilters,
  PaginatedStudents,
  StudentStatus,
  Semester,
  SubjectMarksMap,
} from "@/lib/types";
import { apiFetch } from "@/lib/api/client";

/**
 * Returns all students (unfiltered, unpaginated).
 * Defaults to lean summary projection (no heavy joins) for document generation and tables.
 */
export async function getStudents(
  options?: "summary" | "full" | unknown,
  studentClass?: string,
  section?: string
): Promise<Student[]> {
  const projection = typeof options === "string" && (options === "summary" || options === "full") ? options : "summary";
  
  let url = `/api/students?paginated=false&projection=${projection}`;
  if (studentClass && studentClass !== "all") {
    url += `&class=${encodeURIComponent(studentClass)}`;
  }
  if (section && section !== "all") {
    url += `&section=${encodeURIComponent(section)}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch students");
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Returns a single student by ID, or null if not found.
 */
export async function getStudentById(id: string): Promise<Student | null> {
  const res = await fetch(`/api/students/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch student profile");
  }
  const data = await res.json();
  return data.student || null;
}

/**
 * Filtered + paginated student search.
 */
export async function searchStudents(
  filters: StudentFilters = {},
  page = 1,
  pageSize = 20,
  projection: "summary" | "full" = "summary"
): Promise<PaginatedStudents> {
  const params = new URLSearchParams();
  if (filters.query) params.append("q", filters.query);
  if (filters.class) params.append("class", filters.class);
  if (filters.section) params.append("section", filters.section);
  if (filters.status) params.append("status", filters.status);
  if (filters.admissionYear) params.append("admissionYear", String(filters.admissionYear));
  if (filters.gender) params.append("gender", filters.gender);
  if (filters.socialCategory) params.append("socialCategory", filters.socialCategory);
  if (filters.scheme) params.append("scheme", filters.scheme);
  if (filters.hasAadhaar) params.append("hasAadhaar", filters.hasAadhaar);
  if (filters.ageSlab) params.append("ageSlab", filters.ageSlab);
  if (filters.semester) params.append("semester", filters.semester);
  if (filters.studentType) params.append("type", filters.studentType);
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));
  params.append("projection", projection);

  const res = await fetch(`/api/students?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Search query failed");
  }
  return res.json() as Promise<PaginatedStudents>;
}

/**
 * Creates a new student record.
 */
export async function createStudent(
  input: Omit<Student, "id">
): Promise<Student> {
  const res = await fetch("/api/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to register student");
  }
  const data = await res.json();
  return data.student;
}

/**
 * Updates an existing student record.
 */
export async function updateStudent(
  id: string,
  updates: Partial<Omit<Student, "id">>
): Promise<{ student: Student | null; undoId: string | null }> {
  const res = await fetch(`/api/students/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update student profile");
  }
  const data = await res.json();
  return { student: data.student ?? null, undoId: data.undoId ?? null };
}

/**
 * Deletes a student by ID.
 */
export async function deleteStudent(id: string): Promise<{ undoId: string | null }> {
  const res = await fetch(`/api/students/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete student");
  }
  const data = await res.json();
  return { undoId: data.undoId ?? null };
}

// ── Utility / derived data helpers ──────────────────────────

/** Fetch lightweight filter metadata (classes, sections, admission years) */
export async function getStudentFilterMetadata(): Promise<{
  classes: string[];
  sections: string[];
  admissionYears: number[];
}> {
  const res = await fetch("/api/students/metadata");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch filter metadata");
  }
  return res.json();
}

/** Returns unique sorted list of classes present in the database */
export async function getDistinctClasses(): Promise<string[]> {
  const meta = await getStudentFilterMetadata();
  return meta.classes || [];
}

/** Returns unique sorted list of sections present in the database */
export async function getDistinctSections(): Promise<string[]> {
  const meta = await getStudentFilterMetadata();
  return meta.sections || [];
}

/** Returns aggregate dashboard stats derived from the full dataset */
export async function getDashboardStats() {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch dashboard stats");
  }
  return res.json();
}

// ── Bulk Upload & Rollback APIs ──────────────────────────

/**
 * Executes a full bulk upload batch against the backend engine.
 */
export async function executeBulkUpload(
  rows: Array<Partial<Student>>,
  uploadType: "current_students" | "old_students" = "current_students"
) {
  const res = await fetch("/api/students/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, uploadType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Bulk upload processing failed");
  }

  return res.json();
}

/**
 * Execute bulk upload of examination results.
 */
export async function executeResultsBulkUpload(
  rows: any[],
  targetSessionYear?: number,
  targetExamName?: string
) {
  const res = await fetch("/api/results/bulk-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, targetSessionYear, targetExamName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Results bulk upload processing failed");
  }

  return res.json();
}

/**
 * Rollback / Delete an entire import batch (Students or Exam Results).
 */
export async function rollbackBulkUpload(batchId: string) {
  const res = await fetch("/api/students/bulk-upload/rollback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Rollback failed");
  }

  return res.json();
}

/**
 * Fetch past import batches list.
 */
export async function getImportBatches() {
  const res = await fetch("/api/students/bulk-upload");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch import batches");
  }
  const data = await res.json();
  return data.batches || [];
}

// ── Results & Marks Management APIs ──────────────────────────

/**
 * Fetch results for an entire class/section (with optional semester for Class XI/XII).
 */
export async function getClassResults(
  academicYear: number,
  className: string,
  section?: string,
  examName = "Annual Examination",
  semester?: Semester
) {
  const params = new URLSearchParams();
  params.set("year", String(academicYear));
  params.set("class", className);
  if (section && section !== "ALL") params.set("section", section);
  params.set("exam", examName);
  if (semester) params.set("semester", semester);

  const res = await fetch(`/api/results?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch class results");
  }
  return res.json();
}

/**
 * Save or update a single student's marks.
 */
export async function saveStudentResult(input: {
  studentId: string;
  academicYear: number;
  class: string;
  section: string;
  roll: number;
  semester?: Semester | null;
  examName?: string;
  fullMarks?: number;
  marksObtained: number;
  subjectMarks?: SubjectMarksMap;
  remarks?: string;
}) {
  return apiFetch<{ result: unknown; undoId?: string | null }>("/api/results", { method: "POST", json: input });
}

/**
 * Save subject-wise batch marks for all students in a class/section.
 */
export async function saveSubjectBatchMarks(input: {
  academicYear: number;
  class: string;
  section?: string;
  examName: string;
  subjectName: string;
  scores: Array<{
    studentId: string;
    roll: number;
    section: string;
    writtenMarks: number;
    practicalMarks?: number;
    isAbsent?: boolean;
  }>;
}) {
  return apiFetch<{ count: number; undoId?: string | null }>("/api/results/subject-batch", { method: "POST", json: input });
}

/**
 * Recalculate and re-index ranks for an entire class.
 */
export async function recalculateClassRanks(
  academicYear: number,
  className: string,
  examName = "Annual Examination"
) {
  return apiFetch<{ message?: string; undoId?: string | null }>("/api/results/calculate-ranks", {
    method: "POST",
    json: { academicYear, class: className, examName },
  });
}

/**
 * Fetch multi-year results history for a single student profile.
 */
export async function getStudentResultHistory(studentId: string) {
  const res = await fetch(`/api/results/student/${studentId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch student results history");
  }
  const data = await res.json();
  return data.results || [];
}

/**
 * Fetch current authenticated user's profile and role.
 */
export async function getCurrentUserRole(): Promise<{
  role: "Admin" | "Staff" | "Guest";
  fullName?: string;
  userId: string | null;
}> {
  const res = await fetch("/api/auth/role");
  if (!res.ok) {
    return { role: "Guest", userId: null };
  }
  return res.json();
}

export interface OldStudentItem {
  id: string;
  name: string;
  schoolId?: string;
  pen?: string;
  studentClass: string;
  section: string;
  roll: number;
  gender: string;
  exitYear: number;
  status: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  contact?: string;
  dob?: string;
}

export async function getOldStudents(params: {
  year: number;
  query?: string;
  studentClass?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: OldStudentItem[]; total: number }> {
  try {
    const q = new URLSearchParams();
    q.append("year", String(params.year));
    if (params.query) q.append("q", params.query);
    if (params.studentClass && params.studentClass !== "ALL") q.append("class", params.studentClass);
    if (params.page) q.append("page", String(params.page));
    if (params.pageSize) q.append("pageSize", String(params.pageSize));

    const res = await fetch(`/api/students/old-students?${q.toString()}`);
    if (!res.ok) return { data: [], total: 0 };
    return res.json();
  } catch {
    return { data: [], total: 0 };
  }
}

export async function executeCohortPromotion(params: {
  academicYear: number;
  targetAcademicYear: number;
  sourceClass: string;
  rollStrategy: "rank" | "preserve" | "alphabetical";
  examName?: string;
  promotions: Array<{
    studentId: string;
    currentClass: string;
    currentSection: string;
    currentRoll: number;
    currentSemester?: Semester | null;
    currentStatus: StudentStatus;
    targetClass: string;
    targetSection: string;
    targetRoll: number;
    targetSemester?: Semester | null;
    targetStatus: StudentStatus;
    isOverridden?: boolean;
    overrideReason?: string;
    evaluationReason?: string;
    marksObtained?: number;
    percentage?: number;
    failedSubjectNames?: string[];
  }>;
}) {
  const res = await fetch("/api/students/promotion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Cohort promotion execution failed");
  }

  const result = await res.json();
  if (result.success === false && Array.isArray(result.failed) && result.failed.length > 0) {
    throw new Error(`${result.failed.length} student(s) failed to update: ${result.failed[0].error}`);
  }
  return result;
}

export async function undoCohortPromotion(params: {
  sourceClass?: string;
  academicYear?: number;
  studentIds?: string[];
  resetToContinuing?: boolean;
}) {
  const res = await fetch("/api/students/promotion/undo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to rollback promotion");
  }

  return res.json();
}

interface StatusActionPayload {
  action: "tc_out" | "drop_out" | "archive_stale";
  studentIds?: string[];
  tcDate?: string;
  tcReason?: string;
  tcNo?: string;
  reason?: string;
}

interface StatusActionResult {
  count: number;
  message: string;
  undoId?: string | null;
}

async function executeStudentStatusAction(payload: StatusActionPayload) {
  return apiFetch<StatusActionResult>("/api/students/status-action", { method: "POST", json: payload });
}

export async function issueTransferCertificate(
  studentId: string,
  tcData?: { tcDate?: string; tcReason?: string; tcNo?: string }
) {
  return executeStudentStatusAction({
    action: "tc_out",
    studentIds: [studentId],
    ...tcData,
  });
}

export async function markStudentsDropOut(studentIds: string[], reason?: string) {
  return executeStudentStatusAction({
    action: "drop_out",
    studentIds,
    reason,
  });
}

export async function archiveStalePendingStudents() {
  return executeStudentStatusAction({
    action: "archive_stale",
  });
}
