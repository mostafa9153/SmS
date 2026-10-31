"use client";

import { apiFetch } from "@/lib/api/client";
import { useState, useMemo, useEffect } from "react";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { RoutineSubjectGroup } from "@/lib/routine/types";
import { getSavedMarksSchemes } from "@/lib/utils/marks-config";
import { getDynamicClassList, FALLBACK_CLASSES, getClassNumericRank } from "@/lib/ems/ems-config-loader";
import { isHsClass, getConfiguredStreamsForClass } from "@/lib/routine/routine-helpers";

import type { RoutineSubjectsTabProps } from "./props";

export function useSubjectsCore({
  subjects,
  settings,
  classes = [],
  groups = [],
  onSaveGroup,
  onDeleteGroup,
  onSaveSubject,
  onBatchSaveSubjects,
  onDeleteSubject,
}: RoutineSubjectsTabProps) {
  // Available distinct classes sorted in standard grade sequence
  const availableClasses = useMemo(() => {
    if (classes.length > 0) {
      const distinctNames = Array.from(new Set(classes.map((c) => c.className)));
      return distinctNames.sort((a, b) => getClassNumericRank(a) - getClassNumericRank(b));
    }
    const dynamicList = getDynamicClassList();
    const list = dynamicList && dynamicList.length > 0 ? dynamicList : FALLBACK_CLASSES;
    return list
      .map((c) => c.name)
      .sort((a, b) => getClassNumericRank(a) - getClassNumericRank(b));
  }, [classes]);

  // Active Class Tab Selection (e.g. "Class V", "Class VI", etc.)
  const [activeClass, setActiveClass] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlCls = urlParams.get("class");
        if (urlCls && urlCls !== "all" && availableClasses.includes(urlCls)) return urlCls;
        const saved = localStorage.getItem("sms_routine_subjects_class");
        if (saved && saved !== "all" && availableClasses.includes(saved)) return saved;
      } catch {}
    }
    return availableClasses[0] || "Class V";
  });

  // Keep activeClass synchronized when classes change
  useEffect(() => {
    if (
      availableClasses.length > 0 &&
      (!activeClass || activeClass === "all" || !availableClasses.includes(activeClass))
    ) {
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const urlCls = urlParams?.get("class");
      const savedCls = typeof window !== "undefined" ? localStorage.getItem("sms_routine_subjects_class") : null;
      const candidate = urlCls || savedCls;
      if (candidate && candidate !== "all" && availableClasses.includes(candidate)) {
        setActiveClass(candidate);
      } else {
        setActiveClass(availableClasses[0]);
      }
    }
  }, [availableClasses, activeClass]);

  // Keep URL & localStorage in sync with activeClass
  useEffect(() => {
    if (typeof window !== "undefined" && activeClass) {
      try {
        localStorage.setItem("sms_routine_subjects_class", activeClass);
      } catch {}
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") === "subjects" && url.searchParams.get("class") !== activeClass) {
        url.searchParams.set("class", activeClass);
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [activeClass]);

  const isCurrentClassHs = isHsClass(activeClass);

  // Configured streams specifically for the active HS class / school
  const configuredStreamsForActive = useMemo(() => {
    if (!isCurrentClassHs) return [];
    return getConfiguredStreamsForClass(activeClass);
  }, [activeClass, isCurrentClassHs]);

  // Active Stream Filter for HS Classes: "all" | "Common" | "Science" | "Commerce" | "Arts"
  const [selectedStream, setSelectedStream] = useState<"all" | "Common" | "Science" | "Commerce" | "Arts">(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlStream = urlParams.get("stream") as any;
        if (urlStream && ["all", "Common", "Science", "Commerce", "Arts"].includes(urlStream)) {
          return urlStream;
        }
        const saved = localStorage.getItem("sms_routine_subjects_stream") as any;
        if (saved && ["all", "Common", "Science", "Commerce", "Arts"].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return "all";
  });

  // Reset selectedStream when activeClass changes or if selectedStream is not configured
  useEffect(() => {
    if (selectedStream !== "all" && selectedStream !== "Common" && !configuredStreamsForActive.includes(selectedStream as any)) {
      setSelectedStream("all");
    }
  }, [configuredStreamsForActive, selectedStream, activeClass]);

  // Keep URL & localStorage in sync with selectedStream
  useEffect(() => {
    if (typeof window !== "undefined" && selectedStream) {
      try {
        localStorage.setItem("sms_routine_subjects_stream", selectedStream);
      } catch {}
      const url = new URL(window.location.href);
      if (url.searchParams.get("tab") === "subjects" && url.searchParams.get("stream") !== selectedStream) {
        url.searchParams.set("stream", selectedStream);
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [selectedStream]);

  // Form State
  const [name, setName] = useState("");
  const [formStream, setFormStream] = useState<"Common" | "Science" | "Commerce" | "Arts" | "General">("General");
  const [isCommonSubject, setIsCommonSubject] = useState(false);
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(5);
  const [isLab, setIsLab] = useState(false);
  const [timePref, setTimePref] = useState<"any" | "morning" | "afternoon">("any");
  const [allowMulti, setAllowMulti] = useState(false);
  const [maxPerDay, setMaxPerDay] = useState<number>(2);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<RoutineSubjectGroup | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  // Dialog-specific edit form state (independent from the add form)
  const [dlgName, setDlgName] = useState("");
  const [dlgPeriodFormat, setDlgPeriodFormat] = useState<"single" | "both" | "lab">("single");
  const [dlgTheoryPeriods, setDlgTheoryPeriods] = useState<number>(5);
  const [dlgLabSessions, setDlgLabSessions] = useState<number>(1);
  const [dlgPeriodsPerWeek, setDlgPeriodsPerWeek] = useState<number>(5);
  const [dlgIsLab, setDlgIsLab] = useState(false);
  const [dlgMaxPerDay, setDlgMaxPerDay] = useState<number>(1);
  const [dlgFormStream, setDlgFormStream] = useState("General");
  const [dlgIsCommon, setDlgIsCommon] = useState(false);
  const [isDlgSubmitting, setIsDlgSubmitting] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [marksSchemeVersion, setMarksSchemeVersion] = useState(0);
  const [marksSchemes, setMarksSchemes] = useState<any[]>([]);

  useEffect(() => {
    try {
      setMarksSchemes(getSavedMarksSchemes());
    } catch {}
  }, [marksSchemeVersion]);

  // Drag-to-reorder: localOrder[classKey] = ordered array of subject ids
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("sms_routine_subjects_order");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Sync saved subject order from cloud API on mount
  useEffect(() => {
    let isMounted = true;
    apiFetch<{ order?: Record<string, string[]> }>("/api/routine/subjects-order")
      .then((data) => {
        if (isMounted && data?.order && typeof data.order === "object") {
          setLocalOrder((prev) => {
            const merged = { ...data.order, ...prev };
            try {
              localStorage.setItem("sms_routine_subjects_order", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // DnD sensors â€” require 5px movement to start drag so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const handleMarksUpdate = () => {
      setMarksSchemeVersion((v) => v + 1);
    };
    window.addEventListener("sms_marks_schemes_updated", handleMarksUpdate);
    return () => {
      window.removeEventListener("sms_marks_schemes_updated", handleMarksUpdate);
    };
  }, []);

  // Target class for form creation
  const targetClassForForm = activeClass || availableClasses[0] || "Class V";


  return {
    activeClass,
    allowMulti,
    availableClasses,
    classes,
    configuredStreamsForActive,
    dialogMode,
    dlgFormStream,
    dlgIsCommon,
    dlgIsLab,
    dlgLabSessions,
    dlgMaxPerDay,
    dlgName,
    dlgPeriodFormat,
    dlgPeriodsPerWeek,
    dlgTheoryPeriods,
    editDialogOpen,
    editGroup,
    editId,
    formStream,
    groups,
    isCommonSubject,
    isCurrentClassHs,
    isDlgSubmitting,
    isLab,
    isSavedRecently,
    isSaving,
    isSubmitting,
    isSyncing,
    localOrder,
    marksSchemeVersion,
    marksSchemes,
    maxPerDay,
    name,
    onBatchSaveSubjects,
    onDeleteGroup,
    onDeleteSubject,
    onSaveGroup,
    onSaveSubject,
    periodsPerWeek,
    selectedStream,
    sensors,
    settings,
    setActiveClass,
    setAllowMulti,
    setDialogMode,
    setDlgFormStream,
    setDlgIsCommon,
    setDlgIsLab,
    setDlgLabSessions,
    setDlgMaxPerDay,
    setDlgName,
    setDlgPeriodFormat,
    setDlgPeriodsPerWeek,
    setDlgTheoryPeriods,
    setEditDialogOpen,
    setEditGroup,
    setEditId,
    setFormStream,
    setIsCommonSubject,
    setIsDlgSubmitting,
    setIsLab,
    setIsSavedRecently,
    setIsSaving,
    setIsSubmitting,
    setIsSyncing,
    setLocalOrder,
    setMarksSchemeVersion,
    setMarksSchemes,
    setMaxPerDay,
    setName,
    setPeriodsPerWeek,
    setSelectedStream,
    setTimePref,
    subjects,
    targetClassForForm,
    timePref,
  };
}

export type SubjectsCoreState = ReturnType<typeof useSubjectsCore>;
