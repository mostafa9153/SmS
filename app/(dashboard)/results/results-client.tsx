"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Trophy,
  Medal,
  Sparkles,
  ChevronDown,
  Search,
  Download,
  RotateCw,
  Edit,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Check,
  X,
  Eye,
  Filter,
  Upload,
  ArrowLeft,
} from "lucide-react";
import { getClassResults, saveStudentResult, recalculateClassRanks } from "@/lib/data/students";
import type { StudentResult, ClassResultsSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
import { CustomSelect } from "@/components/ui/custom-select";
import { getDynamicClassFullMarks } from "@/lib/utils/marks-config";

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

const EXAMS = [
  "1st Summative Evaluation",
  "2nd Summative Evaluation",
  "Annual Examination",
];

export default function ResultsClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  // Filter State
  const [academicYear, setAcademicYear] = useState<number>(currentYear);
  const [selectedClass, setSelectedClass] = useState<string>("V");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [selectedExam, setSelectedExam] = useState<string>("1st Summative Evaluation");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [, setSchemeVersion] = useState<number>(0);

  // Dynamic Full Marks resolved from Settings-configured Evaluation Scheme
  const currentFullMarks = getDynamicClassFullMarks(selectedClass, selectedExam);

  // Re-render when marks scheme is updated in Settings
  useEffect(() => {
    const handleSchemeUpdate = () => {
      setSchemeVersion((v) => v + 1);
    };
    window.addEventListener("sms_marks_schemes_updated", handleSchemeUpdate);
    return () => window.removeEventListener("sms_marks_schemes_updated", handleSchemeUpdate);
  }, []);

  // Rank Display Mode: "section" | "class" | "both"
  const [rankViewMode, setRankViewMode] = useState<"both" | "section" | "class">("both");

  // Modal State for Entering Single Marks
  const [editingStudentResult, setEditingStudentResult] = useState<StudentResult | null>(null);
  const [inputMarks, setInputMarks] = useState<string>("");
  const [inputRemarks, setInputRemarks] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Quick Inline Batch Entry State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchMarks, setBatchMarks] = useState<Record<string, string>>({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Fetch Class Results
  const { data: summary, isLoading, isFetching } = useQuery<ClassResultsSummary>({
    queryKey: ["results", academicYear, selectedClass, selectedSection, selectedExam],
    queryFn: () => getClassResults(academicYear, selectedClass, selectedSection, selectedExam),
  });

  // Save Marks Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => saveStudentResult(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setEditingStudentResult(null);
      setInputMarks("");
      setInputRemarks("");
      setModalError(null);
      showToast({
        type: "success",
        title: "Marks Saved",
        description: "Student exam marks saved and ranks re-indexed.",
      });
    },
    onError: (err: any) => {
      setModalError(err.message || "Failed to save marks.");
      showToast({
        type: "error",
        title: "Save Failed",
        description: err.message || "Failed to save marks.",
      });
    },
  });

  // Recalculate Ranks Mutation
  const rankMutation = useMutation({
    mutationFn: () => recalculateClassRanks(academicYear, selectedClass, selectedExam),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      showToast({
        type: "success",
        title: "Ranks Recalculated",
        description: data.message || "Section and Class ranks updated successfully.",
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

  // Open Edit Modal
  const handleOpenEdit = (result: StudentResult) => {
    setEditingStudentResult(result);
    setInputMarks(result.marksObtained > 0 ? String(result.marksObtained) : "");
    setInputRemarks(result.remarks || "");
    setModalError(null);
  };

  // Submit Modal
  const handleSaveMarks = () => {
    if (!editingStudentResult) return;
    const num = parseFloat(inputMarks);
    if (isNaN(num)) {
      setModalError("Please enter a valid numeric marks value.");
      return;
    }
    if (num < 0) {
      setModalError("Marks cannot be negative.");
      return;
    }
    if (num > currentFullMarks) {
      setModalError(`Marks cannot exceed Full Marks (${currentFullMarks}) for Class ${selectedClass}.`);
      return;
    }

    saveMutation.mutate({
      studentId: editingStudentResult.studentId,
      academicYear,
      class: selectedClass,
      section: editingStudentResult.section,
      roll: editingStudentResult.roll,
      examName: selectedExam,
      fullMarks: currentFullMarks,
      marksObtained: num,
      remarks: inputRemarks,
    });
  };

  // Save Batch Marks
  const handleSaveBatchMarks = async () => {
    const studentIds = Object.keys(batchMarks);
    if (studentIds.length === 0) {
      setIsBatchMode(false);
      return;
    }

    setIsSavingBatch(true);
    try {
      const fullMarks = currentFullMarks;
      for (const studentId of studentIds) {
        const valStr = batchMarks[studentId];
        if (valStr !== undefined && valStr.trim() !== "") {
          const num = parseFloat(valStr);
          if (!isNaN(num) && num >= 0 && num <= fullMarks) {
            const studentRow = summary?.results.find((r) => r.studentId === studentId);
            if (studentRow) {
              await saveStudentResult({
                studentId,
                academicYear,
                class: selectedClass,
                section: studentRow.section,
                roll: studentRow.roll,
                examName: selectedExam,
                fullMarks,
                marksObtained: num,
              });
            }
          }
        }
      }

      await recalculateClassRanks(academicYear, selectedClass, selectedExam);
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setBatchMarks({});
      setIsBatchMode(false);
      showToast({
        type: "success",
        title: "All Marks Saved",
        description: `Successfully saved marks for ${studentIds.length} students and recalculated ranks!`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Batch Save Failed",
        description: err.message || "Failed to save all marks.",
      });
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!summary || !summary.results.length) return;

    const exportRows = summary.results.map((r) => ({
      "Roll": r.roll,
      "Student Name": r.student?.name || "Unknown",
      "School ID": r.student?.schoolId || "N/A",
      "PEN": r.student?.pen || "",
      "Class": r.class,
      "Section": r.section,
      "Exam": r.examName,
      "Full Marks": r.fullMarks,
      "Marks Obtained": r.marksObtained,
      "Percentage": `${r.percentage}%`,
      "Grade": r.grade || "",
      "Section Rank": r.rankInSection ?? "",
      "Class Rank": r.rankInClass ?? "",
      "Remarks": r.remarks || "",
    }));

    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Class_${selectedClass}_Results`);
    XLSX.writeFile(wb, `Results_Class_${selectedClass}_${selectedExam}_${academicYear}.xlsx`);
  };

  // Filtered rows for client search
  const filteredResults = (summary?.results || []).filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.student?.name?.toLowerCase().includes(q) ||
      r.student?.schoolId?.toLowerCase().includes(q) ||
      String(r.roll) === q ||
      r.student?.pen?.toLowerCase().includes(q)
    );
  });

  // Medal helper for Top 3 with Metallic Gradients
  const renderRankBadge = (rank?: number) => {
    if (!rank) return <span className="text-muted-foreground/40 font-mono text-xs">—</span>;
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 font-extrabold text-amber-900 dark:text-amber-200 bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-400 border border-amber-400/80 px-2.5 py-0.5 rounded-full text-xs shadow-xs animate-pulse">
          🥇 1st Rank
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 bg-gradient-to-r from-slate-200 via-slate-300 to-gray-300 border border-slate-400/80 px-2.5 py-0.5 rounded-full text-xs shadow-xs">
          🥈 2nd Rank
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-amber-900 dark:text-amber-200 bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 border border-amber-500/80 px-2.5 py-0.5 rounded-full text-xs shadow-xs">
          🥉 3rd Rank
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
        #{rank}
      </span>
    );
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Results & Marks Management</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => rankMutation.mutate()}
            disabled={rankMutation.isPending || isFetching}
            className="flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={cn("h-3.5 w-3.5 text-muted-foreground", rankMutation.isPending && "animate-spin")} />
            Recalculate Ranks
          </button>
          <a
            href="/students/bulk-upload"
            className="flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-2xs active:scale-95"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            Bulk Upload Marks
          </a>
          <button
            onClick={handleExportExcel}
            disabled={!summary || summary.results.length === 0}
            className="flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors shadow-2xs disabled:opacity-50 active:scale-95"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="rounded-xl border bg-card/90 backdrop-blur p-3 sm:p-3.5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center">
          {/* Academic Session */}
          <div>
            <CustomSelect
              value={academicYear}
              onChange={(val) => setAcademicYear(Number(val))}
              options={[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((yr) => ({
                label: `${yr} — Academic Session`,
                value: yr,
              }))}
            />
          </div>

          {/* Mandatory Class Selector with star on top-right */}
          <div className="relative">
            <CustomSelect
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              options={CLASS_OPTIONS.map((c) => ({
                label: c.label,
                value: c.value,
              }))}
              triggerClassName="border-primary/40 bg-primary/5 text-primary font-bold hover:border-primary hover:bg-primary/10 pr-6"
            />
            <span className="absolute top-2 right-6 text-rose-500 font-bold text-xs pointer-events-none" title="Required Field">
              *
            </span>
          </div>

          {/* Section Selector */}
          <div>
            <CustomSelect
              value={selectedSection}
              onChange={(val) => setSelectedSection(val)}
              options={[
                { label: "All Sections (A, B)", value: "ALL" },
                { label: "Section A", value: "A" },
                { label: "Section B", value: "B" },
              ]}
            />
          </div>

          {/* Exam Name Selector */}
          <div>
            <CustomSelect
              value={selectedExam}
              onChange={(val) => setSelectedExam(val)}
              options={EXAMS.map((ex) => ({
                label: ex,
                value: ex,
              }))}
            />
          </div>

          {/* Search in List */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student, roll, ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-8 pr-3 py-2 text-xs text-foreground shadow-2xs outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 h-[38px]"
            />
          </div>
        </div>
      </div>

      {/* KPI Evaluation Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Full Marks Rule */}
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3 shadow-xs">
          <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Full Marks (Class {selectedClass})</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{currentFullMarks} Marks</p>
          </div>
        </div>

        {/* Evaluated Count */}
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Evaluated / Enrolled</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              {summary?.evaluatedCount || 0} / {summary?.totalStudents || 0}
            </p>
          </div>
        </div>

        {/* Highest Marks */}
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-sky-50 p-2.5 text-sky-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Highest Marks</p>
            <p className="text-xl font-bold text-sky-700 mt-0.5">
              {summary?.highestMarks ? `${summary.highestMarks} / ${summary.fullMarks}` : "—"}
            </p>
          </div>
        </div>

        {/* Class Average */}
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Class Average</p>
            <p className="text-xl font-bold text-violet-700 mt-0.5">
              {summary?.averageMarks ? `${summary.averageMarks} Marks` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Results Table Card */}
      <div className="rounded-xl border bg-card shadow-sm space-y-4 p-5">
        {/* Table View Mode Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">
              Class {selectedClass} {selectedSection !== "ALL" ? `Section ${selectedSection}` : ""} — {selectedExam}
            </h2>
            <span className="text-xs text-muted-foreground">({filteredResults.length} students)</span>
          </div>

          {/* Center: Batch Marks Entry Button */}
          <div className="flex items-center justify-center gap-2">
            {isBatchMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveBatchMarks}
                  disabled={isSavingBatch}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs active:scale-95 animate-pulse"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isSavingBatch ? "Saving All…" : "Save All Entered Marks"}
                </button>
                <button
                  onClick={() => setIsBatchMode(false)}
                  className="rounded-xl border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted active:scale-95"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const initial: Record<string, string> = {};
                  (summary?.results || []).forEach((r) => {
                    if (r.marksObtained > 0) initial[r.studentId] = String(r.marksObtained);
                  });
                  setBatchMarks(initial);
                  setIsBatchMode(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all shadow-2xs active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Batch Marks Entry
              </button>
            )}
          </div>

          {/* Rank View Mode Selector */}
          <div className="flex rounded-lg border overflow-hidden p-0.5 bg-muted/40 text-xs">
            <button
              onClick={() => setRankViewMode("both")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                rankViewMode === "both" ? "bg-background text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Both Ranks
            </button>
            <button
              onClick={() => setRankViewMode("section")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border-l",
                rankViewMode === "section" ? "bg-background text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Section Rank
            </button>
            <button
              onClick={() => setRankViewMode("class")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-all border-l",
                rankViewMode === "class" ? "bg-background text-foreground font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Class Rank
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/70 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Roll</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Student Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">School ID / PEN</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Sec</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Marks Obtained</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Percentage</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Grade</th>
                {(rankViewMode === "both" || rankViewMode === "section") && (
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Section Rank</th>
                )}
                {(rankViewMode === "both" || rankViewMode === "class") && (
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Class Rank</th>
                )}
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-muted-foreground">
                    Loading student results…
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-muted-foreground">
                    No students found for the selected Class/Section filter.
                  </td>
                </tr>
              ) : (
                filteredResults.map((r) => {
                    const batchVal = batchMarks[r.studentId];
                    const effectiveMarks = isBatchMode
                      ? batchVal !== undefined && batchVal !== ""
                        ? parseFloat(batchVal)
                        : NaN
                      : r.marksObtained;
                    const isEvaluated = isBatchMode ? !isNaN(effectiveMarks) && effectiveMarks > 0 : r.marksObtained > 0;
                    const effectivePct = isBatchMode && isEvaluated
                      ? Math.round(((effectiveMarks / r.fullMarks) * 100) * 10) / 10
                      : r.percentage;

                    return (
                      <tr key={r.studentId} className={cn("transition-colors", isBatchMode ? "bg-amber-50/20 hover:bg-amber-50/40" : "hover:bg-muted/30")}>
                        <td className="px-3 py-2.5 text-xs font-mono font-bold text-foreground">{r.roll}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-xs text-foreground">{r.student?.name}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                          <div>{r.student?.schoolId}</div>
                          {r.student?.pen && <div className="text-[10px] text-muted-foreground/70">PEN: {r.student.pen}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-muted-foreground">{r.section}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-xs">
                          {isBatchMode ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min="0"
                                max={r.fullMarks}
                                value={batchMarks[r.studentId] ?? ""}
                                onChange={(e) => {
                                  setBatchMarks((prev) => ({
                                    ...prev,
                                    [r.studentId]: e.target.value,
                                  }));
                                }}
                                placeholder="0"
                                className="w-24 rounded border border-amber-300 bg-background px-2 py-1 text-right font-mono text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                              />
                              <span className="text-[10px] text-muted-foreground font-normal">/ {r.fullMarks}</span>
                            </div>
                          ) : isEvaluated ? (
                            <span className="text-foreground">{r.marksObtained} <span className="text-[10px] text-muted-foreground font-normal">/ {r.fullMarks}</span></span>
                          ) : (
                            <span className="text-muted-foreground/40 font-normal italic">Not Entered</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">
                          {isEvaluated ? (
                            <span className={cn("font-bold", effectivePct >= 60 ? "text-emerald-700" : effectivePct >= 35 ? "text-amber-700" : "text-rose-600")}>
                              {effectivePct}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {isEvaluated ? (
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {effectivePct >= 90 ? "AA" : effectivePct >= 80 ? "A+" : effectivePct >= 60 ? "A" : effectivePct >= 45 ? "B+" : effectivePct >= 35 ? "B" : "C"}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        {(rankViewMode === "both" || rankViewMode === "section") && (
                          <td className="px-3 py-2.5 text-center">
                            {isEvaluated ? renderRankBadge(r.rankInSection) : "—"}
                          </td>
                        )}
                        {(rankViewMode === "both" || rankViewMode === "class") && (
                          <td className="px-3 py-2.5 text-center">
                            {isEvaluated ? renderRankBadge(r.rankInClass) : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            disabled={isBatchMode}
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
                          >
                            <Edit className="h-3 w-3 text-muted-foreground" />
                            {isEvaluated ? "Edit" : "Enter Marks"}
                          </button>
                        </td>
                      </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Marks Entry / Edit Modal */}
      <Dialog open={!!editingStudentResult} onOpenChange={(open) => !open && setEditingStudentResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter / Edit Exam Marks</DialogTitle>
            <DialogDescription>
              Record {selectedExam} marks for {editingStudentResult?.student?.name} (Class {selectedClass}-{editingStudentResult?.section}, Roll {editingStudentResult?.roll}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {modalError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                {modalError}
              </div>
            )}

            {/* Student Details Card */}
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student Name:</span>
                <span className="font-semibold text-foreground">{editingStudentResult?.student?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">School ID:</span>
                <span className="font-mono">{editingStudentResult?.student?.schoolId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Full Evaluation Marks:</span>
                <span className="font-mono font-bold text-amber-700">{currentFullMarks} Marks</span>
              </div>
            </div>

            {/* Marks Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Marks Obtained (প্রাপ্ত নম্বর) <span className="text-rose-500">*</span></span>
                <span className="text-[11px] font-bold text-amber-600">Max: {currentFullMarks}</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={currentFullMarks}
                placeholder={`0 to ${currentFullMarks}`}
                value={inputMarks}
                onChange={(e) => {
                  setInputMarks(e.target.value);
                  setModalError(null);
                }}
                className="w-full rounded-md border px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            {/* Live Calculation Preview */}
            {inputMarks && !isNaN(parseFloat(inputMarks)) && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Percentage: </span>
                  <span className="font-bold text-primary">
                    {(((parseFloat(inputMarks) || 0) / (summary?.fullMarks || 500)) * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status: </span>
                  <span className="font-semibold">
                    {parseFloat(inputMarks) >= ((summary?.fullMarks || 500) * 0.35) ? (
                      <span className="text-emerald-700 font-bold">Passed</span>
                    ) : (
                      <span className="text-rose-600 font-bold">Failed / Below 35%</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Needs improvement in Mathematics"
                value={inputRemarks}
                onChange={(e) => setInputRemarks(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setEditingStudentResult(null)}
              className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMarks}
              disabled={saveMutation.isPending || !inputMarks}
              className="rounded-md bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving & Ranking…" : "Save Marks"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
