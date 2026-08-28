import type {
  Student,
  StudentFilters,
  PaginatedStudents,
  StudentStatus,
} from "@/lib/types";
import { sortClasses } from "@/lib/utils";

/**
 * Returns all students (unfiltered, unpaginated).
 * Used for dashboard calculations and unique list extractions.
 */
export async function getStudents(): Promise<Student[]> {
  const res = await fetch("/api/students?paginated=false");
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
  pageSize = 20
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
  params.append("page", String(page));
  params.append("pageSize", String(pageSize));

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
): Promise<Student | null> {
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
  return data.student;
}

/**
 * Deletes a student by ID.
 */
export async function deleteStudent(id: string): Promise<boolean> {
  const res = await fetch(`/api/students/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete student");
  }
  const data = await res.json();
  return !!data.success;
}

/**
 * Bulk promotes/updates a list of students to a new class/section/status.
 */
export async function bulkUpdateStudents(
  updates: Array<{ id: string; changes: Partial<Omit<Student, "id">> }>
): Promise<Student[]> {
  const res = await fetch("/api/students/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Bulk update failed");
  }
  const data = await res.json();
  return data.students || [];
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

/** Returns unique sorted admission years */
export async function getDistinctAdmissionYears(): Promise<number[]> {
  const meta = await getStudentFilterMetadata();
  return meta.admissionYears || [];
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
 * Fetch results for an entire class/section.
 */
export async function getClassResults(
  academicYear: number,
  className: string,
  section?: string,
  examName = "Annual Examination"
) {
  const params = new URLSearchParams();
  params.set("year", String(academicYear));
  params.set("class", className);
  if (section && section !== "ALL") params.set("section", section);
  params.set("exam", examName);

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
  examName?: string;
  fullMarks?: number;
  marksObtained: number;
  subjectMarks?: Record<string, number>;
  remarks?: string;
}) {
  const res = await fetch("/api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save student result");
  }

  return res.json();
}

/**
 * Recalculate and re-index ranks for an entire class.
 */
export async function recalculateClassRanks(
  academicYear: number,
  className: string,
  examName = "Annual Examination"
) {
  const res = await fetch("/api/results/calculate-ranks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ academicYear, class: className, examName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to recalculate ranks");
  }

  return res.json();
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
 * Fetch whole-school academic session readiness audit.
 */
export async function getSessionReadiness(
  year?: number,
  examName = "Annual Examination",
  minPassPercentage = 30
) {
  const params = new URLSearchParams();
  if (year) params.append("year", String(year));
  params.append("examName", examName);
  params.append("minPassPercentage", String(minPassPercentage));

  const res = await fetch(`/api/academic-session/readiness?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch session readiness audit");
  }
  const data = await res.json();
  return data.report;
}

/**
 * Execute whole-school academic session transition.
 */
export async function executeSessionTransition(params: {
  fromYear: number;
  toYear: number;
  rollStrategy: "rank" | "preserve" | "alphabetical";
  examName?: string;
  minPassPercentage?: number;
  overriddenStudentIds?: string[];
}) {
  const res = await fetch("/api/academic-session/transition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Session transition execution failed");
  }

  return res.json();
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



