import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { FeeItem } from "@/lib/utils/fee-config";

export interface DBInvoiceRow {
  id: string;
  invoice_number: string;
  academic_session: string;
  issue_date: string;
  issue_time: string | null;
  student_id: string | null;
  student_name: string | null;
  student_class: string;
  section: string | null;
  roll_no: string | null;
  guardian_name: string | null;
  contact_number: string | null;
  pen_number: string | null;
  fee_items: FeeItem[];
  total_amount: number;
  payment_mode: string;
  payment_status: string;
  remarks: string | null;
  generator_mode: "single" | "bulk";
  copy_type: "both" | "student" | "school";
  is_blank: boolean;
  printed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBInvoiceInsert {
  invoice_number: string;
  academic_session: string;
  issue_date: string;
  issue_time?: string | null;
  student_id?: string | null;
  student_name?: string | null;
  student_class: string;
  section?: string | null;
  roll_no?: string | null;
  guardian_name?: string | null;
  contact_number?: string | null;
  pen_number?: string | null;
  fee_items: FeeItem[];
  total_amount: number;
  payment_mode?: string;
  payment_status?: string;
  remarks?: string | null;
  generator_mode?: "single" | "bulk";
  copy_type?: "both" | "student" | "school";
  is_blank?: boolean;
  printed_by?: string | null;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalFilled: number;
  totalBlank: number;
  totalBulk: number;
  totalSingle: number;
  totalAmount: number;
  byClass: Record<string, number>;
}

function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    // fallback if service role key not available
    return null;
  }
}

/**
 * Save / Upsert one or multiple invoices to the database
 */
export async function dbSaveInvoices(invoices: DBInvoiceInsert[]): Promise<{
  success: boolean;
  savedCount: number;
  error?: string;
}> {
  if (!invoices || invoices.length === 0) {
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

    // Clean payload and ensure standard formats
    const rows = invoices.map((inv) => ({
      invoice_number: inv.invoice_number.trim(),
      academic_session: inv.academic_session,
      issue_date: inv.issue_date,
      issue_time: inv.issue_time || null,
      student_id: inv.student_id ? inv.student_id.trim() : null,
      student_name: inv.student_name ? inv.student_name.trim() : null,
      student_class: inv.student_class,
      section: inv.section && inv.section !== "ALL" ? inv.section : null,
      roll_no: inv.roll_no ? String(inv.roll_no).trim() : null,
      guardian_name: inv.guardian_name ? inv.guardian_name.trim() : null,
      contact_number: inv.contact_number || null,
      pen_number: inv.pen_number || null,
      fee_items: inv.fee_items || [],
      total_amount: Number(inv.total_amount) || 0,
      payment_mode: inv.payment_mode || "Cash",
      payment_status: inv.payment_status || "Paid",
      remarks: inv.remarks || null,
      generator_mode: inv.generator_mode || "single",
      copy_type: inv.copy_type || "both",
      is_blank: Boolean(inv.is_blank),
      printed_by: inv.printed_by || null,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("admission_invoices")
      .upsert(rows, { onConflict: "invoice_number" })
      .select("id");

    if (error) {
      console.error("Error saving admission invoices:", error);
      return { success: false, savedCount: 0, error: error.message };
    }

    return { success: true, savedCount: data?.length || rows.length };
  } catch (err: any) {
    console.error("Exception in dbSaveInvoices:", err);
    return { success: false, savedCount: 0, error: err?.message || "Failed to save invoices" };
  }
}

/**
 * Verify an invoice by its invoice number
 */
export async function dbVerifyInvoice(
  invoiceNumber: string
): Promise<{ valid: boolean; invoice: DBInvoiceRow | null; error?: string }> {
  const normNumber = invoiceNumber.trim();
  if (!normNumber) {
    return { valid: false, invoice: null, error: "Please enter an invoice number" };
  }

  try {
    let supabase = getSupabase();
    if (!supabase) {
      supabase = (await createServerClient()) as any;
    }

    if (!supabase) {
      return { valid: false, invoice: null, error: "Database client unavailable" };
    }

    const { data, error } = await supabase
      .from("admission_invoices")
      .select("*")
      .ilike("invoice_number", normNumber)
      .maybeSingle();

    if (error) {
      console.error("Error verifying invoice:", error);
      return { valid: false, invoice: null, error: error.message };
    }

    if (!data) {
      return { valid: false, invoice: null };
    }

    return { valid: true, invoice: data as DBInvoiceRow };
  } catch (err: any) {
    console.error("Exception in dbVerifyInvoice:", err);
    return { valid: false, invoice: null, error: err?.message };
  }
}

/**
 * Get aggregate statistics and counts
 */
export async function dbGetInvoiceStats(): Promise<{ stats: InvoiceStats; error?: string }> {
  const defaultStats: InvoiceStats = {
    totalInvoices: 0,
    totalFilled: 0,
    totalBlank: 0,
    totalBulk: 0,
    totalSingle: 0,
    totalAmount: 0,
    byClass: {},
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
      .from("admission_invoices")
      .select("is_blank, generator_mode, total_amount, student_class");

    if (error) {
      console.error("Error fetching invoice stats:", error);
      return { stats: defaultStats, error: error.message };
    }

    const stats: InvoiceStats = { ...defaultStats };

    if (Array.isArray(data)) {
      stats.totalInvoices = data.length;
      data.forEach((row) => {
        if (row.is_blank) {
          stats.totalBlank += 1;
        } else {
          stats.totalFilled += 1;
        }

        if (row.generator_mode === "bulk") {
          stats.totalBulk += 1;
        } else {
          stats.totalSingle += 1;
        }

        stats.totalAmount += Number(row.total_amount) || 0;

        if (row.student_class) {
          stats.byClass[row.student_class] = (stats.byClass[row.student_class] || 0) + 1;
        }
      });
    }

    return { stats };
  } catch (err: any) {
    console.error("Exception in dbGetInvoiceStats:", err);
    return { stats: defaultStats, error: err?.message };
  }
}

/**
 * Search and list invoices with pagination and filters
 */
export async function dbSearchInvoices(params: {
  query?: string;
  isBlank?: boolean | null;
  generatorMode?: "single" | "bulk" | null;
  studentClass?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ data: DBInvoiceRow[]; total: number; error?: string }> {
  try {
    let supabase = getSupabase();
    if (!supabase) {
      supabase = (await createServerClient()) as any;
    }

    if (!supabase) {
      return { data: [], total: 0, error: "Database client unavailable" };
    }

    let q = supabase
      .from("admission_invoices")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (params.isBlank !== undefined && params.isBlank !== null) {
      q = q.eq("is_blank", params.isBlank);
    }

    if (params.generatorMode) {
      q = q.eq("generator_mode", params.generatorMode);
    }

    if (params.studentClass && params.studentClass !== "ALL") {
      q = q.eq("student_class", params.studentClass);
    }

    if (params.query && params.query.trim()) {
      const term = `%${params.query.trim()}%`;
      q = q.or(
        `invoice_number.ilike.${term},student_name.ilike.${term},student_id.ilike.${term},guardian_name.ilike.${term}`
      );
    }

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    q = q.range(offset, offset + limit - 1);

    const { data, count, error } = await q;

    if (error) {
      console.error("Error searching admission invoices:", error);
      return { data: [], total: 0, error: error.message };
    }

    return {
      data: (data as DBInvoiceRow[]) || [],
      total: count || 0,
    };
  } catch (err: any) {
    console.error("Exception in dbSearchInvoices:", err);
    return { data: [], total: 0, error: err?.message };
  }
}
