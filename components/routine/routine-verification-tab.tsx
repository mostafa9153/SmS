"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
  RoutineRoom,
  DEFAULT_ROUTINE_SETTINGS,
} from "@/lib/routine/types";
import { getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { autoBuildRoutineAssignments } from "@/lib/routine/routine-auto-assign";
import {
  isHsClass,
  parseSectionAndStream,
  detectSubjectStream,
  calculateTotalSchoolSectionDemand,
  calculateTotalTeacherAllottedWorkload,
} from "@/lib/routine/routine-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  School,
  Users,
  BookOpen,
  CalendarCheck2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditIssue {
  id: string;
  type: "error" | "warning" | "info";
  category:
    | "faculty_shortage"
    | "overload"
    | "capacity_overflow"
    | "unassigned_subject"
    | "availability_conflict"
    | "teacher_daily_max"
    | "time_pref_saturation";
  title: string;
  description: string;
  solution: string;
  targetClass?: string;
  targetSubject?: string;
  targetTeacher?: string;
}

interface RoutineVerificationTabProps {
  settings: RoutineSettings;
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  assignments: RoutineAssignment[];
  rooms: RoutineRoom[];
  onSaveAssignments?: (assignments: RoutineAssignment[]) => Promise<void>;
}

export function RoutineVerificationTab({
  settings = DEFAULT_ROUTINE_SETTINGS,
  classes = [],
  subjects = [],
  teachers = [],
  assignments = [],
  rooms = [],
  onSaveAssignments,
}: RoutineVerificationTabProps) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isBalancing, setIsBalancing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "error" | "warning">("all");

  // Compute effective working periods per week for classes
  const totalWeeklyTeachingPeriodsPerClass = useMemo(() => {
    const days = settings.workingDays || [0, 1, 2, 3, 4, 5];
    const halfDays = settings.halfDays || [5];
    const halfP = settings.halfDayPeriods || 4;
    const regP = settings.periodsPerDay || 8;

    let total = 0;
    days.forEach((d) => {
      const isHalf = halfDays.includes(d);
      const daySlots = isHalf ? halfP : regP;
      total += daySlots;
    });
    return total;
  }, [settings]);

  // Compute active / effective assignments
  const activeAssignments = useMemo(() => {
    if (assignments.length > 0) return assignments;
    return autoBuildRoutineAssignments(classes, subjects, teachers, settings, rooms);
  }, [assignments, classes, subjects, teachers, settings, rooms]);

  // Teacher Load Map
  const teacherLoadMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeAssignments.forEach((a) => {
      map[a.teacherId] = (map[a.teacherId] || 0) + a.periodsPerWeek;
    });
    return map;
  }, [activeAssignments]);

  // Deep System Audit Logic
  const auditReport = useMemo(() => {
    const issues: AuditIssue[] = [];
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    const workingDays = settings.workingDays || [0, 1, 2, 3, 4, 5];
    const halfDays = settings.halfDays || [5];
    const halfP = settings.halfDayPeriods || 4;
    const regP = settings.periodsPerDay || 8;
    const fullDaysCount = workingDays.filter((d) => !halfDays.includes(d)).length;
    const halfDaysCount = workingDays.filter((d) => halfDays.includes(d)).length;
    const tchDailyMax = settings.tchDailyMax || 5;
    const breakP = settings.breaks?.length ? Math.min(...settings.breaks) : Math.floor(regP / 2);

    // 1. Check Total School Faculty Capacity vs Demand
    const totalWeeklyDemand = calculateTotalSchoolSectionDemand(classes, subjects);
    const { totalWorkload: totalFacultyCapacity } = calculateTotalTeacherAllottedWorkload(
      teachers,
      classes,
      subjects,
      activeAssignments
    );

    if (totalFacultyCapacity < totalWeeklyDemand) {
      issues.push({
        id: "total_capacity_deficit",
        type: "error",
        category: "faculty_shortage",
        title: `Overall Faculty Capacity Deficit (${totalWeeklyDemand - totalFacultyCapacity} periods short)`,
        description: `Total student curriculum demand across all sections is ${totalWeeklyDemand} periods/week, but available teaching staff capacity is only ${totalFacultyCapacity} periods/week.`,
        solution: "Add more faculty members in Setup Hub → Teachers, or increase individual max periods/week limits.",
      });
    }

    // 2. Check Teacher Overload & Teacher Daily Max Physical Limit
    teachers.forEach((t) => {
      const load = teacherLoadMap[t.id] || 0;
      const max = t.maxPeriods || 24;
      if (load > max) {
        issues.push({
          id: `overload_${t.id}`,
          type: "error",
          category: "overload",
          title: `Faculty Overload: ${t.name} (${load} / ${max} p/wk)`,
          description: `Teacher ${t.name} is scheduled for ${load} periods/week, exceeding their maximum workload threshold of ${max} periods/week.`,
          solution: `Click "Auto-Balance Workloads" to redistribute subjects to other faculty, or increase ${t.name}'s max periods limit in Teachers tab.`,
          targetTeacher: t.name,
        });
      }

      // Teacher maximum daily physical capacity under tchDailyMax
      const maxPhysicalDailyCapacity =
        fullDaysCount * tchDailyMax + halfDaysCount * Math.min(tchDailyMax, halfP);
      if (load > maxPhysicalDailyCapacity) {
        issues.push({
          id: `daily_cap_exceeded_${t.id}`,
          type: "warning",
          category: "teacher_daily_max",
          title: `Teacher Daily Density: ${t.name} (${load} p/wk)`,
          description: `Teacher ${t.name} is assigned ${load} periods/week. With "Max Periods/Day" = ${tchDailyMax}, max weekly capacity is ${maxPhysicalDailyCapacity} periods. The solver will adapt daily caps automatically.`,
          solution: `Increase Teacher Daily Max in Routine Settings to ${Math.ceil(load / Math.max(1, workingDays.length))} periods/day, or balance workload.`,
          targetTeacher: t.name,
        });
      }

      // Check Teacher Availability Matrix physical limits
      if (t.availableSlots) {
        let totalOpenSlots = 0;
        workingDays.forEach((day) => {
          if (t.availableSlots && t.availableSlots[day]) {
            totalOpenSlots += t.availableSlots[day].length;
          }
        });
        if (load > totalOpenSlots) {
          issues.push({
            id: `availability_deficit_${t.id}`,
            type: "error",
            category: "availability_conflict",
            title: `Availability Conflict: ${t.name} (${load} p/wk > ${totalOpenSlots} slots)`,
            description: `Teacher ${t.name} is assigned ${load} periods per week, but their Availability Matrix only has ${totalOpenSlots} periods marked as available. This is a mathematical impossibility.`,
            solution: `Go to Setup Hub → Teachers → Edit ${t.name} and open more periods in the Availability Matrix, or reduce their assigned workload.`,
            targetTeacher: t.name,
          });
        }
      }
    });

    // 3. Class by Class Curriculum, Morning Saturation & Teacher Coverage Check
    classes.forEach((cls) => {
      const clsNameLower = cls.className.toLowerCase();
      const isHs = isHsClass(cls.className);
      const { stream: sectionStream } = parseSectionAndStream(cls.section || "");

      const explicitClassSubs = subjects.filter(
        (s) => s.className && s.className.toLowerCase() === clsNameLower
      );
      const hasExplicitSubs = explicitClassSubs.length > 0;

      const candidates = hasExplicitSubs ? explicitClassSubs : subjects;
      const rawClsSubjects = candidates.filter((s) => {
        if (s.className && s.className.toLowerCase() !== clsNameLower) {
          return false;
        }
        if (hasExplicitSubs && !s.className) {
          return false;
        }
        if (!isHs) {
          if (hasExplicitSubs) {
            return Boolean(s.className && s.className.toLowerCase() === clsNameLower);
          }
          // For non-HS classes without explicit DB subjects, filter by preset subject list
          const presets = new Set(
            getDatabaseSubjectsForClass(cls.className).map((sub: string) => sub.trim().toLowerCase())
          );
          return presets.has(s.name.trim().toLowerCase());
        }
        const isCommon =
          Boolean(s.isCommon) ||
          (s.stream && s.stream.toLowerCase() === "common") ||
          detectSubjectStream(s.name, s.stream) === "Common";
        if (isCommon) return true;

        if (sectionStream && sectionStream.toLowerCase() !== "general" && sectionStream.toLowerCase() !== "all") {
          const subjStream = (s.stream || detectSubjectStream(s.name, s.stream) || "General").toLowerCase();
          return subjStream === sectionStream.toLowerCase();
        }
        return true;
      });

      // Deduplicate by canonical name to avoid double-counting subjects configured per-section
      const clsSubjects: typeof rawClsSubjects = [];
      const seenSubjectNames = new Set<string>();
      for (const s of rawClsSubjects) {
        const canonicalName = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        const key = `${canonicalName}::${(s.stream || detectSubjectStream(s.name) || "Common").toLowerCase()}`;
        if (!seenSubjectNames.has(key)) {
          seenSubjectNames.add(key);
          clsSubjects.push(s);
        }
      }

      const clsDemand = clsSubjects.reduce(
        (sum, s) => sum + (s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : s.isLab ? 2 : 5),
        0
      );

      const clsMaxLimit = cls.dailyPeriods
        ? cls.dailyPeriods * (settings.workingDays.length || 6)
        : totalWeeklyTeachingPeriodsPerClass;

      if (clsDemand > clsMaxLimit) {
        issues.push({
          id: `class_overflow_${cls.id}`,
          type: "error",
          category: "capacity_overflow",
          title: `Weekly Capacity Exceeded for ${cls.className} (${cls.section})`,
          description: `Total required subject periods (${clsDemand} p/wk) exceeds the total weekly timetable slots available (${clsMaxLimit} p/wk) for this class.`,
          solution: `In Setup Hub → Subjects, reduce the weekly periods for some subjects of ${cls.className}, or increase daily periods / working days.`,
          targetClass: `${cls.className} - ${cls.section}`,
        });
      }

      // Morning preference saturation check
      let totalMorningSlots = 0;
      workingDays.forEach((d) => {
        const isHalf = halfDays.includes(d);
        const dayMax = isHalf ? Math.min(halfP, cls.dailyPeriods || regP) : (cls.dailyPeriods || regP);
        totalMorningSlots += Math.min(dayMax, breakP);
      });

      const morningDemand = clsSubjects
        .filter((s) => s.timePref === "morning")
        .reduce((sum, s) => sum + (s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : s.isLab ? 2 : 5), 0);

      if (morningDemand > totalMorningSlots) {
        issues.push({
          id: `morning_sat_${cls.id}`,
          type: "warning",
          category: "time_pref_saturation",
          title: `Morning Slot Saturation in ${cls.className} (${cls.section})`,
          description: `Morning-preferred subjects require ${morningDemand} periods/week, but class only has ${totalMorningSlots} morning periods. Solver will soften preferences when needed.`,
          solution: `In Setup Hub → Subjects, change some subjects from "Morning" to "Any Time".`,
          targetClass: `${cls.className} - ${cls.section}`,
        });
      }

      // Check each subject in this class for qualified teachers and half-day saturation
      clsSubjects.forEach((subj) => {
        const reqPeriods = subj.periodsPerWeek && subj.periodsPerWeek > 0 ? subj.periodsPerWeek : (subj.isLab ? 2 : 5);

        // Half-day saturation note
        if (halfDaysCount > 0 && reqPeriods > fullDaysCount && !subj.allowMultiplePerDay) {
          issues.push({
            id: `halfday_starve_${cls.id}_${subj.id}`,
            type: "info",
            category: "capacity_overflow",
            title: `Half-Day Schedule Adaptation: ${cls.className} - ${subj.name}`,
            description: `Subject "${subj.name}" has ${reqPeriods} periods/week with strict single-period daily limit across ${fullDaysCount} full days and ${halfDaysCount} half day.`,
            solution: `Solver will automatically schedule double periods on weekdays if Saturday slots fill up.`,
            targetClass: cls.className,
            targetSubject: subj.name,
          });
        }

        const subjNameLower = subj.name.trim().toLowerCase();
        const qualifiedTeachers = teachers.filter((t) => {
          const qClasses = (t.qualifiedClasses || []).map((c) => c.toLowerCase());
          const classQualified = qClasses.length === 0 || qClasses.includes(clsNameLower);
          if (!classQualified) return false;

          const classSubs = t.classSubjects?.[cls.className] || [];
          if (classSubs.length === 0) return true;
          return classSubs.some((s) => s.trim().toLowerCase() === subjNameLower);
        });

        if (qualifiedTeachers.length === 0) {
          issues.push({
            id: `missing_faculty_${cls.id}_${subj.id}`,
            type: "error",
            category: "faculty_shortage",
            title: `No Qualified Faculty for ${cls.className}: ${subj.name}`,
            description: `Subject "${subj.name}" in ${cls.className} requires ${reqPeriods} p/wk, but 0 active faculty members are qualified to teach it.`,
            solution: `Go to Setup Hub → Teachers → Select an eligible teacher, select "${cls.className}", and check "${subj.name}".`,
            targetClass: cls.className,
            targetSubject: subj.name,
          });
        }
      });
    });

    // 4. Room Utilization Check
    const roomLoadMap: Record<string, number> = {};
    activeAssignments.forEach((a) => {
      if (a.roomId) {
        roomLoadMap[a.roomId] = (roomLoadMap[a.roomId] || 0) + a.periodsPerWeek;
      }
    });

    rooms.forEach((r) => {
      const load = roomLoadMap[r.id] || 0;
      // Room max capacity: Assuming rooms are open all working days, full schedule
      const maxCapacity =
        fullDaysCount * regP + halfDaysCount * halfP;
      
      if (load > maxCapacity) {
        issues.push({
          id: `room_overflow_${r.id}`,
          type: "error",
          category: "capacity_overflow",
          title: `Room Capacity Exceeded: ${r.name}`,
          description: `Room "${r.name}" is assigned to host ${load} periods/week, but the school only has ${maxCapacity} total slots available per week.`,
          solution: `Reduce classes assigned to this room, or add another room.`,
        });
      }
    });

    // 5. Class Teacher Clash Check
    const classTeacherMap: Record<string, string[]> = {};
    teachers.forEach((t) => {
      if (t.classTeacherOf) {
        const targetCls = t.classTeacherOf.trim().toLowerCase();
        if (!classTeacherMap[targetCls]) classTeacherMap[targetCls] = [];
        classTeacherMap[targetCls].push(t.name);
      }
    });

    Object.entries(classTeacherMap).forEach(([cls, tNames]) => {
      if (tNames.length > 1) {
        issues.push({
          id: `ct_clash_${cls}`,
          type: "error",
          category: "availability_conflict",
          title: `Class Teacher Clash: ${cls.toUpperCase()}`,
          description: `Multiple teachers (${tNames.join(", ")}) are assigned as the Class Teacher for "${cls}". Since Class Teachers are prioritized for the 1st period, this creates an impossible conflict.`,
          solution: `Go to Setup Hub → Teachers and ensure only one teacher is marked as the Class Teacher for a specific section.`,
        });
      }
    });

    // 6. Lab Double Period Feasibility
    subjects
      .filter((s) => s.isLab)
      .forEach((labSubj) => {
        const hasLabRoom = rooms.some((r) => r.isLab);
        if (rooms.length > 0 && !hasLabRoom) {
          issues.push({
            id: `lab_room_warning_${labSubj.id}`,
            type: "warning",
            category: "unassigned_subject",
            title: `Practical Lab Subject "${labSubj.name}" without Dedicated Lab Room`,
            description: `Lab subject "${labSubj.name}" requires double slots, but no dedicated Lab room is configured in Rooms tab.`,
            solution: "In Setup Hub → Rooms, add a lab room (e.g. Science Lab) with 'Laboratory Room' checked.",
            targetSubject: labSubj.name,
          });
        }
      });

    return {
      issues,
      errorsCount: issues.filter((i) => i.type === "error").length,
      warningsCount: issues.filter((i) => i.type === "warning").length,
      isPerfect: issues.filter((i) => i.type === "error").length === 0,
      totalDemand: totalWeeklyDemand,
      totalCapacity: totalFacultyCapacity,
    };
  }, [
    classes,
    subjects,
    teachers,
    activeAssignments,
    rooms,
    settings,
    totalWeeklyTeachingPeriodsPerClass,
    teacherLoadMap,
  ]);

  // Filtered Issues
  const filteredIssues = useMemo(() => {
    if (filterSeverity === "all") return auditReport.issues;
    return auditReport.issues.filter((i) => i.type === filterSeverity);
  }, [auditReport.issues, filterSeverity]);

  // Action: Auto-Balance Workloads
  const handleAutoBalance = async () => {
    setIsBalancing(true);
    try {
      const balanced = autoBuildRoutineAssignments(classes, subjects, teachers, settings, rooms);
      if (onSaveAssignments) {
        await onSaveAssignments(balanced);
      }
    } finally {
      setIsBalancing(false);
    }
  };

  // Action: Run Verification
  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
    }, 400);
  };

  return (
    <div className="space-y-5 w-full">
      {/* 1. Header Card: System Health & Action Bar */}
      <div className="bg-card border rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2.5 rounded-lg border",
              auditReport.isPerfect
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                : "bg-red-500/10 text-destructive border-red-200"
            )}
          >
            {auditReport.isPerfect ? (
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                Curriculum & Faculty Verification Hub
              </h2>
              <Badge
                variant={auditReport.isPerfect ? "secondary" : "destructive"}
                className={cn(
                  "text-[10px] font-mono font-bold",
                  auditReport.isPerfect && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                )}
              >
                {auditReport.isPerfect
                  ? "100% Ready for Generation"
                  : `${auditReport.errorsCount} Critical Issues Found`}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRunAudit}
            disabled={isAuditing || isBalancing}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isAuditing && "animate-spin text-primary")} />
            Verify System
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoBalance}
            disabled={isBalancing || isAuditing}
            className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {isBalancing ? "Balancing..." : "Auto-Balance Workloads"}
          </Button>

          <Link href="/routine/generate">
            <Button
              size="sm"
              className={cn(
                "h-8 text-xs font-bold gap-1.5 shadow-xs",
                auditReport.isPerfect
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-primary text-primary-foreground"
              )}
            >
              Proceed to Generator
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Key Diagnostic Health Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Sections & Capacity</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-foreground">{classes.length}</span>
              <span className="text-xs text-muted-foreground">classes</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Total Curriculum Demand</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-foreground">{auditReport.totalDemand}</span>
              <span className="text-xs text-muted-foreground">periods/wk</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Faculty Total Capacity</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-foreground">{auditReport.totalCapacity}</span>
              <span className="text-xs text-muted-foreground">periods/wk</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              auditReport.errorsCount > 0 ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600"
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block">Critical Bottlenecks</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span
                className={cn(
                  "text-lg font-bold",
                  auditReport.errorsCount > 0 ? "text-destructive" : "text-emerald-600"
                )}
              >
                {auditReport.errorsCount}
              </span>
              <span className="text-xs text-muted-foreground">issues</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Issues & Actionable Solutions Report */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Diagnostic Audit Report & Actionable Steps</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {auditReport.issues.length} Items
            </Badge>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterSeverity("all")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                filterSeverity === "all" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              All ({auditReport.issues.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity("error")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                filterSeverity === "error" ? "bg-destructive text-destructive-foreground font-bold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              Errors ({auditReport.errorsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity("warning")}
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-medium transition-all",
                filterSeverity === "warning" ? "bg-amber-500 text-white font-bold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              Warnings ({auditReport.warningsCount})
            </button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {filteredIssues.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <div className="text-sm font-semibold text-foreground">Zero Imbalances Detected</div>
              <div className="pt-1">
                <Link href="/routine/generate">
                  <Button size="sm" className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                    Generate Timetable
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  "p-3.5 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3",
                  issue.type === "error" ? "hover:bg-red-500/5 bg-red-500/[0.02]" : "hover:bg-amber-500/5"
                )}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    {issue.type === "error" ? (
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className="font-semibold text-xs text-foreground">{issue.title}</span>
                    {issue.targetClass && (
                      <Badge variant="outline" className="text-[9px] font-semibold">
                        {issue.targetClass}
                      </Badge>
                    )}
                    {issue.targetSubject && (
                      <Badge variant="secondary" className="text-[9px]">
                        {issue.targetSubject}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{issue.description}</p>
                </div>

                {/* Solution Box */}
                <div className="md:w-1/3 bg-muted/40 border rounded-md p-2.5 text-[11px] space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span>How to Resolve:</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{issue.solution}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Curriculum & Teacher Coverage Matrix */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Class & Subject Faculty Allocation Matrix</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {classes.length} Classes × {subjects.length} Subjects
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 px-4 w-40">Class Section</th>
                <th className="py-2.5 px-4 w-48">Subject Name</th>
                <th className="py-2.5 px-4 w-28">Weekly Load</th>
                <th className="py-2.5 px-4">Assigned / Qualified Faculty</th>
                <th className="py-2.5 px-4 w-28 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No classes configured yet in Setup Hub → Classes.
                  </td>
                </tr>
              ) : (
                classes.map((cls) => {
                  const clsNameLower = cls.className.toLowerCase();
                  const clsSubjects = subjects.filter(
                    (s) => !s.className || s.className.toLowerCase() === clsNameLower
                  );

                  if (clsSubjects.length === 0) {
                    return (
                      <tr key={cls.id}>
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {cls.className} - {cls.section}
                        </td>
                        <td colSpan={4} className="py-2.5 px-4 text-muted-foreground italic">
                          No subjects configured for {cls.className}.
                        </td>
                      </tr>
                    );
                  }

                  return clsSubjects.map((subj, sIdx) => {
                    const subjNameLower = subj.name.trim().toLowerCase();
                    const qualifiedTeachers = teachers.filter((t) => {
                      const qClasses = (t.qualifiedClasses || []).map((c) => c.toLowerCase());
                      const classQualified = qClasses.length === 0 || qClasses.includes(clsNameLower);
                      if (!classQualified) return false;

                      const classSubs = t.classSubjects?.[cls.className] || [];
                      if (classSubs.length === 0) return true;
                      return classSubs.some((s) => s.trim().toLowerCase() === subjNameLower);
                    });

                    const isCovered = qualifiedTeachers.length > 0;
                    const reqPeriods = subj.periodsPerWeek || (subj.isLab ? 2 : 5);

                    return (
                      <tr key={`${cls.id}_${subj.id}`} className="hover:bg-muted/30 transition-colors">
                        {sIdx === 0 ? (
                          <td
                            rowSpan={clsSubjects.length}
                            className="py-2.5 px-4 font-bold text-foreground border-r bg-muted/10 align-top"
                          >
                            <div className="sticky top-2">
                              <div>{cls.className}</div>
                              <div className="text-[10px] text-muted-foreground font-normal">
                                Section {cls.section}
                              </div>
                            </div>
                          </td>
                        ) : null}
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {subj.name} {subj.isLab ? "(Lab)" : ""}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold">
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {reqPeriods} p/wk
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          {qualifiedTeachers.length === 0 ? (
                            <span className="text-destructive font-medium text-xs flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              No faculty qualified
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {qualifiedTeachers.map((t) => {
                                const load = teacherLoadMap[t.id] || 0;
                                return (
                                  <Badge
                                    key={t.id}
                                    variant="outline"
                                    className="text-[10px] bg-background font-medium gap-1"
                                  >
                                    <span>{t.name}</span>
                                    <span className="text-muted-foreground font-mono">
                                      ({load}/{t.maxPeriods}p)
                                    </span>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {isCovered ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold"
                            >
                              Covered
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] font-semibold">
                              Missing Faculty
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
