import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbUpdateStudent } from "@/lib/supabase/db-students";

// POST /api/students/bulk - Bulk update students (e.g. for promotions, roll changes)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Get current logged-in user
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the current user has Staff or Admin role (both allowed to update students, but Admin has full powers)
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const { updates } = await req.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates format" }, { status: 400 });
    }

    // Inspect if updates contain Aadhaar edits and deny if not Admin
    const hasAadhaarEdit = updates.some(
      (u: any) => u.changes && u.changes.aadhaar !== undefined
    );
    if (hasAadhaarEdit && roleData.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Administrators can edit Aadhaar numbers in bulk" }, { status: 403 });
    }

    // Process updates in parallel
    const updatePromises = updates.map(async ({ id, changes }) => {
      return await dbUpdateStudent(id, changes);
    });

    const updatedStudents = await Promise.all(updatePromises);

    // Log the bulk update action in audit log
    await supabase.from("audit_log").insert({
      performed_by: user.id,
      action: "BULK_UPDATE",
      table_name: "students",
      metadata: { 
        count: updates.length,
        studentIds: updates.map((u) => u.id)
      },
    });

    return NextResponse.json({ success: true, students: updatedStudents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Bulk update failed" }, { status: 400 });
  }
}
