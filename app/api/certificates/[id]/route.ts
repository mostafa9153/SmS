import { NextResponse } from "next/server";
import { dbUpdateCertificateStatus } from "@/lib/supabase/db-certificates";
import { requireStaff } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordUndo, snapshotRows } from "@/lib/undo/journal";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Cancelling or re-validating changes a record: viewing the tracker is not enough.
    const gate = await requireStaff("can_generate_certificates", "can_generate_transfer_certificate", "can_generate_pass_certificate", "can_generate_kanyashree");
    if (!gate.ok) return gate.response;

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

    const before = await snapshotRows(createAdminClient(), "certificates_registry", "id", id);
    const result = await dbUpdateCertificateStatus(id, status);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update certificate status" },
        { status: 500 }
      );
    }

    const undoId = await recordUndo({
      actorId: gate.auth.user?.id ?? "",
      action: "certificate.status",
      label: `Certificate ${status === "Cancelled" ? "cancelled" : "re-validated"}`,
      entity: "certificates_registry",
      entityId: id,
      steps: [{ table: "certificates_registry", op: "upsert", rows: before }],
    });
    return NextResponse.json({
      success: true,
      message: `Certificate status updated to ${status}`,
      undoId,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/certificates/[id]:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
