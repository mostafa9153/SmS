"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStudents,
  getDistinctClasses,
  getDistinctSections,
  getClassResults,
  executeCohortPromotion,
} from "@/lib/data/students";
import type { StudentStatus, Semester, StudentResult } from "@/lib/types";
import { StatusBadge } from "@/components/students/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { evaluateStudentPromotionEligibility } from "@/lib/utils/marksheet-calc";
import { getSavedPromotionPolicy } from "@/lib/utils/marks-config";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Sliders,
  Award,
  Users,
  GraduationCap,
  Loader2,
  Check,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";

const ALL_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const EXAM_OPTIONS = [
  { label: "Annual Examination", value: "Annual Examination" },
  { label: "Selection Test (Class X / XII)", value: "Selection Test" },
  { label: "Semester 1 (Class XI)", value: "Semester 1" },
  { label: "Semester 2 (Class XI)", value: "Semester 2" },
  { label: "Semester 3 (Class XII)", value: "Semester 3" },
  { label: "Semester 4 (Class XII)", value: "Semester 4" },
  { label: "1st Summative Evaluation", value: "1st Summative Evaluation" },
  { label: "2nd Summative Evaluation", value: "2nd Summative Evaluation" },
];

const OVERRIDE_STATUS_OPTIONS: { label: string; value: StudentStatus }[] = [
  { label: "Promoted (Pending Re-Admission)", value: "Promoted But Not Admitted" },
  { label: "Continuing (In-Place / Regular)", value: "Continuing" },
  { label: "Detained (Repeat Class)", value: "Detained" },
  { label: "Sent Up M.P. (Madhyamik Exam)", value: "Sent Up M.P." },
  { label: "10th Test Fail (Detained Cl X)", value: "10th test fail" },
  { label: "Supplementary (HS Re-Exam)", value: "Supplementary" },
  { label: "Compartmental (Board Re-Exam)", value: "Compartmental" },
  { label: "C.C.H.S. (Continuing Candidate)", value: "C.C.H.S." },
  { label: "Passed Out (Alumni / Exited)", value: "Passed Out" },
  { label: "Transfer Out (TC Issued)", value: "TC Out" },
  { label: "Drop Out", value: "Drop Out" },
];

interface ManualOverrideData {
  status: StudentStatus;
  targetClass?: string;
  targetSemester?: Semester | null;
  reason?: string;
}

