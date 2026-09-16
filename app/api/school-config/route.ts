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
  "student_entry_presets",
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
 * Robustly persists configuration to Supabase (system_config table with audit_log fallback only if primary fails)
 */
async function saveConfigToStorage(
  supabase: any,
  key: string,
  value: any,
  userId?: string
): Promise<boolean> {
  // 1. Try primary system_config table
  try {
    const { error } = await supabase.from("system_config").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      return true;
    }
  } catch (e) {
    console.warn(`system_config table write failed for ${key}, falling back to audit_log:`, e);
  }

  // 2. Fallback to audit_log table ONLY if primary system_config table failed
  try {
    const performedBy = userId || DEFAULT_SYSTEM_USER;

    const { error } = await supabase.from("audit_log").insert({
      performed_by: performedBy,
      action: "SYSTEM_CONFIG",
      table_name: key,
      metadata: value,
    });
    if (!error) {
      return true;
    }
  } catch (e) {
    console.warn(`Fallback audit_log write error for ${key}:`, e);
  }

  return false;
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

    // Fetch all configurations from system_config table (with fallback)
    const configMap: Record<string, any> = {};
    const CORE_FALLBACK_KEYS = [
      "school_profile",
      "class_management",
      "marks_schemes",
      "promotion_policy",
      "ems_rooms",
      "ems_allocations",
      "address_presets_config",
      "bank_presets",
      "school_presets",
      "student_entry_presets",
    ];

    try {
      // Fetch all persisted configuration entries from system_config
      const { data: allData, error: batchError } = await supabase
        .from("system_config")
        .select("key, value");

      if (!batchError && allData && allData.length > 0) {
        for (const item of allData) {
          if (item.value !== undefined && item.value !== null) {
            configMap[item.key] = item.value;
          }
        }
      }
    } catch {
      // Fallback
    }

    // For any core key not yet present in system_config, check audit_log fallback
    const missingKeys = CORE_FALLBACK_KEYS.filter((k) => configMap[k] === undefined);
    if (missingKeys.length > 0) {
      await Promise.all(
        missingKeys.map(async (k) => {
          const item = await getConfigFromStorage(supabase, k);
          if (item && item.value !== undefined && item.value !== null) {
            configMap[k] = item.value;
          }
        })
      );
    }

    const responsePayload = {
      success: true,
      data: configMap,
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
    // Allow Admins and Staff to update presets and configuration
    if (auth.role !== "Admin" && auth.role !== "Staff") {
      return NextResponse.json(
        { error: "Forbidden: Only staff and admins can change school configuration" },
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

    const isKeyValid = VALID_KEYS.includes(key) || /^[a-z0-9_-]{2,100}$/i.test(key);
    if (!isKeyValid) {
      return NextResponse.json(
        { error: `Invalid key format: ${key}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const success = await saveConfigToStorage(supabase, key, value, auth.user?.id);

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
