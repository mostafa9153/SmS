"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scale,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  School,
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Atom,
  Briefcase,
  Palette,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClassNumericRank, getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import {
  isHsClass,
  detectSubjectStream,
  getConfiguredStreamsForClass,
  calculateClassWeeklyCapacity,
} from "@/lib/routine/routine-helpers";

// Re-export for backward compatibility
export { calculateClassWeeklyCapacity };

interface RoutineDemandAllotmentTabProps {
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  assignments: RoutineAssignment[];
  settings: RoutineSettings;
}

export interface ClassAllotmentRow {
  classId: string;
  className: string;
  section: string;
  stream: string | null;
  isHs: boolean;
  subjectsCount: number;
  demandPeriods: number;
  capacityPeriods: number;
  assignedPeriods: number;
  gap: number; // assignedPeriods - demandPeriods
  capacityGap: number; // capacityPeriods - demandPeriods
  status: "balanced" | "under_allotted" | "over_capacity" | "deficit";
  subjectList: {
    id: string;
    name: string;
    stream?: string | null;
    isCommon?: boolean;
    periods: number;
    assignedTeacher?: string | null;
    assignedPeriods: number;
  }[];
}

export function RoutineDemandAllotmentTab({
  classes,
  subjects,
  teachers,
  assignments,
  settings,
}: RoutineDemandAllotmentTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterStream, setFilterStream] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedClassIds, setExpandedClassIds] = useState<Record<string, boolean>>({});

  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);

  // Compute breakdown rows per class & stream
  const allotmentRows: ClassAllotmentRow[] = useMemo(() => {
    const rows: ClassAllotmentRow[] = [];

    // Sort classes in standard grade sequence
    const sortedClasses = [...classes].sort((a, b) => {
      const rankA = getClassNumericRank(a.className);
      const rankB = getClassNumericRank(b.className);
      if (rankA !== rankB) return rankA - rankB;
      return a.section.localeCompare(b.section);
    });

    sortedClasses.forEach((cls) => {
      const isHs = isHsClass(cls.className);
      const weeklyCapacity = calculateClassWeeklyCapacity(cls, settings);
      const clsLower = cls.className.toLowerCase();

      // Matching assignments for this specific class
      const classAssignments = assignments.filter((a) => a.classId === cls.id);

      if (isHs) {
        // For HS classes, check if section is already a stream or analyze configured streams
        const configuredStreams = getConfiguredStreamsForClass(cls.className);
        const sectionLower = cls.section.toLowerCase();

        // Check if section explicitly matches a stream
        const isSectionSpecificStream = configuredStreams.some(
          (st) => st.toLowerCase() === sectionLower
        );

        const streamsToProcess = isSectionSpecificStream
          ? [configuredStreams.find((st) => st.toLowerCase() === sectionLower)!]
          : configuredStreams;

        streamsToProcess.forEach((st) => {
          // Subjects for this stream = Common subjects + Stream-specific subjects
          const streamSubs = subjects.filter((s) => {
            const detStream = detectSubjectStream(s.name, s.stream);
            const isStreamMatch = detStream === "Common" || s.isCommon || detStream === st;
            if (!isStreamMatch) return false;

            if (s.className) {
              return s.className.toLowerCase() === clsLower;
            }
            // If className not tagged, only include if it's an HS-appropriate subject
            return isStreamMatch;
          });

          const demand = streamSubs.reduce(
            (sum, s) => sum + (s.periodsPerWeek || (s.isLab ? 2 : 5)),
            0
          );

          // Workload assigned for these stream subjects in this class
          const subIdSet = new Set(streamSubs.map((s) => s.id));
          const assigned = classAssignments
            .filter((a) => subIdSet.has(a.subjectId))
            .reduce((sum, a) => sum + a.periodsPerWeek, 0);

          const subjectList = streamSubs.map((s) => {
            const asg = classAssignments.find((a) => a.subjectId === s.id);
            const tch = asg ? teacherMap.get(asg.teacherId) : null;
            return {
              id: s.id,
              name: s.name,
              stream: s.stream || detectSubjectStream(s.name),
              isCommon: s.isCommon,
              periods: s.periodsPerWeek || (s.isLab ? 2 : 5),
              assignedTeacher: tch ? tch.name : null,
              assignedPeriods: asg ? asg.periodsPerWeek : 0,
            };
          });

          const gap = assigned - demand;
          const capacityGap = weeklyCapacity - demand;

          let status: ClassAllotmentRow["status"] = "balanced";
          if (demand > weeklyCapacity) {
            status = "over_capacity";
          } else if (assigned < demand) {
            status = "under_allotted";
          } else if (assigned > demand) {
            status = "deficit";
          }

          rows.push({
            classId: `${cls.id}_${st}`,
            className: cls.className,
            section: cls.section,
            stream: st,
            isHs: true,
            subjectsCount: streamSubs.length,
            demandPeriods: demand,
            capacityPeriods: weeklyCapacity,
            assignedPeriods: assigned,
            gap,
            capacityGap,
            status,
            subjectList,
          });
        });
      } else {
        // Non-HS General Class: Strictly match subjects for this class
        const presets = new Set(
          getDatabaseSubjectsForClass(cls.className).map((sub: string) => sub.trim().toLowerCase())
        );

        const classSubs = subjects.filter((s) => {
          if (s.className) {
            return s.className.toLowerCase() === clsLower;
          }
          // If untagged, only include if subject is part of this class's curriculum
          return presets.has(s.name.trim().toLowerCase());
        });

        const demand = classSubs.reduce(
          (sum, s) => sum + (s.periodsPerWeek || (s.isLab ? 2 : 5)),
          0
        );

        const subIdSet = new Set(classSubs.map((s) => s.id));
        const assigned = classAssignments
          .filter((a) => subIdSet.has(a.subjectId))
          .reduce((sum, a) => sum + a.periodsPerWeek, 0);

        const subjectList = classSubs.map((s) => {
          const asg = classAssignments.find((a) => a.subjectId === s.id);
          const tch = asg ? teacherMap.get(asg.teacherId) : null;
          return {
            id: s.id,
            name: s.name,
            stream: null,
            isCommon: false,
            periods: s.periodsPerWeek || (s.isLab ? 2 : 5),
            assignedTeacher: tch ? tch.name : null,
            assignedPeriods: asg ? asg.periodsPerWeek : 0,
          };
        });

        const gap = assigned - demand;
        const capacityGap = weeklyCapacity - demand;

        let status: ClassAllotmentRow["status"] = "balanced";
        if (demand > weeklyCapacity) {
          status = "over_capacity";
        } else if (assigned < demand) {
          status = "under_allotted";
        } else if (assigned > demand) {
          status = "deficit";
        }

        rows.push({
          classId: cls.id,
          className: cls.className,
          section: cls.section,
          stream: null,
          isHs: false,
          subjectsCount: classSubs.length,
          demandPeriods: demand,
          capacityPeriods: weeklyCapacity,
          assignedPeriods: assigned,
          gap,
          capacityGap,
          status,
          subjectList,
        });
      }
    });

    return rows;
  }, [classes, subjects, assignments, settings, teacherMap]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allotmentRows.filter((r) => {
      if (filterClass !== "all" && r.className !== filterClass) return false;
      if (filterStream !== "all" && r.stream !== filterStream) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.className.toLowerCase().includes(q);
        const matchSec = r.section.toLowerCase().includes(q);
        const matchStream = r.stream ? r.stream.toLowerCase().includes(q) : false;
        const matchSubject = r.subjectList.some((s) => s.name.toLowerCase().includes(q));
        if (!matchName && !matchSec && !matchStream && !matchSubject) return false;
      }
      return true;
    });
  }, [allotmentRows, filterClass, filterStream, filterStatus, searchQuery]);

  // Grand Totals Calculation
  const grandTotals = useMemo(() => {
    const totalDemand = allotmentRows.reduce((sum, r) => sum + r.demandPeriods, 0);
    const totalCapacity = allotmentRows.reduce((sum, r) => sum + r.capacityPeriods, 0);
    const totalAssigned = allotmentRows.reduce((sum, r) => sum + r.assignedPeriods, 0);
    const totalFacultyCapacity = teachers.reduce((sum, t) => sum + t.maxPeriods, 0);

    const balancedCount = allotmentRows.filter((r) => r.status === "balanced").length;
    const underAllottedCount = allotmentRows.filter((r) => r.status === "under_allotted").length;
    const overCapacityCount = allotmentRows.filter((r) => r.status === "over_capacity").length;

    const fulfillmentPercent = totalDemand > 0 ? Math.min(100, Math.round((totalAssigned / totalDemand) * 100)) : 100;
    const capacityUsagePercent = totalCapacity > 0 ? Math.round((totalDemand / totalCapacity) * 100) : 0;

    return {
      totalDemand,
      totalCapacity,
      totalAssigned,
      totalFacultyCapacity,
      balancedCount,
      underAllottedCount,
      overCapacityCount,
      fulfillmentPercent,
      capacityUsagePercent,
      totalRows: allotmentRows.length,
    };
  }, [allotmentRows, teachers]);

  const toggleExpand = React.useCallback((id: string) => {
    setExpandedClassIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandAll = React.useCallback(() => {
    const all: Record<string, boolean> = {};
    allotmentRows.forEach((r) => (all[r.classId] = true));
    setExpandedClassIds(all);
  }, [allotmentRows]);

  const collapseAll = React.useCallback(() => {
    setExpandedClassIds({});
  }, []);

  const distinctClassNames = useMemo(() => {
    return Array.from(new Set(classes.map((c) => c.className))).sort(
      (a, b) => getClassNumericRank(a) - getClassNumericRank(b)
    );
  }, [classes]);

  return (
    <div className="space-y-4 w-full">
      {/* 1. Grand Total KPI Metric Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Total Period Demand</span>
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-foreground">{grandTotals.totalDemand}</span>
            <span className="text-xs text-muted-foreground font-mono">p/wk</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5">
            <span>Class Capacity:</span>
            <span className="font-mono font-semibold text-foreground">{grandTotals.totalCapacity} p/wk</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Workload Allotted</span>
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-foreground">{grandTotals.totalAssigned}</span>
            <span className="text-xs text-muted-foreground font-mono">p/wk</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5">
            <span>Faculty Capacity:</span>
            <span className="font-mono font-semibold text-foreground">{grandTotals.totalFacultyCapacity} p/wk</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Allotment Fulfillment</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {grandTotals.fulfillmentPercent}%
            </span>
            <span className="text-[11px] text-muted-foreground">satisfied</span>
          </div>
          <div className="mt-1 w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${grandTotals.fulfillmentPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Schedule Health</span>
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <Badge
              variant={
                grandTotals.underAllottedCount === 0 && grandTotals.overCapacityCount === 0
                  ? "secondary"
                  : "destructive"
              }
              className="text-xs font-semibold gap-1"
            >
              {grandTotals.underAllottedCount === 0 && grandTotals.overCapacityCount === 0 ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>100% Balanced</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  <span>{grandTotals.underAllottedCount} Pending</span>
                </>
              )}
            </Badge>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5">
            <span>Balanced Sections:</span>
            <span className="font-mono font-semibold text-foreground">
              {grandTotals.balancedCount} / {grandTotals.totalRows}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-card border rounded-lg p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search class, section, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Select value={filterClass} onValueChange={(val) => setFilterClass(val || "all")}>
            <SelectTrigger className="h-8 text-xs w-32 bg-background font-medium">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Classes
              </SelectItem>
              {distinctClassNames.map((cls) => (
                <SelectItem key={cls} value={cls} className="text-xs">
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStream} onValueChange={(val) => setFilterStream(val || "all")}>
            <SelectTrigger className="h-8 text-xs w-32 bg-background font-medium">
              <SelectValue placeholder="All Streams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Streams
              </SelectItem>
              <SelectItem value="Science" className="text-xs">
                Science
              </SelectItem>
              <SelectItem value="Commerce" className="text-xs">
                Commerce
              </SelectItem>
              <SelectItem value="Arts" className="text-xs">
                Arts
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || "all")}>
            <SelectTrigger className="h-8 text-xs w-32 bg-background font-medium">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Statuses
              </SelectItem>
              <SelectItem value="balanced" className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Balanced
              </SelectItem>
              <SelectItem value="under_allotted" className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Under-Allotted
              </SelectItem>
              <SelectItem value="over_capacity" className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                Over Capacity
              </SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || filterClass !== "all" || filterStream !== "all" || filterStatus !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFilterClass("all");
                setFilterStream("all");
                setFilterStatus("all");
              }}
              className="h-8 text-xs font-medium px-2 text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="h-8 text-xs font-medium px-2.5"
          >
            Expand All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="h-8 text-xs font-medium px-2.5"
          >
            Collapse
          </Button>
          <Link href="/routine/assignments">
            <Button size="sm" className="h-8 text-xs font-semibold gap-1">
              <span>Manage Workload</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. Demand vs Allotment Master Table */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b text-muted-foreground font-semibold">
                <th className="py-2.5 px-3 w-10"></th>
                <th className="py-2.5 px-4">Class & Section</th>
                <th className="py-2.5 px-4">Stream</th>
                <th className="py-2.5 px-4 text-center">Subjects</th>
                <th className="py-2.5 px-4 text-center">Required Demand</th>
                <th className="py-2.5 px-4 text-center">Teacher Allotted</th>
                <th className="py-2.5 px-4 w-44">Allotment Progress</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    <Scale className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>No matching class allotments found.</span>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <AllotmentRowItem
                    key={row.classId}
                    row={row}
                    isExpanded={Boolean(expandedClassIds[row.classId])}
                    onToggleExpand={toggleExpand}
                  />
                ))
              )}
            </tbody>
            {/* Grand Total Summary Footer */}
            <tfoot>
              <tr className="bg-muted/40 border-t-2 font-bold text-foreground">
                <td className="py-3 px-3"></td>
                <td className="py-3 px-4" colSpan={2}>
                  Grand Total ({grandTotals.totalRows} Sections & Streams)
                </td>
                <td className="py-3 px-4 text-center font-mono">
                  {allotmentRows.reduce((sum, r) => sum + r.subjectsCount, 0)}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant="secondary" className="font-mono text-xs font-bold">
                    {grandTotals.totalDemand} p/wk
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge
                    variant={grandTotals.totalAssigned >= grandTotals.totalDemand ? "secondary" : "outline"}
                    className={cn(
                      "font-mono text-xs font-bold",
                      grandTotals.totalAssigned >= grandTotals.totalDemand
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                        : "text-amber-700 dark:text-amber-400 border-amber-300"
                    )}
                  >
                    {grandTotals.totalAssigned} p/wk
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{grandTotals.fulfillmentPercent}% School Total</span>
                      <span>
                        {grandTotals.totalAssigned}/{grandTotals.totalDemand} p
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-200"
                        style={{ width: `${grandTotals.fulfillmentPercent}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-xs font-mono font-bold text-foreground">
                    {grandTotals.totalAssigned >= grandTotals.totalDemand
                      ? "100% Complete"
                      : `-${grandTotals.totalDemand - grandTotals.totalAssigned} p gap`}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

interface AllotmentRowItemProps {
  row: ClassAllotmentRow;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}

const AllotmentRowItem = React.memo(function AllotmentRowItem({
  row,
  isExpanded,
  onToggleExpand,
}: AllotmentRowItemProps) {
  const percent =
    row.demandPeriods > 0
      ? Math.min(100, Math.round((row.assignedPeriods / row.demandPeriods) * 100))
      : 100;

  return (
    <React.Fragment>
      <tr
        onClick={() => onToggleExpand(row.classId)}
        className="hover:bg-muted/30 transition-colors cursor-pointer select-none"
      >
        <td className="py-2.5 px-3 text-center text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-primary" />
          ) : (
            <ChevronRight className="w-4 h-4 opacity-60" />
          )}
        </td>
        <td className="py-2.5 px-4 font-bold text-foreground">
          <div className="flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-primary opacity-80" />
            <span>{row.className}</span>
            <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
              Sec {row.section}
            </Badge>
          </div>
        </td>
        <td className="py-2.5 px-4">
          {row.isHs && row.stream ? (
            row.stream === "Science" ? (
              <Badge variant="outline" className="text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 gap-1">
                <Atom className="w-2.5 h-2.5" />
                Science
              </Badge>
            ) : row.stream === "Commerce" ? (
              <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 gap-1">
                <Briefcase className="w-2.5 h-2.5" />
                Commerce
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 gap-1">
                <Palette className="w-2.5 h-2.5" />
                Arts
              </Badge>
            )
          ) : (
            <span className="text-muted-foreground text-[11px]">General</span>
          )}
        </td>
        <td className="py-2.5 px-4 text-center font-mono font-medium text-foreground">
          {row.subjectsCount}
        </td>
        <td className="py-2.5 px-4 text-center">
          <div className="inline-flex items-center gap-1">
            <Badge variant="secondary" className="font-mono text-xs font-bold">
              {row.demandPeriods} p/wk
            </Badge>
            {row.demandPeriods > row.capacityPeriods && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 font-mono" title={`Exceeds week capacity of ${row.capacityPeriods} periods`}>
                &gt;{row.capacityPeriods}
              </Badge>
            )}
          </div>
        </td>
        <td className="py-2.5 px-4 text-center">
          <Badge
            variant={row.assignedPeriods >= row.demandPeriods ? "secondary" : "outline"}
            className={cn(
              "font-mono text-xs font-bold",
              row.assignedPeriods >= row.demandPeriods
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                : "text-amber-700 dark:text-amber-400 border-amber-300"
            )}
          >
            {row.assignedPeriods} p/wk
          </Badge>
        </td>
        <td className="py-2.5 px-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{percent}% Allotted</span>
              <span>
                {row.assignedPeriods}/{row.demandPeriods} p
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-200",
                  percent >= 100
                    ? "bg-emerald-600"
                    : percent >= 75
                    ? "bg-blue-600"
                    : "bg-amber-500"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </td>
        <td className="py-2.5 px-4 text-right">
          {row.status === "balanced" && (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Balanced
            </Badge>
          )}
          {row.status === "under_allotted" && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 text-[10px] font-semibold gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Short {row.demandPeriods - row.assignedPeriods}p
            </Badge>
          )}
          {row.status === "over_capacity" && (
            <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
              <AlertCircle className="w-3 h-3" />
              Over {row.demandPeriods - row.capacityPeriods}p
            </Badge>
          )}
          {row.status === "deficit" && (
            <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 border-blue-200">
              Excess +{row.assignedPeriods - row.demandPeriods}p
            </Badge>
          )}
        </td>
      </tr>

      {/* Expandable Subject-by-Subject Breakdown Drawer */}
      {isExpanded && (
        <tr className="bg-muted/15 border-b">
          <td colSpan={8} className="p-3 pl-10">
            <div className="border rounded-md bg-card overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/40 border-b flex items-center justify-between text-xs font-semibold text-foreground">
                <span>
                  {row.className} (Sec {row.section}
                  {row.stream ? ` - ${row.stream}` : ""}) Subject Demand Breakdown
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {row.subjectList.length} Subjects Configured
                </span>
              </div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/10 border-b text-[11px] text-muted-foreground font-semibold">
                    <th className="py-1.5 px-3">Subject</th>
                    <th className="py-1.5 px-3">Type</th>
                    <th className="py-1.5 px-3 text-center">Required Demand</th>
                    <th className="py-1.5 px-3">Assigned Faculty</th>
                    <th className="py-1.5 px-3 text-center">Assigned Load</th>
                    <th className="py-1.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {row.subjectList.map((sub) => {
                    return (
                      <tr key={sub.id} className="hover:bg-muted/20">
                        <td className="py-1.5 px-3 font-semibold text-foreground">
                          {sub.name}
                        </td>
                        <td className="py-1.5 px-3">
                          {sub.isCommon ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                              Common Core
                            </Badge>
                          ) : sub.stream ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {sub.stream}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">General</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-bold">
                          {sub.periods} p/wk
                        </td>
                        <td className="py-1.5 px-3">
                          {sub.assignedTeacher ? (
                            <span className="font-medium text-foreground flex items-center gap-1">
                              <Users className="w-3 h-3 text-primary opacity-70" />
                              {sub.assignedTeacher}
                            </span>
                          ) : (
                            <span className="text-destructive text-[11px] italic font-medium">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center font-mono font-semibold">
                          {sub.assignedPeriods} p/wk
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          {isSubSubFullyAllotted(sub) ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Allotted
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px] flex items-center justify-end gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

function isSubSubFullyAllotted(sub: { periods: number; assignedPeriods: number }): boolean {
  return sub.assignedPeriods >= sub.periods;
}
