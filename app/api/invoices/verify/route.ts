import { NextResponse } from "next/server";
import { dbVerifyInvoice } from "@/lib/supabase/db-invoices";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const number = searchParams.get("number") || searchParams.get("q");

    if (!number || !number.trim()) {
      return NextResponse.json(
        { valid: false, message: "Please provide an invoice number to verify" },
        { status: 400 }
      );
    }

    const result = await dbVerifyInvoice(number);

    if (result.error) {
      return NextResponse.json(
        { valid: false, error: result.error, message: "Error verifying invoice" },
        { status: 500 }
      );
    }

    if (!result.valid || !result.invoice) {
      return NextResponse.json({
        valid: false,
        message: `Invoice '${number.trim()}' was not found or is invalid.`,
      });
    }

    return NextResponse.json({
      valid: true,
      message: "Valid official school invoice",
      invoice: result.invoice,
    });
  } catch (err: any) {
    console.error("Error in GET /api/invoices/verify:", err);
    return NextResponse.json(
      { valid: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