function PromotionPageContent() {
  const router = useRouter();
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
      const marksObtained = res ? Number(res.marksObtained) : 0;
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
        subjectMarks: res?.subjectMarks || {},
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
      alert(`Promotion execution failed: ${err.message}`);
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

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-2xl border shadow-2xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-xl p-2 min-h-[38px] min-w-[38px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer border"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Promotion &amp; Lifecycle Desk
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings/academic-session"
            className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors inline-flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Sliders className="h-3.5 w-3.5" />
            School-Wide Session Transition →
          </Link>
        </div>
      </div>

      {/* Success Notification Banner */}
      {executionResult && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              Promotion Batch Executed Successfully ({executionResult.total} Students Processed)
            </div>
            <button
              onClick={() => setExecutionResult(null)}
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              Dismiss ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-emerald-200">
              <p className="text-[10px] text-muted-foreground">Promoted</p>
              <p className="text-base font-bold text-emerald-700">{executionResult.promotedCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-rose-200">
              <p className="text-[10px] text-muted-foreground">Detained</p>
              <p className="text-base font-bold text-rose-700">{executionResult.detainedCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-amber-200">
              <p className="text-[10px] text-muted-foreground">Supplementary</p>
              <p className="text-base font-bold text-amber-700">{executionResult.supplementaryCount || 0}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-blue-200">
              <p className="text-[10px] text-muted-foreground">Sent Up M.P.</p>
              <p className="text-base font-bold text-blue-700">{executionResult.sentUpCount || 0}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-purple-200">
              <p className="text-[10px] text-muted-foreground">Passed Out</p>
              <p className="text-base font-bold text-purple-700">{executionResult.passedOutCount || 0}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-indigo-200">
              <p className="text-[10px] text-muted-foreground">Overridden</p>
              <p className="text-base font-bold text-indigo-700">{executionResult.overriddenCount || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Control Filter Bar */}
      <div className="rounded-2xl border bg-card p-3 sm:p-4 space-y-3 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Class */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Class</label>
            <CustomSelect
              value={selectedClass}
              onChange={handleClassChange}
              options={(classes.length > 0 ? classes : ALL_CLASSES).map((c) => ({ label: `Class ${c}`, value: c }))}
            />
          </div>

          {/* Section */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Section</label>
            <CustomSelect
              value={selectedSection}
              onChange={(val) => {
                setSelectedSectionState(val);
                setSelectedIds(new Set());
              }}
              placeholder="All Sections"
              options={[
                { label: "All Sections", value: "" },
                ...sections.map((s) => ({ label: `Section ${s}`, value: s })),
              ]}
            />
          </div>

          {/* Academic Year */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Academic Year</label>
            <CustomSelect
              value={String(academicYear)}
              onChange={(val) => setAcademicYear(parseInt(val))}
              options={[
                { label: `${currentYear}`, value: String(currentYear) },
                { label: `${currentYear - 1}`, value: String(currentYear - 1) },
                { label: `${currentYear + 1}`, value: String(currentYear + 1) },
              ]}
            />
          </div>

          {/* Exam Name */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Evaluation Exam</label>
            <CustomSelect
              value={selectedExam}
              onChange={handleExamChange}
              options={EXAM_OPTIONS}
            />
          </div>

          {/* Roll Strategy */}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Roll Assignment</label>
            <CustomSelect
              value={rollStrategy}
              onChange={(val) => setRollStrategy(val as any)}
              options={[
                { label: "🏆 Rank-Based (Marks)", value: "rank" },
                { label: "🔄 Preserve Roll", value: "preserve" },
                { label: "🔤 Alphabetical (A-Z)", value: "alphabetical" },
              ]}
            />
          </div>
        </div>

        {/* Secondary Bar: Semester (if HS) & Search & Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t">
          <div className="flex flex-wrap items-center gap-2">
            {isHS && (
              <div className="inline-flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border">
                {(["", "Sem 1", "Sem 2", "Sem 3", "Sem 4"] as const).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedSemester(sem as any)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                      selectedSemester === sem
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {sem || "All Semesters"}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, roll, or ID..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border bg-background text-xs placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {Object.keys(manualOverrides).length > 0 && (
              <button
                onClick={handleResetAllOverrides}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset {Object.keys(manualOverrides).length} Override(s)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div
          onClick={() => setFilterCategory("all")}
          className={cn(
            "rounded-xl border p-2.5 sm:p-3 bg-card cursor-pointer transition-all hover:border-primary/50",
            filterCategory === "all" ? "ring-2 ring-primary border-primary" : ""
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold">Total Roster</span>
            <Users className="h-3.5 w-3.5" />
          </div>
          <p className="text-lg sm:text-xl font-bold mt-1">{metrics.total}</p>
        </div>

        <div
          onClick={() => setFilterCategory("promoted")}
          className={cn(
            "rounded-xl border p-2.5 sm:p-3 bg-card cursor-pointer transition-all hover:border-emerald-500",
            filterCategory === "promoted" ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5" : ""
          )}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[11px] font-bold">Promoted / Advanced</span>
            <Check className="h-3.5 w-3.5" />
          </div>
          <p className="text-lg sm:text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{metrics.promoted}</p>
        </div>

        <div
          onClick={() => setFilterCategory("detained")}
          className={cn(
            "rounded-xl border p-2.5 sm:p-3 bg-card cursor-pointer transition-all hover:border-rose-500",
            filterCategory === "detained" ? "ring-2 ring-rose-500 border-rose-500 bg-rose-500/5" : ""
          )}
        >
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-[11px] font-bold">Detained / Repeat</span>
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <p className="text-lg sm:text-xl font-bold mt-1 text-rose-700 dark:text-rose-400">{metrics.detained}</p>
        </div>

        <div
          onClick={() => setFilterCategory("supplementary")}
          className={cn(
            "rounded-xl border p-2.5 sm:p-3 bg-card cursor-pointer transition-all hover:border-amber-500",
            filterCategory === "supplementary" ? "ring-2 ring-amber-500 border-amber-500 bg-amber-500/5" : ""
          )}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[11px] font-bold">Supplementary</span>
            <RefreshCw className="h-3.5 w-3.5" />
          </div>
          <p className="text-lg sm:text-xl font-bold mt-1 text-amber-700 dark:text-amber-400">{metrics.supplementary}</p>
        </div>

        <div
          onClick={() => setFilterCategory("sent_up")}
          className={cn(
            "rounded-xl border p-2.5 sm:p-3 bg-card cursor-pointer transition-all hover:border-blue-500",
            filterCategory === "sent_up" ? "ring-2 ring-blue-500 border-blue-500 bg-blue-500/5" : ""
          )}
        >
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
            <span className="text-[11px] font-bold">Sent Up / Board</span>
            <Award className="h-3.5 w-3.5" />
          </div>
          <p className="text-lg sm:text-xl font-bold mt-1 text-blue-700 dark:text-blue-400">{metrics.sentUp + metrics.passedOut}</p>
        </div>

        <div
          onClick={() => setFilterCategory("overridden")}
          className={cn(
            "rounded-xl border p-2.5 sm:p-3 bg-card cursor-pointer transition-all hover:border-indigo-500",
            filterCategory === "overridden" ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/5" : ""
          )}
        >
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
            <span className="text-[11px] font-bold">Overridden</span>
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="text-lg sm:text-xl font-bold mt-1 text-indigo-700 dark:text-indigo-400">{metrics.overridden}</p>
        </div>
      </div>

      {/* Floating / Action Execution Bar */}
      {selectedIds.size > 0 && (
        <div className="rounded-2xl bg-primary/10 border border-primary/30 p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <p className="text-xs sm:text-sm font-bold text-primary">
              {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected for promotion execution
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleClearSelection}
              className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:bg-primary/90 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Execute Promotion ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Cohort Roster Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : displayedStudents.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-2">
          <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-bold">No students found matching current filters</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 border-b text-[11px] font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="pl-4 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allDisplayedSelected}
                      onChange={toggleAll}
                      className="rounded accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 w-16">Roll</th>
                  <th className="px-3 py-3">Student Profile</th>
                  <th className="px-3 py-3">Exam Performance</th>
                  <th className="px-3 py-3">Auto Status</th>
                  <th className="px-3 py-3">Target Transition</th>
                  <th className="px-3 py-3 w-20 text-center">Next Roll</th>
                  <th className="px-3 py-3 pr-4 text-right">Teacher Override</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayedStudents.map((item) => {
                  const s = item.student;
                  const isSelected = selectedIds.has(s.id);
                  const isOverridden = item.isOverridden;

                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        "transition-colors",
                        isSelected ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-muted/30"
                      )}
                    >
                      <td className="pl-4 pr-2 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(s.id)}
                          className="rounded accent-primary cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-3 font-mono font-bold text-muted-foreground">
                        #{s.presentRoll}
                      </td>

                      <td className="px-3 py-3">
                        <div>
                          <p className="font-bold text-foreground text-xs">{s.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                            <span>{s.schoolId || s.id.slice(0, 8)}</span>
                            {s.presentSemester && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-sans font-semibold">
                                {s.presentSemester}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {item.result ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span>{item.marksObtained} / {item.fullMarks}</span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-mono",
                                item.percentage >= 35 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              )}>
                                {item.percentage}%
                              </span>
                            </div>
                            {item.failedSubjectNames.length > 0 && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 line-clamp-1">
                                Fail: {item.failedSubjectNames.join(", ")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            {item.autoEval.isAutoPass ? "RTE Auto-Pass" : "No marks entered"}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <StatusBadge status={item.autoEval.eligibleStatus} size="sm" />
                      </td>

                      <td className="px-3 py-3 font-medium">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground font-mono">
                            {s.presentClass}
                            {s.presentSemester ? ` (${s.presentSemester})` : ""}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className={cn(
                            "font-bold",
                            item.targetStatus === "Promoted But Not Admitted" || item.targetStatus === "Continuing"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : item.targetStatus === "Sent Up M.P." || item.targetStatus === "Passed Out"
                              ? "text-blue-700 dark:text-blue-400"
                              : "text-rose-700 dark:text-rose-400"
                          )}>
                            {item.targetClass}
                            {item.targetSemester ? ` (${item.targetSemester})` : ""}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-muted text-foreground font-mono font-bold text-xs border">
                          #{item.predictedRoll}
                        </span>
                      </td>

                      <td className="px-3 py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <CustomSelect
                            value={item.targetStatus}
                            onChange={(val) => handleSetOverride(s.id, val as any)}
                            className="w-[180px] text-xs h-8"
                            options={OVERRIDE_STATUS_OPTIONS}
                          />
                          {isOverridden && (
                            <button
                              onClick={() => handleResetOverride(s.id)}
                              title="Reset to Auto Evaluation"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer border"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllCohort}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Select All {evaluatedCohortWithRolls.length} Students
              </button>
              <span>•</span>
              <button
                onClick={handleClearSelection}
                className="font-semibold text-muted-foreground hover:underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>
            <span>Showing {displayedStudents.length} of {evaluatedCohortWithRolls.length} students</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <GraduationCap className="h-5 w-5 text-primary" />
              Confirm Cohort Promotion Execution
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center p-3 rounded-xl bg-muted/40 border">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold">Source Session</p>
                <p className="font-bold text-foreground">{academicYear} (Class {selectedClass})</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold">Target Session</p>
                <p className="font-bold text-foreground">{targetAcademicYear}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold">Roll Strategy</p>
                <p className="font-bold capitalize text-foreground">{rollStrategy}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold">Total Batch</p>
                <p className="font-bold text-primary">{selectedStudentsToPromote.length} Selected</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border divide-y">
              {selectedStudentsToPromote.map((item) => (
                <div key={item.student.id} className="p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground">{item.student.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Current: Class {item.student.presentClass} ({item.student.presentSection}) • Roll: #{item.student.presentRoll}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{item.targetClass}{item.targetSemester ? ` (${item.targetSemester})` : ""}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">(Roll #{item.predictedRoll})</span>
                    </div>
                    <StatusBadge status={item.targetStatus} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setConfirmOpen(false)}
              className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteConfirm}
              disabled={promotionMutation.isPending}
              className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs font-bold hover:bg-primary/90 transition-all shadow-xs active:scale-95 cursor-pointer inline-flex items-center gap-2"
            >
              {promotionMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {promotionMutation.isPending ? "Executing Transitions..." : "Confirm & Execute Promotion"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PromotionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading Promotion &amp; Lifecycle Desk...</span>
        </div>
      }
    >
      <PromotionPageContent />
    </Suspense>
  );
}
