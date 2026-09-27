import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

// GET /api/employees - Fetch all staff profiles
export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const admin = createAdminClient();
    let query = admin
      .from("staff_profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (type === "teaching") {
      query = query.eq("employee_type", "TEACHING");
    } else if (type === "non-teaching") {
      query = query.eq("employee_type", "NON_TEACHING");
    }

    const { data: staff, error } = await query;

    if (error) {
      console.error("GET staff error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, staff: staff || [] });
  } catch (error: any) {
    console.error("GET staff error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/employees - Create a new staff profile
export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    if (auth.role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can register new employees." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const admin = createAdminClient();

    const fullName = body.full_name?.trim();
    if (!fullName) {
      return NextResponse.json({ error: "Full Name is required." }, { status: 400 });
    }

    // Auto-generate Unique ID if not supplied
    let uniqueId = body.unique_id?.trim();
    if (!uniqueId) {
      const prefix = body.employee_type === "NON_TEACHING" ? "NT" : "TCH";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      uniqueId = `${prefix}-${randomSuffix}`;
    }

    // Check if unique_id already exists
    const { data: existing } = await admin
      .from("staff_profiles")
      .select("id")
      .eq("unique_id", uniqueId)
      .maybeSingle();

    if (existing) {
      uniqueId = `${uniqueId}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const newRecord: Record<string, any> = {
      full_name: fullName,
      unique_id: uniqueId,
      employee_type: body.employee_type || "TEACHING",
      designation: body.designation?.trim() || "Assistant Teacher",
      status: body.status || "ACTIVE",
      caste: body.caste || "General",
      basic_pay: body.basic_pay !== undefined && body.basic_pay !== null && body.basic_pay !== "" ? Number(body.basic_pay) : null,
      joining_date: body.joining_date || null,
      dob: body.dob || null,
      gender: body.gender || "Male",
      father_name: body.father_name?.trim() || null,
      mother_name: body.mother_name?.trim() || null,
      marital_status: body.marital_status || "Married",
      blood_group: body.blood_group || "O+",
      aadhaar_no: body.aadhaar_no?.trim() || null,
      pan_no: body.pan_no?.trim() || null,
      differently_abled: Boolean(body.differently_abled),
      mobile: body.mobile?.trim() || null,
      email: body.email?.trim() || null,
      landline: body.landline?.trim() || null,
      service_type: body.service_type?.trim() || "Permanent",
      appointment_memo: body.appointment_memo?.trim() || null,
      primary_meta: body.primary_meta || {},
      personal_meta: body.personal_meta || {},
      present_address: body.present_address || {},
      permanent_address: body.permanent_address || {},
      professional_meta: body.professional_meta || {},
      bank_details: body.bank_details || {},
      profile_picture_url: body.profile_picture_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await admin
      .from("staff_profiles")
      .insert(newRecord)
      .select()
      .single();

    if (error) {
      console.error("Insert staff error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, staff: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST staff error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
