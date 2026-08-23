import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbRollbackBatch } from "@/lib/supabase/db-bulk-upload";

// POST /api/students/bulk-upload/rollback - Undo / Delete a bulk upload batch
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only Admin can rollback batches
    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData && roleData.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Only Administrators can rollback or delete import batches" }, { status: 403 });
    }

    const { batchId } = await req.json();
    if (!batchId) {
      return NextResponse.json({ error: "Missing batchId parameter" }, { status: 400 });
    }

    const result = await dbRollbackBatch(batchId, user.id);

    return NextResponse.json({
      message: `Batch rollback successful. Reverted ${result.revertedCount} updated records and deleted ${result.deletedCount} new records.`,
      ...result,
    });
  } catch (error: any) {
    console.error("Rollback error:", error);
    return NextResponse.json({ error: error.message || "Rollback failed" }, { status: 500 });
  }
}
