import type { StudentResult, StudentStatus, Semester, SubjectMarksMap } from "@/lib/types";
import { PromotionPolicy, getSavedPromotionPolicy } from "@/lib/utils/marks-config";
import { getClassScheme, getStandardSubjectsForClass, normalizeSubjectName } from "@/lib/utils/marksheet/grading";

// ============================================================================
// Automatic Promotion & Lifecycle Status Evaluation Engine
// ============================================================================

export interface SubjectEvaluationDetail {
  subjectName: string;
  theoryMarks?: number;
  theoryFullMarks?: number;
  theoryPassPercentage: number;
  theoryPassed: boolean;
  practicalMarks?: number;
  practicalFullMarks?: number;
  practicalPassPercentage: number;
  practicalPassed: boolean;
  totalMarks: number;
  totalFullMarks: number;
  totalPercentage: number;
  isPassed: boolean;
  isCompulsory: boolean;
  supplementaryTheory?: number;
  supplementaryPractical?: number;
  supplementaryTotal?: number;
  isSupplementaryCleared?: boolean;
}

export interface StudentPromotionEvaluation {
  studentId: string;
  studentName?: string;
  currentClass: string;
  currentSemester?: Semester | null;
  academicYear: number;
  eligibleStatus: StudentStatus;
  targetClass: string;
  targetSemester?: Semester | null;
  targetStudentType: "active" | "pending" | "old";
  isAutoPass: boolean;
  totalMarksObtained: number;
  totalFullMarks: number;
  overallPercentage: number;
  passedSubjectsCount: number;
  failedSubjectsCount: number;
  failedSubjectNames: string[];
  compulsoryPassed: boolean;
  subjectDetails: SubjectEvaluationDetail[];
  reason: string;
}

/**
 * Evaluates a student's marks and determines their next promotion status,
 * target class, target semester, and student register section (Active, Pending, or Old).
 */
