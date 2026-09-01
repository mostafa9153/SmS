import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  dbGetStudents, 
  dbSearchStudents, 
  dbCreateStudent, 
  maskAadhaar 
} from "@/lib/supabase/db-students";
import type { Student } from "@/lib/types";

import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

// Helper to determine user role
async function getUserRole(): Promise<string> {
  const auth = await getAuthenticatedUserRole();
  return auth.role;
}

// Helper to mask aadhaar for students list if not admin
function applyAadhaarMasking(students: Student[], role: string): Student[] {
  if (role === "Admin") return students;
  return students.map((s) => ({
    ...s,
    aadhaar: s.aadhaar ? maskAadhaar(s.aadhaar) : undefined,
  }));
}

// GET /api/students - List/Search students
export async function GET(req: Request) {
  try {
    const role = await getUserRole();
    if (role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paginated = searchParams.get("paginated") !== "false";
    
    if (!paginated) {
      const students = await dbGetStudents();
      const masked = applyAadhaarMasking(students, role);
      return NextResponse.json({ data: masked });
    }

    const query = searchParams.get("q") || undefined;
    const studentClass = searchParams.get("class") || undefined;
    const section = searchParams.get("section") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const admissionYear = searchParams.get("admissionYear") 
      ? parseInt(searchParams.get("admissionYear")!) 
      : undefined;
    const gender = (searchParams.get("gender") as any) || undefined;
    const socialCategory = (searchParams.get("socialCategory") as any) || undefined;
    const scheme = (searchParams.get("scheme") as any) || undefined;
    const hasAadhaar = (searchParams.get("hasAadhaar") as any) || undefined;

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await dbSearchStudents(
      { query, class: studentClass, section, status, admissionYear, gender, socialCategory, scheme, hasAadhaar },
      page,
      pageSize,
      role
    );

    result.data = applyAadhaarMasking(result.data, role);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch students" }, { status: 500 });
  }
}

import { studentCreateSchema } from "@/lib/validations/student-schema";

// POST /api/students - Create a student
export async function POST(req: Request) {
  try {
    const role = await getUserRole();
    if (role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Staff and Admin are both authorized to register students
    const body = await req.json();
    const parseResult = studentCreateSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || "Invalid student data";
      return NextResponse.json(
        { error: `Validation failed: ${firstError}`, details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const student = await dbCreateStudent(parseResult.data as any);

    // Create audit log for student creation
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_log").insert({
        performed_by: user.id,
        action: "CREATE",
        table_name: "students",
        record_id: student.id,
        new_values: student,
      });
    }

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 400 });
  }
}
