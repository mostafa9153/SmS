import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBatchSchoolIds } from "./school-id-generator";
import type { Student, ImportBatchSummary, ImportBatchRecord, StudentStatus, Gender, BulkResultRow, BulkUploadType } from "@/lib/types";
import { mapDBStudentToStudent, type DBStudent } from "./db-students";
import { getClassFullMarks, calculateGrade } from "./db-results";

interface ProcessResult {
  summary: ImportBatchSummary;
  details: {
    created: Array<{ name: string; schoolId: string }>;
    updated: Array<{ name: string; schoolId: string; changedFields: string[] }>;
    skipped: Array<{ name: string; reason: string }>;
    errors: Array<{ rowNumber: number; name?: string; message: string }>;
  };
}

/**
 * Process a batch of student rows from an uploaded spreadsheet.
 */
export async function dbProcessBulkUpload(
  rows: Array<Partial<Student>>,
  batchId: string,
  userId: string,
  uploadType: "current_students" | "old_students" = "current_students"
): Promise<ProcessResult> {
  const supabase = createAdminClient();
  const currentYear = new Date().getFullYear();

  // 1. Gather all potential lookup identifiers
  const lookupSchoolIds = rows.map((r) => r.schoolId?.trim()).filter(Boolean) as string[];
  const lookupPens = rows.map((r) => r.pen?.trim()).filter(Boolean) as string[];
  const lookupAadhaars = rows.map((r) => r.aadhaar?.trim().replace(/\D/g, "")).filter(Boolean) as string[];
  const lookupUniqueCodes = rows.map((r) => r.studentUniqueCode?.trim()).filter(Boolean) as string[];

  // 2. Fetch existing candidate matches in parallel
  const [bySchoolId, byPen, byAadhaar, byUniqueCode] = await Promise.all([
    lookupSchoolIds.length > 0
      ? supabase.from("students").select("*").in("school_id", lookupSchoolIds)
      : Promise.resolve({ data: [] }),
    lookupPens.length > 0
      ? supabase.from("students").select("*").in("pen", lookupPens)
      : Promise.resolve({ data: [] }),
    lookupAadhaars.length > 0
      ? supabase.from("students").select("*").in("aadhaar", lookupAadhaars)
      : Promise.resolve({ data: [] }),
    lookupUniqueCodes.length > 0
      ? supabase.from("students").select("*").in("student_unique_code", lookupUniqueCodes)
      : Promise.resolve({ data: [] }),
  ]);

  // Index them in Maps for O(1) matching
  const schoolIdMap = new Map<string, DBStudent>();
  const penMap = new Map<string, DBStudent>();
  const aadhaarMap = new Map<string, DBStudent>();
  const uniqueCodeMap = new Map<string, DBStudent>();

  for (const s of (bySchoolId.data || []) as DBStudent[]) {
    if (s.school_id) schoolIdMap.set(s.school_id.toUpperCase().trim(), s);
  }
  for (const s of (byPen.data || []) as DBStudent[]) {
    if (s.pen) penMap.set(s.pen.toUpperCase().trim(), s);
  }
  for (const s of (byAadhaar.data || []) as DBStudent[]) {
    if (s.aadhaar) aadhaarMap.set(s.aadhaar.trim(), s);
  }
  for (const s of (byUniqueCode.data || []) as DBStudent[]) {
    if (s.student_unique_code) uniqueCodeMap.set(s.student_unique_code.toUpperCase().trim(), s);
  }

  // 3. Classify rows into Updates vs Creates
  const updatesToProcess: Array<{
    rowNumber: number;
    existingStudent: DBStudent;
    incomingData: Partial<Student>;
    matchedBy: string;
  }> = [];

  const createsToProcess: Array<{
    rowNumber: number;
    incomingData: Partial<Student>;
  }> = [];

  let skippedCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  const skippedList: Array<{ name: string; reason: string }> = [];
  const errorsList: Array<{ rowNumber: number; name?: string; message: string }> = [];
  const createdList: Array<{ name: string; schoolId: string }> = [];
  const updatedList: Array<{ name: string; schoolId: string; changedFields: string[] }> = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNumber = idx + 2; // Excel 1-based index including header

    const name = r.name?.trim() || "";
    if (!name) {
      errorsList.push({ rowNumber, message: "Missing Student Name" });
      errorCount++;
      continue;
    }

    const schoolIdKey = r.schoolId?.toUpperCase().trim();
    const penKey = r.pen?.toUpperCase().trim();
    const aadhaarKey = r.aadhaar?.trim().replace(/\D/g, "");
    const uniqueCodeKey = r.studentUniqueCode?.toUpperCase().trim();

    // Priority matching: School ID > PEN > Aadhaar > student_unique_code
    let matched: DBStudent | undefined;
    let matchedBy = "";

    if (schoolIdKey && schoolIdMap.has(schoolIdKey)) {
      matched = schoolIdMap.get(schoolIdKey);
      matchedBy = "schoolId";
    } else if (penKey && penMap.has(penKey)) {
      matched = penMap.get(penKey);
      matchedBy = "pen";
    } else if (aadhaarKey && aadhaarMap.has(aadhaarKey)) {
      matched = aadhaarMap.get(aadhaarKey);
      matchedBy = "aadhaar";
    } else if (uniqueCodeKey && uniqueCodeMap.has(uniqueCodeKey)) {
      matched = uniqueCodeMap.get(uniqueCodeKey);
      matchedBy = "studentUniqueCode";
    }

    if (matched) {
      updatesToProcess.push({
        rowNumber,
        existingStudent: matched,
        incomingData: r,
        matchedBy,
      });
    } else {
      createsToProcess.push({
        rowNumber,
        incomingData: r,
      });
    }
  }

  // 4. Pre-generate School IDs for new creations
  const newSchoolIds = await generateBatchSchoolIds(
    createsToProcess.map((c) => ({
      admissionYear: c.incomingData.admissionYear || currentYear,
      presentClass: c.incomingData.presentClass || "V",
      presentSection: c.incomingData.presentSection || "A",
    }))
  );

  // 5. Execute Updates (Non-destructive: blank cells DO NOT overwrite existing values)
  for (const item of updatesToProcess) {
    const existing = item.existingStudent;
    const inc = item.incomingData;

    const dbPatch: Record<string, any> = {};
    const changedFieldNames: string[] = [];

    // Helper to conditionally apply non-blank fields
    const applyIfPresent = (col: string, val: any, existingVal: any, fieldLabel: string) => {
      if (val !== undefined && val !== null && val !== "") {
        // Only set if different
        if (existingVal !== val) {
          dbPatch[col] = val;
          changedFieldNames.push(fieldLabel);
        }
      }
    };

    applyIfPresent("name", inc.name?.trim(), existing.name, "Name");
    applyIfPresent("dob", inc.dob?.trim(), existing.dob, "Date of Birth");
    if (inc.gender) applyIfPresent("gender", inc.gender, existing.gender, "Gender");
    applyIfPresent("father_name", inc.fatherName?.trim(), existing.father_name, "Father Name");
    applyIfPresent("mother_name", inc.motherName?.trim(), existing.mother_name, "Mother Name");
    applyIfPresent("mobile", inc.studentContact?.trim(), existing.mobile, "Mobile");
    applyIfPresent("address", inc.address?.trim(), existing.address, "Address");
    applyIfPresent("pincode", inc.pincode?.trim(), existing.pincode, "Pincode");
    applyIfPresent("present_class", inc.presentClass?.trim(), existing.present_class, "Class");
    applyIfPresent("present_section", inc.presentSection?.trim(), existing.present_section, "Section");
    if (inc.presentRoll != null) applyIfPresent("present_roll", Number(inc.presentRoll), existing.present_roll, "Roll");
    if (inc.currentStatus) applyIfPresent("current_status", inc.currentStatus, existing.current_status, "Status");
    if (inc.admissionYear != null) applyIfPresent("admission_year", Number(inc.admissionYear), existing.admission_year, "Admission Year");
    applyIfPresent("pen", inc.pen?.trim(), existing.pen, "PEN");
    applyIfPresent("aadhaar", inc.aadhaar?.trim().replace(/\D/g, ""), existing.aadhaar, "Aadhaar");
    applyIfPresent("student_unique_code", inc.studentUniqueCode?.trim(), existing.student_unique_code, "Unique Code");
    applyIfPresent("guardian_name", inc.guardianName?.trim(), existing.guardian_name, "Guardian Name");
    applyIfPresent("social_category", inc.socialCategory?.trim(), existing.social_category, "Category");
    applyIfPresent("religion", inc.religion?.trim(), existing.religion, "Religion");
    applyIfPresent("bank_ifsc", inc.bankIfsc?.trim(), existing.bank_ifsc, "IFSC");
    applyIfPresent("bank_account_no", inc.bankAccountNo?.trim(), existing.bank_account_no, "Account No");

    if (Object.keys(dbPatch).length === 0) {
      skippedCount++;
      skippedList.push({ name: existing.name, reason: "No new or modified values" });
      continue;
    }

    dbPatch.updated_at = new Date().toISOString();

    const { data: updatedRecord, error: updateError } = await supabase
      .from("students")
      .update(dbPatch)
      .eq("id", existing.id)
      .select()
      .single();

    if (updateError) {
      errorCount++;
      errorsList.push({
        rowNumber: item.rowNumber,
        name: existing.name,
        message: `Update failed: ${updateError.message}`,
      });
      continue;
    }

    // Record in audit log tagged with batch_id
    await supabase.from("audit_log").insert({
      performed_by: userId,
      action: "UPDATE",
      table_name: "students",
      record_id: existing.id,
      old_values: existing,
      new_values: updatedRecord,
      metadata: {
        batch_id: batchId,
        source: "BULK_UPLOAD",
        matched_by: item.matchedBy,
        changed_fields: changedFieldNames,
      },
    });

    updatedList.push({
      name: existing.name,
      schoolId: existing.school_id,
      changedFields: changedFieldNames,
    });
  }

  // 6. Execute Creates (New Admissions)
  for (let i = 0; i < createsToProcess.length; i++) {
    const item = createsToProcess[i];
    const inc = item.incomingData;
    const generatedSchoolId = inc.schoolId?.trim() || newSchoolIds[i];

    const insertPayload: Partial<DBStudent> = {
      school_id: generatedSchoolId,
      name: inc.name?.trim() || "Unknown",
      dob: inc.dob?.trim() || "2015-01-01",
      gender: (inc.gender || "Male") as Gender,
      father_name: inc.fatherName?.trim() || "N/A",
      mother_name: inc.motherName?.trim() || "N/A",
      guardian_name: inc.guardianName?.trim() || null,
      address: inc.address?.trim() || null,
      pincode: inc.pincode?.trim() || null,
      mobile: inc.studentContact?.trim() || null,
      alt_mobile: inc.altMobile?.trim() || null,
      email: inc.email?.trim() || null,
      present_class: inc.presentClass?.trim() || "V",
      present_section: inc.presentSection?.trim() || "A",
      present_roll: inc.presentRoll != null ? Number(inc.presentRoll) : 1,
      current_status: (inc.currentStatus || (uploadType === "old_students" ? "Passed Out" : "Continuing")) as StudentStatus,
      admission_year: inc.admissionYear != null ? Number(inc.admissionYear) : currentYear,
      pen: inc.pen?.trim() || null,
      aadhaar: inc.aadhaar?.trim().replace(/\D/g, "") || null,
      student_unique_code: inc.studentUniqueCode?.trim() || null,
      social_category: inc.socialCategory?.trim() || "General",
      religion: inc.religion?.trim() || null,
      bank_ifsc: inc.bankIfsc?.trim() || null,
      bank_account_no: inc.bankAccountNo?.trim() || null,
      is_cwsn: inc.isCwsn || false,
      is_bpl: inc.isBpl || false,
      is_aay: inc.isAay || false,
      is_ews: inc.isEws || false,
      indian_nationality: inc.indianNationality ?? true,
    };

    const { data: newRecord, error: insertError } = await supabase
      .from("students")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      errorCount++;
      errorsList.push({
        rowNumber: item.rowNumber,
        name: inc.name,
        message: `Insert failed: ${insertError.message}`,
      });
      continue;
    }

    // Also insert initial academic history row
    await supabase.from("academic_history").insert({
      student_id: newRecord.id,
      year: newRecord.admission_year,
      class: newRecord.present_class,
      section: newRecord.present_section,
      roll: newRecord.present_roll,
      status: newRecord.current_status,
    });

    // Record in audit log tagged with batch_id
    await supabase.from("audit_log").insert({
      performed_by: userId,
      action: "CREATE",
      table_name: "students",
      record_id: newRecord.id,
      new_values: newRecord,
      metadata: {
        batch_id: batchId,
        source: "BULK_UPLOAD",
        is_new_admission: true,
      },
    });

    createdList.push({
      name: newRecord.name,
      schoolId: newRecord.school_id,
    });
  }

  // Insert master batch entry in audit log to ensure the batch is permanently tracked in history
  await supabase.from("audit_log").insert({
    performed_by: userId,
    action: "BATCH_UPLOAD",
    table_name: "students",
    metadata: {
      batch_id: batchId,
      upload_type: uploadType,
      source: "BULK_UPLOAD",
      total_rows: rows.length,
      created_count: createdList.length,
      updated_count: updatedList.length,
      skipped_count: skippedCount,
      error_count: errorCount,
    },
  });

  const summary: ImportBatchSummary = {
    batchId,
    totalRows: rows.length,
    createdCount: createdList.length,
    updatedCount: updatedList.length,
    skippedCount,
    errorCount,
    warningCount,
    timestamp: new Date().toISOString(),
    performedBy: userId,
  };

  return {
    summary,
    details: {
      created: createdList,
      updated: updatedList,
      skipped: skippedList,
      errors: errorsList,
    },
  };
}

