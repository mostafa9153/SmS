import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { studentIds } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds array required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("students")
      .update({
        is_invoice_queued: false,
        invoice_printed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", studentIds)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      clearedCount: data?.length || studentIds.length,
      message: `${data?.length || studentIds.length} invoice(s) marked as printed and cleared from queue`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to mark printed" }, { status: 500 });
  }
}
