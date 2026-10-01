"use client";

import React, { useState, useMemo } from "react";
import {
  RoutineClass,
  RoutineSubject,
  RoutineTeacher,
  RoutineAssignment,
  RoutineSettings,
} from "@/lib/routine/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  School,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { generateInitials } from "@/lib/routine/routine-helpers";

interface RoutineAllotmentOverviewTabProps {
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  assignments: RoutineAssignment[];
  settings: RoutineSettings;
}

interface TeacherAssignmentItem {
  teacherId: string;
  teacherName: string;
  teacherCode: string;
  periods: number;
  subjectName: string;
  isLab?: boolean;
}

interface CellAllotmentData {
  subjectName: string;
  demandPeriods: number;
  assignedPeriods: number;
  teachers: TeacherAssignmentItem[];
  status: "balanced" | "missing" | "overflow" | "unconfigured";
  missingCount: number;
  overflowCount: number;
}

interface ClassRowData {
  classId: string;
  className: string;
  section: string;
  label: string;
  numericRank: number;
  cells: Record<string, CellAllotmentData>;
  totalClassDemand: number;
  totalClassAssigned: number;
  hasIssues: boolean;
}

interface TeacherLoadRowData {
  teacherId: string;
  teacherIndex: number;
  teacherCode: string;
  name: string;
  shortName: string;
  primarySubject: string;
  maxPeriods: number;
  totalAssignedPeriods: number;
  assignedClasses: {
    className: string;
    section: string;
    label: string;
    subject: string;
    periods: number;
  }[];
  status: "balanced" | "underloaded" | "overloaded" | "idle";
  overloadCount: number;
  hasIssues: boolean;
}

