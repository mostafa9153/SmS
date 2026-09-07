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
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    const supabase = createAdminClient();

    if (key) {
      if (!VALID_KEYS.includes(key)) {
        return NextResponse.json({ error: "Invalid configuration key" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("system_config")
        .select("value, updated_at")
        .eq("key", key)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching config for ${key}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        key,
        data: data ? data.value : null,
        updatedAt: data?.updated_at || null,
      });
    }

    // Fetch all 4 school configuration keys in parallel
    const { data: rows, error } = await supabase
      .from("system_config")
      .select("key, value, updated_at")
      .in("key", VALID_KEYS);

    if (error) {
      console.error("Error fetching all school configs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const configMap: Record<string, any> = {};
    (rows || []).forEach((row) => {
      configMap[row.key] = row.value;
    });

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

    const { error } = await supabase.from("system_config").upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`Error upserting config for ${key}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
