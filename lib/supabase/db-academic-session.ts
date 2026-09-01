import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Student, StudentStatus } from "@/lib/types";

export const CLASS_NEXT: Record<string, string> = {
  V: "VI", VI: "VII", VII: "VIII", VIII: "IX",
  IX: "X", X: "XI", XI: "XII", XII: "XII",
};

export const AUTO_PASS_CLASSES = new Set(["V", "VI", "VII", "VIII"]);

export interface DetainedStudentInfo {
  id: string;
  name: string;
  presentClass: string;
  presentSection: string;
  presentRoll: number;
  percentage: number | null;
  marksObtained: number | null;
  reason: string;
}

export interface ClassReadinessStat {
  className: string;
  totalStudents: number;
  resultsEntered: number;
  passedCount: number;
  pendingCount: number;
  promotedCount: number;
  detainedCount: number;
  isAutoPass: boolean;
  isReady: boolean;
}

export interface SessionReadinessReport {
  currentYear: number;
  nextYear: number;
  minPassPercentage: number;
  totalStudents: number;
  totalEvaluated: number;
  totalPromoted: number;
  totalDetained: number;
  readinessPercentage: number;
  classes: ClassReadinessStat[];
  detainedStudents: DetainedStudentInfo[];
}

export interface SessionTransitionParams {
  fromYear: number;
  toYear: number;
  rollStrategy: "rank" | "preserve" | "alphabetical";
  examName?: string;
  minPassPercentage?: number;
  overriddenStudentIds?: string[];
}

export interface SessionTransitionResult {
  success: boolean;
  promotedCount: number;
  detainedCount: number;
  passedOutCount: number;
  archivedHistoryCount: number;
  classesProcessed: string[];
}

// 1. Get Session Readiness Audit
export async function dbGetSessionReadiness(
  currentYear = new Date().getFullYear(),
  examName = "Annual Examination",
  minPassPercentage = 30
): Promise<SessionReadinessReport> {
  const supabase = await createClient();

  // Fetch all active/continuing students
  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, name, present_class, present_section, present_roll, current_status")
    .eq("current_status", "Continuing");

  if (studentErr) throw new Error(studentErr.message);

  // Fetch results for the given year and exam
  const { data: results, error: resultsErr } = await supabase
    .from("student_results")
    .select("student_id, class, section, marks_obtained, percentage, rank_in_section")
    .eq("academic_year", currentYear)
    .eq("exam_name", examName);

  if (resultsErr) throw new Error(resultsErr.message);

  const resultsMap = new Map<string, any>();
  for (const r of results || []) {
    resultsMap.set(r.student_id, r);
  }

  // Group by class
  const classOrder = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const classMap = new Map<
    string,
    {
      total: number;
      evaluated: number;
      passed: number;
      promoted: number;
      detained: number;
    }
  >();

  for (const c of classOrder) {
    classMap.set(c, { total: 0, evaluated: 0, passed: 0, promoted: 0, detained: 0 });
  }

  const detainedStudents: DetainedStudentInfo[] = [];

  for (const s of students || []) {
    const c = (s.present_class || "").toUpperCase().trim();
    if (!classMap.has(c)) {
      classMap.set(c, { total: 0, evaluated: 0, passed: 0, promoted: 0, detained: 0 });
    }
    const stat = classMap.get(c)!;
    stat.total += 1;

    const res = resultsMap.get(s.id);
    if (res) {
      stat.evaluated += 1;
    }

    const isAutoPass = AUTO_PASS_CLASSES.has(c);
    if (isAutoPass) {
      // Classes 5 to 8: RTE Government Policy 100% Auto-Promotion
      stat.passed += 1;
      stat.promoted += 1;
    } else {
      // Classes 9, 10, 11, 12: Passing percentage check
      const studentPct = res ? Number(res.percentage) : null;
      if (studentPct !== null && studentPct >= minPassPercentage) {
        stat.passed += 1;
        stat.promoted += 1;
      } else {
        stat.detained += 1;
        detainedStudents.push({
          id: s.id,
          name: s.name,
          presentClass: s.present_class,
          presentSection: s.present_section,
          presentRoll: s.present_roll,
          percentage: studentPct,
          marksObtained: res ? Number(res.marks_obtained) : null,
          reason: !res
            ? "No exam marks recorded"
            : `Scored ${studentPct}% (Cutoff: ${minPassPercentage}%)`,
        });
      }
    }
  }

  const classes: ClassReadinessStat[] = Array.from(classMap.entries())
    .filter(([_, stat]) => stat.total > 0)
    .map(([className, stat]) => {
      const isAutoPass = AUTO_PASS_CLASSES.has(className);
      return {
        className,
        totalStudents: stat.total,
        resultsEntered: stat.evaluated,
        passedCount: stat.passed,
        pendingCount: Math.max(0, stat.total - stat.evaluated),
        promotedCount: stat.promoted,
        detainedCount: stat.detained,
        isAutoPass,
        isReady: isAutoPass ? true : stat.evaluated >= stat.total && stat.total > 0,
      };
    });

  const totalStudents = students?.length || 0;
  const totalEvaluated = resultsMap.size;
  const totalPromoted = classes.reduce((sum, c) => sum + c.promotedCount, 0);
  const totalDetained = classes.reduce((sum, c) => sum + c.detainedCount, 0);
  const readinessPercentage =
    totalStudents > 0 ? Math.round((totalEvaluated / totalStudents) * 100) : 0;

  return {
    currentYear,
    nextYear: currentYear + 1,
    minPassPercentage,
    totalStudents,
    totalEvaluated,
    totalPromoted,
    totalDetained,
    readinessPercentage,
    classes,
    detainedStudents,
  };
}

