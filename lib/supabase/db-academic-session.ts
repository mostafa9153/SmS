import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Student, StudentStatus, Semester } from "@/lib/types";
import { evaluateStudentPromotionEligibility } from "@/lib/utils/marksheet-calc";
import { getSavedPromotionPolicy } from "@/lib/utils/marks-config";

export const SECONDARY_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X"];
export const HIGHER_SECONDARY_CLASSES = ["XI", "XII"];

export const SECONDARY_CLASS_NEXT: Record<string, string> = {
  V: "VI", VI: "VII", VII: "VIII", VIII: "IX", IX: "X",
};

export const HIGHER_SECONDARY_CLASS_NEXT: Record<string, string> = {
  XI: "XII",
};

export const CLASS_NEXT: Record<string, string> = {
  V: "VI", VI: "VII", VII: "VIII", VIII: "IX",
  IX: "X", XI: "XII",
};

export const AUTO_PASS_CLASSES = new Set(["V", "VI", "VII", "VIII"]);

export interface DetainedStudentInfo {
  id: string;
  name: string;
  presentClass: string;
  presentSection: string;
  presentRoll: number;
  presentSemester?: Semester | null;
  percentage: number | null;
  marksObtained: number | null;
  reason: string;
  failedSubjectNames?: string[];
  evaluatedStatus?: StudentStatus;
}

export interface ClassReadinessStat {
  className: string;
  totalStudents: number;
  resultsEntered: number;
  passedCount: number;
  pendingCount: number;
  promotedCount: number;
  sentToMpCount?: number;
  detainedCount: number;
  supplementaryCount?: number;
  compartmentalCount?: number;
  passedOutCount?: number;
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
  totalSentToMp?: number;
  totalDetained: number;
  totalSupplementary?: number;
  totalCompartmental?: number;
  totalPassedOut?: number;
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
  sentToMpCount: number;
  detainedCount: number;
  supplementaryCount?: number;
  compartmentalCount?: number;
  passedOutCount: number;
  archivedHistoryCount: number;
  classesProcessed: string[];
}

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
      sentToMpCount,
      detainedCount,
      passedOutCount,
      totalProcessed: studentUpdates.length,
    },
  });

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

