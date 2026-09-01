import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StudentStatus } from "@/lib/types";
import { normalizeSocialCategory } from "@/lib/utils/excel-parser";
import { calculateExactAge } from "@/lib/utils";

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
      { data: studentsData }
    ] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("gender", "Male"),
      supabase.from("students").select("*", { count: "exact", head: true }).eq("gender", "Female"),
      // Fetch core columns for comprehensive groupings
      supabase.from("students").select("current_status, present_class, gender, dob, social_category, minority_group, religion, is_bpl, is_cwsn, aadhaar")
    ]);

    const currentYear = new Date().getFullYear();

    // 1. Status grouping
    const statusCounts = (studentsData || []).reduce(
      (acc, s) => {
        const status = (s.current_status as StudentStatus) || "Continuing";
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {} as Record<StudentStatus, number>
    );

    // 2. Class-wise distribution
    const classWiseCounts = (studentsData || []).reduce(
      (acc, s) => {
        const cls = s.present_class || "Unknown";
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
    let aikyashree = 0;
    let medhashree = 0;
    let tarunerSwapno = 0;
    let saboojSarathi = 0;
    let bpl = 0;
    let cwsn = 0;
    let withAadhaar = 0;
    let withoutAadhaar = 0;

    for (const s of studentsData || []) {
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

      // Shikshashree (SC/ST students in Class 5-8)
      const isScSt = cat === "SC" || cat === "ST";
      const isUpperPrimary = ["V", "VI", "VII", "VIII", "5", "6", "7", "8"].includes(
        String(s.present_class || "").toUpperCase()
      );
      if (isScSt && isUpperPrimary) {
        shikshashree++;
      }

      // Aikyashree (Minority communities: Muslim, Christian, Buddhist, Sikh, Jain, Parsi)
      const rel = String(s.religion || "").toLowerCase();
      const minGroup = String(s.minority_group || "").toLowerCase();
      const isHindu = rel.includes("hindu") || rel.includes("sanatan");
      const isMinority =
        !isHindu &&
        (
          rel.includes("muslim") ||
          rel.includes("islam") ||
          rel.includes("christian") ||
          rel.includes("buddhist") ||
          rel.includes("sikh") ||
          rel.includes("jain") ||
          rel.includes("parsi") ||
          minGroup.includes("muslim") ||
          minGroup.includes("islam") ||
          minGroup.includes("christian") ||
          minGroup.includes("buddhist") ||
          minGroup.includes("sikh") ||
          minGroup.includes("jain") ||
          minGroup.includes("parsi")
        );
      if (isMinority) {
        aikyashree++;
      }

      // Medhashree (OBC in Class 5-8)
      const isOBC = cat.toUpperCase().includes("OBC");
      if (isOBC && isUpperPrimary) {
        medhashree++;
      }

      // Taruner Swapno (Class 11 & 12)
      const clsUpper = String(s.present_class || "").toUpperCase();
      if (["XI", "XII", "11", "12"].includes(clsUpper)) {
        tarunerSwapno++;
      }

      // Sabooj Sarathi (Class 9-12)
      if (["IX", "X", "XI", "XII", "9", "10", "11", "12"].includes(clsUpper)) {
        saboojSarathi++;
      }

      // BPL / CWSN
      if (s.is_bpl === true) bpl++;
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
        aikyashree,
        medhashree,
        tarunerSwapno,
        saboojSarathi,
        bpl,
        cwsn,
        withAadhaar,
        withoutAadhaar,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load dashboard stats" }, { status: 500 });
  }
}
