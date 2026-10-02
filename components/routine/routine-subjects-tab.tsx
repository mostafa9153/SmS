"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RoutineSubject, RoutineClass } from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  BookOpen,
  Sparkles,
  FlaskConical,
  Clock,
  School,
  Layers,
  Split,
  Share2,
  Atom,
  Briefcase,
  Palette,
  CloudUpload,
  RefreshCw,
  Save,
  GripVertical,
} from "lucide-react";
import { setLocalRoutineState } from "@/lib/supabase/db-routine";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import { syncAllSubjectsFromPresetsToRoutine } from "@/lib/routine/routine-sync";

import {
  getDynamicClassList,
  FALLBACK_CLASSES,
  getClassNumericRank,
  getDatabaseSubjectsForClass,
} from "@/lib/ems/ems-config-loader";
import {
  HS_STREAM_PRESETS,
  detectSubjectStream,
  isHsClass,
  getConfiguredStreamsForClass,
} from "@/lib/routine/routine-helpers";

// Re-export helpers for backward compatibility
export {
  HS_STREAM_PRESETS,
  detectSubjectStream,
  isHsClass,
  getConfiguredStreamsForClass,
};

interface RoutineSubjectsTabProps {
  subjects: RoutineSubject[];
  classes?: RoutineClass[];
  onSaveSubject: (subj: {
    id?: string;
    name: string;
    className?: string | null;
    classId?: string | null;
    stream?: string | null;
    isCommon?: boolean;
    isHard?: boolean;
    isLab?: boolean;
    timePref?: "any" | "morning" | "afternoon";
    allowMultiplePerDay?: boolean;
    maxPerDay?: number | null;
    periodsPerWeek?: number | null;
    sortOrder?: number | null;
  }) => Promise<void>;
  onBatchSaveSubjects?: (subjects: {
    id?: string;
    name: string;
    className?: string | null;
    classId?: string | null;
    stream?: string | null;
    isCommon?: boolean;
    isHard?: boolean;
    isLab?: boolean;
    timePref?: "any" | "morning" | "afternoon";
    allowMultiplePerDay?: boolean;
    maxPerDay?: number | null;
    periodsPerWeek?: number | null;
    sortOrder?: number | null;
  }[]) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
}

