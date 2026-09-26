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
      .in("current_status", RE_ADMISSION_CANDIDATE_STATUSES)
      .eq("present_class", targetClass);

    if (targetSection && targetSection !== "all") {
      query = query.eq("present_section", targetSection);
    }

    if (status === "pending") {
      query = query.or("re_admission_status.is.null,re_admission_status.eq.pending");
    } else if (status === "admitted") {
      query = query.eq("re_admission_status", "admitted");
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
