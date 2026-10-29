import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { createClient } from "@/lib/supabase/server";
import { 
  dbGetStudentById, 
  dbUpdateStudent, 
  dbDeleteStudent, 
  maskAadhaar 
} from "@/lib/supabase/db-students";

import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";
import { studentUpdateSchema } from "@/lib/validations/student-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, snapshotRows, type RestoreStep } from "@/lib/undo/journal";
import { softWrite } from "@/lib/supabase/write";

/** Tables holding a student's data, in restore order (students first). */
const STUDENT_RESTORE_ORDER: [table: string, column: string][] = [
  ["students", "id"],
  ["academic_history", "student_id"],
  ["student_results", "student_id"],
  ["student_marks", "student_id"],
  ["student_attendance", "student_id"],
  ["sports_athletes", "student_id"],
  ["sports_event_registrations", "student_id"],
  ["sports_event_results", "student_id"],
];

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
    const gate = await requireRole();
    if (!gate.ok) return gate.response;
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
        await softWrite(supabase.from("audit_log").insert({
          performed_by: user.id,
          action: "VIEW_AADHAAR",
          table_name: "students",
          record_id: student.id,
          metadata: { reason: "Viewing student detailed profile" },
        }), "audit_log insert");
      }
    }

    return NextResponse.json({ student });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch student details" }, { status: 500 });
  }
}

// PATCH /api/students/[id] - Update student
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireRole();
    if (!gate.ok) return gate.response;
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
      const firstError = parseResult.error.issues[0]?.message || "Invalid update data";
      return NextResponse.json(
        { error: `Validation failed: ${firstError}`, details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Get previous state for audit log & Aadhaar validation
    const oldStudent = await dbGetStudentById(id);
    if (!oldStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Staff cannot update Aadhaar (only Admin can update Aadhaar)
    if (role !== "Admin") {
      if (
        parseResult.data.aadhaar !== undefined &&
        parseResult.data.aadhaar !== null &&
        parseResult.data.aadhaar !== "" &&
        parseResult.data.aadhaar !== oldStudent.aadhaar &&
        !parseResult.data.aadhaar.includes("•") &&
        parseResult.data.aadhaar !== "PENDING_RECORD"
      ) {
        return NextResponse.json({ error: "Forbidden: Only Administrators can update Aadhaar numbers" }, { status: 403 });
      }
      // If Staff user, delete aadhaar from payload so existing Aadhaar remains untouched
      delete parseResult.data.aadhaar;
    }

    const admin = createAdminClient();
    const [beforeRow] = await snapshotRows(admin, "students", "id", id);
    const updatedStudent = await dbUpdateStudent(id, parseResult.data as any);
    const { data: afterRow } = await admin.from("students").select("updated_at").eq("id", id).maybeSingle();
    const undoId = beforeRow
      ? await recordUndo({
          actorId: user.id,
          action: "student.update",
          label: `Edit ${oldStudent.name}`,
          entity: "students",
          entityId: id,
          steps: [{ table: "students", op: "upsert", rows: [beforeRow] }],
          guard: { table: "students", id, updated_at: afterRow?.updated_at ?? null },
        })
      : null;

    // Create audit log entry for update (non-blocking)
    try {
      const supabase = await createClient();
      await softWrite(supabase.from("audit_log").insert({
        performed_by: user.id,
        action: "UPDATE",
        table_name: "students",
        record_id: id,
        old_values: oldStudent,
        new_values: updatedStudent,
      }), "audit_log insert");
    } catch (auditErr) {
      console.warn("Audit log entry failed:", auditErr);
    }

    return NextResponse.json({ success: true, student: updatedStudent, undoId });
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
    const gate = await requireRole();
    if (!gate.ok) return gate.response;
    const { id } = await params;
    const role = await getUserRole();
    if (role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "Admin" && role !== "Staff") {
      return NextResponse.json({ error: "Forbidden: Admins and Staff only" }, { status: 403 });
    }

    const oldStudent = await dbGetStudentById(id);
    if (!oldStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Everything removed with the student (explicitly or by ON DELETE CASCADE), parent first.
    const admin = createAdminClient();
    const steps: RestoreStep[] = [];
    for (const [table, column] of STUDENT_RESTORE_ORDER) {
      steps.push({ table, op: "upsert", rows: await snapshotRows(admin, table, column, id) });
    }

    await dbDeleteStudent(id);

    // Create audit log for deletion
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const undoId = user
      ? await recordUndo({ actorId: user.id, action: "student.delete", label: `Delete ${oldStudent.name}`, entity: "students", entityId: id, steps, ttlHours: 72 })
      : null;
    if (user) {
      await softWrite(supabase.from("audit_log").insert({
        performed_by: user.id,
        action: "DELETE",
        table_name: "students",
        record_id: id,
        old_values: oldStudent,
      }), "audit_log insert");
    }

    return NextResponse.json({ success: true, undoId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete student" }, { status: 400 });
  }
}
