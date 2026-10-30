import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StudentStatus } from "@/lib/types";
import { evaluateStudentPromotionEligibility } from "@/lib/utils/marksheet-calc";
import { getSavedPromotionPolicy } from "@/lib/utils/marks-config";
import { softWrite } from "@/lib/supabase/write";
import { AUTO_PASS_CLASSES, ClassReadinessStat, DetainedStudentInfo, SECONDARY_CLASSES, SECONDARY_CLASS_NEXT, SessionReadinessReport, SessionTransitionParams, SessionTransitionResult } from "@/lib/supabase/academic-session/types";

// 1. Get Session Readiness Audit for Secondary (Classes V to X)
export async function dbGetSessionReadiness(
  currentYear = new Date().getFullYear(),
  examName = "Annual Examination",
  minPassPercentage = 30
): Promise<SessionReadinessReport> {
  const supabase = await createClient();
  const policy = getSavedPromotionPolicy();

  // Fetch all active/continuing students
  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, name, present_class, present_section, present_roll, present_semester, current_status, detention_count")
    .eq("current_status", "Continuing");

  if (studentErr) throw new Error(studentErr.message);

  // Fetch results for the given year and exam
  const { data: results, error: resultsErr } = await supabase
    .from("student_results")
    .select("student_id, class, section, roll, marks_obtained, full_marks, percentage, rank_in_section, subject_marks")
    .eq("academic_year", currentYear)
    .eq("exam_name", examName);

  if (resultsErr) throw new Error(resultsErr.message);

  const resultsMap = new Map<string, any>();
  for (const r of results || []) {
    resultsMap.set(r.student_id, r);
  }

  const classOrder = SECONDARY_CLASSES;
  const classMap = new Map<
    string,
    {
      total: number;
      evaluated: number;
      passed: number;
      promoted: number;
      sentToMp: number;
      detained: number;
    }
  >();

  for (const c of classOrder) {
    classMap.set(c, { total: 0, evaluated: 0, passed: 0, promoted: 0, sentToMp: 0, detained: 0 });
  }

  const detainedStudents: DetainedStudentInfo[] = [];

  for (const s of students || []) {
    const c = (s.present_class || "").toUpperCase().trim();
    if (!classMap.has(c)) continue;

    const stat = classMap.get(c)!;
    stat.total += 1;

    const res = resultsMap.get(s.id);
    if (res) {
      stat.evaluated += 1;
    }

    const evaluation = evaluateStudentPromotionEligibility({
      studentId: s.id,
      studentName: s.name,
      currentClass: c,
      currentSemester: s.present_semester,
      academicYear: currentYear,
      examName,
      marksObtained: res ? Number(res.marks_obtained) : 0,
      fullMarks: res ? Number(res.full_marks) : undefined,
      subjectMarks: res?.subject_marks || {},
      policy: { ...policy, minPassPercentage },
    });

    if (evaluation.isAutoPass) {
      // Classes V–VIII (RTE Government Policy)
      stat.passed += 1;
      stat.promoted += 1;
    } else if (c === "X") {
      if (evaluation.eligibleStatus === "Sent Up M.P.") {
        stat.passed += 1;
        stat.sentToMp += 1;
      } else {
        stat.detained += 1;
        detainedStudents.push({
          id: s.id,
          name: s.name,
          presentClass: s.present_class,
          presentSection: s.present_section,
          presentRoll: s.present_roll,
          percentage: res ? Number(res.percentage) : null,
          marksObtained: res ? Number(res.marks_obtained) : null,
          reason: evaluation.reason || "Failed Selection Test",
          failedSubjectNames: evaluation.failedSubjectNames,
          evaluatedStatus: evaluation.eligibleStatus,
        });
      }
    } else {
      // Class IX
      if (evaluation.eligibleStatus === "Promoted But Not Admitted") {
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
          percentage: res ? Number(res.percentage) : null,
          marksObtained: res ? Number(res.marks_obtained) : null,
          reason: evaluation.reason || "Did not meet passing criteria",
          failedSubjectNames: evaluation.failedSubjectNames,
          evaluatedStatus: evaluation.eligibleStatus,
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
        sentToMpCount: stat.sentToMp,
        detainedCount: stat.detained,
        isAutoPass,
        isReady: isAutoPass ? true : stat.evaluated >= stat.total && stat.total > 0,
      };
    });

  const secondaryStudents = (students || []).filter((s) =>
    classMap.has((s.present_class || "").toUpperCase().trim())
  );
  const totalStudents = secondaryStudents.length;
  const totalEvaluated = classes.reduce((sum, c) => sum + c.resultsEntered, 0);
  const totalPromoted = classes.reduce((sum, c) => sum + c.promotedCount, 0);
  const totalSentToMp = classes.reduce((sum, c) => sum + (c.sentToMpCount || 0), 0);
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
    totalSentToMp,
    totalDetained,
    readinessPercentage,
    classes,
    detainedStudents,
  };
}

