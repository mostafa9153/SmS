import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StudentStatus } from "@/lib/types";
import { normalizeSocialCategory } from "@/lib/utils/excel-parser";
import { calculateExactAge, normalizeClassName } from "@/lib/utils";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current logged-in user to verify session
    const { data: { user }, error: authUserError } = await supabase.auth.getUser();
    if (authUserError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run parallel aggregation counts in database
    const [
      { count: total },
      { count: boys },
      { count: girls },
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("gender", "Male"),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("gender", "Female"),
    ]);

    // Fetch all student records in paginated batches of 1,000 to prevent Supabase 1,000-row limit truncation
    let allStudentsData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: chunk, error: chunkErr } = await supabase
        .from("students")
        .select("current_status, present_class, gender, dob, social_category, minority_group, religion, is_cwsn, aadhaar")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (chunkErr || !chunk || chunk.length === 0) {
        hasMore = false;
      } else {
        allStudentsData = allStudentsData.concat(chunk);
        if (chunk.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    const currentYear = new Date().getFullYear();

    // 1. Status grouping
    const statusCounts = (allStudentsData || []).reduce(
      (acc, s) => {
        const status = (s.current_status as StudentStatus) || "Continuing";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<StudentStatus, number>
    );

    // 2. Class-wise distribution (normalized to canonical class names e.g. "IX", "XI")
    const classWiseCounts = (allStudentsData || []).reduce(
      (acc, s) => {
        const cls = normalizeClassName(s.present_class);
        acc[cls] = (acc[cls] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // 3. Social Category distribution (General, OBC, SC, ST, Other)
    const categoryCounts: Record<string, number> = {
      General: 0,
      OBC: 0,
      SC: 0,
      ST: 0,
    };

    // 4. Welfare & Scholarship Schemes Metrics
    let kanyashreeK1 = 0;
    let kanyashreeK2 = 0;
    let shikshashree = 0;
    let oasis = 0;
    let nsp = 0;
    let svmcm = 0;
    let saboojSarathi = 0;
    let cwsn = 0;
    let withAadhaar = 0;
    let withoutAadhaar = 0;

    for (const s of allStudentsData || []) {
      // Category count
      const cat = normalizeSocialCategory(s.social_category) || "General";
      if (categoryCounts[cat] !== undefined) {
        categoryCounts[cat]++;
      } else if (cat.toUpperCase().includes("OBC")) {
        categoryCounts["OBC"]++;
      } else if (cat.toUpperCase().includes("SC")) {
        categoryCounts["SC"]++;
      } else if (cat.toUpperCase().includes("ST")) {
        categoryCounts["ST"]++;
      } else {
        categoryCounts["General"]++;
      }

      // Exact Age calculation (accurately compares month and day against current date)
      const age = calculateExactAge(s.dob);

      // Kanyashree eligibility (Females)
      if (s.gender === "Female") {
        if (age !== null && age >= 18) {
          kanyashreeK2++;
        } else if (age !== null && age >= 13) {
          kanyashreeK1++;
        } else if (!s.dob) {
          // If no DOB but in Class VIII-XII, estimate K1
          const cls = String(s.present_class || "").toUpperCase();
          if (["VIII", "IX", "X", "XI", "XII", "8", "9", "10", "11", "12"].includes(cls)) {
            kanyashreeK1++;
          }
        }
      }

      const clsUpper = String(s.present_class || "").toUpperCase();
      const rel = String(s.religion || "").toLowerCase();
      const minGroup = String(s.minority_group || "").toLowerCase();
      const isMuslim = rel.includes("muslim") || rel.includes("islam") || minGroup.includes("muslim") || minGroup.includes("islam");
      const isNonMuslim = !isMuslim;
      const isScSt = cat === "SC" || cat === "ST";
      const isOBC = cat.toUpperCase().includes("OBC");
      const isUpperPrimary = ["V", "VI", "VII", "VIII", "5", "6", "7", "8"].includes(clsUpper);
      const isSecondary = ["IX", "X", "9", "10"].includes(clsUpper);
      const isHigherSec = ["XI", "XII", "11", "12"].includes(clsUpper);

      // Rule 1. Sikshashree (SC/ST students in Class 5-8 regardless of religion, no marks cutoff)
      if (isScSt && isUpperPrimary) {
        shikshashree++;
      }

      // Rules 2 & 3. OASIS (Pre & Post for Non-Muslim SC/ST/OBC in Class 9-12)
      if (isNonMuslim && (isScSt || isOBC) && (isSecondary || isHigherSec)) {
        oasis++;
      }

      // Rules 4 & 5. NSP (Pre & Post for Muslim students in Class 9-12)
      if (isMuslim && (isSecondary || isHigherSec)) {
        nsp++;
      }

      // Rule 6. SVMCM (Muslim students in Class 11 & 12)
      if (isMuslim && isHigherSec) {
        svmcm++;
      }

      // Sarathi (Class 9 only)
      if (["IX", "9"].includes(clsUpper)) {
        saboojSarathi++;
      }

      // CWSN
      if (s.is_cwsn === true) cwsn++;

      // Aadhaar verification
      const aadh = String(s.aadhaar || "").trim().replace(/\D/g, "");
      if (aadh.length === 12) {
        withAadhaar++;
      } else {
        withoutAadhaar++;
      }
    }

    return NextResponse.json({
      total: total || 0,
      boys: boys || 0,
      girls: girls || 0,
      statusCounts,
      classWiseCounts,
      categoryCounts,
      welfareStats: {
        kanyashreeK1,
        kanyashreeK2,
        totalKanyashree: kanyashreeK1 + kanyashreeK2,
        shikshashree,
        oasis,
        nsp,
        svmcm,
        saboojSarathi,
        cwsn,
        withAadhaar,
        withoutAadhaar,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load dashboard stats" }, { status: 500 });
  }
}
