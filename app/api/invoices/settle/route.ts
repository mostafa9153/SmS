import { NextRequest, NextResponse } from "next/server";
import { dbUpdateInvoiceStatuses, type InvoiceStatusUpdate } from "@/lib/supabase/db-invoices";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

/**
 * POST /api/invoices/settle
 * Body: { updates: InvoiceStatusUpdate[] }
 *
 * Each update:
 *   { invoice_number: string; status: 'active' | 'cancelled'; amount?: number }
 *
 * 'active'    → invoice was used, amount recorded
 * 'cancelled' → invoice returned unused, amount set to 0
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: InvoiceStatusUpdate[] = body?.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // Validate each update
    for (const upd of updates) {
      if (!upd.invoice_number || !upd.status) {
        return NextResponse.json(
          { error: "Each update must have invoice_number and status" },
          { status: 400 }
        );
      }
      if (!["active", "cancelled"].includes(upd.status)) {
        return NextResponse.json(
          { error: `Invalid status '${upd.status}'. Must be 'active' or 'cancelled'.` },
          { status: 400 }
        );
      }
    }

    const result = await dbUpdateInvoiceStatuses(updates);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: result.updatedCount,
      message: `${result.updatedCount} invoice(s) settled successfully`,
    });
  } catch (err: any) {
    console.error("Error in settle POST:", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
