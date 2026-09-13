import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/employees/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: staff, error } = await admin
      .from("staff_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, staff });
  } catch (error: any) {
    console.error("GET staff error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/employees/[id] - Update staff profile
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const admin = createAdminClient();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.full_name !== undefined) updates.full_name = body.full_name;
    if (body.unique_id !== undefined) updates.unique_id = body.unique_id;
    if (body.employee_type !== undefined) updates.employee_type = body.employee_type;
    if (body.status !== undefined) updates.status = body.status;
    if (body.designation !== undefined) updates.designation = body.designation;
    if (body.caste !== undefined) updates.caste = body.caste;
    if (body.mobile !== undefined) updates.mobile = body.mobile;
    if (body.landline !== undefined) updates.landline = body.landline;
    if (body.email !== undefined) updates.email = body.email;
    if (body.dob !== undefined) updates.dob = body.dob;
    if (body.gender !== undefined) updates.gender = body.gender;
    if (body.basic_pay !== undefined) updates.basic_pay = body.basic_pay;
    if (body.joining_date !== undefined) updates.joining_date = body.joining_date;

    // Personal & Identification columns
    if (body.father_name !== undefined) updates.father_name = body.father_name;
    if (body.mother_name !== undefined) updates.mother_name = body.mother_name;
    if (body.marital_status !== undefined) updates.marital_status = body.marital_status;
    if (body.blood_group !== undefined) updates.blood_group = body.blood_group;
    if (body.aadhaar_no !== undefined) updates.aadhaar_no = body.aadhaar_no;
    if (body.pan_no !== undefined) updates.pan_no = body.pan_no;
    if (body.differently_abled !== undefined) updates.differently_abled = body.differently_abled;

    // Professional & Appointment columns
    if (body.service_type !== undefined) updates.service_type = body.service_type;
    if (body.appointment_memo !== undefined) updates.appointment_memo = body.appointment_memo;

    // JSONB fields merge defensively
    if (
      body.bank_details !== undefined ||
      body.primary_meta !== undefined ||
      body.personal_meta !== undefined ||
      body.present_address !== undefined ||
      body.permanent_address !== undefined ||
      body.professional_meta !== undefined
    ) {
      const { data: current } = await admin
        .from("staff_profiles")
        .select("bank_details, primary_meta, personal_meta, present_address, permanent_address, professional_meta")
        .eq("id", id)
        .single();

      if (body.bank_details !== undefined) updates.bank_details = { ...(current?.bank_details || {}), ...body.bank_details };
      if (body.primary_meta !== undefined) updates.primary_meta = { ...(current?.primary_meta || {}), ...body.primary_meta };
      if (body.personal_meta !== undefined) updates.personal_meta = { ...(current?.personal_meta || {}), ...body.personal_meta };
      if (body.present_address !== undefined) updates.present_address = { ...(current?.present_address || {}), ...body.present_address };
      if (body.permanent_address !== undefined) updates.permanent_address = { ...(current?.permanent_address || {}), ...body.permanent_address };
      if (body.professional_meta !== undefined) updates.professional_meta = { ...(current?.professional_meta || {}), ...body.professional_meta };
    }

    const { data: updated, error } = await admin
      .from("staff_profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update staff error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, staff: updated });
  } catch (error: any) {
    console.error("PATCH staff error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/employees/[id] - Delete staff profile
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { error } = await admin
      .from("staff_profiles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete staff error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Staff profile deleted successfully" });
  } catch (error: any) {
    console.error("DELETE staff error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
