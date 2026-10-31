"use client";

import { useCallback, useMemo, useState } from "react";
import {
  type SlotMap,
  type SlotWindow,
  detectWindow,
  normalizeSlots,
  settingsForClass,
  slotStats,
  slotsFromWindow,
} from "@/lib/routine/slots";
import type { SubjectsCoreState } from "./use-subjects-core";

const MAX_PER_DAY_CHOICES = [1, 2, 3, 4] as const;

/**
 * Time window + custom slot matrix for the subject dialog.
 * Presets (Anytime / Morning / Afternoon) stay a soft time preference; editing the matrix makes it a hard rule.
 */
export function useSubjectSchedule(ctx: SubjectsCoreState) {
  const { settings: schoolSettings, classes, targetClassForForm, dlgPeriodsPerWeek, dlgMaxPerDay } = ctx;
  // Only the periods this class actually runs (Classes tab daily limit)
  const settings = useMemo(
    () => settingsForClass(schoolSettings, classes, targetClassForForm),
    [schoolSettings, classes, targetClassForForm]
  );
  const [dlgWindow, setDlgWindow] = useState<SlotWindow>("any");
  const [dlgSlots, setDlgSlots] = useState<SlotMap>(() => slotsFromWindow("any", settings));

  const loadSchedule = useCallback(
    (timePref: "any" | "morning" | "afternoon" | undefined, allowed: SlotMap | null | undefined) => {
      const custom = normalizeSlots(allowed, settings);
      if (custom) {
        setDlgWindow("custom");
        setDlgSlots(custom);
      } else {
        const w = timePref || "any";
        setDlgWindow(w);
        setDlgSlots(slotsFromWindow(w, settings));
      }
    },
    [settings]
  );

  const selectDlgWindow = useCallback(
    (w: Exclude<SlotWindow, "custom">) => {
      setDlgWindow(w);
      setDlgSlots(slotsFromWindow(w, settings));
    },
    [settings]
  );

  const selectDlgCustom = useCallback(() => setDlgWindow("custom"), []);

  const changeDlgSlots = useCallback(
    (next: SlotMap) => {
      setDlgSlots(next);
      setDlgWindow(detectWindow(next, settings) === "any" ? "any" : "custom");
    },
    [settings]
  );

  const schedule = useMemo(() => {
    const need = Math.max(0, Number(dlgPeriodsPerWeek) || 0);
    const fits = (m: number) => slotStats(dlgSlots, settings, m).capacity >= need;
    // Least per-day cap that can still hold the weekly load; 6+ periods keep the old 2/day lock (half-day Saturday)
    const fitMin = MAX_PER_DAY_CHOICES.find(fits) ?? MAX_PER_DAY_CHOICES[MAX_PER_DAY_CHOICES.length - 1];
    const minPerDay = Math.max(fitMin, need >= 6 ? 2 : 1);
    const maxPerDay = Math.max(minPerDay, Number(dlgMaxPerDay) || 1);
    const stats = slotStats(dlgSlots, settings, maxPerDay);
    const isCustom = dlgWindow === "custom";
    return {
      minPerDay,
      maxPerDay,
      stats,
      // Only a custom matrix is hard; presets are relaxed by the solver when they do not fit
      blocked: isCustom && stats.capacity < need,
      shortBy: Math.max(0, need - stats.capacity),
      timePref: (isCustom ? "any" : dlgWindow) as "any" | "morning" | "afternoon",
      allowedSlots: isCustom ? normalizeSlots(dlgSlots, settings) : null,
    };
  }, [dlgPeriodsPerWeek, dlgMaxPerDay, dlgSlots, dlgWindow, settings]);

  return {
    slotSettings: settings,
    dlgWindow,
    dlgSlots,
    loadSchedule,
    selectDlgWindow,
    selectDlgCustom,
    changeDlgSlots,
    schedule,
    maxPerDayChoices: MAX_PER_DAY_CHOICES,
  };
}

export type SubjectScheduleState = ReturnType<typeof useSubjectSchedule>;
