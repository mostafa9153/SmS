import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export const RE_ADMISSION_CANDIDATE_STATUSES = [
  "Promoted But Not Admitted",
  "Continuing",
  "Supplementary",
  "Compartmental",
  "Detained",
  "Not Admitted",
  "Sent Up M.P.",
  "10th test fail",
  "exam fail - C.C",
  "C.C.H.S.",
];

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetClass = searchParams.get("class");
    const targetSection = searchParams.get("section");
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status") || "all";

    if (!targetClass) {
      return NextResponse.json({ error: "Class parameter is required" }, { status: 400 });
    }

    // Role check for teachers if class restrictions exist
    if (auth.role === "Teacher" && auth.permissions?.allowed_classes?.length) {
      if (!auth.permissions.allowed_classes.includes(targetClass)) {
        return NextResponse.json(
          { error: `Forbidden: You are not assigned to handle Class ${targetClass}.` },
          { status: 403 }
        );
      }
    }

    const supabase = createAdminClient();

    let query = supabase
      .from("students")
      .select(`
        id,
        name,
        school_id,
        pen,
        present_class,
        present_section,
        present_roll,
        student_contact,
        alt_mobile,
        email,
        re_admission_status,
        re_admitted_session,
        photo_url,
        father_name,
        mother_name,
        guardian_name,
        relationship,
        aadhaar_no,
        dob,
        gender,
        blood_group,
        religion,
        caste,
        address,
        vill_town,
        post_office,
        pin_code,
        dist,
        state,
        bank_account_no,
        bank_ifsc,
        bank_name,
        bpl_status,
        kanyashree_id,
        shikshashree_id,
        oasis_id,
        aikyashree_id,
        taruner_swapna_id,
        svmcs_id,
        current_status,
        admission_year,
        admission_no,
        is_invoice_queued,
        re_admitted_at
      `)
    const cls = targetClass.trim();
    let classVariations = [cls];
    if (cls === "V" || cls === "5") {
      classVariations = ["V", "5", "Class V", "Class 5"];
    } else if (cls === "VI" || cls === "6") {
      classVariations = ["VI", "6", "Class VI", "Class 6"];
    } else if (cls === "VII" || cls === "7") {
      classVariations = ["VII", "7", "Class VII", "Class 7"];
    } else if (cls === "VIII" || cls === "8") {
      classVariations = ["VIII", "8", "Class VIII", "Class 8"];
    } else if (cls === "IX" || cls === "9") {
      classVariations = ["IX", "9", "Class IX", "Class 9"];
    } else if (cls === "X" || cls === "10") {
      classVariations = ["X", "10", "Class X", "Class 10"];
    } else if (cls === "XI" || cls === "11") {
      classVariations = ["XI", "11", "Class XI", "Class 11"];
    } else if (cls === "XII" || cls === "12") {
      classVariations = ["XII", "12", "Class XII", "Class 12"];
    }

    // Match either present_class or previous_class so candidates are found whether filtered by source or target class
    const presentClassConditions = classVariations.map((c) => `present_class.eq.${c}`).join(",");
    const previousClassConditions = classVariations.map((c) => `previous_class.eq.${c}`).join(",");
    const orClassCondition = `${presentClassConditions},${previousClassConditions}`;

    query = query
      .in("current_status", RE_ADMISSION_CANDIDATE_STATUSES)
      .or(orClassCondition);

    if (targetSection && targetSection !== "all") {
      query = query.ilike("present_section", targetSection);
    }

    if (status === "pending") {
      // Return students whose status is pending/transitional or whose re_admission_status is pending/null
      query = query.or(
        "current_status.eq.Promoted But Not Admitted,current_status.eq.Detained,current_status.eq.Supplementary,current_status.eq.Compartmental,current_status.eq.Not Admitted,current_status.eq.Sent Up M.P.,current_status.eq.10th test fail,current_status.eq.exam fail - C.C,current_status.eq.C.C.H.S.,re_admission_status.is.null,re_admission_status.eq.pending"
      );
    } else if (status === "admitted") {
      query = query.eq("re_admission_status", "admitted").eq("current_status", "Continuing");
    } else if (status === "not_admitted") {
      query = query.or("re_admission_status.eq.not_admitted,current_status.eq.Not Admitted");
    }

    query = query.order("present_roll", { ascending: true });

    const { data: students, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let results = students || [];

    if (search) {
      results = results.filter((s) => {
        const matchesName = s.name?.toLowerCase().includes(search);
        const matchesRoll = String(s.present_roll || "").includes(search);
        const matchesSchoolId = s.school_id?.toLowerCase().includes(search);
        const matchesPen = s.pen?.toLowerCase().includes(search);
        const matchesGuardian = s.father_name?.toLowerCase().includes(search) || s.guardian_name?.toLowerCase().includes(search);
        const matchesContact = s.student_contact?.includes(search) || s.alt_mobile?.includes(search);
        return matchesName || matchesRoll || matchesSchoolId || matchesPen || matchesGuardian || matchesContact;
      });
    }

    return NextResponse.json({
      success: true,
      candidates: results,
      total: results.length,
      class: targetClass,
      section: targetSection || "all",
    });
  } catch (err: any) {
    console.error("Error fetching re-admission candidates:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
