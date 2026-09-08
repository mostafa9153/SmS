import type {
  DBCertificateInsert,
  DBCertificateRow,
  CertificateStats,
  CertificateType,
} from "@/lib/supabase/db-certificates";
import type { CharacterCertificateData } from "@/components/certificate/certificate-printable-view";
import type { PassCertificateData } from "@/components/certificate/pass-certificate-printable-view";
import type { TransferCertificateData } from "@/components/certificate/transfer-certificate-printable-view";
import type { KanyashreeCertificateData } from "@/components/certificate/kanyashree-certificate-printable-view";

const LOCAL_CERT_REGISTRY_KEY = "sms_cached_certificates_registry_v1";

/**
 * Get cached certificates from browser localStorage
 */
export function getLocalCachedCertificates(): DBCertificateRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CERT_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error reading cached certificates:", e);
    return [];
  }
}

/**
 * Save certificate(s) to localStorage cache
 */
export function saveLocalCachedCertificates(certs: DBCertificateInsert[]) {
  if (typeof window === "undefined" || !certs.length) return;
  try {
    const current = getLocalCachedCertificates();
    const existingMap = new Map(current.map((c) => [c.certificate_no.toUpperCase(), c]));

    const now = new Date().toISOString();
    certs.forEach((c) => {
      const row: DBCertificateRow = {
        id: (c as any).id || `loc_cert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        certificate_no: c.certificate_no,
        certificate_type: c.certificate_type,
        academic_session: c.academic_session,
        issue_date: c.issue_date,
        student_id: c.student_id || null,
        student_name: c.student_name,
        gender: c.gender || null,
        father_name: c.father_name || null,
        mother_name: c.mother_name || null,
        student_class: c.student_class,
        section: c.section || null,
        roll_no: c.roll_no || null,
        date_of_birth: c.date_of_birth || null,
        copy_type: c.copy_type || "Original",
        status: c.status || "Valid",
        metadata: c.metadata || {},
        printed_by: c.printed_by || null,
        created_at: now,
        updated_at: now,
      };
      existingMap.set(c.certificate_no.toUpperCase(), row);
    });

    const updated = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Keep up to 600 records client-side
    localStorage.setItem(LOCAL_CERT_REGISTRY_KEY, JSON.stringify(updated.slice(0, 600)));
  } catch (e) {
    console.error("Error updating local certificates cache:", e);
  }
}

/**
 * Calculate stats from local cache fallback
 */
export function getLocalCertificateStats(): CertificateStats {
  const list = getLocalCachedCertificates();
  const stats: CertificateStats = {
    totalCertificates: list.length,
    byType: {
      character: 0,
      pass: 0,
      transfer: 0,
      kanyashree: 0,
    },
    byClass: {},
    bySection: {},
    validCount: 0,
    cancelledCount: 0,
  };

  list.forEach((c) => {
    if (c.status === "Cancelled") {
      stats.cancelledCount += 1;
    } else {
      stats.validCount += 1;
    }

    if (c.certificate_type === "character-certificate") stats.byType.character += 1;
    else if (c.certificate_type === "pass-certificate") stats.byType.pass += 1;
    else if (c.certificate_type === "transfer-certificate") stats.byType.transfer += 1;
    else if (c.certificate_type === "kanyashree") stats.byType.kanyashree += 1;

    if (c.student_class) {
      stats.byClass[c.student_class] = (stats.byClass[c.student_class] || 0) + 1;
    }
    if (c.section) {
      stats.bySection[c.section] = (stats.bySection[c.section] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Adapter: Character Certificate
 */
export function buildCharacterCertInsert(
  data: CharacterCertificateData,
  academicSession: string
): DBCertificateInsert {
  const studentClass = data.examType === "HS" ? "XII" : "X";
  return {
    certificate_no: data.certificateNo,
    certificate_type: "character-certificate",
    academic_session: academicSession,
    issue_date: data.issueDate,
    student_id: data.studentId || null,
    student_name: data.studentName || "Unnamed Student",
    gender: data.gender || null,
    father_name: data.fatherName || null,
    student_class: studentClass,
    section: null,
    roll_no: null,
    copy_type: data.copyType || "Original",
    status: "Valid",
    metadata: {
      examType: data.examType,
      boardRollNo: data.boardRollNo,
      boardRegistrationNo: data.boardRegistrationNo,
      passingYear: data.passingYear,
      conduct: data.conduct,
      village: data.village,
      postOffice: data.postOffice,
      policeStation: data.policeStation,
      district: data.district,
      pincode: data.pincode,
      remarks: data.remarks,
    },
  };
}

/**
 * Adapter: Pass Out Certificate
 */
export function buildPassCertInsert(
  data: PassCertificateData,
  academicSession: string
): DBCertificateInsert {
  return {
    certificate_no: data.certificateNo,
    certificate_type: "pass-certificate",
    academic_session: academicSession,
    issue_date: data.issueDate,
    student_id: data.studentId || null,
    student_name: data.studentName || "Unnamed Student",
    gender: data.gender || null,
    father_name: data.fatherName || null,
    student_class: data.passedClass || "X",
    section: null,
    roll_no: null,
    date_of_birth: data.dateOfBirth || null,
    copy_type: data.copyType || "Original",
    status: "Valid",
    metadata: {
      admissionYear: data.admissionYear,
      admissionClass: data.admissionClass,
      passingYear: data.passingYear,
      passedClass: data.passedClass,
      eligibleForClass: data.eligibleForClass,
      isCompletedOrPassedOut: data.isCompletedOrPassedOut,
      dateOfBirthWords: data.dateOfBirthWords,
      conduct: data.conduct,
      village: data.village,
      postOffice: data.postOffice,
      policeStation: data.policeStation,
      district: data.district,
      pincode: data.pincode,
      remarks: data.remarks,
    },
  };
}

/**
 * Adapter: Transfer Certificate (TC)
 */
export function buildTransferCertInsert(
  data: TransferCertificateData,
  academicSession: string
): DBCertificateInsert {
  return {
    certificate_no: data.certificateNo,
    certificate_type: "transfer-certificate",
    academic_session: academicSession,
    issue_date: data.issueDate,
    student_id: data.studentId || null,
    student_name: data.studentName || "Unnamed Student",
    gender: data.gender || null,
    father_name: data.fatherName || null,
    student_class: data.readingClass || "General",
    section: null,
    roll_no: null,
    date_of_birth: data.dateOfBirth || null,
    copy_type: data.copyType || "Original",
    status: "Valid",
    metadata: {
      readingClass: data.readingClass,
      dateOfLeaving: data.dateOfLeaving,
      hasPassedAnnualExam: data.hasPassedAnnualExam,
      promotedClass: data.promotedClass,
      isCourseCompleted: data.isCourseCompleted,
      feesClearedUpToDate: data.feesClearedUpToDate,
      conduct: data.conduct,
      selectedReasonIndex: data.selectedReasonIndex,
      customReason: data.customReason,
      dateOfBirthDayWords: data.dateOfBirthDayWords,
      dateOfBirthMonthWords: data.dateOfBirthMonthWords,
      dateOfBirthYearWords: data.dateOfBirthYearWords,
      village: data.village,
      postOffice: data.postOffice,
      policeStation: data.policeStation,
      district: data.district,
      pincode: data.pincode,
    },
  };
}

/**
 * Adapter: Kanyashree Certificate
 */
export function buildKanyashreeCertInsert(
  data: KanyashreeCertificateData,
  academicSession: string
): DBCertificateInsert {
  return {
    certificate_no: data.certificateNo,
    certificate_type: "kanyashree",
    academic_session: academicSession,
    issue_date: data.issueDate,
    student_id: data.studentId || null,
    student_name: data.studentName || "Unnamed Student",
    gender: data.gender || "Female",
    father_name: data.fatherName || null,
    mother_name: data.motherName || null,
    student_class: data.presentClass || "IX",
    section: data.presentSection || null,
    roll_no: data.presentRoll || null,
    date_of_birth: data.dateOfBirth || null,
    copy_type: data.copyType || "Original",
    status: "Valid",
    metadata: {
      schemeType: data.schemeType,
      kanyashreeId: data.kanyashreeId,
      pen: data.pen,
      isUnmarried: data.isUnmarried,
      dateOfBirthWords: data.dateOfBirthWords,
      conduct: data.conduct,
      village: data.village,
      postOffice: data.postOffice,
      policeStation: data.policeStation,
      district: data.district,
      pincode: data.pincode,
      remarks: data.remarks,
    },
  };
}

/**
 * Universal print recorder: Saves to local storage & posts to API
 */
export async function recordPrintedCertificate(
  certInsert: DBCertificateInsert
): Promise<{ success: boolean; error?: string }> {
  if (!certInsert || !certInsert.certificate_no) {
    return { success: false, error: "Invalid certificate record" };
  }

  // 1. Immediately cache locally
  saveLocalCachedCertificates([certInsert]);

  // Dispatch custom browser event so open tabs or modals can react
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("sms_certificate_recorded", {
        detail: { certificate: certInsert },
      })
    );
  }

  // 2. Persist to Supabase via server API
  try {
    const res = await fetch("/api/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificate: certInsert }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("Database save warning for certificate:", data?.error);
      return { success: false, error: data?.error };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Network error saving certificate to DB:", err);
    return { success: false, error: err?.message };
  }
}
