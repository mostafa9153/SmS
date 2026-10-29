"use client";

import type { RoutineDemandAllotmentTabProps } from "./props";
import React, { useState, useMemo } from "react";
import { RoutineClass, RoutineSubject } from "@/lib/routine/types";
import { getClassNumericRank, getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { isHsClass, normalizeSubjectName, detectSubjectStream, getConfiguredStreamsForClass, calculateClassWeeklyCapacity, parseSectionAndStream, HS_STREAM_PRESETS, getTeacherSubjectPeriod, isTeacherAssignedToSubject, getEffectiveClassSubjects } from "@/lib/routine/routine-helpers";
import { getClassGroupAllotments } from "@/lib/routine/routine-groups";
import { getSchoolConfiguredStreams } from "@/lib/utils/school-profile";
import { ClassAllotmentRow } from "@/components/routine/demand-allotment/types";

export function useRoutineDemandAllotment({
  classes,
  subjects,
  teachers,
  assignments,
  settings,
  groups = [],
}: RoutineDemandAllotmentTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClass, setFilterClassState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const c = urlParams.get("demandClass");
        if (c) return c;
        const saved = localStorage.getItem("sms_routine_demand_class");
        if (saved) return saved;
      } catch {}
    }
    return "all";
  });

  const setFilterClass = (c: string) => {
    setFilterClassState(c);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_routine_demand_class", c);
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set("demandClass", c);
      window.history.replaceState(null, "", url.toString());
    }
  };
  const [filterStream, setFilterStream] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedClassIds, setExpandedClassIds] = useState<Record<string, boolean>>({});

  const configuredSchoolStreams = useMemo(() => getSchoolConfiguredStreams(), []);
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

    // Group rows: each group is one line, its slot cost counted once, teachers from the group options
    const groupRowsFor = (cls: RoutineClass, stream?: string | null) => {
      const allots = getClassGroupAllotments(cls.id, groups, subjects, teachers).filter(
        (a) => !a.group.stream || !stream || a.group.stream.toLowerCase() === stream.toLowerCase()
      );
      const items: ClassAllotmentRow["subjectList"] = allots.map((a) => ({
        id: `group:${a.group.id}`,
        name: `${a.group.name} (${a.options.map((o) => o.subjectName.replace(/\s*\([^)]*\)/g, "")).join(" / ")})`,
        stream: null,
        isCommon: false,
        periods: a.periods,
        assignedTeacher: a.options
          .map((o) => o.teacher?.shortName || o.teacher?.name || "—")
          .join(", "),
        assignedTeachers: a.options
          .filter((o) => o.teacher)
          .map((o) => ({
            teacherId: o.teacher!.id,
            name: o.teacher!.name,
            shortName: o.teacher!.shortName,
            periods: a.periods,
          })),
        assignedPeriods: a.complete ? a.periods : 0,
      }));
      return { items, cost: allots.reduce((n, a) => n + a.periods, 0) };
    };

    sortedClasses.forEach((cls) => {
      const isHs = isHsClass(cls.className);
      const weeklyCapacity = calculateClassWeeklyCapacity(cls, settings);
      const clsLower = cls.className.toLowerCase();

      // Matching assignments for this specific class
      const classAssignments = assignments.filter((a) => a.classId === cls.id);

      if (isHs) {
        // For HS classes, check if section is already a stream or analyze configured streams
        const configuredStreams = getConfiguredStreamsForClass(cls.className);
        const { stream: parsedStream } = parseSectionAndStream(cls.section || "");
        const sectionLower = (cls.section || "").toLowerCase();

        // Check if section explicitly matches or specifies a stream
        let matchedStream: "Science" | "Commerce" | "Arts" | null = null;

        if (parsedStream && parsedStream.toLowerCase() !== "general" && parsedStream.toLowerCase() !== "all") {
          const found = configuredStreams.find(
            (st) => st.toLowerCase() === parsedStream.toLowerCase()
          );
          if (found) matchedStream = found;
        }

        if (!matchedStream) {
          for (const st of configuredStreams) {
            const stLower = st.toLowerCase();
            if (
              sectionLower === stLower ||
              sectionLower.includes(`(${stLower})`) ||
              sectionLower.includes(`-${stLower}`) ||
              sectionLower.includes(` ${stLower}`) ||
              sectionLower.includes(stLower)
            ) {
              matchedStream = st;
              break;
            }
          }
        }

        const streamsToProcess = matchedStream
          ? [matchedStream]
          : configuredStreams;

        const effSubjects = getEffectiveClassSubjects(cls, subjects, groups);
        const explicitClassSubs = effSubjects.filter(
          (s) => s.className && s.className.toLowerCase() === clsLower
        );
        const hasExplicitSubs = explicitClassSubs.length > 0;

        streamsToProcess.forEach((st) => {
          // Subjects for this stream = Common subjects + Stream-specific subjects
          const candidates = hasExplicitSubs ? explicitClassSubs : effSubjects;
          const streamSubs = candidates.filter((s) => {
            if (s.className && s.className.toLowerCase() !== clsLower) {
              return false;
            }
            const detStream = detectSubjectStream(s.name, s.stream);
            const isStreamMatch = detStream === "Common" || s.isCommon || detStream === st;
            if (!isStreamMatch) return false;

            if (hasExplicitSubs) {
              return Boolean(s.className && s.className.toLowerCase() === clsLower);
            }
            // If className not tagged and class has no configured subjects, only match official HS presets
            const hsPresetSubs = [
              ...HS_STREAM_PRESETS.Common,
              ...(HS_STREAM_PRESETS[st] || []),
            ].map((p) => p.toLowerCase());
            return hsPresetSubs.includes(s.name.trim().toLowerCase());
          });

          // Strict deduplication by canonical name + stream
          const dedupedStreamSubs: RoutineSubject[] = [];
          const seenHs = new Set<string>();
          for (const s of streamSubs) {
            const cName = normalizeSubjectName(s.name);
            const streamKey = (s.stream || detectSubjectStream(s.name) || "Common").toLowerCase();
            const key = `${cName}::${streamKey}`;
            if (!seenHs.has(key)) {
              seenHs.add(key);
              dedupedStreamSubs.push(s);
            }
          }

          const groupInfo = groupRowsFor(cls, st);
          const demand =
            dedupedStreamSubs.reduce(
              (sum, s) => sum + (s.periodsPerWeek || (s.isLab ? 2 : 5)),
              0
            ) + groupInfo.cost;

          const plainSubjectList = dedupedStreamSubs.map((s) => {
            const defaultPeriods = s.periodsPerWeek || (s.isLab ? 2 : 5);
            const directAsgs = classAssignments.filter((a) => a.subjectId === s.id);

            const teacherItems: { teacherId: string; name: string; shortName?: string; periods: number }[] = [];
            let totalAssignedPeriods = 0;

            if (directAsgs.length > 0) {
              directAsgs.forEach((asg) => {
                const tch = teacherMap.get(asg.teacherId);
                teacherItems.push({
                  teacherId: asg.teacherId,
                  name: tch ? tch.name : "Unknown",
                  shortName: tch?.shortName,
                  periods: asg.periodsPerWeek,
                });
                totalAssignedPeriods += asg.periodsPerWeek;
              });
            } else {
              // Fallback to configured teacher profiles
              teachers.forEach((t) => {
                if (isTeacherAssignedToSubject(t, cls.className, cls.section, s.name)) {
                  const numericP = getTeacherSubjectPeriod(
                    t,
                    cls.className,
                    cls.section,
                    s.name,
                    defaultPeriods
                  );
                  teacherItems.push({
                    teacherId: t.id,
                    name: t.name,
                    shortName: t.shortName,
                    periods: numericP,
                  });
                  totalAssignedPeriods += numericP;
                }
              });
            }

            const assignedTeacherLabel =
              teacherItems.length === 0
                ? null
                : teacherItems.length === 1
                ? teacherItems[0].name
                : teacherItems.map((item) => `${item.shortName || item.name} (${item.periods}p)`).join(", ");

            return {
              id: s.id,
              name: s.name,
              stream: s.stream || detectSubjectStream(s.name),
              isCommon: s.isCommon,
              periods: defaultPeriods,
              assignedTeacher: assignedTeacherLabel,
              assignedTeachers: teacherItems,
              assignedPeriods: totalAssignedPeriods,
            };
          });

          const subjectList = [...plainSubjectList, ...groupInfo.items];
          const assigned = subjectList.reduce((sum, item) => sum + item.assignedPeriods, 0);

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
            subjectsCount: dedupedStreamSubs.length + groupInfo.items.length,
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
        const effSubjects = getEffectiveClassSubjects(cls, subjects, groups);
        const explicitClassSubs = effSubjects.filter(
          (s) => s.className && s.className.toLowerCase() === clsLower
        );
        const hasExplicitSubs = explicitClassSubs.length > 0;

        const presets = new Set(
          getDatabaseSubjectsForClass(cls.className).map((sub: string) => sub.trim().toLowerCase())
        );

        const candidates = hasExplicitSubs ? explicitClassSubs : effSubjects;
        const classSubs = candidates.filter((s) => {
          if (s.className && s.className.toLowerCase() !== clsLower) {
            return false;
          }
          if (hasExplicitSubs) {
            return Boolean(s.className && s.className.toLowerCase() === clsLower);
          }
          // If untagged and no explicit subs exist, only include if subject is part of this class's curriculum
          return presets.has(s.name.trim().toLowerCase());
        });

        // Strict deduplication by canonical name
        const dedupedSubs: RoutineSubject[] = [];
        const seen = new Set<string>();
        for (const s of classSubs) {
          const cName = normalizeSubjectName(s.name);
          if (!seen.has(cName)) {
            seen.add(cName);
            dedupedSubs.push(s);
          }
        }

        const groupInfo = groupRowsFor(cls);
        const demand =
          dedupedSubs.reduce(
            (sum, s) => sum + (s.periodsPerWeek || (s.isLab ? 2 : 5)),
            0
          ) + groupInfo.cost;

        const plainSubjectList = dedupedSubs.map((s) => {
          const defaultPeriods = s.periodsPerWeek || (s.isLab ? 2 : 5);
          const directAsgs = classAssignments.filter((a) => a.subjectId === s.id);

          const teacherItems: { teacherId: string; name: string; shortName?: string; periods: number }[] = [];
          let totalAssignedPeriods = 0;

          if (directAsgs.length > 0) {
            directAsgs.forEach((asg) => {
              const tch = teacherMap.get(asg.teacherId);
              teacherItems.push({
                teacherId: asg.teacherId,
                name: tch ? tch.name : "Unknown",
                shortName: tch?.shortName,
                periods: asg.periodsPerWeek,
              });
              totalAssignedPeriods += asg.periodsPerWeek;
            });
          } else {
            // Fallback to configured teacher profiles
            teachers.forEach((t) => {
              if (isTeacherAssignedToSubject(t, cls.className, cls.section, s.name)) {
                const numericP = getTeacherSubjectPeriod(
                  t,
                  cls.className,
                  cls.section,
                  s.name,
                  defaultPeriods
                );
                teacherItems.push({
                  teacherId: t.id,
                  name: t.name,
                  shortName: t.shortName,
                  periods: numericP,
                });
                totalAssignedPeriods += numericP;
              }
            });
          }

          const assignedTeacherLabel =
            teacherItems.length === 0
              ? null
              : teacherItems.length === 1
              ? teacherItems[0].name
              : teacherItems.map((item) => `${item.shortName || item.name} (${item.periods}p)`).join(", ");

          return {
            id: s.id,
            name: s.name,
            stream: null,
            isCommon: false,
            periods: defaultPeriods,
            assignedTeacher: assignedTeacherLabel,
            assignedTeachers: teacherItems,
            assignedPeriods: totalAssignedPeriods,
          };
        });

        const subjectList = [...plainSubjectList, ...groupInfo.items];
        const assigned = subjectList.reduce((sum, item) => sum + item.assignedPeriods, 0);

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
          subjectsCount: dedupedSubs.length + groupInfo.items.length,
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
  }, [classes, subjects, teachers, assignments, settings, teacherMap, groups]);

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

  return {
    allotmentRows,
    collapseAll,
    configuredSchoolStreams,
    distinctClassNames,
    expandAll,
    expandedClassIds,
    filterClass,
    filterStatus,
    filterStream,
    filteredRows,
    grandTotals,
    searchQuery,
    setFilterClass,
    setFilterStatus,
    setFilterStream,
    setSearchQuery,
    toggleExpand,
  };
}

export type DemandAllotmentState = ReturnType<typeof useRoutineDemandAllotment>;
