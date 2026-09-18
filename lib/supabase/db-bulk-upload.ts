import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBatchSchoolIds } from "./school-id-generator";
import type { Student, ImportBatchSummary, ImportBatchRecord, StudentStatus, Gender, BulkResultRow, BulkUploadType } from "@/lib/types";
import { mapDBStudentToStudent, type DBStudent } from "./db-students";
import { getClassFullMarks, calculateGrade, dbCalculateAndAssignRanks } from "./db-results";
import { normalizeGender, normalizeSocialCategory } from "@/lib/utils/excel-parser";
import { applyStudentEntryDefaults } from "@/lib/utils/student-entry-presets";

interface ProcessResult {
  summary: ImportBatchSummary;
  details: {
    created: Array<{ name: string; schoolId: string }>;
    updated: Array<{ name: string; schoolId: string; changedFields: string[] }>;
    skipped: Array<{ rowNumber?: number; name?: string; schoolId?: string; reason: string }>;
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
  const skippedList: Array<{ rowNumber?: number; name?: string; schoolId?: string; reason: string }> = [];
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
  interface PreparedUpdate {
    item: (typeof updatesToProcess)[0];
    existing: any;
    dbPatch: Record<string, any>;
    changedFieldNames: string[];
  }

  const preparedUpdates: PreparedUpdate[] = [];

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
    if (inc.gender) applyIfPresent("gender", normalizeGender(inc.gender), existing.gender, "Gender");
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
    applyIfPresent("social_category", normalizeSocialCategory(inc.socialCategory?.trim()), existing.social_category, "Category");
    applyIfPresent("religion", inc.religion?.trim(), existing.religion, "Religion");
    applyIfPresent("bank_ifsc", inc.bankIfsc?.trim(), existing.bank_ifsc, "IFSC");
    applyIfPresent("bank_account_no", inc.bankAccountNo?.trim(), existing.bank_account_no, "Account No");
    applyIfPresent("admission_no", inc.admissionNo?.trim(), existing.admission_no, "Admission Number");
    applyIfPresent("admission_date", inc.admissionDate?.trim(), existing.admission_date, "Admission Date");
    applyIfPresent("academic_stream", inc.academicStream?.trim(), existing.academic_stream, "Academic Stream");
    applyIfPresent("medium_of_instruction", inc.mediumOfInstruction?.trim(), existing.medium_of_instruction, "Medium of Instruction");
    applyIfPresent("birth_registration_no", inc.birthRegistrationNo?.trim(), existing.birth_registration_no, "Birth Registration No");
    applyIfPresent("board_registration_no", (inc.boardRegistrationNo || inc.wbbseRegNo || inc.wbchseRegNo)?.trim(), existing.board_registration_no, "Board Registration No");
    applyIfPresent("board_roll_no", (inc.boardRollNo || inc.wbbseRollNo || inc.wbchseRollNo)?.trim(), existing.board_roll_no, "Board Roll No");
    applyIfPresent("dise_code", inc.diseCode?.trim(), existing.dise_code, "DISE Code");
    applyIfPresent("minority_group", inc.minorityGroup?.trim(), existing.minority_group, "Minority Group");
    applyIfPresent("mother_tongue", inc.motherTongue?.trim(), existing.mother_tongue, "Mother Tongue");
    if (inc.isCwsn !== undefined) applyIfPresent("is_cwsn", inc.isCwsn, existing.is_cwsn, "CWSN");
    applyIfPresent("impairment_type", inc.impairmentType?.trim(), existing.impairment_type, "Disability Type");
    if (inc.annualFamilyIncome != null) applyIfPresent("annual_family_income", Number(inc.annualFamilyIncome), existing.annual_family_income, "Annual Income");
    applyIfPresent("blood_group", inc.bloodGroup?.trim(), existing.blood_group, "Blood Group");
    if (inc.heightCm != null) applyIfPresent("height_cm", Number(inc.heightCm), existing.height_cm, "Height");
    if (inc.weightKg != null) applyIfPresent("weight_kg", Number(inc.weightKg), existing.weight_kg, "Weight");
    if (inc.previousMarksPercent != null) applyIfPresent("previous_marks_percent", Number(inc.previousMarksPercent), existing.previous_marks_percent, "Previous Marks");
    applyIfPresent("previous_school", inc.previousSchool?.trim(), existing.previous_school, "Previous School");
    applyIfPresent("previous_class", inc.previousClass?.trim(), existing.previous_class, "Previous Class");
    if (inc.previousRollNo != null) applyIfPresent("previous_roll_no", Number(inc.previousRollNo), existing.previous_roll_no, "Previous Roll");
    applyIfPresent("relationship_with_guardian", inc.relationshipWithGuardian?.trim(), existing.relationship_with_guardian, "Guardian Relation");
    applyIfPresent("guardian_qualification", inc.guardianQualification?.trim(), existing.guardian_qualification, "Guardian Qualification");
    applyIfPresent("identification_mark", inc.identificationMark?.trim(), existing.identification_mark, "Identification Mark");
    applyIfPresent("health_id", inc.healthId?.trim(), existing.health_id, "Health ID");

    if (Object.keys(dbPatch).length === 0) {
      skippedCount++;
      skippedList.push({
        rowNumber: item.rowNumber,
        name: existing.name,
        schoolId: existing.school_id || existing.pen || undefined,
        reason: "Duplicate / Identical record (No changes detected)",
      });
      continue;
    }

    dbPatch.updated_at = new Date().toISOString();
    preparedUpdates.push({ item, existing, dbPatch, changedFieldNames });
  }