export function RoutineAllotmentOverviewTab({
  classes,
  subjects,
  teachers,
  assignments,
  settings,
}: RoutineAllotmentOverviewTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [issuesOnly, setIssuesOnly] = useState<boolean>(false);

  // 1. Assign Teacher Short Code / Initials (e.g. AK, SR, MB)
  const teacherCodeMap = useMemo(() => {
    const map = new Map<string, { code: string; index: number; teacher: RoutineTeacher }>();
    teachers.forEach((t, idx) => {
      const code = (t.shortName || generateInitials(t.name) || `T${idx + 1}`).trim().toUpperCase();
      map.set(t.id, { code, index: idx + 1, teacher: t });
    });
    return map;
  }, [teachers]);

  // 2. Canonical list of subject categories / columns across configured curriculum
  const distinctSubjectNames = useMemo(() => {
    const subMap = new Map<string, { name: string; priority: number }>();

    const getSubjectPriority = (name: string): number => {
      const n = name.toLowerCase();
      if (n.includes("bengali") || n.includes("বাংলা") || n.includes("first lang")) return 1;
      if (n.includes("english") || n.includes("ইংরেজি") || n.includes("second lang")) return 2;
      if (n.includes("math") || n.includes("গণিত")) return 3;
      if (n.includes("science") || n.includes("বিজ্ঞান") || n.includes("পরিবেশ") || n.includes("physical") || n.includes("life")) return 4;
      if (n.includes("history") || n.includes("ইতিহাস")) return 5;
      if (n.includes("geography") || n.includes("ভূগোল")) return 6;
      if (n.includes("work") || n.includes("কর্ম") || n.includes("computer") || n.includes("phys") || n.includes("শারীর")) return 7;
      if (n.includes("sanskrit") || n.includes("arabic") || n.includes("philosophy") || n.includes("দর্শন")) return 8;
      return 9;
    };

    subjects.forEach((s) => {
      if (s.name && !subMap.has(s.name.trim())) {
        subMap.set(s.name.trim(), {
          name: s.name.trim(),
          priority: getSubjectPriority(s.name),
        });
      }
    });

    teachers.forEach((t) => {
      if (t.classSubjects) {
        Object.values(t.classSubjects).forEach((subs) => {
          subs.forEach((s) => {
            if (s && !subMap.has(s.trim())) {
              subMap.set(s.trim(), {
                name: s.trim(),
                priority: getSubjectPriority(s),
              });
            }
          });
        });
      }
    });

    if (subMap.size === 0) {
      ["Bengali", "English", "Mathematics", "Physical Science", "History", "Geography"].forEach((s) => {
        subMap.set(s, { name: s, priority: getSubjectPriority(s) });
      });
    }

    return Array.from(subMap.values())
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
      .map((item) => item.name);
  }, [subjects, teachers]);

  // 3. Compute Chart 1 Matrix Rows (Class-wise Allotment Sheet)
  const classMatrixRows: ClassRowData[] = useMemo(() => {
    const sortedClasses = [...classes].sort(
      (a, b) =>
        getClassNumericRank(a.className) - getClassNumericRank(b.className) ||
        a.section.localeCompare(b.section)
    );

    return sortedClasses.map((cls) => {
      const clsLabel = `${cls.className}-${cls.section}`;
      const cells: Record<string, CellAllotmentData> = {};
      let totalClassDemand = 0;
      let totalClassAssigned = 0;
      let hasIssues = false;

      distinctSubjectNames.forEach((subName) => {
        const matchedSubject = subjects.find(
          (s) =>
            s.name.trim().toLowerCase() === subName.trim().toLowerCase() &&
            (!s.className || s.className.trim().toLowerCase() === cls.className.trim().toLowerCase())
        );

        const demandPeriods =
          matchedSubject?.periodsPerWeek && matchedSubject.periodsPerWeek > 0
            ? matchedSubject.periodsPerWeek
            : 0;

        const cellTeachers: TeacherAssignmentItem[] = [];
        let assignedPeriods = 0;

        const directAssignments = assignments.filter((a) => {
          if (a.classId !== cls.id) return false;
          const matchedSub = subjects.find((s) => s.id === a.subjectId);
          return matchedSub && matchedSub.name.trim().toLowerCase() === subName.trim().toLowerCase();
        });

        if (directAssignments.length > 0) {
          directAssignments.forEach((a) => {
            const tInfo = teacherCodeMap.get(a.teacherId);
            const t = tInfo?.teacher || teachers.find((t) => t.id === a.teacherId);
            cellTeachers.push({
              teacherId: a.teacherId,
              teacherName: t?.name || "Unknown Teacher",
              teacherCode: tInfo?.code || (t?.shortName || generateInitials(t?.name || "T")),
              periods: a.periodsPerWeek,
              subjectName: subName,
            });
            assignedPeriods += a.periodsPerWeek;
          });
        } else {
          teachers.forEach((t) => {
            const secKey = `${cls.className}::${cls.section}`;
            const altSecKey = `${cls.className}-${cls.section}`;
            const altSecKey2 = `${cls.className}_${cls.section}`;

            const explicitP =
              t.subjectPeriods?.[`${cls.className}::${cls.section}::${subName}`] ??
              t.subjectPeriods?.[`${cls.className}-${cls.section}-${subName}`] ??
              t.subjectPeriods?.[`${cls.className}_${cls.section}_${subName}`] ??
              t.subjectPeriods?.[`${cls.className}::${subName}`];

            const hasExplicitSubjPeriod = Boolean(explicitP && Number(explicitP) > 0);

            const hasSecSub =
              (t.sectionSubjects?.[secKey] && t.sectionSubjects[secKey].includes(subName)) ||
              (t.sectionSubjects?.[altSecKey] && t.sectionSubjects[altSecKey].includes(subName)) ||
              (t.sectionSubjects?.[altSecKey2] && t.sectionSubjects[altSecKey2].includes(subName));

            const isAssigned =
              hasExplicitSubjPeriod ||
              hasSecSub ||
              (!t.sectionSubjects?.[secKey] &&
                !t.sectionSubjects?.[altSecKey] &&
                t.qualifiedClasses?.includes(cls.className) &&
                t.classSubjects?.[cls.className]?.includes(subName) &&
                (!t.classSections?.[cls.className] ||
                  t.classSections[cls.className].includes(cls.section)));

            if (isAssigned) {
              const p =
                explicitP != null
                  ? Number(explicitP)
                  : demandPeriods > 0
                  ? demandPeriods
                  : 4;

              const tInfo = teacherCodeMap.get(t.id);
              cellTeachers.push({
                teacherId: t.id,
                teacherName: t.name,
                teacherCode: tInfo?.code || (t.shortName || generateInitials(t.name)),
                periods: p,
                subjectName: subName,
              });
              assignedPeriods += p;
            }
          });
        }

        totalClassDemand += demandPeriods;
        totalClassAssigned += assignedPeriods;

        let status: CellAllotmentData["status"] = "balanced";
        let missingCount = 0;
        let overflowCount = 0;

        if (demandPeriods === 0 && assignedPeriods === 0) {
          status = "unconfigured";
        } else if (assignedPeriods < demandPeriods) {
          status = "missing";
          missingCount = demandPeriods - assignedPeriods;
          hasIssues = true;
        } else if (assignedPeriods > demandPeriods) {
          status = "overflow";
          overflowCount = assignedPeriods - demandPeriods;
          hasIssues = true;
        }

        cells[subName] = {
          subjectName: subName,
          demandPeriods,
          assignedPeriods,
          teachers: cellTeachers,
          status,
          missingCount,
          overflowCount,
        };
      });

      return {
        classId: cls.id,
        className: cls.className,
        section: cls.section,
        label: clsLabel,
        numericRank: getClassNumericRank(cls.className),
        cells,
        totalClassDemand,
        totalClassAssigned,
        hasIssues,
      };
    });
  }, [classes, distinctSubjectNames, subjects, teachers, assignments, teacherCodeMap]);

  // 4. Compute Chart 2 Rows (Teacher Load Cross-Check)
  const teacherLoadRows: TeacherLoadRowData[] = useMemo(() => {
    return teachers.map((t, idx) => {
      const code = (t.shortName || generateInitials(t.name) || `T${idx + 1}`).trim().toUpperCase();
      const shortName = t.shortName || generateInitials(t.name);
      const maxPeriods = t.maxPeriods || 24;
      const assignedClasses: TeacherLoadRowData["assignedClasses"] = [];
      let totalAssignedPeriods = 0;

      classes.forEach((c) => {
        const secKey = `${c.className}::${c.section}`;
        const activeSubs =
          t.sectionSubjects?.[secKey] ||
          (t.qualifiedClasses?.includes(c.className) &&
          (!t.classSections?.[c.className] || t.classSections[c.className].includes(c.section))
            ? t.classSubjects?.[c.className] || []
            : []);

        activeSubs.forEach((subName) => {
          const p =
            t.subjectPeriods?.[`${c.className}::${c.section}::${subName}`] ||
            t.subjectPeriods?.[`${c.className}::${subName}`] ||
            4;

          assignedClasses.push({
            className: c.className,
            section: c.section,
            label: `${c.className}-${c.section}`,
            subject: subName,
            periods: p,
          });
          totalAssignedPeriods += p;
        });
      });

      let status: TeacherLoadRowData["status"] = "balanced";
      let overloadCount = 0;
      let hasIssues = false;

      if (totalAssignedPeriods === 0) {
        status = "idle";
        hasIssues = true;
      } else if (totalAssignedPeriods > maxPeriods) {
        status = "overloaded";
        overloadCount = totalAssignedPeriods - maxPeriods;
        hasIssues = true;
      } else if (totalAssignedPeriods < Math.floor(maxPeriods * 0.4)) {
        status = "underloaded";
      }

      return {
        teacherId: t.id,
        teacherIndex: idx + 1,
        teacherCode: code,
        name: t.name,
        shortName,
        primarySubject: t.primarySubject || "General",
        maxPeriods,
        totalAssignedPeriods,
        assignedClasses,
        status,
        overloadCount,
        hasIssues,
      };
    });
  }, [teachers, classes]);

  // 5. Global Metrics & Balance Calculations
  const grandTotalDemand = useMemo(() => {
    return classMatrixRows.reduce((sum, r) => sum + r.totalClassDemand, 0);
  }, [classMatrixRows]);

  const grandTotalClassAssigned = useMemo(() => {
    return classMatrixRows.reduce((sum, r) => sum + r.totalClassAssigned, 0);
  }, [classMatrixRows]);

  const grandTotalTeacherLoad = useMemo(() => {
    return teacherLoadRows.reduce((sum, t) => sum + t.totalAssignedPeriods, 0);
  }, [teacherLoadRows]);

  const totalMissingPeriods = useMemo(() => {
    let count = 0;
    classMatrixRows.forEach((r) => {
      Object.values(r.cells).forEach((c) => {
        if (c.status === "missing") count += c.missingCount;
      });
    });
    return count;
  }, [classMatrixRows]);

  const totalOverloadedTeachers = useMemo(() => {
    return teacherLoadRows.filter((t) => t.status === "overloaded").length;
  }, [teacherLoadRows]);

  const isSystemBalanced = grandTotalDemand > 0 && grandTotalDemand === grandTotalClassAssigned && totalMissingPeriods === 0;

  // Filtered views
  const filteredClassMatrix = useMemo(() => {
    return classMatrixRows.filter((row) => {
      if (filterClass !== "all" && row.className !== filterClass) return false;
      if (issuesOnly && !row.hasIssues) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClass = row.label.toLowerCase().includes(q);
        const matchesTeacher = Object.values(row.cells).some((cell) =>
          cell.teachers.some(
            (t) =>
              t.teacherName.toLowerCase().includes(q) ||
              t.teacherCode.toLowerCase().includes(q)
          )
        );
        return matchesClass || matchesTeacher;
      }
      return true;
    });
  }, [classMatrixRows, filterClass, issuesOnly, searchQuery]);

  const filteredTeacherLoads = useMemo(() => {
    return teacherLoadRows.filter((row) => {
      if (issuesOnly && !row.hasIssues) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          row.name.toLowerCase().includes(q) ||
          row.teacherCode.toLowerCase().includes(q) ||
          row.primarySubject.toLowerCase().includes(q) ||
          row.assignedClasses.some((c) => c.label.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [teacherLoadRows, issuesOnly, searchQuery]);

  const uniqueClassNames = useMemo(() => {
    return Array.from(new Set(classes.map((c) => c.className))).sort(
      (a, b) => getClassNumericRank(a) - getClassNumericRank(b)
    );
  }, [classes]);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-150">
      {/* 1. Global Balance Status Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Total Subject Demand</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold font-mono text-foreground">{grandTotalDemand}</span>
            <span className="text-xs text-muted-foreground">p/wk</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Total Faculty Allotment</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold font-mono text-primary">{grandTotalTeacherLoad}</span>
            <span className="text-xs text-muted-foreground">p/wk</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Unallocated Deficit</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={cn("text-xl font-bold font-mono", totalMissingPeriods > 0 ? "text-amber-500" : "text-emerald-500")}>
              {totalMissingPeriods}
            </span>
            <span className="text-xs text-muted-foreground">periods missing</span>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-3.5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Cross-Check Health</span>
          <div className="flex items-center gap-1.5 mt-1">
            {isSystemBalanced ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
              </Badge>
            ) : (
              <Badge variant="destructive" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {totalMissingPeriods > 0
                  ? `${totalMissingPeriods}p Unallotted`
                  : totalOverloadedTeachers > 0
                  ? `${totalOverloadedTeachers} Overloaded`
                  : "Mismatch"}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 2. Control Bar: Search & Issue Filter */}
      <div className="bg-card border rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search class, subject, teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <Select value={filterClass} onValueChange={(val) => setFilterClass(val ?? "all")}>
            <SelectTrigger className="h-8 w-36 text-xs bg-background">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Classes</SelectItem>
              {uniqueClassNames.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={issuesOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setIssuesOnly(!issuesOnly)}
            className={cn(
              "h-8 text-xs font-semibold gap-1.5 px-3",
              issuesOnly ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/30" : ""
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{issuesOnly ? "Showing Issues Only" : "Highlight Issues"}</span>
          </Button>
        </div>
      </div>

      {/* 3. CHART 1: Class-wise Subject & Teacher Allotment Matrix */}
      <div className="bg-card border rounded-xl shadow-xs overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <School className="w-4 h-4 text-primary" />
              Class-wise Subject & Teacher Allotment Matrix
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Reading Guide: Number in parentheses represents weekly periods. e.g. <span className="font-mono font-bold text-foreground">AK (4)</span> indicates Teacher AK will take 4 periods/week.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Allocated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Missing Quota
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Over Allotted
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-muted-foreground font-semibold text-[11px]">
                <th className="py-2.5 px-3 text-left font-bold text-foreground sticky left-0 bg-muted/90 backdrop-blur-xs z-10 w-28 border-r">
                  Class & Sec
                </th>
                {distinctSubjectNames.map((subName) => (
                  <th key={subName} className="py-2.5 px-2.5 text-center font-bold text-foreground whitespace-nowrap min-w-[110px] border-r">
                    {subName}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-center font-bold text-primary sticky right-0 bg-muted/90 backdrop-blur-xs z-10 w-24">
                  Total Periods
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredClassMatrix.length === 0 ? (
                <tr>
                  <td colSpan={distinctSubjectNames.length + 2} className="py-8 text-center text-muted-foreground italic">
                    No matching classes found.
                  </td>
                </tr>
              ) : (
                filteredClassMatrix.map((row) => (
                  <tr key={row.classId} className="hover:bg-muted/30 transition-colors">
                    {/* Class & Section Header */}
                    <td className="py-2 px-3 font-bold font-mono text-foreground sticky left-0 bg-card/95 backdrop-blur-xs z-10 border-r flex items-center gap-1.5">
                      <span>{row.label}</span>
                      {row.hasIssues && (
                        <span title="Has unallotted or mismatched subjects" className="inline-flex shrink-0">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        </span>
                      )}
                    </td>

                    {/* Subject Cells */}
                    {distinctSubjectNames.map((subName) => {
                      const cell = row.cells[subName];
                      if (!cell || (cell.demandPeriods === 0 && cell.assignedPeriods === 0)) {
                        return (
                          <td key={subName} className="py-2 px-2 text-center text-muted-foreground/40 font-mono border-r">
                            —
                          </td>
                        );
                      }

                      const isMissing = cell.status === "missing";
                      const isOverflow = cell.status === "overflow";

                      return (
                        <td
                          key={subName}
                          className={cn(
                            "py-2 px-2 text-center border-r transition-all group relative",
                            isMissing
                              ? "bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-inset ring-amber-500/30"
                              : isOverflow
                              ? "bg-rose-500/10 hover:bg-rose-500/20 ring-1 ring-inset ring-rose-500/30"
                              : ""
                          )}
                          title={`${subName} (${row.label})\nDemand: ${cell.demandPeriods} p/wk\nAssigned: ${cell.assignedPeriods} p/wk\n${cell.teachers.map((t) => `${t.teacherName} (${t.teacherCode}): ${t.periods}p`).join("\n")}${isMissing ? `\n⚠️ Missing ${cell.missingCount} periods!` : ""}`}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            {cell.teachers.length > 0 ? (
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {cell.teachers.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={cn(
                                      "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-transform hover:scale-105",
                                      isMissing
                                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                        : isOverflow
                                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                                        : "bg-primary/10 text-primary border border-primary/20"
                                    )}
                                  >
                                    {t.teacherCode} ({t.periods})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                                ⚠️ 0/{cell.demandPeriods}
                              </span>
                            )}

                            {isMissing && cell.teachers.length > 0 && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                                (-{cell.missingCount}p)
                              </span>
                            )}
                            {isOverflow && (
                              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                                (+{cell.overflowCount}p)
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Total Class Periods Column */}
                    <td className="py-2 px-3 text-center font-bold font-mono text-primary sticky right-0 bg-card/95 backdrop-blur-xs z-10">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md",
                        row.totalClassAssigned !== row.totalClassDemand
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-primary/10 text-primary"
                      )}>
                        {row.totalClassAssigned}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Footer Summary Row */}
            <tfoot>
              <tr className="bg-muted/60 border-t-2 border-border font-bold text-foreground text-xs">
                <td className="py-2.5 px-3 sticky left-0 bg-muted/95 backdrop-blur-xs z-10 border-r font-mono">
                  Total
                </td>
                {distinctSubjectNames.map((subName) => {
                  const colTotal = filteredClassMatrix.reduce((sum, r) => {
                    const cell = r.cells[subName];
                    return sum + (cell?.assignedPeriods || 0);
                  }, 0);
                  return (
                    <td key={subName} className="py-2.5 px-2.5 text-center font-mono border-r">
                      {colTotal > 0 ? colTotal : "—"}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-center font-mono text-primary sticky right-0 bg-muted/95 backdrop-blur-xs z-10 text-sm">
                  {grandTotalClassAssigned}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. CHART 2: Faculty Workload Cross-Check & Verification */}
      <div className="bg-card border rounded-xl shadow-xs overflow-hidden space-y-0">
        <div className="px-4 py-3 border-b bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Faculty Workload Cross-Check & Verification
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Cross-verify total weekly periods allocated per teacher to ensure balanced faculty workload before routine generation.
            </p>
          </div>

          <Badge variant="outline" className="font-mono text-xs font-bold text-foreground bg-background">
            {teachers.length} Faculty Members
          </Badge>
        </div>

        {/* Teacher Load Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b text-muted-foreground font-semibold text-[11px]">
                <th className="py-2.5 px-3 text-left font-bold text-foreground w-28 border-r">
                  Teacher Code
                </th>
                <th className="py-2.5 px-3 text-left font-bold text-foreground min-w-[150px] border-r">
                  Faculty Name
                </th>
                <th className="py-2.5 px-3 text-left font-bold text-foreground min-w-[120px] border-r">
                  Primary Subject
                </th>
                <th className="py-2.5 px-3 text-left font-bold text-foreground border-r">
                  Assigned Classes & Periods
                </th>
                <th className="py-2.5 px-4 text-center font-bold text-primary w-28">
                  Total Workload
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTeacherLoads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                    No matching faculty records found.
                  </td>
                </tr>
              ) : (
                filteredTeacherLoads.map((t) => {
                  const isOverloaded = t.status === "overloaded";
                  const isIdle = t.status === "idle";

                  return (
                    <tr
                      key={t.teacherId}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        isOverloaded
                          ? "bg-rose-500/5 hover:bg-rose-500/10"
                          : isIdle
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : ""
                      )}
                    >
                      {/* Teacher Code */}
                      <td className="py-2.5 px-3 font-mono font-bold text-primary border-r">
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                          {t.teacherCode}
                        </span>
                      </td>

                      {/* Full Name & Short Name */}
                      <td className="py-2.5 px-3 font-semibold text-foreground border-r">
                        <div className="flex items-center gap-1.5">
                          <span>{t.name}</span>
                          {t.shortName && t.shortName !== t.teacherCode && (
                            <span className="text-[10px] text-muted-foreground font-mono font-normal">
                              ({t.shortName})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Primary Subject */}
                      <td className="py-2.5 px-3 text-foreground/90 border-r">
                        <Badge variant="outline" className="text-[10px] font-medium bg-background">
                          {t.primarySubject}
                        </Badge>
                      </td>

                      {/* Assigned Classes List */}
                      <td className="py-2.5 px-3 border-r">
                        {t.assignedClasses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {t.assignedClasses.map((ac, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-muted/60 border border-border text-foreground"
                                title={`${ac.subject} in ${ac.label} (${ac.periods} periods/week)`}
                              >
                                <span className="font-semibold">{ac.label}</span>
                                <span className="text-primary font-bold">({ac.periods})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-amber-500 text-[11px] font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> No classes assigned
                          </span>
                        )}
                      </td>

                      {/* Total Assigned Periods vs Max */}
                      <td className="py-2.5 px-4 text-center border-l">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span
                            className={cn(
                              "text-sm font-bold font-mono px-2 py-0.5 rounded-md",
                              isOverloaded
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                : isIdle
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            {t.totalAssignedPeriods}
                          </span>
                          <span className="text-[9.5px] text-muted-foreground font-mono">
                            max {t.maxPeriods}p
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Footer Grand Total */}
            <tfoot>
              <tr className="bg-muted/60 border-t-2 border-border font-bold text-foreground text-xs">
                <td colSpan={4} className="py-2.5 px-3 text-left font-semibold">
                  Grand Total Faculty Workload
                </td>
                <td className="py-2.5 px-4 text-center font-mono text-primary text-sm font-bold">
                  {grandTotalTeacherLoad}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
