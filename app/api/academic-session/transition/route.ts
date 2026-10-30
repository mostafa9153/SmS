import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbExecuteSessionTransition } from "@/lib/supabase/db-academic-session";
import { notify, notifyAdminsOfError } from "@/lib/notifications/notify";

// POST /api/academic-session/transition
// guard: custom — signed-in Admin check via getUser + user_roles
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
    const { fromYear, toYear, rollStrategy, examName, minPassPercentage, overriddenStudentIds, section } = body;

    if (!fromYear || !toYear || !rollStrategy) {
      return NextResponse.json({ error: "Missing required parameters (fromYear, toYear, rollStrategy)" }, { status: 400 });
    }

    const params = {
      fromYear: Number(fromYear),
      toYear: Number(toYear),
      rollStrategy,
      examName,
      minPassPercentage: minPassPercentage !== undefined ? Number(minPassPercentage) : 30,
      overriddenStudentIds: Array.isArray(overriddenStudentIds) ? overriddenStudentIds : [],
    };

    let result;
    if (section === "higher_secondary") {
      const { dbExecuteSessionTransitionHS } = await import("@/lib/supabase/db-academic-session");
      result = await dbExecuteSessionTransitionHS(params, user.id);
    } else {
      result = await dbExecuteSessionTransition(params, user.id);
    }

    await notify({ roles: ["Admin", "Staff"], severity: "success", title: "Academic session transition completed", message: `Section: ${section === "higher_secondary" ? "Higher Secondary" : "Secondary"}`, link: "/settings/academic-session", source: "session.transition", createdBy: user.id });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    await notifyAdminsOfError("session.transition", "Academic session transition failed", error, "/settings/academic-session");
    return NextResponse.json({ error: error.message || "Session transition failed" }, { status: 500 });
  }
}
