import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any -- request bodies are loosely typed form payloads */

export interface ApplicationOverrides {
  /** Force values the caller must not take from the request (e.g. public submissions). */
  force?: Record<string, any>;
}

/**
 * Builds and inserts an admission_applications row from a form payload.
 * Shared by the staff route and the public admission link.
 */
export async function createAdmissionApplication(
  supabase: SupabaseClient,
  body: any,
  academicYear: string,
  targetClass: string,
  { force = {} }: ApplicationOverrides = {},
): Promise<{ insertedData: any; insertError: any; extraProfileData: Record<string, any> }> {
  // Generate atomic application no: AP/{YEAR}/{CLASS}/{NUM}
  const { data: counterValue, error: counterError } = await supabase.rpc("next_admission_counter", {
    p_type: "application_no",
    p_year: academicYear,
  });

  let applicationNo = body.applicationNo;
  if (!applicationNo) {
    if (counterError || !counterValue) {
      console.error("Failed to generate application_no from counter:", counterError);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      applicationNo = `AP/${academicYear}/${targetClass}/${randomSuffix}`;
    } else {
      const numStr = String(counterValue).padStart(3, "0");
      applicationNo = `AP/${academicYear}/${targetClass}/${numStr}`;
    }
  }

  // Preserve all full student profile properties in extra metadata
  const extraProfileData = {
    studentNameBengali: body.studentNameBengali,
    fatherNameBengali: body.fatherNameBengali,
    motherNameBengali: body.motherNameBengali,
    fatherOccupation: body.fatherOccupation,
    motherOccupation: body.motherOccupation,
    relationshipWithGuardian: body.relationshipWithGuardian,
    guardianOccupation: body.guardianOccupation,
    guardianQualification: body.guardianQualification,
    annualFamilyIncome: body.annualFamilyIncome,

    presentVillage: body.presentVillage || body.village,
    presentPanchayat: body.presentPanchayat,
    presentBlock: body.presentBlock,
    presentPostOffice: body.presentPostOffice || body.postOffice,
    presentPoliceStation: body.presentPoliceStation || body.policeStation,
    presentDistrict: body.presentDistrict || body.district,
    presentPincode: body.presentPincode || body.pincode,

    sameAsPresentAddress: body.sameAsPresentAddress,
    permVillage: body.permVillage,
    permPanchayat: body.permPanchayat,
    permBlock: body.permBlock,
    permPostOffice: body.permPostOffice,
    permPoliceStation: body.permPoliceStation,
    permDistrict: body.permDistrict,
    permPincode: body.permPincode,

    motherTongue: body.motherTongue,
    indianNationality: body.indianNationality,
    heightCm: body.heightCm,
    weightKg: body.weightKg,
    birthRegistrationNo: body.birthRegistrationNo,
    identificationMark: body.identificationMark,
    minorityGroup: body.minorityGroup,
    isAay: body.isAay,
    isCwsn: body.isCwsn,
    impairmentType: body.impairmentType,
    hasDisabilityCertificate: body.hasDisabilityCertificate,
    disabilityCertificateNo: body.disabilityCertificateNo,
    disabilityPercentage: body.disabilityPercentage,
    sldType: body.sldType,

    mediumOfInstruction: body.mediumOfInstruction,
    academicStream: body.academicStream || body.stream,
    mandatorySubjects: body.mandatorySubjects,
    additionalSubjects: body.additionalSubjects,
    class10BoardRegNo: body.class10BoardRegNo,
    class10BoardRollNo: body.class10BoardRollNo,
    bengaliMarks: body.bengaliMarks,
    englishMarks: body.englishMarks,
    mathMarks: body.mathMarks,
    lifeSciMarks: body.lifeSciMarks,
    phySciMarks: body.phySciMarks,
    historyMarks: body.historyMarks,
    geoMarks: body.geoMarks,

    previousStatus: body.previousStatus,
    previousSection: body.previousSection,
    previousRollNo: body.previousRollNo || body.previousRoll,
    previousResult: body.previousResult,
    previousMarksPercent: body.previousMarksPercent || body.previousMarks,
    previousDaysAttended: body.previousDaysAttended,

    distanceToSchool: body.distanceToSchool,
    competitionsOlympiads: body.competitionsOlympiads,
    bplStatus: body.bplStatus,
    bplNo: body.bplNo,

    bankBranch: body.bankBranch,
    pen: body.pen,
    healthId: body.healthId,
    studentUniqueCode: body.studentUniqueCode,
    hasAadhaar: body.hasAadhaar,
    nameAsPerAadhaar: body.nameAsPerAadhaar,
    ...(body.aiExtractedData || {}),
  };

  const corePayload: Record<string, any> = {
    application_no: applicationNo,
    academic_year: academicYear,
    admission_type: body.admissionType || "new",
    form_method: body.formMethod || "online",
    target_class: targetClass,
    target_section: body.targetSection || body.presentSection || "A",
    target_roll: body.targetRoll || body.presentRoll ? parseInt(body.targetRoll || body.presentRoll, 10) || null : null,
    status: "pending",

    student_name: body.studentName?.trim() || "Applicant",
    photo_url: body.photoUrl || null,
    gender: body.gender || "Male",
    date_of_birth: parseToPostgresDate(body.dob || body.dateOfBirth),
    father_name: body.fatherName || null,
    mother_name: body.motherName || null,
    guardian_name: body.guardianName || body.fatherName || null,
    student_contact: body.studentContact || null,
    alt_mobile: body.altMobile || null,
    email: body.email || null,

    address: body.address || (body.presentVillage ? `${body.presentVillage}, ${body.presentPostOffice || ""}, ${body.presentDistrict || ""}` : null),
    village: body.presentVillage || body.village || null,
    post_office: body.presentPostOffice || body.postOffice || null,
    police_station: body.presentPoliceStation || body.policeStation || null,
    district: body.presentDistrict || body.district || null,
    pincode: body.presentPincode || body.pincode || null,

    religion: body.religion || "Islam",
    social_category: body.socialCategory || "General",
    caste_certificate_no: body.casteCertificateNo || null,
    aadhaar: body.aadhaar || null,
    blood_group: body.bloodGroup || null,

    previous_school: body.previousSchool || null,
    previous_class: body.previousClass || null,
    previous_roll: body.previousRollNo || body.previousRoll ? String(body.previousRollNo || body.previousRoll) : null,
    previous_marks: body.previousMarksPercent || body.previousMarks ? String(body.previousMarksPercent || body.previousMarks) : null,

    fee_paid: !!body.feePaid,
    fee_amount: body.feeAmount ? parseFloat(body.feeAmount) : 0,
    payment_receipt_no: body.paymentReceiptNo || null,
    payment_mode: body.paymentMode || "Cash",

    ai_extracted_data: extraProfileData,
    scanned_image_url: body.scannedImageUrl || null,
    remarks: body.remarks || null,
    ...force,
  };

  let insertedData: any = null;
  let insertError: any = null;

  // 1. Try full insert with optional extended columns
  const fullPayload = {
    ...corePayload,
    stream: body.academicStream || body.stream || null,
    bank_account_no: body.bankAccountNo || null,
    bank_ifsc: body.bankIfsc || null,
    bank_name: body.bankName || null,
    kanyashree_id: body.kanyashreeId || null,
    verified_documents: Array.isArray(body.verifiedDocuments) ? body.verifiedDocuments : [],
    subject_combinations: Array.isArray(body.subjectCombinations) ? body.subjectCombinations : [],
  };

  const res1 = await supabase
    .from("admission_applications")
    .insert([fullPayload])
    .select()
    .single();

  if (res1.error) {
    console.warn("Full payload insert failed, falling back to core payload:", res1.error.message);
    const res2 = await supabase
      .from("admission_applications")
      .insert([corePayload])
      .select()
      .single();

    insertedData = res2.data;
    insertError = res2.error;
  } else {
    insertedData = res1.data;
  }


  return { insertedData, insertError, extraProfileData };
}

function parseToPostgresDate(dobVal: any): string | null {
  if (!dobVal || typeof dobVal !== "string" || dobVal.trim() === "") return null;
  const s = dobVal.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY/MM/DD
  const yyyymmdd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  try {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  } catch (_) {}
  return null;
}
