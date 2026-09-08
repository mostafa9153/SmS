import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type CertificateType =
  | "character-certificate"
  | "pass-certificate"
  | "transfer-certificate"
  | "kanyashree";

export interface DBCertificateRow {
  id: string;
  certificate_no: string;
  certificate_type: CertificateType;
  academic_session: string;
  issue_date: string;
  student_id: string | null;
  student_name: string;
  gender: string | null;
  father_name: string | null;
  mother_name: string | null;
  student_class: string;
  section: string | null;
  roll_no: string | null;
  date_of_birth: string | null;
  copy_type: string;
  status: "Valid" | "Cancelled";
  metadata: Record<string, any>;
  printed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBCertificateInsert {
  certificate_no: string;
  certificate_type: CertificateType;
  academic_session: string;
  issue_date: string;
  student_id?: string | null;
  student_name: string;
  gender?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  student_class: string;
  section?: string | null;
  roll_no?: string | null;
  date_of_birth?: string | null;
  copy_type?: string;
  status?: "Valid" | "Cancelled";
  metadata?: Record<string, any>;
  printed_by?: string | null;
}

export interface CertificateStats {
  totalCertificates: number;
  byType: {
    character: number;
    pass: number;
    transfer: number;
    kanyashree: number;
  };
  byClass: Record<string, number>;
  bySection: Record<string, number>;
  validCount: number;
  cancelledCount: number;
}

function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Save or update one or multiple certificates in the database
 */
export async function dbSaveCertificates(certificates: DBCertificateInsert[]): Promise<{
  success: boolean;
  savedCount: number;
  error?: string;
}> {
  if (!certificates || certificates.length === 0) {
    return { success: true, savedCount: 0 };
  }

  try {
    let supabase = getSupabase();
    if (!supabase) {
      supabase = (await createServerClient()) as any;
    }

    if (!supabase) {
      return { success: false, savedCount: 0, error: "Database client unavailable" };
    }

    const rows = certificates.map((cert) => ({
      certificate_no: cert.certificate_no.trim(),
      certificate_type: cert.certificate_type,
      academic_session: cert.academic_session,
      issue_date: cert.issue_date,
      student_id: cert.student_id ? cert.student_id.trim() : null,
      student_name: cert.student_name ? cert.student_name.trim() : "Unknown Student",
      gender: cert.gender || null,
      father_name: cert.father_name ? cert.father_name.trim() : null,
      mother_name: cert.mother_name ? cert.mother_name.trim() : null,
      student_class: cert.student_class || "General",
      section: cert.section && cert.section !== "ALL" ? cert.section : null,
      roll_no: cert.roll_no ? String(cert.roll_no).trim() : null,
      date_of_birth: cert.date_of_birth || null,
      copy_type: cert.copy_type || "Original",
      status: cert.status || "Valid",
      metadata: cert.metadata || {},
      printed_by: cert.printed_by || null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("certificates_registry")
      .upsert(rows, { onConflict: "certificate_no" })
      .select("id");

    if (error) {
      console.error("Error saving certificates to Supabase:", error);
      return { success: false, savedCount: 0, error: error.message };
    }

    return { success: true, savedCount: data?.length || rows.length };
  } catch (err: any) {
    console.error("Exception in dbSaveCertificates:", err);
    return { success: false, savedCount: 0, error: err?.message || "Failed to save certificates" };
  }
}

/**
 * Verify a certificate by its certificate number or student ID
 */
export async function dbVerifyCertificate(
  searchTerm: string
): Promise<{ valid: boolean; certificate: DBCertificateRow | null; error?: string }> {
  const normTerm = searchTerm.trim();
  if (!normTerm) {
    return { valid: false, certificate: null, error: "Please enter a certificate number or student ID" };
  }

  try {
    let supabase = getSupabase();
    if (!supabase) {
      supabase = (await createServerClient()) as any;
    }

    if (!supabase) {
      return { valid: false, certificate: null, error: "Database client unavailable" };
    }

    // Try exact or case-insensitive lookup on certificate_no first
    let { data, error } = await supabase
      .from("certificates_registry")
      .select("*")
      .ilike("certificate_no", normTerm)
      .maybeSingle();

    if (!data) {
      // Fallback search by student_id
      const res = await supabase
        .from("certificates_registry")
        .select("*")
        .ilike("student_id", normTerm)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error("Error verifying certificate:", error);
      return { valid: false, certificate: null, error: error.message };
    }

    if (!data) {
      return { valid: false, certificate: null };
    }

    const cert = data as DBCertificateRow;
    return {
      valid: cert.status === "Valid",
      certificate: cert,
    };
  } catch (err: any) {
    console.error("Exception in dbVerifyCertificate:", err);
    return { valid: false, certificate: null, error: err?.message };
  }
}

/**
 * Get aggregate statistics and counts for all issued certificates
 */
export async function dbGetCertificateStats(): Promise<{ stats: CertificateStats; error?: string }> {
  const defaultStats: CertificateStats = {
    totalCertificates: 0,
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

  try {
    let supabase = getSupabase();
    if (!supabase) {
      supabase = (await createServerClient()) as any;
    }

    if (!supabase) {
      return { stats: defaultStats, error: "Database client unavailable" };
    }

    const { data, error } = await supabase
      .from("certificates_registry")
      .select("certificate_type, student_class, section, status");

    if (error) {
      console.error("Error fetching certificate stats:", error);
      return { stats: defaultStats, error: error.message };
    }

    const stats: CertificateStats = {
      totalCertificates: data?.length || 0,
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

    if (Array.isArray(data)) {
      data.forEach((row) => {
        // Status counts
        if (row.status === "Cancelled") {
          stats.cancelledCount += 1;
        } else {
          stats.validCount += 1;
        }

        // Type counts
        if (row.certificate_type === "character-certificate") {
          stats.byType.character += 1;
        } else if (row.certificate_type === "pass-certificate") {
          stats.byType.pass += 1;
        } else if (row.certificate_type === "transfer-certificate") {
          stats.byType.transfer += 1;
        } else if (row.certificate_type === "kanyashree") {
          stats.byType.kanyashree += 1;
        }

        // Class breakdown
        if (row.student_class) {
          stats.byClass[row.student_class] = (stats.byClass[row.student_class] || 0) + 1;
        }

        // Section breakdown
        if (row.section) {
          stats.bySection[row.section] = (stats.bySection[row.section] || 0) + 1;
        }
      });
    }

    return { stats };
  } catch (err: any) {
    console.error("Exception in dbGetCertificateStats:", err);
    return { stats: defaultStats, error: err?.message };
  }
}

/**
 * Search and list certificates with filters, pagination, and sorting
 */
export async function dbSearchCertificates(params: {
  query?: string;
  certificateType?: string | null;
  studentClass?: string | null;
  section?: string | null;
  status?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ data: DBCertificateRow[]; total: number; error?: string }> {
  try {
    let supabase = getSupabase();
    if (!supabase) {
      supabase = (await createServerClient()) as any;
    }

    if (!supabase) {
      return { data: [], total: 0, error: "Database client unavailable" };
    }

    let q = supabase
      .from("certificates_registry")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params.certificateType && params.certificateType !== "ALL") {
      q = q.eq("certificate_type", params.certificateType);
    }

    if (params.studentClass && params.studentClass !== "ALL") {
      q = q.eq("student_class", params.studentClass);
    }

    if (params.section && params.section !== "ALL") {
      q = q.eq("section", params.section);
    }

    if (params.status && params.status !== "ALL") {
      q = q.eq("status", params.status);
    }

    if (params.query && params.query.trim()) {
      const term = `%${params.query.trim()}%`;
      q = q.or(
        `certificate_no.ilike.${term},student_name.ilike.${term},student_id.ilike.${term},father_name.ilike.${term}`
      );
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    q = q.range(offset, offset + limit - 1);

    const { data, count, error } = await q;

    if (error) {
      console.error("Error querying certificates_registry:", error);
      return { data: [], total: 0, error: error.message };
    }

    return {
      data: (data as DBCertificateRow[]) || [],
      total: count || 0,
    };
  } catch (err: any) {
    console.error("Exception in dbSearchCertificates:", err);
    return { data: [], total: 0, error: err?.message };
  }
}

/**
 * Update certificate status (e.g. Valid or Cancelled)
 */
export async function dbUpdateCertificateStatus(
  id: string,
  status: "Valid" | "Cancelled"
): Promise<{ success: boolean; error?: string }> {
  try {
    let supabase = getSupabase();
    if (!supabase) {
      supabase = (await createServerClient()) as any;
    }

    if (!supabase) {
      return { success: false, error: "Database client unavailable" };
    }

    const { error } = await supabase
      .from("certificates_registry")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error updating certificate status:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Exception in dbUpdateCertificateStatus:", err);
    return { success: false, error: err?.message };
  }
}