export function evaluateStudentPromotionEligibility(params: {
  studentId: string;
  studentName?: string;
  currentClass: string;
  currentSemester?: Semester | null;
  academicYear: number;
  examName?: string;
  marksObtained: number;
  fullMarks?: number;
  subjectMarks?: SubjectMarksMap;
  hasRecordedMarks?: boolean;
  historicalSemesterResults?: {
    sem1?: StudentResult | null;
    sem2?: StudentResult | null;
    sem3?: StudentResult | null;
    sem4?: StudentResult | null;
  };
  policy?: PromotionPolicy;
}): StudentPromotionEvaluation {
  const policy = params.policy || getSavedPromotionPolicy();
  const normClass = (params.currentClass || "V").toUpperCase().trim().replace(/^CLASS\s+/i, "");
  const digitMap: Record<string, string> = {
    "5": "V", "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X", "11": "XI", "12": "XII",
  };
  const standardClass = digitMap[normClass] || normClass;
  const currentSemester = params.currentSemester || null;
  const examName = params.examName || "Annual Examination";

  const nextClassMap: Record<string, string> = {
    V: "VI", VI: "VII", VII: "VIII", VIII: "IX", IX: "X", X: "XI", XI: "XII", XII: "Passed Out",
  };
  const targetClass = nextClassMap[standardClass] || standardClass;

  // 1. RTE Auto-Pass Classes (Class V - VIII)
  const isAutoPassClass = policy.autoPassClasses.includes(standardClass);
  if (isAutoPassClass) {
    return {
      studentId: params.studentId,
      studentName: params.studentName,
      currentClass: standardClass,
      currentSemester: null,
      academicYear: params.academicYear,
      eligibleStatus: "Promoted But Not Admitted",
      targetClass,
      targetSemester: null,
      targetStudentType: "pending",
      isAutoPass: true,
      totalMarksObtained: params.marksObtained,
      totalFullMarks: params.fullMarks || 500,
      overallPercentage: params.fullMarks ? Number(((params.marksObtained / params.fullMarks) * 100).toFixed(2)) : 100,
      passedSubjectsCount: 0,
      failedSubjectsCount: 0,
      failedSubjectNames: [],
      compulsoryPassed: true,
      subjectDetails: [],
      reason: "RTE Act Government Policy: 100% Auto-Promotion to Next Higher Class.",
    };
  }

  // 1b. If no exam marks are recorded for this student in the selected evaluation exam
  if (params.hasRecordedMarks === false) {
    return {
      studentId: params.studentId,
      studentName: params.studentName,
      currentClass: standardClass,
      currentSemester: currentSemester,
      academicYear: params.academicYear,
      eligibleStatus: "Continuing",
      targetClass: standardClass,
      targetSemester: currentSemester,
      targetStudentType: "active",
      isAutoPass: false,
      totalMarksObtained: 0,
      totalFullMarks: params.fullMarks || 500,
      overallPercentage: 0,
      passedSubjectsCount: 0,
      failedSubjectsCount: 0,
      failedSubjectNames: [],
      compulsoryPassed: true,
      subjectDetails: [],
      reason: "No marks recorded for selected evaluation exam. Active continuing status preserved.",
    };
  }

  // 2. Class Scheme & Subject Breakdown Analysis
  const scheme = getClassScheme(standardClass);
  const configuredSubjects = scheme.subjects && scheme.subjects.length > 0
    ? scheme.subjects
    : getStandardSubjectsForClass(standardClass);

  const subjectDetails: SubjectEvaluationDetail[] = [];
  const failedSubjectNames: string[] = [];
  let compulsoryPassed = true;

  const rawSubjectMarks = params.subjectMarks || {};
  const hasSubjectMarks = Object.keys(rawSubjectMarks).length > 0;

  if (hasSubjectMarks) {
    for (const subName of configuredSubjects) {
      // Find mark in subjectMarks
      let rawVal: any = undefined;
      for (const [k, v] of Object.entries(rawSubjectMarks)) {
        if (normalizeSubjectName(k) === normalizeSubjectName(subName) || k.toLowerCase().trim() === subName.toLowerCase().trim()) {
          rawVal = v;
          break;
        }
      }

      const isCompulsory = policy.compulsorySubjects.some((comp) =>
        normalizeSubjectName(comp) === normalizeSubjectName(subName)
      );

      // Resolve full marks per subject for this class
      const subFullWritten = scheme.annualWritten || 90;
      const subFullPractical = scheme.annualPractical || 10;
      const subTotalFull = subFullWritten + subFullPractical;

      let tMarks = 0;
      let pMarks = 0;
      let totalMarks = 0;
      let hasBreakdown = false;
      let suppTheory: number | undefined = undefined;
      let suppPractical: number | undefined = undefined;
      let suppTotal: number | undefined = undefined;
      let isSupplementaryCleared = false;

      if (rawVal !== undefined && rawVal !== null) {
        if (typeof rawVal === "object") {
          tMarks = Number(rawVal.theory ?? rawVal.periodic ?? rawVal.written ?? 0);
          pMarks = Number(rawVal.practical ?? rawVal.preparatory ?? rawVal.project ?? 0);
          totalMarks = Number(rawVal.total ?? (tMarks + pMarks));
          hasBreakdown = true;

          if (rawVal.supplementaryTheory !== undefined || rawVal.supplementaryPractical !== undefined || rawVal.supplementaryTotal !== undefined) {
            suppTheory = rawVal.supplementaryTheory !== undefined && rawVal.supplementaryTheory !== "" ? Number(rawVal.supplementaryTheory) : undefined;
            suppPractical = rawVal.supplementaryPractical !== undefined && rawVal.supplementaryPractical !== "" ? Number(rawVal.supplementaryPractical) : undefined;
            suppTotal = rawVal.supplementaryTotal !== undefined && rawVal.supplementaryTotal !== ""
              ? Number(rawVal.supplementaryTotal)
              : (suppTheory !== undefined || suppPractical !== undefined)
              ? (Number(suppTheory ?? tMarks) + Number(suppPractical ?? pMarks))
              : undefined;
          }
        } else {
          totalMarks = Number(rawVal) || 0;
        }
      }

      const theoryPercentage = subFullWritten > 0 ? (tMarks / subFullWritten) * 100 : 100;
      const practicalPercentage = subFullPractical > 0 ? (pMarks / subFullPractical) * 100 : 100;
      const totalPercentage = subTotalFull > 0 ? (totalMarks / subTotalFull) * 100 : 100;

      let isPassed = false;
      let theoryPassed = true;
      let practicalPassed = true;

      const reqSubjectPassPct = policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30;
      const reqTheoryPassPct = policy.theoryPassPercentage ?? 30;
      const reqPracticalPassPct = policy.practicalPassPercentage ?? 30;

      if (hasBreakdown) {
        theoryPassed = theoryPercentage >= reqTheoryPassPct;
        practicalPassed = practicalPercentage >= reqPracticalPassPct;
        isPassed = theoryPassed && practicalPassed && totalPercentage >= reqSubjectPassPct;
      } else {
        isPassed = totalPercentage >= reqSubjectPassPct;
      }

      // Check if supplementary / re-test marks clear the subject failure
      if (!isPassed && (suppTheory !== undefined || suppPractical !== undefined || suppTotal !== undefined)) {
        const evalSuppT = suppTheory !== undefined ? suppTheory : tMarks;
        const evalSuppP = suppPractical !== undefined ? suppPractical : pMarks;
        const evalSuppTot = suppTotal !== undefined ? suppTotal : (evalSuppT + evalSuppP);

        const suppTPct = subFullWritten > 0 ? (evalSuppT / subFullWritten) * 100 : 100;
        const suppPPct = subFullPractical > 0 ? (evalSuppP / subFullPractical) * 100 : 100;
        const suppTotPct = subTotalFull > 0 ? (evalSuppTot / subTotalFull) * 100 : 100;

        const sTPassed = suppTPct >= reqTheoryPassPct;
        const sPPassed = suppPPct >= reqPracticalPassPct;
        const sTotPassed = suppTotPct >= reqSubjectPassPct;

        if (sTPassed && sPPassed && sTotPassed) {
          isPassed = true;
          theoryPassed = true;
          practicalPassed = true;
          isSupplementaryCleared = true;
          tMarks = evalSuppT;
          pMarks = evalSuppP;
          totalMarks = evalSuppTot;
        }
      }

      if (!isPassed) {
        failedSubjectNames.push(subName);
        if (isCompulsory) {
          compulsoryPassed = false;
        }
      }

      subjectDetails.push({
        subjectName: subName,
        theoryMarks: hasBreakdown ? tMarks : undefined,
        theoryFullMarks: hasBreakdown ? subFullWritten : undefined,
        theoryPassPercentage: reqTheoryPassPct,
        theoryPassed,
        practicalMarks: hasBreakdown ? pMarks : undefined,
        practicalFullMarks: hasBreakdown ? subFullPractical : undefined,
        practicalPassPercentage: reqPracticalPassPct,
        practicalPassed,
        totalMarks,
        totalFullMarks: subTotalFull,
        totalPercentage: Number((subTotalFull > 0 ? (totalMarks / subTotalFull) * 100 : 100).toFixed(2)),
        isPassed,
        isCompulsory,
        supplementaryTheory: suppTheory,
        supplementaryPractical: suppPractical,
        supplementaryTotal: suppTotal,
        isSupplementaryCleared,
      });
    }
  }

  const annualWrittenFull = scheme.annualWritten ?? scheme.evenSemesterMarks ?? 50;
  const annualPracticalFull = scheme.annualPractical ?? 0;
  const fullMarks = params.fullMarks || (scheme.subjectCount * (annualWrittenFull + annualPracticalFull)) || 500;
  const overallPercentage = fullMarks > 0 ? Number(((params.marksObtained / fullMarks) * 100).toFixed(2)) : 0;
  const passedSubjectsCount = configuredSubjects.length - failedSubjectNames.length;
  const failedSubjectsCount = failedSubjectNames.length;

  // Pass evaluation flags (strictly based on subject-level pass + compulsory rules)
  const passedSubjectCountRequirement = policy.requireFiveSubjectsPass
    ? passedSubjectsCount >= Math.min(5, configuredSubjects.length)
    : failedSubjectsCount === 0;
  const overallPassed = hasSubjectMarks
    ? passedSubjectCountRequirement && compulsoryPassed
    : overallPercentage >= (policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30);

  // 3. Class IX Evaluation
  if (standardClass === "IX") {
    if (overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "IX",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "Promoted But Not Admitted",
        targetClass: "X",
        targetSemester: null,
        targetStudentType: "pending",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Passed Class IX Annual Examination. Eligible for Class X Re-Admission.",
      };
    } else {
      const failReason = !compulsoryPassed
        ? "Failed in compulsory language subject(s)"
        : !passedSubjectCountRequirement
        ? `Passed only ${passedSubjectsCount} subjects (5 required)`
        : `Failed in ${failedSubjectsCount} subject(s)`;

      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "IX",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "Detained",
        targetClass: "IX",
        targetSemester: null,
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: `Detained in Class IX: ${failReason}.`,
      };
    }
  }

  // 4. Class X (Selection / Test Exam - November)
  if (standardClass === "X") {
    if (overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "X",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "Sent Up M.P.",
        targetClass: "X",
        targetSemester: null,
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Passed Madhyamik Selection Test Exam. Sent Up for Madhyamik Pariksha.",
      };
    } else {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "X",
        currentSemester: null,
        academicYear: params.academicYear,
        eligibleStatus: "10th test fail",
        targetClass: "X",
        targetSemester: null,
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: `Failed Madhyamik Selection Test Exam (${overallPercentage}%). Detained / Needs Re-test.`,
      };
    }
  }

  // 5. Class XI (Higher Secondary - Semester 1 & Semester 2)
  if (standardClass === "XI") {
    const isSem1Exam =
      examName.toLowerCase().includes("sem 1") ||
      examName.toLowerCase().includes("semester 1") ||
      (currentSemester === "Sem 1" &&
        !examName.toLowerCase().includes("sem 2") &&
        !examName.toLowerCase().includes("semester 2") &&
        !examName.toLowerCase().includes("annual"));

    // Semester 1 -> Semester 2: In-place direct progression
    if (isSem1Exam) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 1",
        academicYear: params.academicYear,
        eligibleStatus: "Continuing",
        targetClass: "XI",
        targetSemester: "Sem 2",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Completed Semester 1. Direct in-place advancement to Semester 2 (No re-admission required).",
      };
    }

    // Semester 2: Comprehensive evaluation across Sem 1 & Sem 2
    // Combine unique failed subjects across Sem 1 and Sem 2
    const allUniqueFailedSubjects = new Set<string>(failedSubjectNames);
    if (params.historicalSemesterResults?.sem1?.subjectMarks) {
      const s1Marks = params.historicalSemesterResults.sem1.subjectMarks;
      for (const sub of configuredSubjects) {
        const val = s1Marks[sub] || s1Marks[normalizeSubjectName(sub)];
        const semPassPct = policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30;
        if (typeof val === "number" && val < (50 * (semPassPct / 100))) {
          allUniqueFailedSubjects.add(sub);
        }
      }
    }

    const uniqueFailedList = Array.from(allUniqueFailedSubjects);
    const uniqueFailedCount = uniqueFailedList.length;

    if (uniqueFailedCount === 0 && overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 2",
        academicYear: params.academicYear,
        eligibleStatus: "Promoted But Not Admitted",
        targetClass: "XII",
        targetSemester: "Sem 3",
        targetStudentType: "pending",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: 0,
        failedSubjectNames: [],
        compulsoryPassed: true,
        subjectDetails,
        reason: "Cleared Class XI (Sem 1 & Sem 2). Promoted to Class XII (Sem 3) - Pending Re-Admission.",
      };
    } else if (uniqueFailedCount >= 1 && uniqueFailedCount <= policy.class11MaxSupplementarySubjects) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 2",
        academicYear: params.academicYear,
        eligibleStatus: "Supplementary",
        targetClass: "XI",
        targetSemester: "Sem 2",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `Supplementary in ${uniqueFailedCount} subject(s): ${uniqueFailedList.join(", ")}. Eligible to appear for Supplementary examination.`,
      };
    } else {
      const failReason = uniqueFailedCount > 0
        ? `Failed in ${uniqueFailedCount} subjects (${uniqueFailedList.join(", ")})`
        : `Overall score ${overallPercentage}% is below required ${policy.minPassPercentage}%`;

      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XI",
        currentSemester: "Sem 2",
        academicYear: params.academicYear,
        eligibleStatus: "Detained",
        targetClass: "XI",
        targetSemester: "Sem 1",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `Detained in Class XI (Year Back): ${failReason}.`,
      };
    }
  }

  // 6. Class XII (Higher Secondary - Semester 3 & Semester 4)
  if (standardClass === "XII") {
    const isSem3Exam =
      examName.toLowerCase().includes("sem 3") ||
      examName.toLowerCase().includes("semester 3") ||
      (currentSemester === "Sem 3" &&
        !examName.toLowerCase().includes("sem 4") &&
        !examName.toLowerCase().includes("semester 4") &&
        !examName.toLowerCase().includes("annual") &&
        !examName.toLowerCase().includes("selection"));

    // Semester 3 -> Semester 4: In-place direct progression
    if (isSem3Exam) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 3",
        academicYear: params.academicYear,
        eligibleStatus: "Continuing",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount,
        failedSubjectNames,
        compulsoryPassed,
        subjectDetails,
        reason: "Completed Semester 3. Direct in-place advancement to Semester 4.",
      };
    }

    // Semester 4: Final Board Examination Evaluation across Sem 3 & Sem 4
    const allUniqueFailedSubjects = new Set<string>(failedSubjectNames);
    if (params.historicalSemesterResults?.sem3?.subjectMarks) {
      const s3Marks = params.historicalSemesterResults.sem3.subjectMarks;
      for (const sub of configuredSubjects) {
        const val = s3Marks[sub] || s3Marks[normalizeSubjectName(sub)];
        const semPassPct = policy.subjectPassPercentage ?? policy.minPassPercentage ?? 30;
        if (typeof val === "number" && val < (50 * (semPassPct / 100))) {
          allUniqueFailedSubjects.add(sub);
        }
      }
    }

    const uniqueFailedList = Array.from(allUniqueFailedSubjects);
    const uniqueFailedCount = uniqueFailedList.length;

    if (uniqueFailedCount === 0 && overallPassed) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 4",
        academicYear: params.academicYear,
        eligibleStatus: "Passed Out",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "old",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: 0,
        failedSubjectNames: [],
        compulsoryPassed: true,
        subjectDetails,
        reason: "Successfully cleared Higher Secondary Examination (WBCHSE). Graduated / Passed Out.",
      };
    } else if (uniqueFailedCount >= 1 && uniqueFailedCount <= policy.class12MaxCompartmentalSubjects) {
      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 4",
        academicYear: params.academicYear,
        eligibleStatus: "Compartmental",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `Compartmental candidate in ${uniqueFailedCount} subject(s): ${uniqueFailedList.join(", ")}. Eligible for Board Compartmental Examination.`,
      };
    } else {
      const failReason = uniqueFailedCount > 0
        ? `Failed in ${uniqueFailedCount} subjects (${uniqueFailedList.join(", ")})`
        : `Overall score ${overallPercentage}% is below required ${policy.minPassPercentage}%`;

      return {
        studentId: params.studentId,
        studentName: params.studentName,
        currentClass: "XII",
        currentSemester: "Sem 4",
        academicYear: params.academicYear,
        eligibleStatus: "C.C.H.S.",
        targetClass: "XII",
        targetSemester: "Sem 4",
        targetStudentType: "active",
        isAutoPass: false,
        totalMarksObtained: params.marksObtained,
        totalFullMarks: fullMarks,
        overallPercentage,
        passedSubjectsCount,
        failedSubjectsCount: uniqueFailedCount,
        failedSubjectNames: uniqueFailedList,
        compulsoryPassed,
        subjectDetails,
        reason: `C.C.H.S. (Continuing Candidate H.S.): ${failReason}.`,
      };
    }
  }

  // Generic fallback
  return {
    studentId: params.studentId,
    studentName: params.studentName,
    currentClass: standardClass,
    currentSemester,
    academicYear: params.academicYear,
    eligibleStatus: overallPassed ? "Promoted But Not Admitted" : "Detained",
    targetClass,
    targetSemester: null,
    targetStudentType: overallPassed ? "pending" : "active",
    isAutoPass: false,
    totalMarksObtained: params.marksObtained,
    totalFullMarks: fullMarks,
    overallPercentage,
    passedSubjectsCount,
    failedSubjectsCount,
    failedSubjectNames,
    compulsoryPassed,
    subjectDetails,
    reason: overallPassed ? "Passed evaluation criteria." : "Failed evaluation criteria.",
  };
}
