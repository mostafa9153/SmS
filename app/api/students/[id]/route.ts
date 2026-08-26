import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  dbGetStudentById, 
  dbUpdateStudent, 
  dbDeleteStudent, 
  maskAadhaar 
} from "@/lib/supabase/db-students";

import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

// Helper to determine user role
async function getUserRole(): Promise<string> {
  const auth = await getAuthenticatedUserRole();
  return auth.role;
}

// GET /api/students/[id] - Fetch single student details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = await getUserRole();
    if (role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await dbGetStudentById(id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Mask Aadhaar if not Admin
    if (role !== "Admin") {
      if (student.aadhaar) {
        student.aadhaar = maskAadhaar(student.aadhaar);
      }
    } else {
      // If Admin, log that they viewed the plaintext Aadhaar/PII
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && student.aadhaar) {
        await supabase.from("audit_log").insert({
          performed_by: user.id,
          action: "VIEW_AADHAAR",
          table_name: "students",
          record_id: student.id,
          metadata: { reason: "Viewing student detailed profile" },
        });
      }
    }

    return NextResponse.json({ student });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch student details" }, { status: 500 });
  }
}

import { studentUpdateSchema } from "@/lib/validations/student-schema";

// PATCH /api/students/[id] - Update student
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = await getUserRole();
    if (role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Validate payload against update schema
    const parseResult = studentUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Invalid update data";
      return NextResponse.json(
        { error: `Validation failed: ${firstError}`, details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Staff cannot update Aadhaar (only Admin can update Aadhaar)
    if (role !== "Admin" && parseResult.data.aadhaar !== undefined) {
      return NextResponse.json({ error: "Forbidden: Only Administrators can update Aadhaar numbers" }, { status: 403 });
    }

    // Get previous state for audit log
    const oldStudent = await dbGetStudentById(id);
    if (!oldStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const updatedStudent = await dbUpdateStudent(id, parseResult.data as any);

    // Create audit log entry for update
    await supabase.from("audit_log").insert({
      performed_by: user.id,
      action: "UPDATE",
      table_name: "students",
      record_id: id,
      old_values: oldStudent,
      new_values: updatedStudent,
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update student" }, { status: 400 });
  }
}

// DELETE /api/students/[id] - Delete student (Admin only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = await getUserRole();
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const oldStudent = await dbGetStudentById(id);
    if (!oldStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await dbDeleteStudent(id);

    // Create audit log for deletion
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_log").insert({
        performed_by: user.id,
        action: "DELETE",
        table_name: "students",
        record_id: id,
        old_values: oldStudent,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete student" }, { status: 400 });
  }
}
