"use client";

import type { RoutineAllotmentOverviewTabProps } from "./props";
import { useState, useMemo } from "react";
import { RoutineClass, RoutineTeacher } from "@/lib/routine/types";
import { getClassGroupAllotments } from "@/lib/routine/routine-groups";
import { getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { generateInitials, getTeacherSubjectPeriod, isTeacherAssignedToSubject } from "@/lib/routine/routine-helpers";
import { CellAllotmentData, ClassRowData, TeacherAssignmentItem } from "@/components/routine/allotment-overview/types";
import { TeacherLoadRowData } from "@/components/routine/allotment-overview/teacher-load-types";

export function useRoutineAllotmentOverview({
  classes,
  subjects,
  teachers,
  assignments,
  settings: _settings,
  groups = [],
}: RoutineAllotmentOverviewTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClassState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const c = urlParams.get("class") || urlParams.get("overviewClass");
        if (c) return c;
        const saved = localStorage.getItem("sms_routine_overview_class");
        if (saved) return saved;
      } catch {}
    }
    return "all";
  });

  const setFilterClass = (c: string) => {
    setFilterClassState(c);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_routine_overview_class", c);
      } catch {}
      const url = new URL(window.location.href);
      if (c === "all") {
        url.searchParams.delete("class");
        url.searchParams.delete("overviewClass");
      } else {
        url.searchParams.set("class", c);
        url.searchParams.set("overviewClass", c);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  const [filterTeacher, setFilterTeacherState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const t = urlParams.get("teacher") || urlParams.get("teacherId");
        if (t) return t;
        const saved = localStorage.getItem("sms_routine_overview_teacher");
        if (saved) return saved;
      } catch {}
    }
    return "all";
  });

  const setFilterTeacher = (t: string) => {
    setFilterTeacherState(t);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_routine_overview_teacher", t);
      } catch {}
      const url = new URL(window.location.href);
      if (t === "all") {
        url.searchParams.delete("teacher");
        url.searchParams.delete("teacherId");
      } else {
        url.searchParams.set("teacher", t);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

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
      if (s.name) {
        const canonical = s.name.replace(/\s*\((Theory|Lab|Practical)\)/i, "").trim();
        if (canonical && !subMap.has(canonical)) {
          subMap.set(canonical, {
            name: canonical,
            priority: getSubjectPriority(canonical),
          });
        }
      }
    });

    teachers.forEach((t) => {
      if (t.classSubjects) {
        Object.values(t.classSubjects).forEach((subs) => {
          subs.forEach((s) => {
            if (s) {
              const canonical = s.replace(/\s*\((Theory|Lab|Practical)\)/i, "").trim();
              if (canonical && !subMap.has(canonical)) {
                subMap.set(canonical, {
                  name: canonical,
                  priority: getSubjectPriority(canonical),
                });
              }
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
      const classGroupAllots = getClassGroupAllotments(cls.id, groups, subjects, teachers);
      const countedGroups = new Set<string>();

      distinctSubjectNames.forEach((subName) => {
        const cleanSubName = subName.replace(/\s*\((Theory|Lab|Practical)\)/i, "").trim().toLowerCase();
        const hasExplicitForClass = subjects.some(
          (s) => s.className && s.className.trim().toLowerCase() === cls.className.trim().toLowerCase()
        );
        const matchedSubject = subjects.find(
          (s) =>
            (s.name.trim().toLowerCase() === cleanSubName || s.name.trim().toLowerCase() === subName.trim().toLowerCase()) &&
            (hasExplicitForClass
              ? s.className && s.className.trim().toLowerCase() === cls.className.trim().toLowerCase()
              : !s.className || s.className.trim().toLowerCase() === cls.className.trim().toLowerCase())
        );

        // A subject that is an option of a group of this class is allotted through that group
        let groupHit: { allot: (typeof classGroupAllots)[number]; teacher: RoutineTeacher | null } | null = null;
        for (const allot of classGroupAllots) {
          const opt = allot.options.find((o) => {
            const n = o.subjectName.trim().toLowerCase();
            return n === cleanSubName || n === subName.trim().toLowerCase();
          });
          if (opt) {
            groupHit = { allot, teacher: opt.teacher };
            break;
          }
        }

        const demandPeriods = groupHit
          ? groupHit.allot.periods
          : matchedSubject?.periodsPerWeek && matchedSubject.periodsPerWeek > 0
          ? matchedSubject.periodsPerWeek
          : 0;

        const cellTeachers: TeacherAssignmentItem[] = [];
        let assignedPeriods = 0;

        const directAssignments = assignments.filter((a) => {
          if (a.classId !== cls.id) return false;
          const matchedSub = subjects.find((s) => s.id === a.subjectId);
          if (!matchedSub) return false;
          const cleanMatched = matchedSub.name.replace(/\s*\((Theory|Lab|Practical)\)/i, "").trim().toLowerCase();
          return cleanMatched === cleanSubName || matchedSub.name.trim().toLowerCase() === subName.trim().toLowerCase();
        });

        if (groupHit) {
          if (groupHit.teacher) {
            const tInfo = teacherCodeMap.get(groupHit.teacher.id);
            cellTeachers.push({
              teacherId: groupHit.teacher.id,
              teacherName: groupHit.teacher.name,
              teacherCode: tInfo?.code || groupHit.teacher.shortName || generateInitials(groupHit.teacher.name),
              periods: groupHit.allot.periods,
              subjectName: subName,
            });
            assignedPeriods = groupHit.allot.periods;
          }
        } else if (directAssignments.length > 0) {
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
            if (isTeacherAssignedToSubject(t, cls.className, cls.section, subName)) {
              const p = getTeacherSubjectPeriod(
                t,
                cls.className,
                cls.section,
                subName,
                demandPeriods > 0 ? demandPeriods : 5
              );

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

        // The options of one group share a single slot: count the group once in the class totals
        if (!groupHit || !countedGroups.has(groupHit.allot.group.id)) {
          totalClassDemand += demandPeriods;
          totalClassAssigned += groupHit ? (groupHit.allot.complete ? demandPeriods : 0) : assignedPeriods;
          if (groupHit) countedGroups.add(groupHit.allot.group.id);
        }

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
  }, [classes, distinctSubjectNames, subjects, teachers, assignments, teacherCodeMap, groups]);

  // 4. Compute Chart 2 Rows (Teacher Load Cross-Check)
  const teacherLoadRows: TeacherLoadRowData[] = useMemo(() => {
    return teachers.map((t, idx) => {
      const code = (t.shortName || generateInitials(t.name) || `T${idx + 1}`).trim().toUpperCase();
      const shortName = t.shortName || generateInitials(t.name);
      const maxPeriods = t.maxPeriods || 24;
      const assignedClasses: TeacherLoadRowData["assignedClasses"] = [];
      let totalAssignedPeriods = 0;

      const directTeacherAssignments = assignments.filter((a) => a.teacherId === t.id);

      if (directTeacherAssignments.length > 0) {
        directTeacherAssignments.forEach((a) => {
          const c = classes.find((cls) => cls.id === a.classId);
          const s = subjects.find((sub) => sub.id === a.subjectId);
          if (c && s) {
            assignedClasses.push({
              className: c.className,
              section: c.section,
              label: `${c.className}-${c.section}`,
              subject: s.name,
              periods: a.periodsPerWeek,
            });
            totalAssignedPeriods += a.periodsPerWeek;
          }
        });
      } else {
        classes.forEach((c) => {
          const secKey = `${c.className}::${c.section}`;
          const altSecKey = `${c.className}-${c.section}`;
          const altSecKey2 = `${c.className}_${c.section}`;

          const allowedSecs = t.classSections?.[c.className];
          if (allowedSecs !== undefined && Array.isArray(allowedSecs)) {
            const isAllowed = allowedSecs.some(
              (s) => s.trim().toLowerCase() === "all" || s.trim().toLowerCase() === c.section.toLowerCase()
            );
            if (!isAllowed) {
              return;
            }
          }

          const hasSecConfig = Object.keys(t.sectionSubjects || {}).some(
            (k) =>
              k.startsWith(`${c.className}::`) ||
              k.startsWith(`${c.className}-`) ||
              k.startsWith(`${c.className}_`)
          );

          let activeSubs: string[] = [];
          if (hasSecConfig) {
            activeSubs =
              t.sectionSubjects?.[secKey] ??
              t.sectionSubjects?.[altSecKey] ??
              t.sectionSubjects?.[altSecKey2] ??
              [];
          } else if (
            allowedSecs === undefined &&
            t.qualifiedClasses?.includes(c.className)
          ) {
            activeSubs = t.classSubjects?.[c.className] || [];
          }

          // Group member subjects are counted through the group below, not the teacher profile
          const groupMemberNames = new Set(
            getClassGroupAllotments(c.id, groups, subjects, teachers).flatMap((a) =>
              a.options.map((o) => o.subjectName.trim().toLowerCase())
            )
          );
          activeSubs = activeSubs.filter((s) => !groupMemberNames.has(s.trim().toLowerCase()));

          activeSubs.forEach((subName) => {
            const matchedSubject = (subjects || []).find(
              (s) =>
                s.name.trim().toLowerCase() === subName.trim().toLowerCase() &&
                (!s.className || s.className.trim().toLowerCase() === c.className.trim().toLowerCase())
            );
            const demandPeriods =
              matchedSubject?.periodsPerWeek && matchedSubject.periodsPerWeek > 0
                ? matchedSubject.periodsPerWeek
                : 5;

            const explicitP =
              t.subjectPeriods?.[`${c.className}::${c.section}::${subName}`] ??
              t.subjectPeriods?.[`${c.className}-${c.section}-${subName}`] ??
              t.subjectPeriods?.[`${c.className}_${c.section}_${subName}`] ??
              t.subjectPeriods?.[`${c.className}-${c.section}::${subName}`] ??
              t.subjectPeriods?.[`${c.className}_${c.section}::${subName}`] ??
              t.subjectPeriods?.[`${c.className}::${subName}`] ??
              t.subjectPeriods?.[`${c.className}-${subName}`] ??
              t.subjectPeriods?.[`${c.className}_${subName}`];

            const p =
              explicitP != null && Number(explicitP) > 0
                ? Number(explicitP)
                : demandPeriods;

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
      }

      // Group load: a pooled group costs its slots once, a non-pooled one once per section
      groups.forEach((g) => {
        const perSlot = g.options.filter((o) => o.teacherId === t.id).length;
        if (perSlot === 0 || g.sectionIds.length === 0) return;
        const memberClasses = g.sectionIds
          .map((id) => classes.find((cls) => cls.id === id))
          .filter(Boolean) as RoutineClass[];
        const first = memberClasses[0];
        if (!first) return;
        const periods =
          perSlot * Math.max(0, g.periodsPerWeek) * (g.periodSize === 2 ? 2 : 1) * (g.pooled ? 1 : memberClasses.length);
        const subjectNames = g.options
          .filter((o) => o.teacherId === t.id)
          .map((o) => subjects.find((s) => s.id === o.subjectId)?.name || "Subject")
          .join(", ");
        assignedClasses.push({
          className: first.className,
          section: memberClasses.map((m) => m.section).join("+"),
          label: `${first.className}-${memberClasses.map((m) => m.section).join("+")}`,
          subject: `${subjectNames} (${g.name})`,
          periods,
        });
        totalAssignedPeriods += periods;
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
  }, [teachers, classes, assignments, subjects, groups]);

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

  // 6. Direct Matrix statistics per teacher (unique classes count and total assigned periods in matrix)
  const teacherMatrixStats = useMemo(() => {
    const map = new Map<string, { uniqueClasses: Set<string>; totalPeriods: number }>();
    classMatrixRows.forEach((row) => {
      Object.values(row.cells).forEach((cell) => {
        cell.teachers.forEach((t) => {
          if (!map.has(t.teacherId)) {
            map.set(t.teacherId, { uniqueClasses: new Set(), totalPeriods: 0 });
          }
          const entry = map.get(t.teacherId)!;
          entry.uniqueClasses.add(row.label);
          entry.totalPeriods += t.periods;
        });
      });
    });
    return map;
  }, [classMatrixRows]);

  // Resolved Selected Teacher Object
  const selectedTeacherObj = useMemo(() => {
    if (!filterTeacher || filterTeacher === "all") return null;
    return (
      teacherLoadRows.find(
        (t) =>
          t.teacherId === filterTeacher ||
          t.teacherCode.toUpperCase() === filterTeacher.toUpperCase() ||
          t.shortName.toUpperCase() === filterTeacher.toUpperCase()
      ) || null
    );
  }, [filterTeacher, teacherLoadRows]);

  // Filtered views
  const filteredClassMatrix = useMemo(() => {
    return classMatrixRows.filter((row) => {
      if (filterClass !== "all" && row.className !== filterClass) return false;
      if (issuesOnly && !row.hasIssues) return false;
      if (selectedTeacherObj) {
        const hasTeacherAssignment = Object.values(row.cells).some((cell) =>
          cell.teachers.some(
            (t) =>
              t.teacherId === selectedTeacherObj.teacherId ||
              t.teacherCode.toUpperCase() === selectedTeacherObj.teacherCode.toUpperCase()
          )
        );
        if (!hasTeacherAssignment) return false;
      }
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
  }, [classMatrixRows, filterClass, issuesOnly, searchQuery, selectedTeacherObj]);

  const filteredTeacherLoads = useMemo(() => {
    return teacherLoadRows.filter((row) => {
      if (
        selectedTeacherObj &&
        row.teacherId !== selectedTeacherObj.teacherId &&
        row.teacherCode.toUpperCase() !== selectedTeacherObj.teacherCode.toUpperCase()
      ) {
        return false;
      }
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
  }, [teacherLoadRows, selectedTeacherObj, issuesOnly, searchQuery]);

  // Grand Total Periods currently showing in the filtered matrix table
  const grandTotalShowingPeriods = useMemo(() => {
    if (!selectedTeacherObj) {
      return filteredClassMatrix.reduce((sum, r) => sum + r.totalClassAssigned, 0);
    }
    return filteredClassMatrix.reduce((sum, r) => {
      return (
        sum +
        Object.values(r.cells).reduce((cSum, cell) => {
          const matching = cell.teachers.filter(
            (t) =>
              t.teacherId === selectedTeacherObj.teacherId ||
              t.teacherCode.toUpperCase() === selectedTeacherObj.teacherCode.toUpperCase()
          );
          return cSum + matching.reduce((p, t) => p + t.periods, 0);
        }, 0)
      );
    }, 0);
  }, [filteredClassMatrix, selectedTeacherObj]);

  const uniqueClassNames = useMemo(() => {
    return Array.from(new Set(classes.map((c) => c.className))).sort(
      (a, b) => getClassNumericRank(a) - getClassNumericRank(b)
    );
  }, [classes]);

  return {
    distinctSubjectNames,
    filterClass,
    filterTeacher,
    filteredClassMatrix,
    filteredTeacherLoads,
    grandTotalDemand,
    grandTotalShowingPeriods,
    grandTotalTeacherLoad,
    isSystemBalanced,
    issuesOnly,
    searchQuery,
    selectedTeacherObj,
    setFilterClass,
    setFilterTeacher,
    setIssuesOnly,
    setSearchQuery,
    teacherLoadRows,
    teacherMatrixStats,
    teachers,
    totalMissingPeriods,
    totalOverloadedTeachers,
    uniqueClassNames,
  };
}

export type AllotmentOverviewState = ReturnType<typeof useRoutineAllotmentOverview>;
