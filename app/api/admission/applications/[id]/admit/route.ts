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
    const body = await req.json();
    const supabase = createAdminClient();

    // 1. Fetch application details
    const { data: app, error: appError } = await supabase
      .from("admission_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (app.status === "admitted" && !body.forceReAdmit) {
      return NextResponse.json(
        { error: "Student is already admitted in staging", applicationId: app.id },
        { status: 400 }
      );
    }

    const assignedSection = body.section || app.target_section || "A";
    const assignedRoll = body.roll ? parseInt(body.roll) : (app.target_roll || 1);
    const assignedClass = body.class || app.target_class || "V";
    const feeAmount = body.feeAmount !== undefined ? parseFloat(body.feeAmount) : (app.fee_amount || 0);
    const feePaid = body.feePaid !== undefined ? !!body.feePaid : true;
    const currentYear = new Date().getFullYear();
    const yearSuffix = String(currentYear).slice(-2);
    let paymentReceiptNo = (body.paymentReceiptNo || app.payment_receipt_no || "").trim();
    if (!paymentReceiptNo || paymentReceiptNo.startsWith("REC-")) {
      const { count } = await supabase
        .from("admission_applications")
        .select("*", { count: "exact", head: true })
        .eq("academic_year", String(currentYear));
      const nextNum = (count || 0) + 1;
      paymentReceiptNo = `MHS/AF/${yearSuffix}/${String(nextNum).padStart(4, "0")}`;
    }
    const assignedStream = body.stream || app.stream || null;
    const photoUrl = body.photoUrl || app.photo_url || null;

    // 2. Update admission_applications to "admitted" in STAGING
    const updatePayload: Record<string, any> = {
      status: "admitted",
      admitted_class: assignedClass,
      admitted_section: assignedSection,
      admitted_roll: assignedRoll,
      stream: assignedStream,
      photo_url: photoUrl,
      fee_paid: feePaid,
      fee_amount: feeAmount,
      payment_receipt_no: paymentReceiptNo,
      payment_mode: body.paymentMode || app.payment_mode || "Cash",
      admitted_at: new Date().toISOString(),
      admission_date: new Date().toISOString().split("T")[0],
      admitted_by: body.admittedBy || auth.role || "Teacher",
      is_transferred_to_active: false,
      updated_at: new Date().toISOString(),
    };

    if (body.bankAccountNo !== undefined) updatePayload.bank_account_no = body.bankAccountNo;
    if (body.bankIfsc !== undefined) updatePayload.bank_ifsc = body.bankIfsc;
    if (body.bankName !== undefined) updatePayload.bank_name = body.bankName;
    if (body.kanyashreeId !== undefined) updatePayload.kanyashree_id = body.kanyashreeId;
    if (body.verifiedDocuments !== undefined) updatePayload.verified_documents = body.verifiedDocuments;
    if (body.subjectCombinations !== undefined) updatePayload.subject_combinations = body.subjectCombinations;

    const { error: updateError } = await supabase
      .from("admission_applications")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating admission application:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Record invoice in admission_invoices table
    if (paymentReceiptNo) {
      try {
        await supabase.from("admission_invoices").upsert(
          {
            invoice_number: paymentReceiptNo,
            academic_session: `${currentYear} – ${currentYear + 1}`,
            issue_date: new Date().toISOString().split("T")[0],
            issue_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
            student_id: app.application_no,
            student_name: app.student_name,
            student_class: assignedClass,
            section: assignedSection,
            roll_no: String(assignedRoll),
            guardian_name: app.guardian_name || app.father_name || null,
            contact_number: app.student_contact || app.alt_mobile || null,
            total_amount: Number(feeAmount) || 0,
            payment_mode: body.paymentMode || "Cash",
            payment_status: feePaid ? "Paid" : "Due",
            remarks: `New Admission Fee (${currentYear})`,
            generator_mode: "single",
            copy_type: "both",
            is_blank: false,
            invoice_status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "invoice_number" }
        );
      } catch (invErr) {
        console.warn("Could not record admission invoice:", invErr);
      }
    }

    return NextResponse.json({
      success: true,
      applicationId: id,
      invoiceNumber: paymentReceiptNo,
      studentName: app.student_name,
      targetClass: assignedClass,
      targetSection: assignedSection,
      targetRoll: assignedRoll,
      stream: assignedStream,
      feeAmount,
      feePaid,
      message: `Student successfully marked as Admitted (Class ${assignedClass}-${assignedSection}, Roll ${assignedRoll}) in staging queue.`,
    });
  } catch (err: any) {
    console.error("Error admitting student from application:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
