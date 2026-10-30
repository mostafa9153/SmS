"use client";

import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStudents, getDistinctClasses, getDistinctSections, getClassResults, executeCohortPromotion, undoCohortPromotion } from "@/lib/data/students";
import { StudentStatus, Semester, StudentResult } from "@/lib/types";
import { evaluateStudentPromotionEligibility } from "@/lib/utils/marksheet-calc";
import { getSavedPromotionPolicy } from "@/lib/utils/marks-config";
import { ManualOverrideData } from "@/components/students/promotion/types";

export function usePromotionDesk() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();

  // URL / State parameters
  const [academicYear, setAcademicYear] = useState<number>(
    searchParams.get("year") ? parseInt(searchParams.get("year")!) : currentYear
  );
  const [selectedClass, setSelectedClassState] = useState<string>(
    searchParams.get("class") || "IX"
  );
  const [selectedSection, setSelectedSectionState] = useState<string>(
    searchParams.get("section") || ""
  );
  const [selectedExam, setSelectedExam] = useState<string>(
    searchParams.get("exam") || "Annual Examination"
  );
  const [selectedSemester, setSelectedSemester] = useState<Semester | "">((searchParams.get("semester") as Semester) || "");
  const [rollStrategy, setRollStrategy] = useState<"rank" | "preserve" | "alphabetical">("rank");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "promoted" | "detained" | "supplementary" | "sent_up" | "passed_out" | "overridden">("all");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manualOverrides, setManualOverrides] = useState<Record<string, ManualOverrideData>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<StudentStatus>("Promoted But Not Admitted");
  const [executionResult, setExecutionResult] = useState<any>(null);

  const isHS = selectedClass === "XI" || selectedClass === "XII";

  // Compute Target Academic Year
  const isMidYearSemesterAdvancement =
    (selectedClass === "XI" &&
      (selectedSemester === "Sem 1" ||
        selectedExam.toLowerCase().includes("sem 1") ||
        selectedExam.toLowerCase().includes("semester 1"))) ||
    (selectedClass === "XII" &&
      (selectedSemester === "Sem 3" ||
        selectedExam.toLowerCase().includes("sem 3") ||
        selectedExam.toLowerCase().includes("semester 3")));

  const targetAcademicYear = isMidYearSemesterAdvancement ? academicYear : academicYear + 1;

  // Class & Exam change handlers with intelligent auto-sync
  function handleClassChange(newClass: string) {
    setSelectedClassState(newClass);
    setSelectedIds(new Set());
    setManualOverrides({});
    if (newClass === "XI") {
      setSelectedExam("Semester 1");
      setSelectedSemester("Sem 1");
    } else if (newClass === "XII") {
      setSelectedExam("Semester 3");
      setSelectedSemester("Sem 3");
    } else if (newClass === "X") {
      setSelectedExam("Selection Test");
      setSelectedSemester("");
    } else {
      setSelectedExam("Annual Examination");
      setSelectedSemester("");
    }
  }

  function handleExamChange(newExam: string) {
    setSelectedExam(newExam);
    setSelectedIds(new Set());
    if (newExam.toLowerCase().includes("sem 1") || newExam.toLowerCase().includes("semester 1")) {
      setSelectedSemester("Sem 1");
    } else if (newExam.toLowerCase().includes("sem 2") || newExam.toLowerCase().includes("semester 2")) {
      setSelectedSemester("Sem 2");
    } else if (newExam.toLowerCase().includes("sem 3") || newExam.toLowerCase().includes("semester 3")) {
      setSelectedSemester("Sem 3");
    } else if (newExam.toLowerCase().includes("sem 4") || newExam.toLowerCase().includes("semester 4")) {
      setSelectedSemester("Sem 4");
    }
  }

  // 1. Fetch distinct filter metadata
  const { data: classes = [] } = useQuery({
    queryKey: ["distinct-classes"],
    queryFn: getDistinctClasses,
    staleTime: Infinity,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["distinct-sections"],
    queryFn: getDistinctSections,
    staleTime: Infinity,
  });

  // 2. Fetch enrolled students in this class and section
  const { data: rawStudents = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["students-promotion-roster", selectedClass, selectedSection],
    queryFn: () => getStudents("full", selectedClass || "all", selectedSection || "all"),
  });

  // Only consider active students currently eligible for progression
  const eligibleStudents = useMemo(() => {
    return rawStudents.filter((s) => {
      if (s.currentStatus === "Passed Out" || s.currentStatus === "TC Out" || s.currentStatus === "Drop Out") {
        return false;
      }
      if (selectedSemester && s.presentSemester && s.presentSemester !== selectedSemester) {
        return false;
      }
      return true;
    });
  }, [rawStudents, selectedSemester]);

  // 3. Fetch exam results for this cohort
  const { data: classResultsSummary, isLoading: isLoadingResults } = useQuery({
    queryKey: ["class-results", academicYear, selectedClass, selectedSection, selectedExam, selectedSemester],
    queryFn: () => getClassResults(academicYear, selectedClass, selectedSection, selectedExam, selectedSemester || undefined),
    enabled: !!selectedClass,
  });

  const resultsMap = useMemo(() => {
    const map = new Map<string, StudentResult>();
    if (classResultsSummary?.results) {
      for (const r of classResultsSummary.results) {
        map.set(r.studentId, r);
      }
    }
    return map;
  }, [classResultsSummary]);

  // 4. Auto-Evaluate Promotion Outcome for Every Student
  const evaluatedCohort = useMemo(() => {
    const policy = getSavedPromotionPolicy();

    return eligibleStudents.map((s) => {
      const res = resultsMap.get(s.id);
      const isVirtual = !res || res.id?.startsWith("virtual-") || res.hasRecordedMarks === false;
      const hasRecordedMarks = !isVirtual;
      const marksObtained = hasRecordedMarks ? Number(res?.marksObtained || 0) : 0;
      const fullMarks = res ? Number(res.fullMarks) : (classResultsSummary?.fullMarks || 500);

      const autoEval = evaluateStudentPromotionEligibility({
        studentId: s.id,
        studentName: s.name,
        currentClass: s.presentClass,
        currentSemester: (selectedSemester as Semester) || s.presentSemester || null,
        academicYear,
        examName: selectedExam,
        marksObtained,
        fullMarks,
        subjectMarks: hasRecordedMarks ? (res?.subjectMarks || {}) : {},
        hasRecordedMarks,
        policy,
      });

      const override = manualOverrides[s.id];
      const isOverridden = !!override;

      let finalTargetStatus = autoEval.eligibleStatus;
      let finalTargetClass = autoEval.targetClass;
      let finalTargetSemester = autoEval.targetSemester;

      if (isOverridden) {
        finalTargetStatus = override.status;
        if (override.targetClass) finalTargetClass = override.targetClass;
        if (override.targetSemester !== undefined) finalTargetSemester = override.targetSemester;
      }

      return {
        student: s,
        result: res,
        hasRecordedMarks,
        marksObtained,
        fullMarks,
        percentage: autoEval.overallPercentage,
        autoEval,
        isOverridden,
        overrideReason: override?.reason,
        targetStatus: finalTargetStatus,
        targetClass: finalTargetClass,
        targetSemester: finalTargetSemester,
        targetSection: s.presentSection || "A",
        failedSubjectNames: autoEval.failedSubjectNames,
      };
    });
  }, [eligibleStudents, resultsMap, academicYear, selectedExam, selectedSemester, manualOverrides, classResultsSummary]);

  // 5. Calculate Predicted Next Roll Numbers using Roll Strategy with deterministic tie-breaking
  const evaluatedCohortWithRolls = useMemo(() => {
    // Group into target cohorts by targetClass + targetSection
    const targetGroups = new Map<string, typeof evaluatedCohort>();

    for (const item of evaluatedCohort) {
      const key = `${item.targetClass}_${item.targetSection}`;
      if (!targetGroups.has(key)) {
        targetGroups.set(key, []);
      }
      targetGroups.get(key)!.push(item);
    }

    const predictedRollMap = new Map<string, number>();

    for (const [_, groupList] of targetGroups.entries()) {
      const sorted = [...groupList];

      // For in-place semester transitions (Class XI Sem 1 -> Sem 2, Class XII Sem 3 -> Sem 4),
      // roll numbers CANNOT change at all. They strictly preserve current enrolled roll.
      sorted.forEach((item) => {
        const isInPlaceSem =
          (item.student.presentClass === "XI" && item.targetSemester === "Sem 2") ||
          (item.student.presentClass === "XII" && item.targetSemester === "Sem 4");

        if (isInPlaceSem) {
          predictedRollMap.set(item.student.id, Number(item.student.presentRoll) || 1);
        }
      });

      // For cross-class promotions / re-admissions (e.g. XI Sem 2 -> XII Sem 3, IX -> X), apply selected strategy
      const regularItems = sorted.filter(
        (item) =>
          !(item.student.presentClass === "XI" && item.targetSemester === "Sem 2") &&
          !(item.student.presentClass === "XII" && item.targetSemester === "Sem 4")
      );

      if (regularItems.length > 0) {
        if (rollStrategy === "rank") {
          regularItems.sort((a, b) => {
            if (b.marksObtained !== a.marksObtained) {
              return b.marksObtained - a.marksObtained; // Descending marks
            }
            const nameCmp = a.student.name.localeCompare(b.student.name);
            if (nameCmp !== 0) return nameCmp;
            const rollA = Number(a.student.presentRoll) || 0;
            const rollB = Number(b.student.presentRoll) || 0;
            if (rollA !== rollB) return rollA - rollB;
            return a.student.id.localeCompare(b.student.id);
          });
        } else if (rollStrategy === "alphabetical") {
          regularItems.sort((a, b) => {
            const nameCmp = a.student.name.localeCompare(b.student.name);
            if (nameCmp !== 0) return nameCmp;
            return (Number(a.student.presentRoll) || 0) - (Number(b.student.presentRoll) || 0);
          });
        } else {
          // preserve: sorted by current roll
          regularItems.sort((a, b) => (Number(a.student.presentRoll) || 0) - (Number(b.student.presentRoll) || 0));
        }

        regularItems.forEach((item, idx) => {
          const assignedRoll = rollStrategy === "preserve" ? (Number(item.student.presentRoll) || idx + 1) : idx + 1;
          predictedRollMap.set(item.student.id, assignedRoll);
        });
      }
    }

    return evaluatedCohort.map((item) => ({
      ...item,
      predictedRoll: predictedRollMap.get(item.student.id) || Number(item.student.presentRoll) || 1,
    }));
  }, [evaluatedCohort, rollStrategy]);

  // 6. Metrics Summary
  const metrics = useMemo(() => {
    let promoted = 0;
    let detained = 0;
    let supplementary = 0;
    let sentUp = 0;
    let passedOut = 0;
    let overridden = 0;

    for (const item of evaluatedCohortWithRolls) {
      if (item.isOverridden) overridden++;

      const st = item.targetStatus;
      if (st === "Promoted But Not Admitted" || st === "Continuing") {
        promoted++;
      } else if (st === "Sent Up M.P." || st === "Sent Up H.S.") {
        sentUp++;
      } else if (st === "Passed Out") {
        passedOut++;
      } else if (st === "Supplementary" || st === "Compartmental") {
        supplementary++;
      } else if (st === "Detained" || st === "10th test fail" || st === "C.C.H.S.") {
        detained++;
      }
    }

    return {
      total: evaluatedCohortWithRolls.length,
      promoted,
      detained,
      supplementary,
      sentUp,
      passedOut,
      overridden,
    };
  }, [evaluatedCohortWithRolls]);

  // 7. Filtered Display List
  const displayedStudents = useMemo(() => {
    return evaluatedCohortWithRolls.filter((item) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.student.name.toLowerCase().includes(q);
        const matchRoll = String(item.student.presentRoll).includes(q);
        const matchId = (item.student.schoolId || "").toLowerCase().includes(q);
        const matchPen = (item.student.pen || "").toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchId && !matchPen) return false;
      }

      // Category filter
      if (filterCategory === "promoted") {
        return item.targetStatus === "Promoted But Not Admitted" || item.targetStatus === "Continuing";
      }
      if (filterCategory === "detained") {
        return item.targetStatus === "Detained" || item.targetStatus === "10th test fail" || item.targetStatus === "C.C.H.S.";
      }
      if (filterCategory === "supplementary") {
        return item.targetStatus === "Supplementary" || item.targetStatus === "Compartmental";
      }
      if (filterCategory === "sent_up") {
        return item.targetStatus === "Sent Up M.P." || item.targetStatus === "Sent Up H.S.";
      }
      if (filterCategory === "passed_out") {
        return item.targetStatus === "Passed Out";
      }
      if (filterCategory === "overridden") {
        return item.isOverridden;
      }

      return true;
    });
  }, [evaluatedCohortWithRolls, searchQuery, filterCategory]);

  // Selection handlers
  const allDisplayedSelected =
    displayedStudents.length > 0 && displayedStudents.every((s) => selectedIds.has(s.student.id));

  function toggleAll() {
    if (allDisplayedSelected) {
      const next = new Set(selectedIds);
      displayedStudents.forEach((s) => next.delete(s.student.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      displayedStudents.forEach((s) => next.add(s.student.id));
      setSelectedIds(next);
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSelectAllCohort() {
    setSelectedIds(new Set(evaluatedCohortWithRolls.map((s) => s.student.id)));
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  // Teacher manual override per student with strict class & semester mapping
  function handleSetOverride(studentId: string, status: StudentStatus) {
    const item = evaluatedCohortWithRolls.find((s) => s.student.id === studentId);
    if (!item) return;

    let targetClass = item.student.presentClass;
    let targetSemester: Semester | null = item.student.presentSemester || null;
    const currClass = item.student.presentClass;

    if (status === "Promoted But Not Admitted") {
      const nextMap: Record<string, string> = {
        V: "VI", VI: "VII", VII: "VIII", VIII: "IX", IX: "X", X: "XI", XI: "XII",
      };
      targetClass = nextMap[currClass] || currClass;
      if (currClass === "XI") {
        targetSemester = "Sem 3";
      } else {
        targetSemester = null;
      }
    } else if (status === "Continuing") {
      targetClass = currClass;
      if (currClass === "XI") {
        targetSemester = "Sem 2";
      } else if (currClass === "XII") {
        targetSemester = "Sem 4";
      }
    } else if (status === "Sent Up M.P.") {
      targetClass = "X";
      targetSemester = null;
    } else if (status === "10th test fail") {
      targetClass = "X";
      targetSemester = null;
    } else if (status === "Supplementary") {
      targetClass = "XI";
      targetSemester = "Sem 2";
    } else if (status === "Compartmental") {
      targetClass = "XII";
      targetSemester = "Sem 4";
    } else if (status === "C.C.H.S.") {
      targetClass = "XII";
      targetSemester = "Sem 4";
    } else if (status === "Detained") {
      targetClass = currClass;
      if (currClass === "XI") targetSemester = "Sem 1";
      if (currClass === "XII") targetSemester = "Sem 3";
      if (!isHS) targetSemester = null;
    } else if (status === "Passed Out") {
      targetClass = "XII";
      targetSemester = "Sem 4";
    }

    setManualOverrides((prev) => ({
      ...prev,
      [studentId]: {
        status,
        targetClass,
        targetSemester,
        reason: "Teacher manual override",
      },
    }));
  }

  function handleResetOverride(studentId: string) {
    setManualOverrides((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  }

  function handleResetAllOverrides() {
    setManualOverrides({});
  }

  function handleApplyBulkOverride(status: StudentStatus) {
    if (selectedIds.size === 0) return;
    const nextOverrides = { ...manualOverrides };
    for (const id of selectedIds) {
      const item = evaluatedCohortWithRolls.find((s) => s.student.id === id);
      if (!item) continue;
      const currClass = item.student.presentClass;
      let targetClass = currClass;
      let targetSemester: Semester | null = item.student.presentSemester || null;

      if (status === "Promoted But Not Admitted") {
        const nextMap: Record<string, string> = {
          V: "VI", VI: "VII", VII: "VIII", VIII: "IX", IX: "X", X: "XI", XI: "XII",
        };
        targetClass = nextMap[currClass] || currClass;
        if (currClass === "XI") {
          targetSemester = "Sem 3";
        } else {
          targetSemester = null;
        }
      } else if (status === "Continuing") {
        targetClass = currClass;
        if (currClass === "XI") targetSemester = "Sem 2";
        else if (currClass === "XII") targetSemester = "Sem 4";
        else targetSemester = null;
      } else if (status === "Sent Up M.P.") {
        targetClass = "X";
        targetSemester = null;
      } else if (status === "10th test fail") {
        targetClass = "X";
        targetSemester = null;
      } else if (status === "Supplementary") {
        targetClass = "XI";
        targetSemester = "Sem 2";
      } else if (status === "Compartmental") {
        targetClass = "XII";
        targetSemester = "Sem 4";
      } else if (status === "C.C.H.S.") {
        targetClass = "XII";
        targetSemester = "Sem 4";
      } else if (status === "Detained") {
        targetClass = currClass;
        if (currClass === "XI") targetSemester = "Sem 1";
        else if (currClass === "XII") targetSemester = "Sem 3";
        else targetSemester = null;
      } else if (status === "Passed Out") {
        targetClass = "XII";
        targetSemester = "Sem 4";
      }

      nextOverrides[id] = {
        status,
        targetClass,
        targetSemester,
        reason: "Bulk status override",
      };
    }
    setManualOverrides(nextOverrides);
  }

  // Mutation for undoing / rolling back promotion
  const undoMutation = useMutation({
    mutationFn: undoCohortPromotion,
    onSuccess: (data: any) => {
      toast.success(data.message || `Promotion rolled back successfully for ${data.count} students.`);
      setUndoModalOpen(false);
      setSelectedIds(new Set());
      setManualOverrides({});
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-promotion-roster"] });
      queryClient.invalidateQueries({ queryKey: ["students-all"] });
      queryClient.invalidateQueries({ queryKey: ["class-results"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: any) => {
      toast.error(`Rollback failed: ${err.message}`);
    },
  });

  // Mutation for executing promotion transitions
  const promotionMutation = useMutation({
    mutationFn: executeCohortPromotion,
    onSuccess: (data) => {
      setExecutionResult(data.summary || data);
      setConfirmOpen(false);
      setSelectedIds(new Set());
      setManualOverrides({});
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-promotion-roster"] });
      queryClient.invalidateQueries({ queryKey: ["students-all"] });
      queryClient.invalidateQueries({ queryKey: ["class-results"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: any) => {
      toast.error(`Promotion execution failed: ${err.message}`);
    },
  });

  const selectedStudentsToPromote = useMemo(() => {
    return evaluatedCohortWithRolls.filter((s) => selectedIds.has(s.student.id));
  }, [evaluatedCohortWithRolls, selectedIds]);

  function handleExecuteConfirm() {
    if (selectedStudentsToPromote.length === 0) return;

    const payload = {
      academicYear,
      targetAcademicYear,
      sourceClass: selectedClass,
      rollStrategy,
      examName: selectedExam,
      promotions: selectedStudentsToPromote.map((item) => ({
        studentId: item.student.id,
        currentClass: item.student.presentClass,
        currentSection: item.student.presentSection,
        currentRoll: item.student.presentRoll,
        currentSemester: item.student.presentSemester || null,
        currentStatus: item.student.currentStatus,
        targetClass: item.targetClass,
        targetSection: item.targetSection,
        targetRoll: item.predictedRoll,
        targetSemester: item.targetSemester || null,
        targetStatus: item.targetStatus,
        isOverridden: item.isOverridden,
        overrideReason: item.overrideReason,
        evaluationReason: item.autoEval.reason,
        marksObtained: item.marksObtained,
        percentage: item.percentage,
        failedSubjectNames: item.failedSubjectNames,
      })),
    };

    promotionMutation.mutate(payload);
  }

  const isLoading = isLoadingStudents || isLoadingResults;

  return {
    academicYear,
    allDisplayedSelected,
    bulkStatus,
    classes,
    confirmOpen,
    currentYear,
    displayedStudents,
    evaluatedCohortWithRolls,
    executionResult,
    filterCategory,
    handleApplyBulkOverride,
    handleClassChange,
    handleClearSelection,
    handleExamChange,
    handleExecuteConfirm,
    handleResetAllOverrides,
    handleResetOverride,
    handleSelectAllCohort,
    handleSetOverride,
    isHS,
    isLoading,
    manualOverrides,
    metrics,
    promotionMutation,
    rollStrategy,
    searchQuery,
    sections,
    selectedClass,
    selectedExam,
    selectedIds,
    selectedSection,
    selectedSemester,
    selectedStudentsToPromote,
    setAcademicYear,
    setBulkStatus,
    setConfirmOpen,
    setExecutionResult,
    setFilterCategory,
    setRollStrategy,
    setSearchQuery,
    setSelectedIds,
    setSelectedSectionState,
    setSelectedSemester,
    setUndoModalOpen,
    targetAcademicYear,
    toggleAll,
    toggleOne,
    undoModalOpen,
    undoMutation,
  };
}

export type PromotionDeskState = ReturnType<typeof usePromotionDesk>;