export function RoutineSubjectsTab({
  subjects,
  classes = [],
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

  // Active Class Tab Selection (e.g. "Class V", "Class VI", etc. or "all")
  const [activeClass, setActiveClass] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlCls = urlParams.get("class");
        if (urlCls) return urlCls;
        const saved = localStorage.getItem("sms_routine_subjects_class");
        if (saved) return saved;
      } catch {}
    }
    return availableClasses[0] || "Class V";
  });

  // Keep activeClass synchronized when classes change
  useEffect(() => {
    if (
      availableClasses.length > 0 &&
      activeClass !== "all" &&
      !availableClasses.includes(activeClass)
    ) {
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const urlCls = urlParams?.get("class");
      const savedCls = typeof window !== "undefined" ? localStorage.getItem("sms_routine_subjects_class") : null;
      const candidate = urlCls || savedCls;
      if (candidate && (candidate === "all" || availableClasses.includes(candidate))) {
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
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");

  // Dialog-specific edit form state (independent from the add form)
  const [dlgName, setDlgName] = useState("");
  const [dlgPeriodsPerWeek, setDlgPeriodsPerWeek] = useState<number>(5);
  const [dlgIsLab, setDlgIsLab] = useState(false);
  const [dlgTimePref, setDlgTimePref] = useState<"any" | "morning" | "afternoon">("any");
  const [dlgAllowMulti, setDlgAllowMulti] = useState(false);
  const [dlgMaxPerDay, setDlgMaxPerDay] = useState<number>(2);
  const [dlgFormStream, setDlgFormStream] = useState("General");
  const [dlgIsCommon, setDlgIsCommon] = useState(false);
  const [isDlgSubmitting, setIsDlgSubmitting] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [marksSchemeVersion, setMarksSchemeVersion] = useState(0);

  // Drag-to-reorder: localOrder[classKey] = ordered array of subject ids
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({});

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
  const targetClassForForm = activeClass === "all" ? availableClasses[0] || "Class V" : activeClass;

  // Preset subjects for the currently active class and stream (filtered strictly by configured streams & presets)
  const activeClassPresets = useMemo(() => {
    if (activeClass === "all") return [];
    if (isCurrentClassHs) {
      const dbSubs = getDatabaseSubjectsForClass(activeClass);
      let streamPresets: string[] = [];
      if (selectedStream === "Common") streamPresets = HS_STREAM_PRESETS.Common;
      else if (selectedStream === "Science") streamPresets = configuredStreamsForActive.includes("Science") ? HS_STREAM_PRESETS.Science : [];
      else if (selectedStream === "Commerce") streamPresets = configuredStreamsForActive.includes("Commerce") ? HS_STREAM_PRESETS.Commerce : [];
      else if (selectedStream === "Arts") streamPresets = configuredStreamsForActive.includes("Arts") ? HS_STREAM_PRESETS.Arts : [];
      else {
        // All Streams: show Common + ONLY the configured streams presets
        const combined: string[] = [...HS_STREAM_PRESETS.Common];
        if (configuredStreamsForActive.includes("Science")) {
          combined.push(...HS_STREAM_PRESETS.Science);
        }
        if (configuredStreamsForActive.includes("Commerce")) {
          combined.push(...HS_STREAM_PRESETS.Commerce);
        }
        if (configuredStreamsForActive.includes("Arts")) {
          combined.push(...HS_STREAM_PRESETS.Arts);
        }
        streamPresets = combined;
      }
      return Array.from(new Set([...dbSubs, ...streamPresets]));
    }
    return getDatabaseSubjectsForClass(activeClass);
  }, [activeClass, isCurrentClassHs, selectedStream, configuredStreamsForActive, marksSchemeVersion]);


  // Filtered subjects for the active class view & stream (Strictly Deduplicated)
  const currentClassSubjects = useMemo(() => {
    let list = subjects;
    if (activeClass !== "all") {
      const clsLower = activeClass.toLowerCase();
      const presets = new Set(getDatabaseSubjectsForClass(activeClass).map((sub) => sub.toLowerCase()));
      list = subjects.filter(
        (s) =>
          (s.className && s.className.toLowerCase() === clsLower) ||
          (!s.className && presets.has(s.name.toLowerCase()))
      );
    }

    if (isCurrentClassHs && selectedStream !== "all") {
      list = list.filter((s) => {
        const stream = detectSubjectStream(s.name, s.stream);
        if (selectedStream === "Common") return stream === "Common" || s.isCommon;
        return stream === selectedStream || stream === "Common" || s.isCommon;
      });
    }

    // Strict deduplication by subject name + stream to guarantee zero duplicate rows
    const seen = new Map<string, RoutineSubject>();
    for (const s of list) {
      const canonicalName = s.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      const streamKey = isCurrentClassHs
        ? (s.stream || detectSubjectStream(s.name) || "Common").toLowerCase()
        : "general";
      const key = `${canonicalName}::${streamKey}`;
      if (!seen.has(key)) {
        seen.set(key, s);
      }
    }

    const deduped = Array.from(seen.values());

    // Apply local drag order if present for this class/stream key
    const orderKey = `${activeClass}::${selectedStream}`;
    const order = localOrder[orderKey];
    if (order && order.length > 0) {
      const idToSubject = new Map(deduped.map((s) => [s.id, s]));
      const ordered: RoutineSubject[] = [];
      for (const id of order) {
        if (idToSubject.has(id)) ordered.push(idToSubject.get(id)!);
      }
      // Append any new subjects not yet in the saved order
      for (const s of deduped) {
        if (!order.includes(s.id)) ordered.push(s);
      }
      return ordered;
    }

    // Fall back to sortOrder field if present
    return deduped.sort((a, b) => {
      const ao = a.sortOrder ?? 9999;
      const bo = b.sortOrder ?? 9999;
      return ao - bo;
    });
  }, [subjects, activeClass, isCurrentClassHs, selectedStream, localOrder]);

  // Total weekly periods load for the currently active class subjects
  const currentClassTotalPeriods = useMemo(() => {
    return currentClassSubjects.reduce(
      (sum, s) => sum + (s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : (s.isLab ? 2 : 5)),
      0
    );
  }, [currentClassSubjects]);

  // Number of configured subjects per class (Strictly deduplicated)
  const classSubjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      const clsLower = cls.toLowerCase();
      const clsSubs = subjects.filter((s) => s.className && s.className.toLowerCase() === clsLower);
      const seen = new Set<string>();
      clsSubs.forEach((s) => {
        const canonicalName = s.name
          .trim()
          .toLowerCase()
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const streamKey = (s.stream || "general").toLowerCase();
        seen.add(`${canonicalName}::${streamKey}`);
      });
      counts[clsLower] = seen.size;
    });
    const result: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      result[cls] = counts[cls.toLowerCase()] || 0;
    });
    return result;
  }, [subjects, availableClasses]);

  // Total subjects and weekly periods across all configured classes in school
  const totalSchoolSubjects = useMemo(() => {
    const sum = Object.values(classSubjectCounts).reduce((a, b) => a + b, 0);
    return sum > 0 ? sum : subjects.length;
  }, [classSubjectCounts, subjects]);

  const totalSchoolWeeklyPeriods = useMemo(() => {
    return subjects.reduce(
      (sum, s) => sum + (s.periodsPerWeek && s.periodsPerWeek > 0 ? s.periodsPerWeek : (s.isLab ? 2 : 5)),
      0
    );
  }, [subjects]);

  // Handle drag-end: reorder within the current class/stream key
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const orderKey = `${activeClass}::${selectedStream}`;
    const currentIds = currentClassSubjects.map((s) => s.id);
    const oldIdx = currentIds.indexOf(active.id as string);
    const newIdx = currentIds.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(currentIds, oldIdx, newIdx);
    setLocalOrder((prev) => ({ ...prev, [orderKey]: reordered }));
  }, [activeClass, selectedStream, currentClassSubjects]);

  const handleEdit = React.useCallback((s: RoutineSubject) => {
    setEditId(s.id);
    const stream = detectSubjectStream(s.name, s.stream);
    setDlgName(s.name);
    setDlgPeriodsPerWeek(s.periodsPerWeek || (s.isLab ? 2 : 5));
    setDlgIsLab(Boolean(s.isLab));
    setDlgTimePref(s.timePref || "any");
    setDlgAllowMulti(Boolean(s.allowMultiplePerDay));
    setDlgMaxPerDay(s.maxPerDay && s.maxPerDay >= 2 ? s.maxPerDay : 2);
    setDlgFormStream(stream);
    setDlgIsCommon(Boolean(s.isCommon || stream === "Common"));
    setDialogMode("edit");
    setEditDialogOpen(true);
  }, []);

  const handleOpenAddDialog = React.useCallback(() => {
    setEditId(null);
    setDlgName("");
    setDlgPeriodsPerWeek(5);
    setDlgIsLab(false);
    setDlgTimePref("any");
    setDlgAllowMulti(false);
    setDlgMaxPerDay(2);
    setDlgFormStream("General");
    setDlgIsCommon(false);
    setDialogMode("add");
    setEditDialogOpen(true);
  }, []);


  // Handle choosing a preset subject chip
  const handleSelectPresetChip = React.useCallback((subName: string) => {
    const canonicalInput = subName.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    // Check if this subject already exists in the current class
    const existing = currentClassSubjects.find((s) => {
      const canonicalS = s.name.trim().toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
      return canonicalS === canonicalInput || s.name.trim().toLowerCase() === subName.trim().toLowerCase();
    });

    if (existing) {
      // Already added â€” open edit dialog for it
      handleEdit(existing);
      return;
    }

    // New subject â€” just fill the add form
    setEditId(null);
    setName(subName);
    const lower = subName.toLowerCase();
    const detected = detectSubjectStream(subName);
    setFormStream(detected);
    setIsCommonSubject(detected === "Common");

    if (lower.includes("lab") || lower.includes("practical")) {
      setIsLab(true);
      setPeriodsPerWeek(2);
    } else if (lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental")) {
      setIsLab(false);
      setPeriodsPerWeek(2);
    } else {
      setIsLab(false);
      setPeriodsPerWeek(5);
    }
  }, [currentClassSubjects, handleEdit]);


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
  }, []);

  const handleDlgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dlgName.trim()) return;
    setIsDlgSubmitting(true);
    try {
      const finalStream = isCurrentClassHs
        ? dlgIsCommon
          ? "Common"
          : dlgFormStream === "General"
          ? detectSubjectStream(dlgName.trim())
          : dlgFormStream
        : null;

      if (dialogMode === "edit" && editId) {
        const subjectBeingEdited = subjects.find((s) => s.id === editId);
        await onSaveSubject({
          id: editId,
          name: dlgName.trim(),
          className: subjectBeingEdited?.className || targetClassForForm,
          stream: finalStream,
          isCommon: dlgIsCommon || finalStream === "Common",
          isHard: false,
          isLab: dlgIsLab,
          timePref: dlgTimePref,
          allowMultiplePerDay: dlgAllowMulti,
          maxPerDay: dlgAllowMulti ? Number(dlgMaxPerDay) || 2 : 1,
          periodsPerWeek: Number(dlgPeriodsPerWeek) || 5,
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
          isLab: dlgIsLab,
          timePref: dlgTimePref,
          allowMultiplePerDay: dlgAllowMulti,
          maxPerDay: dlgAllowMulti ? Number(dlgMaxPerDay) || 2 : 1,
          periodsPerWeek: Number(dlgPeriodsPerWeek) || 5,
        });
      }
      setEditDialogOpen(false);
      setEditId(null);
    } finally {
      setIsDlgSubmitting(false);
    }
  };



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

      const rows = currentList.map((s) => {
        // Resolve sortOrder from any localOrder entry that contains this subject
        let resolvedOrder: number | null = s.sortOrder ?? null;
        for (const [, orderedIds] of Object.entries(localOrder)) {
          const idx = orderedIds.indexOf(s.id);
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

      setLocalRoutineState({ subjects: currentList });
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

  return (
    <div className="space-y-4 w-full">
      {/* 1. Class Segmented Switcher Tabs */}
      <div className="bg-card border rounded-lg p-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Classes</span>
            <Badge variant="secondary" className="text-[10px] font-mono font-bold">
              {totalSchoolSubjects} Total Subjects
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono bg-background text-foreground border-border/80">
              {totalSchoolWeeklyPeriods} p/wk Total Load
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {activeClass !== "all" && (
              <Button
                type="button"
                size="sm"
                onClick={handleOpenAddDialog}
                className="h-7 text-xs font-semibold gap-1 px-3"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subject
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncFromPresets}
              disabled={isSyncing}
              className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Sync from Presets</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAll}
              disabled={isSaving || subjects.length === 0}
              className={cn(
                "h-7 text-xs font-semibold gap-1.5 px-3 transition-all duration-150 shadow-xs",
                isSavedRecently
                  ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {isSaving ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /><span>Saving...</span></>
              ) : isSavedRecently ? (
                <><Check className="w-3 h-3" /><span>Saved</span></>
              ) : (
                <><Save className="w-3 h-3" /><span>Save</span></>
              )}
            </Button>
          </div>
        </div>


        {/* Horizontal Class Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {availableClasses.map((cls) => {
            const isActive = activeClass === cls;
            const count = classSubjectCounts[cls] || 0;
            const isHs = isHsClass(cls);
            return (
              <button
                key={cls}
                type="button"
                onClick={() => handleSelectClass(cls)}
                className={cn(
                  "px-3 py-1.5 rounded-md flex items-center gap-2 whitespace-nowrap transition-all select-none border text-xs font-semibold",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span>{cls}</span>
                {isHs && (
                  <span className={cn(
                    "text-[9px] px-1 rounded uppercase font-mono tracking-wider",
                    isActive ? "bg-primary-foreground/30 text-primary-foreground" : "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                  )}>
                    HS
                  </span>
                )}
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-mono font-bold leading-tight",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                      : count > 0
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </Badge>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleSelectClass("all")}
            className={cn(
              "px-3 py-1.5 rounded-md flex items-center gap-2 whitespace-nowrap transition-all select-none border text-xs font-semibold",
              activeClass === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <span>All Classes</span>
            <Badge
              variant={activeClass === "all" ? "secondary" : "outline"}
              className={cn(
                "text-[10px] px-1.5 py-0 font-mono font-bold leading-tight",
                activeClass === "all"
                  ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {subjects.length}
            </Badge>
          </button>
        </div>

        {/* Stream Selector Sub-bar (Only for Higher Secondary classes XI and XII - Filtered Strictly by Configured Streams) */}
        {isCurrentClassHs && (
          <div className="mt-2.5 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
                <Split className="w-3.5 h-3.5 text-purple-600" />
                Stream:
              </span>

              {/* All Streams button */}
              <button
                type="button"
                onClick={() => handleSelectStream("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                  selectedStream === "all"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Layers className="w-3 h-3" />
                <span>All Streams</span>
              </button>

              {/* Common Core button */}
              <button
                type="button"
                onClick={() => handleSelectStream("Common")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                  selectedStream === "Common"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                    : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <Share2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>Common (Languages)</span>
              </button>

              {/* Only the streams configured in presets for this class / school */}
              {configuredStreamsForActive.includes("Science") && (
                <button
                  type="button"
                  onClick={() => handleSelectStream("Science")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                    selectedStream === "Science"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Atom className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  <span>Science</span>
                </button>
              )}

              {configuredStreamsForActive.includes("Commerce") && (
                <button
                  type="button"
                  onClick={() => handleSelectStream("Commerce")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                    selectedStream === "Commerce"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Briefcase className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Commerce</span>
                </button>
              )}

              {configuredStreamsForActive.includes("Arts") && (
                <button
                  type="button"
                  onClick={() => handleSelectStream("Arts")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all select-none",
                    selectedStream === "Arts"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs font-bold"
                      : "bg-background text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
                  )}
                >
                  <Palette className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>Arts / Humanities</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncCommonCore}
                disabled={isSyncing || isSubmitting}
                className="h-6 text-[11px] font-semibold gap-1 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Share2 className="w-3 h-3" />
                <span>Sync Common (Bengali & English)</span>
              </Button>
            </div>
          </div>
        )}
      </div>



      </form>


      {/* 3. Subjects Table for Active Class */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {activeClass === "all"
                ? "All Configured Subjects"
                : `${activeClass} Curriculum Subjects`}
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono font-bold">
              {currentClassSubjects.length} Subjects
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/30">
              {currentClassTotalPeriods} p/wk
            </Badge>
            {activeClass !== "all" && (
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/70">
                School Total: {totalSchoolSubjects} Subjects
              </Badge>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                  {activeClass !== "all" && <th className="py-2.5 pl-3 pr-1 w-6" />}
                  <th className="py-2.5 px-4">Subject Name</th>
                  {activeClass === "all" && <th className="py-2.5 px-4">Class</th>}
                  <th className="py-2.5 px-4">Stream / Type</th>
                  <th className="py-2.5 px-4">Weekly Load</th>
                  <th className="py-2.5 px-4">Period Format</th>
                  <th className="py-2.5 px-4">Time Preference</th>
                  <th className="py-2.5 px-4">Daily Policy</th>
                  <th className="py-2.5 px-4 text-right w-20">Actions</th>
                </tr>
              </thead>
              <SortableContext
                items={currentClassSubjects.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y divide-border">
                  {currentClassSubjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeClass === "all" ? 8 : 8}
                        className="py-8 text-center text-muted-foreground"
                      >
                        <BookOpen className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <span>
                          {activeClass === "all"
                            ? "No subjects created yet."
                            : `No subjects configured yet for ${activeClass}${selectedStream !== "all" ? ` (${selectedStream})` : ""}. Select a preset chip or add a subject above.`}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    currentClassSubjects.map((s) => (
                      <SubjectTableRow
                        key={s.id}
                        subject={s}
                        activeClass={activeClass}
                        onEdit={handleEdit}
                        onDelete={onDeleteSubject}
                        isDraggable={activeClass !== "all"}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>

      {/* Add / Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) handleDlgClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              {dialogMode === "add" ? (
                <><Plus className="w-4 h-4 text-primary" />Add Subject to {targetClassForForm}</>
              ) : (
                <><Edit2 className="w-4 h-4 text-primary" />Edit Subject</>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleDlgSubmit} className="space-y-4">
            {/* Subject Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subject Name *</Label>
              {dialogMode === "add" ? (
                <Select
                  value={dlgName || ""}
                  onValueChange={(val) => {
                    if (!val) return;
                    setDlgName(val);
                    const lower = val.toLowerCase();
                    const detected = detectSubjectStream(val);
                    setDlgFormStream(detected);
                    setDlgIsCommon(detected === "Common");
                    if (lower.includes("lab") || lower.includes("practical")) {
                      setDlgIsLab(true); setDlgPeriodsPerWeek(2);
                    } else if (lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental")) {
                      setDlgIsLab(false); setDlgPeriodsPerWeek(2);
                    } else {
                      setDlgIsLab(false); setDlgPeriodsPerWeek(5);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Choose Subject from Presets" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/40 sticky top-0 z-10">
                      {targetClassForForm} Presets
                    </div>
                    {activeClassPresets.map((sub) => {
                      const isAdded = currentClassSubjects.some(
                        (s) => s.name.trim().toLowerCase() === sub.trim().toLowerCase()
                      );
                      return (
                        <SelectItem key={sub} value={sub} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{sub}</span>
                            {isAdded && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">(Added)</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={dlgName}
                  onChange={(e) => setDlgName(e.target.value)}
                  className="h-8 text-xs font-medium"
                  required
                />
              )}
            </div>


            <div className="grid grid-cols-2 gap-3">
              {/* Periods / Week */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Periods / Week *</Label>
                <Input
                  type="number"
                  min={1}
                  max={18}
                  value={dlgPeriodsPerWeek}
                  onChange={(e) => setDlgPeriodsPerWeek(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs font-mono font-semibold"
                  required
                />
              </div>

              {/* Period Format */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Period Format</Label>
                <Select
                  value={dlgIsLab ? "lab" : "single"}
                  onValueChange={(val) => setDlgIsLab(val === "lab")}
                >
                  <SelectTrigger className="h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Format">
                      {dlgIsLab ? "Practical Lab (2 Slots)" : "Single Period (1 Slot)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single" className="text-xs">Single Period (1 Slot)</SelectItem>
                    <SelectItem value="lab" className="text-xs">Practical Lab (2 Slots)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Window */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Time Window</Label>
                <Select
                  value={dlgTimePref}
                  onValueChange={(val) => setDlgTimePref(val as "any" | "morning" | "afternoon")}
                >
                  <SelectTrigger className="h-8 text-xs font-medium bg-background">
                    <SelectValue placeholder="Time Window">
                      {dlgTimePref === "morning" ? "Morning (Before Tiffin)" : dlgTimePref === "afternoon" ? "Afternoon (After Tiffin)" : "Flexible (Anytime)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any" className="text-xs">Flexible (Anytime)</SelectItem>
                    <SelectItem value="morning" className="text-xs">Morning (Before Tiffin)</SelectItem>
                    <SelectItem value="afternoon" className="text-xs">Afternoon (After Tiffin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stream (HS only) */}
              {isCurrentClassHs && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Stream</Label>
                  <Select
                    value={dlgFormStream}
                    onValueChange={(val: any) => { setDlgFormStream(val); setDlgIsCommon(val === "Common"); }}
                  >
                    <SelectTrigger className="h-8 text-xs font-medium bg-background">
                      <SelectValue placeholder="Stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Common" className="text-xs">Common (Languages & Core)</SelectItem>
                      {configuredStreamsForActive.includes("Science") && <SelectItem value="Science" className="text-xs">Science</SelectItem>}
                      {configuredStreamsForActive.includes("Commerce") && <SelectItem value="Commerce" className="text-xs">Commerce</SelectItem>}
                      {configuredStreamsForActive.includes("Arts") && <SelectItem value="Arts" className="text-xs">Arts / Humanities</SelectItem>}
                      <SelectItem value="General" className="text-xs">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Allow Multi-Period */}
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dlgAllowMulti}
                onChange={(e) => setDlgAllowMulti(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>Allow multiple periods in the same day</span>
            </label>

            {dlgAllowMulti && (
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium whitespace-nowrap">Max Periods / Day:</Label>
                <div className="w-28">
                  <Select value={String(dlgMaxPerDay)} onValueChange={(val) => setDlgMaxPerDay(Number(val) || 2)}>
                    <SelectTrigger className="h-7 text-xs font-semibold bg-background">
                      <SelectValue>{dlgMaxPerDay} Periods</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2" className="text-xs">2 Periods / day</SelectItem>
                      <SelectItem value="3" className="text-xs">3 Periods / day</SelectItem>
                      <SelectItem value="4" className="text-xs">4 Periods / day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleDlgClose} className="h-8 text-xs px-3">
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isDlgSubmitting || !dlgName.trim()} className="h-8 text-xs font-semibold px-4 gap-1.5">
                {isDlgSubmitting ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Saving...</span></>
                ) : dialogMode === "add" ? (
                  <><Plus className="h-3.5 w-3.5" /><span>Add Subject</span></>
                ) : (
                  <><Check className="h-3.5 w-3.5" /><span>Save Changes</span></>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SubjectTableRowProps {
  subject: RoutineSubject;
  activeClass: string;
  onEdit: (s: RoutineSubject) => void;
  onDelete: (id: string) => Promise<void>;
  isDraggable?: boolean;
}

const SubjectTableRow = React.memo(function SubjectTableRow({
  subject: s,
  activeClass,
  onEdit,
  onDelete,
  isDraggable = false,
}: SubjectTableRowProps) {
  const subjectStream = detectSubjectStream(s.name, s.stream);
  const isCommon = s.isCommon || subjectStream === "Common";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: s.id, disabled: !isDraggable });

  const rowStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
  };

  return (
    <tr
      ref={setNodeRef}
      style={rowStyle}
      className={cn(
        "hover:bg-muted/30 transition-colors",
        isDragging && "bg-primary/5 shadow-sm"
      )}
    >
      {isDraggable && (
        <td className="pl-3 pr-1 py-2.5 w-6">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${s.name}`}
            title="Drag to reorder"
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none flex items-center"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className="py-2.5 px-4 font-semibold text-foreground">
        <div className="flex items-center gap-1.5">
          <span>{s.name}</span>
          {isCommon && (
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200"
            >
              Common
            </Badge>
          )}
        </div>
      </td>
      {activeClass === "all" && (
        <td className="py-2.5 px-4">
          <Badge variant="outline" className="text-[10px] font-semibold bg-background">
            {s.className || "All Classes"}
          </Badge>
        </td>
      )}
      <td className="py-2.5 px-4">
        {isHsClass(s.className || activeClass) ? (
          subjectStream === "Science" ? (
            <Badge variant="outline" className="text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 gap-1">
              <Atom className="w-2.5 h-2.5" />
              Science
            </Badge>
          ) : subjectStream === "Commerce" ? (
            <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 gap-1">
              <Briefcase className="w-2.5 h-2.5" />
              Commerce
            </Badge>
          ) : subjectStream === "Arts" ? (
            <Badge variant="outline" className="text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 gap-1">
              <Palette className="w-2.5 h-2.5" />
              Arts
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 gap-1">
              <Share2 className="w-2.5 h-2.5" />
              Common Core
            </Badge>
          )
        ) : (
          <span className="text-muted-foreground text-[11px]">General</span>
        )}
      </td>
      <td className="py-2.5 px-4 font-mono font-semibold text-foreground">
        <Badge variant="secondary" className="text-[10px] font-mono font-bold">
          {s.periodsPerWeek || 5} p/wk
        </Badge>
      </td>
      <td className="py-2.5 px-4">
        {s.isLab ? (
          <Badge
            variant="secondary"
            className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 gap-1 font-medium"
          >
            <FlaskConical className="w-2.5 h-2.5 text-blue-600" />
            Lab (Double Slot)
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px]">Single Slot</span>
        )}
      </td>
      <td className="py-2.5 px-4 capitalize text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 opacity-60" />
          <span>
            {s.timePref === "morning"
              ? "Morning Preference"
              : s.timePref === "afternoon"
              ? "Afternoon Preference"
              : "Flexible"}
          </span>
        </div>
      </td>
      <td className="py-2.5 px-4 text-muted-foreground">
        {s.allowMultiplePerDay ? (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 font-semibold"
          >
            Max {s.maxPerDay || 2} / Day
          </Badge>
        ) : (
          <span className="text-[11px]">Max 1 / Day</span>
        )}
      </td>
      <td className="py-2.5 px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(s)}
            aria-label={`Edit ${s.name}`}
            title={`Edit ${s.name}`}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(s.id)}
            aria-label={`Delete ${s.name}`}
            title={`Delete ${s.name}`}
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
});

