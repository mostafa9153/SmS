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
}): Promise<AdmissionApplication[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.targetClass) params.append("targetClass", filters.targetClass);
  if (filters?.admissionType) params.append("admissionType", filters.admissionType);
  if (filters?.search) params.append("search", filters.search);

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

export async function admitNewStudentApplication(
  applicationId: string,
  assignment: {
    section: string;
    roll: number;
    feePaid: boolean;
    feeAmount: number;
    paymentReceiptNo?: string;
  }
): Promise<{ success: boolean; studentId: string }> {
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
  }
): Promise<{ success: boolean; student: Student; message?: string }> {
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
