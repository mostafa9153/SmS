import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbProcessBulkUpload, dbGetImportBatches } from "@/lib/supabase/db-bulk-upload";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

// GET /api/students/bulk-upload - Get history of import batches
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batches = await dbGetImportBatches();
    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch import batches" }, { status: 500 });
  }
}

// POST /api/students/bulk-upload - Process bulk upload
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Staff and Admin can upload (checked via admin client to avoid RLS block)
    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    // If roleData exists and is not Admin/Staff, deny access. If no user_roles entries exist yet, permit authenticated user.
    if (roleData && roleData.role !== "Admin" && roleData.role !== "Staff") {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { rows, uploadType = "current_students" } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No student rows provided for import" }, { status: 400 });
    }

    const batchId = crypto.randomUUID();
    const result = await dbProcessBulkUpload(rows, batchId, user.id, uploadType);

    return NextResponse.json({
      success: true,
      batchId,
      summary: result.summary,
      details: result.details,
    });
  } catch (error: any) {
    console.error("Bulk upload API error:", error);
    return NextResponse.json({ error: error.message || "Bulk upload processing failed" }, { status: 500 });
  }
}
