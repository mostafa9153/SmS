import { createAdminClient } from "@/lib/supabase/admin";
import type { ImportBatchSummary } from "@/lib/types";
import { type DBStudent } from "@/lib/supabase/db-students";
import { softWrite } from "@/lib/supabase/write";
import { getAcademicYear } from "@/lib/academic/current-year";
import { notifyAdminsOfError } from "@/lib/notifications/notify";
import { buildCreateRow, buildPatch, missingEssentials, type BulkStudentRow, type FieldChange, type UpdateMode } from "./student-fields";
import { MATCH_KEYS, buildIndex, lookupValues, matchRow, namesDiffer, type MatchField } from "./student-match";

export type { BulkStudentRow, UpdateMode } from "./student-fields";

type Admin = ReturnType<typeof createAdminClient>;

export interface BulkUploadDetails {
  created: Array<{ rowNumber?: number; name: string; schoolId?: string; studentId: string; missing: string[] }>;
  updated: Array<{
    rowNumber?: number;
    name: string;
    schoolId?: string;
    studentId: string;
    matchedBy: MatchField;
    changes: FieldChange[];
    missing: string[];
    warning?: string;
  }>;
  skipped: Array<{ rowNumber?: number; name?: string; schoolId?: string; reason: string }>;
  errors: Array<{ rowNumber?: number; name?: string; message: string }>;
}

interface ProcessResult {
  summary: ImportBatchSummary;
  details: BulkUploadDetails;
}

export interface ProcessOptions {
  uploadType: "current_students" | "old_students";
  updateMode: UpdateMode;
  /** Rows that match no student become new students; off = only existing students are updated */
  createNew: boolean;
}

export interface PreviewRow {
  rowNumber: number;
  status: "new" | "update" | "ambiguous";
  studentId?: string;
  studentName?: string;
  matchedBy?: MatchField;
  /** Name in the sheet clearly differs from the matched student's */
  nameMismatch?: boolean;
  reason?: string;
}

const LOOKUP_CHUNK = 150;
const UPDATE_CONCURRENCY = 10;
const CREATE_BATCH_SIZE = 50;

/** Existing students that share any identifier with the rows. Ids go in chunks: a long `.in()`
 * overflows the request URL and one response is capped at 1000 rows. */
async function findCandidates<T extends { id: string }>(supabase: Admin, rows: BulkStudentRow[], columns: string): Promise<T[]> {
  const found: T[] = [];
  await Promise.all(
    MATCH_KEYS.map(async ({ field, column }) => {
      const values = lookupValues(rows, field);
      for (let i = 0; i < values.length; i += LOOKUP_CHUNK) {
        const { data, error } = await supabase.from("students").select(columns).in(column, values.slice(i, i + LOOKUP_CHUNK));
        if (error) throw new Error(`Could not look up existing students by ${column}: ${error.message}`);
        found.push(...((data || []) as unknown as T[]));
      }
    })
  );
  return found;
}

const rowNumberOf = (row: BulkStudentRow, idx: number) => row.rowNumber ?? idx + 2;

/**
 * Dry run: what each row would do (new student, update which student, or skip as ambiguous),
 * without writing anything.
 */
export async function dbPreviewBulkUpload(rows: BulkStudentRow[]): Promise<PreviewRow[]> {
  const supabase = createAdminClient();
  type Lite = { id: string; name: string } & Record<string, unknown>;
  const candidates = await findCandidates<Lite>(supabase, rows, "id, name, pen, student_unique_code, school_id, aadhaar");
  const index = buildIndex(candidates);

  return rows.map((row, idx) => {
    const rowNumber = rowNumberOf(row, idx);
    const match = matchRow(row, index);
    if (match.kind === "new") return { rowNumber, status: "new" };
    if (match.kind === "ambiguous") return { rowNumber, status: "ambiguous", reason: match.reason };
    return {
      rowNumber,
      status: "update",
      studentId: match.student.id,
      studentName: match.student.name,
      matchedBy: match.matchedBy,
      nameMismatch: namesDiffer(row.name, match.student.name),
      reason: match.conflict,
    };
  });
}

