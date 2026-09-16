import { NextResponse } from "next/server";
import { dbGetCertificateStats } from "@/lib/supabase/db-certificates";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET() {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }
    const { stats, error } = await dbGetCertificateStats();

    if (error) {
      return NextResponse.json({
        stats,
        error,
        isTableMissing:
          error.includes("does not exist") ||
          error.includes("Could not find the table") ||
          error.includes("relation"),
      });
    }

    return NextResponse.json({ stats, success: true });
  } catch (err: any) {
    console.error("Error in GET /api/certificates/stats:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
