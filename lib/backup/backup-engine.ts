// ============================================================
//  lib/backup/backup-engine.ts
//  Dynamic Database Extraction & Restoration Engine
//  Extensible for future tables, fields, and file storage!
// ============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { BackupPayload, RestorePreview, RestoreResult } from "./types";

// Primary tables to back up in order of dependency
export const KNOWN_BACKUP_TABLES = [
  "students",
  "academic_history",
  "student_results",
] as const;

// Helper to fetch all rows with pagination to avoid Supabase default 1000 limit
async function fetchAllRows(tableName: string): Promise<any[]> {
  const supabase = createAdminClient();
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn(`Could not export table ${tableName}:`, error.message);
      break;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

// -------------------------------------------------------------
// 1. Generate Complete Backup Snapshot
// -------------------------------------------------------------
export async function generateBackupSnapshot(adminUser?: { id: string; email: string }): Promise<BackupPayload> {
  const supabase = createAdminClient();

  // 1. Fetch data from primary tables
  const [students, academicHistory, studentResults] = await Promise.all([
    fetchAllRows("students"),
    fetchAllRows("academic_history"),
    fetchAllRows("student_results"),
  ]);

  // 2. Fetch recent audit logs (up to 500 records)
  const { data: auditLogs } = await supabase
    .from("audit_log")
    .select("*")
    .neq("action", "SYSTEM_CONFIG")
    .order("created_at", { ascending: false })
    .limit(500);

  const timestamp = new Date().toISOString();

  const payload: BackupPayload = {
    version: "1.0",
    source: "SMS_WEB_APP",
    createdAt: timestamp,
    metadata: {
      schoolName: "Marigachi High School (H.S.)",
      version: "1.0",
      exportedAt: timestamp,
      exportedBy: adminUser,
      counts: {
        students: students.length,
        academicHistory: academicHistory.length,
        studentResults: studentResults.length,
        auditLogs: auditLogs?.length || 0,
      },
    },
    tables: {
      students,
      academic_history: academicHistory,
      student_results: studentResults,
      audit_log: auditLogs || [],
    },
    storage: {
      student_photos: [], // Future placeholder
    },
  };

  // Record audit log for the backup action
  if (adminUser?.id) {
    try {
      await supabase.from("audit_log").insert({
        performed_by: adminUser.id,
        action: "SYSTEM_BACKUP_EXPORTED",
        table_name: "students",
        metadata: {
          studentsCount: students.length,
          resultsCount: studentResults.length,
          timestamp,
        },
      });
    } catch (e) {
      console.warn("Could not log backup export:", e);
    }
  }

  return payload;
}

// -------------------------------------------------------------
// 2. Validate Backup Payload (Dry Run / Pre-inspection)
// -------------------------------------------------------------
export function validateBackupPayload(payload: any): RestorePreview {
  if (!payload || typeof payload !== "object") {
    return {
      isValid: false,
      version: "unknown",
      createdAt: new Date().toISOString(),
      tableCounts: {},
      totalRecords: 0,
      error: "Invalid backup file: Not a valid JSON object.",
    };
  }

  if (!payload.tables || typeof payload.tables !== "object") {
    return {
      isValid: false,
      version: payload.version || "unknown",
      createdAt: payload.createdAt || new Date().toISOString(),
      tableCounts: {},
      totalRecords: 0,
      error: "Invalid backup format: Missing 'tables' data in payload.",
    };
  }

  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;

  for (const [table, records] of Object.entries(payload.tables)) {
    if (Array.isArray(records)) {
      tableCounts[table] = records.length;
      totalRecords += records.length;
    }
  }

  const hasStudents = (tableCounts.students || 0) > 0;

  return {
    isValid: hasStudents,
    version: payload.version || "1.0",
    createdAt: payload.createdAt || payload.metadata?.exportedAt || new Date().toISOString(),
    schoolName: payload.metadata?.schoolName || "Unknown School",
    tableCounts,
    totalRecords,
    error: hasStudents ? undefined : "Backup file does not contain any student records.",
  };
}

// -------------------------------------------------------------
// 3. Restore Backup into Database (Clean Replace or Upsert)
// -------------------------------------------------------------
export async function restoreBackup(
  payload: BackupPayload,
  options: {
    mode?: "clean_restore" | "merge_upsert";
    adminUserId?: string;
    adminEmail?: string;
  } = {}
): Promise<RestoreResult> {
  const { mode = "clean_restore", adminUserId, adminEmail } = options;
  const supabase = createAdminClient();

  // Validate before proceeding
  const preview = validateBackupPayload(payload);
  if (!preview.isValid) {
    throw new Error(preview.error || "Backup validation failed.");
  }

  const summary = {
    restoredStudents: 0,
    restoredHistory: 0,
    restoredResults: 0,
    restoredOther: {} as Record<string, number>,
  };

  const CHUNK_SIZE = 100;

  // 1. If Clean Restore: Clear existing records in reverse dependency order
  if (mode === "clean_restore") {
    // Delete student_results first (foreign key dependency)
    await supabase.from("student_results").delete().not("id", "is", null);
    // Delete academic_history
    await supabase.from("academic_history").delete().not("id", "is", null);
    // Delete students
    await supabase.from("students").delete().not("id", "is", null);
  }

  // 2. Restore Students
  const students = payload.tables.students || [];
  for (let i = 0; i < students.length; i += CHUNK_SIZE) {
    const chunk = students.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("students").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Error restoring students batch at ${i}:`, error.message);
      throw new Error(`Failed to restore students: ${error.message}`);
    }
    summary.restoredStudents += chunk.length;
  }

  // 3. Restore Academic History
  const history = payload.tables.academic_history || [];
  for (let i = 0; i < history.length; i += CHUNK_SIZE) {
    const chunk = history.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("academic_history").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.warn(`Error restoring academic_history batch at ${i}:`, error.message);
    } else {
      summary.restoredHistory += chunk.length;
    }
  }

  // 4. Restore Student Results
  const results = payload.tables.student_results || [];
  for (let i = 0; i < results.length; i += CHUNK_SIZE) {
    const chunk = results.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("student_results").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.warn(`Error restoring student_results batch at ${i}:`, error.message);
    } else {
      summary.restoredResults += chunk.length;
    }
  }

  // 5. Dynamically Restore Any Additional Future Tables
  for (const [table, records] of Object.entries(payload.tables)) {
    if (["students", "academic_history", "student_results", "audit_log"].includes(table)) {
      continue; // Handled above or skipped
    }

    if (Array.isArray(records) && records.length > 0) {
      try {
        let count = 0;
        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
          const chunk = records.slice(i, i + CHUNK_SIZE);
          const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
          if (!error) count += chunk.length;
        }
        summary.restoredOther[table] = count;
      } catch (err) {
        console.warn(`Could not dynamically restore table ${table}:`, err);
      }
    }
  }

  // 6. Record Audit Log for the Restoration
  let auditLogId: string | undefined;
  try {
    const { data: auditEntry } = await supabase.from("audit_log").insert({
      performed_by: adminUserId || null,
      action: "SYSTEM_RESTORE_COMPLETED",
      table_name: "students",
      metadata: {
        mode,
        adminEmail,
        restoredStudents: summary.restoredStudents,
        restoredHistory: summary.restoredHistory,
        restoredResults: summary.restoredResults,
        sourceCreatedAt: payload.createdAt,
        timestamp: new Date().toISOString(),
      },
    }).select("id").single();

    auditLogId = auditEntry?.id;
  } catch (err) {
    console.warn("Could not record restore audit log:", err);
  }

  return {
    success: true,
    message: `Restoration completed. Restored ${summary.restoredStudents} students and ${summary.restoredResults} results.`,
    summary,
    auditLogId,
  };
}