// 3. Get Session Readiness Audit for Higher Secondary (Classes XI & XII)
export async function dbGetSessionReadinessHS(
  currentYear = new Date().getFullYear(),
  examName = "Annual Examination",
  minPassPercentage = 30
): Promise<SessionReadinessReport> {
  const supabase = await createClient();
  const policy = getSavedPromotionPolicy();

  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, name, present_class, present_section, present_roll, present_semester, current_status, detention_count")
    .eq("current_status", "Continuing");

  if (studentErr) throw new Error(studentErr.message);

  const { data: results, error: resultsErr } = await supabase
    .from("student_results")
    .select("student_id, class, section, roll, semester, marks_obtained, full_marks, percentage, rank_in_section, subject_marks")
    .eq("academic_year", currentYear)
    .eq("exam_name", examName);

  if (resultsErr) throw new Error(resultsErr.message);

  const resultsMap = new Map<string, any>();
  for (const r of results || []) {
    resultsMap.set(r.student_id, r);
  }

  const classOrder = HIGHER_SECONDARY_CLASSES;
  const classMap = new Map<
    string,
    {
      total: number;
      evaluated: number;
      passed: number;
      promoted: number;
      sentToMp: number;
      detained: number;
      supplementary: number;
      compartmental: number;
      passedOut: number;
    }
  >();

  for (const c of classOrder) {
    classMap.set(c, { total: 0, evaluated: 0, passed: 0, promoted: 0, sentToMp: 0, detained: 0, supplementary: 0, compartmental: 0, passedOut: 0 });
  }

  const detainedStudents: DetainedStudentInfo[] = [];

  for (const s of students || []) {
    const c = (s.present_class || "").toUpperCase().trim();
    if (!classMap.has(c)) continue;

    const stat = classMap.get(c)!;
    stat.total += 1;

    const res = resultsMap.get(s.id);
    if (res) stat.evaluated += 1;

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

    if (evaluation.eligibleStatus === "Promoted But Not Admitted" || evaluation.eligibleStatus === "Continuing") {
      stat.passed += 1;
      stat.promoted += 1;
    } else if (evaluation.eligibleStatus === "Passed Out") {
      stat.passed += 1;
      stat.passedOut += 1;
      stat.sentToMp += 1; // used for Passed Out in generic stats
    } else if (evaluation.eligibleStatus === "Supplementary") {
      stat.supplementary += 1;
      detainedStudents.push({
        id: s.id,
        name: s.name,
        presentClass: s.present_class,
        presentSection: s.present_section,
        presentRoll: s.present_roll,
        presentSemester: s.present_semester,
        percentage: res ? Number(res.percentage) : null,
        marksObtained: res ? Number(res.marks_obtained) : null,
        reason: evaluation.reason,
        failedSubjectNames: evaluation.failedSubjectNames,
        evaluatedStatus: "Supplementary",
      });
    } else if (evaluation.eligibleStatus === "Compartmental") {
      stat.compartmental += 1;
      detainedStudents.push({
        id: s.id,
        name: s.name,
        presentClass: s.present_class,
        presentSection: s.present_section,
        presentRoll: s.present_roll,
        presentSemester: s.present_semester,
        percentage: res ? Number(res.percentage) : null,
        marksObtained: res ? Number(res.marks_obtained) : null,
        reason: evaluation.reason,
        failedSubjectNames: evaluation.failedSubjectNames,
        evaluatedStatus: "Compartmental",
      });
    } else {
      // Detained / C.C.H.S.
      stat.detained += 1;
      detainedStudents.push({
        id: s.id,
        name: s.name,
        presentClass: s.present_class,
        presentSection: s.present_section,
        presentRoll: s.present_roll,
        presentSemester: s.present_semester,
        percentage: res ? Number(res.percentage) : null,
        marksObtained: res ? Number(res.marks_obtained) : null,
        reason: evaluation.reason,
        failedSubjectNames: evaluation.failedSubjectNames,
        evaluatedStatus: evaluation.eligibleStatus,
      });
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
      promotedCount: stat.promoted,
      sentToMpCount: stat.sentToMp,
      detainedCount: stat.detained,
      supplementaryCount: stat.supplementary,
      compartmentalCount: stat.compartmental,
      passedOutCount: stat.passedOut,
      isAutoPass: false,
      isReady: stat.evaluated >= stat.total && stat.total > 0,
    }));

  const hsStudents = (students || []).filter((s) => classMap.has((s.present_class || "").toUpperCase().trim()));
  const totalStudents = hsStudents.length;
  const totalEvaluated = classes.reduce((sum, c) => sum + c.resultsEntered, 0);
  const totalPromoted = classes.reduce((sum, c) => sum + c.promotedCount, 0);
  const totalSentToMp = classes.reduce((sum, c) => sum + (c.sentToMpCount || 0), 0);
  const totalDetained = classes.reduce((sum, c) => sum + c.detainedCount, 0);
  const totalSupplementary = classes.reduce((sum, c) => sum + (c.supplementaryCount || 0), 0);
  const totalCompartmental = classes.reduce((sum, c) => sum + (c.compartmentalCount || 0), 0);
  const totalPassedOut = classes.reduce((sum, c) => sum + (c.passedOutCount || 0), 0);
  const readinessPercentage = totalStudents > 0 ? Math.round((totalEvaluated / totalStudents) * 100) : 0;

  return {
    currentYear,
    nextYear: currentYear + 1,
    minPassPercentage,
    totalStudents,
    totalEvaluated,
    totalPromoted,
    totalSentToMp,
    totalDetained,
    totalSupplementary,
    totalCompartmental,
    totalPassedOut,
    readinessPercentage,
    classes,
    detainedStudents,
  };
}