/** Database errors in words a school office understands. */
function friendlyError(message: string): string {
  if (/duplicate key.*school_id/i.test(message)) return "School ID is already used by another student";
  const date = message.match(/invalid input syntax for type date: "(.*)"/);
  if (date) return `"${date[1]}" is not a valid date`;
  if (/invalid input syntax for type (integer|numeric)/.test(message)) return "A number column has text in it";
  const required = message.match(/null value in column "(\w+)"/);
  // The 20261103 migration lets these be blank; this means it has not been run on the database
  if (required) return `Database still requires ${required[1].replace(/_/g, " ")}: run migration 20261103_students_allow_blank_import_fields.sql`;
  return message;
}

/**
 * Imports one chunk of mapped sheet rows. Rows are matched on PEN, Banglar Shiksha ID, School ID,
 * then Aadhaar; a matched student is updated per `updateMode` (blank cells never erase anything),
 * an unmatched row becomes a new student with its blanks left blank. Every write is in the audit
 * log under `batchId`, so the whole batch can be rolled back from Batch History.
 */
export async function dbProcessBulkUpload(
  rows: BulkStudentRow[],
  batchId: string,
  userId: string,
  options: ProcessOptions
): Promise<ProcessResult> {
  const supabase = createAdminClient();
  const currentYear = await getAcademicYear();
  const details: BulkUploadDetails = { created: [], updated: [], skipped: [], errors: [] };

  const index = buildIndex(await findCandidates<DBStudent>(supabase, rows, "*"));

  // 1. Classify: one student is updated by one row only
  const claimedBy = new Map<string, number>();
  const updates: Array<{ rowNumber: number; existing: DBStudent; patch: Record<string, unknown>; changes: FieldChange[]; matchedBy: MatchField; warning?: string }> = [];
  const creates: Array<{ rowNumber: number; row: BulkStudentRow }> = [];

  rows.forEach((row, idx) => {
    const rowNumber = rowNumberOf(row, idx);
    const name = row.name?.trim();
    if (!name) {
      details.errors.push({ rowNumber, message: "Student Name is missing" });
      return;
    }
    const match = matchRow(row, index);
    if (match.kind === "ambiguous") {
      details.skipped.push({ rowNumber, name, reason: `${match.reason}: fix the ID in the sheet` });
      return;
    }
    if (match.kind === "new") {
      if (options.createNew) creates.push({ rowNumber, row });
      else details.skipped.push({ rowNumber, name, schoolId: row.schoolId, reason: "No matching student (adding new students is off)" });
      return;
    }

    const existing = match.student;
    const earlier = claimedBy.get(existing.id);
    if (earlier !== undefined) {
      details.skipped.push({ rowNumber, name, schoolId: existing.school_id || undefined, reason: `Row ${earlier} already matched this student` });
      return;
    }
    claimedBy.set(existing.id, rowNumber);
    if (options.updateMode === "skip") {
      details.skipped.push({ rowNumber, name: existing.name, schoolId: existing.school_id || undefined, reason: "Already exists (left unchanged)" });
      return;
    }

    const { patch, changes } = buildPatch(existing as unknown as Record<string, unknown>, row, options.updateMode);
    if (!changes.length) {
      details.skipped.push({
        rowNumber,
        name: existing.name,
        schoolId: existing.school_id || undefined,
        reason: options.updateMode === "fill_blanks" ? "Nothing blank to fill" : "Already up to date",
      });
      return;
    }
    const warnings = [
      namesDiffer(name, existing.name) ? `Name in sheet "${name}" differs from "${existing.name}"` : "",
      match.conflict || "",
    ].filter(Boolean);
    updates.push({ rowNumber, existing, patch, changes, matchedBy: match.matchedBy, warning: warnings.join("; ") || undefined });
  });

  const auditEntries: Record<string, unknown>[] = [];

  // 2. Updates
  for (let i = 0; i < updates.length; i += UPDATE_CONCURRENCY) {
    await Promise.all(
      updates.slice(i, i + UPDATE_CONCURRENCY).map(async (u) => {
        const { data: saved, error } = await supabase
          .from("students")
          .update({ ...u.patch, updated_at: new Date().toISOString() })
          .eq("id", u.existing.id)
          .select()
          .single();
        if (error || !saved) {
          details.errors.push({ rowNumber: u.rowNumber, name: u.existing.name, message: `Update failed: ${friendlyError(error?.message || "no row returned")}` });
          return;
        }
        auditEntries.push({
          performed_by: userId,
          action: "UPDATE",
          table_name: "students",
          record_id: u.existing.id,
          old_values: u.existing,
          new_values: saved,
          metadata: {
            batch_id: batchId,
            source: "BULK_UPLOAD",
            matched_by: u.matchedBy,
            update_mode: options.updateMode,
            changed_fields: u.changes.map((c) => c.label),
          },
        });
        details.updated.push({
          rowNumber: u.rowNumber,
          name: saved.name,
          schoolId: saved.school_id || undefined,
          studentId: saved.id,
          matchedBy: u.matchedBy,
          changes: u.changes,
          missing: missingEssentials(saved),
          warning: u.warning,
        });
      })
    );
  }

  // 3. Creates, in batches; a failing batch is retried row by row to find the bad rows
  const fallback = {
    admissionYear: currentYear,
    status: options.uploadType === "old_students" ? "Passed Out" : "Continuing",
  };
  const recordCreated = (rowNumber: number, rec: DBStudent) => {
    auditEntries.push({
      performed_by: userId,
      action: "CREATE",
      table_name: "students",
      record_id: rec.id,
      new_values: rec,
      metadata: { batch_id: batchId, source: "BULK_UPLOAD", is_new_admission: true },
    });
    details.created.push({
      rowNumber,
      name: rec.name,
      schoolId: rec.school_id || undefined,
      studentId: rec.id,
      missing: missingEssentials(rec as unknown as Record<string, unknown>),
    });
  };

  const created: DBStudent[] = [];
  for (let c = 0; c < creates.length; c += CREATE_BATCH_SIZE) {
    const chunk = creates.slice(c, c + CREATE_BATCH_SIZE);
    const payloads = chunk.map((item) => buildCreateRow(item.row, fallback));
    const { data, error } = await supabase.from("students").insert(payloads).select();

    if (!error && data && data.length === chunk.length) {
      for (let j = 0; j < data.length; j++) {
        recordCreated(chunk[j].rowNumber, data[j] as DBStudent);
        created.push(data[j] as DBStudent);
      }
      continue;
    }
    for (let j = 0; j < chunk.length; j++) {
      const { data: rec, error: rowError } = await supabase.from("students").insert(payloads[j]).select().single();
      if (rowError || !rec) {
        details.errors.push({
          rowNumber: chunk[j].rowNumber,
          name: chunk[j].row.name,
          message: `Not added: ${friendlyError(rowError?.message || "no row returned")}`,
        });
      } else {
        recordCreated(chunk[j].rowNumber, rec as DBStudent);
        created.push(rec as DBStudent);
      }
    }
  }

  // 4. Academic history for new students whose class, section and roll are known
  const history = created
    .filter((s) => s.present_class && s.present_section && s.present_roll != null)
    .map((s) => ({
      student_id: s.id,
      year: s.admission_year,
      class: s.present_class,
      section: s.present_section,
      roll: s.present_roll,
      status: s.current_status,
    }));
  if (history.length) {
    const { error } = await supabase.from("academic_history").insert(history);
    if (error) details.errors.push({ message: `Students were added, but their academic history was not saved: ${error.message}` });
  }

  // 5. Audit trail (rollback reads it)
  let unaudited = 0;
  for (let i = 0; i < auditEntries.length; i += 100) {
    const part = auditEntries.slice(i, i + 100);
    const { error } = await supabase.from("audit_log").insert(part);
    if (error) unaudited += part.length;
  }
  if (unaudited) {
    const message = `${unaudited} changes were saved but not recorded in Batch History, so Undo cannot reverse them`;
    details.errors.push({ message });
    await notifyAdminsOfError("students.bulk-upload", `Bulk upload ${batchId} is only partly undoable`, new Error(message), "/students/bulk-upload");
  }

  await softWrite(
    supabase.from("audit_log").insert({
      performed_by: userId,
      action: "BATCH_UPLOAD",
      table_name: "students",
      metadata: {
        batch_id: batchId,
        upload_type: options.uploadType,
        update_mode: options.updateMode,
        source: "BULK_UPLOAD",
        total_rows: rows.length,
        created_count: details.created.length,
        updated_count: details.updated.length,
        skipped_count: details.skipped.length,
        error_count: details.errors.length,
      },
    }),
    "audit_log insert"
  );

  return {
    summary: {
      batchId,
      totalRows: rows.length,
      createdCount: details.created.length,
      updatedCount: details.updated.length,
      skippedCount: details.skipped.length,
      errorCount: details.errors.length,
      warningCount: details.updated.filter((u) => u.warning).length,
      timestamp: new Date().toISOString(),
      performedBy: userId,
    },
    details,
  };
}
