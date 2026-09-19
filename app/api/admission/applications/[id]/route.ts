import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

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
      .or(`id.eq.${id},application_no.eq.${id}`)
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

export async function PATCH(
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
    const body = await req.json();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.studentName !== undefined) updateData.student_name = body.studentName;
    if (body.photoUrl !== undefined) updateData.photo_url = body.photoUrl;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.dob !== undefined) updateData.date_of_birth = body.dob;
    if (body.fatherName !== undefined) updateData.father_name = body.fatherName;
    if (body.motherName !== undefined) updateData.mother_name = body.motherName;
    if (body.guardianName !== undefined) updateData.guardian_name = body.guardianName;
    if (body.studentContact !== undefined) updateData.student_contact = body.studentContact;
    if (body.altMobile !== undefined) updateData.alt_mobile = body.altMobile;
    if (body.email !== undefined) updateData.email = body.email;

    if (body.address !== undefined) updateData.address = body.address;
    if (body.village !== undefined) updateData.village = body.village;
    if (body.postOffice !== undefined) updateData.post_office = body.postOffice;
    if (body.policeStation !== undefined) updateData.police_station = body.policeStation;
    if (body.district !== undefined) updateData.district = body.district;
    if (body.pincode !== undefined) updateData.pincode = body.pincode;

    if (body.religion !== undefined) updateData.religion = body.religion;
    if (body.socialCategory !== undefined) updateData.social_category = body.socialCategory;
    if (body.casteCertificateNo !== undefined) updateData.caste_certificate_no = body.casteCertificateNo;
    if (body.aadhaar !== undefined) updateData.aadhaar = body.aadhaar;
    if (body.bloodGroup !== undefined) updateData.blood_group = body.bloodGroup;

    if (body.previousSchool !== undefined) updateData.previous_school = body.previousSchool;
    if (body.previousClass !== undefined) updateData.previous_class = body.previousClass;
    if (body.previousRoll !== undefined) updateData.previous_roll = body.previousRoll;
    if (body.previousMarks !== undefined) updateData.previous_marks = body.previousMarks;

    if (body.status !== undefined) updateData.status = body.status;
    if (body.targetClass !== undefined) updateData.target_class = body.targetClass;
    if (body.targetSection !== undefined) updateData.target_section = body.targetSection;
    if (body.targetRoll !== undefined) updateData.target_roll = body.targetRoll;
    if (body.stream !== undefined) updateData.stream = body.stream;
    if (body.schoolId !== undefined) updateData.school_id = body.schoolId;

    if (body.bankAccountNo !== undefined) updateData.bank_account_no = body.bankAccountNo;
    if (body.bankIfsc !== undefined) updateData.bank_ifsc = body.bankIfsc;
    if (body.bankName !== undefined) updateData.bank_name = body.bankName;
    if (body.kanyashreeId !== undefined) updateData.kanyashree_id = body.kanyashreeId;
    if (body.verifiedDocuments !== undefined) updateData.verified_documents = body.verifiedDocuments;
    if (body.subjectCombinations !== undefined) updateData.subject_combinations = body.subjectCombinations;

    if (body.feePaid !== undefined) updateData.fee_paid = body.feePaid;
    if (body.feeAmount !== undefined) updateData.fee_amount = body.feeAmount;
    if (body.paymentReceiptNo !== undefined) updateData.payment_receipt_no = body.paymentReceiptNo;
    if (body.paymentMode !== undefined) updateData.payment_mode = body.paymentMode;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;

    const { data, error } = await supabase
      .from("admission_applications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, application: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from("admission_applications")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Application deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