// 2. Execute Session Transition for Secondary (Classes V to X)
export async function dbExecuteSessionTransition(
  params: SessionTransitionParams,
  performedByUserId: string
): Promise<SessionTransitionResult> {
  const supabase = createAdminClient();
  const policy = getSavedPromotionPolicy();
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

  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("*")
    .eq("current_status", "Continuing");

  if (studentErr) throw new Error(studentErr.message);
  if (!students || students.length === 0) {
    throw new Error("No active continuing students found to transition.");
  }

  const resultsMap = new Map<string, any>();
  const { data: results } = await supabase
    .from("student_results")
    .select("*")
    .eq("academic_year", fromYear)
    .eq("exam_name", examName);

  if (results) {
    for (const r of results) {
      resultsMap.set(r.student_id, r);
    }
  }

  let promotedCount = 0;
  let sentToMpCount = 0;
  let detainedCount = 0;
  const passedOutCount = 0;
  const historyInserts: any[] = [];
  const studentUpdates: { id: string; dbUpdates: any }[] = [];

  const targetCohortGroups = new Map<string, { student: any; targetClass: string; targetStatus: StudentStatus; isDetained: boolean; marks: number }[]>();

  for (const s of students) {
    const currClass = (s.present_class || "").toUpperCase().trim();
    const currSection = s.present_section || "A";

    if (!SECONDARY_CLASSES.includes(currClass)) continue;

    const res = resultsMap.get(s.id);
    const isOverridden = overrideSet.has(s.id);

    const evaluation = evaluateStudentPromotionEligibility({
      studentId: s.id,
      studentName: s.name,
      currentClass: currClass,
      currentSemester: s.present_semester,
      academicYear: fromYear,
      examName,
      marksObtained: res ? Number(res.marks_obtained) : 0,
      fullMarks: res ? Number(res.full_marks) : undefined,
      subjectMarks: res?.subject_marks || {},
      policy: { ...policy, minPassPercentage },
    });

    const isPassed = evaluation.isAutoPass || evaluation.eligibleStatus === "Promoted But Not Admitted" || evaluation.eligibleStatus === "Sent Up M.P." || isOverridden;

    if (currClass === "X") {
      if (isPassed) {
        sentToMpCount++;
        historyInserts.push({
          student_id: s.id,
          year: fromYear,
          class: s.present_class,
          section: s.present_section,
          roll: s.present_roll,
          status: "Sent Up M.P.",
          semester: null,
          detention_count: Number(s.detention_count) || 0,
        });

        studentUpdates.push({
          id: s.id,
          dbUpdates: {
            current_status: "Sent Up M.P.",
            previous_class: s.present_class,
            previous_section: s.present_section,
            previous_roll_no: s.present_roll,
            academic_year: String(fromYear),
          },
        });
      } else {
        detainedCount++;
        const nextDetention = (Number(s.detention_count) || 0) + 1;
        historyInserts.push({
          student_id: s.id,
          year: fromYear,
          class: s.present_class,
          section: s.present_section,
          roll: s.present_roll,
          status: "10th test fail",
          semester: null,
          detention_count: Number(s.detention_count) || 0,
        });

        studentUpdates.push({
          id: s.id,
          dbUpdates: {
            current_status: "10th test fail",
            detention_count: nextDetention,
            previous_class: s.present_class,
            previous_section: s.present_section,
            previous_roll_no: s.present_roll,
            academic_year: String(fromYear),
          },
        });
      }
    } else {
      // Classes V to IX
      if (isPassed) {
        promotedCount++;
        const nextClass = SECONDARY_CLASS_NEXT[currClass] || currClass;
        const targetGroupKey = `${nextClass}_${currSection}`;
        if (!targetCohortGroups.has(targetGroupKey)) {
          targetCohortGroups.set(targetGroupKey, []);
        }
        targetCohortGroups.get(targetGroupKey)!.push({
          student: s,
          targetClass: nextClass,
          targetStatus: "Promoted But Not Admitted",
          isDetained: false,
          marks: res ? Number(res.marks_obtained) : 0,
        });
      } else {
        detainedCount++;
        const targetGroupKey = `${currClass}_${currSection}`;
        if (!targetCohortGroups.has(targetGroupKey)) {
          targetCohortGroups.set(targetGroupKey, []);
        }
        targetCohortGroups.get(targetGroupKey)!.push({
          student: s,
          targetClass: currClass,
          targetStatus: "Detained",
          isDetained: true,
          marks: res ? Number(res.marks_obtained) : 0,
        });
      }
    }
  }

  // Assign new roll numbers per cohort group
  for (const [groupKey, cohort] of targetCohortGroups.entries()) {
    const [targetClass, targetSection] = groupKey.split("_");

    if (rollStrategy === "rank") {
      cohort.sort((a, b) => {
        if (b.marks !== a.marks) return b.marks - a.marks;
        const nameCmp = a.student.name.localeCompare(b.student.name);
        if (nameCmp !== 0) return nameCmp;
        const rollA = Number(a.student.present_roll) || 0;
        const rollB = Number(b.student.present_roll) || 0;
        if (rollA !== rollB) return rollA - rollB;
        return a.student.id.localeCompare(b.student.id);
      });
    } else if (rollStrategy === "alphabetical") {
      cohort.sort((a, b) => {
        const nameCmp = a.student.name.localeCompare(b.student.name);
        if (nameCmp !== 0) return nameCmp;
        return (Number(a.student.present_roll) || 0) - (Number(b.student.present_roll) || 0);
      });
    } else {
      cohort.sort((a, b) => (Number(a.student.present_roll) || 0) - (Number(b.student.present_roll) || 0));
    }

    cohort.forEach((item, idx) => {
      const s = item.student;
      const assignedRoll = rollStrategy === "preserve" ? (Number(s.present_roll) || idx + 1) : idx + 1;
      const currentDetention = Number(s.detention_count) || 0;
      const nextDetention = item.isDetained ? currentDetention + 1 : currentDetention;

      historyInserts.push({
        student_id: s.id,
        year: fromYear,
        class: s.present_class,
        section: s.present_section,
        roll: s.present_roll,
        status: s.current_status || "Continuing",
        semester: null,
        detention_count: currentDetention,
      });

      studentUpdates.push({
        id: s.id,
        dbUpdates: {
          present_class: targetClass,
          present_section: targetSection,
          present_roll: assignedRoll,
          current_status: item.targetStatus,
          previous_class: s.present_class,
          previous_section: s.present_section,
          previous_roll_no: s.present_roll,
          academic_year: String(toYear),
          detention_count: nextDetention,
        },
      });
    });
  }

  // Batch insert history entries in chunks of 100
  const CHUNK_SIZE = 100;
  for (let i = 0; i < historyInserts.length; i += CHUNK_SIZE) {
    const chunk = historyInserts.slice(i, i + CHUNK_SIZE);
    const { error: histErr } = await supabase.from("academic_history").insert(chunk);
    if (histErr) console.warn("History insert notice:", histErr.message);
  }

  // Batch update students in parallel batches of 25
  const BATCH_SIZE = 25;
  for (let i = 0; i < studentUpdates.length; i += BATCH_SIZE) {
    const batch = studentUpdates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((item) =>
        supabase.from("students").update(item.dbUpdates).eq("id", item.id)
      )
    );
  }

  // Audit Log
  await softWrite(supabase.from("audit_log").insert({
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
      sentToMpCount,
      detainedCount,
      passedOutCount,
      totalProcessed: studentUpdates.length,
    },
  }), "audit_log insert");

  return {
    success: true,
    promotedCount,
    sentToMpCount,
    detainedCount,
    passedOutCount,
    archivedHistoryCount: historyInserts.length,
    classesProcessed: SECONDARY_CLASSES,
  };
}
