import type {
  AdmissionApplication,
  AdmissionSettings,
  Student,
} from "@/lib/types";

export interface InvoiceQueueGroup {
  class: string;
  section: string;
  totalCount: number;
  students: Array<{
    id: string;
    name: string;
    schoolId?: string;
    class: string;
    section: string;
    roll: number;
    guardianName?: string;
    contactNumber?: string;
    source: "new_admission" | "re_admission";
    admittedAt?: string;
  }>;
}

export async function getAdmissionApplications(filters?: {
  status?: string;
  targetClass?: string;
  admissionType?: string;
  search?: string;
  academicYear?: string;
  isTransferredToActive?: string;
}): Promise<AdmissionApplication[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.targetClass) params.append("targetClass", filters.targetClass);
  if (filters?.admissionType) params.append("admissionType", filters.admissionType);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.academicYear) params.append("academicYear", filters.academicYear);
  if (filters?.isTransferredToActive) params.append("isTransferredToActive", filters.isTransferredToActive);

  const res = await fetch(`/api/admission/applications?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch admission applications");
  }
  const data = await res.json();
  return data.applications || [];
}

export async function getAdmissionApplicationById(id: string): Promise<AdmissionApplication | null> {
  const res = await fetch(`/api/admission/applications/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch application");
  }
  const data = await res.json();
  return data.application || null;
}

export async function createAdmissionApplication(
  data: Partial<AdmissionApplication>
): Promise<AdmissionApplication> {
  const res = await fetch("/api/admission/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to submit admission application");
  }
  const result = await res.json();
  return result.application;
}

export async function editAdmissionApplication(
  id: string,
  data: Partial<AdmissionApplication>
): Promise<AdmissionApplication> {
  const res = await fetch(`/api/admission/applications/${id}/edit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update admission application");
  }
  const result = await res.json();
  return result.application;
}

export async function admitNewStudentApplication(
  applicationId: string,
  assignment: {
    class?: string;
    section: string;
    roll: number;
    feePaid: boolean;
    feeAmount: number;
    paymentReceiptNo?: string;
    paymentMode?: string;
    stream?: string;
    photoUrl?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankName?: string;
    kanyashreeId?: string;
    verifiedDocuments?: string[];
    forceReAdmit?: boolean;
  }
): Promise<{
  success: boolean;
  applicationId: string;
  invoiceNumber: string;
  studentName: string;
  targetClass: string;
  targetSection: string;
  targetRoll: number;
  message?: string;
}> {
  const res = await fetch(`/api/admission/applications/${applicationId}/admit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assignment),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to confirm student admission");
  }
  return res.json();
}

export async function revertAdmissionApplication(
  applicationId: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/admission/applications/${applicationId}/revert`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to revert admission");
  }
  return res.json();
}

export async function deleteAdmissionApplication(
  applicationId: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/admission/applications/${applicationId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete application");
  }
  return res.json();
}

export async function transferApplicationsToActive(payload: {
  applicationIds?: string[];
  className?: string;
  academicYear?: string;
}): Promise<{
  success: boolean;
  transferredCount: number;
  transferredStudents: Array<{ id: string; name: string; schoolId: string; class: string; roll: number }>;
  skippedCount: number;
  skippedWarnings: Array<{ id: string; name: string; reason: string }>;
  message: string;
}> {
  const res = await fetch("/api/admission/applications/transfer-to-active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to transfer admitted students to active directory");
  }
  return res.json();
}

export async function getNextAvailableRoll(
  targetClass: string,
  section: string,
  academicYear?: string
): Promise<number> {
  const params = new URLSearchParams({
    class: targetClass,
    section: section,
  });
  if (academicYear) params.append("academicYear", academicYear);

  const res = await fetch(`/api/admission/next-roll?${params.toString()}`);
  if (!res.ok) return 1;
  const data = await res.json();
  return Number(data.nextRoll) || 1;
}

export async function checkDuplicateApplicant(params: {
  aadhaar?: string;
  contact?: string;
  excludeId?: string;
}): Promise<{
  isDuplicate: boolean;
  duplicates: Array<{ source: string; name: string; class: string; matchType: string; id: string }>;
}> {
  const searchParams = new URLSearchParams();
  if (params.aadhaar) searchParams.append("aadhaar", params.aadhaar);
  if (params.contact) searchParams.append("contact", params.contact);
  if (params.excludeId) searchParams.append("excludeId", params.excludeId);

  const res = await fetch(`/api/admission/check-duplicate?${searchParams.toString()}`);
  if (!res.ok) return { isDuplicate: false, duplicates: [] };
  return res.json();
}

export async function getReAdmissionDashboardStats(params: {
  targetClass: string;
  section?: string;
  year?: string;
}): Promise<{
  stats: {
    class: string;
    section: string;
    currentYear: number;
    previousYear: number;
    totalEligible: number;
    admittedCount: number;
    pendingCount: number;
    notAdmittedCount: number;
    reAdmissionRate: number;
    online: {
      totalSubmitted: number;
      admitted: number;
      pending: number;
    };
    offline: {
      admitted: number;
      pending: number;
    };
    previousYearHistory: {
      year: number;
      totalCount: number;
    };
  };
  students: any[];
  onlineApplications: any[];
}> {
  const q = new URLSearchParams();
  q.append("class", params.targetClass);
  if (params.section && params.section !== "all") q.append("section", params.section);
  if (params.year) q.append("year", params.year);

  const res = await fetch(`/api/admission/re-admission/stats?${q.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch re-admission dashboard stats");
  }
  return res.json();
}

export async function getReAdmissionCandidates(filters: {
  targetClass: string;
  section?: string;
  search?: string;
  status?: string;
}): Promise<Student[]> {
  const params = new URLSearchParams();
  params.append("class", filters.targetClass);
  if (filters.section && filters.section !== "all") params.append("section", filters.section);
  if (filters.search) params.append("search", filters.search);
  if (filters.status) params.append("status", filters.status);

  const res = await fetch(`/api/admission/re-admission/candidates?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch re-admission candidates");
  }
  const data = await res.json();
  return data.candidates || [];
}

export async function updateReAdmissionStatus(
  studentId: string,
  payload: {
    action: "admit" | "not_admitted" | "reset";
    newClass?: string;
    newSection?: string;
    newRoll?: number;
    feePaid?: boolean;
    feeAmount?: number;
    paymentReceiptNo?: string;
    photoUrl?: string;
    updatedProfile?: Record<string, any>;
    applicationId?: string;
  }
): Promise<{ success: boolean; student: Student; message?: string; targetClass?: string; targetSection?: string; targetRoll?: number; schoolId?: string; receiptNo?: string }> {
  const res = await fetch("/api/admission/re-admission/admit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update re-admission status");
  }
  return res.json();
}

export async function getAdmissionSettings(): Promise<AdmissionSettings> {
  const res = await fetch("/api/admission/settings");
  if (!res.ok) {
    return {
      schoolId: "default",
      aiProvider: "gemini",
      aiModel: "gemini-1.5-flash",
      currentAcademicYear: "2026",
      newAdmissionActive: true,
      readmissionActive: true,
    };
  }
  const data = await res.json();
  return data.settings;
}

export async function saveAdmissionSettings(
  settings: Partial<AdmissionSettings>
): Promise<AdmissionSettings> {
  const res = await fetch("/api/admission/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save admission settings");
  }
  const data = await res.json();
  return data.settings;
}
