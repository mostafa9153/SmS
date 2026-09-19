import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(
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

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.studentName !== undefined) updatePayload.student_name = body.studentName?.trim();
    if (body.photoUrl !== undefined) updatePayload.photo_url = body.photoUrl;
    if (body.gender !== undefined) updatePayload.gender = body.gender;
    if (body.dob !== undefined) updatePayload.date_of_birth = body.dob;
    if (body.fatherName !== undefined) updatePayload.father_name = body.fatherName?.trim();
    if (body.motherName !== undefined) updatePayload.mother_name = body.motherName?.trim();
    if (body.guardianName !== undefined) updatePayload.guardian_name = body.guardianName?.trim();
    if (body.studentContact !== undefined) updatePayload.student_contact = body.studentContact?.trim();
    if (body.altMobile !== undefined) updatePayload.alt_mobile = body.altMobile?.trim();
    if (body.email !== undefined) updatePayload.email = body.email?.trim();

    if (body.address !== undefined) updatePayload.address = body.address?.trim();
    if (body.village !== undefined) updatePayload.village = body.village?.trim();
    if (body.postOffice !== undefined) updatePayload.post_office = body.postOffice?.trim();
    if (body.policeStation !== undefined) updatePayload.police_station = body.policeStation?.trim();
    if (body.district !== undefined) updatePayload.district = body.district?.trim();
    if (body.pincode !== undefined) updatePayload.pincode = body.pincode?.trim();

    if (body.religion !== undefined) updatePayload.religion = body.religion;
    if (body.socialCategory !== undefined) updatePayload.social_category = body.socialCategory;
    if (body.casteCertificateNo !== undefined) updatePayload.caste_certificate_no = body.casteCertificateNo?.trim();
    if (body.aadhaar !== undefined) updatePayload.aadhaar = body.aadhaar?.trim();
    if (body.bloodGroup !== undefined) updatePayload.blood_group = body.bloodGroup;

    if (body.previousSchool !== undefined) updatePayload.previous_school = body.previousSchool?.trim();
    if (body.previousClass !== undefined) updatePayload.previous_class = body.previousClass;
    if (body.previousRoll !== undefined) updatePayload.previous_roll = body.previousRoll;
    if (body.previousMarks !== undefined) updatePayload.previous_marks = body.previousMarks;

    if (body.targetClass !== undefined) updatePayload.target_class = body.targetClass;
    if (body.targetSection !== undefined) updatePayload.target_section = body.targetSection;
    if (body.targetRoll !== undefined) updatePayload.target_roll = body.targetRoll ? parseInt(body.targetRoll) : null;
    if (body.stream !== undefined) updatePayload.stream = body.stream;

    if (body.bankAccountNo !== undefined) updatePayload.bank_account_no = body.bankAccountNo?.trim();
    if (body.bankIfsc !== undefined) updatePayload.bank_ifsc = body.bankIfsc?.trim();
    if (body.bankName !== undefined) updatePayload.bank_name = body.bankName?.trim();
    if (body.kanyashreeId !== undefined) updatePayload.kanyashree_id = body.kanyashreeId?.trim();
    if (body.verifiedDocuments !== undefined) updatePayload.verified_documents = body.verifiedDocuments;
    if (body.subjectCombinations !== undefined) updatePayload.subject_combinations = body.subjectCombinations;

    if (body.feePaid !== undefined) updatePayload.fee_paid = !!body.feePaid;
    if (body.feeAmount !== undefined) updatePayload.fee_amount = parseFloat(body.feeAmount);
    if (body.paymentReceiptNo !== undefined) updatePayload.payment_receipt_no = body.paymentReceiptNo?.trim();
    if (body.paymentMode !== undefined) updatePayload.payment_mode = body.paymentMode;
    if (body.remarks !== undefined) updatePayload.remarks = body.remarks;

    const { data, error } = await supabase
      .from("admission_applications")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error editing application:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Application updated successfully",
      application: data,
    });
  } catch (err: any) {
    console.error("Error in edit application route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
