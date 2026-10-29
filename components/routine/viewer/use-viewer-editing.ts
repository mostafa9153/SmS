"use client";

import { GeneratedRoutine, RoutineGrid } from "@/lib/routine/types";
import { showToast } from "@/components/ui/toast-banner";
import { saveGeneratedRoutineDb } from "@/lib/supabase/db-routine";
import { getCellOptions } from "@/lib/routine/routine-groups";
import type { ViewerCoreState } from "./use-viewer-core";

export function useViewerEditing(ctx: ViewerCoreState) {
  const { classMap, history, routine, setHistory, setRoutine, settings, teacherMap } = ctx;

  const handleCellSwap = async (
    sourceClassId: string,
    sourceDPos: number,
    sourcePPos: number,
    targetClassId: string,
    targetDPos: number,
    targetPPos: number
  ) => {
    if (!routine || !routine.grid) return;
    if (sourceClassId === targetClassId && sourceDPos === targetDPos && sourcePPos === targetPPos) return;

    const sourceClass = classMap.get(sourceClassId);
    const targetClass = classMap.get(targetClassId);
    const sourceCell = routine.grid[sourceClassId]?.[sourceDPos]?.[sourcePPos] || null;
    const targetCell = routine.grid[targetClassId]?.[targetDPos]?.[targetPPos] || null;

    if (!sourceCell && !targetCell) return;

    // Check lab double period boundary
    if (sourceCell?.lab || targetCell?.lab) {
      showToast({
        type: "warning",
        title: "Lab Period Notice",
        description: "Double-period lab blocks cannot be split into a single period slot.",
      });
      return;
    }

    // Group cells span multiple sections; swapping one section out would
    // break the parallel block for the others. Block the swap instead.
    if (sourceCell?.gid || targetCell?.gid) {
      showToast({
        type: "warning",
        title: "Group Cell Locked",
        description: "A parallel group cell can't be moved — all member sections share the same slot.",
      });
      return;
    }

    // Save previous grid for Undo
    setHistory((prev) => [routine.grid, ...prev.slice(0, 9)]);

    // Clone grid immutably
    const newGrid: RoutineGrid = {};
    for (const [cid, days] of Object.entries(routine.grid)) {
      newGrid[cid] = days.map((dayPeriods, d) =>
        d === sourceDPos || d === targetDPos ? [...dayPeriods] : dayPeriods
      );
    }

    if (!newGrid[sourceClassId] || !newGrid[targetClassId]) return;

    // Perform swap (any day, any period)
    newGrid[sourceClassId][sourceDPos][sourcePPos] = targetCell;
    newGrid[targetClassId][targetDPos][targetPPos] = sourceCell;

    const updatedRoutine: GeneratedRoutine = {
      ...routine,
      grid: newGrid,
      generatedAt: new Date().toISOString(),
    };

    setRoutine(updatedRoutine);

    // Conflict check on newly swapped slots — group cells shared across
    // member classes are ONE unit; count distinct unit keys per teacher.
    const clashes: string[] = [];
    const checkClashesAtPeriod = (dPos: number, pPos: number) => {
      const tSeen = new Map<string, { cids: Set<string>; units: Set<string | number> }>();
      for (const [cid, days] of Object.entries(newGrid)) {
        const cell = days[dPos]?.[pPos];
        if (!cell) continue;
        const unitKey = (cell.gid as string | undefined) ?? cell.uid;
        for (const o of getCellOptions(cell)) {
          if (!o.tid) continue;
          let entry = tSeen.get(o.tid);
          if (!entry) {
            entry = { cids: new Set(), units: new Set() };
            tSeen.set(o.tid, entry);
          }
          entry.cids.add(cid);
          entry.units.add(unitKey);
        }
      }
      for (const [tid, entry] of tSeen.entries()) {
        if (entry.units.size > 1) {
          const tch = teacherMap.get(tid);
          const tName = tch?.shortName || tch?.name || "Teacher";
          const classNames = Array.from(entry.cids)
            .map((id) => `${classMap.get(id)?.className || ""}-${classMap.get(id)?.section || ""}`)
            .join(" & ");
          clashes.push(`${tName} in Period ${pPos + 1} (${classNames})`);
        }
      }
    };

    checkClashesAtPeriod(sourceDPos, sourcePPos);
    if (targetPPos !== sourcePPos || targetDPos !== sourceDPos) {
      checkClashesAtPeriod(targetDPos, targetPPos);
    }

    // Rule checks on the two new slots: teacher availability, class day limit, teacher daily/consecutive limits
    const ruleIssues: string[] = [];
    const touched = new Set<string>();
    const slots = [
      { cid: sourceClassId, d: sourceDPos, p: sourcePPos, cell: targetCell },
      { cid: targetClassId, d: targetDPos, p: targetPPos, cell: sourceCell },
    ];
    for (const s of slots) {
      if (!s.cell) continue;
      const dayVal = routine.days?.[s.d] ?? s.d;
      const cls = classMap.get(s.cid);
      const dayCap = settings.halfDays.includes(dayVal) ? settings.halfDayPeriods : settings.periodsPerDay;
      const cap = Math.min(dayCap, cls?.dailyPeriods || settings.periodsPerDay);
      if (s.p + 1 > cap) {
        ruleIssues.push(`${cls?.className || "Class"} has only ${cap} periods that day`);
      }
      for (const o of getCellOptions(s.cell)) {
        if (!o.tid) continue;
        touched.add(`${o.tid}|${s.d}`);
        const tch = teacherMap.get(o.tid);
        const av = (tch?.availableSlots as Record<string, number[]> | undefined)?.[String(dayVal)];
        if (Array.isArray(av) && !av.includes(s.p + 1)) {
          ruleIssues.push(`${tch?.shortName || tch?.name || "Teacher"} is unavailable in period ${s.p + 1}`);
        }
      }
    }
    for (const key of touched) {
      const [tid, dStr] = key.split("|");
      const d = Number(dStr);
      const periods = new Set<number>();
      for (const days of Object.values(newGrid)) {
        (days[d] || []).forEach((cell, p) => {
          if (cell && getCellOptions(cell).some((o) => o.tid === tid)) periods.add(p + 1);
        });
      }
      const name = teacherMap.get(tid)?.shortName || teacherMap.get(tid)?.name || "Teacher";
      if (periods.size > settings.tchDailyMax) {
        ruleIssues.push(`${name} has ${periods.size} periods that day (max ${settings.tchDailyMax})`);
      }
      let run = 0;
      let best = 0;
      for (let q = 1; q <= settings.periodsPerDay; q++) {
        if (settings.breaks.includes(q - 1)) run = 0;
        run = periods.has(q) ? run + 1 : 0;
        best = Math.max(best, run);
      }
      if (best > settings.tchConsecMax) {
        ruleIssues.push(`${name} teaches ${best} in a row (max ${settings.tchConsecMax})`);
      }
    }
    clashes.push(...Array.from(new Set(ruleIssues)));

    if (clashes.length > 0) {
      showToast({
        type: "warning",
        title: "Swapped with Warnings",
        description: clashes.slice(0, 3).join("; "),
      });
    } else {
      showToast({
        type: "success",
        title: "Periods Swapped",
        description: `${sourceClass?.className || "Class"} (P${sourcePPos + 1}) ⇄ ${targetClass?.className || "Class"} (P${targetPPos + 1})`,
      });
    }

    // Persist to database in background
    try {
      await saveGeneratedRoutineDb(updatedRoutine);
    } catch (err) {
      console.error("Failed to persist swapped routine:", err);
    }
  };

  const handleUndo = async () => {
    if (history.length === 0 || !routine) return;
    const previousGrid = history[0];
    setHistory((prev) => prev.slice(1));

    const updatedRoutine: GeneratedRoutine = {
      ...routine,
      grid: previousGrid,
      generatedAt: new Date().toISOString(),
    };

    setRoutine(updatedRoutine);
    showToast({
      type: "info",
      title: "Action Undone",
      description: "Restored to previous schedule state.",
    });

    try {
      await saveGeneratedRoutineDb(updatedRoutine);
    } catch (err) {
      console.error("Failed to persist undone routine:", err);
    }
  };

  

  return {
    handleCellSwap,
    handleUndo,
  };
}

export type ViewerEditingState = ReturnType<typeof useViewerEditing>;
