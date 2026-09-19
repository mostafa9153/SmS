import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const aadhaar = searchParams.get("aadhaar")?.trim();
    const contact = searchParams.get("contact")?.trim();
    const excludeId = searchParams.get("excludeId");

    if (!aadhaar && !contact) {
      return NextResponse.json({ isDuplicate: false, duplicates: [] });
    }

    const supabase = createAdminClient();
    const duplicates: Array<{ source: string; name: string; class: string; matchType: string; id: string }> = [];

    // 1. Check in admission_applications
    if (aadhaar && aadhaar.length >= 8) {
      const { data: appAadhaar } = await supabase
        .from("admission_applications")
        .select("id, student_name, target_class, admitted_class, aadhaar")
        .eq("aadhaar", aadhaar);

      (appAadhaar || []).forEach((row) => {
        if (!excludeId || row.id !== excludeId) {
          duplicates.push({
            source: "Admission Applications",
            name: row.student_name,
            class: row.admitted_class || row.target_class,
            matchType: "Aadhaar",
            id: row.id,
          });
        }
      });
    }

    if (contact && contact.length >= 8) {
      const { data: appContact } = await supabase
        .from("admission_applications")
        .select("id, student_name, target_class, admitted_class, student_contact, alt_mobile")
        .or(`student_contact.eq.${contact},alt_mobile.eq.${contact}`);

      (appContact || []).forEach((row) => {
        if (!excludeId || row.id !== excludeId) {
          if (!duplicates.some((d) => d.id === row.id)) {
            duplicates.push({
              source: "Admission Applications",
              name: row.student_name,
              class: row.admitted_class || row.target_class,
              matchType: "Contact Number",
              id: row.id,
            });
          }
        }
      });
    }

    // 2. Check in active students table
    if (aadhaar && aadhaar.length >= 8) {
      const { data: studentAadhaar } = await supabase
        .from("students")
        .select("id, school_id, name, present_class, aadhaar")
        .eq("aadhaar", aadhaar);

      (studentAadhaar || []).forEach((row) => {
        duplicates.push({
          source: `Active Students (${row.school_id || "Directory"})`,
          name: row.name,
          class: row.present_class,
          matchType: "Aadhaar",
          id: row.id,
        });
      });
    }

    if (contact && contact.length >= 8) {
      const { data: studentContact } = await supabase
        .from("students")
        .select("id, school_id, name, present_class, mobile, alt_mobile")
        .or(`mobile.eq.${contact},alt_mobile.eq.${contact}`);

      (studentContact || []).forEach((row) => {
        if (!duplicates.some((d) => d.id === row.id)) {
          duplicates.push({
            source: `Active Students (${row.school_id || "Directory"})`,
            name: row.name,
            class: row.present_class,
            matchType: "Contact Number",
            id: row.id,
          });
        }
      });
    }

    return NextResponse.json({
      isDuplicate: duplicates.length > 0,
      duplicates,
    });
  } catch (err: any) {
    console.error("Error checking duplicates:", err);
    return NextResponse.json({ error: err.message, isDuplicate: false, duplicates: [] }, { status: 500 });
  }
}
