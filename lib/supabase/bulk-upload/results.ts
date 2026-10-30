import { createAdminClient } from "@/lib/supabase/admin";
import type { Student, ImportBatchSummary, BulkResultRow } from "@/lib/types";
import { getClassFullMarks, calculateGrade, dbCalculateAndAssignRanks } from "@/lib/supabase/db-results";
import { softWrite } from "@/lib/supabase/write";
import { getAcademicYear } from "@/lib/academic/current-year";

interface ProcessResultsResult {
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
  const currentYear = await getAcademicYear();

  // 1. Fetch candidate students by identifiers & relevant class cohorts
  const lookupSchoolIds = rows.map((r) => r.schoolId?.trim().toUpperCase()).filter(Boolean) as string[];
  const lookupUniqueCodes = rows.map((r) => r.studentUniqueCode?.trim().toUpperCase()).filter(Boolean) as string[];
  const lookupPens = rows.map((r) => r.pen?.trim().toUpperCase()).filter(Boolean) as string[];
  const relevantClasses = Array.from(
    new Set(rows.map((r) => r.presentClass?.trim().toUpperCase()).filter(Boolean))
  ) as string[];

  const [bySchoolId, byUniqueCode, byPen, byClassRoster] = await Promise.all([
    lookupSchoolIds.length > 0
      ? supabase.from("students").select("id, school_id, student_unique_code, pen, name, present_class, present_section, present_roll").in("school_id", lookupSchoolIds)
      : Promise.resolve({ data: [] }),
    lookupUniqueCodes.length > 0
      ? supabase.from("students").select("id, school_id, student_unique_code, pen, name, present_class, present_section, present_roll").in("student_unique_code", lookupUniqueCodes)
      : Promise.resolve({ data: [] }),
    lookupPens.length > 0
      ? supabase.from("students").select("id, school_id, student_unique_code, pen, name, present_class, present_section, present_roll").in("pen", lookupPens)
      : Promise.resolve({ data: [] }),
    relevantClasses.length > 0
      ? supabase.from("students").select("id, school_id, student_unique_code, pen, name, present_class, present_section, present_roll").in("present_class", relevantClasses)
      : Promise.resolve({ data: [] }),
  ]);

  const schoolIdMap = new Map<string, any>();
  const uniqueCodeMap = new Map<string, any>();
  const penMap = new Map<string, any>();
  const classSecRollMap = new Map<string, any>();

