"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RoutineSettings,
  RoutineClass,
  RoutineTeacher,
  RoutineSubject,
  RoutineAssignment,
  RoutineRoom,
  GeneratedRoutine,
  ValidationReport,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
  Layers,
  School,
  Users,
  Building2,
  Table2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoutineGeneratorTabProps {
  settings: RoutineSettings;
  classes: RoutineClass[];
  teachers: RoutineTeacher[];
  subjects: RoutineSubject[];
  assignments: RoutineAssignment[];
  rooms: RoutineRoom[];
  onValidate: () => Promise<ValidationReport>;
  onGenerate: () => Promise<GeneratedRoutine>;
  onAutoBuildAssignments?: () => Promise<RoutineAssignment[]>;
  onNavigateToViewer: () => void;
}

export function RoutineGeneratorTab({
  settings,
  classes,
  teachers,
  subjects,
  assignments,
  rooms,
  onValidate,
  onGenerate,
  onAutoBuildAssignments,
  onNavigateToViewer,
}: RoutineGeneratorTabProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoBuilding, setIsAutoBuilding] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [generationResult, setGenerationResult] = useState<GeneratedRoutine | null>(null);

  // Pre-flight checks status
  const hasWorkingDays = settings.workingDays.length > 0 && settings.periodsPerDay > 0;
  const hasClasses = classes.length > 0;
  const hasTeachers = teachers.length > 0;
  const hasSubjects = subjects.length > 0;
  const hasAssignments = assignments.length > 0;

  const totalAssignedPeriods = assignments.reduce((sum, a) => sum + a.periodsPerWeek, 0);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await onValidate();
      setReport(res);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAutoBuild = async () => {
    if (!onAutoBuildAssignments) return;
    setIsAutoBuilding(true);
    try {
      await onAutoBuildAssignments();
      const res = await onValidate();
      setReport(res);
    } finally {
      setIsAutoBuilding(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await onGenerate();
      setGenerationResult(res);
      if (res.success) {
        setReport({ isValid: true, errors: [], warnings: [] });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5 w-full">
      {/* Pre-Flight Diagnostics Matrix */}
      <div className="bg-card border rounded-lg p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Constraint Pre-Flight Diagnostic Checks
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            5 Checks
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          <div className="border rounded-md p-3 bg-muted/20 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Schedule
              </span>
              {hasWorkingDays ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {settings.workingDays.length} Days / {settings.periodsPerDay} Periods
            </div>
          </div>

          <div className="border rounded-md p-3 bg-muted/20 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-blue-500" />
                Classes
              </span>
              {hasClasses ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {classes.length} Sections Configured
            </div>
          </div>

          <div className="border rounded-md p-3 bg-muted/20 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Faculty
              </span>
              {hasTeachers ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {teachers.length} Teachers Active
            </div>
          </div>

          <div className="border rounded-md p-3 bg-muted/20 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                Workload
              </span>
              {hasAssignments || (hasSubjects && hasTeachers) ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {hasAssignments
                ? `${assignments.length} Tasks (${totalAssignedPeriods} p/wk)`
                : `Auto-Bridge (${subjects.length} Subjects)`}
            </div>
          </div>

          <div className="border rounded-md p-3 bg-muted/20 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                Facilities
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {rooms.length} Dedicated Rooms
            </div>
          </div>
        </div>
      </div>

      {/* Solver Action Card */}
      <div className="bg-card border rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Constraint Satisfaction Problem (CSP) Solver Engine
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px] bg-background">
                MRV + Double-Slot Clustering
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-background">
                Zero Hard Conflicts
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-background">
                Teacher Fatigue Smoothing
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onAutoBuildAssignments && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoBuild}
                disabled={isAutoBuilding || isGenerating || isValidating}
                className="h-9 text-xs font-semibold gap-1.5 px-3 border-primary/30 text-primary hover:bg-primary/5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Map Workloads
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={isValidating || isGenerating}
              className="h-9 text-xs font-semibold gap-1.5 px-3.5"
            >
              {isValidating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              )}
              Run Pre-Flight Check
            </Button>

            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                isValidating ||
                !hasClasses ||
                !hasTeachers ||
                !hasWorkingDays ||
                !hasSubjects
              }
              className="h-9 text-xs font-bold gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {isGenerating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              Generate Timetable
            </Button>
          </div>
        </div>

        {/* Engine Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="border rounded-lg p-3 bg-muted/10">
            <span className="text-muted-foreground block text-[11px]">Assigned Sections</span>
            <span className="font-bold text-foreground font-mono text-sm">{classes.length} Classes</span>
          </div>
          <div className="border rounded-lg p-3 bg-muted/10">
            <span className="text-muted-foreground block text-[11px]">Faculty Workload</span>
            <span className="font-bold text-foreground font-mono text-sm">{totalAssignedPeriods} Periods / Wk</span>
          </div>
          <div className="border rounded-lg p-3 bg-muted/10">
            <span className="text-muted-foreground block text-[11px]">Daily Period Slots</span>
            <span className="font-bold text-foreground font-mono text-sm">{settings.periodsPerDay} Daily</span>
          </div>
          <div className="border rounded-lg p-3 bg-muted/10">
            <span className="text-muted-foreground block text-[11px]">Recess / Break Slots</span>
            <span className="font-bold text-foreground font-mono text-sm">{settings.breaks.length} Scheduled</span>
          </div>
        </div>
      </div>

      {/* Validation Result Box */}
      {report && (
        <div className="space-y-2">
          {report.isValid ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>All Constraint Sanity Checks Passed (0 Violations)</span>
              </div>
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-400 font-mono text-[10px]">
                Ready to Generate
              </Badge>
            </div>
          ) : (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-destructive">
                <AlertCircle className="h-4 w-4" />
                Mathematical Inconsistencies Detected ({report.errors.length})
              </div>
              <ul className="list-disc pl-5 space-y-1 text-destructive dark:text-red-400">
                {report.errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {report.warnings && report.warnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Warnings ({report.warnings.length})
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-amber-800 dark:text-amber-400 text-[11px]">
                {report.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Generation Status Box */}
      {generationResult && (
        <div className="space-y-2">
          {generationResult.success ? (
            <div className="bg-card border-2 border-emerald-500/40 rounded-lg p-4 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  Timetable Generated Successfully
                </div>
                <Button
                  size="sm"
                  onClick={onNavigateToViewer}
                  className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Open Routine Viewer
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t text-xs">
                <div className="border rounded-md p-2.5 bg-muted/10 font-mono">
                  <span className="text-muted-foreground block text-[10px]">Execution Time</span>
                  <span className="font-bold text-foreground">{generationResult.executionTimeMs} ms</span>
                </div>
                <div className="border rounded-md p-2.5 bg-muted/10 font-mono">
                  <span className="text-muted-foreground block text-[10px]">Solver Passes</span>
                  <span className="font-bold text-foreground">{generationResult.iterations}</span>
                </div>
                <div className="border rounded-md p-2.5 bg-muted/10 font-mono">
                  <span className="text-muted-foreground block text-[10px]">Hard Violations</span>
                  <span className="font-bold text-emerald-600">0 (Strictly Zero)</span>
                </div>
                <div className="border rounded-md p-2.5 bg-muted/10 font-mono">
                  <span className="text-muted-foreground block text-[10px]">Heuristics</span>
                  <span className="font-bold text-blue-600">MRV + Clustered</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-destructive text-sm">
                <AlertCircle className="h-5 w-5" />
                Solver Unable to Satisfy All Constraints
              </div>
              <p className="text-destructive/90 text-xs">
                The constraint satisfaction problem is mathematically over-constrained. Try relaxing strict 1-per-day rules, adding more teacher availability slots, or reducing consecutive period limits.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Workflow Navigation */}
      <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <Link href="/routine/assignments">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            ← Back to Assignments
          </Button>
        </Link>
        <Link href="/routine/viewer">
          <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
            View Routine Timetables
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

