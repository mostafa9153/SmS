"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { currentYearIST } from "@/lib/utils/academic-year";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Trophy, Medal } from "lucide-react";
import { getClassResults, saveStudentResult, saveSubjectBatchMarks, recalculateClassRanks } from "@/lib/data/students";
import { StudentResult, ClassResultsSummary, Semester, SubjectMarksMap } from "@/lib/types";
import { showToast } from "@/components/ui/toast-banner";
import { toastWithUndo } from "@/lib/undo/client";
import { getDynamicClassFullMarks, getSavedPromotionPolicy, PromotionPolicy, getSectionsForClass, getSubjectListForClass, getSubjectFullMarks, SubjectFullMarksInfo } from "@/lib/utils/marks-config";
import { normalizeSubjectName } from "@/lib/utils/marksheet-calc";
import { CLASS_OPTIONS } from "@/components/results/client/constants";

export function useResultsClient(allowedClasses: string[]) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentYear = currentYearIST();

  const classParam = searchParams.get("class");
  const sectionParam = searchParams.get("section");
  const examParam = searchParams.get("exam");
  const subjectParam = searchParams.get("subject");
  const yearParam = searchParams.get("year");
  const semesterParam = searchParams.get("semester") as Semester | null;
  const genderParam = searchParams.get("gender") as "Male" | "Female" | null;
  const viewParam = searchParams.get("view") as "subject_batch" | "class_summary" | null;

  // Primary State
  const [academicYear, setAcademicYearState] = useState<number>(() => {
    if (yearParam && !isNaN(parseInt(yearParam, 10))) return parseInt(yearParam, 10);
    return currentYear;
  });
  const classOptions = useMemo(
    () => (allowedClasses.length ? CLASS_OPTIONS.filter((c) => allowedClasses.includes(c.value)) : CLASS_OPTIONS),
    [allowedClasses]
  );
  const [selectedClass, setSelectedClassState] = useState<string>(() =>
    classParam && classOptions.some((c) => c.value === classParam) ? classParam : classOptions[0]?.value ?? "V"
  );
  const [selectedSection, setSelectedSectionState] = useState<string>(sectionParam || "A");
  const [selectedGender, setSelectedGenderState] = useState<"ALL" | "Male" | "Female">(
    genderParam === "Male" || genderParam === "Female" ? genderParam : "ALL"
  );
  const [selectedSemester, setSelectedSemesterState] = useState<Semester | "ALL">(semesterParam || "ALL");
  const [selectedExam, setSelectedExamState] = useState<string>(examParam || "1st Summative Evaluation");
  const [selectedSubject, setSelectedSubjectState] = useState<string>(subjectParam || "");
  const [activeView, setActiveView] = useState<"subject_batch" | "class_summary">(viewParam || "subject_batch");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [localQuery, setLocalQuery] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [promotionPolicy, setPromotionPolicy] = useState<PromotionPolicy>(getSavedPromotionPolicy());

  const isHs = selectedClass === "XI" || selectedClass === "XII";

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localQuery]);

  // Dynamic Section options from School Settings presets for this class
  const dynamicSections = useMemo(() => {
    return getSectionsForClass(selectedClass);
  }, [selectedClass]);

  const sectionOptions = useMemo(() => {
    const list = dynamicSections.map((s) => ({ value: s, label: `Section ${s}` }));
    return [{ value: "ALL", label: "All Sections" }, ...list];
  }, [dynamicSections]);

  // Ensure current section is valid for this class
  useEffect(() => {
    if (selectedSection !== "ALL" && !dynamicSections.includes(selectedSection)) {
      setSelectedSectionState(dynamicSections[0] || "A");
    }
  }, [dynamicSections, selectedSection]);

  // Dynamic Subject list for this class
  const classSubjects = useMemo(() => {
    return getSubjectListForClass(selectedClass);
  }, [selectedClass]);

  // Ensure selected subject is valid
  useEffect(() => {
    if (!selectedSubject || !classSubjects.includes(selectedSubject)) {
      setSelectedSubjectState(classSubjects[0] || "Bengali (1st Language)");
    }
  }, [classSubjects, selectedSubject]);

  // Dynamic Exam Options based on Class
  const examOptions = useMemo(() => {
    if (selectedClass === "XI") {
      return [
        "Sem 1 Final",
        "Sem 2 Final",
        "Supplementary Examination",
      ];
    }
    if (selectedClass === "XII") {
      return [
        "Sem 3 Final",
        "Sem 4 Final",
        "Compartmental Examination",
      ];
    }
    if (selectedClass === "X") {
      return [
        "1st Summative Evaluation",
        "2nd Summative Evaluation",
        "Selection Test",
        "Supplementary / Re-test",
      ];
    }
    return [
      "1st Summative Evaluation",
      "2nd Summative Evaluation",
      "3rd Summative Evaluation",
      "Supplementary / Re-test",
    ];
  }, [selectedClass]);

  // Ensure selected exam is valid for current class
  useEffect(() => {
    if (!selectedExam || !examOptions.includes(selectedExam)) {
      setSelectedExamState(examOptions[0] || "Sem 1 Final");
    }
  }, [examOptions, selectedExam]);

  // Subject full marks breakdown for current class, exam & selected subject
  const subjectFullMarksInfo: SubjectFullMarksInfo = useMemo(() => {
    return getSubjectFullMarks(selectedClass, selectedExam, selectedSubject);
  }, [selectedClass, selectedExam, selectedSubject]);

  // Class total full marks across all subjects
  const currentClassFullMarks = getDynamicClassFullMarks(selectedClass, selectedExam);

  const updateResultUrl = (paramsToUpdate: Record<string, string | null>) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    Object.entries(paramsToUpdate).forEach(([key, val]) => {
      if (
        val === null ||
        val === "" ||
        (key === "class" && val === "V") ||
        (key === "section" && val === "A") ||
        (key === "semester" && val === "ALL") ||
        (key === "gender" && val === "ALL") ||
        (key === "year" && val === String(currentYear)) ||
        (key === "view" && val === "subject_batch")
      ) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, val);
      }
    });
    window.history.replaceState(null, "", url.toString());
  };

  const handleSelectClass = (cls: string) => {
    setSelectedClassState(cls);
    let nextExam = "1st Summative Evaluation";
    if (cls === "XI") nextExam = "Sem 1 Final";
    if (cls === "XII") nextExam = "Sem 3 Final";
    setSelectedExamState(nextExam);
    setSelectedSemesterState("ALL");
    const nextSections = getSectionsForClass(cls);
    const nextSec = nextSections[0] || "A";
    setSelectedSectionState(nextSec);
    const nextSubjects = getSubjectListForClass(cls);
    const nextSub = nextSubjects[0] || "";
    setSelectedSubjectState(nextSub);
    updateResultUrl({ class: cls, exam: nextExam, section: nextSec, subject: nextSub, semester: null });
  };

  const handleSelectSection = (sec: string) => {
    setSelectedSectionState(sec);
    updateResultUrl({ section: sec });
  };

  const handleSelectGender = (gender: "ALL" | "Male" | "Female") => {
    setSelectedGenderState(gender);
    updateResultUrl({ gender: gender === "ALL" ? null : gender });
  };

  const handleSelectSemester = (sem: Semester | "ALL") => {
    setSelectedSemesterState(sem);
    updateResultUrl({ semester: sem === "ALL" ? null : sem });
  };

  const handleSelectExam = (ex: string) => {
    setSelectedExamState(ex);
    updateResultUrl({ exam: ex });
  };

  const handleSelectSubject = (sub: string) => {
    setSelectedSubjectState(sub);
    updateResultUrl({ subject: sub });
  };

  const handleSelectAcademicYear = (yr: number) => {
    setAcademicYearState(yr);
    updateResultUrl({ year: String(yr) });
  };

  // Sync promotion policy & marks schemes updates from Settings
  useEffect(() => {
    const handleSchemeUpdate = () => {
      setPromotionPolicy(getSavedPromotionPolicy());
    };
    window.addEventListener("sms_marks_schemes_updated", handleSchemeUpdate);
    window.addEventListener("sms_promotion_policy_updated", handleSchemeUpdate);
    return () => {
      window.removeEventListener("sms_marks_schemes_updated", handleSchemeUpdate);
      window.removeEventListener("sms_promotion_policy_updated", handleSchemeUpdate);
    };
  }, []);

  // Fetch Class Results
  const effectiveSemester = selectedSemester === "ALL" ? undefined : selectedSemester;
  const { data: summary, isLoading, isFetching } = useQuery<ClassResultsSummary>({
    queryKey: ["results", academicYear, selectedClass, selectedSection, selectedExam, effectiveSemester],
    queryFn: () => getClassResults(academicYear, selectedClass, selectedSection, selectedExam, effectiveSemester),
  });

  // Rank Display Mode for Summary: "both" | "section" | "class"
  const [rankViewMode, setRankViewMode] = useState<"both" | "section" | "class">("both");

  // Subject-Wise Batch Entry Input State: studentId -> { written: string, practical: string, isAbsent: boolean }
  const [subjectBatchScores, setSubjectBatchScores] = useState<
    Record<string, { written: string; practical: string; isAbsent: boolean }>
  >({});
  const [, setIsBatchModified] = useState<boolean>(false);

  // Synchronize initial subject scores from fetched results
  useEffect(() => {
    if (!summary?.results || !selectedSubject) return;
    const scores: Record<string, { written: string; practical: string; isAbsent: boolean }> = {};

    summary.results.forEach((r) => {
      let currentVal: any = undefined;
      if (r.subjectMarks) {
        for (const [k, v] of Object.entries(r.subjectMarks)) {
          if (
            normalizeSubjectName(k) === normalizeSubjectName(selectedSubject) ||
            k.toLowerCase().trim() === selectedSubject.toLowerCase().trim()
          ) {
            currentVal = v;
            break;
          }
        }
      }

      if (currentVal !== undefined && currentVal !== null) {
        if (typeof currentVal === "object") {
          scores[r.studentId] = {
            written:
              currentVal.theory !== undefined
                ? String(currentVal.theory)
                : currentVal.written !== undefined
                ? String(currentVal.written)
                : "",
            practical:
              currentVal.practical !== undefined
                ? String(currentVal.practical)
                : currentVal.project !== undefined
                ? String(currentVal.project)
                : "",
            isAbsent: !!currentVal.isAbsent,
          };
        } else {
          scores[r.studentId] = {
            written: String(currentVal),
            practical: "",
            isAbsent: false,
          };
        }
      } else {
        scores[r.studentId] = {
          written: "",
          practical: "",
          isAbsent: false,
        };
      }
    });

    setSubjectBatchScores(scores);
    setIsBatchModified(false);
  }, [summary, selectedSubject]);

  // Subject Batch Save Mutation
  const batchSaveMutation = useMutation({
    mutationFn: async () => {
      if (!summary?.results) return;
      const entries = summary.results.map((r) => {
        const score = subjectBatchScores[r.studentId] || { written: "", practical: "", isAbsent: false };
        const rawW = parseFloat(score.written);
        const rawP = parseFloat(score.practical);
        const maxW = subjectFullMarksInfo.writtenFull;
        const maxP = subjectFullMarksInfo.practicalFull;
        const wNum = isNaN(rawW) ? 0 : Math.min(maxW, Math.max(0, rawW));
        const pNum = isNaN(rawP) ? 0 : Math.min(maxP, Math.max(0, rawP));
        return {
          studentId: r.studentId,
          roll: r.roll,
          section: r.section,
          writtenMarks: wNum,
          practicalMarks: pNum,
          isAbsent: score.isAbsent,
        };
      });

      return saveSubjectBatchMarks({
        academicYear,
        class: selectedClass,
        section: selectedSection,
        examName: selectedExam,
        subjectName: selectedSubject,
        scores: entries,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setIsBatchModified(false);
      toastWithUndo(`Marks for ${selectedSubject} saved and ranks updated.`, data?.undoId, () => {
        queryClient.invalidateQueries({ queryKey: ["results"] });
      });
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Save Failed",
        description: err.message || "Failed to save subject marks.",
      });
    },
  });

  // Single Student Edit Modal State
  const [editingStudentResult, setEditingStudentResult] = useState<StudentResult | null>(null);
  const [modalStudentScores, setModalStudentScores] = useState<
    Record<string, { theory: string; practical: string; suppTheory: string; suppPractical: string }>
  >({});
  const [modalRemarks, setModalRemarks] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Recalculate Ranks Mutation
  const rankMutation = useMutation({
    mutationFn: () => recalculateClassRanks(academicYear, selectedClass, selectedExam),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      toastWithUndo(data.message || "Dual Section & Class ranks updated.", data.undoId, () => {
        queryClient.invalidateQueries({ queryKey: ["results"] });
      });
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Rank Calculation Failed",
        description: err.message,
      });
    },
  });

  // Open Full Edit Modal for a single student
  const handleOpenEdit = (result: StudentResult) => {
    setEditingStudentResult(result);
    setModalRemarks(result.remarks || "");
    setModalError(null);

    const scoresMap: Record<string, { theory: string; practical: string; suppTheory: string; suppPractical: string }> = {};
    classSubjects.forEach((sub) => {
      let rawVal: any = undefined;
      for (const [k, v] of Object.entries(result.subjectMarks || {})) {
        if (
          normalizeSubjectName(k) === normalizeSubjectName(sub) ||
          k.toLowerCase().trim() === sub.toLowerCase().trim()
        ) {
          rawVal = v;
          break;
        }
      }
      if (rawVal !== undefined && rawVal !== null) {
        if (typeof rawVal === "object") {
          scoresMap[sub] = {
            theory:
              rawVal.theory !== undefined
                ? String(rawVal.theory)
                : rawVal.written !== undefined
                ? String(rawVal.written)
                : "",
            practical:
              rawVal.practical !== undefined
                ? String(rawVal.practical)
                : rawVal.project !== undefined
                ? String(rawVal.project)
                : "",
            suppTheory: rawVal.supplementaryTheory !== undefined ? String(rawVal.supplementaryTheory) : "",
            suppPractical: rawVal.supplementaryPractical !== undefined ? String(rawVal.supplementaryPractical) : "",
          };
        } else {
          scoresMap[sub] = { theory: String(rawVal), practical: "", suppTheory: "", suppPractical: "" };
        }
      } else {
        scoresMap[sub] = { theory: "", practical: "", suppTheory: "", suppPractical: "" };
      }
    });

    setModalStudentScores(scoresMap);
  };

  // Save Modal Marks
  const handleSaveModal = async () => {
    if (!editingStudentResult) return;

    let totalMarks = 0;
    const finalSubjectMarksMap: SubjectMarksMap = {};

    classSubjects.forEach((sub) => {
      const entry = modalStudentScores[sub] || { theory: "", practical: "", suppTheory: "", suppPractical: "" };
      const subFullInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
      const maxWritten = subFullInfo.writtenFull;
      const maxPractical = subFullInfo.practicalFull;
      const maxSubTotal = subFullInfo.totalFull;

      const rawT = parseFloat(entry.theory);
      const rawP = parseFloat(entry.practical);
      const tNum = isNaN(rawT) ? 0 : Math.min(maxWritten, Math.max(0, rawT));
      const pNum = isNaN(rawP) ? 0 : Math.min(maxPractical, Math.max(0, rawP));
      const subTotal = tNum + pNum;

      const rawSuppT = entry.suppTheory !== "" && !isNaN(parseFloat(entry.suppTheory)) ? parseFloat(entry.suppTheory) : undefined;
      const rawSuppP = entry.suppPractical !== "" && !isNaN(parseFloat(entry.suppPractical)) ? parseFloat(entry.suppPractical) : undefined;
      const suppTNum = rawSuppT !== undefined ? Math.min(maxWritten, Math.max(0, rawSuppT)) : undefined;
      const suppPNum = rawSuppP !== undefined ? Math.min(maxPractical, Math.max(0, rawSuppP)) : undefined;
      const hasSupp = suppTNum !== undefined || suppPNum !== undefined;
      const suppTot = hasSupp ? (suppTNum ?? tNum) + (suppPNum ?? pNum) : undefined;

      const evalT = suppTNum !== undefined ? suppTNum : tNum;
      const evalP = suppPNum !== undefined ? suppPNum : pNum;
      const evalTot = suppTot !== undefined ? suppTot : subTotal;

      const reqSubPassPct = promotionPolicy.subjectPassPercentage ?? promotionPolicy.minPassPercentage ?? 30;
      const tPass = maxWritten > 0 ? (evalT / maxWritten) * 100 >= (promotionPolicy.theoryPassPercentage ?? 30) : true;
      const pPass = maxPractical > 0 ? (evalP / maxPractical) * 100 >= (promotionPolicy.practicalPassPercentage ?? 30) : true;
      const isCleared = tPass && pPass && (maxSubTotal > 0 ? (evalTot / maxSubTotal) * 100 >= reqSubPassPct : true);

      totalMarks += isCleared && hasSupp ? evalTot : subTotal;

      finalSubjectMarksMap[sub] = {
        theory: tNum,
        practical: pNum,
        total: subTotal,
        ...(suppTNum !== undefined ? { supplementaryTheory: suppTNum } : {}),
        ...(suppPNum !== undefined ? { supplementaryPractical: suppPNum } : {}),
        ...(suppTot !== undefined ? { supplementaryTotal: suppTot } : {}),
        ...(hasSupp ? { isSupplementaryCleared: isCleared } : {}),
      };
    });

    try {
      const saved = await saveStudentResult({
        studentId: editingStudentResult.studentId,
        academicYear,
        class: selectedClass,
        section: editingStudentResult.section,
        roll: editingStudentResult.roll,
        semester: editingStudentResult.semester || editingStudentResult.student?.presentSemester || null,
        examName: selectedExam,
        fullMarks: currentClassFullMarks,
        marksObtained: totalMarks,
        subjectMarks: finalSubjectMarksMap,
        remarks: modalRemarks,
      });

      queryClient.invalidateQueries({ queryKey: ["results"] });
      setEditingStudentResult(null);
      toastWithUndo("Student marks updated and re-ranked.", saved.undoId, () => {
        queryClient.invalidateQueries({ queryKey: ["results"] });
      });
    } catch (e: any) {
      setModalError(e.message || "Failed to save marks.");
    }
  };

  // Filtered & Sorted Results List
  const filteredResults = useMemo(() => {
    if (!summary?.results) return [];
    let list = summary.results;

    // 1. Gender Filter (Boys / Girls / All)
    if (selectedGender !== "ALL") {
      list = list.filter((r) => {
        const g = (r.student?.gender || "").toLowerCase().trim();
        if (selectedGender === "Male") return g === "male" || g === "boy" || g === "m";
        if (selectedGender === "Female") return g === "female" || g === "girl" || g === "f";
        return true;
      });
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.student?.name || "").toLowerCase().includes(q) ||
          (r.student?.schoolId || "").toLowerCase().includes(q) ||
          (r.student?.boardRegistrationNo || "").toLowerCase().includes(q) ||
          (r.student?.pen || "").toLowerCase().includes(q) ||
          String(r.roll).includes(q)
      );
    }

    // 3. Serial Ordering
    // For Class XI & XII (isHs): arranged sequentially by Registration Number (boardRegistrationNo)
    // For other classes: arranged serially by Roll number
    if (isHs) {
      list = [...list].sort((a, b) => {
        const regA = a.student?.boardRegistrationNo?.trim() || "";
        const regB = b.student?.boardRegistrationNo?.trim() || "";
        if (regA && regB) {
          return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
        }
        if (regA && !regB) return -1;
        if (!regA && regB) return 1;
        return (a.roll || 0) - (b.roll || 0);
      });
    } else {
      list = [...list].sort((a, b) => (a.roll || 0) - (b.roll || 0));
    }

    return list;
  }, [summary, searchQuery, selectedGender, isHs]);

  // Rank Badge Formatter
  const renderRankBadge = (rank?: number) => {
    if (!rank || rank <= 0) return <span className="text-muted-foreground/50 text-xs">—</span>;
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded-full">
          <Trophy className="h-3 w-3 fill-amber-500 text-amber-600" />
          1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300 text-xs bg-slate-500/10 px-2 py-0.5 rounded-full">
          <Medal className="h-3 w-3 text-slate-500" />
          2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-500 text-xs bg-amber-700/10 px-2 py-0.5 rounded-full">
          <Award className="h-3 w-3 text-amber-700" />
          3rd
        </span>
      );
    }
    return <span className="font-mono text-xs font-semibold text-muted-foreground">{rank}th</span>;
  };

  return {
    academicYear,
    activeView,
    allowedClasses,
    batchSaveMutation,
    classOptions,
    classSubjects,
    currentClassFullMarks,
    currentYear,
    editingStudentResult,
    examOptions,
    filteredResults,
    handleOpenEdit,
    handleSaveModal,
    handleSelectAcademicYear,
    handleSelectClass,
    handleSelectExam,
    handleSelectGender,
    handleSelectSection,
    handleSelectSemester,
    handleSelectSubject,
    isHs,
    isLoading,
    isPrintModalOpen,
    localQuery,
    mobileFilterOpen,
    modalError,
    modalRemarks,
    modalStudentScores,
    promotionPolicy,
    rankMutation,
    rankViewMode,
    renderRankBadge,
    sectionOptions,
    selectedClass,
    selectedExam,
    selectedGender,
    selectedSection,
    selectedSemester,
    selectedSubject,
    setActiveView,
    setEditingStudentResult,
    setIsBatchModified,
    setIsPrintModalOpen,
    setLocalQuery,
    setMobileFilterOpen,
    setModalError,
    setModalRemarks,
    setModalStudentScores,
    setSubjectBatchScores,
    subjectBatchScores,
    subjectFullMarksInfo,
    summary,
    updateResultUrl,
  };
}

export type ResultsClientState = ReturnType<typeof useResultsClient>;