  // Execute updates in concurrent batches of 10
  const updateAuditEntries: any[] = [];
  const UPDATE_CONCURRENCY = 10;
  for (let i = 0; i < preparedUpdates.length; i += UPDATE_CONCURRENCY) {
    const batch = preparedUpdates.slice(i, i + UPDATE_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ item, existing, dbPatch, changedFieldNames }) => {
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
        } else {
          updateAuditEntries.push({
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
      })
    );
  }

  // Batch insert update audit logs in chunks of 100
  for (let i = 0; i < updateAuditEntries.length; i += 100) {
    const auditChunk = updateAuditEntries.slice(i, i + 100);
    const { error: auditErr } = await supabase.from("audit_log").insert(auditChunk);
    if (auditErr) {
      console.warn("Update audit log batch insert warning:", auditErr);
    }
  }

  // 6. Execute Creates (New Admissions) in Batches of 50
  const CREATE_BATCH_SIZE = 50;
  const createAuditEntries: any[] = [];

  for (let cIdx = 0; cIdx < createsToProcess.length; cIdx += CREATE_BATCH_SIZE) {
    const chunk = createsToProcess.slice(cIdx, cIdx + CREATE_BATCH_SIZE);
    const chunkPayloads: Partial<DBStudent>[] = [];

    for (let i = 0; i < chunk.length; i++) {
      const globalIndex = cIdx + i;
      const item = chunk[i];
      const inc = applyStudentEntryDefaults(item.incomingData);
      const generatedSchoolId = inc.schoolId?.trim() || newSchoolIds[globalIndex];

      chunkPayloads.push({
        school_id: generatedSchoolId,
        name: inc.name?.trim() || "Unknown",
        dob: inc.dob?.trim() || "2015-01-01",
        gender: normalizeGender(inc.gender),
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
        admission_date: inc.admissionDate?.trim() || null,
        admission_no: inc.admissionNo?.trim() || null,
        academic_stream: inc.academicStream?.trim() || null,
        medium_of_instruction: inc.mediumOfInstruction?.trim() || null,
        birth_registration_no: inc.birthRegistrationNo?.trim() || null,
        board_registration_no: (inc.boardRegistrationNo || inc.wbbseRegNo || inc.wbchseRegNo)?.trim() || null,
        board_roll_no: (inc.boardRollNo || inc.wbbseRollNo || inc.wbchseRollNo)?.trim() || null,
        dise_code: inc.diseCode?.trim() || null,
        minority_group: inc.minorityGroup?.trim() || null,
        mother_tongue: inc.motherTongue?.trim() || null,
        pen: inc.pen?.trim() || null,
        aadhaar: inc.aadhaar?.trim().replace(/\D/g, "") || null,
        student_unique_code: inc.studentUniqueCode?.trim() || null,
        social_category: normalizeSocialCategory(inc.socialCategory?.trim()) || "General",
        religion: inc.religion?.trim() || null,
        bank_ifsc: inc.bankIfsc?.trim() || null,
        bank_account_no: inc.bankAccountNo?.trim() || null,
        is_cwsn: inc.isCwsn || false,
        impairment_type: inc.impairmentType?.trim() || null,
        is_aay: inc.isAay || false,
        is_ews: inc.isEws || false,
        indian_nationality: inc.indianNationality ?? true,
        annual_family_income: inc.annualFamilyIncome != null ? Number(inc.annualFamilyIncome) : null,
        blood_group: inc.bloodGroup?.trim() || null,
        height_cm: inc.heightCm != null ? Number(inc.heightCm) : null,
        weight_kg: inc.weightKg != null ? Number(inc.weightKg) : null,
        previous_school: inc.previousSchool?.trim() || null,
        previous_class: inc.previousClass?.trim() || null,
        previous_roll_no: inc.previousRollNo != null ? Number(inc.previousRollNo) : null,
        previous_marks_percent: inc.previousMarksPercent != null ? Number(inc.previousMarksPercent) : null,
        relationship_with_guardian: inc.relationshipWithGuardian?.trim() || null,
        guardian_qualification: inc.guardianQualification?.trim() || null,
        identification_mark: inc.identificationMark?.trim() || null,
        health_id: inc.healthId?.trim() || null,
      });
    }

    const { data: newRecords, error: batchInsertError } = await supabase
      .from("students")
      .insert(chunkPayloads)
      .select();

    if (batchInsertError || !newRecords || newRecords.length === 0) {
      // Fallback to row-by-row insertion for this chunk to capture individual errors
      for (let j = 0; j < chunk.length; j++) {
        const item = chunk[j];
        const payload = chunkPayloads[j];
        const { data: singleRec, error: singleErr } = await supabase
          .from("students")
          .insert(payload)
          .select()
          .single();

        if (singleErr || !singleRec) {
          errorCount++;
          errorsList.push({
            rowNumber: item.rowNumber,
            name: item.incomingData.name,
            message: `Insert failed: ${singleErr?.message || "Unknown error"}`,
          });
        } else {
          await supabase.from("academic_history").insert({
            student_id: singleRec.id,
            year: singleRec.admission_year,
            class: singleRec.present_class,
            section: singleRec.present_section,
            roll: singleRec.present_roll,
            status: singleRec.current_status,
          });

          createAuditEntries.push({
            performed_by: userId,
            action: "CREATE",
            table_name: "students",
            record_id: singleRec.id,
            new_values: singleRec,
            metadata: {
              batch_id: batchId,
              source: "BULK_UPLOAD",
              is_new_admission: true,
            },
          });

          createdList.push({
            name: singleRec.name,
            schoolId: singleRec.school_id,
          });
        }
      }
    } else {
      // Batch insert academic history
      const historyPayloads = newRecords.map((r) => ({
        student_id: r.id,
        year: r.admission_year,
        class: r.present_class,
        section: r.present_section,
        roll: r.present_roll,
        status: r.current_status,
      }));

      const { error: histError } = await supabase.from("academic_history").insert(historyPayloads);
      if (histError) {
        console.warn("Batch academic history insert warning:", histError);
      }

      for (const newRecord of newRecords) {
        createAuditEntries.push({
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
    }
  }

  // Batch insert all create audit log entries in chunks of 100
  for (let i = 0; i < createAuditEntries.length; i += 100) {
    const auditChunk = createAuditEntries.slice(i, i + 100);
    const { error: auditErr } = await supabase.from("audit_log").insert(auditChunk);
    if (auditErr) {
      console.warn("Create audit log batch insert warning:", auditErr);
    }
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

  let skippedCount = 0;
  let errorCount = 0;
  let warningCount = 0;

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
  await supabase.from("audit_log").insert({
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
