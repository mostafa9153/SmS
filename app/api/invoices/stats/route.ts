import { NextResponse } from "next/server";
import { dbGetInvoiceStats } from "@/lib/supabase/db-invoices";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const session = searchParams.get("session") || searchParams.get("academicSession") || null;

    const result = await dbGetInvoiceStats(session);

    if (result.error) {
      return NextResponse.json(
        { error: result.error, stats: result.stats },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: result.stats,
    });
  } catch (err: any) {
    console.error("Error in GET /api/invoices/stats:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
