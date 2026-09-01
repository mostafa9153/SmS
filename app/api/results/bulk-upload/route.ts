import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbProcessResultsBulkUpload, dbGenerateBatchId } from "@/lib/supabase/db-bulk-upload";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/results/bulk-upload - Process bulk upload for examination results
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Staff and Admin can upload
    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || (roleData.role !== "Admin" && roleData.role !== "Staff")) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { rows, targetSessionYear, targetExamName } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No result rows provided for import" }, { status: 400 });
    }

    const batchId = await dbGenerateBatchId();
    const result = await dbProcessResultsBulkUpload(rows, batchId, user.id, targetSessionYear, targetExamName);

    return NextResponse.json({
      success: true,
      batchId,
      summary: result.summary,
      details: result.details,
    });
  } catch (error: any) {
    console.error("Results Bulk upload API error:", error);
    return NextResponse.json({ error: error.message || "Results bulk upload processing failed" }, { status: 500 });
  }
}
