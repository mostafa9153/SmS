import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET() {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("admission_settings")
      .select("*")
      .eq("school_id", "default")
      .single();

    if (error || !data) {
      return NextResponse.json({
        settings: {
          schoolId: "default",
          aiProvider: "gemini",
          aiApiKey: "",
          aiModel: "gemini-1.5-flash",
          currentAcademicYear: "2026",
          newAdmissionActive: true,
          readmissionActive: true,
        },
      });
    }

    // Mask API key for security: never expose raw secret to client
    const rawKey = data.ai_api_key || "";
    const maskedKey = rawKey.length > 4 ? `••••••••${rawKey.slice(-4)}` : (rawKey ? "••••" : "");

    return NextResponse.json({
      settings: {
        id: data.id,
        schoolId: data.school_id,
        aiProvider: data.ai_provider || "gemini",
        aiApiKey: auth.role === "Admin" ? maskedKey : (rawKey ? "configured" : ""),
        hasApiKey: Boolean(rawKey || process.env.GEMINI_API_KEY),
        aiModel: data.ai_model || "gemini-1.5-flash",
        currentAcademicYear: data.current_academic_year || "2026",
        newAdmissionActive: data.new_admission_active ?? true,
        readmissionActive: data.readmission_active ?? true,
        feeStructure: data.fee_structure || {},
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }
    if (auth.role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can modify admission settings." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const body = await req.json();

    // If incoming aiApiKey contains masked dots, fetch existing key to prevent wiping it
    let apiKeyToSave: string | null = null;
    const incomingKey = body.aiApiKey?.trim();
    if (incomingKey && !incomingKey.includes("•••")) {
      apiKeyToSave = incomingKey;
    } else if (incomingKey && incomingKey.includes("•••")) {
      const { data: existing } = await supabase
        .from("admission_settings")
        .select("ai_api_key")
        .eq("school_id", "default")
        .single();
      apiKeyToSave = existing?.ai_api_key || null;
    }

    const updatePayload: Record<string, any> = {
      school_id: "default",
      ai_provider: body.aiProvider || "gemini",
      ai_model: body.aiModel || "gemini-1.5-flash",
      current_academic_year: body.currentAcademicYear || "2026",
      new_admission_active: body.newAdmissionActive ?? true,
      readmission_active: body.readmissionActive ?? true,
      fee_structure: body.feeStructure || {},
      updated_at: new Date().toISOString(),
    };

    if (incomingKey !== undefined) {
      updatePayload.ai_api_key = apiKeyToSave;
    }

    const { data, error } = await supabase
      .from("admission_settings")
      .upsert(updatePayload, { onConflict: "school_id" })
      .select()
      .single();

    if (error) {
      console.error("admission_settings upsert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const savedKey = data.ai_api_key || "";
    const maskedSavedKey = savedKey.length > 4 ? `••••••••${savedKey.slice(-4)}` : (savedKey ? "••••" : "");

    return NextResponse.json({
      success: true,
      settings: {
        id: data.id,
        schoolId: data.school_id,
        aiProvider: data.ai_provider,
        aiApiKey: maskedSavedKey,
        hasApiKey: Boolean(savedKey || process.env.GEMINI_API_KEY),
        aiModel: data.ai_model,
        currentAcademicYear: data.current_academic_year,
        newAdmissionActive: data.new_admission_active,
        readmissionActive: data.readmission_active,
        feeStructure: data.fee_structure,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
