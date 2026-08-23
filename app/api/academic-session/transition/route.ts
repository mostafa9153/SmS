import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Administrators can execute Academic Session transitions." }, { status: 403 });
    }

    const body = await req.json();
    const { fromYear, toYear, rollStrategy, examName } = body;

    if (!fromYear || !toYear || !rollStrategy) {
      return NextResponse.json({ error: "Missing required parameters (fromYear, toYear, rollStrategy)" }, { status: 400 });
    }

    const result = await dbExecuteSessionTransition(
      {
        fromYear: Number(fromYear),
        toYear: Number(toYear),
        rollStrategy,
        examName,
      },
      user.id
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Session transition failed" }, { status: 500 });
  }
}
