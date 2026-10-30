"use client";

import React, { useState, useMemo, useCallback } from "react";
import { RoutineTeacher } from "@/lib/routine/types";
import { showToast } from "@/components/ui/toast-banner";
import { batchSaveTeachersAvailabilityDb } from "@/lib/supabase/db-routine";
import { generateInitials, dropEmptyClasses } from "@/lib/routine/routine-helpers";
import { syncRoutineTeacherToClasses, parseClassSectionLabel, formatClassSectionLabel } from "@/lib/routine/routine-sync";
import type { TeachersCoreState } from "./use-teachers-core";
import type { TeachersAllocationState } from "./use-teachers-allocation";

export function useTeachersSave(ctx: TeachersCoreState & TeachersAllocationState) {
  const { applyGroupPicks, availSlots, classPeriodsMap, classSectionsMap, classSubjectsDictionary, classSubjectsMap, classTeacherFirstPeriods, classTeacherOf, customPrimarySubject, editingTeacherId, getClassSections, getSectionSubjects, getSubjectAllocationStats, groupPicks, groupsForClass, maxPeriods, onDeleteTeacher, onSaveTeacher, originalClassTeacherOf, primarySubject, sectionPeriodsMap, sectionSubjectsMap, selectedClasses, selectedStaffId, setAvailSlots, setClassSubjectsMap, setEditingTeacherId, setIsEditorOpen, setIsSubmitting, setOriginalClassTeacherOf, setSectionSubjectsMap, setSubjectPeriodsMap, settings, shortName, staffList, subjectPeriodsMap, teacherName, teachers } = ctx;
  // Handle subject period count change (for single sec or ALL)
  const handleSubjectPeriodChange = (clsName: string, sec: string, subName: string, val: string) => {
    const num = val.trim() === "" ? 0 : parseInt(val, 10);
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];

    setSubjectPeriodsMap((prev) => {
      const next = { ...prev };
      if (sec === "ALL") {
        selectedSecs.forEach((s) => {
          const k = `${clsName}::${s}::${subName}`;
          if (!num || num <= 0) {
            delete next[k];
          } else {
            next[k] = num;
          }
        });
        const clsK = `${clsName}::${subName}`;
        if (!num || num <= 0) {
          delete next[clsK];
        } else {
          next[clsK] = num;
        }
      } else {
        const secKey = `${clsName}::${sec}::${subName}`;
        if (!num || num <= 0) {
          delete next[secKey];
        } else {
          next[secKey] = num;
        }
      }
      return next;
    });
  };

  // Toggle subject for a specific section (or ALL)
  const toggleSubjectForSection = (clsName: string, sec: string, subName: string) => {
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];

    if (sec === "ALL") {
      const currentUnion = getSectionSubjects(clsName, "ALL");
      const exists = currentUnion.includes(subName);

      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        selectedSecs.forEach((s) => {
          const current = next[`${clsName}::${s}`] || [];
          next[`${clsName}::${s}`] = exists
            ? current.filter((sub) => sub !== subName)
            : Array.from(new Set([...current, subName]));
        });
        return next;
      });

      setClassSubjectsMap((prev) => ({
        ...prev,
        [clsName]: exists
          ? (prev[clsName] || []).filter((sub) => sub !== subName)
          : Array.from(new Set([...(prev[clsName] || []), subName])),
      }));

      // When unchecking in ALL, clean up matching keys in subjectPeriodsMap
      if (exists) {
        setSubjectPeriodsMap((prev) => {
          const next = { ...prev };
          selectedSecs.forEach((s) => {
            delete next[`${clsName}::${s}::${subName}`];
            delete next[`${clsName}-${s}-${subName}`];
            delete next[`${clsName}_${s}_${subName}`];
            delete next[`${clsName}-${s}::${subName}`];
            delete next[`${clsName}_${s}::${subName}`];
          });
          delete next[`${clsName}::${subName}`];
          delete next[`${clsName}-${subName}`];
          delete next[`${clsName}_${subName}`];
          return next;
        });
      } else {
        const stats = getSubjectAllocationStats(clsName, "ALL", subName);
        const autoFillPeriods = stats.remaining > 0 ? stats.remaining : stats.totalDemand;
        handleSubjectPeriodChange(clsName, "ALL", subName, String(autoFillPeriods));
      }
      return;
    }

    const secKey = `${clsName}::${sec}`;
    const current = getSectionSubjects(clsName, sec);
    const exists = current.includes(subName);
    const updated = exists ? current.filter((s) => s !== subName) : [...current, subName];

    setSectionSubjectsMap((prev) => ({
      ...prev,
      [secKey]: updated,
    }));

    if (exists) {
      // Clean up matching keys from subjectPeriodsMap
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        delete next[`${clsName}::${sec}::${subName}`];
        delete next[`${clsName}-${sec}-${subName}`];
        delete next[`${clsName}_${sec}_${subName}`];
        delete next[`${clsName}-${sec}::${subName}`];
        delete next[`${clsName}_${sec}::${subName}`];
        return next;
      });
    } else {
      const stats = getSubjectAllocationStats(clsName, sec, subName);
      const autoFillPeriods = stats.remaining > 0 ? stats.remaining : stats.totalDemand;
      handleSubjectPeriodChange(clsName, sec, subName, String(autoFillPeriods));
    }

    // Maintain class-level union
    setClassSubjectsMap((prev) => {
      const allUnion = new Set<string>();
      allSecs.forEach((s) => {
        const subs = s === sec ? updated : getSectionSubjects(clsName, s);
        subs.forEach((sub) => allUnion.add(sub));
      });
      return {
        ...prev,
        [clsName]: Array.from(allUnion),
      };
    });
  };

  // Toggle all subjects for a specific section (or ALL)
  const toggleAllSubjectsForSection = (clsName: string, sec: string) => {
    const allSubs = classSubjectsDictionary[clsName] || [];
    const allSecs = getClassSections(clsName);
    const selectedSecs = classSectionsMap[clsName] ?? [allSecs[0] || "A"];

    if (sec === "ALL") {
      const currentUnion = getSectionSubjects(clsName, "ALL");
      const allSelected = allSubs.length > 0 && currentUnion.length === allSubs.length;
      const nextSubs = allSelected ? [] : [...allSubs];

      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        selectedSecs.forEach((s) => {
          next[`${clsName}::${s}`] = [...nextSubs];
        });
        return next;
      });

      setClassSubjectsMap((prev) => ({
        ...prev,
        [clsName]: [...nextSubs],
      }));

      if (allSelected) {
        setSubjectPeriodsMap((prev) => {
          const next = { ...prev };
          selectedSecs.forEach((s) => {
            allSubs.forEach((subName) => {
              delete next[`${clsName}::${s}::${subName}`];
              delete next[`${clsName}-${s}-${subName}`];
              delete next[`${clsName}_${s}_${subName}`];
              delete next[`${clsName}-${s}::${subName}`];
              delete next[`${clsName}_${s}::${subName}`];
            });
          });
          allSubs.forEach((subName) => {
            delete next[`${clsName}::${subName}`];
            delete next[`${clsName}-${subName}`];
            delete next[`${clsName}_${subName}`];
          });
          return next;
        });
      }
      return;
    }

    const current = getSectionSubjects(clsName, sec);
    const allSelected = allSubs.length > 0 && current.length === allSubs.length;
    const next = allSelected ? [] : [...allSubs];

    const secKey = `${clsName}::${sec}`;
    setSectionSubjectsMap((prev) => ({
      ...prev,
      [secKey]: next,
    }));

    if (allSelected) {
      setSubjectPeriodsMap((prev) => {
        const nextMap = { ...prev };
        allSubs.forEach((subName) => {
          delete nextMap[`${clsName}::${sec}::${subName}`];
          delete nextMap[`${clsName}-${sec}-${subName}`];
          delete nextMap[`${clsName}_${sec}_${subName}`];
          delete nextMap[`${clsName}-${sec}::${subName}`];
          delete nextMap[`${clsName}_${sec}::${subName}`];
        });
        return nextMap;
      });
    }

    setClassSubjectsMap((prev) => {
      const allUnion = new Set<string>();
      allSecs.forEach((s) => {
        const subs = s === sec ? next : getSectionSubjects(clsName, s);
        subs.forEach((sub) => allUnion.add(sub));
      });
      return {
        ...prev,
        [clsName]: Array.from(allUnion),
      };
    });
  };

  // Period Availability toggles
  const togglePeriod = (dayIdx: number, period: number) => {
    const current = availSlots[dayIdx] || [];
    const exists = current.includes(period);
    const updated = exists
      ? current.filter((p) => p !== period)
      : [...current, period].sort((a, b) => a - b);

    setAvailSlots({
      ...availSlots,
      [dayIdx]: updated,
    });
  };

  const setPreset = (dayIdx: number, type: "all" | "morning" | "afternoon" | "none") => {
    if (type === "none") {
      setAvailSlots({ ...availSlots, [dayIdx]: [] });
    } else if (type === "all") {
      const all: number[] = [];
      for (let p = 1; p <= settings.periodsPerDay; p++) all.push(p);
      setAvailSlots({ ...availSlots, [dayIdx]: all });
    } else if (type === "morning") {
      const breakPoint = settings.breaks[0] || Math.floor(settings.periodsPerDay / 2);
      const morning: number[] = [];
      for (let p = 1; p <= breakPoint; p++) morning.push(p);
      setAvailSlots({ ...availSlots, [dayIdx]: morning });
    } else if (type === "afternoon") {
      const breakPoint = settings.breaks[0] || Math.floor(settings.periodsPerDay / 2);
      const afternoon: number[] = [];
      for (let p = breakPoint + 1; p <= settings.periodsPerDay; p++) afternoon.push(p);
      setAvailSlots({ ...availSlots, [dayIdx]: afternoon });
    }
  };

  // Save Teacher
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;

    setIsSubmitting(true);
    try {
      const teacherId = editingTeacherId || crypto.randomUUID();
      const finalSubject = (primarySubject === "__custom__" ? customPrimarySubject : primarySubject).trim();
      const finalClassTeacher = classTeacherOf && classTeacherOf !== "__none__" ? classTeacherOf.trim() : null;

      // A class kept only for a group pick stays; a class with nothing ticked is dropped
      const groupClasses = new Set(
        selectedClasses.filter((c) => groupsForClass(c).some((g) => g.options.some((o) => groupPicks.has(o.id))))
      );
      const payload: RoutineTeacher = dropEmptyClasses({
        id: teacherId,
        name: teacherName.trim(),
        shortName: shortName.trim() || generateInitials(teacherName.trim()),
        maxPeriods: maxPeriods || 24,
        availableSlots: availSlots,
        qualifiedClasses: selectedClasses,
        classSubjects: classSubjectsMap,
        sectionSubjects: sectionSubjectsMap,
        classSections: classSectionsMap,
        classPeriods: classPeriodsMap,
        sectionPeriods: sectionPeriodsMap,
        subjectPeriods: subjectPeriodsMap,
        primarySubject: finalSubject || null,
        classTeacherOf: finalClassTeacher,
        classTeacherFirstPeriods: finalClassTeacher ? Number(classTeacherFirstPeriods) || 3 : null,
      }, groupClasses);

      await onSaveTeacher(payload);
      await applyGroupPicks(teacherId, payload.qualifiedClasses || []);
      await syncRoutineTeacherToClasses(teacherName.trim(), finalClassTeacher, originalClassTeacherOf);

      setIsEditorOpen(false);
      setEditingTeacherId(null);
      setOriginalClassTeacherOf(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Teacher
  const handleDelete = useCallback(async (id: string) => {
    if (onDeleteTeacher) {
      const target = teachers.find((t) => t.id === id);
      if (target?.classTeacherOf) {
        await syncRoutineTeacherToClasses(target.name, null, target.classTeacherOf);
      }
      await onDeleteTeacher(id);
    }
  }, [onDeleteTeacher, teachers]);

  // Readable label for the teacher dropdown trigger
  const selectedStaffLabel = useMemo(() => {
    if (selectedStaffId === "__custom__") return "+ Custom Teacher (Manual Name)";
    const staff = staffList.find((s) => s.id === selectedStaffId);
    if (staff) {
      return `${staff.full_name} ${staff.designation ? `(${staff.designation})` : ""}`;
    }
    return teacherName || "Select Teacher";
  }, [selectedStaffId, staffList, teacherName]);

  // Class teacher assignments lookup for display & conflict detection
  const currentClassTeacherMap = useMemo(() => {
    const map: Record<string, { id: string; name: string }> = {};
    teachers.forEach((t) => {
      if (t.classTeacherOf && t.classTeacherOf.trim() && t.classTeacherOf !== "__none__") {
        const info = { id: t.id, name: t.name };
        map[t.classTeacherOf.trim()] = info;
        const parsed = parseClassSectionLabel(t.classTeacherOf);
        if (parsed) {
          map[formatClassSectionLabel(parsed.className, parsed.section)] = info;
          map[`${parsed.className} - ${parsed.section}`] = info;
          map[`${parsed.className}-${parsed.section}`] = info;
        }
      }
    });
    return map;
  }, [teachers]);

  // Detect conflict if selected class is already assigned to another teacher
  const conflictTeacher = useMemo(() => {
    if (!classTeacherOf || classTeacherOf === "__none__") return null;
    const info = currentClassTeacherMap[classTeacherOf.trim()];
    if (!info) return null;
    if (editingTeacherId && info.id === editingTeacherId) return null;
    if (teacherName && info.name.trim().toLowerCase() === teacherName.trim().toLowerCase()) return null;
    return info;
  }, [classTeacherOf, currentClassTeacherMap, editingTeacherId, teacherName]);

  // Batch Save all teachers to Cloud
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const handleSaveAllToCloud = async () => {
    setIsSavingAll(true);
    try {
      const ok = await batchSaveTeachersAvailabilityDb(teachers);
      if (ok) {
        setIsSavedRecently(true);
        setTimeout(() => setIsSavedRecently(false), 2500);
        showToast("Faculty configuration saved successfully!", "success");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("sms_routine_state_updated"));
        }
      } else {
        showToast("Failed to save faculty to cloud", "error");
      }
    } catch {
      showToast("Error saving faculty to cloud", "error");
    } finally {
      setIsSavingAll(false);
    }
  };

  return {
    conflictTeacher,
    currentClassTeacherMap,
    handleDelete,
    handleSave,
    handleSaveAllToCloud,
    handleSubjectPeriodChange,
    isSavedRecently,
    isSavingAll,
    selectedStaffLabel,
    setIsSavedRecently,
    setIsSavingAll,
    setPreset,
    toggleAllSubjectsForSection,
    togglePeriod,
    toggleSubjectForSection,
  };
}