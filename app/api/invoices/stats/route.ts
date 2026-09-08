import { NextResponse } from "next/server";
import { dbGetInvoiceStats } from "@/lib/supabase/db-invoices";

export async function GET() {
  try {
    const result = await dbGetInvoiceStats();

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