  for (const s of (byClassRoster.data || [])) {
    if (s.school_id) schoolIdMap.set(s.school_id.toUpperCase().trim(), s);
    if (s.student_unique_code) uniqueCodeMap.set(s.student_unique_code.toUpperCase().trim(), s);
    if (s.pen) penMap.set(s.pen.toUpperCase().trim(), s);
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
  for (const s of (byPen.data || [])) {
    if (s.pen) penMap.set(s.pen.toUpperCase().trim(), s);
  }

  const createdList: Array<{ name: string; examName: string; academicYear: number; marks: number }> = [];
  const updatedList: Array<{ name: string; examName: string; academicYear: number; marks: number }> = [];
  const skippedList: Array<{ name: string; reason: string }> = [];
  const errorsList: Array<{ rowNumber: number; name?: string; message: string }> = [];

  const skippedCount = 0;
  let errorCount = 0;
  const warningCount = 0;

  // Pre-fetch all existing results for matched students in one query
  const allCandidateStudentIds: string[] = [];
  for (const s of schoolIdMap.values()) if (s?.id) allCandidateStudentIds.push(s.id);
  for (const s of uniqueCodeMap.values()) if (s?.id) allCandidateStudentIds.push(s.id);
  for (const s of penMap.values()) if (s?.id) allCandidateStudentIds.push(s.id);
  for (const s of classSecRollMap.values()) if (s?.id) allCandidateStudentIds.push(s.id);
  const uniqueCandidateStudentIds = Array.from(new Set(allCandidateStudentIds));

  const existingResultsMap = new Map<string, any>();
  if (uniqueCandidateStudentIds.length > 0) {
    for (let i = 0; i < uniqueCandidateStudentIds.length; i += 200) {
      const idChunk = uniqueCandidateStudentIds.slice(i, i + 200);
      const { data: existingData } = await supabase
        .from("student_results")
        .select("*")
        .in("student_id", idChunk);

      for (const item of (existingData || [])) {
        const key = `${item.student_id}-${item.academic_year}-${item.exam_name}`;
        existingResultsMap.set(key, item);
      }
    }
  }

  interface PreparedResultItem {
    rowNumber: number;
    matchedStudent: any;
    payload: any;
    existingResult?: any;
    examName: string;
    academicYear: number;
    marksObtained: number;
  }

  const resultsToUpdate: PreparedResultItem[] = [];
  const resultsToInsert: PreparedResultItem[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const rowNumber = idx + 2;

    const schoolIdKey = r.schoolId?.trim().toUpperCase();
    const uniqueCodeKey = r.studentUniqueCode?.trim().toUpperCase();
    const penKey = r.pen?.trim().toUpperCase();
    const classKey = r.presentClass && r.presentSection && r.presentRoll
      ? `${r.presentClass.toUpperCase().trim()}-${r.presentSection.toUpperCase().trim()}-${r.presentRoll}`
      : undefined;

    let matchedStudent: any;
    if (schoolIdKey && schoolIdMap.has(schoolIdKey)) {
      matchedStudent = schoolIdMap.get(schoolIdKey);
    } else if (uniqueCodeKey && uniqueCodeMap.has(uniqueCodeKey)) {
      matchedStudent = uniqueCodeMap.get(uniqueCodeKey);
    } else if (penKey && penMap.has(penKey)) {
      matchedStudent = penMap.get(penKey);
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
    const fullMarks = r.fullMarks || getClassFullMarks(className, examName);
    const marksObtained = r.marksObtained;
    const percentage = r.percentage !== undefined ? r.percentage : Number(((marksObtained / fullMarks) * 100).toFixed(2));
    const grade = r.grade || calculateGrade(percentage);

    const existingKey = `${matchedStudent.id}-${academicYear}-${examName}`;
    const existingResult = existingResultsMap.get(existingKey);

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
      resultsToUpdate.push({
        rowNumber,
        matchedStudent,
        existingResult,
        payload,
        examName,
        academicYear,
        marksObtained,
      });
    } else {
      resultsToInsert.push({
        rowNumber,
        matchedStudent,
        payload,
        examName,
        academicYear,
        marksObtained,
      });
    }
  }

  const resultAuditEntries: any[] = [];

  // Execute updates in concurrent batches of 10
  const UPDATE_CONCURRENCY = 10;
  for (let i = 0; i < resultsToUpdate.length; i += UPDATE_CONCURRENCY) {
    const batch = resultsToUpdate.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ rowNumber, matchedStudent, existingResult, payload, examName, academicYear, marksObtained }) => {
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
          resultAuditEntries.push({
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
      })
    );
  }

  // Execute inserts in batches of 50
  const INSERT_CHUNK_SIZE = 50;
  for (let i = 0; i < resultsToInsert.length; i += INSERT_CHUNK_SIZE) {
    const chunk = resultsToInsert.slice(i, i + INSERT_CHUNK_SIZE);
    const payloads = chunk.map((c) => c.payload);

    const { data: insertedList, error: insertErr } = await supabase
      .from("student_results")
      .insert(payloads)
      .select();

    if (insertErr || !insertedList) {
      // Fallback row-by-row for error isolation
      for (const item of chunk) {
        const { data: singleInserted, error: singleErr } = await supabase
          .from("student_results")
          .insert(item.payload)
          .select()
          .single();

        if (singleErr || !singleInserted) {
          errorCount++;
          errorsList.push({ rowNumber: item.rowNumber, name: item.matchedStudent.name, message: singleErr?.message || "Insert failed" });
        } else {
          resultAuditEntries.push({
            performed_by: userId,
            action: "CREATE",
            table_name: "student_results",
            record_id: singleInserted.id,
            new_values: singleInserted,
            metadata: {
              batch_id: batchId,
              upload_type: "EXAM_RESULTS",
              academic_year: item.academicYear,
              exam_name: item.examName,
            },
          });
          createdList.push({
            name: item.matchedStudent.name,
            examName: item.examName,
            academicYear: item.academicYear,
            marks: item.marksObtained,
          });
        }
      }
    } else {
      for (let j = 0; j < insertedList.length; j++) {
        const ins = insertedList[j];
        const item = chunk[j];
        resultAuditEntries.push({
          performed_by: userId,
          action: "CREATE",
          table_name: "student_results",
          record_id: ins.id,
          new_values: ins,
          metadata: {
            batch_id: batchId,
            upload_type: "EXAM_RESULTS",
            academic_year: item.academicYear,
            exam_name: item.examName,
          },
        });
        createdList.push({
          name: item.matchedStudent.name,
          examName: item.examName,
          academicYear: item.academicYear,
          marks: item.marksObtained,
        });
      }
    }
  }

  // Batch insert all result audit logs in chunks of 100
  for (let i = 0; i < resultAuditEntries.length; i += 100) {
    const auditChunk = resultAuditEntries.slice(i, i + 100);
    const { error: auditErr } = await supabase.from("audit_log").insert(auditChunk);
    if (auditErr) {
      console.warn("Result audit log batch insert warning:", auditErr);
    }
  }

  // Automatically recalculate dual ranks for all affected classes and academic years
  const targetYear = targetSessionYear || currentYear;
  const targetExam = targetExamName || "1st Summative Evaluation";
  for (const cls of relevantClasses) {
    try {
      await dbCalculateAndAssignRanks(targetYear, cls, targetExam);
    } catch (rankErr) {
      console.warn(`Rank calculation notification for Class ${cls}:`, rankErr);
    }
  }

  // Insert master batch entry in audit log to ensure results batch is permanently tracked in history
  await softWrite(supabase.from("audit_log").insert({
    performed_by: userId,
    action: "BATCH_UPLOAD",
    table_name: "student_results",
    metadata: {
      batch_id: batchId,
      upload_type: "EXAM_RESULTS",
      source: "RESULTS_BULK_UPLOAD",
      academic_year: targetYear,
      exam_name: targetExam,
      total_rows: rows.length,
      created_count: createdList.length,
      updated_count: updatedList.length,
      skipped_count: skippedCount,
      error_count: errorCount,
    },
  }), "audit_log insert");

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