export interface ProcessResultsResult {
  summary: ImportBatchSummary;
  details: {
    created: Array<{ name: string; examName: string; academicYear: number; marks: number }>;
    updated: Array<{ name: string; examName: string; academicYear: number; marks: number }>;
    skipped: Array<{ name: string; reason: string }>;
    errors: Array<{ rowNumber: number; name?: string; message: string }>;
  };
}

/**
 * Process a batch of examination results from an uploaded spreadsheet.
 */
export async function dbProcessResultsBulkUpload(
  rows: BulkResultRow[],
  batchId: string,
  userId: string,
  targetSessionYear?: number,
  targetExamName?: string
): Promise<ProcessResultsResult> {
  const supabase = createAdminClient();
  const currentYear = new Date().getFullYear();

  // 1. Fetch candidate students by identifiers
  const lookupSchoolIds = rows.map((r) => r.schoolId?.trim().toUpperCase()).filter(Boolean) as string[];
  const lookupUniqueCodes = rows.map((r) => r.studentUniqueCode?.trim().toUpperCase()).filter(Boolean) as string[];

  const [bySchoolId, byUniqueCode, allStudents] = await Promise.all([
    lookupSchoolIds.length > 0
      ? supabase.from("students").select("id, school_id, student_unique_code, name, present_class, present_section, present_roll").in("school_id", lookupSchoolIds)
      : Promise.resolve({ data: [] }),
    lookupUniqueCodes.length > 0
      ? supabase.from("students").select("id, school_id, student_unique_code, name, present_class, present_section, present_roll").in("student_unique_code", lookupUniqueCodes)
      : Promise.resolve({ data: [] }),
    supabase.from("students").select("id, school_id, student_unique_code, name, present_class, present_section, present_roll").limit(2000),
  ]);

  const schoolIdMap = new Map<string, any>();
  const uniqueCodeMap = new Map<string, any>();
  const classSecRollMap = new Map<string, any>();

  for (const s of (allStudents.data || [])) {
    if (s.school_id) schoolIdMap.set(s.school_id.toUpperCase().trim(), s);
    if (s.student_unique_code) uniqueCodeMap.set(s.student_unique_code.toUpperCase().trim(), s);
    if (s.present_class && s.present_section && s.present_roll) {
      const key = `${s.present_class.toUpperCase().trim()}-${s.present_section.toUpperCase().trim()}-${s.present_roll}`;
      classSecRollMap.set(key, s);
    }
  }

  for (const s of (bySchoolId.data || [])) {
    if (s.school_id) schoolIdMap.set(s.school_id.toUpperCase().trim(), s);
  }
  for (const s of (byUniqueCode.data || [])) {
    if (s.student_unique_code) uniqueCodeMap.set(s.student_unique_code.toUpperCase().trim(), s);
  }

  const createdList: Array<{ name: string; examName: string; academicYear: number; marks: number }> = [];
  const updatedList: Array<{ name: string; examName: string; academicYear: number; marks: number }> = [];
  const skippedList: Array<{ name: string; reason: string }> = [];
  const errorsList: Array<{ rowNumber: number; name?: string; message: string }> = [];

  let skippedCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNumber = idx + 2;

    const schoolIdKey = r.schoolId?.trim().toUpperCase();
    const uniqueCodeKey = r.studentUniqueCode?.trim().toUpperCase();
    const classKey = r.presentClass && r.presentSection && r.presentRoll
      ? `${r.presentClass.toUpperCase().trim()}-${r.presentSection.toUpperCase().trim()}-${r.presentRoll}`
      : undefined;

    let matchedStudent: any;
    if (schoolIdKey && schoolIdMap.has(schoolIdKey)) {
      matchedStudent = schoolIdMap.get(schoolIdKey);
    } else if (uniqueCodeKey && uniqueCodeMap.has(uniqueCodeKey)) {
      matchedStudent = uniqueCodeMap.get(uniqueCodeKey);
    } else if (classKey && classSecRollMap.has(classKey)) {
      matchedStudent = classSecRollMap.get(classKey);
    }

    if (!matchedStudent) {
      errorCount++;
      errorsList.push({
        rowNumber,
        name: r.name,
        message: `Student not found in database for [${r.schoolId || r.studentUniqueCode || classKey || r.name || "Row"}]`,
      });
      continue;
    }

    const academicYear = r.academicYear || targetSessionYear || currentYear;
    const examName = r.examName || targetExamName || "1st Summative Evaluation";
    const className = r.presentClass || matchedStudent.present_class || "V";
    const fullMarks = r.fullMarks || getClassFullMarks(className);
    const marksObtained = r.marksObtained;
    const percentage = r.percentage !== undefined ? r.percentage : Number(((marksObtained / fullMarks) * 100).toFixed(2));
    const grade = r.grade || calculateGrade(percentage);

    // Check if result already exists for this student, year & exam
    const { data: existingResult } = await supabase
      .from("student_results")
      .select("*")
      .eq("student_id", matchedStudent.id)
      .eq("academic_year", academicYear)
      .eq("exam_name", examName)
      .maybeSingle();

    const payload = {
      student_id: matchedStudent.id,
      academic_year: academicYear,
      class: className,
      section: r.presentSection || matchedStudent.present_section || "A",
      roll: r.presentRoll || matchedStudent.present_roll || 1,
      exam_name: examName,
      full_marks: fullMarks,
      marks_obtained: marksObtained,
      percentage,
      grade,
      subject_marks: r.subjectMarks || {},
      remarks: r.remarks || null,
      updated_at: new Date().toISOString(),
    };

    if (existingResult) {
      // Update existing result
      const { data: updated, error: updateErr } = await supabase
        .from("student_results")
        .update(payload)
        .eq("id", existingResult.id)
        .select()
        .single();

      if (updateErr) {
        errorCount++;
        errorsList.push({ rowNumber, name: matchedStudent.name, message: updateErr.message });
      } else {
        // Audit log
        await supabase.from("audit_log").insert({
          performed_by: userId,
          action: "UPDATE",
          table_name: "student_results",
          record_id: existingResult.id,
          old_values: existingResult,
          new_values: updated,
          metadata: {
            batch_id: batchId,
            upload_type: "EXAM_RESULTS",
            academic_year: academicYear,
            exam_name: examName,
          },
        });

        updatedList.push({
          name: matchedStudent.name,
          examName,
          academicYear,
          marks: marksObtained,
        });
      }
    } else {
      // Insert new result
      const { data: inserted, error: insertErr } = await supabase
        .from("student_results")
        .insert(payload)
        .select()
        .single();

      if (insertErr) {
        errorCount++;
        errorsList.push({ rowNumber, name: matchedStudent.name, message: insertErr.message });
      } else {
        // Audit log
        await supabase.from("audit_log").insert({
          performed_by: userId,
          action: "CREATE",
          table_name: "student_results",
          record_id: inserted.id,
          new_values: inserted,
          metadata: {
            batch_id: batchId,
            upload_type: "EXAM_RESULTS",
            academic_year: academicYear,
            exam_name: examName,
          },
        });

        createdList.push({
          name: matchedStudent.name,
          examName,
          academicYear,
          marks: marksObtained,
        });
      }
    }
  }

  // Insert master batch entry in audit log to ensure results batch is permanently tracked in history
  await supabase.from("audit_log").insert({
    performed_by: userId,
    action: "BATCH_UPLOAD",
    table_name: "student_results",
    metadata: {
      batch_id: batchId,
      upload_type: "EXAM_RESULTS",
      source: "RESULTS_BULK_UPLOAD",
      academic_year: targetSessionYear || currentYear,
      exam_name: targetExamName,
      total_rows: rows.length,
      created_count: createdList.length,
      updated_count: updatedList.length,
      skipped_count: skippedCount,
      error_count: errorCount,
    },
  });

  const summary: ImportBatchSummary = {
    batchId,
    totalRows: rows.length,
    createdCount: createdList.length,
    updatedCount: updatedList.length,
    skippedCount,
    errorCount,
    warningCount,
    timestamp: new Date().toISOString(),
    performedBy: userId,
  };

  return {
    summary,
    details: {
      created: createdList,
      updated: updatedList,
      skipped: skippedList || [],
      errors: errorsList,
    },
  };
}

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

  // Find all audit log entries
  const { data: logs, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !logs) {
    throw new Error("Failed to query audit logs for batch rollback.");
  }

  // Filter logs for this specific batch_id (excluding prior rollback logs)
  const batchLogs = logs.filter((entry) => {
    const meta = safeParseMetadata(entry.metadata);
    return meta?.batch_id === batchId && entry.action !== "ROLLBACK";
  });

  if (batchLogs.length === 0) {
    throw new Error(`No active records found for batch ID [${batchId}] to delete/rollback.`);
  }

  let deletedCount = 0;
  let revertedCount = 0;

  for (const entry of batchLogs) {
    const tableName = entry.table_name || "students";

    if (entry.action === "CREATE" && entry.record_id) {
      // Delete the record created in this batch
      await supabase.from(tableName).delete().eq("id", entry.record_id);
      deletedCount++;
    } else if (entry.action === "UPDATE" && entry.record_id && entry.old_values) {
      // Revert the record back to its previous values
      const oldVals = { ...entry.old_values };
      delete oldVals.id;
      delete oldVals.created_at;
      oldVals.updated_at = new Date().toISOString();

      await supabase.from(tableName).update(oldVals).eq("id", entry.record_id);
      revertedCount++;
    }
  }

  // Log the rollback action
  await supabase.from("audit_log").insert({
    performed_by: userId,
    action: "ROLLBACK",
    table_name: batchLogs[0]?.table_name || "batch_rollback",
    metadata: {
      batch_id: batchId,
      rolled_back_batch_id: batchId,
      deleted_new_records: deletedCount,
      reverted_updated_records: revertedCount,
    },
  });

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
 * Helper to generate a sequential batch ID containing date, time and next sequence number:
 * Format: BATCH-YYYYMMDD-HHMMSS-SEQ
 */
export async function dbGenerateBatchId(): Promise<string> {
  const supabase = createAdminClient();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("metadata")
    .order("created_at", { ascending: false })
    .limit(2000);

  const uniqueBatches = new Set(
    (logs || [])
      .map((log) => {
        const meta = safeParseMetadata(log.metadata);
        return meta?.batch_id;
      })
      .filter(Boolean)
  );

  const nextSeq = uniqueBatches.size + 1;
  const seqString = String(nextSeq).padStart(4, "0");

  const now = new Date();
  
  // Format YYYYMMDD and HHMMSS manually
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `BATCH-${year}${month}${day}-${hours}${minutes}${seconds}-${seqString}`;
}
