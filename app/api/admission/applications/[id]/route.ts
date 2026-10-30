import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { pgQuote } from "@/lib/supabase/filters";
import { requireStaff } from "@/lib/api/guard";
import { recordUndo, snapshotRows } from "@/lib/undo/journal";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: row, error } = await supabase
      .from("admission_applications")
      .select("*")
      .or(`id.eq.${pgQuote(id)},application_no.eq.${pgQuote(id)}`)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({
      application: {
        id: row.id,
        applicationNo: row.application_no,
        academicYear: row.academic_year,
        admissionType: row.admission_type,
        formMethod: row.form_method,
        targetClass: row.target_class,
        targetSection: row.target_section,
        targetRoll: row.target_roll ? Number(row.target_roll) : undefined,
        status: row.status,
        studentName: row.student_name,
        photoUrl: row.photo_url,
        gender: row.gender,
        dob: row.date_of_birth,
        fatherName: row.father_name,
        motherName: row.mother_name,
        guardianName: row.guardian_name,
        studentContact: row.student_contact,
        altMobile: row.alt_mobile,
        email: row.email,
        address: row.address,
        village: row.village,
        postOffice: row.post_office,
        policeStation: row.police_station,
        district: row.district,
        pincode: row.pincode,
        religion: row.religion,
        socialCategory: row.social_category,
        casteCertificateNo: row.caste_certificate_no,
        aadhaar: row.aadhaar,
        bloodGroup: row.blood_group,
        previousSchool: row.previous_school,
        previousClass: row.previous_class,
        previousRoll: row.previous_roll,
        previousMarks: row.previous_marks,
        feePaid: !!row.fee_paid,
        feeAmount: Number(row.fee_amount || 0),
        paymentReceiptNo: row.payment_receipt_no,
        paymentMode: row.payment_mode,
        admittedStudentId: row.admitted_student_id,
        admittedClass: row.admitted_class,
        admittedSection: row.admitted_section,
        admittedRoll: row.admitted_roll ? Number(row.admitted_roll) : undefined,
        admittedAt: row.admitted_at,
        admittedBy: row.admitted_by,
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
        remarks: row.remarks,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStaff("can_view_admission_applications", "can_handle_new_admission");
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const supabase = createAdminClient();

    const before = await snapshotRows(supabase, "admission_applications", "id", id);
    const { error } = await supabase
      .from("admission_applications")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const undoId = gate.auth.user?.id
      ? await recordUndo({
          actorId: gate.auth.user.id,
          action: "admission.application.delete",
          label: `Delete application ${before[0]?.application_no ?? ""}`.trim(),
          entity: "admission_applications",
          entityId: id,
          steps: [{ table: "admission_applications", op: "upsert", rows: before }],
          ttlHours: 72,
        })
      : null;

    return NextResponse.json({ success: true, message: "Application deleted successfully", undoId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
