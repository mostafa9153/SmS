import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/auth/role - Returns current logged-in user's role
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ role: "Guest", userId: null });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role, full_name")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      role: roleData?.role || "Staff",
      fullName: roleData?.full_name || user.email?.split("@")[0] || "User",
      userId: user.id,
    });
  } catch (error: any) {
    return NextResponse.json({ role: "Guest", userId: null, error: error.message }, { status: 500 });
  }
}
