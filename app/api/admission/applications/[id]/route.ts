import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;
    const supabase = createAdminClient();
    const body = await req.json();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.targetClass !== undefined) updateData.target_class = body.targetClass;
    if (body.targetSection !== undefined) updateData.target_section = body.targetSection;
    if (body.targetRoll !== undefined) updateData.target_roll = body.targetRoll;
    if (body.feePaid !== undefined) updateData.fee_paid = body.feePaid;
    if (body.feeAmount !== undefined) updateData.fee_amount = body.feeAmount;
    if (body.paymentReceiptNo !== undefined) updateData.payment_receipt_no = body.paymentReceiptNo;
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
