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
} from "lucide-react";
import { getSessionReadiness, executeSessionTransition } from "@/lib/data/students";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

export default function AcademicSessionClient() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [fromYear, setFromYear] = useState<number>(currentYear);
  const [toYear, setToYear] = useState<number>(currentYear + 1);
  const [rollStrategy, setRollStrategy] = useState<"rank" | "preserve" | "alphabetical">("rank");
  const [examName, setExamName] = useState("Annual Examination");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [transitionResult, setTransitionResult] = useState<any>(null);

  // Fetch readiness audit
  const { data: audit, isLoading: isLoadingAudit, refetch } = useQuery({
    queryKey: ["session-readiness", fromYear, examName],
    queryFn: () => getSessionReadiness(fromYear, examName),
  });

  const transitionMutation = useMutation({
    mutationFn: executeSessionTransition,
    onSuccess: (data) => {
      setTransitionResult(data.result);
      setConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      refetch();
    },
    onError: (err: any) => {
      alert(`Session Transition Failed: ${err.message}`);
    },
  });

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
            Automated school-wide session advancement, batch student promotions, academic history archiving, and roll re-indexing.
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
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Academic Session {toYear} Successfully Initiated!
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            All active students have been transitioned. Previous session records were archived into the <code>academic_history</code> database table.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            <div className="bg-white/80 dark:bg-black/20 rounded-lg p-2 border border-emerald-200">
              <p className="text-xs text-muted-foreground">Promoted to Next Class</p>
              <p className="text-lg font-bold text-emerald-700">{transitionResult.promotedCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-lg p-2 border border-emerald-200">
              <p className="text-xs text-muted-foreground">Graduated / Passed Out (Cl XII)</p>
              <p className="text-lg font-bold text-blue-700">{transitionResult.passedOutCount}</p>
            </div>
            <div className="bg-white/80 dark:bg-black/20 rounded-lg p-2 border border-emerald-200">
              <p className="text-xs text-muted-foreground">History Snapshots Saved</p>
              <p className="text-lg font-bold text-purple-700">{transitionResult.archivedHistoryCount}</p>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setTransitionResult(null)}
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Dismiss Notification ✕
            </button>
          </div>
        </div>
      )}

      {/* Session Selection & KPI Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Session */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Active Session</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="font-mono text-2xl font-bold rounded border bg-background px-2 py-1 w-28 text-foreground"
            />
            <span className="text-xs text-muted-foreground font-medium">Session Year</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Evaluation data will be drawn from this academic year.
          </p>
        </div>

        {/* Target Session */}
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">New Target Session</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}
              className="font-mono text-2xl font-bold rounded border border-primary/40 bg-background px-2 py-1 w-28 text-primary"
            />
            <span className="text-xs text-primary font-medium">Upcoming Year</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Promoted students will be assigned to this session.
          </p>
        </div>

        {/* Readiness Meter */}
        <div className="rounded-xl border bg-card p-4 space-y-2">
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

      {/* Step 1: Class Readiness Audit Breakdown */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              1. Class-Wise Examination Readiness Audit
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review result entry coverage for each standard before initiating transition.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground font-medium underline"
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
                className={`rounded-lg border p-3 space-y-1.5 transition-colors ${
                  c.isReady ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200" : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Class {c.className}</span>
                  {c.isReady ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Enrolled:</span> <span className="font-mono font-semibold text-foreground">{c.totalStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evaluated:</span> <span className="font-mono font-semibold text-foreground">{c.resultsEntered}</span>
                  </div>
                  {c.pendingCount > 0 && (
                    <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                      <span>Pending:</span> <span className="font-mono">{c.pendingCount}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Roll Number Strategy Selector */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            2. Roll Number Re-assignment Strategy for {toYear}
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
                Students keep their exact previous roll numbers in the promoted class and section.
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

      {/* Step 3: Promotion Pipeline Preview */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            3. Whole-School Promotion Pipeline
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            How grades will advance during this session execution:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class XII</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <Badge variant="outline" className="text-blue-700 bg-blue-50">Passed Out</Badge>
          </div>
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class XI</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Class XII</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class X</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Class XI</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class IX</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Class X</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class VIII</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Class IX</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class VII</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Class VIII</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class VI</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Class VII</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between">
            <span className="font-semibold">Class V</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-primary">Class VI</span>
          </div>
        </div>
      </div>

      {/* Execution Callout Button */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-primary" /> Ready to Advance School Session?
          </p>
          <p className="text-xs text-muted-foreground max-w-xl">
            This will promote all active students to Session {toYear}, snapshot Session {fromYear} into history, and assign rolls via <strong>{rollStrategy === "rank" ? "Exam Ranks" : rollStrategy === "alphabetical" ? "Alphabetical" : "Preserved"}</strong>.
          </p>
        </div>
        <button
          onClick={() => setConfirmModalOpen(true)}
          disabled={transitionMutation.isPending}
          className="flex-shrink-0 flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
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
                <li>All active students will be promoted to the next standard.</li>
                <li>Class XII students will be archived as Passed Out.</li>
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
              className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
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
                });
              }}
              disabled={transitionMutation.isPending}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
