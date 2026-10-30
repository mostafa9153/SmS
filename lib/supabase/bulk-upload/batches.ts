import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportBatchRecord, BulkUploadType } from "@/lib/types";
import { mustWrite, softWrite } from "@/lib/supabase/write";

function safeParseMetadata(metadata: any): Record<string, any> | null {
  if (!metadata) return null;
  if (typeof metadata === "object") return metadata;
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Rollback / Delete an entire bulk import batch across students and results.
 */
export async function dbRollbackBatch(
  batchId: string,
  userId: string
): Promise<{ success: boolean; revertedCount: number; deletedCount: number }> {
  const supabase = createAdminClient();

  // Find audit log entries for this specific batch directly via JSONB filter in Postgres
  const { data: logs, error } = await supabase
    .from("audit_log")
    .select("*")
    .filter("metadata->>batch_id", "eq", batchId)
    .neq("action", "ROLLBACK")
    .order("created_at", { ascending: false });

  if (error || !logs) {
    throw new Error(`Failed to query audit logs for batch rollback: ${error?.message || "Unknown error"}`);
  }

  const batchLogs = logs.filter((entry) => entry.action !== "ROLLBACK");

  if (batchLogs.length === 0) {
    throw new Error(`No active records found for batch ID [${batchId}] to delete/rollback.`);
  }

  let deletedCount = 0;
  let revertedCount = 0;

  for (const entry of batchLogs) {
    const tableName = entry.table_name || "students";

    if (entry.action === "CREATE" && entry.record_id) {
      // Delete the record created in this batch
      await mustWrite(supabase.from(tableName).delete().eq("id", entry.record_id), `${tableName} delete`);
      deletedCount++;
    } else if (entry.action === "UPDATE" && entry.record_id && entry.old_values) {
      // Revert the record back to its previous values
      const oldVals = { ...entry.old_values };
      delete oldVals.id;
      delete oldVals.created_at;
      oldVals.updated_at = new Date().toISOString();

      await mustWrite(supabase.from(tableName).update(oldVals).eq("id", entry.record_id), `${tableName} update`);
      revertedCount++;
    }
  }

  // Log the rollback action
  await softWrite(supabase.from("audit_log").insert({
    performed_by: userId,
    action: "ROLLBACK",
    table_name: batchLogs[0]?.table_name || "batch_rollback",
    metadata: {
      batch_id: batchId,
      rolled_back_batch_id: batchId,
      deleted_new_records: deletedCount,
      reverted_updated_records: revertedCount,
    },
  }), "audit_log insert");

  return {
    success: true,
    revertedCount,
    deletedCount,
  };
}

/**
 * Fetch past import batches list with rich metadata for audit & rollback.
 */
export async function dbGetImportBatches(): Promise<ImportBatchRecord[]> {
  const supabase = createAdminClient();

  const { data: logs, error } = await supabase
    .from("audit_log")
    .select("metadata, created_at, action, table_name, performed_by")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error || !logs) {
    console.error("Error fetching audit logs for import batches:", error);
    return [];
  }

  // Group by batch_id
  const batchMap = new Map<
    string,
    {
      totalAffected: number;
      createdCount: number;
      updatedCount: number;
      createdAt: string;
      action: string;
      uploadType: BulkUploadType;
      targetYear?: number;
      performedBy?: string;
      status: "Active" | "Rolled_Back";
    }
  >();

  for (const log of logs) {
    const meta = safeParseMetadata(log.metadata);
    const bId = meta?.batch_id;
    if (!bId) continue;

    const isRollback = log.action === "ROLLBACK";

    if (!batchMap.has(bId)) {
      let uploadType: BulkUploadType = "current_students";
      if (meta?.upload_type === "EXAM_RESULTS" || log.table_name === "student_results") {
        uploadType = "exam_results";
      } else if (meta?.upload_type === "old_students") {
        uploadType = "old_students";
      }

      batchMap.set(bId, {
        totalAffected: meta?.total_rows || 0,
        createdCount: meta?.created_count || 0,
        updatedCount: meta?.updated_count || 0,
        createdAt: log.created_at,
        action: uploadType === "exam_results" ? "RESULTS_BULK_UPLOAD" : "STUDENTS_BULK_UPLOAD",
        uploadType,
        targetYear: meta?.academic_year || meta?.session_year,
        performedBy: log.performed_by,
        status: isRollback ? "Rolled_Back" : "Active",
      });
    }

    const b = batchMap.get(bId)!;
    if (isRollback) {
      b.status = "Rolled_Back";
    } else {
      if (meta?.total_rows && b.totalAffected === 0) {
        b.totalAffected = meta.total_rows;
      }
      if (meta?.created_count && b.createdCount === 0) {
        b.createdCount = meta.created_count;
      }
      if (meta?.updated_count && b.updatedCount === 0) {
        b.updatedCount = meta.updated_count;
      }
      if (log.action === "CREATE") {
        if (!meta?.total_rows) b.totalAffected += 1;
        if (!meta?.created_count) b.createdCount += 1;
      } else if (log.action === "UPDATE") {
        if (!meta?.total_rows) b.totalAffected += 1;
        if (!meta?.updated_count) b.updatedCount += 1;
      }
    }
  }

  return Array.from(batchMap.entries()).map(([batchId, info]) => ({
    batchId,
    action: info.action,
    uploadType: info.uploadType,
    targetYear: info.targetYear,
    totalAffected: info.totalAffected || (info.createdCount + info.updatedCount),
    createdCount: info.createdCount,
    updatedCount: info.updatedCount,
    createdAt: info.createdAt,
    performedBy: info.performedBy,
    status: info.status,
  }));
}

/**
 * Helper to generate a collision-free batch ID with ISO timestamp and random cryptographically unique suffix:
 * Format: BATCH-YYYYMMDD-HHMMSS-XXXXXX
 */
export async function dbGenerateBatchId(): Promise<string> {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `BATCH-${year}${month}${day}-${hours}${minutes}${seconds}-${randomSuffix}`;
}
