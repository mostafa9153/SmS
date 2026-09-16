import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { type FeeItem, generateInvoiceNumber } from "@/lib/utils/fee-config";

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
  /** Lifecycle status: 'active' | 'blank_assigned' | 'cancelled' */
  invoice_status: "active" | "blank_assigned" | "cancelled";
  /** Teacher to whom blank slips were assigned */
  assigned_to: string | null;
  /** Batch identifier grouping a set of blank slips e.g. "20260912-RKS" */
  batch_id: string | null;
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
  invoice_status?: "active" | "blank_assigned" | "cancelled";
  assigned_to?: string | null;
  batch_id?: string | null;
  printed_by?: string | null;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalFilled: number;
  totalBlank: number;
  totalActive: number;
  totalCancelled: number;
  totalBulk: number;
  totalSingle: number;
  /** Net amount — excludes cancelled invoices */
  totalAmount: number;
  byClass: Record<string, number>;
}

export interface TeacherSettlementSummary {
  teacher: string;
  totalAssigned: number;
  totalUsed: number;
  totalCancelled: number;
  totalPending: number;
  netAmount: number;
}

export interface InvoiceStatusUpdate {
  invoice_number: string;
  status: "active" | "cancelled";
  amount?: number;
}

// ─────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────
function getSupabase() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function getClient() {
  let supabase = getSupabase();
  if (!supabase) {
    supabase = (await createServerClient()) as any;
  }
  return supabase;
}

