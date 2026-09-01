import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbExecuteSessionTransition } from "@/lib/supabase/db-academic-session";

// POST /api/academic-session/transition
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require Admin role for school-wide session transition
    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Administrators can execute Academic Session transitions." }, { status: 403 });
    }

    const body = await req.json();
    const { fromYear, toYear, rollStrategy, examName, minPassPercentage, overriddenStudentIds } = body;

    if (!fromYear || !toYear || !rollStrategy) {
      return NextResponse.json({ error: "Missing required parameters (fromYear, toYear, rollStrategy)" }, { status: 400 });
    }

    const result = await dbExecuteSessionTransition(
      {
        fromYear: Number(fromYear),
        toYear: Number(toYear),
        rollStrategy,
        examName,
        minPassPercentage: minPassPercentage !== undefined ? Number(minPassPercentage) : 30,
        overriddenStudentIds: Array.isArray(overriddenStudentIds) ? overriddenStudentIds : [],
      },
      user.id
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Session transition failed" }, { status: 500 });
  }
}
