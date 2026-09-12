import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VALID_KEYS = [
  "school_profile",
  "class_management",
  "marks_schemes",
  "promotion_policy",
  "ems_rooms",
  "ems_allocations",
  "address_presets_config",
  "bank_presets",
  "school_presets",
];

const DEFAULT_SYSTEM_USER = "2e7e7a69-5c50-4dba-86ae-25614b3fc8bd";

/**
 * Robustly reads configuration from Supabase (system_config table with audit_log fallback)
 */
async function getConfigFromStorage(
  supabase: any,
  key: string
): Promise<{ value: any; updatedAt: string | null } | null> {
  // 1. Try reading from dedicated system_config table
  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("value, updated_at")
      .eq("key", key)
      .maybeSingle();

    if (!error && data && data.value !== undefined && data.value !== null) {
      return { value: data.value, updatedAt: data.updated_at || null };
    }
  } catch (e) {
    // Proceed to fallback
  }

  // 2. Fallback to audit_log table
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("metadata, created_at")
      .eq("action", "SYSTEM_CONFIG")
      .eq("table_name", key)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.metadata !== undefined && data.metadata !== null) {
      return { value: data.metadata, updatedAt: data.created_at || null };
    }
  } catch (e) {
    console.warn(`Fallback audit_log read error for ${key}:`, e);
  }

  return null;
}

/**
 * Robustly persists configuration to Supabase (system_config table with audit_log fallback)
 */
async function saveConfigToStorage(
  supabase: any,
  key: string,
  value: any
): Promise<boolean> {
  let saved = false;

  // 1. Try system_config table
  try {
    const { error } = await supabase.from("system_config").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      saved = true;
    }
  } catch (e) {
    // Proceed to fallback
  }

  // 2. Fallback / dual-write to audit_log table
  try {
    const { data: auditRow } = await supabase
      .from("audit_log")
      .select("performed_by")
      .limit(1)
      .maybeSingle();
    const performedBy = auditRow?.performed_by || DEFAULT_SYSTEM_USER;

    const { error } = await supabase.from("audit_log").insert({
      performed_by: performedBy,
      action: "SYSTEM_CONFIG",
      table_name: key,
      metadata: value,
    });
    if (!error) {
      saved = true;
    }
  } catch (e) {
    console.warn(`Fallback audit_log write error for ${key}:`, e);
  }

  return saved;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    const supabase = createAdminClient();

    if (key) {
      if (!VALID_KEYS.includes(key)) {
        return NextResponse.json({ error: "Invalid configuration key" }, { status: 400 });
      }

      const result = await getConfigFromStorage(supabase, key);

      return NextResponse.json({
        success: true,
        key,
        data: result ? result.value : null,
        updatedAt: result?.updatedAt || null,
      });
    }

    // Fetch all configurations in parallel
    const configMap: Record<string, any> = {};
    const fetchPromises = ["school_profile", "class_management", "marks_schemes", "promotion_policy"].map(
      async (k) => {
        const item = await getConfigFromStorage(supabase, k);
        configMap[k] = item?.value || null;
      }
    );

    await Promise.all(fetchPromises);

    return NextResponse.json({
      success: true,
      data: {
        school_profile: configMap.school_profile || null,
        class_management: configMap.class_management || null,
        marks_schemes: configMap.marks_schemes || null,
        promotion_policy: configMap.promotion_policy || null,
      },
    });
  } catch (err: any) {
    console.error("Unexpected error in GET /api/school-config:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Both 'key' and 'value' are required" },
        { status: 400 }
      );
    }

    if (!VALID_KEYS.includes(key)) {
      return NextResponse.json(
        { error: `Invalid key. Allowed keys: ${VALID_KEYS.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const success = await saveConfigToStorage(supabase, key, value);

    if (!success) {
      return NextResponse.json(
        { error: `Failed to save configuration for ${key}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      key,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Unexpected error in POST /api/school-config:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
