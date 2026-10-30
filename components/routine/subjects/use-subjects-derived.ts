"use client";

import { useMemo } from "react";
import { RoutineSubject, RoutineSubjectGroup } from "@/lib/routine/types";
import { getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { HS_STREAM_PRESETS, detectSubjectStream, isHsClass, calculateTotalSchoolSectionDemand, groupSlotPeriods, groupExtraPeriods, calculateSchoolGroupDemand } from "@/lib/routine/routine-helpers";
import { subjectDedupeKey, dedupeSubjects, sectionLoad } from "@/lib/routine/routine-domain";
import type { SubjectsCoreState } from "./use-subjects-core";

export function useSubjectsDerived(ctx: SubjectsCoreState) {
  const { activeClass, availableClasses, classes, configuredStreamsForActive, groups, isCurrentClassHs, localOrder, marksSchemeVersion, selectedStream, subjects } = ctx;
  // Preset subjects for the currently active class and stream (filtered strictly by configured streams & presets)
  const activeClassPresets = useMemo(() => {
    if (isCurrentClassHs) {
      const dbSubs = getDatabaseSubjectsForClass(activeClass);
      let streamPresets: string[] = [];
      if (selectedStream === "Common") streamPresets = HS_STREAM_PRESETS.Common;
      else if (selectedStream === "Science") streamPresets = configuredStreamsForActive.includes("Science") ? HS_STREAM_PRESETS.Science : [];
      else if (selectedStream === "Commerce") streamPresets = configuredStreamsForActive.includes("Commerce") ? HS_STREAM_PRESETS.Commerce : [];
      else if (selectedStream === "Arts") streamPresets = configuredStreamsForActive.includes("Arts") ? HS_STREAM_PRESETS.Arts : [];
      else {
        // All Streams: show Common + ONLY the configured streams presets
        const combined: string[] = [...HS_STREAM_PRESETS.Common];
        if (configuredStreamsForActive.includes("Science")) {
          combined.push(...HS_STREAM_PRESETS.Science);
        }
        if (configuredStreamsForActive.includes("Commerce")) {
          combined.push(...HS_STREAM_PRESETS.Commerce);
        }
        if (configuredStreamsForActive.includes("Arts")) {
          combined.push(...HS_STREAM_PRESETS.Arts);
        }
        streamPresets = combined;
      }
      return Array.from(new Set([...dbSubs, ...streamPresets]));
    }
    return getDatabaseSubjectsForClass(activeClass);
  }, [activeClass, isCurrentClassHs, selectedStream, configuredStreamsForActive, marksSchemeVersion]);


  // Filtered subjects for the active class view & stream (Strictly Deduplicated)
  const currentClassSubjects = useMemo(() => {
    const clsLower = activeClass.toLowerCase();
    const presets = new Set(getDatabaseSubjectsForClass(activeClass).map((sub) => sub.toLowerCase()));
    let list = subjects.filter(
      (s) =>
        (s.className && s.className.toLowerCase() === clsLower) ||
        (!s.className && presets.has(s.name.toLowerCase()))
    );

    if (isCurrentClassHs && selectedStream !== "all") {
      list = list.filter((s) => {
        const stream = detectSubjectStream(s.name, s.stream);
        if (selectedStream === "Common") return stream === "Common" || s.isCommon;
        return stream === selectedStream || stream === "Common" || s.isCommon;
      });
    }

    // Strict deduplication by subject name + stream to guarantee zero duplicate rows
    const seen = new Map<string, RoutineSubject>();
    for (const s of list) {
      const key = subjectDedupeKey(s, isCurrentClassHs);
      if (!seen.has(key)) {
        seen.set(key, s);
      }
    }

    const deduped = Array.from(seen.values());

    // Apply local drag order if present for this class/stream key
    const orderKey = `${activeClass}::${selectedStream}`;
    const order = localOrder[orderKey] || (selectedStream !== "all" ? localOrder[`${activeClass}::all`] : undefined);
    if (order && order.length > 0) {
      const remaining = [...deduped];
      const ordered: RoutineSubject[] = [];
      for (const token of order) {
        const idx = remaining.findIndex(
          (s) =>
            s.id === token ||
            s.name.trim().toLowerCase() === token.trim().toLowerCase()
        );
        if (idx !== -1) {
          ordered.push(remaining[idx]);
          remaining.splice(idx, 1);
        }
      }
      return [...ordered, ...remaining];
    }

    // Fall back to sortOrder field if present
    return deduped.sort((a, b) => {
      const ao = a.sortOrder ?? 9999;
      const bo = b.sortOrder ?? 9999;
      return ao - bo;
    });
  }, [subjects, activeClass, isCurrentClassHs, selectedStream, localOrder]);

  // Groups touching the active class, with their member subjects collapsed into one row
  const classGroups = useMemo(() => {
    const clsLower = activeClass.trim().toLowerCase();
    const sectionClass = new Map(classes.map((c) => [c.id, c.className.trim().toLowerCase()]));
    return groups
      .filter((g) =>
        g.scope === "class"
          ? (g.className || "").trim().toLowerCase() === clsLower
          : g.sectionIds.some((id) => sectionClass.get(id) === clsLower)
      )
      .map((g) => ({
        group: g,
        members: g.options
          .map((o) => subjects.find((s) => s.id === o.subjectId))
          .filter(Boolean) as RoutineSubject[],
      }))
      .filter((x) => x.members.length > 0);
  }, [groups, classes, subjects, activeClass]);

  const displayRows = useMemo(() => {
    const memberToGroup = new Map<string, number>();
    classGroups.forEach((x, i) => x.members.forEach((m) => memberToGroup.set(m.id, i)));
    const emitted = new Set<number>();
    const rows: (
      | { type: "subject"; subject: RoutineSubject }
      | { type: "group"; group: RoutineSubjectGroup; members: RoutineSubject[] }
    )[] = [];
    for (const s of currentClassSubjects) {
      const gi = memberToGroup.get(s.id);
      if (gi === undefined) {
        rows.push({ type: "subject", subject: s });
      } else if (!emitted.has(gi)) {
        emitted.add(gi);
        rows.push({ type: "group", group: classGroups[gi].group, members: classGroups[gi].members });
      }
    }
    classGroups.forEach((x, gi) => {
      if (!emitted.has(gi)) rows.push({ type: "group", group: x.group, members: x.members });
    });
    return rows;
  }, [currentClassSubjects, classGroups]);

  // Per-section weekly load: each group counts once
  const currentClassTotalPeriods = useMemo(
    () =>
      sectionLoad(
        currentClassSubjects,
        classGroups.map((x) => ({
          memberIds: x.members.map((m) => m.id),
          periods: groupSlotPeriods(x.group) + groupExtraPeriods(x.group),
        }))
      ),
    [currentClassSubjects, classGroups]
  );

  // Group share of the section load: slots count against capacity, extra option periods are the
  // rest to assign. The remainder is ordinary subjects.
  const currentClassGroupSlots = useMemo(
    () => classGroups.reduce((sum, x) => sum + groupSlotPeriods(x.group), 0),
    [classGroups]
  );
  const currentClassGroupExtra = useMemo(
    () => classGroups.reduce((sum, x) => sum + groupExtraPeriods(x.group), 0),
    [classGroups]
  );
  const currentClassOrdinaryPeriods =
    currentClassTotalPeriods - currentClassGroupSlots - currentClassGroupExtra;

  // Number of configured subjects per class (Strictly deduplicated)
  const classSubjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      const clsLower = cls.toLowerCase();
      const clsSubs = subjects.filter((s) => s.className && s.className.toLowerCase() === clsLower);
      counts[clsLower] = dedupeSubjects(clsSubs, isHsClass(cls)).length;
    });
    const result: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      result[cls] = counts[cls.toLowerCase()] || 0;
    });
    return result;
  }, [subjects, availableClasses]);



  // Total weekly periods across ALL classes and sections combined (True School-wide Period Demand)
  const totalSchoolSectionDemand = useMemo(
    () => calculateTotalSchoolSectionDemand(classes || [], subjects, groups),
    [classes, subjects, groups]
  );
  const totalSchoolGroupDemand = useMemo(() => calculateSchoolGroupDemand(groups), [groups]);
  const totalSchoolOrdinaryDemand =
    totalSchoolSectionDemand - totalSchoolGroupDemand.slots - totalSchoolGroupDemand.extra;

  // Specific class sections and their combined period load
  const activeClassSections = useMemo(() => {
    if (!classes) return [];
    return classes.filter(
      (c) => c.className.trim().toLowerCase() === activeClass.trim().toLowerCase()
    );
  }, [classes, activeClass]);

  const activeClassSectionsTotalPeriods = useMemo(() => {
    return activeClassSections.length * currentClassTotalPeriods;
  }, [activeClassSections, currentClassTotalPeriods]);


  return {
    activeClassPresets,
    activeClassSections,
    activeClassSectionsTotalPeriods,
    classGroups,
    classSubjectCounts,
    currentClassGroupExtra,
    currentClassGroupSlots,
    currentClassOrdinaryPeriods,
    currentClassSubjects,
    currentClassTotalPeriods,
    displayRows,
    totalSchoolGroupDemand,
    totalSchoolOrdinaryDemand,
    totalSchoolSectionDemand,
  };
}

export type SubjectsDerivedState = ReturnType<typeof useSubjectsDerived>;
