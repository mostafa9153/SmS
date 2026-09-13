import { NextRequest, NextResponse } from "next/server";
import { dbGetNextInvoiceSequence } from "@/lib/supabase/db-invoices";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const result = await dbGetNextInvoiceSequence(year);

    if (result.error) {
      return NextResponse.json(
        { error: result.error, nextSequence: result.nextSequence },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      nextSequence: result.nextSequence,
      latestInvoiceNumber: result.latestInvoiceNumber,
    });
  } catch (err: any) {
    console.error("Error in GET /api/invoices/next-sequence:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error", nextSequence: 1 },
      { status: 500 }
    );
  }
}
