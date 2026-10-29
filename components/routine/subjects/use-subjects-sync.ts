"use client";

import { apiFetch } from "@/lib/api/client";
import React from "react";
import { setLocalRoutineState } from "@/lib/supabase/db-routine";
import { showToast } from "@/components/ui/toast-banner";
import { syncAllSubjectsFromPresetsToRoutine } from "@/lib/routine/routine-sync";
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

  // Auto-Sync Preset Subjects for Active Class
  const handleSyncActiveClass = async () => {
    if (activeClass === "all") {
      await handleSyncFromPresets();
      return;
    }

    const clsLower = activeClass.toLowerCase();
    const existing = new Set(
      subjects
        .filter((s) => !s.className || s.className.toLowerCase() === clsLower)
        .map((s) => s.name.trim().toLowerCase())
    );

    let toAdd: { name: string; stream?: string; isCommon?: boolean }[] = [];

    if (isCurrentClassHs) {
      if (selectedStream === "Common") {
        toAdd = HS_STREAM_PRESETS.Common.map((p) => ({ name: p, stream: "Common", isCommon: true }));
      } else if (selectedStream === "Science") {
        toAdd = configuredStreamsForActive.includes("Science")
          ? HS_STREAM_PRESETS.Science.map((p) => ({ name: p, stream: "Science", isCommon: false }))
          : [];
      } else if (selectedStream === "Commerce") {
        toAdd = configuredStreamsForActive.includes("Commerce")
          ? HS_STREAM_PRESETS.Commerce.map((p) => ({ name: p, stream: "Commerce", isCommon: false }))
          : [];
      } else if (selectedStream === "Arts") {
        toAdd = configuredStreamsForActive.includes("Arts")
          ? HS_STREAM_PRESETS.Arts.map((p) => ({ name: p, stream: "Arts", isCommon: false }))
          : [];
      } else {
        toAdd = [
          ...HS_STREAM_PRESETS.Common.map((p) => ({ name: p, stream: "Common", isCommon: true })),
          ...(configuredStreamsForActive.includes("Science")
            ? HS_STREAM_PRESETS.Science.map((p) => ({ name: p, stream: "Science", isCommon: false }))
            : []),
          ...(configuredStreamsForActive.includes("Commerce")
            ? HS_STREAM_PRESETS.Commerce.map((p) => ({ name: p, stream: "Commerce", isCommon: false }))
            : []),
          ...(configuredStreamsForActive.includes("Arts")
            ? HS_STREAM_PRESETS.Arts.map((p) => ({ name: p, stream: "Arts", isCommon: false }))
            : []),
        ];
      }
    } else {
      toAdd = getDatabaseSubjectsForClass(activeClass).map((p) => ({ name: p }));
    }

    const filteredToAdd = toAdd.filter((item) => !existing.has(item.name.trim().toLowerCase()));
    if (filteredToAdd.length === 0) return;

    setIsSyncing(true);
    try {
      const itemsToSave = filteredToAdd.map((item) => {
        const lower = item.name.toLowerCase();
        const isLabSubject = lower.includes("lab") || lower.includes("practical");
        const isLightSub = lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental");
        return {
          name: item.name,
          className: activeClass,
          stream: item.stream || (isCurrentClassHs ? detectSubjectStream(item.name) : null),
          isCommon: item.isCommon || (isCurrentClassHs && item.stream === "Common"),
          isHard: false,
          isLab: isLabSubject,
          timePref: "any" as const,
          allowMultiplePerDay: false,
          maxPerDay: 1,
          periodsPerWeek: isLabSubject || isLightSub ? 2 : 5,
        };
      });

      if (onBatchSaveSubjects) {
        await onBatchSaveSubjects(itemsToSave);
      } else {
        for (const item of itemsToSave) {
          await onSaveSubject(item);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Quick Auto-Sync Common Core (Bengali, English, Environmental Studies)
  const handleSyncCommonCore = async () => {
    if (!isCurrentClassHs) return;
    const clsLower = activeClass.toLowerCase();
    const existing = new Set(
      subjects
        .filter((s) => !s.className || s.className.toLowerCase() === clsLower)
        .map((s) => s.name.trim().toLowerCase())
    );

    const commonList = ["Bengali", "English", "Environmental Studies"];
    const toAdd = commonList.filter((p) => !existing.has(p.toLowerCase()));
    if (toAdd.length === 0) return;

    setIsSyncing(true);
    try {
      const itemsToSave = toAdd.map((subName) => {
        const lower = subName.toLowerCase();
        const isLight = lower.includes("environmental");
        return {
          name: subName,
          className: activeClass,
          stream: "Common",
          isCommon: true,
          isHard: false,
          isLab: false,
          timePref: "any" as const,
          allowMultiplePerDay: false,
          maxPerDay: 1,
          periodsPerWeek: isLight ? 2 : 5,
        };
      });

      if (onBatchSaveSubjects) {
        await onBatchSaveSubjects(itemsToSave);
      } else {
        for (const item of itemsToSave) {
          await onSaveSubject(item);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync All Classes Presets from Settings
  const handleSyncFromPresets = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAllSubjectsFromPresetsToRoutine();
      if (res.addedCount > 0) {
        if (typeof window !== 'undefined') { window.dispatchEvent(new Event('sms_routine_state_updated')); }
        showToast({
          type: "success",
          title: "Synced from Presets",
          description: `${res.addedCount} new subjects synced from Presets with 5 periods/week.`,
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
    handleSyncActiveClass,
    handleSyncCommonCore,
    handleSyncFromPresets,
  };
}

export type SubjectsSyncState = ReturnType<typeof useSubjectsSync>;
