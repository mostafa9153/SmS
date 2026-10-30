import { createAdminClient } from "@/lib/supabase/admin";
import type { Student } from "@/lib/types";
import { applyStudentEntryDefaults } from "@/lib/utils/student-entry-presets";
import { generateSchoolId } from "@/lib/supabase/school-id-generator";
import { mustWrite } from "@/lib/supabase/write";
import { DBStudent, mapDBStudentToStudent, mapStudentToDBInput, toNullableDate, toNullableNumber, toNullableString } from "@/lib/supabase/students/mappers";

// CREATE student
export async function dbCreateStudent(input: Omit<Student, "id" | "academicHistory">): Promise<Student> {
  const supabase = createAdminClient();
  const defaultedInput = applyStudentEntryDefaults(input);
  const dbInput = mapStudentToDBInput(defaultedInput);

  // If school_id is missing, generate it
  if (!dbInput.school_id || dbInput.school_id.trim() === "") {
    dbInput.school_id = await generateSchoolId(
      input.admissionYear || new Date().getFullYear(),
      input.presentClass || "V",
      input.presentSection || "A",
      input.presentRoll,
      input.admissionNo || "01"
    );
  }

  // Attempt insert with auto-retry up to 3 times on concurrent conflict
  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("students")
      .insert(dbInput)
      .select()
      .single();

    if (!error && data) {
      return mapDBStudentToStudent(data as DBStudent);
    }

    lastError = error;
    // If schema cache indicates optional columns are not yet in remote DB, strip and retry
    if (error && (
      error.message.includes("father_occupation") ||
      error.message.includes("mother_occupation") ||
      error.message.includes("guardian_occupation") ||
      error.message.includes("board_registration_no") ||
      error.message.includes("board_roll_no") ||
      error.message.includes("kanyashree_id") ||
      error.message.includes("caste_certificate_no")
    )) {
      delete (dbInput as any).father_occupation;
      delete (dbInput as any).mother_occupation;
      delete (dbInput as any).guardian_occupation;
      delete (dbInput as any).board_registration_no;
      delete (dbInput as any).board_roll_no;
      delete (dbInput as any).kanyashree_id;
      delete (dbInput as any).caste_certificate_no;
      continue;
    }
    // If unique constraint violation on school_id (code 23505), regenerate and retry
    if (error && (error.code === "23505" || error.message.includes("school_id"))) {
      const fallbackReg = input.admissionNo ? `${input.admissionNo}-${attempt + 1}` : `${attempt + 2}`;
      dbInput.school_id = await generateSchoolId(
        input.admissionYear || new Date().getFullYear(),
        input.presentClass || "V",
        input.presentSection || "A",
        input.presentRoll,
        fallbackReg
      );
      continue;
    }
    break;
  }

  throw new Error(lastError?.message || "Failed to create student");
}

