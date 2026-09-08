import { NextResponse } from "next/server";
import { dbUpdateCertificateStatus } from "@/lib/supabase/db-certificates";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (!auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing certificate ID" }, { status: 400 });
    }

    const body = await req.json();
    const status = body.status;

    if (status !== "Valid" && status !== "Cancelled") {
      return NextResponse.json(
        { error: "Invalid status value. Must be 'Valid' or 'Cancelled'" },
        { status: 400 }
      );
    }

    const result = await dbUpdateCertificateStatus(id, status);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update certificate status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Certificate status updated to ${status}`,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/certificates/[id]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
