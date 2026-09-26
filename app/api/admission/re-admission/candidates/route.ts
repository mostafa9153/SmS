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
      .select("*");

    const cls = (targetClass || "all").trim();
    if (cls !== "all") {
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
      query = query.in("present_class", classVariations);
    }

    if (targetSection && targetSection !== "all") {
      query = query.ilike("present_section", targetSection);
    }

    if (status === "pending") {
      query = query.in("current_status", [
        "Promoted But Not Admitted",
        "Detained",
        "Supplementary",
        "Compartmental",
        "Not Admitted",
        "Sent Up M.P.",
        "10th test fail",
        "exam fail - C.C",
        "C.C.H.S.",
      ]);
    } else if (status === "admitted") {
      query = query.in("current_status", ["Continuing", "New Admission"]);
    } else if (status === "not_admitted") {
      query = query.eq("current_status", "Not Admitted");
    } else {
      query = query.in("current_status", RE_ADMISSION_CANDIDATE_STATUSES);
    }

    query = query.order("present_roll", { ascending: true });

    const { data: students, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let results = (students || []).map((s: any) => ({
      ...s,
      schoolId: s.school_id,
      presentClass: s.present_class,
      presentSection: s.present_section,
      presentRoll: s.present_roll,
      currentStatus: s.current_status,
      reAdmissionStatus: s.re_admission_status || "pending",
      studentContact: s.mobile || s.student_contact || s.alt_mobile,
      fatherName: s.father_name,
      motherName: s.mother_name,
      guardianName: s.guardian_name,
      photoUrl: s.photo_url,
      aadhaarNo: s.aadhaar || s.aadhaar_no,
      dateOfBirth: s.dob,
    }));

    if (search) {
      results = results.filter((s) => {
        const matchesName = s.name?.toLowerCase().includes(search);
        const matchesRoll = String(s.present_roll || s.presentRoll || "").includes(search);
        const matchesSchoolId = (s.school_id || s.schoolId)?.toLowerCase().includes(search);
        const matchesPen = s.pen?.toLowerCase().includes(search);
        const matchesGuardian = s.father_name?.toLowerCase().includes(search) || s.guardian_name?.toLowerCase().includes(search);
        const matchesContact = s.mobile?.includes(search) || s.student_contact?.includes(search) || s.alt_mobile?.includes(search);
        return Boolean(matchesName || matchesRoll || matchesSchoolId || matchesPen || matchesGuardian || matchesContact);
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
