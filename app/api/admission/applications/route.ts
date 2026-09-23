import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import type { AdmissionApplication } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const targetClass = searchParams.get("targetClass");
    const admissionType = searchParams.get("admissionType");
    const search = searchParams.get("search");

    const academicYearParam = searchParams.get("academicYear");
    const isTransferredParam = searchParams.get("isTransferredToActive");

    let query = supabase
      .from("admission_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (targetClass && targetClass !== "all") {
      query = query.eq("target_class", targetClass);
    }
    if (admissionType && admissionType !== "all") {
      query = query.eq("admission_type", admissionType);
    }
    if (academicYearParam && academicYearParam !== "all") {
      query = query.eq("academic_year", academicYearParam);
    }
    if (isTransferredParam !== null && isTransferredParam !== undefined && isTransferredParam !== "all") {
      query = query.eq("is_transferred_to_active", isTransferredParam === "true");
    }
    if (search) {
      query = query.or(
        `student_name.ilike.%${search}%,application_no.ilike.%${search}%,guardian_name.ilike.%${search}%,student_contact.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.warn("admission_applications fetch error:", error.message);
      return NextResponse.json({ applications: [] });
    }

    const applications: AdmissionApplication[] = (data || []).map((row) => {
      const extra = row.ai_extracted_data && typeof row.ai_extracted_data === "object" ? row.ai_extracted_data : {};
      return {
        id: row.id,
        applicationNo: row.application_no,
        academicYear: row.academic_year || "2026",
        admissionType: row.admission_type || "new",
        formMethod: row.form_method || "offline",
        targetClass: row.target_class,
        targetSection: row.target_section || "A",
        targetRoll: row.target_roll ? Number(row.target_roll) : undefined,
        status: row.status || "pending",

        studentName: row.student_name,
        photoUrl: row.photo_url || undefined,
        gender: row.gender || "Male",
        dob: row.date_of_birth || undefined,
        fatherName: row.father_name || undefined,
        motherName: row.mother_name || undefined,
        guardianName: row.guardian_name || undefined,
        studentContact: row.student_contact || undefined,
        altMobile: row.alt_mobile || undefined,
        email: row.email || undefined,

        address: row.address || undefined,
        village: row.village || undefined,
        postOffice: row.post_office || undefined,
        policeStation: row.police_station || undefined,
        district: row.district || undefined,
        pincode: row.pincode || undefined,

        religion: row.religion || undefined,
        socialCategory: row.social_category || undefined,
        casteCertificateNo: row.caste_certificate_no || undefined,
        aadhaar: row.aadhaar || undefined,
        bloodGroup: row.blood_group || undefined,

        previousSchool: row.previous_school || undefined,
        previousClass: row.previous_class || undefined,
        previousRoll: row.previous_roll || undefined,
        previousMarks: row.previous_marks || undefined,

        feePaid: !!row.fee_paid,
        feeAmount: Number(row.fee_amount || 0),
        paymentReceiptNo: row.payment_receipt_no || undefined,
        paymentMode: row.payment_mode || "Cash",

        admittedStudentId: row.admitted_student_id || undefined,
        admittedClass: row.admitted_class || undefined,
        admittedSection: row.admitted_section || undefined,
        admittedRoll: row.admitted_roll ? Number(row.admitted_roll) : undefined,
        admittedAt: row.admitted_at || undefined,
        admittedBy: row.admitted_by || undefined,
        stream: row.stream || undefined,
        schoolId: row.school_id || undefined,
        isTransferredToActive: !!row.is_transferred_to_active,
        transferredToActiveAt: row.transferred_to_active_at || undefined,
        admissionDate: row.admission_date || undefined,

        bankAccountNo: row.bank_account_no || undefined,
        bankIfsc: row.bank_ifsc || undefined,
        bankName: row.bank_name || undefined,
        kanyashreeId: row.kanyashree_id || undefined,
        verifiedDocuments: Array.isArray(row.verified_documents) ? row.verified_documents : [],
        subjectCombinations: Array.isArray(row.subject_combinations) ? row.subject_combinations : [],

        aiExtractedData: row.ai_extracted_data || undefined,
        scannedImageUrl: row.scanned_image_url || undefined,
        remarks: row.remarks || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,

        // Unpack all extra profile fields
        ...extra,
      };
    });

    return NextResponse.json({ applications });
  } catch (err: any) {
    console.error("Error in GET /api/admission/applications:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
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

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const currentYearStr = String(new Date().getFullYear());
    const academicYear = body.academicYear || currentYearStr;
    const targetClass = body.targetClass || body.presentClass || "V";

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

    if (insertError || !insertedData) {
      console.error("Error inserting admission application:", insertError);
      return NextResponse.json({ error: insertError?.message || "Failed to save application record in database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      application: {
        id: insertedData.id,
        applicationNo: insertedData.application_no,
        studentName: insertedData.student_name,
        targetClass: insertedData.target_class,
        status: insertedData.status,
        ...extraProfileData,
        ...insertedData,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admission/applications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
