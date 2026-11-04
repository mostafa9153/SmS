"use client";

import { apiFetch } from "@/lib/api/client";
import React from "react";
import { setLocalRoutineState } from "@/lib/supabase/db-routine";
import { showToast } from "@/components/ui/toast-banner";
import { localPresetRaw, presetMatchesLocal, syncAllSubjectsFromPresetsToRoutine } from "@/lib/routine/routine-sync";
import { fetchSchoolConfigClient } from "@/lib/utils/school-config-client";
import { getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";
import { HS_STREAM_PRESETS, detectSubjectStream } from "@/lib/routine/routine-helpers";
import type { SubjectsCoreState } from "./use-subjects-core";
import type { SubjectsEditingState } from "./use-subjects-editing";

export function useSubjectsSync(ctx: SubjectsCoreState & SubjectsEditingState) {
  const { activeClass, allowMulti, configuredStreamsForActive, editId, formStream, handleCancel, isCommonSubject, isCurrentClassHs, isLab, localOrder, maxPerDay, name, onBatchSaveSubjects, onSaveSubject, periodsPerWeek, selectedStream, setActiveClass, setIsSavedRecently, setIsSaving, setIsSyncing, setSelectedStream, subjects, targetClassForForm, timePref } = ctx;
  const handleSelectClass = React.useCallback((cls: string) => {
    setActiveClass(cls);
    handleCancel();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_routine_subjects_class", cls);
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "subjects");
      url.searchParams.set("class", cls);
      window.history.replaceState(null, "", url.toString());
    }
  }, [handleCancel]);

  const handleSelectStream = React.useCallback((stream: "all" | "Common" | "Science" | "Commerce" | "Arts") => {
    setSelectedStream(stream);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sms_routine_subjects_stream", stream);
      } catch {}
      const url = new URL(window.location.href);
      url.searchParams.set("stream", stream);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Permanent Cloud Save handler for Routine Subjects
  const handleSaveAll = React.useCallback(async () => {
    setIsSaving(true);
    try {
      const currentList = [...subjects];

      // 1. Immediately persist subject order to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sms_routine_subjects_order", JSON.stringify(localOrder));
        } catch {}
      }

      // 2. Persist subject order to Cloud API
      try {
        await apiFetch("/api/routine/subjects-order", { method: "POST", json: { order: localOrder } });
      } catch (cloudErr) {
        console.warn("Failed to save routine_subjects_order to cloud:", cloudErr);
      }

      const rows = currentList.map((s) => {
        // Resolve sortOrder from any localOrder entry that contains this subject
        let resolvedOrder: number | null = s.sortOrder ?? null;
        for (const [, orderedTokens] of Object.entries(localOrder)) {
          const idx = orderedTokens.findIndex(
            (token) =>
              token === s.id ||
              token.trim().toLowerCase() === s.name.trim().toLowerCase()
          );
          if (idx !== -1) {
            resolvedOrder = idx;
            break;
          }
        }
        return {
          id: s.id,
          name: s.name,
          className: s.className || null,
          classId: s.classId || null,
          stream: s.stream || null,
          isCommon: s.isCommon,
          isHard: s.isHard,
          isLab: s.isLab,
          timePref: s.timePref,
          allowMultiplePerDay: s.allowMultiplePerDay,
          maxPerDay: s.maxPerDay,
          periodsPerWeek: s.periodsPerWeek,
          sortOrder: resolvedOrder,
        };
      });

      if (onBatchSaveSubjects) {
        await onBatchSaveSubjects(rows);
      } else {
        for (const r of rows) {
          await onSaveSubject(r);
        }
      }

      const updatedList = currentList.map((s) => {
        const match = rows.find((r) => r.id === s.id);
        return match ? { ...s, sortOrder: match.sortOrder } : s;
      });
      setLocalRoutineState({ subjects: updatedList });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sms_routine_state_updated"));
      }

      setIsSavedRecently(true);
      setTimeout(() => setIsSavedRecently(false), 2500);

      showToast({
        type: "success",
        title: "Saved",
        description: `${rows.length} subjects saved to cloud.`,
      });
    } catch (err) {
      console.error("Save error:", err);
      showToast({
        type: "error",
        title: "Save Failed",
        description: "Failed to save subjects to cloud.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    subjects,
    name,
    isCurrentClassHs,
    isCommonSubject,
    formStream,
    editId,
    targetClassForForm,
    isLab,
    timePref,
    allowMulti,
    maxPerDay,
    periodsPerWeek,
    localOrder,
    onBatchSaveSubjects,
    onSaveSubject,
  ]);

  // Sync All Classes Presets from Settings
  const handleSyncFromPresets = async () => {
    setIsSyncing(true);
    try {
      const localBefore = localPresetRaw();
      const config = await fetchSchoolConfigClient(true).catch(() => null);
      const presetSure = presetMatchesLocal(config?.marks_schemes, localBefore);
      const res = await syncAllSubjectsFromPresetsToRoutine({ prune: presetSure ? "all" : "off" });
      if (res.addedCount > 0 || res.removedCount > 0) {
        if (typeof window !== 'undefined') { window.dispatchEvent(new Event('sms_routine_state_updated')); }
        showToast({
          type: res.inRoutine > 0 ? "warning" : "success",
          title: "Synced from Presets",
          description:
            [
              res.addedCount > 0 ? `${res.addedCount} subjects synced` : "",
              res.removedCount > 0 ? `${res.removedCount} removed from streams the preset no longer lists` : "",
            ].filter(Boolean).join(", ") +
            "." +
            (res.inRoutine > 0 ? " The current routine still uses them: generate the routine again." : ""),
        });
      } else {
        showToast({
          type: "info",
          title: "Already Up to Date",
          description: "All preset subjects are already present in Routine.",
        });
      }
    } catch (err) {
      console.error("Sync error:", err);
      showToast({
        type: "error",
        title: "Sync Failed",
        description: "Failed to sync subjects from Presets.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    handleSaveAll,
    handleSelectClass,
    handleSelectStream,
    handleSyncFromPresets,
  };
}