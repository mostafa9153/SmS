import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbProcessBulkUpload, dbPreviewBulkUpload, dbGetImportBatches, dbGenerateBatchId } from "@/lib/supabase/db-bulk-upload";
import { requireRole } from "@/lib/api/guard";

// GET /api/students/bulk-upload - Get history of import batches
export async function GET() {
  try {
    const gate = await requireRole(["Admin", "Staff"]);
    if (!gate.ok) return gate.response;
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

// The client sends a sheet in chunks so each request stays well inside the function time limit
export const maxDuration = 60;
const MAX_IMPORT_ROWS = 500;
const MAX_PREVIEW_ROWS = 5000;
const BATCH_ID = /^BATCH-\d{8}-\d{6}-[A-Z0-9]{6}$/;

// POST /api/students/bulk-upload
//   { action: "preview", rows }  -> what each row would do, nothing written
//   { action: "import", rows, batchId?, uploadType, updateMode, createNew } -> one chunk imported
// undo: n/a — the batch is rolled back from Batch History (rollback route)
export async function POST(req: Request) {
  try {
    const gate = await requireRole(["Admin", "Staff"]);
    if (!gate.ok) return gate.response;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rows, action = "import", uploadType = "current_students", updateMode = "fill_blanks", createNew = true } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No student rows provided for import" }, { status: 400 });
    }

    if (action === "preview") {
      if (rows.length > MAX_PREVIEW_ROWS) {
        return NextResponse.json({ error: `Preview at most ${MAX_PREVIEW_ROWS} rows per request` }, { status: 413 });
      }
      const preview = await dbPreviewBulkUpload(rows);
      return NextResponse.json({ success: true, preview });
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Import at most ${MAX_IMPORT_ROWS} rows per request` }, { status: 413 });
    }
    if (uploadType !== "current_students" && uploadType !== "old_students") {
      return NextResponse.json({ error: "Unknown upload type" }, { status: 400 });
    }
    if (updateMode !== "skip" && updateMode !== "fill_blanks" && updateMode !== "overwrite") {
      return NextResponse.json({ error: "Unknown update mode" }, { status: 400 });
    }
    // Later chunks of one sheet carry the batch id of the first, so the sheet rolls back as one batch
    if (body.batchId !== undefined && (typeof body.batchId !== "string" || !BATCH_ID.test(body.batchId))) {
      return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
    }

    const batchId = body.batchId || (await dbGenerateBatchId());
    const result = await dbProcessBulkUpload(rows, batchId, user.id, {
      uploadType,
      updateMode,
      createNew: createNew !== false,
    });

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
