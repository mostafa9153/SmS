"use client";

import { useState, useMemo } from "react";
import { getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { normalizeClassCode } from "@/lib/ems/seat-arrangement-algorithm";
import type { EmsCore } from "./use-ems-core";

export function useEmsRoutine(ctx: EmsCore) {
  const { activeRoutineClass, allStudents, routinesByClass, selectedClasses, setRoutinesByClass } = ctx;
  // Step 1: Routine Management Helpers
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  const activeClassSubjects = useMemo(() => {
    if (!activeRoutineClass) return [];
    return getDatabaseSubjectsForClass(activeRoutineClass, allStudents);
  }, [activeRoutineClass, allStudents]);

  const currentClassRoutine = useMemo(() => {
    if (!activeRoutineClass) return [];
    return routinesByClass[activeRoutineClass] || [];
  }, [activeRoutineClass, routinesByClass]);

  const handleRoutineDateChange = (idx: number, newDate: string) => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    let dayName = "";
    if (newDate) {
      const d = new Date(newDate + "T00:00:00");
      if (!isNaN(d.getTime())) {
        dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      }
    }
    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      list[idx] = {
        ...list[idx],
        date: newDate,
        day: dayName,
      };
      return { ...prev, [normClass]: list };
    });
  };

  const handleRoutineSubjectText = (idx: number, subject: string) => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      list[idx] = { ...list[idx], subject };
      return { ...prev, [normClass]: list };
    });
  };

  const handleMoveRow = (fromIndex: number, toIndex: number) => {
    const normClass = activeRoutineClass;
    if (!normClass || fromIndex === toIndex) return;

    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
        return prev;
      }
      const [movedItem] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, movedItem);
      return { ...prev, [normClass]: list };
    });
  };

  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleAutoFillConsecutiveDates = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    const list = routinesByClass[normClass] || [];
    if (list.length === 0) return;

    let baseD: Date;
    if (list[0].date) {
      baseD = new Date(list[0].date + "T00:00:00");
    } else {
      baseD = new Date();
      if (baseD.getDay() === 0) baseD.setDate(baseD.getDate() + 1);
    }

    if (isNaN(baseD.getTime())) {
      baseD = new Date();
      if (baseD.getDay() === 0) baseD.setDate(baseD.getDate() + 1);
    }

    const currD = new Date(baseD.getTime());
    const updated = list.map((item, i) => {
      if (i === 0) {
        const dStr = formatLocalDate(currD);
        const dayStr = currD.toLocaleDateString("en-US", { weekday: "long" });
        return { ...item, date: dStr, day: dayStr };
      }
      currD.setDate(currD.getDate() + 1);
      if (currD.getDay() === 0) currD.setDate(currD.getDate() + 1);
      const dStr = formatLocalDate(currD);
      const dayStr = currD.toLocaleDateString("en-US", { weekday: "long" });
      return { ...item, date: dStr, day: dayStr };
    });

    setRoutinesByClass((prev) => ({
      ...prev,
      [normClass]: updated,
    }));
  };

  const handleResetToPresetSubjects = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    const presetSubs = getDatabaseSubjectsForClass(normClass, allStudents);
    if (!presetSubs || presetSubs.length === 0) return;
    setRoutinesByClass((prev) => ({
      ...prev,
      [normClass]: presetSubs.map((sub) => ({
        date: "",
        day: "",
        subject: sub,
      })),
    }));
  };

  const handleAddRoutineRow = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    setRoutinesByClass((prev) => {
      const list = [...(prev[normClass] || [])];
      let nextDate = "";
      let nextDay = "";
      if (list.length > 0 && list[list.length - 1].date) {
        const prevD = new Date(list[list.length - 1].date + "T00:00:00");
        if (!isNaN(prevD.getTime())) {
          prevD.setDate(prevD.getDate() + 1);
          if (prevD.getDay() === 0) prevD.setDate(prevD.getDate() + 1);
          nextDate = formatLocalDate(prevD);
          nextDay = prevD.toLocaleDateString("en-US", { weekday: "long" });
        }
      }
      return {
        ...prev,
        [normClass]: [...list, { date: nextDate, day: nextDay, subject: "" }],
      };
    });
  };

  const handleRemoveRoutineRow = (idx: number) => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    setRoutinesByClass((prev) => {
      const list = (prev[normClass] || []).filter((_, i) => i !== idx);
      return { ...prev, [normClass]: list };
    });
  };

  const handleCopyRoutineToAllClasses = () => {
    const normClass = activeRoutineClass;
    if (!normClass) return;
    const currentList = routinesByClass[normClass] || [];
    if (currentList.length === 0) return;
    setRoutinesByClass((prev) => {
      const updated = { ...prev };
      selectedClasses.forEach((c) => {
        const targetNorm = normalizeClassCode(c);
        if (targetNorm && targetNorm !== normClass) {
          const targetList = updated[targetNorm] || [];
          if (targetList.length > 0) {
            updated[targetNorm] = targetList.map((targetItem, i) => {
              const sourceItem = currentList[i];
              return {
                ...targetItem,
                date: sourceItem ? sourceItem.date : targetItem.date,
                day: sourceItem ? sourceItem.day : targetItem.day,
              };
            });
          } else {
            updated[targetNorm] = currentList.map((item) => ({ ...item }));
          }
        }
      });
      return updated;
    });
  };


  return {
    activeClassSubjects,
    currentClassRoutine,
    draggedRowIndex,
    formatLocalDate,
    handleAddRoutineRow,
    handleAutoFillConsecutiveDates,
    handleCopyRoutineToAllClasses,
    handleMoveRow,
    handleRemoveRoutineRow,
    handleResetToPresetSubjects,
    handleRoutineDateChange,
    handleRoutineSubjectText,
    setDraggedRowIndex,
  };
}