// 2. Execute Session Transition
export async function dbExecuteSessionTransition(
  params: SessionTransitionParams,
  performedByUserId: string
): Promise<SessionTransitionResult> {
  const supabase = createAdminClient();
  const {
    fromYear,
    toYear,
    rollStrategy,
    examName = "Annual Examination",
    minPassPercentage = 30,
    overriddenStudentIds = [],
  } = params;

  if (toYear <= fromYear) {
    throw new Error("Target academic year must be greater than current academic year.");
  }

  const overrideSet = new Set(overriddenStudentIds || []);

  // 1. Fetch all continuing students
  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("*")
    .eq("current_status", "Continuing");

  if (studentErr) throw new Error(studentErr.message);
  if (!students || students.length === 0) {
    throw new Error("No active continuing students found to transition.");
  }

  // 2. Fetch results for evaluation and rank-based roll assignment
  const resultsMap = new Map<string, { marks: number; percentage: number; rankInSection?: number }>();
  const { data: results } = await supabase
    .from("student_results")
    .select("student_id, marks_obtained, percentage, rank_in_section")
    .eq("academic_year", fromYear)
    .eq("exam_name", examName);

  if (results) {
    for (const r of results) {
      resultsMap.set(r.student_id, {
        marks: Number(r.marks_obtained),
        percentage: Number(r.percentage),
        rankInSection: r.rank_in_section ? Number(r.rank_in_section) : undefined,
      });
    }
  }

  // 3. Process students cohort by cohort
  let promotedCount = 0;
  let detainedCount = 0;
  let passedOutCount = 0;
  const historyInserts: any[] = [];
  const studentUpdates: { id: string; dbUpdates: any }[] = [];

  // Group cohorts by their target class and section for the new academic year
  // Map key: `${targetClass}_${targetSection}`
  const targetCohortGroups = new Map<string, { student: any; isPromoted: boolean; isDetained: boolean }[]>();

  for (const s of students) {
    const currClass = (s.present_class || "").toUpperCase().trim();
    const currSection = s.present_section || "A";
    const res = resultsMap.get(s.id);
    const pct = res ? res.percentage : 0;
    const isOverridden = overrideSet.has(s.id);

    if (currClass === "XII") {
      // Class XII: Passes out or detained
      const isEligible = pct >= minPassPercentage || isOverridden;
      if (isEligible) {
        passedOutCount++;
        historyInserts.push({
          student_id: s.id,
          year: fromYear,
          class: s.present_class,
          section: s.present_section,
          roll: s.present_roll,
          status: "Passed Out",
        });

        studentUpdates.push({
          id: s.id,
          dbUpdates: {
            current_status: "Passed Out",
            previous_class: s.present_class,
            previous_section: s.present_section,
            previous_roll_no: s.present_roll,
            academic_year: toYear,
          },
        });
      } else {
        // Detained in Class XII
        detainedCount++;
        const targetGroupKey = `XII_${currSection}`;
        if (!targetCohortGroups.has(targetGroupKey)) {
          targetCohortGroups.set(targetGroupKey, []);
        }
        targetCohortGroups.get(targetGroupKey)!.push({
          student: s,
          isPromoted: false,
          isDetained: true,
        });
      }
    } else {
      const isAutoPass = AUTO_PASS_CLASSES.has(currClass);
      const isEligible = isAutoPass || pct >= minPassPercentage || isOverridden;

      if (isEligible) {
        // Promoted to next class
        promotedCount++;
        const nextClass = CLASS_NEXT[currClass] || currClass;
        const targetGroupKey = `${nextClass}_${currSection}`;
        if (!targetCohortGroups.has(targetGroupKey)) {
          targetCohortGroups.set(targetGroupKey, []);
        }
        targetCohortGroups.get(targetGroupKey)!.push({
          student: s,
          isPromoted: true,
          isDetained: false,
        });
      } else {
        // Detained in same class
        detainedCount++;
        const targetGroupKey = `${currClass}_${currSection}`;
        if (!targetCohortGroups.has(targetGroupKey)) {
          targetCohortGroups.set(targetGroupKey, []);
        }
        targetCohortGroups.get(targetGroupKey)!.push({
          student: s,
          isPromoted: false,
          isDetained: true,
        });
      }
    }
  }

  // 4. Assign new rolls per cohort group based on rollStrategy
  for (const [groupKey, cohort] of targetCohortGroups.entries()) {
    const [targetClass, targetSection] = groupKey.split("_");

    // Sort cohort
    if (rollStrategy === "rank") {
      cohort.sort((a, b) => {
        const resA = resultsMap.get(a.student.id);
        const resB = resultsMap.get(b.student.id);
        const marksA = resA ? resA.marks : -1;
        const marksB = resB ? resB.marks : -1;
        if (marksB !== marksA) return marksB - marksA; // highest marks first
        return a.student.name.localeCompare(b.student.name);
      });
    } else if (rollStrategy === "alphabetical") {
      cohort.sort((a, b) => a.student.name.localeCompare(b.student.name));
    } else {
      // preserve: sort by previous roll
      cohort.sort((a, b) => (a.student.present_roll || 0) - (b.student.present_roll || 0));
    }

    // Assign rolls 1, 2, 3...
    cohort.forEach((item, idx) => {
      const s = item.student;
      const assignedRoll = rollStrategy === "preserve" ? (s.present_roll || idx + 1) : idx + 1;

      historyInserts.push({
        student_id: s.id,
        year: fromYear,
        class: s.present_class,
        section: s.present_section,
        roll: s.present_roll,
        status: "Continuing",
      });

      studentUpdates.push({
        id: s.id,
        dbUpdates: {
          present_class: targetClass,
          present_section: targetSection,
          present_roll: assignedRoll,
          current_status: "Continuing",
          previous_class: s.present_class,
          previous_section: s.present_section,
          previous_roll_no: s.present_roll,
          academic_year: toYear,
        },
      });
    });
  }

  // 5. Batch persist history entries in chunks of 100
  const CHUNK_SIZE = 100;
  for (let i = 0; i < historyInserts.length; i += CHUNK_SIZE) {
    const chunk = historyInserts.slice(i, i + CHUNK_SIZE);
    const { error: histErr } = await supabase.from("academic_history").insert(chunk);
    if (histErr) {
      console.warn("History batch insert notice:", histErr.message);
    }
  }

  // 6. Update students table in parallel batches
  const BATCH_SIZE = 25;
  for (let i = 0; i < studentUpdates.length; i += BATCH_SIZE) {
    const batch = studentUpdates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((item) =>
        supabase
          .from("students")
          .update(item.dbUpdates)
          .eq("id", item.id)
      )
    );
  }

  // 7. Audit Log
  await supabase.from("audit_log").insert({
    performed_by: performedByUserId,
    action: "SESSION_TRANSITION",
    table_name: "students",
    metadata: {
      fromYear,
      toYear,
      rollStrategy,
      minPassPercentage,
      overriddenCount: overriddenStudentIds.length,
      promotedCount,
      detainedCount,
      passedOutCount,
      totalProcessed: studentUpdates.length,
    },
  });

  return {
    success: true,
    promotedCount,
    detainedCount,
    passedOutCount,
    archivedHistoryCount: historyInserts.length,
    classesProcessed: Object.keys(CLASS_NEXT),
  };
}
