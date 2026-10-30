import type {
  AdmissionApplication,
  AdmissionSettings,
  Student,
} from "@/lib/types";
import { apiFetch, ApiError } from "@/lib/api/client";
import { currentYearIST } from "@/lib/utils/academic-year";

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

  const body = await apiFetch<{ applications?: AdmissionApplication[] }>(`/api/admission/applications?${params.toString()}`, { raw: true });
  return body.applications || [];
}

export async function getAdmissionApplicationById(id: string): Promise<AdmissionApplication | null> {
  try {
    const body = await apiFetch<{ application?: AdmissionApplication }>(`/api/admission/applications/${id}`, { raw: true });
    return body.application || null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createAdmissionApplication(
  data: Partial<AdmissionApplication>
): Promise<AdmissionApplication> {
  const body = await apiFetch<{ application: AdmissionApplication }>("/api/admission/applications", {
    method: "POST",
    json: data,
    raw: true,
  });
  return body.application;
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
  return apiFetch(`/api/admission/applications/${applicationId}/admit`, { method: "POST", json: assignment, raw: true });
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

  return apiFetch(`/api/admission/re-admission/stats?${q.toString()}`, { raw: true });
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

  const body = await apiFetch<{ candidates?: Student[] }>(`/api/admission/re-admission/candidates?${params.toString()}`, { raw: true });
  return body.candidates || [];
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
  return apiFetch("/api/admission/re-admission/admit", { method: "POST", json: { studentId, ...payload }, raw: true });
}

export async function getAdmissionSettings(): Promise<AdmissionSettings> {
  const res = await fetch("/api/admission/settings");
  if (!res.ok) {
    return {
      schoolId: "default",
      aiProvider: "gemini",
      aiModel: "gemini-1.5-flash",
      currentAcademicYear: String(currentYearIST()),
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
  const body = await apiFetch<{ settings: AdmissionSettings }>("/api/admission/settings", {
    method: "POST",
    json: settings,
    raw: true,
  });
  return body.settings;
}
