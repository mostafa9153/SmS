"use client";

import React, { useCallback } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { RoutineSubject, RoutineSubjectGroup } from "@/lib/routine/types";
import { normalizeClassToCode } from "@/lib/routine/routine-sync";
import { isSubjectLab, isDefaultLabSubject } from "@/lib/utils/marks-config";
import { detectSubjectStream } from "@/lib/routine/routine-helpers";
import type { SubjectsCoreState } from "./use-subjects-core";
import type { SubjectsDerivedState } from "./use-subjects-derived";
import type { SubjectScheduleState } from "./use-subject-schedule";
import { toast } from "sonner";

export function useSubjectsEditing(ctx: SubjectsCoreState & SubjectsDerivedState & SubjectScheduleState) {
  const { activeClass, allowMulti, classGroups, currentClassSubjects, dialogMode, displayRows, dlgFormStream, dlgIsCommon, dlgLabSessions, dlgMaxPerDay, dlgName, dlgPeriodFormat, dlgTheoryPeriods, editGroup, editId, formStream, isCommonSubject, isCurrentClassHs, isLab, marksSchemes, maxPerDay, name, onSaveGroup, onSaveSubject, periodsPerWeek, selectedStream, setAllowMulti, setDialogMode, setDlgFormStream, setDlgIsCommon, setDlgIsLab, setDlgLabSessions, setDlgMaxPerDay, setDlgName, setDlgPeriodFormat, setDlgPeriodsPerWeek, setDlgTheoryPeriods, setEditDialogOpen, setEditGroup, setEditId, setFormStream, setIsCommonSubject, setIsDlgSubmitting, setIsLab, setIsSubmitting, setLocalOrder, setMaxPerDay, setName, setPeriodsPerWeek, setTimePref, subjects, targetClassForForm, timePref, loadSchedule, schedule } = ctx;
  // Handle drag-end: reorder within the current class/stream key
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const orderKey = `${activeClass}::${selectedStream}`;
    const rowId = (r: (typeof displayRows)[number]) =>
      r.type === "group" ? `group:${r.group.id}` : r.subject.id;
    const rowIds = displayRows.map(rowId);
    const oldIdx = rowIds.indexOf(active.id as string);
    const newIdx = rowIds.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;

    const reorderedTokens = arrayMove(displayRows, oldIdx, newIdx).flatMap((r) =>
      r.type === "group"
        ? r.members.filter((m) => currentClassSubjects.some((s) => s.id === m.id)).map((m) => m.id)
        : [r.subject.name]
    );

    setLocalOrder((prev) => {
      const next = { ...prev, [orderKey]: reorderedTokens };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sms_routine_subjects_order", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, [activeClass, selectedStream, currentClassSubjects, displayRows]);

  const handleEdit = React.useCallback((s: RoutineSubject) => {
    setEditGroup(null);
    setEditId(s.id);
    const stream = detectSubjectStream(s.name, s.stream);
    setDlgName(s.name);

    const isLab = Boolean(s.isLab);
    const totalP = s.periodsPerWeek || (isLab ? 6 : 5);
    const labSlots = s.labPeriods !== undefined && s.labPeriods !== null
      ? s.labPeriods
      : (isLab ? 2 : 0);
    const labSessions = Math.max(1, Math.round(labSlots / 2));
    const theoryP = s.theoryPeriods !== undefined && s.theoryPeriods !== null
      ? s.theoryPeriods
      : (isLab ? Math.max(0, totalP - (labSessions * 2)) : totalP);

    const format: "single" | "both" | "lab" = isLab
      ? (theoryP > 0 ? "both" : "lab")
      : "single";

    setDlgPeriodFormat(format);
    setDlgTheoryPeriods(theoryP);
    setDlgLabSessions(labSessions);
    setDlgPeriodsPerWeek(format === "single" ? theoryP : format === "lab" ? (labSessions * 2) : (theoryP + (labSessions * 2)));
    setDlgIsLab(isLab);
    loadSchedule(s.timePref, s.allowedSlots);
    setDlgMaxPerDay(s.allowMultiplePerDay ? (s.maxPerDay && s.maxPerDay >= 2 ? s.maxPerDay : 2) : 1);
    setDlgFormStream(stream);
    setDlgIsCommon(Boolean(s.isCommon || stream === "Common"));
    setDialogMode("edit");
    setEditDialogOpen(true);
  }, [loadSchedule]);

  const handleEditGroup = React.useCallback(
    (group: RoutineSubjectGroup, members: RoutineSubject[]) => {
      handleEdit(members[0]);
      setDlgName(group.name);
      setEditGroup(group);
      // The group is the solver unit, so its own window/slots win over the first member's
      loadSchedule(group.timePref, group.allowedSlots);
    },
    [handleEdit, loadSchedule]
  );

  const handleOpenAddDialog = React.useCallback(() => {
    setEditGroup(null);
    setEditId(null);
    setDlgName("");
    setDlgPeriodFormat("single");
    setDlgTheoryPeriods(5);
    setDlgLabSessions(1);
    setDlgPeriodsPerWeek(5);
    setDlgIsLab(false);
    loadSchedule("any", null);
    setDlgMaxPerDay(1);
    setDlgFormStream("General");
    setDlgIsCommon(false);
    setDialogMode("add");
    setEditDialogOpen(true);
  }, [loadSchedule]);

  // Handle choosing a preset subject chip
  const handleSelectPresetChip = React.useCallback((subName: string) => {
    const canonicalInput = subName.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    // Check if this subject already exists in the current class
    const existing = currentClassSubjects.find((s) => {
      const canonicalS = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
      return canonicalS === canonicalInput || s.name.trim().toLowerCase() === subName.trim().toLowerCase();
    });

    if (existing) {
      // Already added — open edit dialog for it
      handleEdit(existing);
      return;
    }

    // New subject — just fill the add form
    setEditId(null);
    setName(subName);
    const lower = subName.toLowerCase();
    const detected = detectSubjectStream(subName);
    setFormStream(detected);
    setIsCommonSubject(detected === "Common");

    const matchingScheme = marksSchemes.find(
      (sc) => normalizeClassToCode(sc.classCode) === normalizeClassToCode(activeClass)
    );
    const isLabPreset = matchingScheme ? isSubjectLab(matchingScheme, subName) : isDefaultLabSubject(subName);

    if (isLabPreset) {
      setIsLab(true);
      setPeriodsPerWeek(6);
      setAllowMulti(true);
    } else if (lower.includes("lab") || lower.includes("practical")) {
      setIsLab(true);
      setPeriodsPerWeek(2);
    } else if (lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental")) {
      setIsLab(false);
      setPeriodsPerWeek(2);
    } else {
      setIsLab(false);
      setPeriodsPerWeek(5);
    }
  }, [currentClassSubjects, handleEdit, marksSchemes, activeClass]);


  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const finalStream = isCurrentClassHs
        ? isCommonSubject
          ? "Common"
          : formStream === "General"
          ? detectSubjectStream(name.trim())
          : formStream
        : null;

      // Safety check against duplicates: if editId is null, check if a subject with same canonical name and class already exists
      let effectiveId = editId;
      if (!effectiveId) {
        const canonicalInput = name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        const existingMatch = currentClassSubjects.find((s) => {
          const canonicalS = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
          const matchName = canonicalS === canonicalInput || s.name.trim().toLowerCase() === name.trim().toLowerCase();
          const matchStream = !isCurrentClassHs || (s.stream || "Common").toLowerCase() === (finalStream || "Common").toLowerCase();
          return matchName && matchStream;
        });
        if (existingMatch) {
          effectiveId = existingMatch.id;
        }
      }

      await onSaveSubject({
        id: effectiveId || undefined,
        name: name.trim(),
        className: targetClassForForm,
        stream: finalStream,
        isCommon: isCommonSubject || finalStream === "Common",
        isHard: false,
        isLab,
        timePref,
        allowMultiplePerDay: allowMulti,
        maxPerDay: allowMulti ? Number(maxPerDay) || 2 : 1,
        periodsPerWeek: Number(periodsPerWeek) || 5,
      });
      setName("");
      setPeriodsPerWeek(5);
      setIsLab(false);
      setTimePref("any");
      setAllowMulti(false);
      setMaxPerDay(2);
      setEditId(null);
      setFormStream("General");
      setIsCommonSubject(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = React.useCallback(() => {
    setEditId(null);
    setName("");
    setPeriodsPerWeek(5);
    setIsLab(false);
    setTimePref("any");
    setAllowMulti(false);
    setMaxPerDay(2);
    setFormStream("General");
    setIsCommonSubject(false);
  }, []);

  const handleDlgClose = React.useCallback(() => {
    setEditDialogOpen(false);
    setEditId(null);
    setEditGroup(null);
  }, []);

  const handleDlgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dlgName.trim() || schedule.blocked) return;
    setIsDlgSubmitting(true);
    try {
      const finalStream = isCurrentClassHs
        ? dlgIsCommon
          ? "Common"
          : dlgFormStream === "General"
          ? detectSubjectStream(dlgName.trim())
          : dlgFormStream
        : null;

      const effectiveIsLab = dlgPeriodFormat === "both" || dlgPeriodFormat === "lab";
      const effectiveTheory = dlgPeriodFormat === "lab" ? 0 : Number(dlgTheoryPeriods) || 0;
      const effectiveLabSlots = dlgPeriodFormat === "single" ? 0 : (Number(dlgLabSessions) || 1) * 2;
      const effectiveTotal = effectiveTheory + effectiveLabSlots;
      const { timePref: dlgTimePref, allowedSlots, maxPerDay } = schedule;
      const allowMultiplePerDay = maxPerDay > 1;

      if (editGroup) {
        const members = classGroups.find((x) => x.group.id === editGroup.id)?.members || [];
        // Write every member and the header even if one write fails, then report the first error
        let firstError: unknown = null;
        const attempt = async (write: () => Promise<void>) => {
          try {
            await write();
          } catch (err) {
            firstError ??= err;
          }
        };
        for (const m of members) {
          await attempt(() => onSaveSubject({
            id: m.id,
            name: m.name,
            className: m.className,
            classId: m.classId,
            stream: m.stream,
            isCommon: m.isCommon,
            isHard: m.isHard,
            isLab: effectiveIsLab,
            theoryPeriods: effectiveTheory,
            labPeriods: effectiveLabSlots,
            timePref: dlgTimePref,
            allowedSlots,
            allowMultiplePerDay,
            maxPerDay,
            periodsPerWeek: effectiveTotal,
            sortOrder: m.sortOrder,
          }));
        }
        if (onSaveGroup) {
          await attempt(() => onSaveGroup({ ...editGroup, periodsPerWeek: effectiveTotal, timePref: dlgTimePref, allowedSlots }));
        }
        if (firstError) throw firstError;
      } else if (dialogMode === "edit" && editId) {
        const subjectBeingEdited = subjects.find((s) => s.id === editId);
        await onSaveSubject({
          id: editId,
          name: dlgName.trim(),
          className: subjectBeingEdited?.className || targetClassForForm,
          stream: finalStream,
          isCommon: dlgIsCommon || finalStream === "Common",
          isHard: false,
          isLab: effectiveIsLab,
          theoryPeriods: effectiveTheory,
          labPeriods: effectiveLabSlots,
          timePref: dlgTimePref,
          allowedSlots,
          allowMultiplePerDay,
          maxPerDay,
          periodsPerWeek: effectiveTotal,
        });
      } else {
        // Add mode
        const canonicalInput = dlgName.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        const existingMatch = currentClassSubjects.find((s) => {
          const canonicalS = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
          const matchStream = !isCurrentClassHs || (s.stream || "Common").toLowerCase() === (finalStream || "Common").toLowerCase();
          return (canonicalS === canonicalInput || s.name.trim().toLowerCase() === dlgName.trim().toLowerCase()) && matchStream;
        });
        await onSaveSubject({
          id: existingMatch?.id || undefined,
          name: dlgName.trim(),
          className: targetClassForForm,
          stream: finalStream,
          isCommon: dlgIsCommon || finalStream === "Common",
          isHard: false,
          isLab: effectiveIsLab,
          theoryPeriods: effectiveTheory,
          labPeriods: effectiveLabSlots,
          timePref: dlgTimePref,
          allowedSlots,
          allowMultiplePerDay,
          maxPerDay,
          periodsPerWeek: effectiveTotal,
        });
      }
      setEditDialogOpen(false);
      setEditId(null);
      setEditGroup(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Subject not saved");
    } finally {
      setIsDlgSubmitting(false);
    }
  };




  return {
    handleCancel,
    handleDlgClose,
    handleDlgSubmit,
    handleDragEnd,
    handleEdit,
    handleEditGroup,
    handleOpenAddDialog,
    handleSelectPresetChip,
    handleSubmit,
  };
}

export type SubjectsEditingState = ReturnType<typeof useSubjectsEditing>;
