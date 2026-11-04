"use client";

import { useEffect, useMemo, useCallback } from "react";
import { RoutineClass } from "@/lib/routine/types";
import { groupSlotCost } from "@/lib/routine/routine-groups";
import { generateInitials, isHsClass, optionShares, packShares, parseSectionAndStream } from "@/lib/routine/routine-helpers";
import type { RoutineSubjectGroup } from "@/lib/routine/types";
import type { TeachersCoreState } from "./use-teachers-core";

export function useTeachersAllocation(ctx: TeachersCoreState) {
  const { classSectionsMap, classSubjectsMap, classes, editingTeacherId, getClassSections, getSubjectDefaultPeriod, groupMemberNamesByClass, groupPicks, groups, groupsForClass, isEditorOpen, onSaveGroup, sectionAcceptsSubject, sectionSubjectsMap, setGroupPicks, shortName, subjectPeriodsMap, subjectStreamOf, subjects, teacherName, teachers } = ctx;
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

      // 2. Sections to check (if sec === "ALL", inspect the configured sections that offer the subject)
      const allSecs = getClassSections(clsName);
      const targetSecs = (sec === "ALL" ? (classSectionsMap[clsName] ?? [allSecs[0] || "A"]) : [sec]).filter((s) =>
        sectionAcceptsSubject(clsName, s, subName)
      );
      // A Common XI / XII subject is taught to all stream sections of a letter at once, so a teacher
      // given it in any of them covers the whole letter
      const isCommonHs = isHsClass(clsName) && subjectStreamOf(clsName, subName) === "Common";
      const letterOf = (s: string) => parseSectionAndStream(s).section.toLowerCase();
      const units: string[][] = isCommonHs
        ? Array.from(new Set(targetSecs.map(letterOf))).map((l) => allSecs.filter((s) => letterOf(s) === l))
        : targetSecs.map((s) => [s]);

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
          const periodsIn = (s: string): number => {
            const allowedSecs = t.classSections?.[clsName];
            if (allowedSecs !== undefined && Array.isArray(allowedSecs)) {
              const isAllowed = allowedSecs.some(
                (sec) => sec.trim().toLowerCase() === "all" || sec.trim().toLowerCase() === s.toLowerCase()
              );
              if (!isAllowed) {
                return 0;
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
              return Number(specificPeriod) || getSubjectDefaultPeriod(clsName, subName);
            }
            return 0;
          };

          const tPeriodsForSec = units.reduce((sum, u) => sum + Math.max(0, ...u.map(periodsIn)), 0);
          const avgPeriods = units.length > 0 ? Math.round(tPeriodsForSec / units.length) : tPeriodsForSec;

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
      sectionAcceptsSubject,
      subjectStreamOf,
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
    const picks = new Map<string, number>();
    if (editingTeacherId) {
      for (const g of groups) {
        for (const o of g.options) {
          const mine = optionShares(o, g).find((s) => s.teacherId === editingTeacherId);
          if (mine) picks.set(o.id, mine.periods);
        }
      }
    }
    setGroupPicks(picks);
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
          // A double-period group cannot be split between teachers
          shareable: g.periodSize === 1,
          scopeLabel: g.scope === "class" ? "All Sections" : `${g.sectionIds.length} sections`,
          options: g.options.map((o) => {
            const picked = groupPicks.has(o.id);
            // Other teachers' parts of this subject, like the Full (AG: 2p, DK: 2p) note on a subject
            const others = optionShares(o, g)
              .filter((s) => s.teacherId !== editingTeacherId)
              .map((s) => {
                const t = teachers.find((x) => x.id === s.teacherId);
                return { name: t ? t.shortName || t.name : "?", periods: s.periods };
              });
            const othersPeriods = others.reduce((n, s) => n + s.periods, 0);
            const remaining = Math.max(0, g.periodsPerWeek - othersPeriods);
            // A teacher runs one subject of a group at a time
            const siblingPicked = !picked && g.options.some((x) => x.id !== o.id && groupPicks.has(x.id));
            return {
              id: o.id,
              subject: subjectName.get(o.subjectId) || "Subject",
              picked,
              myPeriods: picked ? groupPicks.get(o.id) || 0 : 0,
              others,
              remaining,
              takenBy: others.length ? others.map((s) => `${s.name}: ${s.periods}p`).join(", ") : null,
              blocked: siblingPicked || (!picked && (remaining <= 0 || (g.periodSize !== 1 && others.length > 0))),
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
        .reduce((sum, g) => sum + myGroupCells(g, groupPicks) / Math.max(1, g.sectionIds.length), 0);
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
        for (const s of optionShares(o, g)) {
          const periods = s.periods * (g.periodSize === 2 ? 2 : 1) * (g.pooled ? 1 : members.length);
          (map[s.teacherId] ||= []).push({
            key: `${o.id}:${s.teacherId}`,
            className,
            label: `${subjectName.get(o.subjectId) || "Subject"} · Sec ${secs} · ${periods}p`,
          });
        }
      }
    }
    return map;
  }, [groups, classes, subjects]);

  // Picking a subject takes what the other teachers left (all of it when nobody has it)
  const toggleGroupOption = useCallback(
    (optionId: string) => {
      setGroupPicks((prev) => {
        const next = new Map(prev);
        if (next.has(optionId)) {
          next.delete(optionId);
          return next;
        }
        const g = groups.find((x) => x.options.some((o) => o.id === optionId));
        const o = g?.options.find((x) => x.id === optionId);
        if (!g || !o) return prev;
        const others = optionShares(o, g)
          .filter((s) => s.teacherId !== editingTeacherId)
          .reduce((n, s) => n + s.periods, 0);
        next.set(optionId, g.periodSize === 1 ? Math.max(1, g.periodsPerWeek - others) : g.periodsPerWeek);
        return next;
      });
    },
    [groups, editingTeacherId]
  );

  // This teacher's periods of a picked group subject (1 .. the periods the others left)
  const setGroupOptionPeriods = useCallback((optionId: string, value: string) => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 1) return;
    setGroupPicks((prev) => (prev.has(optionId) ? new Map(prev).set(optionId, n) : prev));
  }, []);

  // Teacher's group load for a class, each group counted once (pooled) or per section (non-pooled)
  const getClassGroupLoad = useCallback(
    (clsName: string): number => groupsForClass(clsName).reduce((sum, g) => sum + myGroupCells(g, groupPicks), 0),
    [groupPicks, groupsForClass]
  );

  // Write the picks into the groups: this teacher's part of each subject is set or released, the
  // other teachers' parts stay as they are (a part beyond what is left is cut to fit)
  const applyGroupPicks = async (teacherId: string, classNames: string[]) => {
    if (!onSaveGroup) return;
    const reachable = new Set(classNames.flatMap((n) => groupsForClass(n).map((g) => g.id)));
    for (const g of groups) {
      let changed = false;
      const options = g.options.map((o) => {
        const current = optionShares(o, g);
        const others = current.filter((s) => s.teacherId !== teacherId);
        const want = reachable.has(g.id) && groupPicks.has(o.id);
        let next = others;
        if (want) {
          if (g.periodSize !== 1) {
            next = [{ teacherId, periods: g.periodsPerWeek }];
          } else {
            const left = Math.max(0, g.periodsPerWeek - others.reduce((n, s) => n + s.periods, 0));
            const mine = Math.min(groupPicks.get(o.id) || left, left);
            next = mine > 0 ? [...others, { teacherId, periods: mine }] : others;
          }
        }
        const same =
          next.length === current.length &&
          next.every((s, i) => s.teacherId === current[i].teacherId && s.periods === current[i].periods);
        if (same) return o;
        changed = true;
        return { ...o, ...packShares(next, g.periodsPerWeek) };
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
    setGroupOptionPeriods,
    toggleGroupOption,
  };
}

/** Cells a teacher's picks take in a group: their periods of each picked subject, per section when section-wise. */
function myGroupCells(g: RoutineSubjectGroup, picks: Map<string, number>): number {
  const size = g.periodSize === 2 ? 2 : 1;
  const mul = g.pooled ? 1 : Math.max(1, g.sectionIds.length);
  return g.options.reduce((n, o) => n + (picks.has(o.id) ? Math.min(picks.get(o.id) || 0, g.periodsPerWeek) : 0), 0) * size * mul;
}

export type TeachersAllocationState = ReturnType<typeof useTeachersAllocation>;
