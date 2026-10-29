import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { requireStaff } from "@/lib/api/guard";
import type { AdmissionApplication } from "@/lib/types";
import { pgContains } from "@/lib/supabase/filters";
import { notify } from "@/lib/notifications/notify";
import { createAdmissionApplication } from "@/lib/admission/application-row";
import { currentYearIST } from "@/lib/utils/academic-year";

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
        `student_name.ilike.${pgContains(search)},application_no.ilike.${pgContains(search)},guardian_name.ilike.${pgContains(search)},student_contact.ilike.${pgContains(search)}`
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
        academicYear: row.academic_year || String(currentYearIST()),
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

export async function POST(req: Request) {
  const gate = await requireStaff("can_handle_new_admission", "can_handle_new_admission_online", "can_handle_ai_scan_admission");
  if (!gate.ok) return gate.response;

  try {
    const supabase = createAdminClient();
    const body = await req.json();

    const currentYearStr = String(new Date().getFullYear());
    const academicYear = body.academicYear || currentYearStr;
    const targetClass = body.targetClass || body.presentClass || "V";

    const { insertedData, insertError, extraProfileData } = await createAdmissionApplication(supabase, body, academicYear, targetClass);

    if (insertError || !insertedData) {
      console.error("Error inserting admission application:", insertError);
      return NextResponse.json({ error: insertError?.message || "Failed to save application record in database" }, { status: 500 });
    }

    await notify({
      roles: ["Admin", "Staff"],
      title: "New admission application",
      message: `${insertedData.student_name} · Class ${insertedData.target_class} · ${insertedData.application_no}`,
      link: "/admission/applications",
      source: "admission.application",
      createdBy: gate.auth.user?.id ?? null,
    });

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
