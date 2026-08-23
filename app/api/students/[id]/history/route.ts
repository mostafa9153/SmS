import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const supabase = await createClient();

    // Verify session
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify role (Admin only)
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || roleData.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { year, class: updatedClass, section: updatedSection, roll: updatedRoll, status: updatedStatus } = body;

    if (!year || !updatedClass || !updatedSection || !updatedRoll || !updatedStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch current record to keep a snapshot for audit trail
    const { data: currentRecord, error: fetchError } = await adminClient
      .from("academic_history")
      .select("*")
      .eq("student_id", studentId)
      .eq("year", year)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!currentRecord) {
      return NextResponse.json({ error: "Academic history record not found for this year" }, { status: 404 });
    }

    // 2. Perform the update
    const { data: updatedRecord, error: updateError } = await adminClient
      .from("academic_history")
      .update({
        class: updatedClass,
        section: updatedSection,
        roll: updatedRoll,
        status: updatedStatus,
      })
      .eq("student_id", studentId)
      .eq("year", year)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 3. Create Audit Log Entry
    const { error: auditError } = await adminClient
      .from("audit_log")
      .insert({
        performed_by: user.id,
        action: "CORRECT_HISTORY",
        table_name: "academic_history",
        record_id: currentRecord.id,
        old_values: currentRecord,
        new_values: updatedRecord,
        metadata: { studentId, year },
      });

    if (auditError) {
      console.error("Audit log failed for history correction", auditError);
      // We don't rollback the update itself since the core action succeeded,
      // but we report it in console.
    }

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Correction failed" }, { status: 500 });
  }
}
