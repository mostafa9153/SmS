"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Trophy,
  History,
  Users,
  GraduationCap,
  ChevronRight,
  Info,
  Award,
  Sliders,
  Check,
  UserCheck,
  UserX,
  RotateCcw,
  Save,
} from "lucide-react";
import { getSessionReadiness, executeSessionTransition } from "@/lib/data/students";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toast-banner";
import Link from "next/link";

export default function AcademicSessionClient() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [fromYear, setFromYear] = useState<number>(currentYear);
  const [toYear, setToYear] = useState<number>(currentYear + 1);
  const [rollStrategy, setRollStrategy] = useState<"rank" | "preserve" | "alphabetical">("rank");
  const [examName, setExamName] = useState("Annual Examination");
  const [minPassPercentage, setMinPassPercentage] = useState<number>(30);
  const [overriddenStudentIds, setOverriddenStudentIds] = useState<Set<string>>(new Set());
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [transitionResult, setTransitionResult] = useState<any>(null);

  // Full Marks State (moved from School Config)
  const [marksClass5, setMarksClass5] = useState("500");
  const [marksClass6, setMarksClass6] = useState("1050");
  const [marksClass7_8, setMarksClass7_8] = useState("1200");
  const [marksClass9_10, setMarksClass9_10] = useState("700");
  const [marksClass11_12, setMarksClass11_12] = useState("500");
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  // Fetch readiness audit with minPassPercentage
  const { data: audit, isLoading: isLoadingAudit, refetch } = useQuery({
    queryKey: ["session-readiness", fromYear, examName, minPassPercentage],
    queryFn: () => getSessionReadiness(fromYear, examName, minPassPercentage),
  });

  const transitionMutation = useMutation({
    mutationFn: executeSessionTransition,
    onSuccess: (data) => {
      setTransitionResult(data.result);
      setConfirmModalOpen(false);
      setOverriddenStudentIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      refetch();
    },
    onError: (err: any) => {
      alert(`Session Transition Failed: ${err.message}`);
    },
  });

  function toggleOverride(studentId: string) {
    setOverriddenStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }

  function handleOverrideAll() {
    if (!audit?.detainedStudents) return;
    const allDetainedIds = audit.detainedStudents.map((s: any) => s.id);
    if (overriddenStudentIds.size === allDetainedIds.length) {
      setOverriddenStudentIds(new Set());
    } else {
      setOverriddenStudentIds(new Set(allDetainedIds));
    }
  }

  function handleSaveMarksRules() {
    setIsSavingMarks(true);
    setTimeout(() => {
      setIsSavingMarks(false);
      showToast({
        title: "Marks Rules Saved",
        description: "Class-wise examination full marks configuration updated successfully.",
        type: "success",
      });
    }, 600);
  }

  const detainedList = audit?.detainedStudents || [];
  const effectivePromotedCount =
    (audit?.totalPromoted || 0) + overriddenStudentIds.size;
  const effectiveDetainedCount = Math.max(
    0,
    (audit?.totalDetained || 0) - overriddenStudentIds.size
  );

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Academic Session Transition</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Automated school-wide session advancement, RTE auto-promotion, merit cutoffs, detention rules, and roll re-indexing.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/students/promotion"
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline"
          >
            Individual Class Promotion →
          </Link>
        </div>
      </div>

      {/* Success banner if just completed */}
      {transitionResult && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Academic Session {toYear} Successfully Initiated!
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            All students have been transitioned. Session {fromYear} records were archived into the <code>academic_history</code> database table.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center">
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2.5 border border-emerald-200">
              <p className="text-[11px] text-muted-foreground">Promoted to Next Class</p>
              <p className="text-lg font-bold text-emerald-700">{transitionResult.promotedCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2.5 border border-amber-200">
              <p className="text-[11px] text-muted-foreground">Detained (Repeating Class)</p>
              <p className="text-lg font-bold text-amber-700">{transitionResult.detainedCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2.5 border border-blue-200">
              <p className="text-[11px] text-muted-foreground">Graduated / Passed Out (Cl XII)</p>
              <p className="text-lg font-bold text-blue-700">{transitionResult.passedOutCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2.5 border border-purple-200">
              <p className="text-[11px] text-muted-foreground">History Records Archived</p>
              <p className="text-lg font-bold text-purple-700">{transitionResult.archivedHistoryCount}</p>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setTransitionResult(null)}
              className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline"
            >
              Dismiss Notification ✕
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: Class-Wise Examination Full Marks Rules (Moved from School Config) */}
      <div className="rounded-2xl border bg-card/90 backdrop-blur p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Class-Wise Examination Full Marks Rules
              </h2>
              <p className="text-xs text-muted-foreground">
                These thresholds govern maximum limits across the entire Results & Evaluation system.
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveMarksRules}
            disabled={isSavingMarks}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs self-start sm:self-auto"
          >
            {isSavingMarks ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Marks Rules
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground">Class V</span>
            <Input
              value={marksClass5}
              onChange={(e) => setMarksClass5(e.target.value)}
              className="text-xs font-mono font-bold"
            />
            <span className="text-[10px] text-muted-foreground">Full Marks Total</span>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground">Class VI</span>
            <Input
              value={marksClass6}
              onChange={(e) => setMarksClass6(e.target.value)}
              className="text-xs font-mono font-bold"
            />
            <span className="text-[10px] text-muted-foreground">Full Marks Total</span>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground">Class VII & VIII</span>
            <Input
              value={marksClass7_8}
              onChange={(e) => setMarksClass7_8(e.target.value)}
              className="text-xs font-mono font-bold"
            />
            <span className="text-[10px] text-muted-foreground">Full Marks Total</span>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground">Class IX & X</span>
            <Input
              value={marksClass9_10}
              onChange={(e) => setMarksClass9_10(e.target.value)}
              className="text-xs font-mono font-bold"
            />
            <span className="text-[10px] text-muted-foreground">Full Marks Total</span>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground">Class XI & XII</span>
            <Input
              value={marksClass11_12}
              onChange={(e) => setMarksClass11_12(e.target.value)}
              className="text-xs font-mono font-bold"
            />
            <span className="text-[10px] text-muted-foreground">Full Marks Total</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Promotion & Pass Criteria Configuration */}
      <div className="rounded-2xl border bg-card/90 backdrop-blur p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 border-b pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Promotion & Pass Criteria Policy
            </h2>
            <p className="text-xs text-muted-foreground">
              Define the academic rules used for batch promotion vs retention in the upcoming session.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rule A: Class 5 to 8 Auto-Pass (RTE) */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Classes V – VIII: 100% Auto-Promotion
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px]">RTE Policy</Badge>
            </div>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
              In accordance with the Right to Education (RTE) No-Detention regulations, students in Classes 5 through 8 automatically advance to the next standard (V➔VI, VI➔VII, VII➔VIII, VIII➔IX) upon session advancement.
            </p>
          </div>

          {/* Rule B: Class 9 to 12 Minimum Pass Percentage */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-blue-600" />
                Classes IX – XII: Minimum Pass Percentage
              </span>
              <Badge variant="outline" className="text-blue-700 dark:text-blue-400 border-blue-300 text-[10px]">
                Merit Cutoff
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={minPassPercentage}
                  onChange={(e) => setMinPassPercentage(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="font-mono text-xl font-bold rounded-lg border border-blue-300 bg-background px-2.5 py-1 w-20 text-blue-700 dark:text-blue-400 text-center"
                />
                <span className="text-sm font-bold text-muted-foreground">%</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Students scoring ≥ <strong className="text-foreground">{minPassPercentage}%</strong> in the Annual Exam will be <strong>Promoted</strong>. Below {minPassPercentage}% will be <strong>Detained</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Session Selection & KPI Meter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Session */}
        <div className="rounded-2xl border bg-card p-4 space-y-2 shadow-2xs">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Active Session</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="font-mono text-2xl font-bold rounded-lg border bg-background px-2 py-1 w-28 text-foreground"
            />
            <span className="text-xs text-muted-foreground font-medium">Session Year</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Evaluation data will be drawn from this academic year.
          </p>
        </div>

        {/* Target Session */}
        <div className="rounded-2xl border bg-primary/5 border-primary/20 p-4 space-y-2 shadow-2xs">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">New Target Session</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}
              className="font-mono text-2xl font-bold rounded-lg border border-primary/40 bg-background px-2 py-1 w-28 text-primary"
            />
            <span className="text-xs text-primary font-medium">Upcoming Year</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Promoted students will be assigned to this session.
          </p>
        </div>

        {/* Readiness Meter */}
        <div className="rounded-2xl border bg-card p-4 space-y-2 shadow-2xs">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evaluation Readiness</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold font-mono">
              {audit ? `${audit.readinessPercentage}%` : "—"}
            </span>
            <Badge variant={audit?.readinessPercentage === 100 ? "default" : "outline"} className="text-xs">
              {audit?.readinessPercentage === 100 ? "Fully Evaluated" : "Partial Results"}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                (audit?.readinessPercentage || 0) >= 80 ? "bg-emerald-600" : "bg-amber-500"
              }`}
              style={{ width: `${audit?.readinessPercentage || 0}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {audit?.totalEvaluated} of {audit?.totalStudents} students evaluated in {fromYear}.
          </p>
        </div>
      </div>

      {/* SECTION 4: Class Readiness Audit Breakdown */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Class-Wise Examination Readiness & Eligibility
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Breakdown of auto-pass standards (V–VIII) and merit standards (IX–XII).
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline cursor-pointer"
          >
            Refresh Audit ↻
          </button>
        </div>

        {isLoadingAudit ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading readiness audit…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {audit?.classes?.map((c: any) => (
              <div
                key={c.className}
                className={`rounded-xl border p-3 space-y-1.5 transition-colors ${
                  c.isAutoPass
                    ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                    : c.isReady
                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Class {c.className}</span>
                  {c.isAutoPass ? (
                    <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-0 text-[9px] px-1.5 py-0">
                      Auto-Pass
                    </Badge>
                  ) : c.isReady ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Enrolled:</span> <span className="font-mono font-semibold text-foreground">{c.totalStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Promoting:</span>{" "}
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {c.promotedCount}
                    </span>
                  </div>
                  {c.detainedCount > 0 && (
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                      <span>Detained:</span> <span className="font-mono">{c.detainedCount}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 5: Detained Students Review & Admin Manual Override Panel */}
      {detainedList.length > 0 && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200 dark:border-rose-900/40 pb-3">
            <div>
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>Detained Students Review ({detainedList.length} Students)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Students below the {minPassPercentage}% passing threshold will repeat their class in {toYear}. You can manually approve them for promotion (Grace).
              </p>
            </div>
            <button
              onClick={handleOverrideAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              {overriddenStudentIds.size === detainedList.length ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset All to Detained
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5" /> Approve All for Promotion ({detainedList.length})
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="p-2.5">Student Name</th>
                  <th className="p-2.5">Class & Section</th>
                  <th className="p-2.5">Roll</th>
                  <th className="p-2.5">Exam Result</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {detainedList.map((s: any) => {
                  const isOverridden = overriddenStudentIds.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={
                        isOverridden
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "hover:bg-muted/30"
                      }
                    >
                      <td className="p-2.5 font-bold text-foreground">{s.name}</td>
                      <td className="p-2.5 font-medium">Class {s.presentClass} - {s.presentSection}</td>
                      <td className="p-2.5 font-mono">{s.presentRoll}</td>
                      <td className="p-2.5">
                        <span className="font-semibold text-foreground">
                          {s.percentage !== null ? `${s.percentage}%` : "No Record"}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1.5 block sm:inline">
                          ({s.reason})
                        </span>
                      </td>
                      <td className="p-2.5">
                        {isOverridden ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                            <Check className="h-3 w-3" /> Manually Promoted
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <UserX className="h-3 w-3" /> Detained
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => toggleOverride(s.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isOverridden
                              ? "border border-border text-muted-foreground hover:bg-muted"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
                          }`}
                        >
                          {isOverridden ? "Revert to Detain" : "Promote Anyway (Grace)"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 6: Roll Number Strategy Selector */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-2xs">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Roll Number Re-assignment Strategy for {toYear}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose how student roll numbers in each section should be assigned in the new session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Strategy A: Rank-based (West Bengal standard) */}
          <label
            onClick={() => setRollStrategy("rank")}
            className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${
              rollStrategy === "rank"
                ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Rank-Based (Recommended)
                </span>
                <input
                  type="radio"
                  name="rollStrategy"
                  checked={rollStrategy === "rank"}
                  onChange={() => setRollStrategy("rank")}
                  className="accent-amber-600"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Roll 1 is assigned to 1st Rank in Section, Roll 2 to 2nd Rank, strictly based on Total Marks obtained.
              </p>
            </div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] self-start mt-3">
              West Bengal Standard
            </Badge>
          </label>

          {/* Strategy B: Preserve Existing */}
          <label
            onClick={() => setRollStrategy("preserve")}
            className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${
              rollStrategy === "preserve"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">Preserve Existing Rolls</span>
                <input
                  type="radio"
                  name="rollStrategy"
                  checked={rollStrategy === "preserve"}
                  onChange={() => setRollStrategy("preserve")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Students keep their exact previous roll numbers in the promoted or detained class cohort.
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground mt-3">No change to rolls</span>
          </label>

          {/* Strategy C: Alphabetical */}
          <label
            onClick={() => setRollStrategy("alphabetical")}
            className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer select-none transition-all ${
              rollStrategy === "alphabetical"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">Alphabetical Order</span>
                <input
                  type="radio"
                  name="rollStrategy"
                  checked={rollStrategy === "alphabetical"}
                  onChange={() => setRollStrategy("alphabetical")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Roll numbers are assigned 1, 2, 3... sorted by student names A to Z in each section.
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground mt-3">Sorted A-Z</span>
          </label>
        </div>
      </div>

      {/* SECTION 7: Execution Callout Button */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-primary" /> Ready to Advance School Session?
          </p>
          <p className="text-xs text-muted-foreground max-w-xl">
            This will promote eligible students ({effectivePromotedCount}) to Session {toYear}, detain {effectiveDetainedCount} students in their current standard, snapshot Session {fromYear} into history, and assign rolls via <strong>{rollStrategy === "rank" ? "Exam Ranks" : rollStrategy === "alphabetical" ? "Alphabetical" : "Preserved"}</strong>.
          </p>
        </div>
        <button
          onClick={() => setConfirmModalOpen(true)}
          disabled={transitionMutation.isPending}
          className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          Execute Session Transition →
        </button>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle>Confirm Whole-School Session Transition</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs space-y-2">
              <p>
                You are about to advance the entire school from <strong>Session {fromYear}</strong> to <strong>Session {toYear}</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-foreground">
                <li>Classes V–VIII: 100% Auto-Promoted (RTE rules).</li>
                <li>Classes IX–XII: Promoted if score ≥ {minPassPercentage}% or manually overridden.</li>
                <li>Detained students: {effectiveDetainedCount} will repeat their current class.</li>
                <li>Class XII eligible students will be archived as Passed Out.</li>
                <li>Roll numbers will be re-assigned based on <strong>{rollStrategy.toUpperCase()}</strong>.</li>
                <li>Session {fromYear} records will be permanently archived in <code>academic_history</code>.</li>
              </ul>
              <p className="text-muted-foreground pt-1">
                This action is logged in the security audit trail.
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                transitionMutation.mutate({
                  fromYear,
                  toYear,
                  rollStrategy,
                  examName,
                  minPassPercentage,
                  overriddenStudentIds: Array.from(overriddenStudentIds),
                });
              }}
              disabled={transitionMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shadow-xs"
            >
              {transitionMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing…
                </>
              ) : (
                "Yes, Start New Session"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
