import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest" && !auth.user) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { studentIds, applicationIds } = body;

    const sIds = Array.isArray(studentIds) ? studentIds : [];
    const aIds = Array.isArray(applicationIds) ? applicationIds : [];

    if (sIds.length === 0 && aIds.length === 0) {
      return NextResponse.json({ error: "studentIds or applicationIds array required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    let totalCleared = 0;

    if (sIds.length > 0) {
      const { data } = await supabase
        .from("students")
        .update({
          is_invoice_queued: false,
          invoice_printed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", sIds)
        .select("id");
      totalCleared += data?.length || sIds.length;
    }

    if (aIds.length > 0) {
      const { data } = await supabase
        .from("admission_applications")
        .update({
          updated_at: new Date().toISOString(),
        })
        .in("id", aIds)
        .select("id");
      totalCleared += data?.length || aIds.length;
    }

    return NextResponse.json({
      success: true,
      clearedCount: totalCleared,
      message: `${totalCleared} invoice(s) marked as printed and cleared from queue`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to mark printed" }, { status: 500 });
  }
}
