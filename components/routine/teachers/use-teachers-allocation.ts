"use client";

import { useEffect, useMemo, useCallback } from "react";
import { RoutineClass } from "@/lib/routine/types";
import { groupSlotCost } from "@/lib/routine/routine-groups";
import { generateInitials } from "@/lib/routine/routine-helpers";
import type { TeachersCoreState } from "./use-teachers-core";

export function useTeachersAllocation(ctx: TeachersCoreState) {
  const { classSectionsMap, classSubjectsMap, classes, editingTeacherId, getClassSections, getSubjectDefaultPeriod, groupMemberNamesByClass, groupPicks, groups, groupsForClass, isEditorOpen, onSaveGroup, sectionSubjectsMap, setGroupPicks, shortName, subjectPeriodsMap, subjects, teacherName, teachers } = ctx;
  // Helper to get active subjects for a specific section (or ALL)
  const getRawSectionSubjects = useCallback(
    (clsName: string, sec: string): string[] => {
      if (sec === "ALL") {
        const allSecs = getClassSections(clsName);
        const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];
        if (selectedSecs.length === 0) return [];
        const union = new Set<string>();
        selectedSecs.forEach((s) => {
          const direct =
            sectionSubjectsMap[`${clsName}::${s}`] ??
            sectionSubjectsMap[`${clsName}-${s}`] ??
            sectionSubjectsMap[`${clsName}_${s}`];
          if (direct !== undefined) {
            direct.forEach((sub) => union.add(sub));
          }
        });
        return Array.from(union);
      }
      const secKey = `${clsName}::${sec}`;
      const direct =
        sectionSubjectsMap[secKey] ??
        sectionSubjectsMap[`${clsName}-${sec}`] ??
        sectionSubjectsMap[`${clsName}_${sec}`];
      if (direct !== undefined) {
        return direct;
      }
      const hasAnySecConfig = Object.keys(sectionSubjectsMap).some(
        (k) => k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`) || k.startsWith(`${clsName}_`)
      );
      if (hasAnySecConfig) {
        return [];
      }

      const allowedSecs = classSectionsMap[clsName];
      if (allowedSecs !== undefined && !allowedSecs.includes(sec)) {
        return [];
      }

      return classSubjectsMap[clsName] || [];
    },
    [sectionSubjectsMap, classSubjectsMap, classSectionsMap, getClassSections]
  );

  // Group member subjects are owned by the group; drop any stale plain selections of them
  const getSectionSubjects = useCallback(
    (clsName: string, sec: string): string[] => {
      const raw = getRawSectionSubjects(clsName, sec);
      const members = groupMemberNamesByClass[clsName];
      if (!members || members.size === 0) return raw;
      return raw.filter((s) => !members.has(s.trim().toLowerCase()));
    },
    [getRawSectionSubjects, groupMemberNamesByClass]
  );

  // Helper to get specific period count for a subject in a section (or ALL)
  const getSubjectPeriod = useCallback(
    (clsName: string, sec: string, subName: string): number => {
      if (sec === "ALL") {
        const allSecs = getClassSections(clsName);
        const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];
        const targetSec = selectedSecs[0] || "A";
        const secKey = `${clsName}::${targetSec}::${subName}`;
        if (subjectPeriodsMap[secKey] !== undefined && subjectPeriodsMap[secKey] > 0) {
          return subjectPeriodsMap[secKey];
        }
        const clsKey = `${clsName}::${subName}`;
        if (subjectPeriodsMap[clsKey] !== undefined && subjectPeriodsMap[clsKey] > 0) {
          return subjectPeriodsMap[clsKey];
        }
        return getSubjectDefaultPeriod(clsName, subName);
      }

      const p =
        subjectPeriodsMap[`${clsName}::${sec}::${subName}`] ??
        subjectPeriodsMap[`${clsName}-${sec}-${subName}`] ??
        subjectPeriodsMap[`${clsName}_${sec}_${subName}`] ??
        subjectPeriodsMap[`${clsName}-${sec}::${subName}`] ??
        subjectPeriodsMap[`${clsName}_${sec}::${subName}`];

      if (p !== undefined && p > 0) {
        return p;
      }

      const clsP =
        subjectPeriodsMap[`${clsName}::${subName}`] ??
        subjectPeriodsMap[`${clsName}-${subName}`] ??
        subjectPeriodsMap[`${clsName}_${subName}`];

      if (clsP !== undefined && clsP > 0) {
        return clsP;
      }

      return getSubjectDefaultPeriod(clsName, subName);
    },
    [subjectPeriodsMap, getSubjectDefaultPeriod, classSectionsMap, getClassSections]
  );

  // Helper to compute live allocation breakdown across other teachers for a given class, section, and subject
  const getSubjectAllocationStats = useCallback(
    (clsName: string, sec: string, subName: string) => {
      const isTheory = subName.includes("(Theory)");
      const isLabVariant = subName.includes("(Lab)") || subName.includes("(Practical)");
      const cleanSubName = subName.replace(/\s*\((Theory|Lab|Practical)\)/i, "").trim().toLowerCase();

      // 1. Total weekly demand from configured subjects (or fallback default 5)
      const matchedSubject = (subjects || []).find(
        (s) =>
          (s.name.trim().toLowerCase() === cleanSubName || s.name.trim().toLowerCase() === subName.trim().toLowerCase()) &&
          (!s.className || s.className.trim().toLowerCase() === clsName.trim().toLowerCase())
      );

      let totalDemand = 5;
      if (matchedSubject) {
        if (isTheory) {
          totalDemand =
            matchedSubject.theoryPeriods && matchedSubject.theoryPeriods > 0
              ? matchedSubject.theoryPeriods
              : matchedSubject.periodsPerWeek
              ? Math.max(1, matchedSubject.periodsPerWeek - (matchedSubject.labPeriods || 2))
              : 4;
        } else if (isLabVariant) {
          totalDemand =
            matchedSubject.labPeriods && matchedSubject.labPeriods > 0
              ? matchedSubject.labPeriods
              : matchedSubject.periodsPerWeek && matchedSubject.isLab
              ? matchedSubject.periodsPerWeek
              : 2;
        } else {
          totalDemand =
            matchedSubject.periodsPerWeek && matchedSubject.periodsPerWeek > 0
              ? matchedSubject.periodsPerWeek
              : 5;
        }
      }

      // 2. Sections to check (if sec === "ALL", inspect all configured sections)
      const allSecs = getClassSections(clsName);
      const targetSecs = sec === "ALL" ? (classSectionsMap[clsName] ?? [allSecs[0] || "A"]) : [sec];

      // 3. Find other teachers who have this subject assigned in these sections
      const otherTeacherLoads: { teacherName: string; shortName: string; periods: number }[] = [];
      let totalOtherAssigned = 0;

      teachers
        .filter(
          (t) =>
            t.id !== editingTeacherId &&
            t.name.trim().toLowerCase() !== teacherName.trim().toLowerCase()
        )
        .forEach((t) => {
          let tPeriodsForSec = 0;
          targetSecs.forEach((s) => {
            const allowedSecs = t.classSections?.[clsName];
            if (allowedSecs !== undefined && Array.isArray(allowedSecs)) {
              const isAllowed = allowedSecs.some(
                (sec) => sec.trim().toLowerCase() === "all" || sec.trim().toLowerCase() === s.toLowerCase()
              );
              if (!isAllowed) {
                return;
              }
            }

            const secKey = `${clsName}::${s}`;
            const altSecKey = `${clsName}-${s}`;
            const altSecKey2 = `${clsName}_${s}`;

            const hasSecConfig = Object.keys(t.sectionSubjects || {}).some(
              (k) =>
                k.startsWith(`${clsName}::`) ||
                k.startsWith(`${clsName}-`) ||
                k.startsWith(`${clsName}_`)
            );

            const hasSecSub =
              (t.sectionSubjects?.[secKey] && t.sectionSubjects[secKey].includes(subName)) ||
              (t.sectionSubjects?.[altSecKey] && t.sectionSubjects[altSecKey].includes(subName)) ||
              (t.sectionSubjects?.[altSecKey2] && t.sectionSubjects[altSecKey2].includes(subName));

            const isAssignedToSec =
              hasSecSub ||
              (!hasSecConfig &&
                allowedSecs === undefined &&
                t.qualifiedClasses?.includes(clsName) &&
                t.classSubjects?.[clsName]?.includes(subName));

            if (isAssignedToSec) {
              const specificPeriod =
                t.subjectPeriods?.[`${clsName}::${s}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}-${s}-${subName}`] ??
                t.subjectPeriods?.[`${clsName}_${s}_${subName}`] ??
                t.subjectPeriods?.[`${clsName}-${s}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}_${s}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}::${subName}`] ??
                t.subjectPeriods?.[`${clsName}-${subName}`] ??
                t.subjectPeriods?.[`${clsName}_${subName}`] ??
                getSubjectDefaultPeriod(clsName, subName);
              tPeriodsForSec += Number(specificPeriod) || getSubjectDefaultPeriod(clsName, subName);
            }
          });

          const avgPeriods =
            targetSecs.length > 0 ? Math.round(tPeriodsForSec / targetSecs.length) : tPeriodsForSec;

          if (avgPeriods > 0) {
            totalOtherAssigned += avgPeriods;
            otherTeacherLoads.push({
              teacherName: t.name,
              shortName: t.shortName || generateInitials(t.name),
              periods: avgPeriods,
            });
          }
        });

      const remaining = Math.max(0, totalDemand - totalOtherAssigned);
      const isFullyBooked = totalOtherAssigned >= totalDemand;

      return {
        totalDemand,
        otherAssigned: totalOtherAssigned,
        remaining,
        isFullyBooked,
        otherTeachers: otherTeacherLoads,
      };
    },
    [
      subjects,
      getClassSections,
      classSectionsMap,
      teachers,
      editingTeacherId,
      teacherName,
      getSubjectDefaultPeriod,
    ]
  );

  // Calculate total weekly periods for a section automatically from its active subjects
  const calculateSectionTotalPeriods = useCallback(
    (clsName: string, sec: string): number => {
      const secSubs = getSectionSubjects(clsName, sec);
      return secSubs.reduce((sum, sub) => sum + getSubjectPeriod(clsName, sec, sub), 0);
    },
    [getSectionSubjects, getSubjectPeriod]
  );

  // Start from what the groups already say; the editor only changes this set until Save
  useEffect(() => {
    setGroupPicks(
      new Set(
        editingTeacherId
          ? groups.flatMap((g) => g.options.filter((o) => o.teacherId === editingTeacherId).map((o) => o.id))
          : []
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTeacherId, isEditorOpen]);

  // Group subjects the teacher can take for a class. Class-wise groups show under "All Sections",
  // section-wise groups under their own sections. The group is the single source of truth.
  const getGroupPickRows = useCallback(
    (clsName: string, sec: string) => {
      const clsLower = clsName.trim().toLowerCase();
      const secId = classes.find(
        (c) =>
          c.className.trim().toLowerCase() === clsLower &&
          c.section.trim().toLowerCase() === sec.trim().toLowerCase()
      )?.id;
      const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
      return groupsForClass(clsName)
        .filter((g) =>
          sec === "ALL" ? g.scope === "class" : g.scope === "section" && !!secId && g.sectionIds.includes(secId)
        )
        .map((g) => ({
          id: g.id,
          name: g.name,
          periods: groupSlotCost(g),
          scopeLabel: g.scope === "class" ? "All Sections" : `${g.sectionIds.length} sections`,
          options: g.options.map((o) => {
            const picked = groupPicks.has(o.id);
            const owner =
              o.teacherId && o.teacherId !== editingTeacherId
                ? teachers.find((t) => t.id === o.teacherId)
                : undefined;
            const siblingPicked = !picked && g.options.some((x) => x.id !== o.id && groupPicks.has(x.id));
            return {
              id: o.id,
              subject: subjectName.get(o.subjectId) || "Subject",
              picked,
              takenBy: owner ? owner.shortName || owner.name : null,
              blocked: Boolean(owner) || siblingPicked,
            };
          }),
        }));
    },
    [classes, subjects, groupsForClass, groupPicks, teachers, editingTeacherId]
  );

  // Load a section-wise group puts on one section: each picked option runs once in that section.
  // Class-wise (pooled) groups are not tied to a section, they only count in the class total.
  const getSectionGroupLoad = useCallback(
    (clsName: string, sec: string): number => {
      if (sec === "ALL") return 0;
      const clsLower = clsName.trim().toLowerCase();
      const secId = classes.find(
        (c) =>
          c.className.trim().toLowerCase() === clsLower &&
          c.section.trim().toLowerCase() === sec.trim().toLowerCase()
      )?.id;
      if (!secId) return 0;
      return groupsForClass(clsName)
        .filter((g) => g.scope === "section" && g.sectionIds.includes(secId))
        .reduce((sum, g) => sum + g.options.filter((o) => groupPicks.has(o.id)).length * groupSlotCost(g), 0);
    },
    [classes, groupsForClass, groupPicks]
  );

  // Group subjects each teacher runs, shown in the list next to their ordinary classes
  const groupChipsByTeacher = useMemo(() => {
    const map: Record<string, { key: string; className: string; label: string }[]> = {};
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
    for (const g of groups) {
      const members = g.sectionIds
        .map((id) => classes.find((c) => c.id === id))
        .filter(Boolean) as RoutineClass[];
      if (members.length === 0) continue;
      const className = members[0].className;
      const secs = members.map((m) => m.section).join(", ");
      for (const o of g.options) {
        if (!o.teacherId) continue;
        const periods = groupSlotCost(g) * (g.pooled ? 1 : members.length);
        (map[o.teacherId] ||= []).push({
          key: o.id,
          className,
          label: `${subjectName.get(o.subjectId) || "Subject"} · Sec ${secs} · ${periods}p`,
        });
      }
    }
    return map;
  }, [groups, classes, subjects]);

  const toggleGroupOption = useCallback((optionId: string) => {
    setGroupPicks((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  }, []);

  // Teacher's group load for a class, each group counted once (pooled) or per section (non-pooled)
  const getClassGroupLoad = useCallback(
    (clsName: string): number =>
      groupsForClass(clsName).reduce((sum, g) => {
        const perSlot = g.options.filter((o) => groupPicks.has(o.id)).length;
        if (perSlot === 0) return sum;
        return sum + perSlot * groupSlotCost(g) * (g.pooled ? 1 : Math.max(1, g.sectionIds.length));
      }, 0),
    [groupPicks, groupsForClass]
  );

  // Write the picks into the groups: picked options get this teacher, released ones are cleared
  const applyGroupPicks = async (teacherId: string, classNames: string[]) => {
    if (!onSaveGroup) return;
    const reachable = new Set(classNames.flatMap((n) => groupsForClass(n).map((g) => g.id)));
    for (const g of groups) {
      let changed = false;
      const options = g.options.map((o) => {
        const want = reachable.has(g.id) && groupPicks.has(o.id);
        if (want && o.teacherId !== teacherId) {
          changed = true;
          return { ...o, teacherId };
        }
        if (!want && o.teacherId === teacherId) {
          changed = true;
          return { ...o, teacherId: "" };
        }
        return o;
      });
      if (changed) await onSaveGroup({ ...g, options });
    }
  };


  return {
    applyGroupPicks,
    calculateSectionTotalPeriods,
    getClassGroupLoad,
    getGroupPickRows,
    getRawSectionSubjects,
    getSectionGroupLoad,
    getSectionSubjects,
    getSubjectAllocationStats,
    getSubjectPeriod,
    groupChipsByTeacher,
    toggleGroupOption,
  };
}

export type TeachersAllocationState = ReturnType<typeof useTeachersAllocation>;
