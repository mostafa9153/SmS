import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { mustWrite } from "@/lib/supabase/write";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "routine_subjects_order";

export async function GET() {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      return NextResponse.json({ success: true, order: data.value });
    }

    // Fallback: check audit_log
    const { data: auditData } = await supabase
      .from("audit_log")
      .select("metadata")
      .eq("action", "SYSTEM_CONFIG")
      .eq("table_name", CONFIG_KEY)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      order: auditData?.metadata || {},
    });
  } catch (err: any) {
    console.error("GET /api/routine/subjects-order error:", err);
    return NextResponse.json({ success: false, order: {} }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const gate = await requireRole();
  if (!gate.ok) return gate.response;

  try {
    const body = await req.json();
    const order = body?.order ?? body?.value;

    if (!order || typeof order !== "object") {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error: upsertError } = await supabase.from("system_config").upsert({
      key: CONFIG_KEY,
      value: order,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      console.warn("Failed to upsert system_config, falling back to audit_log:", upsertError);
      await mustWrite(supabase.from("audit_log").insert({
        action: "SYSTEM_CONFIG",
        table_name: CONFIG_KEY,
        metadata: order,
      }), "audit_log insert");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/routine/subjects-order error:", err);
    return NextResponse.json({ error: err.message || "Failed to save order" }, { status: 500 });
  }
}
