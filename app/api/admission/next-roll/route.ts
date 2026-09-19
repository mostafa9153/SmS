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
    const targetClass = searchParams.get("class") || "V";
    const targetSection = searchParams.get("section") || "A";
    const currentYear = searchParams.get("academicYear") || String(new Date().getFullYear());

    const supabase = createAdminClient();

    // 1. Check max roll in admission_applications (both admitted and pending with target roll)
    const { data: appsData } = await supabase
      .from("admission_applications")
      .select("target_roll, admitted_roll, target_class, admitted_class, target_section, admitted_section")
      .eq("academic_year", currentYear)
      .or(`target_class.eq.${targetClass},admitted_class.eq.${targetClass}`)
      .or(`target_section.eq.${targetSection},admitted_section.eq.${targetSection}`);

    // 2. Check max roll in active students directory
    const { data: studentsData } = await supabase
      .from("students")
      .select("present_roll")
      .eq("present_class", targetClass)
      .eq("present_section", targetSection);

    let maxRoll = 0;

    (appsData || []).forEach((item) => {
      const isClassMatch = item.admitted_class === targetClass || item.target_class === targetClass;
      const isSecMatch = item.admitted_section === targetSection || item.target_section === targetSection;
      if (isClassMatch && isSecMatch) {
        if (item.admitted_roll && Number(item.admitted_roll) > maxRoll) {
          maxRoll = Number(item.admitted_roll);
        } else if (item.target_roll && Number(item.target_roll) > maxRoll) {
          maxRoll = Number(item.target_roll);
        }
      }
    });

    (studentsData || []).forEach((item) => {
      if (item.present_roll && Number(item.present_roll) > maxRoll) {
        maxRoll = Number(item.present_roll);
      }
    });

    const nextRoll = maxRoll + 1;

    return NextResponse.json({
      nextRoll,
      class: targetClass,
      section: targetSection,
      currentMaxRoll: maxRoll,
    });
  } catch (err: any) {
    console.error("Error calculating next roll:", err);
    return NextResponse.json({ error: err.message, nextRoll: 1 }, { status: 500 });
  }
}
