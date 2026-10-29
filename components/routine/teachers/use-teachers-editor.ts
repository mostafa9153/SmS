"use client";

import { useEffect, useCallback, useRef } from "react";
import { RoutineTeacher } from "@/lib/routine/types";
import { generateInitials, sanitizeTeacherSubjectPeriods } from "@/lib/routine/routine-helpers";
import type { TeachersCoreState } from "./use-teachers-core";

export function useTeachersEditor(ctx: TeachersCoreState) {
  const { availableSubjectOptions, classSubjectsDictionary, editingTeacherId, getClassSections, getSubjectDefaultPeriod, isEditorOpen, primarySubject, selectedClasses, setActiveSectionTab, setAvailSlots, setClassPeriodsMap, setClassSectionsMap, setClassSubjectsMap, setClassTeacherFirstPeriods, setClassTeacherOf, setCustomPrimarySubject, setEditingTeacherId, setIsEditorOpen, setMaxPeriods, setOriginalClassTeacherOf, setPrimarySubject, setSectionPeriodsMap, setSectionSubjectsMap, setSelectedClasses, setSelectedStaffId, setShortName, setSubjectPeriodsMap, setTeacherName, settings, staffList, teachers, unaddedStaff } = ctx;
  // Open Editor for Creating New Teacher (Auto-populates from unadded school staff)
  const handleOpenAdd = () => {
    const defaultStaff = unaddedStaff[0] || null;
    const initialName = defaultStaff ? defaultStaff.full_name : "";
    const initialId = defaultStaff ? defaultStaff.id : null;
    const initialShort = initialName ? generateInitials(initialName) : "";

    setSelectedStaffId(defaultStaff ? defaultStaff.id : "__custom__");
    setEditingTeacherId(initialId);
    setTeacherName(initialName);
    setShortName(initialShort);

    // Try auto-detecting primary subject from designation
    const desig = defaultStaff?.designation || "";
    const matchedSubject = availableSubjectOptions.find((s) =>
      desig.toLowerCase().includes(s.toLowerCase())
    );
    setPrimarySubject(matchedSubject || "");
    setCustomPrimarySubject("");
    setClassTeacherOf("__none__");
    setOriginalClassTeacherOf(null);
    setClassTeacherFirstPeriods(3);

    setMaxPeriods(24);
    setSelectedClasses([]);
    setClassSubjectsMap({});
    setSectionSubjectsMap({});
    setClassSectionsMap({});
    setClassPeriodsMap({});
    setSectionPeriodsMap({});
    setSubjectPeriodsMap({});
    setActiveSectionTab({});

    const defaultSlots: Record<number, number[]> = {};
    settings.workingDays.forEach((d) => {
      defaultSlots[d] = [];
      for (let p = 1; p <= settings.periodsPerDay; p++) defaultSlots[d].push(p);
    });
    setAvailSlots(defaultSlots);
    setIsEditorOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "teachers");
      url.searchParams.set("newTeacher", "1");
      url.searchParams.delete("teacherId");
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleCancel = useCallback(() => {
    setIsEditorOpen(false);
    setEditingTeacherId(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("teacherId");
      url.searchParams.delete("newTeacher");
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Open Editor for Editing Existing Teacher
  const handleEdit = useCallback(
    (t: RoutineTeacher) => {
      if (isEditorOpen && editingTeacherId === t.id) {
        handleCancel();
        return;
      }

      const matchedStaff = staffList.find(
        (s) => s.id === t.id || s.full_name.toLowerCase() === t.name.toLowerCase()
      );

      setSelectedStaffId(matchedStaff ? matchedStaff.id : "__custom__");
      setEditingTeacherId(t.id);
      setTeacherName(t.name);
      setShortName(t.shortName || generateInitials(t.name));

      const subj = t.primarySubject || "";
      const isStandardSubj = availableSubjectOptions.includes(subj);
      if (subj && !isStandardSubj) {
        setPrimarySubject("__custom__");
        setCustomPrimarySubject(subj);
      } else {
        setPrimarySubject(subj);
        setCustomPrimarySubject("");
      }

      setClassTeacherOf(t.classTeacherOf || "__none__");
      setOriginalClassTeacherOf(t.classTeacherOf || null);
      setClassTeacherFirstPeriods(t.classTeacherFirstPeriods ?? 3);
      setMaxPeriods(t.maxPeriods || 24);

      // Load qualified classes, subjects, sections, and periods
      const sanitized = sanitizeTeacherSubjectPeriods(t);
      const qClasses = sanitized.qualifiedClasses || Object.keys(sanitized.classSubjects || {});
      setSelectedClasses(qClasses);
      setClassSubjectsMap(sanitized.classSubjects || {});
      setSectionSubjectsMap(sanitized.sectionSubjects || {});

      // Build robust classSectionsMap, reconstructing from sectionSubjects if classSections was not previously persisted
      const initialSectionsMap: Record<string, string[]> = { ...(sanitized.classSections || {}) };
      qClasses.forEach((cls) => {
        if (!initialSectionsMap[cls] || initialSectionsMap[cls].length === 0) {
          const secSubsKeys = Object.keys(sanitized.sectionSubjects || {}).filter(
            (k) => k.startsWith(`${cls}::`) || k.startsWith(`${cls}-`) || k.startsWith(`${cls}_`)
          );
          if (secSubsKeys.length > 0) {
            const extractedSecs = new Set<string>();
            secSubsKeys.forEach((k) => {
              const parts = k.includes("::") ? k.split("::") : k.includes("-") ? k.split("-") : k.split("_");
              if (parts[1]) extractedSecs.add(parts[1].trim());
            });
            initialSectionsMap[cls] = Array.from(extractedSecs);
          } else {
            const allSecs = getClassSections(cls);
            initialSectionsMap[cls] = [allSecs[0] || "A"];
          }
        }
      });
      setClassSectionsMap(initialSectionsMap);
      setClassPeriodsMap(sanitized.classPeriods || {});
      setSectionPeriodsMap(sanitized.sectionPeriods || {});
      setSubjectPeriodsMap(sanitized.subjectPeriods || {});
      setActiveSectionTab({});

      // Deep copy available slots
      const slots: Record<number, number[]> = {};
      settings.workingDays.forEach((d) => {
        const raw = t.availableSlots?.[d] ?? (t.availableSlots as any)?.[String(d)];
        if (Array.isArray(raw)) {
          slots[d] = [...raw];
        } else {
          slots[d] = [];
          for (let p = 1; p <= settings.periodsPerDay; p++) slots[d].push(p);
        }
      });
      setAvailSlots(slots);
      setIsEditorOpen(true);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "teachers");
        url.searchParams.set("teacherId", t.id);
        url.searchParams.delete("newTeacher");
        window.history.replaceState(null, "", url.toString());
      }
    },
    [isEditorOpen, editingTeacherId, handleCancel, staffList, availableSubjectOptions, settings, getClassSections]
  );

  // Auto-restore teacher editor once on initial mount if URL contains teacherId or newTeacher flag
  const hasRestoredEditorRef = useRef(false);
  useEffect(() => {
    if (hasRestoredEditorRef.current) return;
    if (typeof window !== "undefined" && teachers.length > 0 && !isEditorOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tab") === "teachers") {
        const tId = urlParams.get("teacherId");
        if (tId) {
          const target = teachers.find((t) => t.id === tId);
          if (target) {
            hasRestoredEditorRef.current = true;
            handleEdit(target);
            return;
          }
        }
        if (urlParams.get("newTeacher") === "1") {
          hasRestoredEditorRef.current = true;
          handleOpenAdd();
        }
      }
    }
  }, [teachers, isEditorOpen, handleEdit]);

  // Handle Staff Dropdown Change in Form
  const handleStaffDropdownChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (staffId === "__custom__") {
      setEditingTeacherId(null);
      setTeacherName("");
      setShortName("");
      setPrimarySubject("");
      setCustomPrimarySubject("");
      setClassTeacherOf("__none__");
    } else {
      const staff = staffList.find((s) => s.id === staffId);
      if (staff) {
        setEditingTeacherId(staff.id);
        setTeacherName(staff.full_name);
        setShortName(generateInitials(staff.full_name));

        const desig = staff.designation || "";
        const matchedSubject = availableSubjectOptions.find((s) =>
          desig.toLowerCase().includes(s.toLowerCase())
        );
        if (matchedSubject) {
          setPrimarySubject(matchedSubject);
        }
      }
    }
  };

  // Handle Custom Name typing
  const handleCustomNameChange = (name: string) => {
    setTeacherName(name);
    setShortName(generateInitials(name));
  };

  // Toggle class selection for this teacher
  const toggleClass = (clsName: string) => {
    const isSelected = selectedClasses.includes(clsName);
    if (isSelected) {
      setSelectedClasses((prev) => prev.filter((c) => c !== clsName));
      setClassSubjectsMap((prev) => {
        const next = { ...prev };
        delete next[clsName];
        return next;
      });
      setClassSectionsMap((prev) => {
        const next = { ...prev };
        delete next[clsName];
        return next;
      });
      setClassPeriodsMap((prev) => {
        const next = { ...prev };
        delete next[clsName];
        return next;
      });
      setSectionPeriodsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`) || k.startsWith(`${clsName}_`)) {
            delete next[k];
          }
        });
        return next;
      });
      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${clsName}::`) || k.startsWith(`${clsName}-`)) {
            delete next[k];
          }
        });
        return next;
      });
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${clsName}::`)) {
            delete next[k];
          }
        });
        return next;
      });
    } else {
      setSelectedClasses((prev) => [...prev, clsName]);
      // Pre-tick only the teacher's own subject; every other subject is ticked by hand
      const defaultSubs = classSubjectsDictionary[clsName] || [];
      const initialSubs =
        primarySubject && primarySubject !== "__custom__" && defaultSubs.includes(primarySubject) ? [primarySubject] : [];

      setClassSubjectsMap((prev) => ({
        ...prev,
        [clsName]: initialSubs,
      }));

      // Initialize ONLY the first section so Section B does NOT get pre-assigned unless "ALL" is chosen
      const defaultSecs = getClassSections(clsName);
      const firstSec = defaultSecs[0] || "A";

      setActiveSectionTab((prev) => ({
        ...prev,
        [clsName]: firstSec,
      }));

      setClassSectionsMap((prev) => ({
        ...prev,
        [clsName]: [firstSec],
      }));

      // Initialize ONLY the first section's subjects with initialSubs
      setSectionSubjectsMap((prev) => ({
        ...prev,
        [`${clsName}::${firstSec}`]: [...initialSubs],
      }));

      // Initialize default periods for the first section only
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        initialSubs.forEach((sub) => {
          next[`${clsName}::${firstSec}::${sub}`] = getSubjectDefaultPeriod(clsName, sub);
        });
        return next;
      });
    }
  };

  const handleSelectSection = (
    clsName: string,
    sec: string,
    action?: "select" | "deselect" | "toggle"
  ) => {
    const allSecs = getClassSections(clsName);
    if (sec === "ALL") {
      setClassSectionsMap((prev) => ({ ...prev, [clsName]: [...allSecs] }));
      return;
    }

    let isDeselecting = false;
    setClassSectionsMap((prev) => {
      const current = prev[clsName] ?? [allSecs[0] || "A"];
      const isSelected = current.includes(sec);
      let nextSecs: string[];

      if (action === "select") {
        nextSecs = isSelected ? current : [...current, sec];
      } else if (action === "deselect") {
        nextSecs = current.filter((s) => s !== sec);
        isDeselecting = true;
      } else {
        // Default toggle
        if (isSelected) {
          nextSecs = current.filter((s) => s !== sec);
          isDeselecting = true;
        } else {
          nextSecs = [...current, sec];
        }
      }

      return {
        ...prev,
        [clsName]: nextSecs,
      };
    });

    if (isDeselecting) {
      // Clean up section subjects and subject periods for the deselected section
      setSectionSubjectsMap((prev) => {
        const next = { ...prev };
        delete next[`${clsName}::${sec}`];
        delete next[`${clsName}-${sec}`];
        delete next[`${clsName}_${sec}`];
        return next;
      });
      setSubjectPeriodsMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (
            k.startsWith(`${clsName}::${sec}::`) ||
            k.startsWith(`${clsName}-${sec}-`) ||
            k.startsWith(`${clsName}_${sec}_`) ||
            k.startsWith(`${clsName}-${sec}::`) ||
            k.startsWith(`${clsName}_${sec}::`)
          ) {
            delete next[k];
          }
        });
        return next;
      });
    }
  };


  return {
    handleCancel,
    handleCustomNameChange,
    handleEdit,
    handleOpenAdd,
    handleSelectSection,
    handleStaffDropdownChange,
    hasRestoredEditorRef,
    toggleClass,
  };
}

export type TeachersEditorState = ReturnType<typeof useTeachersEditor>;
