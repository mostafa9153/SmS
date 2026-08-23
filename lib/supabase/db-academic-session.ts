import { createClient } from "@/lib/supabase/server";
import type { Student, StudentStatus } from "@/lib/types";

const CLASS_NEXT: Record<string, string> = {
  V: "VI", VI: "VII", VII: "VIII", VIII: "IX",
  IX: "X", X: "XI", XI: "XII", XII: "XII",
};

export interface ClassReadinessStat {
  className: string;
  totalStudents: number;
  resultsEntered: number;
  passedCount: number;
  pendingCount: number;
  isReady: boolean;
}

export interface SessionReadinessReport {
  currentYear: number;
  nextYear: number;
  totalStudents: number;
  totalEvaluated: number;
  readinessPercentage: number;
  classes: ClassReadinessStat[];
}

export interface SessionTransitionParams {
  fromYear: number;
  toYear: number;
  rollStrategy: "rank" | "preserve" | "alphabetical";
  examName?: string;
}

export interface SessionTransitionResult {
  success: boolean;
  promotedCount: number;
  passedOutCount: number;
  archivedHistoryCount: number;
  classesProcessed: string[];
}

// 1. Get Session Readiness Audit
export async function dbGetSessionReadiness(
  currentYear = new Date().getFullYear(),
  examName = "Annual Examination"
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

  const evaluatedStudentIds = new Set((results || []).map((r) => r.student_id));

  // Group by class
  const classOrder = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const classMap = new Map<string, { total: number; evaluated: number; passed: number }>();

  for (const c of classOrder) {
    classMap.set(c, { total: 0, evaluated: 0, passed: 0 });
  }

  for (const s of students || []) {
    const c = (s.present_class || "").toUpperCase().trim();
    if (!classMap.has(c)) {
      classMap.set(c, { total: 0, evaluated: 0, passed: 0 });
    }
    const stat = classMap.get(c)!;
    stat.total += 1;
    if (evaluatedStudentIds.has(s.id)) {
      stat.evaluated += 1;
      stat.passed += 1;
    }
  }

  const classes: ClassReadinessStat[] = Array.from(classMap.entries())
    .filter(([_, stat]) => stat.total > 0)
    .map(([className, stat]) => ({
      className,
      totalStudents: stat.total,
      resultsEntered: stat.evaluated,
      passedCount: stat.passed,
      pendingCount: Math.max(0, stat.total - stat.evaluated),
      isReady: stat.evaluated >= stat.total && stat.total > 0,
    }));

  const totalStudents = students?.length || 0;
  const totalEvaluated = evaluatedStudentIds.size;
  const readinessPercentage = totalStudents > 0 ? Math.round((totalEvaluated / totalStudents) * 100) : 0;

  return {
    currentYear,
    nextYear: currentYear + 1,
    totalStudents,
    totalEvaluated,
    readinessPercentage,
    classes,
  };
}

// 2. Execute Session Transition
export async function dbExecuteSessionTransition(
  params: SessionTransitionParams,
  performedByUserId: string
): Promise<SessionTransitionResult> {
  const supabase = await createClient();
  const { fromYear, toYear, rollStrategy, examName = "Annual Examination" } = params;

  if (toYear <= fromYear) {
    throw new Error("Target academic year must be greater than current academic year.");
  }

  // 1. Fetch all continuing students
  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("*")
    .eq("current_status", "Continuing");

  if (studentErr) throw new Error(studentErr.message);
  if (!students || students.length === 0) {
    throw new Error("No active continuing students found to transition.");
  }

  // 2. Fetch results for rank-based roll assignment if strategy === 'rank'
  let resultsMap = new Map<string, { marks: number; rankInSection?: number }>();
  if (rollStrategy === "rank") {
    const { data: results } = await supabase
      .from("student_results")
      .select("student_id, marks_obtained, rank_in_section")
      .eq("academic_year", fromYear)
      .eq("exam_name", examName);

    if (results) {
      for (const r of results) {
        resultsMap.set(r.student_id, {
          marks: Number(r.marks_obtained),
          rankInSection: r.rank_in_section ? Number(r.rank_in_section) : undefined,
        });
      }
    }
  }

  // 3. Group students by target class and section to compute roll numbers
  // Process classes in reverse order (XII down to V)
  const classProcessOrder = ["XII", "XI", "X", "IX", "VIII", "VII", "VI", "V"];
  let promotedCount = 0;
  let passedOutCount = 0;
  let historyInserts: any[] = [];
  let studentUpdates: { id: string; dbUpdates: any }[] = [];

  for (const currClass of classProcessOrder) {
    const classStudents = students.filter((s) => s.present_class === currClass);
    if (classStudents.length === 0) continue;

    if (currClass === "XII") {
      // Class XII students graduate / Pass Out
      for (const s of classStudents) {
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
      }
    } else {
      // Class V through XI get promoted to next class
      const nextClass = CLASS_NEXT[currClass] || currClass;

      // Group by section for roll numbering
      const sectionGroups = new Map<string, any[]>();
      for (const s of classStudents) {
        const sec = s.present_section || "A";
        if (!sectionGroups.has(sec)) sectionGroups.set(sec, []);
        sectionGroups.get(sec)!.push(s);
      }

      for (const [section, sectionStudents] of sectionGroups.entries()) {
        // Sort students within section based on roll strategy
        if (rollStrategy === "rank") {
          sectionStudents.sort((a, b) => {
            const resA = resultsMap.get(a.id);
            const resB = resultsMap.get(b.id);
            const marksA = resA ? resA.marks : -1;
            const marksB = resB ? resB.marks : -1;
            if (marksB !== marksA) return marksB - marksA; // highest marks first
            return a.name.localeCompare(b.name);
          });
        } else if (rollStrategy === "alphabetical") {
          sectionStudents.sort((a, b) => a.name.localeCompare(b.name));
        } else {
          // preserve: sort by previous roll
          sectionStudents.sort((a, b) => (a.present_roll || 0) - (b.present_roll || 0));
        }

        // Assign new sequential roll numbers (1, 2, 3...)
        sectionStudents.forEach((s, idx) => {
          const assignedRoll = rollStrategy === "preserve" ? (s.present_roll || idx + 1) : idx + 1;
          promotedCount++;

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
              present_class: nextClass,
              present_section: section,
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
    }
  }

  // 4. Batch persist history entries
  if (historyInserts.length > 0) {
    const { error: histErr } = await supabase.from("academic_history").insert(historyInserts);
    if (histErr) {
      console.warn("History batch insert notice:", histErr.message);
    }
  }

  // 5. Update students table
  for (const item of studentUpdates) {
    await supabase
      .from("students")
      .update(item.dbUpdates)
      .eq("id", item.id);
  }

  // 6. Audit Log
  await supabase.from("audit_log").insert({
    performed_by: performedByUserId,
    action: "SESSION_TRANSITION",
    table_name: "students",
    metadata: {
      fromYear,
      toYear,
      rollStrategy,
      promotedCount,
      passedOutCount,
      totalProcessed: studentUpdates.length,
    },
  });

  return {
    success: true,
    promotedCount,
    passedOutCount,
    archivedHistoryCount: historyInserts.length,
    classesProcessed: classProcessOrder,
  };
}
