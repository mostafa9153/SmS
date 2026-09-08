import type { InvoiceData } from "@/lib/utils/fee-config";
import type { DBInvoiceInsert, DBInvoiceRow, InvoiceStats } from "@/lib/supabase/db-invoices";

const LOCAL_REGISTRY_KEY = "sms_cached_invoices_registry_v1";

/**
 * Get all cached invoices from browser localStorage
 */
export function getLocalCachedInvoices(): DBInvoiceRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error reading cached invoices:", e);
    return [];
  }
}

/**
 * Save invoices to localStorage cache as client-side backup
 */
export function saveLocalCachedInvoices(invoices: DBInvoiceInsert[]) {
  if (typeof window === "undefined" || !invoices.length) return;
  try {
    const current = getLocalCachedInvoices();
    const existingMap = new Map(current.map((inv) => [inv.invoice_number.toUpperCase(), inv]));

    const now = new Date().toISOString();
    invoices.forEach((inv) => {
      const row: DBInvoiceRow = {
        id: (inv as any).id || `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        invoice_number: inv.invoice_number,
        academic_session: inv.academic_session,
        issue_date: inv.issue_date,
        issue_time: inv.issue_time || null,
        student_id: inv.student_id || null,
        student_name: inv.student_name || null,
        student_class: inv.student_class,
        section: inv.section || null,
        roll_no: inv.roll_no || null,
        guardian_name: inv.guardian_name || null,
        contact_number: inv.contact_number || null,
        pen_number: inv.pen_number || null,
        fee_items: inv.fee_items || [],
        total_amount: inv.total_amount || 0,
        payment_mode: inv.payment_mode || "Cash",
        payment_status: inv.payment_status || "Paid",
        remarks: inv.remarks || null,
        generator_mode: inv.generator_mode || "single",
        copy_type: inv.copy_type || "both",
        is_blank: Boolean(inv.is_blank),
        printed_by: inv.printed_by || null,
        created_at: now,
        updated_at: now,
      };
      existingMap.set(inv.invoice_number.toUpperCase(), row);
    });

    const updated = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Keep up to 500 recent invoices in cache
    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(updated.slice(0, 500)));
  } catch (e) {
    console.error("Error updating local invoices cache:", e);
  }
}

/**
 * Convert app InvoiceData array to DB insert payload
 */
export function convertInvoicesToInsertPayload(
  invoices: InvoiceData[],
  generatorMode: "single" | "bulk",
  copyType: "both" | "student" | "school"
): DBInvoiceInsert[] {
  return invoices.map((inv) => {
    const total = inv.feeItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const isBlank = Boolean(
      inv.isBlankTemplate || (!inv.studentName?.trim() && !inv.studentId?.trim())
    );

    return {
      invoice_number: inv.invoiceNumber,
      academic_session: inv.academicSession,
      issue_date: inv.issueDate,
      issue_time: inv.issueTime || null,
      student_id: inv.studentId || null,
      student_name: inv.studentName || null,
      student_class: inv.studentClass || "IX",
      section: inv.section && inv.section !== "ALL" ? inv.section : null,
      roll_no: inv.rollNo || null,
      guardian_name: inv.guardianName || null,
      contact_number: inv.contactNumber || null,
      pen_number: inv.penNumber || null,
      fee_items: inv.feeItems || [],
      total_amount: total,
      payment_mode: inv.paymentMode || "Cash",
      payment_status: inv.paymentStatus || "Paid",
      remarks: inv.remarks || null,
      generator_mode: generatorMode,
      copy_type: copyType,
      is_blank: isBlank,
    };
  });
}

/**
 * Record printed invoices to Database & Local Cache
 */
export async function recordPrintedInvoices(
  invoices: InvoiceData[],
  generatorMode: "single" | "bulk",
  copyType: "both" | "student" | "school"
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!invoices.length) return { success: true, count: 0 };

  const payload = convertInvoicesToInsertPayload(invoices, generatorMode, copyType);

  // 1. Immediately cache locally
  saveLocalCachedInvoices(payload);

  // 2. Persist to Supabase via API
  try {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoices: payload }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("Database save warning:", data?.error);
      return { success: false, count: payload.length, error: data?.error };
    }

    return { success: true, count: data.savedCount || payload.length };
  } catch (err: any) {
    console.error("Network error saving invoices to DB:", err);
    return { success: false, count: payload.length, error: err?.message };
  }
}

/**
 * Compute stats from local cache (used as fallback or offline)
 */
export function getLocalStats(): InvoiceStats {
  const local = getLocalCachedInvoices();
  const stats: InvoiceStats = {
    totalInvoices: local.length,
    totalFilled: 0,
    totalBlank: 0,
    totalBulk: 0,
    totalSingle: 0,
    totalAmount: 0,
    byClass: {},
  };

  local.forEach((row) => {
    if (row.is_blank) stats.totalBlank += 1;
    else stats.totalFilled += 1;

    if (row.generator_mode === "bulk") stats.totalBulk += 1;
    else stats.totalSingle += 1;

    stats.totalAmount += Number(row.total_amount) || 0;
    if (row.student_class) {
      stats.byClass[row.student_class] = (stats.byClass[row.student_class] || 0) + 1;
    }
  });

  return stats;
}
