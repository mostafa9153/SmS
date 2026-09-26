"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Trophy,
  Medal,
  Search,
  RotateCw,
  Edit,
  SlidersHorizontal,
  ChevronDown,
  Check,
  X,
  Sliders,
  BookOpen,
  Save,
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  BarChart2,
  AlertCircle,
} from "lucide-react";
import {
  getClassResults,
  saveStudentResult,
  saveSubjectBatchMarks,
  recalculateClassRanks,
} from "@/lib/data/students";
import type {
  StudentResult,
  ClassResultsSummary,
  Semester,
  SubjectMarksMap,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
import {
  getDynamicClassFullMarks,
  getSavedPromotionPolicy,
  PromotionPolicy,
  getSectionsForClass,
  getSubjectListForClass,
  getSubjectFullMarks,
  SubjectFullMarksInfo,
} from "@/lib/utils/marks-config";
import { normalizeSubjectName } from "@/lib/utils/marksheet-calc";
import { StatusBadge } from "@/components/students/status-badge";

const CLASS_OPTIONS = [
  { value: "V", label: "Class V" },
  { value: "VI", label: "Class VI" },
  { value: "VII", label: "Class VII" },
  { value: "VIII", label: "Class VIII" },
  { value: "IX", label: "Class IX" },
  { value: "X", label: "Class X" },
  { value: "XI", label: "Class XI" },
  { value: "XII", label: "Class XII" },
];

export default function ResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const classParam = searchParams.get("class");
  const sectionParam = searchParams.get("section");
  const examParam = searchParams.get("exam");
  const subjectParam = searchParams.get("subject");
  const yearParam = searchParams.get("year");
  const semesterParam = searchParams.get("semester") as Semester | null;
  const viewParam = searchParams.get("view") as "subject_batch" | "class_summary" | null;

  // Primary State
  const [academicYear, setAcademicYearState] = useState<number>(() => {
    if (yearParam && !isNaN(parseInt(yearParam, 10))) return parseInt(yearParam, 10);
    return currentYear;
  });
  const [selectedClass, setSelectedClassState] = useState<string>(classParam || "V");
  const [selectedSection, setSelectedSectionState] = useState<string>(sectionParam || "A");
  const [selectedSemester, setSelectedSemesterState] = useState<Semester | "ALL">(semesterParam || "ALL");
  const [selectedExam, setSelectedExamState] = useState<string>(examParam || "1st Summative Evaluation");
  const [selectedSubject, setSelectedSubjectState] = useState<string>(subjectParam || "");
  const [activeView, setActiveView] = useState<"subject_batch" | "class_summary">(viewParam || "subject_batch");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [localQuery, setLocalQuery] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
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
        "1st Summative Evaluation",
        "2nd Summative Evaluation",
        "Annual Examination",
      ];
    }
    if (selectedClass === "XII") {
      return [
        "Sem 3 Final",
        "Sem 4 Final",
        "Compartmental Examination",
        "Selection Test",
        "Annual Examination",
      ];
    }
    if (selectedClass === "X") {
      return [
        "1st Summative Evaluation",
        "2nd Summative Evaluation",
        "Selection Test",
        "Supplementary / Re-test",
        "Annual Examination",
      ];
    }
    return [
      "1st Summative Evaluation",
      "2nd Summative Evaluation",
      "3rd Summative Evaluation",
      "Supplementary / Re-test",
      "Annual Examination",
    ];
  }, [selectedClass]);

  // Subject full marks breakdown for current class & exam
  const subjectFullMarksInfo: SubjectFullMarksInfo = useMemo(() => {
    return getSubjectFullMarks(selectedClass, selectedExam);
  }, [selectedClass, selectedExam]);

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
        const wNum = parseFloat(score.written) || 0;
        const pNum = parseFloat(score.practical) || 0;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setIsBatchModified(false);
      showToast({
        type: "success",
        title: "Subject Marks Saved",
        description: `Marks for ${selectedSubject} saved and ranks updated.`,
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
      showToast({
        type: "success",
        title: "Ranks Recalculated",
        description: data.message || "Dual Section & Class ranks updated.",
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
      const tNum = parseFloat(entry.theory) || 0;
      const pNum = parseFloat(entry.practical) || 0;
      const subTotal = tNum + pNum;

      const suppTNum = entry.suppTheory !== "" && !isNaN(parseFloat(entry.suppTheory)) ? parseFloat(entry.suppTheory) : undefined;
      const suppPNum = entry.suppPractical !== "" && !isNaN(parseFloat(entry.suppPractical)) ? parseFloat(entry.suppPractical) : undefined;
      const hasSupp = suppTNum !== undefined || suppPNum !== undefined;
      const suppTot = hasSupp ? (suppTNum ?? tNum) + (suppPNum ?? pNum) : undefined;

      const maxWritten = subjectFullMarksInfo.writtenFull;
      const maxPractical = subjectFullMarksInfo.practicalFull;
      const maxSubTotal = subjectFullMarksInfo.totalFull;

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
      await saveStudentResult({
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
      showToast({
        type: "success",
        title: "Marks Saved",
        description: "Student marks updated and re-ranked.",
      });
    } catch (e: any) {
      setModalError(e.message || "Failed to save marks.");
    }
  };

  // Filtered Results List
  const filteredResults = useMemo(() => {
    if (!summary?.results) return [];
    let list = summary.results;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.student?.name || "").toLowerCase().includes(q) ||
          (r.student?.schoolId || "").toLowerCase().includes(q) ||
          (r.student?.pen || "").toLowerCase().includes(q) ||
          String(r.roll).includes(q)
      );
    }

    return list;
  }, [summary, searchQuery]);

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

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. TOP STICKY FILTER BAR (Identical to StudentFiltersBar) */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/80 px-3 sm:px-6 py-2 sm:py-3 shadow-2xs space-y-2">
        {/* Mobile Top Bar (<sm): Search + Filter Drawer Trigger */}
        <div className="flex sm:hidden items-center gap-2.5">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full h-11 min-h-[44px] rounded-2xl border border-border/90 bg-card hover:bg-background pl-10 pr-9 text-base font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all shadow-2xs placeholder:text-muted-foreground/70"
            />
            {localQuery && (
              <button
                onClick={() => setLocalQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer h-11 min-h-[44px] bg-primary text-primary-foreground border-primary shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Mobile Filter Sheet Drawer */}
        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] rounded-t-[2.25rem] p-5 overflow-y-auto space-y-4 border-t border-border shadow-2xl pb-safe"
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2" />
            <SheetHeader className="p-0 flex flex-row items-center justify-between border-b pb-3 text-left">
              <SheetTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Filter Evaluation
              </SheetTitle>
            </SheetHeader>

            {/* Touch Class Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Class</label>
              <div className="flex flex-wrap gap-1.5">
                {CLASS_OPTIONS.map((c) => {
                  const isSelected = selectedClass === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleSelectClass(c.value)}
                      className={cn(
                        "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/80 text-foreground hover:bg-muted"
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Touch Section Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Section</label>
              <div className="flex flex-wrap gap-1.5">
                {sectionOptions.map((s) => {
                  const isSelected = selectedSection === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleSelectSection(s.value)}
                      className={cn(
                        "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/80 text-foreground hover:bg-muted"
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Touch Subject Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Select Subject</label>
              <div className="flex flex-wrap gap-1.5">
                {classSubjects.map((sub) => {
                  const isSelected = selectedSubject === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleSelectSubject(sub)}
                      className={cn(
                        "min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/80 text-foreground hover:bg-muted"
                      )}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 sticky bottom-0 bg-background pb-2">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full h-12 min-h-[48px] rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Apply Selection</span>
                <span className="opacity-90 font-mono font-normal text-xs">
                  ({filteredResults.length} students)
                </span>
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Filter Bar (visible sm+) */}
        <div className="hidden sm:flex flex-wrap gap-2 items-center">
          {/* Smart search */}
          <div className="relative min-w-[170px] flex-1 max-w-xs group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70 group-focus-within:text-primary transition-colors pointer-events-none" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder="Search name, roll, or ID…"
              className="w-full rounded-xl border border-border/90 hover:border-primary/40 bg-card hover:bg-background pl-9 pr-8 py-1.5 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary focus:bg-background transition-all shadow-2xs placeholder:text-muted-foreground/70"
            />
            {localQuery && (
              <button
                onClick={() => setLocalQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Year filter */}
          <FilterSelect
            value={String(academicYear)}
            onChange={(v) => handleSelectAcademicYear(parseInt(v, 10))}
            placeholder="Year"
            options={[
              { label: "2026", value: "2026" },
              { label: "2025", value: "2025" },
              { label: "2024", value: "2024" },
            ]}
          />

          {/* Class filter */}
          <FilterSelect
            value={selectedClass}
            onChange={handleSelectClass}
            placeholder="Class"
            options={CLASS_OPTIONS}
          />

          {/* Section filter (Dynamically from School Settings) */}
          <FilterSelect
            value={selectedSection}
            onChange={handleSelectSection}
            placeholder="Section"
            options={sectionOptions}
          />

          {/* Semester filter (Higher Secondary Class XI / XII Only) */}
          {isHs && (
            <FilterSelect
              value={selectedSemester}
              onChange={(v) => handleSelectSemester(v as Semester | "ALL")}
              placeholder="Semester"
              options={
                selectedClass === "XI"
                  ? [
                      { label: "All Semesters", value: "ALL" },
                      { label: "Semester 1", value: "Sem 1" },
                      { label: "Semester 2", value: "Sem 2" },
                    ]
                  : [
                      { label: "All Semesters", value: "ALL" },
                      { label: "Semester 3", value: "Sem 3" },
                      { label: "Semester 4", value: "Sem 4" },
                    ]
              }
            />
          )}

          {/* Evaluation / Exam */}
          <FilterSelect
            value={selectedExam}
            onChange={handleSelectExam}
            placeholder="Evaluation"
            options={examOptions.map((e) => ({ label: e, value: e }))}
          />

          {/* Subject Selector */}
          <FilterSelect
            value={selectedSubject}
            onChange={handleSelectSubject}
            placeholder="Subject"
            options={classSubjects.map((s) => ({ label: s, value: s }))}
            isPrimaryHighlight
          />
        </div>
      </div>

      {/* 2. MAIN BODY CONTAINER (Identical to Student Register Layout) */}
      <div className="p-3.5 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
        {/* Page Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.back()}
              title="Back"
              className="rounded-xl p-2 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/60 bg-card shadow-2xs cursor-pointer active:scale-90"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
                Results & Evaluation
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary border-primary/25 font-bold shadow-2xs">
                {isLoading ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Loading...</span>
                  </span>
                ) : (
                  <>
                    <span className="font-mono font-bold text-xs">{filteredResults.length}</span>
                    <span className="text-[11px] font-medium opacity-85">students</span>
                  </>
                )}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-mono font-semibold bg-muted/60 text-muted-foreground">
                {academicYear}
              </span>
              {isHs && (
                <Badge className="bg-purple-600 text-white text-[10px] font-semibold">
                  Higher Secondary
                </Badge>
              )}
            </div>
          </div>

          {/* Action Toolbar & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 bg-muted/80 rounded-xl border border-border/70 shadow-2xs">
              <button
                onClick={() => {
                  setActiveView("subject_batch");
                  updateResultUrl({ view: "subject_batch" });
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeView === "subject_batch"
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                <span>Subject Batch</span>
              </button>
              <button
                onClick={() => {
                  setActiveView("class_summary");
                  updateResultUrl({ view: "class_summary" });
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  activeView === "class_summary"
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Class Summary</span>
              </button>
            </div>

            <Link
              href="/settings/school-details?tab=marks_scheme"
              className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-all text-muted-foreground hover:text-foreground shadow-2xs"
              title="Configure Pass % and Evaluation Schemes"
            >
              <Sliders className="h-3.5 w-3.5 text-primary" />
              <span>Pass Policy ({promotionPolicy.minPassPercentage}%)</span>
            </Link>

            <button
              onClick={() => rankMutation.mutate()}
              disabled={rankMutation.isPending || isLoading}
              className="flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
              title="Recalculate dual Section & Class merit ranks"
            >
              <RotateCw className={cn("h-3.5 w-3.5 text-muted-foreground", rankMutation.isPending && "animate-spin")} />
              <span>Re-Rank</span>
            </button>

            {/* Primary Action Button (Subject Batch Save) */}
            {activeView === "subject_batch" && (
              <button
                type="button"
                onClick={() => batchSaveMutation.mutate()}
                disabled={batchSaveMutation.isPending || isLoading || filteredResults.length === 0}
                className="flex items-center justify-center gap-2 min-h-[40px] sm:min-h-[36px] rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
              >
                {batchSaveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{batchSaveMutation.isPending ? "Saving Marks…" : "Save All Marks"}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. VIEW MODE 1: SUBJECT-WISE BATCH ENTRY */}
        {activeView === "subject_batch" && (
          <div className="space-y-3">
            {/* Sub-Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card border border-border/80 rounded-2xl px-4 py-2.5 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Class {selectedClass} • Section {selectedSection} • {selectedSubject}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono bg-muted/60 text-muted-foreground">
                  {selectedExam}
                </span>
              </div>

              <div className="text-xs text-muted-foreground font-medium">
                Full Marks:{" "}
                <strong className="text-foreground font-mono">
                  {subjectFullMarksInfo.hasPractical
                    ? `Written: ${subjectFullMarksInfo.writtenFull} + Project: ${subjectFullMarksInfo.practicalFull} = ${subjectFullMarksInfo.totalFull}`
                    : `Written: ${subjectFullMarksInfo.writtenFull} Marks`}
                </strong>
              </div>
            </div>

            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden md:block rounded-2xl border border-border/80 bg-card/90 overflow-x-auto shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                      Roll
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-40">
                      School ID
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                      Sec
                    </th>
                    {/* Written Input */}
                    <th className="px-4 py-3 text-center text-xs font-bold text-foreground bg-primary/5 border-l w-32 tracking-wider uppercase">
                      Written ({subjectFullMarksInfo.writtenFull})
                    </th>
                    {/* Project & Practical Input (Class 9-12 Only) */}
                    {subjectFullMarksInfo.hasPractical && (
                      <th className="px-4 py-3 text-center text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20 border-l w-36 tracking-wider uppercase">
                        Project & Practical ({subjectFullMarksInfo.practicalFull})
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase border-l w-28">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-24">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-16">
                      Absent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-xs">Loading student roster…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-muted-foreground text-xs">
                        No students found in Class {selectedClass} - Section {selectedSection}.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => {
                      const score = subjectBatchScores[r.studentId] || { written: "", practical: "", isAbsent: false };
                      const wNum = parseFloat(score.written) || 0;
                      const pNum = parseFloat(score.practical) || 0;
                      const subTotal = score.isAbsent ? 0 : wNum + pNum;
                      const hasEntered = score.isAbsent || score.written !== "" || score.practical !== "";

                      const tPass =
                        subjectFullMarksInfo.writtenFull > 0
                          ? (wNum / subjectFullMarksInfo.writtenFull) * 100 >= promotionPolicy.theoryPassPercentage
                          : true;
                      const pPass =
                        subjectFullMarksInfo.practicalFull > 0
                          ? (pNum / subjectFullMarksInfo.practicalFull) * 100 >= promotionPolicy.practicalPassPercentage
                          : true;
                      const isSubPassed =
                        !score.isAbsent &&
                        tPass &&
                        pPass &&
                        (subTotal / subjectFullMarksInfo.totalFull) * 100 >= (promotionPolicy.subjectPassPercentage ?? promotionPolicy.minPassPercentage ?? 30);

                      return (
                        <tr key={r.studentId} className="hover:bg-primary/[0.04] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {r.roll}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {r.student?.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                            {r.student?.schoolId}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-muted-foreground">
                            {r.section}
                          </td>

                          {/* Written Input Box */}
                          <td className="px-3 py-2 text-center bg-primary/[0.02] border-l">
                            <input
                              type="number"
                              min="0"
                              max={subjectFullMarksInfo.writtenFull}
                              step="0.5"
                              disabled={score.isAbsent}
                              placeholder={`0 to ${subjectFullMarksInfo.writtenFull}`}
                              value={score.written}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubjectBatchScores((prev) => ({
                                  ...prev,
                                  [r.studentId]: {
                                    ...prev[r.studentId],
                                    written: val,
                                  },
                                }));
                                setIsBatchModified(true);
                              }}
                              className={cn(
                                "w-24 mx-auto text-center font-mono text-xs font-bold rounded-xl border border-border/90 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary shadow-2xs transition-all",
                                score.isAbsent && "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                              )}
                            />
                          </td>

                          {/* Project & Practical Input Box */}
                          {subjectFullMarksInfo.hasPractical && (
                            <td className="px-3 py-2 text-center bg-purple-500/[0.03] border-l">
                              <input
                                type="number"
                                min="0"
                                max={subjectFullMarksInfo.practicalFull}
                                step="0.5"
                                disabled={score.isAbsent}
                                placeholder={`0 to ${subjectFullMarksInfo.practicalFull}`}
                                value={score.practical}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSubjectBatchScores((prev) => ({
                                    ...prev,
                                    [r.studentId]: {
                                      ...prev[r.studentId],
                                      practical: val,
                                    },
                                  }));
                                  setIsBatchModified(true);
                                }}
                                className={cn(
                                  "w-24 mx-auto text-center font-mono text-xs font-bold rounded-xl border border-border/90 py-1.5 bg-background outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs transition-all",
                                  score.isAbsent && "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                )}
                              />
                            </td>
                          )}

                          {/* Total Score */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-foreground border-l">
                            {score.isAbsent ? (
                              <span className="text-rose-600 font-bold">AB (0)</span>
                            ) : hasEntered ? (
                              <span>
                                {subTotal}{" "}
                                <span className="text-[11px] text-muted-foreground font-normal">
                                  / {subjectFullMarksInfo.totalFull}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 font-normal italic">—</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3 text-center">
                            {score.isAbsent ? (
                              <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 font-bold">
                                Absent
                              </Badge>
                            ) : hasEntered ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5",
                                  isSubPassed
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300"
                                )}
                              >
                                {isSubPassed ? "Pass" : "Fail"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </td>

                          {/* Absent Checkbox */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={score.isAbsent}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSubjectBatchScores((prev) => ({
                                  ...prev,
                                  [r.studentId]: {
                                    ...prev[r.studentId],
                                    isAbsent: checked,
                                    written: checked ? "0" : prev[r.studentId]?.written || "",
                                    practical: checked ? "0" : prev[r.studentId]?.practical || "",
                                  },
                                }));
                                setIsBatchModified(true);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                              title="Mark as Absent"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (<md) */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {isLoading ? (
                <div className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading student roster…
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">
                  No students found.
                </div>
              ) : (
                filteredResults.map((r) => {
                  const score = subjectBatchScores[r.studentId] || { written: "", practical: "", isAbsent: false };
                  const wNum = parseFloat(score.written) || 0;
                  const pNum = parseFloat(score.practical) || 0;
                  const subTotal = score.isAbsent ? 0 : wNum + pNum;

                  return (
                    <div
                      key={r.studentId}
                      className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-lg">
                            Roll {r.roll}
                          </span>
                          <span className="font-bold text-sm text-foreground">{r.student?.name}</span>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={score.isAbsent}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSubjectBatchScores((prev) => ({
                                ...prev,
                                [r.studentId]: {
                                  ...prev[r.studentId],
                                  isAbsent: checked,
                                  written: checked ? "0" : prev[r.studentId]?.written || "",
                                  practical: checked ? "0" : prev[r.studentId]?.practical || "",
                                },
                              }));
                              setIsBatchModified(true);
                            }}
                            className="h-4 w-4 rounded text-rose-600 cursor-pointer"
                          />
                          <span>Absent</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-muted-foreground block">
                            Written ({subjectFullMarksInfo.writtenFull})
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={subjectFullMarksInfo.writtenFull}
                            disabled={score.isAbsent}
                            placeholder="0"
                            value={score.written}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSubjectBatchScores((prev) => ({
                                ...prev,
                                [r.studentId]: { ...prev[r.studentId], written: val },
                              }));
                              setIsBatchModified(true);
                            }}
                            className="w-full text-center font-mono font-bold rounded-xl border py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                          />
                        </div>

                        {subjectFullMarksInfo.hasPractical && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 block">
                              Project ({subjectFullMarksInfo.practicalFull})
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={subjectFullMarksInfo.practicalFull}
                              disabled={score.isAbsent}
                              placeholder="0"
                              value={score.practical}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubjectBatchScores((prev) => ({
                                  ...prev,
                                  [r.studentId]: { ...prev[r.studentId], practical: val },
                                }));
                                setIsBatchModified(true);
                              }}
                              className="w-full text-center font-mono font-bold rounded-xl border py-1.5 bg-background outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t text-xs">
                        <span className="text-muted-foreground">
                          ID: <strong className="font-mono text-foreground">{r.student?.schoolId}</strong>
                        </span>
                        <span className="font-mono font-bold">
                          Total: {score.isAbsent ? "AB (0)" : `${subTotal} / ${subjectFullMarksInfo.totalFull}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. VIEW MODE 2: MASTER CLASS MERIT & SUMMARY */}
        {activeView === "class_summary" && (
          <div className="space-y-4">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Enrolled
                </span>
                <div className="text-2xl font-mono font-extrabold text-foreground mt-1">
                  {summary?.totalStudents || 0}
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Evaluated
                </span>
                <div className="text-2xl font-mono font-extrabold text-primary mt-1">
                  {summary?.evaluatedCount || 0}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {summary?.totalStudents || 0}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Highest Marks
                </span>
                <div className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {summary?.highestMarks || 0}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {currentClassFullMarks}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Class Average
                </span>
                <div className="text-2xl font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  {summary?.averageMarks || 0}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({currentClassFullMarks > 0 ? (((summary?.averageMarks || 0) / currentClassFullMarks) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Data Table */}
            <div className="hidden md:block rounded-2xl border border-border/80 bg-card/90 overflow-x-auto shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                      Roll
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-40">
                      School ID / PEN
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                      Sec
                    </th>
                    {isHs && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-purple-700 dark:text-purple-300 tracking-wider uppercase w-16">
                        Sem
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      Total Obtained
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      Percentage
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      Auto-Promotion Status
                    </th>
                    {(rankViewMode === "both" || rankViewMode === "section") && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                        Sec Rank
                      </th>
                    )}
                    {(rankViewMode === "both" || rankViewMode === "class") && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                        Class Rank
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-xs">Loading student summary…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-muted-foreground text-xs">
                        No student records found.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((r) => {
                      const isEvaluated = r.marksObtained > 0;

                      return (
                        <tr key={r.studentId} className="hover:bg-primary/[0.04] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {r.roll}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {r.student?.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                            <div>{r.student?.schoolId}</div>
                            {r.student?.pen && (
                              <div className="text-[10px] text-muted-foreground/70">PEN: {r.student.pen}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-muted-foreground">
                            {r.section}
                          </td>
                          {isHs && (
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className="text-[10px] font-mono text-purple-700 dark:text-purple-300">
                                {r.student?.presentSemester || r.semester || "—"}
                              </Badge>
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {isEvaluated ? (
                              <span>
                                {r.marksObtained}{" "}
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  / {r.fullMarks}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 italic font-normal">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            {isEvaluated ? (
                              <span
                                className={cn(
                                  r.percentage >= 60
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : r.percentage >= (promotionPolicy.subjectPassPercentage ?? promotionPolicy.minPassPercentage ?? 30)
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {r.percentage}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEvaluated ? (
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {r.grade ? r.grade.split(" ")[0] : "—"}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEvaluated && r.evaluatedStatus ? (
                              <StatusBadge status={r.evaluatedStatus} size="sm" />
                            ) : (
                              <span className="text-muted-foreground/40 italic text-[11px]">—</span>
                            )}
                          </td>
                          {(rankViewMode === "both" || rankViewMode === "section") && (
                            <td className="px-4 py-3 text-center">
                              {isEvaluated ? renderRankBadge(r.rankInSection) : "—"}
                            </td>
                          )}
                          {(rankViewMode === "both" || rankViewMode === "class") && (
                            <td className="px-4 py-3 text-center">
                              {isEvaluated ? renderRankBadge(r.rankInClass) : "—"}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="inline-flex items-center gap-1 rounded-xl border border-border/80 px-2.5 py-1 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Edit className="h-3 w-3 text-muted-foreground" />
                              <span>{isEvaluated ? "Edit All" : "Enter"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (<md) */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {isLoading ? (
                <div className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                  Loading summary…
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">
                  No students found.
                </div>
              ) : (
                filteredResults.map((r) => {
                  const isEvaluated = r.marksObtained > 0;
                  return (
                    <div key={r.studentId} className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-lg">
                              Roll {r.roll}
                            </span>
                            <span className="font-bold text-xs text-foreground">{r.student?.name}</span>
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {r.student?.schoolId} • Sec {r.section}
                            {r.student?.presentSemester && ` • ${r.student.presentSemester}`}
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border/80 px-2.5 py-1 text-xs font-semibold hover:bg-muted shrink-0"
                        >
                          <Edit className="h-3 w-3 text-muted-foreground" />
                          <span>{isEvaluated ? "Edit All" : "Enter"}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Marks / %</span>
                          <span className="font-mono font-bold">
                            {isEvaluated ? (
                              <>
                                {r.marksObtained} / {r.fullMarks}{" "}
                                <span className="text-primary font-normal">({r.percentage}%)</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground/50 italic">Pending</span>
                            )}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Status</span>
                          {isEvaluated && r.evaluatedStatus ? (
                            <StatusBadge status={r.evaluatedStatus} size="sm" />
                          ) : (
                            <span className="text-muted-foreground/40 italic">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. SINGLE STUDENT MULTI-SUBJECT EDIT DIALOG */}
      <Dialog open={!!editingStudentResult} onOpenChange={(open) => !open && setEditingStudentResult(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-sm font-bold">
              <span>Marksheet Entry: {editingStudentResult?.student?.name}</span>
              <Badge variant="outline" className="text-xs font-mono">
                Class {selectedClass}-{editingStudentResult?.section} • Roll {editingStudentResult?.roll}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedExam} • Full Marks: {currentClassFullMarks}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {modalError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 p-3 text-xs text-rose-800 dark:text-rose-300 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Subject-Wise Breakdown Table */}
            <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xs">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Subject</th>
                    <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-24">
                      Written ({subjectFullMarksInfo.writtenFull})
                    </th>
                    {subjectFullMarksInfo.hasPractical && (
                      <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-24">
                        Practical ({subjectFullMarksInfo.practicalFull})
                      </th>
                    )}
                    <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-16">Total</th>
                    <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-24">Status</th>
                    <th className="px-2 py-2 text-center font-semibold text-muted-foreground bg-primary/5 w-44">
                      Supplementary / Re-test
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {classSubjects.map((sub) => {
                    const entry = modalStudentScores[sub] || { theory: "", practical: "", suppTheory: "", suppPractical: "" };
                    const tVal = parseFloat(entry.theory) || 0;
                    const pVal = parseFloat(entry.practical) || 0;
                    const subTotal = tVal + pVal;
                    const maxWritten = subjectFullMarksInfo.writtenFull;
                    const maxPractical = subjectFullMarksInfo.practicalFull;
                    const maxSubTotal = subjectFullMarksInfo.totalFull;

                    const reqSubPassPct = promotionPolicy.subjectPassPercentage ?? promotionPolicy.minPassPercentage ?? 30;
                    const tPass = maxWritten > 0 ? (tVal / maxWritten) * 100 >= (promotionPolicy.theoryPassPercentage ?? 30) : true;
                    const pPass = maxPractical > 0 ? (pVal / maxPractical) * 100 >= (promotionPolicy.practicalPassPercentage ?? 30) : true;
                    const isOriginalPassed = (tVal > 0 || pVal > 0) && tPass && pPass && (maxSubTotal > 0 ? (subTotal / maxSubTotal) * 100 >= reqSubPassPct : true);

                    const hasSuppInput = (entry.suppTheory !== "" && entry.suppTheory !== undefined) || (entry.suppPractical !== "" && entry.suppPractical !== undefined);
                    const suppTVal = entry.suppTheory !== "" ? (parseFloat(entry.suppTheory) || 0) : tVal;
                    const suppPVal = entry.suppPractical !== "" ? (parseFloat(entry.suppPractical) || 0) : pVal;
                    const suppTotal = suppTVal + suppPVal;

                    const suppTPass = maxWritten > 0 ? (suppTVal / maxWritten) * 100 >= (promotionPolicy.theoryPassPercentage ?? 30) : true;
                    const suppPPass = maxPractical > 0 ? (suppPVal / maxPractical) * 100 >= (promotionPolicy.practicalPassPercentage ?? 30) : true;
                    const isSuppPassed = hasSuppInput && suppTPass && suppPPass && (maxSubTotal > 0 ? (suppTotal / maxSubTotal) * 100 >= reqSubPassPct : true);

                    return (
                      <tr key={sub} className="hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-foreground">
                          {sub}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={maxWritten}
                            value={entry.theory}
                            onChange={(e) => {
                              setModalStudentScores((prev) => ({
                                ...prev,
                                [sub]: {
                                  ...prev[sub],
                                  theory: e.target.value,
                                  practical: prev[sub]?.practical || "",
                                  suppTheory: prev[sub]?.suppTheory || "",
                                  suppPractical: prev[sub]?.suppPractical || "",
                                },
                              }));
                              setModalError(null);
                            }}
                            placeholder="0"
                            className="w-full text-center font-mono text-xs rounded-xl border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                          />
                        </td>
                        {subjectFullMarksInfo.hasPractical && (
                          <td className="px-2 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={maxPractical}
                              value={entry.practical}
                              onChange={(e) => {
                                setModalStudentScores((prev) => ({
                                  ...prev,
                                  [sub]: {
                                    theory: prev[sub]?.theory || "",
                                    practical: e.target.value,
                                    suppTheory: prev[sub]?.suppTheory || "",
                                    suppPractical: prev[sub]?.suppPractical || "",
                                  },
                                }));
                                setModalError(null);
                              }}
                              placeholder="0"
                              className="w-full text-center font-mono text-xs rounded-xl border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                            />
                          </td>
                        )}
                        <td className="px-2 py-2 text-right font-mono font-bold text-foreground">
                          {isSuppPassed && hasSuppInput ? suppTotal : subTotal}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">/ {maxSubTotal}</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          {isSuppPassed ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold px-1.5 py-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                            >
                              Cleared (Supp)
                            </Badge>
                          ) : isOriginalPassed ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                            >
                              Pass
                            </Badge>
                          ) : (subTotal > 0 || hasSuppInput) ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold px-1.5 py-0 bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300"
                            >
                              Fail
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40 text-[10px]">—</span>
                          )}
                        </td>
                        {/* Supplementary Entry Inputs */}
                        <td className="px-2 py-2 bg-primary/5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={maxWritten}
                              value={entry.suppTheory}
                              onChange={(e) => {
                                setModalStudentScores((prev) => ({
                                  ...prev,
                                  [sub]: {
                                    theory: prev[sub]?.theory || "",
                                    practical: prev[sub]?.practical || "",
                                    suppTheory: e.target.value,
                                    suppPractical: prev[sub]?.suppPractical || "",
                                  },
                                }));
                                setModalError(null);
                              }}
                              placeholder="Supp Th"
                              title="Supplementary / Re-test Written Marks"
                              className="w-1/2 text-center font-mono text-[11px] rounded-lg border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-[10px]"
                            />
                            {subjectFullMarksInfo.hasPractical ? (
                              <input
                                type="number"
                                min="0"
                                max={maxPractical}
                                value={entry.suppPractical}
                                onChange={(e) => {
                                  setModalStudentScores((prev) => ({
                                    ...prev,
                                    [sub]: {
                                      theory: prev[sub]?.theory || "",
                                      practical: prev[sub]?.practical || "",
                                      suppTheory: prev[sub]?.suppTheory || "",
                                      suppPractical: e.target.value,
                                    },
                                  }));
                                  setModalError(null);
                                }}
                                placeholder="Supp Pr"
                                title="Supplementary / Re-test Practical Marks"
                                className="w-1/2 text-center font-mono text-[11px] rounded-lg border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-[10px]"
                              />
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40 w-1/2 text-center">N/A</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Optional Remarks */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Excellent progress in Mathematics"
                value={modalRemarks}
                onChange={(e) => setModalRemarks(e.target.value)}
                className="w-full rounded-xl border border-border/80 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary shadow-2xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setEditingStudentResult(null)}
              className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModal}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
            >
              Save Marksheet & Re-Rank
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Reusable FilterSelect Helper Component (Matching StudentFiltersBar Exactly)
// ----------------------------------------------------------------------------
function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  isPrimaryHighlight = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { label: string; value: string }[];
  isPrimaryHighlight?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 outline-none select-none cursor-pointer shadow-2xs",
          isPrimaryHighlight
            ? "border-primary/60 bg-primary/10 text-primary font-bold ring-1 ring-primary/30 shadow-xs"
            : value
            ? "border-primary/40 bg-primary/5 text-foreground font-semibold"
            : "border-border/90 bg-card hover:bg-background text-foreground/80 hover:text-foreground hover:border-primary/40 hover:shadow-xs",
          isOpen && "ring-2 ring-primary/25 border-primary shadow-xs"
        )}
      >
        <span className="truncate max-w-[170px]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 shrink-0 ml-0.5",
            isOpen ? "rotate-180 text-primary" : "text-muted-foreground/80"
          )}
        />
      </button>

      {/* Floating Animated Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-[220px] sm:w-[260px] rounded-2xl border border-border/90 bg-popover text-popover-foreground p-2 shadow-2xl z-[100] animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 mb-1.5 border-b border-border/60 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 rounded-xl">
            <span>{placeholder}</span>
          </div>

          <div className="max-h-[260px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition-all duration-150 cursor-pointer",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
