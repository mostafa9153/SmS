import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentStatus, Semester } from "@/lib/types";

export interface StudentPromotionItem {
  studentId: string;
  currentClass: string;
  currentSection: string;
  currentRoll: number;
  currentSemester?: Semester | null;
  currentStatus: StudentStatus;
  targetClass: string;
  targetSection: string;
  targetRoll: number;
  targetSemester?: Semester | null;
  targetStatus: StudentStatus;
  isOverridden?: boolean;
  overrideReason?: string;
  evaluationReason?: string;
  marksObtained?: number;
  percentage?: number;
  failedSubjectNames?: string[];
}

export interface PromotionRequestBody {
  academicYear: number;
  targetAcademicYear: number;
  sourceClass: string;
  rollStrategy: "rank" | "preserve" | "alphabetical";
  examName?: string;
  promotions: StudentPromotionItem[];
}

// POST /api/students/promotion
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Staff or Admin can execute promotions
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData || (roleData.role !== "Admin" && roleData.role !== "Staff")) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body: PromotionRequestBody = await req.json();
    const {
      academicYear,
      targetAcademicYear,
      sourceClass,
      rollStrategy,
      examName = "Annual Examination",
      promotions = [],
    } = body;

    if (!academicYear || !targetAcademicYear || !sourceClass || !Array.isArray(promotions) || promotions.length === 0) {
      return NextResponse.json(
        { error: "Invalid request payload. Required: academicYear, targetAcademicYear, sourceClass, and promotions array." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 1. Fetch current student records to ensure valid IDs & current detention counts
    const studentIds = promotions.map((p) => p.studentId);
    const { data: existingStudents, error: fetchErr } = await adminClient
      .from("students")
      .select("id, name, present_class, present_section, present_roll, present_semester, current_status, detention_count")
      .in("id", studentIds);

    if (fetchErr) {
      return NextResponse.json({ error: `Failed to fetch students: ${fetchErr.message}` }, { status: 500 });
    }

    const existingMap = new Map<string, any>();
    for (const s of existingStudents || []) {
      existingMap.set(s.id, s);
    }

    // 2. Prepare Academic History Inserts & Student Updates
    const historyInserts: any[] = [];
    const studentUpdates: { id: string; dbUpdates: any }[] = [];

    let promotedCount = 0;
    let detainedCount = 0;
    let supplementaryCount = 0;
    let compartmentalCount = 0;
    let sentUpCount = 0;
    let passedOutCount = 0;
    let overriddenCount = 0;

    for (const p of promotions) {
      const existing = existingMap.get(p.studentId);
      if (!existing) continue;

      if (p.isOverridden) overriddenCount++;

      const isDetainedStatus =
        p.targetStatus === "Detained" ||
        p.targetStatus === "10th test fail" ||
        p.targetStatus === "C.C.H.S.";

      if (
        p.targetStatus === "Promoted But Not Admitted" ||
        p.targetStatus === "Continuing"
      ) {
        promotedCount++;
      } else if (p.targetStatus === "Sent Up M.P." || p.targetStatus === "Sent Up H.S.") {
        sentUpCount++;
      } else if (p.targetStatus === "Passed Out") {
        passedOutCount++;
      } else if (p.targetStatus === "Supplementary") {
        supplementaryCount++;
      } else if (p.targetStatus === "Compartmental") {
        compartmentalCount++;
      } else if (isDetainedStatus) {
        detainedCount++;
      }

      const currentDetentionCount = Number(existing.detention_count) || 0;
      const nextDetentionCount = isDetainedStatus ? currentDetentionCount + 1 : currentDetentionCount;

      // 2a. Archive history entry of the completed academic year / exam slot
      historyInserts.push({
        student_id: p.studentId,
        year: academicYear,
        class: existing.present_class,
        section: existing.present_section,
        roll: existing.present_roll,
        status: existing.current_status || "Continuing",
        semester: existing.present_semester || null,
        detention_count: currentDetentionCount,
      });

      // Maintain current academic year for active board exam / exited cohorts
      const resolvedYear =
        p.targetStatus === "Sent Up M.P." ||
        p.targetStatus === "10th test fail" ||
        p.targetStatus === "Passed Out"
          ? String(academicYear)
          : String(targetAcademicYear);

      // 2b. Prepare student profile updates
      const dbUpdates: any = {
        present_class: p.targetClass,
        present_section: p.targetSection,
        present_roll: p.targetRoll,
        current_status: p.targetStatus,
        re_admission_status: p.targetStatus === "Continuing" ? "admitted" : "pending",
        is_invoice_queued: false,
        previous_class: existing.present_class,
        previous_section: existing.present_section,
        previous_roll_no: existing.present_roll,
        academic_year: resolvedYear,
        detention_count: nextDetentionCount,
      };

      if (p.targetStatus === "Passed Out") {
        dbUpdates.present_semester = "Sem 4";
      } else if (p.targetSemester !== undefined) {
        dbUpdates.present_semester = p.targetSemester;
      }

      studentUpdates.push({
        id: p.studentId,
        dbUpdates,
      });
    }

    // 3. Batch insert academic history in chunks of 100
    const CHUNK_SIZE = 100;
    for (let i = 0; i < historyInserts.length; i += CHUNK_SIZE) {
      const chunk = historyInserts.slice(i, i + CHUNK_SIZE);
      const { error: histErr } = await adminClient.from("academic_history").insert(chunk);
      if (histErr) {
        console.warn("Academic history insert notice:", histErr.message);
      }
    }

    // 4. Batch update students in parallel batches of 25
    const BATCH_SIZE = 25;
    for (let i = 0; i < studentUpdates.length; i += BATCH_SIZE) {
      const batch = studentUpdates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (item) => {
          const { error } = await adminClient
            .from("students")
            .update(item.dbUpdates)
            .eq("id", item.id);
          if (error) {
            console.error("Student promotion update notice:", item.id, error.message);
            const safeUpdates = {
              present_class: item.dbUpdates.present_class,
              present_section: item.dbUpdates.present_section,
              present_roll: item.dbUpdates.present_roll,
              current_status: item.dbUpdates.current_status,
              re_admission_status: item.dbUpdates.re_admission_status,
              previous_class: item.dbUpdates.previous_class,
              previous_section: item.dbUpdates.previous_section,
              previous_roll_no: item.dbUpdates.previous_roll_no,
              academic_year: item.dbUpdates.academic_year,
            };
            const { error: fallbackErr } = await adminClient
              .from("students")
              .update(safeUpdates)
              .eq("id", item.id);
            if (fallbackErr) {
              console.error("Fallback student update error:", fallbackErr.message);
            }
          }
        })
      );
    }

    // 5. Audit Log
    await adminClient.from("audit_log").insert({
      performed_by: user.id,
      action: "PROMOTION_WIZARD_EXECUTE",
      table_name: "students",
      metadata: {
        sourceClass,
        academicYear,
        targetAcademicYear,
        examName,
        rollStrategy,
        totalProcessed: studentUpdates.length,
        promotedCount,
        detainedCount,
        supplementaryCount,
        compartmentalCount,
        sentUpCount,
        passedOutCount,
        overriddenCount,
      },
    });

    return NextResponse.json({
      success: true,
      count: studentUpdates.length,
      summary: {
        total: studentUpdates.length,
        promotedCount,
        detainedCount,
        supplementaryCount,
        compartmentalCount,
        sentUpCount,
        passedOutCount,
        overriddenCount,
      },
    });
  } catch (error: any) {
    console.error("Promotion execution API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute student promotion" },
      { status: 500 }
    );
  }
}