// ─────────────────────────────────────────────────────────────
// Save / Upsert invoices
// ─────────────────────────────────────────────────────────────
export async function dbSaveInvoices(invoices: DBInvoiceInsert[]): Promise<{
  success: boolean;
  savedCount: number;
  error?: string;
}> {
  if (!invoices || invoices.length === 0) {
    return { success: true, savedCount: 0 };
  }

  try {
    const supabase = await getClient();
    if (!supabase) {
      return { success: false, savedCount: 0, error: "Database client unavailable" };
    }

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
      invoice_status: inv.invoice_status || (inv.is_blank ? "blank_assigned" : "active"),
      assigned_to: inv.assigned_to || null,
      batch_id: inv.batch_id || null,
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

// ─────────────────────────────────────────────────────────────
// Verify invoice by number
// ─────────────────────────────────────────────────────────────
export async function dbVerifyInvoice(
  invoiceNumber: string
): Promise<{ valid: boolean; invoice: DBInvoiceRow | null; error?: string }> {
  const normNumber = invoiceNumber.trim();
  if (!normNumber) {
    return { valid: false, invoice: null, error: "Please enter an invoice number" };
  }

  try {
    const supabase = await getClient();
    if (!supabase) {
      return { valid: false, invoice: null, error: "Database client unavailable" };
    }

    // 1. Try secure SECURITY DEFINER RPC first (protects PII and works under strict RLS)
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("verify_invoice_public", { p_invoice_number: normNumber });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const inv = rpcData[0];
        return {
          valid: inv.invoice_status !== "cancelled",
          invoice: inv as any,
        };
      }
    } catch {
      // Fall through to query if RPC does not exist yet
    }

    // 2. Direct table lookup fallback (explicit projection without contact_number/pen_number)
    const { data, error } = await supabase
      .from("admission_invoices")
      .select("invoice_number, student_name, student_class, section, issue_date, total_amount, payment_status, invoice_status")
      .ilike("invoice_number", normNumber)
      .maybeSingle();

    if (error) {
      console.error("Error verifying invoice:", error);
      return { valid: false, invoice: null, error: error.message };
    }

    if (!data) {
      return { valid: false, invoice: null };
    }

    const inv = data as any;
    return {
      valid: inv.invoice_status !== "cancelled",
      invoice: inv,
    };
  } catch (err: any) {
    console.error("Exception in dbVerifyInvoice:", err);
    return { valid: false, invoice: null, error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Aggregate statistics (cancelled excluded from net amount)
// ─────────────────────────────────────────────────────────────
export async function dbGetInvoiceStats(): Promise<{ stats: InvoiceStats; error?: string }> {
  const defaultStats: InvoiceStats = {
    totalInvoices: 0,
    totalFilled: 0,
    totalBlank: 0,
    totalActive: 0,
    totalCancelled: 0,
    totalBulk: 0,
    totalSingle: 0,
    totalAmount: 0,
    byClass: {},
  };

  try {
    const supabase = await getClient();
    if (!supabase) {
      return { stats: defaultStats, error: "Database client unavailable" };
    }

    // Select base columns only — invoice_status may not exist yet (pre-migration)
    const { data, error } = await supabase
      .from("admission_invoices")
      .select("is_blank, generator_mode, total_amount, student_class, invoice_status");

    if (error) {
      // Fallback: select without invoice_status if column not found
      if (error.message?.includes("invoice_status") || error.code === "42703") {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("admission_invoices")
          .select("is_blank, generator_mode, total_amount, student_class");

        if (fallbackError) {
          console.error("Error fetching invoice stats (fallback):", fallbackError);
          return { stats: defaultStats, error: fallbackError.message };
        }

        const stats: InvoiceStats = { ...defaultStats };
        if (Array.isArray(fallbackData)) {
          stats.totalInvoices = fallbackData.length;
          fallbackData.forEach((row) => {
            if (row.is_blank) stats.totalBlank += 1;
            else { stats.totalFilled += 1; stats.totalActive += 1; }
            if (row.generator_mode === "bulk") stats.totalBulk += 1;
            else stats.totalSingle += 1;
            stats.totalAmount += Number(row.total_amount) || 0;
            if (row.student_class) {
              stats.byClass[row.student_class] = (stats.byClass[row.student_class] || 0) + 1;
            }
          });
        }
        return { stats };
      }

      console.error("Error fetching invoice stats:", error);
      return { stats: defaultStats, error: error.message };
    }

    const stats: InvoiceStats = { ...defaultStats };

    if (Array.isArray(data)) {
      stats.totalInvoices = data.length;
      data.forEach((row) => {
        // invoice_status may be null if migration not yet run — treat as 'active'
        const status: string = (row as any).invoice_status ||
          (row.is_blank ? "blank_assigned" : "active");

        if (row.is_blank) stats.totalBlank += 1;
        else stats.totalFilled += 1;

        if (status === "active") stats.totalActive += 1;
        if (status === "cancelled") stats.totalCancelled += 1;

        if (row.generator_mode === "bulk") stats.totalBulk += 1;
        else stats.totalSingle += 1;

        // Exclude cancelled from net amount
        if (status !== "cancelled") {
          stats.totalAmount += Number(row.total_amount) || 0;
        }

        if (row.student_class && status !== "cancelled") {
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

// ─────────────────────────────────────────────────────────────
// Search & list invoices with pagination and filters
// ─────────────────────────────────────────────────────────────
export async function dbSearchInvoices(params: {
  query?: string;
  isBlank?: boolean | null;
  invoiceStatus?: "active" | "blank_assigned" | "cancelled" | null;
  generatorMode?: "single" | "bulk" | null;
  studentClass?: string | null;
  assignedTo?: string | null;
  limit?: number;
  offset?: number;
}): Promise<{ data: DBInvoiceRow[]; total: number; error?: string }> {
  try {
    const supabase = await getClient();
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

    if (params.invoiceStatus) {
      q = q.eq("invoice_status", params.invoiceStatus);
    }

    if (params.generatorMode) {
      q = q.eq("generator_mode", params.generatorMode);
    }

    if (params.studentClass && params.studentClass !== "ALL") {
      q = q.eq("student_class", params.studentClass);
    }

    if (params.assignedTo) {
      q = q.ilike("assigned_to", `%${params.assignedTo.trim()}%`);
    }

    if (params.query && params.query.trim()) {
      const term = `%${params.query.trim()}%`;
      q = q.or(
        `invoice_number.ilike.${term},student_name.ilike.${term},student_id.ilike.${term},guardian_name.ilike.${term},assigned_to.ilike.${term}`
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

// ─────────────────────────────────────────────────────────────
// Get all invoices assigned to a specific teacher
// ─────────────────────────────────────────────────────────────
export async function dbGetTeacherAssignedInvoices(teacherName: string): Promise<{
  data: DBInvoiceRow[];
  error?: string;
}> {
  try {
    const supabase = await getClient();
    if (!supabase) return { data: [], error: "Database client unavailable" };

    const { data, error } = await supabase
      .from("admission_invoices")
      .select("*")
      .ilike("assigned_to", teacherName.trim())
      .order("invoice_number", { ascending: true });

    if (error) {
      // Column doesn't exist yet (migration pending) — return empty gracefully
      if (error.code === "42703" || error.message?.includes("assigned_to") || error.message?.includes("invoice_status")) {
        console.warn("invoice_lifecycle migration not yet applied. Returning empty teacher invoices.");
        return { data: [] };
      }
      console.error("Error fetching teacher invoices:", error);
      return { data: [], error: error.message };
    }

    return { data: (data as DBInvoiceRow[]) || [] };
  } catch (err: any) {
    console.error("Exception in dbGetTeacherAssignedInvoices:", err);
    return { data: [], error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Batch update invoice statuses (settlement)
// ─────────────────────────────────────────────────────────────
export async function dbUpdateInvoiceStatuses(updates: InvoiceStatusUpdate[]): Promise<{
  success: boolean;
  updatedCount: number;
  error?: string;
}> {
  if (!updates || updates.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  try {
    const supabase = await getClient();
    if (!supabase) return { success: false, updatedCount: 0, error: "Database client unavailable" };

    const now = new Date().toISOString();
    let updatedCount = 0;

    // Process each update individually (Supabase doesn't support batch conditional updates natively)
    for (const upd of updates) {
      const patch: Record<string, any> = {
        invoice_status: upd.status,
        updated_at: now,
      };

      if (upd.status === "active" && upd.amount !== undefined) {
        patch.total_amount = upd.amount;
        patch.payment_status = "Paid";
      }

      if (upd.status === "cancelled") {
        patch.total_amount = 0;
        patch.payment_status = "Cancelled";
      }

      const { error } = await supabase
        .from("admission_invoices")
        .update(patch)
        .eq("invoice_number", upd.invoice_number);

      if (error) {
        if (error.code === "42703" || error.message?.includes("invoice_status")) {
          // Column not yet migrated \u2014 fall back to updating only amount/status
          const fallbackPatch: Record<string, any> = { updated_at: now };
          if (upd.status === "active" && upd.amount !== undefined) {
            fallbackPatch.total_amount = upd.amount;
            fallbackPatch.payment_status = "Paid";
          }
          if (upd.status === "cancelled") {
            fallbackPatch.total_amount = 0;
            fallbackPatch.payment_status = "Cancelled";
          }
          const { error: fe } = await supabase
            .from("admission_invoices")
            .update(fallbackPatch)
            .eq("invoice_number", upd.invoice_number);
          if (!fe) updatedCount++;
          else console.error(`Fallback update error for ${upd.invoice_number}:`, fe);
        } else {
          console.error(`Error updating invoice ${upd.invoice_number}:`, error);
        }
      } else {
        updatedCount++;
      }
    }

    return { success: true, updatedCount };
  } catch (err: any) {
    console.error("Exception in dbUpdateInvoiceStatuses:", err);
    return { success: false, updatedCount: 0, error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Get settlement summaries grouped by teacher
// ─────────────────────────────────────────────────────────────
export async function dbGetTeacherSettlements(): Promise<{
  data: TeacherSettlementSummary[];
  error?: string;
}> {
  try {
    const supabase = await getClient();
    if (!supabase) return { data: [], error: "Database client unavailable" };

    const { data, error } = await supabase
      .from("admission_invoices")
      .select("assigned_to, invoice_status, total_amount")
      .not("assigned_to", "is", null);

    if (error) {
      // Column doesn't exist yet — migration pending
      if (error.code === "42703" || error.message?.includes("assigned_to") || error.message?.includes("invoice_status")) {
        console.warn("invoice_lifecycle migration not yet applied. Returning empty settlements.");
        return { data: [] };
      }
      console.error("Error fetching teacher settlements:", error);
      return { data: [], error: error.message };
    }

    // Group by teacher
    const grouped: Record<string, TeacherSettlementSummary> = {};

    (data || []).forEach((row) => {
      const teacher = row.assigned_to as string;
      if (!grouped[teacher]) {
        grouped[teacher] = {
          teacher,
          totalAssigned: 0,
          totalUsed: 0,
          totalCancelled: 0,
          totalPending: 0,
          netAmount: 0,
        };
      }
      const g = grouped[teacher];
      g.totalAssigned++;

      const status = row.invoice_status as string;
      if (status === "active") {
        g.totalUsed++;
        g.netAmount += Number(row.total_amount) || 0;
      } else if (status === "cancelled") {
        g.totalCancelled++;
      } else {
        // blank_assigned = still pending
        g.totalPending++;
      }
    });

    return { data: Object.values(grouped) };
  } catch (err: any) {
    console.error("Exception in dbGetTeacherSettlements:", err);
    return { data: [], error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Get unique teacher names (for dropdown)
// ─────────────────────────────────────────────────────────────
export async function dbGetAssignedTeachers(): Promise<{
  teachers: string[];
  error?: string;
}> {
  try {
    const supabase = await getClient();
    if (!supabase) return { teachers: [], error: "Database client unavailable" };

    const { data, error } = await supabase
      .from("admission_invoices")
      .select("assigned_to")
      .not("assigned_to", "is", null)
      .order("assigned_to", { ascending: true });

    if (error) {
      // Column doesn't exist yet — migration pending
      if (error.code === "42703" || error.message?.includes("assigned_to")) {
        console.warn("invoice_lifecycle migration not yet applied. Returning empty teacher list.");
        return { teachers: [] };
      }
      console.error("Error fetching assigned teachers:", error);
      return { teachers: [], error: error.message };
    }

    const teachers = [...new Set((data || []).map((r) => r.assigned_to as string).filter(Boolean))];
    return { teachers };
  } catch (err: any) {
    console.error("Exception in dbGetAssignedTeachers:", err);
    return { teachers: [], error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Get Next Invoice Sequence from Database
// ─────────────────────────────────────────────────────────────
export async function dbGetNextInvoiceSequence(year?: number): Promise<{
  nextSequence: number;
  latestInvoiceNumber: string | null;
  error?: string;
}> {
  try {
    const supabase = await getClient();
    if (!supabase) return { nextSequence: 1, latestInvoiceNumber: null, error: "Database client unavailable" };

    const y = year || new Date().getFullYear();
    const prefix = `MHS/${y}/ADM-`;

    const { data, error } = await supabase
      .from("admission_invoices")
      .select("invoice_number")
      .ilike("invoice_number", `${prefix}%`)
      .order("invoice_number", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching max invoice sequence:", error);
      return { nextSequence: 1, latestInvoiceNumber: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { nextSequence: 1, latestInvoiceNumber: null };
    }

    let maxSeq = 0;
    let latestNum: string | null = null;
    for (const row of data) {
      const parts = row.invoice_number.split("ADM-");
      if (parts.length > 1) {
        const val = parseInt(parts[1], 10);
        if (!isNaN(val) && val > maxSeq) {
          maxSeq = val;
          latestNum = row.invoice_number;
        }
      }
    }

    return {
      nextSequence: maxSeq + 1,
      latestInvoiceNumber: latestNum,
    };
  } catch (err: any) {
    console.error("Exception in dbGetNextInvoiceSequence:", err);
    return { nextSequence: 1, latestInvoiceNumber: null, error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Get Printed Invoice Batches from Database
// ─────────────────────────────────────────────────────────────
export interface DBInvoiceBatch {
  batchId: string;
  count: number;
  startSerial: number;
  endSerial: number;
  formattedStart: string;
  formattedEnd: string;
  assignedTo: string | null;
  isBlank: boolean;
  createdAt: string;
}

export async function dbGetInvoiceBatches(limit = 30): Promise<{
  batches: DBInvoiceBatch[];
  error?: string;
}> {
  try {
    const supabase = await getClient();
    if (!supabase) return { batches: [], error: "Database client unavailable" };

    const { data, error } = await supabase
      .from("admission_invoices")
      .select("invoice_number, batch_id, assigned_to, is_blank, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) return { batches: [], error: error.message };
    if (!data || data.length === 0) return { batches: [] };

    const batchMap = new Map<
      string,
      {
        batchId: string;
        numbers: string[];
        assignedTo: string | null;
        isBlank: boolean;
        createdAt: string;
      }
    >();

    data.forEach((row) => {
      const timeKey = new Date(row.created_at).toISOString().slice(0, 16);
      const bKey = row.batch_id || `batch_${timeKey}_${row.is_blank ? "blank" : "filled"}`;
      if (!batchMap.has(bKey)) {
        batchMap.set(bKey, {
          batchId: bKey,
          numbers: [],
          assignedTo: row.assigned_to || null,
          isBlank: Boolean(row.is_blank),
          createdAt: row.created_at,
        });
      }
      batchMap.get(bKey)!.numbers.push(row.invoice_number);
    });

    const result: DBInvoiceBatch[] = [];
    for (const [_, b] of batchMap.entries()) {
      const sortedNums = [...b.numbers].sort();
      const startNum = sortedNums[0];
      const endNum = sortedNums[sortedNums.length - 1];
      const startSerial = parseInt(startNum.split("ADM-")[1] || "0", 10) || 1;
      const endSerial = parseInt(endNum.split("ADM-")[1] || "0", 10) || startSerial;

      result.push({
        batchId: b.batchId,
        count: b.numbers.length,
        startSerial,
        endSerial,
        formattedStart: startNum,
        formattedEnd: endNum,
        assignedTo: b.assignedTo,
        isBlank: b.isBlank,
        createdAt: b.createdAt,
      });
      if (result.length >= limit) break;
    }

    return { batches: result };
  } catch (err: any) {
    return { batches: [], error: err?.message };
  }
}

// ─────────────────────────────────────────────────────────────
// Undo Invoice Batch in Database
// ─────────────────────────────────────────────────────────────
export async function dbUndoInvoiceBatch(params: {
  batchId?: string;
  startSerial?: number;
  endSerial?: number;
  year?: number;
}): Promise<{ success: boolean; deletedCount: number; newSequence: number; error?: string }> {
  try {
    const supabase = await getClient();
    if (!supabase) return { success: false, deletedCount: 0, newSequence: 1, error: "Database unavailable" };

    const y = params.year || new Date().getFullYear();
    let q = supabase.from("admission_invoices").delete();

    if (params.batchId && !params.batchId.startsWith("batch_")) {
      q = q.eq("batch_id", params.batchId);
    } else if (params.startSerial && params.endSerial) {
      const list: string[] = [];
      for (let s = params.startSerial; s <= params.endSerial; s++) {
        list.push(generateInvoiceNumber(s, y));
      }
      q = q.in("invoice_number", list);
    } else {
      return { success: false, deletedCount: 0, newSequence: 1, error: "Invalid parameters for batch undo" };
    }

    const { error, count } = await q.select("id");
    if (error) {
      return { success: false, deletedCount: 0, newSequence: 1, error: error.message };
    }

    // Recalculate next sequence based on remaining database records
    const nextRes = await dbGetNextInvoiceSequence(y);
    return {
      success: true,
      deletedCount: count || 0,
      newSequence: nextRes.nextSequence,
    };
  } catch (err: any) {
    return { success: false, deletedCount: 0, newSequence: 1, error: err?.message };
  }
}
