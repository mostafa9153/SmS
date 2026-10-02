"use client";

import React, { useState } from "react";
import { RoutineSettings, DAY_NAMES } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, RefreshCw, Check, Sliders, CalendarDays, Coffee, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { showToast } from "@/components/ui/toast-banner";

interface RoutineSettingsTabProps {
  settings: RoutineSettings;
  onSave: (settings: RoutineSettings) => Promise<void>;
  isLoading?: boolean;
}

export function RoutineSettingsTab({
  settings: initialSettings,
  onSave,
  isLoading,
}: RoutineSettingsTabProps) {
  const [settings, setSettings] = useState<RoutineSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  React.useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const toggleDay = (dayIdx: number) => {
    const active = settings.workingDays.includes(dayIdx);
    const isHalf = settings.halfDays.includes(dayIdx);

    let newWorkingDays = [...settings.workingDays];
    let newHalfDays = [...settings.halfDays];

    if (active && !isHalf) {
      // Toggle to Half Day
      newHalfDays.push(dayIdx);
    } else if (active && isHalf) {
      // Toggle off completely
      newWorkingDays = newWorkingDays.filter((d) => d !== dayIdx);
      newHalfDays = newHalfDays.filter((d) => d !== dayIdx);
    } else {
      // Toggle on as Full Day
      newWorkingDays.push(dayIdx);
      newWorkingDays.sort((a, b) => a - b);
    }

    setSettings({
      ...settings,
      workingDays: newWorkingDays,
      halfDays: newHalfDays,
    });
  };

  const toggleBreak = (period: number) => {
    const exists = settings.breaks.includes(period);
    const newBreaks = exists
      ? settings.breaks.filter((p) => p !== period)
      : [...settings.breaks, period].sort((a, b) => a - b);

    setSettings({ ...settings, breaks: newBreaks });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
      setIsSavedRecently(true);
      setTimeout(() => setIsSavedRecently(false), 2500);
      showToast({
        type: "success",
        title: "Saved",
        description: "Schedule configuration saved successfully.",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sms_routine_state_updated"));
      }
    } catch {
      showToast({
        type: "error",
        title: "Save Failed",
        description: "Failed to save schedule configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Schedule Configuration Card */}
        <div className="bg-card border rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 border-b pb-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Period Configuration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Standard Daily Periods</Label>
              <Input
                type="number"
                min={1}
                max={14}
                value={settings.periodsPerDay}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 8;
                  setSettings({
                    ...settings,
                    periodsPerDay: val,
                    breaks: settings.breaks.filter((p) => p < val),
                  });
                }}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Half Day Period Limit</Label>
              <Input
                type="number"
                min={1}
                max={14}
                value={settings.halfDayPeriods}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    halfDayPeriods: parseInt(e.target.value, 10) || 4,
                  })
                }
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Teacher Fatigue & Health Controls */}
        <div className="bg-card border rounded-lg p-4 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 border-b pb-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Teacher Workload Constraints
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Max Daily Periods / Teacher</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings.tchDailyMax}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tchDailyMax: parseInt(e.target.value, 10) || 5,
                  })
                }
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Max Consecutive Periods</Label>
              <Input
                type="number"
                min={1}
                max={8}
                value={settings.tchConsecMax}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tchConsecMax: parseInt(e.target.value, 10) || 3,
                  })
                }
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Active Days & Half Days Card */}
      <div className="bg-card border rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Academic Working Days & Half Days
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {settings.workingDays.length} Active ({settings.halfDays.length} Half)
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {DAY_NAMES.map((name, i) => {
            const active = settings.workingDays.includes(i);
            const half = settings.halfDays.includes(i);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all select-none flex items-center gap-1.5",
                  active && !half && "bg-primary text-primary-foreground border-primary shadow-xs",
                  active && half && "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50 font-bold",
                  !active && "bg-muted/40 text-muted-foreground/60 border-border hover:bg-muted/80"
                )}
              >
                <span>{name}</span>
                {active && !half && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary-foreground/20 text-primary-foreground border-transparent">
                    Full
                  </Badge>
                )}
                {active && half && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-400">
                    Half
                  </Badge>
                )}
                {!active && (
                  <span className="text-[9px] text-muted-foreground opacity-60">Off</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breaks / Tiffin Card */}
      <div className="bg-card border rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Recess / Tiffin Interval Slots
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {settings.breaks.length} Designated Break{settings.breaks.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {Array.from({ length: Math.max(0, settings.periodsPerDay - 1) }, (_, i) => i + 1).map((p) => {
            const isBreak = settings.breaks.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggleBreak(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold border transition-all select-none flex items-center gap-1.5",
                  isBreak
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                <Coffee className={cn("w-3.5 h-3.5", isBreak ? "text-white" : "opacity-40")} />
                <span>Between Period {p} & {p + 1}</span>
                {isBreak && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-white/20 text-white border-transparent">
                    Break
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Action */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className={cn(
            "h-8 gap-1.5 text-xs font-semibold px-4 transition-all duration-150 shadow-xs cursor-pointer",
            isSavedRecently
              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : isSavedRecently ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

