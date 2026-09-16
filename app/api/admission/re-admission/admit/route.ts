import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import type { AcademicHistoryEntry, StudentStatus } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentId,
      action,
      newClass,
      newSection,
      newRoll,
      feePaid = true,
      feeAmount,
      paymentReceiptNo,
    } = body;

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch current student
    const { data: student, error: fetchErr } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (fetchErr || !student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const currentYear = new Date().getFullYear();

    if (action === "not_admitted") {
      const { data: updated, error } = await supabase
        .from("students")
        .update({
          re_admission_status: "not_admitted",
          is_invoice_queued: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "not_admitted",
        message: `${student.name} marked as Not Admitted`,
        student: updated,
      });
    }

    if (action === "reset") {
      const { data: updated, error } = await supabase
        .from("students")
        .update({
          re_admission_status: "pending",
          is_invoice_queued: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: "reset",
        message: `Status reset for ${student.name}`,
        student: updated,
      });
    }

    // Default action is 'admit'
    const targetClass = newClass || student.present_class;
    const targetSection = newSection || student.present_section;
    const targetRoll = newRoll ? parseInt(newRoll) : (student.present_roll || 1);

    const updatePayload: Record<string, any> = {
      present_class: targetClass,
      present_section: targetSection,
      present_roll: targetRoll,
      current_status: "Continuing",
      re_admission_status: "admitted",
      re_admitted_at: new Date().toISOString(),
      re_admitted_session: String(currentYear),
      is_invoice_queued: true,
      updated_at: new Date().toISOString(),
    };

    if (targetClass !== student.present_class) {
      updatePayload.previous_class = student.present_class;
      updatePayload.previous_section = student.present_section;
      updatePayload.previous_roll_no = student.present_roll;
    }

    const { data: updated, error } = await supabase
      .from("students")
      .update(updatePayload)
      .eq("id", studentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Persist history entries in the separate public.academic_history table
    try {
      // 1. If student progressed to a new class, ensure previous class is recorded
      if (targetClass !== student.present_class) {
        const { data: prevRecord } = await supabase
          .from("academic_history")
          .select("id")
          .eq("student_id", studentId)
          .eq("year", currentYear - 1)
          .maybeSingle();

        if (!prevRecord) {
          await supabase.from("academic_history").insert({
            student_id: studentId,
            year: currentYear - 1,
            class: student.present_class,
            section: student.present_section,
            roll: student.present_roll,
            status: "Continuing",
          });
        }
      }

      // 2. Ensure current session's entry is inserted or updated
      const { data: currRecord } = await supabase
        .from("academic_history")
        .select("id")
        .eq("student_id", studentId)
        .eq("year", currentYear)
        .maybeSingle();

      if (currRecord) {
        await supabase
          .from("academic_history")
          .update({
            class: targetClass,
            section: targetSection,
            roll: targetRoll,
            status: "Continuing",
          })
          .eq("id", currRecord.id);
      } else {
        await supabase.from("academic_history").insert({
          student_id: studentId,
          year: currentYear,
          class: targetClass,
          section: targetSection,
          roll: targetRoll,
          status: "Continuing",
        });
      }
    } catch (histErr) {
      console.warn("Could not record academic_history record:", histErr);
    }

    // Record invoice in admission_invoices table if an invoice number was provided
    if (paymentReceiptNo && typeof paymentReceiptNo === "string" && paymentReceiptNo.trim()) {
      try {
        const invTotal = Number(feeAmount) || 0;
        await supabase.from("admission_invoices").upsert(
          {
            invoice_number: paymentReceiptNo.trim(),
            academic_session: `${currentYear} – ${currentYear + 1}`,
            issue_date: new Date().toISOString().split("T")[0],
            issue_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
            student_id: student.school_id || student.id,
            student_name: student.name,
            student_class: targetClass,
            section: targetSection,
            roll_no: String(targetRoll),
            guardian_name: student.father_name || student.guardian_name || null,
            contact_number: student.student_contact || student.alt_mobile || null,
            pen_number: student.pen || null,
            total_amount: invTotal,
            payment_mode: "Cash",
            payment_status: feePaid ? "Paid" : "Due",
            remarks: `Re-admission Fee (${currentYear})`,
            generator_mode: "single",
            copy_type: "both",
            is_blank: false,
            invoice_status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "invoice_number" }
        );
      } catch (invErr) {
        console.warn("Could not upsert into admission_invoices:", invErr);
      }
    }

    return NextResponse.json({
      success: true,
      action: "admit",
      message: `${student.name} successfully Re-Admitted to Class ${targetClass} (${targetSection})!`,
      student: updated,
    });
  } catch (err: any) {
    console.error("Error in re-admission admit:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