// 4. Execute Session Transition for Higher Secondary (Classes XI & XII)
export async function dbExecuteSessionTransitionHS(
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
  let supplementaryCount = 0;
  let compartmentalCount = 0;
  let passedOutCount = 0;
  const historyInserts: any[] = [];
  const studentUpdates: { id: string; dbUpdates: any }[] = [];
  const targetCohortGroups = new Map<string, { student: any; targetClass: string; targetSemester: Semester | null; targetStatus: StudentStatus; isDetained: boolean; marks: number }[]>();

  for (const s of students) {
    const currClass = (s.present_class || "").toUpperCase().trim();
    const currSection = s.present_section || "A";

    if (!HIGHER_SECONDARY_CLASSES.includes(currClass)) continue;

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

    let targetStatus = evaluation.eligibleStatus;
    let targetClass = evaluation.targetClass;
    let targetSemester = evaluation.targetSemester ?? null;

    if (isOverridden) {
      if (currClass === "XI") {
        targetStatus = "Promoted But Not Admitted";
        targetClass = "XII";
        targetSemester = "Sem 3";
      } else {
        targetStatus = "Passed Out";
        targetClass = "XII";
        targetSemester = "Sem 4";
      }
    }

    if (targetStatus === "Passed Out") {
      passedOutCount++;
      sentToMpCount++;
      historyInserts.push({
        student_id: s.id,
        year: fromYear,
        class: s.present_class,
        section: s.present_section,
        roll: s.present_roll,
        status: "Passed Out",
        semester: s.present_semester || "Sem 4",
        detention_count: Number(s.detention_count) || 0,
      });
      studentUpdates.push({
        id: s.id,
        dbUpdates: {
          current_status: "Passed Out",
          present_semester: "Sem 4",
          previous_class: s.present_class,
          previous_section: s.present_section,
          previous_roll_no: s.present_roll,
          academic_year: String(fromYear),
        },
      });
    } else if (targetStatus === "Compartmental") {
      compartmentalCount++;
      historyInserts.push({
        student_id: s.id,
        year: fromYear,
        class: s.present_class,
        section: s.present_section,
        roll: s.present_roll,
        status: "Compartmental",
        semester: s.present_semester || "Sem 4",
        detention_count: Number(s.detention_count) || 0,
      });
      studentUpdates.push({
        id: s.id,
        dbUpdates: {
          current_status: "Compartmental",
          present_semester: "Sem 4",
          previous_class: s.present_class,
          previous_section: s.present_section,
          previous_roll_no: s.present_roll,
          academic_year: String(toYear),
        },
      });
    } else if (targetStatus === "Supplementary") {
      supplementaryCount++;
      historyInserts.push({
        student_id: s.id,
        year: fromYear,
        class: s.present_class,
        section: s.present_section,
        roll: s.present_roll,
        status: "Supplementary",
        semester: s.present_semester || "Sem 2",
        detention_count: Number(s.detention_count) || 0,
      });
      studentUpdates.push({
        id: s.id,
        dbUpdates: {
          current_status: "Supplementary",
          present_semester: "Sem 2",
          previous_class: s.present_class,
          previous_section: s.present_section,
          previous_roll_no: s.present_roll,
          academic_year: String(toYear),
        },
      });
    } else if (targetStatus === "Continuing" && (s.present_semester === "Sem 1" || s.present_semester === "Sem 3")) {
      // Direct in-place semester progression (Sem 1 -> Sem 2 or Sem 3 -> Sem 4)
      promotedCount++;
      historyInserts.push({
        student_id: s.id,
        year: fromYear,
        class: s.present_class,
        section: s.present_section,
        roll: s.present_roll,
        status: "Continuing",
        semester: s.present_semester,
        detention_count: Number(s.detention_count) || 0,
      });
      studentUpdates.push({
        id: s.id,
        dbUpdates: {
          current_status: "Continuing",
          present_semester: targetSemester,
          previous_class: s.present_class,
          previous_section: s.present_section,
          previous_roll_no: s.present_roll,
        },
      });
    } else {
      // Full cohort promotion or detention (XI Sem 2 -> XII Sem 3 or Detained)
      const isDetained = targetStatus === "Detained" || targetStatus === "C.C.H.S.";
      if (isDetained) {
        detainedCount++;
      } else {
        promotedCount++;
      }

      const targetGroupKey = `${targetClass}_${currSection}`;
      if (!targetCohortGroups.has(targetGroupKey)) {
        targetCohortGroups.set(targetGroupKey, []);
      }
      targetCohortGroups.get(targetGroupKey)!.push({
        student: s,
        targetClass,
        targetSemester,
        targetStatus,
        isDetained,
        marks: res ? Number(res.marks_obtained) : 0,
      });
    }
  }

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
        semester: s.present_semester || null,
        detention_count: currentDetention,
      });

      studentUpdates.push({
        id: s.id,
        dbUpdates: {
          present_class: targetClass,
          present_section: targetSection,
          present_roll: assignedRoll,
          present_semester: item.targetSemester,
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

  const CHUNK_SIZE = 100;
  for (let i = 0; i < historyInserts.length; i += CHUNK_SIZE) {
    const chunk = historyInserts.slice(i, i + CHUNK_SIZE);
    await supabase.from("academic_history").insert(chunk);
  }

  const BATCH_SIZE = 25;
  for (let i = 0; i < studentUpdates.length; i += BATCH_SIZE) {
    const batch = studentUpdates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((item) => supabase.from("students").update(item.dbUpdates).eq("id", item.id))
    );
  }

  await supabase.from("audit_log").insert({
    performed_by: performedByUserId,
    action: "SESSION_TRANSITION_HS",
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
      supplementaryCount,
      compartmentalCount,
      passedOutCount,
      totalProcessed: studentUpdates.length,
    },
  });

  return {
    success: true,
    promotedCount,
    sentToMpCount,
    detainedCount,
    supplementaryCount,
    compartmentalCount,
    passedOutCount,
    archivedHistoryCount: historyInserts.length,
    classesProcessed: HIGHER_SECONDARY_CLASSES,
  };
}
