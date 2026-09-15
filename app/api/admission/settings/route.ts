import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
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
          aiApiKey: process.env.GEMINI_API_KEY || "",
          aiModel: "gemini-1.5-flash",
          currentAcademicYear: "2026",
          newAdmissionActive: true,
          readmissionActive: true,
        },
      });
    }

    return NextResponse.json({
      settings: {
        id: data.id,
        schoolId: data.school_id,
        aiProvider: data.ai_provider || "gemini",
        aiApiKey: data.ai_api_key || "",
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
    const supabase = createAdminClient();
    const body = await req.json();

    const updatePayload = {
      school_id: "default",
      ai_provider: body.aiProvider || "gemini",
      ai_api_key: body.aiApiKey?.trim() || null,
      ai_model: body.aiModel || "gemini-1.5-flash",
      current_academic_year: body.currentAcademicYear || "2026",
      new_admission_active: body.newAdmissionActive ?? true,
      readmission_active: body.readmissionActive ?? true,
      fee_structure: body.feeStructure || {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("admission_settings")
      .upsert(updatePayload, { onConflict: "school_id" })
      .select()
      .single();

    if (error) {
      console.error("admission_settings upsert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: data.id,
        schoolId: data.school_id,
        aiProvider: data.ai_provider,
        aiApiKey: data.ai_api_key,
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
