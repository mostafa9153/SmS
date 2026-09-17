import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "ems_allocations";

const DEFAULT_SYSTEM_USER = "2e7e7a69-5c50-4dba-86ae-25614b3fc8bd";

/**
  * Normalizes any persisted JSON/string allocations payload to a clean array of allocations.
  */
function normalizeAllocationsPayload(raw: any): any[] | null {
  if (!raw) return null;
  let val = raw;
  if (typeof val === "string") {
    try {
      val = JSON.parse(val);
    } catch {
      return null;
    }
  }
  if (Array.isArray(val)) {
    return val;
  }
  if (val && typeof val === "object") {
    if (Array.isArray(val.allocations)) {
      return val.allocations;
    }
    if (Array.isArray(val.data)) {
      return val.data;
    }
  }
  return null;
}

/**
 * GET /api/ems/allocations
 * Returns saved EMS exam allocations from the database.
 */
export async function GET() {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Try reading from dedicated system_config table
    let rawValue: any = null;
    try {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", CONFIG_KEY)
        .maybeSingle();

      if (!error && data?.value !== undefined && data?.value !== null) {
        rawValue = data.value;
      }
    } catch (e) {
      console.warn("EMS allocations system_config read warning:", e);
    }

    // 2. Fallback to audit_log table if system_config returned nothing
    if (rawValue === null) {
      try {
        const { data: auditData, error: auditError } = await supabase
          .from("audit_log")
          .select("metadata")
          .eq("action", "SYSTEM_CONFIG")
          .eq("table_name", CONFIG_KEY)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!auditError && auditData?.metadata !== undefined && auditData?.metadata !== null) {
          rawValue = auditData.metadata;
        }
      } catch (e) {
        console.warn("EMS allocations audit_log fallback read error:", e);
      }
    }

    const allocations = normalizeAllocationsPayload(rawValue);
    return NextResponse.json({ success: true, data: allocations });
  } catch (err: any) {
    console.error("GET /api/ems/allocations error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/ems/allocations
 * Saves/replaces EMS allocations in the database.
 * Body: { allocations: ExamAllocation[] } or ExamAllocation[]
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let allocationsToSave = normalizeAllocationsPayload(
      body?.allocations !== undefined ? body.allocations : body
    );

    if (!allocationsToSave || !Array.isArray(allocationsToSave)) {
      return NextResponse.json({ error: "'allocations' must be an array" }, { status: 400 });
    }

    const supabase = createAdminClient();
    let writeSuccess = false;

    // 1. Try primary system_config table
    try {
      const { error } = await supabase.from("system_config").upsert({
        key: CONFIG_KEY,
        value: allocationsToSave,
        updated_at: new Date().toISOString(),
      });

      if (!error) {
        writeSuccess = true;
      } else {
        console.warn("EMS allocations system_config write failed, trying fallback:", error);
      }
    } catch (e) {
      console.warn("EMS allocations system_config write exception:", e);
    }

    // 2. Fallback to audit_log table if primary system_config failed
    if (!writeSuccess) {
      try {
        const performedBy = auth.user?.id || DEFAULT_SYSTEM_USER;
        const { error: auditError } = await supabase.from("audit_log").insert({
          performed_by: performedBy,
          action: "SYSTEM_CONFIG",
          table_name: CONFIG_KEY,
          metadata: allocationsToSave,
        });

        if (!auditError) {
          writeSuccess = true;
        } else {
          console.error("EMS allocations audit_log fallback write error:", auditError);
        }
      } catch (e) {
        console.error("EMS allocations audit_log fallback exception:", e);
      }
    }

    if (!writeSuccess) {
      return NextResponse.json({ error: "Failed to save allocations to database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("POST /api/ems/allocations error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
