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
    if (search) {
      query = query.or(
        `student_name.ilike.%${search}%,application_no.ilike.%${search}%,guardian_name.ilike.%${search}%,student_contact.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist yet, return empty list gracefully
      console.warn("admission_applications fetch error:", error.message);
      return NextResponse.json({ applications: [] });
    }

    const applications: AdmissionApplication[] = (data || []).map((row) => ({
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

      aiExtractedData: row.ai_extracted_data || undefined,
      scannedImageUrl: row.scanned_image_url || undefined,
      remarks: row.remarks || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ applications });
  } catch (err: any) {
    console.error("Error in GET /api/admission/applications:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await req.json();

    const academicYear = body.academicYear || "2026";
    const yearShort = academicYear.slice(-2);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const applicationNo = body.applicationNo || `ADM-${yearShort}-${randomSuffix}`;

    const insertPayload = {
      application_no: applicationNo,
      academic_year: academicYear,
      admission_type: body.admissionType || "new",
      form_method: body.formMethod || "offline",
      target_class: body.targetClass || "V",
      target_section: body.targetSection || "A",
      target_roll: body.targetRoll ? parseInt(body.targetRoll) : null,
      status: "pending",

      student_name: body.studentName?.trim() || "Applicant",
      photo_url: body.photoUrl || null,
      gender: body.gender || "Male",
      date_of_birth: body.dob || null,
      father_name: body.fatherName || null,
      mother_name: body.motherName || null,
      guardian_name: body.guardianName || body.fatherName || null,
      student_contact: body.studentContact || null,
      alt_mobile: body.altMobile || null,
      email: body.email || null,

      address: body.address || null,
      village: body.village || null,
      post_office: body.postOffice || null,
      police_station: body.policeStation || null,
      district: body.district || null,
      pincode: body.pincode || null,

      religion: body.religion || "Islam",
      social_category: body.socialCategory || "General",
      caste_certificate_no: body.casteCertificateNo || null,
      aadhaar: body.aadhaar || null,
      blood_group: body.bloodGroup || null,

      previous_school: body.previousSchool || null,
      previous_class: body.previousClass || null,
      previous_roll: body.previousRoll || null,
      previous_marks: body.previousMarks || null,

      fee_paid: !!body.feePaid,
      fee_amount: body.feeAmount ? parseFloat(body.feeAmount) : 0,
      payment_receipt_no: body.paymentReceiptNo || null,
      payment_mode: body.paymentMode || "Cash",

      ai_extracted_data: body.aiExtractedData || null,
      scanned_image_url: body.scannedImageUrl || null,
      remarks: body.remarks || null,
    };

    const { data, error } = await supabase
      .from("admission_applications")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("Error inserting admission application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      application: {
        id: data.id,
        applicationNo: data.application_no,
        studentName: data.student_name,
        targetClass: data.target_class,
        status: data.status,
        ...data,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admission/applications error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
