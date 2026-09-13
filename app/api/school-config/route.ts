import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

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

interface CachedConfig {
  data: any;
  cachedAt: number;
}
let memoryConfigCache: CachedConfig | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    const supabase = createAdminClient();

    if (key) {
      if (!VALID_KEYS.includes(key)) {
        return NextResponse.json({ error: "Invalid configuration key" }, { status: 400 });
      }

      // Serve from memory cache if available
      if (memoryConfigCache && Date.now() - memoryConfigCache.cachedAt < CACHE_TTL_MS) {
        const cachedMap = memoryConfigCache.data?.data;
        if (cachedMap && cachedMap[key] !== undefined) {
          return NextResponse.json(
            {
              success: true,
              key,
              data: cachedMap[key],
              updatedAt: null,
            },
            {
              headers: {
                "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
              },
            }
          );
        }
      }

      const result = await getConfigFromStorage(supabase, key);

      return NextResponse.json(
        {
          success: true,
          key,
          data: result ? result.value : null,
          updatedAt: result?.updatedAt || null,
        },
        {
          headers: {
            "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
          },
        }
      );
    }

    // Check memory cache for full config
    if (memoryConfigCache && Date.now() - memoryConfigCache.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(memoryConfigCache.data, {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
        },
      });
    }

    // Fetch all configurations via single batch query with fallback
    const configMap: Record<string, any> = {};
    const ALL_KEYS = ["school_profile", "class_management", "marks_schemes", "promotion_policy"];

    try {
      const { data: batchData, error: batchError } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ALL_KEYS);

      if (!batchError && batchData && batchData.length > 0) {
        for (const item of batchData) {
          if (item.value !== undefined && item.value !== null) {
            configMap[item.key] = item.value;
          }
        }
      }
    } catch {
      // Fallback
    }

    // For any key still missing, check fallback
    const missingKeys = ALL_KEYS.filter((k) => configMap[k] === undefined);
    if (missingKeys.length > 0) {
      await Promise.all(
        missingKeys.map(async (k) => {
          const item = await getConfigFromStorage(supabase, k);
          configMap[k] = item?.value || null;
        })
      );
    }

    const responsePayload = {
      success: true,
      data: {
        school_profile: configMap.school_profile || null,
        class_management: configMap.class_management || null,
        marks_schemes: configMap.marks_schemes || null,
        promotion_policy: configMap.promotion_policy || null,
      },
    };

    memoryConfigCache = {
      data: responsePayload,
      cachedAt: Date.now(),
    };

    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    console.error("Unexpected error in GET /api/school-config:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden: Only Admins can change school configuration" },
        { status: 403 }
      );
    }

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

    // Invalidate cache
    memoryConfigCache = null;

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
