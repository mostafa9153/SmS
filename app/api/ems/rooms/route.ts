import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "ems_rooms";

const DEFAULT_SYSTEM_USER = "2e7e7a69-5c50-4dba-86ae-25614b3fc8bd";

/**
 * Normalizes any persisted JSON/string rooms payload to a clean array of rooms.
 */
function normalizeRoomsPayload(raw: any): any[] | null {
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
    if (Array.isArray(val.rooms)) {
      return val.rooms;
    }
    if (Array.isArray(val.data)) {
      return val.data;
    }
  }
  return null;
}

/**
 * GET /api/ems/rooms
 * Returns saved EMS rooms from the database.
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
      console.warn("EMS rooms system_config read warning:", e);
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
        console.warn("EMS rooms audit_log fallback read error:", e);
      }
    }

    const rooms = normalizeRoomsPayload(rawValue);
    return NextResponse.json({ success: true, data: rooms });
  } catch (err: any) {
    console.error("GET /api/ems/rooms error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/ems/rooms
 * Saves/replaces EMS rooms in the database.
 * Body: { rooms: EmsRoom[] } or EmsRoom[]
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let roomsToSave = normalizeRoomsPayload(body?.rooms !== undefined ? body.rooms : body);

    if (!roomsToSave || !Array.isArray(roomsToSave)) {
      return NextResponse.json({ error: "'rooms' must be an array" }, { status: 400 });
    }

    const supabase = createAdminClient();
    let writeSuccess = false;

    // 1. Try primary system_config table
    try {
      const { error } = await supabase.from("system_config").upsert({
        key: CONFIG_KEY,
        value: roomsToSave,
        updated_at: new Date().toISOString(),
      });

      if (!error) {
        writeSuccess = true;
      } else {
        console.warn("EMS rooms system_config write failed, trying fallback:", error);
      }
    } catch (e) {
      console.warn("EMS rooms system_config write exception:", e);
    }

    // 2. Fallback to audit_log table if primary system_config failed
    if (!writeSuccess) {
      try {
        const performedBy = auth.user?.id || DEFAULT_SYSTEM_USER;
        const { error: auditError } = await supabase.from("audit_log").insert({
          performed_by: performedBy,
          action: "SYSTEM_CONFIG",
          table_name: CONFIG_KEY,
          metadata: roomsToSave,
        });

        if (!auditError) {
          writeSuccess = true;
        } else {
          console.error("EMS rooms audit_log fallback write error:", auditError);
        }
      } catch (e) {
        console.error("EMS rooms audit_log fallback exception:", e);
      }
    }

    if (!writeSuccess) {
      return NextResponse.json({ error: "Failed to save rooms to database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("POST /api/ems/rooms error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