// UPDATE student
export async function dbUpdateStudent(
  id: string,
  updates: Partial<Omit<Student, "id">>
): Promise<Student | null> {
  const supabase = createAdminClient();
  
  // Map frontend update fields to database fields
  const dbUpdates: any = {};
  dbUpdates.updated_at = new Date().toISOString();
  if (updates.schoolId !== undefined && typeof updates.schoolId === "string" && updates.schoolId.trim() !== "") {
    dbUpdates.school_id = updates.schoolId.trim();
  }
  if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = toNullableString(updates.photoUrl);
  if (updates.pen !== undefined) dbUpdates.pen = toNullableString(updates.pen);
  if (updates.aadhaar !== undefined) dbUpdates.aadhaar = toNullableString(updates.aadhaar);
  if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.socialCategory !== undefined) dbUpdates.social_category = toNullableString(updates.socialCategory);
  if (updates.casteCertificateNo !== undefined) dbUpdates.caste_certificate_no = toNullableString(updates.casteCertificateNo);
  if (updates.religion !== undefined) dbUpdates.religion = toNullableString(updates.religion);
  if (updates.fatherName !== undefined) dbUpdates.father_name = updates.fatherName;
  if (updates.fatherOccupation !== undefined) dbUpdates.father_occupation = toNullableString(updates.fatherOccupation);
  if (updates.motherName !== undefined) dbUpdates.mother_name = updates.motherName;
  if (updates.motherOccupation !== undefined) dbUpdates.mother_occupation = toNullableString(updates.motherOccupation);
  if (updates.studentContact !== undefined) dbUpdates.mobile = toNullableString(updates.studentContact);
  if (updates.address !== undefined) dbUpdates.address = toNullableString(updates.address);
  if (updates.presentClass !== undefined) dbUpdates.present_class = updates.presentClass;
  if (updates.presentSection !== undefined) dbUpdates.present_section = updates.presentSection;
  if (updates.presentRoll !== undefined) dbUpdates.present_roll = Number(updates.presentRoll);
  if (updates.currentStatus !== undefined) dbUpdates.current_status = updates.currentStatus;
  if (updates.admissionYear !== undefined) dbUpdates.admission_year = updates.admissionYear ? Number(updates.admissionYear) : null;
  if (updates.admissionDate !== undefined) dbUpdates.admission_date = toNullableDate(updates.admissionDate);
  if (updates.previousSchool !== undefined) dbUpdates.previous_school = toNullableString(updates.previousSchool);

  // --- NEW FIELDS ---
  if (updates.studentNameBengali !== undefined) dbUpdates.student_name_bengali = toNullableString(updates.studentNameBengali);
  if (updates.fatherNameBengali !== undefined) dbUpdates.father_name_bengali = toNullableString(updates.fatherNameBengali);
  if (updates.motherNameBengali !== undefined) dbUpdates.mother_name_bengali = toNullableString(updates.motherNameBengali);
  if (updates.guardianName !== undefined) dbUpdates.guardian_name = toNullableString(updates.guardianName);
  if (updates.nameAsPerAadhaar !== undefined) dbUpdates.name_as_per_aadhaar = toNullableString(updates.nameAsPerAadhaar);
  if (updates.pincode !== undefined) dbUpdates.pincode = toNullableString(updates.pincode);
  if (updates.gramPanchayat !== undefined) dbUpdates.gram_panchayat = toNullableString(updates.gramPanchayat);
  if (updates.block !== undefined) dbUpdates.block = toNullableString(updates.block);
  if (updates.altMobile !== undefined) dbUpdates.alt_mobile = toNullableString(updates.altMobile);
  if (updates.email !== undefined) dbUpdates.email = toNullableString(updates.email);
  if (updates.motherTongue !== undefined) dbUpdates.mother_tongue = toNullableString(updates.motherTongue);
  if (updates.minorityGroup !== undefined) dbUpdates.minority_group = toNullableString(updates.minorityGroup);
  if (updates.isAay !== undefined) dbUpdates.is_aay = !!updates.isAay;
  if (updates.isEws !== undefined) dbUpdates.is_ews = !!updates.isEws;
  if (updates.bplStatus !== undefined) dbUpdates.bpl_status = toNullableString(updates.bplStatus);
  if (updates.bplNo !== undefined) dbUpdates.bpl_no = toNullableString(updates.bplNo);
  if (updates.isCwsn !== undefined) dbUpdates.is_cwsn = !!updates.isCwsn;
  if (updates.impairmentType !== undefined) dbUpdates.impairment_type = toNullableString(updates.impairmentType);
  if (updates.hasDisabilityCertificate !== undefined) dbUpdates.has_disability_certificate = !!updates.hasDisabilityCertificate;
  if (updates.disabilityCertificateNo !== undefined) dbUpdates.disability_certificate_no = toNullableString(updates.disabilityCertificateNo);
  if (updates.disabilityPercentage !== undefined) dbUpdates.disability_percentage = toNullableNumber(updates.disabilityPercentage);
  if (updates.sldType !== undefined) dbUpdates.sld_type = toNullableString(updates.sldType);
  if (updates.indianNationality !== undefined) dbUpdates.indian_nationality = updates.indianNationality !== false;
  if (updates.isOutOfSchool !== undefined) dbUpdates.is_out_of_school = !!updates.isOutOfSchool;
  if (updates.mainstreamedDate !== undefined) dbUpdates.mainstreamed_date = toNullableDate(updates.mainstreamedDate);
  if (updates.bloodGroup !== undefined) dbUpdates.blood_group = toNullableString(updates.bloodGroup);
  if (updates.weightKg !== undefined) dbUpdates.weight_kg = toNullableNumber(updates.weightKg);
  if (updates.heightCm !== undefined) dbUpdates.height_cm = toNullableNumber(updates.heightCm);
  if (updates.studentUniqueCode !== undefined) dbUpdates.student_unique_code = toNullableString(updates.studentUniqueCode);
  if (updates.kanyashreeId !== undefined) dbUpdates.kanyashree_id = toNullableString(updates.kanyashreeId);
  if (updates.diseCode !== undefined) dbUpdates.dise_code = toNullableString(updates.diseCode);
  if (updates.healthId !== undefined) dbUpdates.health_id = toNullableString(updates.healthId);
  if (updates.annualFamilyIncome !== undefined) dbUpdates.annual_family_income = toNullableNumber(updates.annualFamilyIncome);
  if (updates.birthRegistrationNo !== undefined) dbUpdates.birth_registration_no = toNullableString(updates.birthRegistrationNo);
  if (updates.identificationMark !== undefined) dbUpdates.identification_mark = toNullableString(updates.identificationMark);
  if (updates.relationshipWithGuardian !== undefined) dbUpdates.relationship_with_guardian = toNullableString(updates.relationshipWithGuardian);
  if (updates.guardianOccupation !== undefined) dbUpdates.guardian_occupation = toNullableString(updates.guardianOccupation);
  if (updates.guardianQualification !== undefined) dbUpdates.guardian_qualification = toNullableString(updates.guardianQualification);
  if (updates.bankName !== undefined) dbUpdates.bank_name = toNullableString(updates.bankName);
  if (updates.bankBranch !== undefined) dbUpdates.bank_branch = toNullableString(updates.bankBranch);
  if (updates.bankIfsc !== undefined) dbUpdates.bank_ifsc = toNullableString(updates.bankIfsc);
  if (updates.bankAccountNo !== undefined) dbUpdates.bank_account_no = toNullableString(updates.bankAccountNo);

  if (updates.admissionNo !== undefined) dbUpdates.admission_no = toNullableString(updates.admissionNo);
  if (updates.admissionType !== undefined) dbUpdates.admission_type = toNullableString(updates.admissionType);
  if (updates.academicYear !== undefined) dbUpdates.academic_year = toNullableString(updates.academicYear);
  if (updates.presentSemester !== undefined) dbUpdates.present_semester = toNullableString(updates.presentSemester);
  if (updates.detentionCount !== undefined) dbUpdates.detention_count = toNullableNumber(updates.detentionCount);
  if (updates.tcIssued !== undefined) dbUpdates.tc_issued = !!updates.tcIssued;
  if (updates.tcDate !== undefined) dbUpdates.tc_date = toNullableDate(updates.tcDate);
  if (updates.tcReason !== undefined) dbUpdates.tc_reason = toNullableString(updates.tcReason);
  if (updates.mediumOfInstruction !== undefined) dbUpdates.medium_of_instruction = toNullableString(updates.mediumOfInstruction);
  if (updates.presentClassAdmissionDate !== undefined) dbUpdates.present_class_admission_date = toNullableDate(updates.presentClassAdmissionDate);
  if (updates.boardRegistrationNo !== undefined || (updates as any).wbbseRegNo !== undefined || (updates as any).wbchseRegNo !== undefined) {
    dbUpdates.board_registration_no = toNullableString(updates.boardRegistrationNo ?? (updates as any).wbbseRegNo ?? (updates as any).wbchseRegNo);
  }
  if (updates.boardRollNo !== undefined || (updates as any).wbbseRollNo !== undefined || (updates as any).wbchseRollNo !== undefined) {
    dbUpdates.board_roll_no = toNullableString(updates.boardRollNo ?? (updates as any).wbbseRollNo ?? (updates as any).wbchseRollNo);
  }
  if (updates.bengaliMarks !== undefined) dbUpdates.bengali_marks = toNullableNumber(updates.bengaliMarks);
  if (updates.englishMarks !== undefined) dbUpdates.english_marks = toNullableNumber(updates.englishMarks);
  if (updates.mathMarks !== undefined) dbUpdates.math_marks = toNullableNumber(updates.mathMarks);
  if (updates.lifeSciMarks !== undefined) dbUpdates.life_sci_marks = toNullableNumber(updates.lifeSciMarks);
  if (updates.phySciMarks !== undefined) dbUpdates.phy_sci_marks = toNullableNumber(updates.phySciMarks);
  if (updates.historyMarks !== undefined) dbUpdates.history_marks = toNullableNumber(updates.historyMarks);
  if (updates.geoMarks !== undefined) dbUpdates.geo_marks = toNullableNumber(updates.geoMarks);
  if (updates.totalMadhyamikMarks !== undefined) dbUpdates.total_madhyamik_marks = toNullableNumber(updates.totalMadhyamikMarks);
  if (updates.percentageMadhyamik !== undefined) dbUpdates.percentage_madhyamik = toNullableNumber(updates.percentageMadhyamik);
  if (updates.languageGroup !== undefined) dbUpdates.language_group = updates.languageGroup || [];
  if (updates.foreignLanguage !== undefined) dbUpdates.foreign_language = toNullableString(updates.foreignLanguage);
  if (updates.mandatorySubjects !== undefined) dbUpdates.mandatory_subjects = updates.mandatorySubjects || [];
  if (updates.additionalSubjects !== undefined) dbUpdates.additional_subjects = updates.additionalSubjects || [];
  if (updates.coCurricularSubjects !== undefined) dbUpdates.co_curricular_subjects = updates.coCurricularSubjects || [];
  if (updates.academicStream !== undefined) dbUpdates.academic_stream = toNullableString(updates.academicStream);
  if (updates.previousStatus !== undefined) dbUpdates.previous_status = toNullableString(updates.previousStatus);
  if (updates.previousClass !== undefined) dbUpdates.previous_class = toNullableString(updates.previousClass);
  if (updates.previousSection !== undefined) dbUpdates.previous_section = toNullableString(updates.previousSection);
  if (updates.previousStream !== undefined) dbUpdates.previous_stream = toNullableString(updates.previousStream);
  if (updates.previousRollNo !== undefined) dbUpdates.previous_roll_no = toNullableNumber(updates.previousRollNo);
  if (updates.previousAppearedForExams !== undefined) dbUpdates.previous_appeared_for_exams = !!updates.previousAppearedForExams;
  if (updates.previousResult !== undefined) dbUpdates.previous_result = toNullableString(updates.previousResult);
  if (updates.previousMarksPercent !== undefined) dbUpdates.previous_marks_percent = toNullableNumber(updates.previousMarksPercent);
  if (updates.previousDaysAttended !== undefined) dbUpdates.previous_days_attended = toNullableNumber(updates.previousDaysAttended);
  if (updates.rteSection12C !== undefined) dbUpdates.rte_section_12c = !!updates.rteSection12C;
  if (updates.rteAmountClaimed !== undefined) dbUpdates.rte_amount_claimed = toNullableNumber(updates.rteAmountClaimed);

  if (updates.facilitiesProvided !== undefined) dbUpdates.facilities_provided = updates.facilitiesProvided || [];
  if (updates.cwsnFacilities !== undefined) dbUpdates.cwsn_facilities = updates.cwsnFacilities || [];
  if (updates.competitionsOlympiads !== undefined) dbUpdates.competitions_olympiads = updates.competitionsOlympiads || [];
  if (updates.ncc !== undefined) dbUpdates.ncc = !!updates.ncc;
  if (updates.nss !== undefined) dbUpdates.nss = !!updates.nss;
  if (updates.scoutsGuides !== undefined) dbUpdates.scouts_guides = !!updates.scoutsGuides;
  if (updates.distanceToSchool !== undefined) dbUpdates.distance_to_school = toNullableNumber(updates.distanceToSchool);
  if (updates.highestEducationParents !== undefined) dbUpdates.highest_education_parents = toNullableString(updates.highestEducationParents);

  // Persist Academic History entries if supplied
  if (updates.academicHistory && Array.isArray(updates.academicHistory)) {
    for (const entry of updates.academicHistory) {
      const { data: existingHist } = await supabase
        .from("academic_history")
        .select("id")
        .eq("student_id", id)
        .eq("year", entry.year)
        .maybeSingle();

      if (existingHist) {
        await mustWrite(supabase
          .from("academic_history")
          .update({
            class: entry.class,
            section: entry.section,
            roll: entry.roll,
            status: entry.status,
            semester: toNullableString(entry.semester),
            detention_count: toNullableNumber(entry.detentionCount),
          })
          .eq("id", existingHist.id), "academic_history update");
      } else {
        await mustWrite(supabase.from("academic_history").insert({
          student_id: id,
          year: entry.year,
          class: entry.class,
          section: entry.section,
          roll: entry.roll,
          status: entry.status,
          semester: toNullableString(entry.semester),
          detention_count: toNullableNumber(entry.detentionCount),
        }), "academic_history insert");
      }
    }
  }

  let { data, error } = await supabase
    .from("students")
    .update(dbUpdates)
    .eq("id", id)
    .select("*, academic_history(*)")
    .maybeSingle();

  // Gracefully fallback if optional columns are not yet added to remote database
  if (error && (
    error.message.includes("father_occupation") ||
    error.message.includes("mother_occupation") ||
    error.message.includes("guardian_occupation") ||
    error.message.includes("board_registration_no") ||
    error.message.includes("board_roll_no") ||
    error.message.includes("kanyashree_id") ||
    error.message.includes("caste_certificate_no") ||
    error.message.includes("present_semester") ||
    error.message.includes("detention_count") ||
    error.message.includes("tc_issued") ||
    error.message.includes("tc_date") ||
    error.message.includes("tc_reason")
  )) {
    delete dbUpdates.father_occupation;
    delete dbUpdates.mother_occupation;
    delete dbUpdates.guardian_occupation;
    delete dbUpdates.board_registration_no;
    delete dbUpdates.board_roll_no;
    delete dbUpdates.kanyashree_id;
    delete dbUpdates.caste_certificate_no;
    delete dbUpdates.present_semester;
    delete dbUpdates.detention_count;
    delete dbUpdates.tc_issued;
    delete dbUpdates.tc_date;
    delete dbUpdates.tc_reason;
    const retry = await supabase
      .from("students")
      .update(dbUpdates)
      .eq("id", id)
      .select("*, academic_history(*)")
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("dbUpdateStudent database error:", error);
    throw new Error(error.message);
  }
  return data ? mapDBStudentToStudent(data as DBStudent) : null;
}

// DELETE student
export async function dbDeleteStudent(id: string): Promise<boolean> {
  const admin = createAdminClient();
  // Clean up any dependent child tables to prevent foreign key constraint violations
  await mustWrite(admin.from("academic_history").delete().eq("student_id", id), "academic_history delete");
  await mustWrite(admin.from("student_results").delete().eq("student_id", id), "student_results delete");
  const { error } = await admin.from("students").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
