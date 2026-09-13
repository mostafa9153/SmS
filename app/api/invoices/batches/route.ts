import { NextRequest, NextResponse } from "next/server";
import { dbGetInvoiceBatches, dbUndoInvoiceBatch } from "@/lib/supabase/db-invoices";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const result = await dbGetInvoiceBatches(limit);
    if (result.error) {
      return NextResponse.json({ error: result.error, batches: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, batches: result.batches });
  } catch (err: any) {
    console.error("Error in GET /api/invoices/batches:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Admins can undo invoice batches" }, { status: 403 });
    }

    const body = await req.json();
    const { batchId, startSerial, endSerial, year } = body;

    const result = await dbUndoInvoiceBatch({
      batchId,
      startSerial,
      endSerial,
      year,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to undo batch" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      newSequence: result.newSequence,
      message: `Successfully undone batch. Reset to sequence #${result.newSequence}`,
    });
  } catch (err: any) {
    console.error("Error in POST /api/invoices/batches (undo):", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
