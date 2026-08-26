import { NextResponse } from "next/server";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

// GET /api/auth/role - Returns current logged-in user's role
export async function GET() {
  try {
    const authContext = await getAuthenticatedUserRole();
    return NextResponse.json({
      role: authContext.role,
      fullName: authContext.fullName,
      userId: authContext.user?.id || null,
    });
  } catch (error: any) {
    return NextResponse.json({ role: "Guest", userId: null, error: error.message }, { status: 500 });
  }
}
