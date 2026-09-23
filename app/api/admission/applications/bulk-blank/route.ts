import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const body = await req.json();
    const { serials, academicYear, admissionType, targetClass } = body;

    if (!serials || !Array.isArray(serials) || serials.length === 0) {
      return NextResponse.json({ error: "No serials provided" }, { status: 400 });
    }

    const insertPayloads = serials.map((serial: string) => ({
      application_no: serial,
      academic_year: academicYear || "2026",
      admission_type: admissionType || "new",
      form_method: "offline",
      target_class: targetClass || "V",
      status: "pending",
      student_name: "", // deliberately blank for unassigned printed forms
      gender: "Male",
      religion: "Islam",
      social_category: "General"
    }));

    const { error } = await supabase
      .from("admission_applications")
      .upsert(insertPayloads, { onConflict: "application_no", ignoreDuplicates: false });

    if (error) {
      console.error("Error bulk inserting blank forms:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: serials.length,
    });
  } catch (err: any) {
    console.error("POST /api/admission/applications/bulk-blank error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
