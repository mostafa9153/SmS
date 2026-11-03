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

const PAGE = 1000;
const DELETE_CHUNK = 150;
const RESTORE_CONCURRENCY = 10;

/**
 * Rollback / Delete an entire bulk import batch across students and results.
 */
export async function dbRollbackBatch(
  batchId: string,
  userId: string
): Promise<{ success: boolean; revertedCount: number; deletedCount: number }> {
  const supabase = createAdminClient();

  // Every audit entry of the batch, page by page (a response holds at most 1000 rows)
  const batchLogs: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .filter("metadata->>batch_id", "eq", batchId)
      .neq("action", "ROLLBACK")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Failed to query audit logs for batch rollback: ${error.message}`);
    batchLogs.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }

  if (batchLogs.length === 0) {
    throw new Error(`No active records found for batch ID [${batchId}] to delete/rollback.`);
  }

  // Created rows go in bulk per table; an updated row returns to its state before the batch
  // (logs run newest first, so the last entry seen per record is the oldest snapshot)
  const createdByTable = new Map<string, string[]>();
  const restore = new Map<string, { table: string; id: string; values: Record<string, any> }>();
  for (const entry of batchLogs) {
    const tableName = entry.table_name || "students";
    if (entry.action === "CREATE" && entry.record_id) {
      if (!createdByTable.has(tableName)) createdByTable.set(tableName, []);
      createdByTable.get(tableName)!.push(entry.record_id);
    } else if (entry.action === "UPDATE" && entry.record_id && entry.old_values) {
      restore.set(`${tableName}:${entry.record_id}`, { table: tableName, id: entry.record_id, values: entry.old_values });
    }
  }

  let deletedCount = 0;
  for (const [tableName, ids] of createdByTable) {
    for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
      await mustWrite(supabase.from(tableName).delete().in("id", ids.slice(i, i + DELETE_CHUNK)), `${tableName} delete`);
    }
    deletedCount += ids.length;
  }

  const createdIds = new Set([...createdByTable.values()].flat());
  const reverts = [...restore.values()].filter((r) => !createdIds.has(r.id));
  for (let i = 0; i < reverts.length; i += RESTORE_CONCURRENCY) {
    await Promise.all(
      reverts.slice(i, i + RESTORE_CONCURRENCY).map(({ table, id, values }) => {
        const { id: _id, created_at: _createdAt, ...oldVals } = values;
        oldVals.updated_at = new Date().toISOString();
        return mustWrite(supabase.from(table).update(oldVals).eq("id", id), `${table} update`);
      })
    );
  }
  const revertedCount = reverts.length;

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

  // Only the per-request summaries and rollbacks: a big sheet writes thousands of row entries,
  // which would push every older batch out of the list
  const { data: logs, error } = await supabase
    .from("audit_log")
    .select("metadata, created_at, action, table_name, performed_by")
    .in("action", ["BATCH_UPLOAD", "ROLLBACK"])
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error || !logs) {
    console.error("Error fetching audit logs for import batches:", error);
    return [];
  }

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

    if (!batchMap.has(bId)) {
      let uploadType: BulkUploadType = "current_students";
      if (meta?.upload_type === "EXAM_RESULTS" || log.table_name === "student_results") {
        uploadType = "exam_results";
      } else if (meta?.upload_type === "old_students") {
        uploadType = "old_students";
      }
      batchMap.set(bId, {
        totalAffected: 0,
        createdCount: 0,
        updatedCount: 0,
        createdAt: log.created_at,
        action: uploadType === "exam_results" ? "RESULTS_BULK_UPLOAD" : "STUDENTS_BULK_UPLOAD",
        uploadType,
        targetYear: meta?.academic_year || meta?.session_year,
        performedBy: log.performed_by,
        status: "Active",
      });
    }

    const b = batchMap.get(bId)!;
    if (log.action === "ROLLBACK") {
      b.status = "Rolled_Back";
      continue;
    }
    // The rollback entry carries no upload type: the upload's own summary decides it
    if (meta?.upload_type === "old_students") b.uploadType = "old_students";
    // One sheet sends several chunks under one batch id: add them up
    b.totalAffected += Number(meta?.total_rows) || 0;
    b.createdCount += Number(meta?.created_count) || 0;
    b.updatedCount += Number(meta?.updated_count) || 0;
    b.targetYear ??= meta?.academic_year || meta?.session_year;
    // Oldest chunk = when the upload started
    b.createdAt = log.created_at;
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
