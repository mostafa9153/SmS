"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  ArrowRight,
  Split,
  Share2,
  Atom,
  Briefcase,
  Palette,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getDynamicClassList,
  FALLBACK_CLASSES,
  getClassNumericRank,
  getDatabaseSubjectsForClass,
} from "@/lib/ems/ems-config-loader";
import {
  getSchoolConfiguredStreams,
  getClassStreamList,
} from "@/lib/utils/school-profile";

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
  }) => Promise<void>;
  onDeleteSubject: (id: string) => Promise<void>;
}

export const HS_STREAM_PRESETS: Record<"Common" | "Science" | "Commerce" | "Arts", string[]> = {
  Common: ["Bengali", "English", "Environmental Studies", "Alternative English", "Hindi", "Urdu"],
  Science: ["Physics", "Chemistry", "Mathematics", "Biological Sciences", "Computer Science", "Nutrition", "Statistics"],
  Commerce: ["Accountancy", "Business Studies", "Economics", "Costing and Taxation", "Commercial Law", "Computer Application"],
  Arts: ["History", "Geography", "Political Science", "Philosophy", "Education", "Sociology", "Sanskrit", "Arabic"],
};

export function detectSubjectStream(name: string, explicitStream?: string | null): "Common" | "Science" | "Commerce" | "Arts" | "General" {
  if (explicitStream && ["Common", "Science", "Commerce", "Arts", "General"].includes(explicitStream)) {
    return explicitStream as any;
  }
  const lower = (name || "").trim().toLowerCase();
  if (lower.includes("bengali") || lower.includes("english") || lower.includes("environmental") || lower.includes("hindi") || lower.includes("urdu")) {
    return "Common";
  }
  if (lower.includes("physics") || lower.includes("chemistry") || lower.includes("math") || lower.includes("biology") || lower.includes("biological") || lower.includes("nutrition") || lower.includes("statistics") || lower.includes("computer science")) {
    return "Science";
  }
  if (lower.includes("account") || lower.includes("business") || lower.includes("costing") || lower.includes("taxation") || lower.includes("commercial law") || lower.includes("computer application")) {
    return "Commerce";
  }
  if (lower.includes("history") || lower.includes("geography") || lower.includes("political") || lower.includes("philosophy") || lower.includes("education") || lower.includes("sociology") || lower.includes("sanskrit") || lower.includes("arabic") || lower.includes("music") || lower.includes("psychology") || lower.includes("journalism")) {
    return "Arts";
  }
  return "General";
}

export function isHsClass(className: string): boolean {
  const norm = (className || "").trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  return ["XI", "XII", "11", "12"].includes(norm) || className.toUpperCase().includes("XI") || className.toUpperCase().includes("XII");
}

export function getConfiguredStreamsForClass(className: string): Array<"Science" | "Commerce" | "Arts"> {
  if (typeof window === "undefined") return ["Science", "Commerce", "Arts"];
  const dynamicClasses = getDynamicClassList();
  const cleanCode = className.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const target = dynamicClasses.find(
    (c) =>
      c.code.toUpperCase() === cleanCode ||
      c.name.toUpperCase().includes(cleanCode) ||
      c.name.toLowerCase() === className.toLowerCase()
  );

  let rawStreams: string[] = [];
  if (target?.stream && target.stream.trim()) {
    rawStreams = getClassStreamList(target.stream);
  } else {
    rawStreams = getSchoolConfiguredStreams();
  }

  const result: Array<"Science" | "Commerce" | "Arts"> = [];
  rawStreams.forEach((s) => {
    const lower = s.trim().toLowerCase();
    if ((lower.includes("sci") || lower.includes("science")) && !result.includes("Science")) {
      result.push("Science");
    }
    if ((lower.includes("com") || lower.includes("commerce")) && !result.includes("Commerce")) {
      result.push("Commerce");
    }
    if ((lower.includes("art") || lower.includes("humanities")) && !result.includes("Arts")) {
      result.push("Arts");
    }
  });

  return result.length > 0 ? result : ["Science", "Commerce", "Arts"];
}

export function RoutineSubjectsTab({
  subjects,
  classes = [],
  onSaveSubject,
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
  const [activeClass, setActiveClass] = useState<string>(availableClasses[0] || "Class V");

  // Keep activeClass synchronized when classes change
  useEffect(() => {
    if (
      availableClasses.length > 0 &&
      activeClass !== "all" &&
      !availableClasses.includes(activeClass)
    ) {
      setActiveClass(availableClasses[0]);
    }
  }, [availableClasses, activeClass]);

  const isCurrentClassHs = isHsClass(activeClass);

  // Configured streams specifically for the active HS class / school
  const configuredStreamsForActive = useMemo(() => {
    if (!isCurrentClassHs) return [];
    return getConfiguredStreamsForClass(activeClass);
  }, [activeClass, isCurrentClassHs]);

  // Active Stream Filter for HS Classes: "all" | "Common" | "Science" | "Commerce" | "Arts"
  const [selectedStream, setSelectedStream] = useState<"all" | "Common" | "Science" | "Commerce" | "Arts">("all");

  // Reset selectedStream when activeClass changes or if selectedStream is not configured
  useEffect(() => {
    if (selectedStream !== "all" && selectedStream !== "Common" && !configuredStreamsForActive.includes(selectedStream as any)) {
      setSelectedStream("all");
    }
  }, [configuredStreamsForActive, selectedStream, activeClass]);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Target class for form creation
  const targetClassForForm = activeClass === "all" ? availableClasses[0] || "Class V" : activeClass;

  // Preset subjects for the currently active class and stream (filtered strictly by configured streams)
  const activeClassPresets = useMemo(() => {
    if (activeClass === "all") return [];
    if (isCurrentClassHs) {
      if (selectedStream === "Common") return HS_STREAM_PRESETS.Common;
      if (selectedStream === "Science") return configuredStreamsForActive.includes("Science") ? HS_STREAM_PRESETS.Science : [];
      if (selectedStream === "Commerce") return configuredStreamsForActive.includes("Commerce") ? HS_STREAM_PRESETS.Commerce : [];
      if (selectedStream === "Arts") return configuredStreamsForActive.includes("Arts") ? HS_STREAM_PRESETS.Arts : [];
      
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
      return Array.from(new Set(combined));
    }
    return getDatabaseSubjectsForClass(activeClass);
  }, [activeClass, isCurrentClassHs, selectedStream, configuredStreamsForActive]);

  // Filtered subjects for the active class view & stream
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

    return list;
  }, [subjects, activeClass, isCurrentClassHs, selectedStream]);

  // Number of configured subjects per class
  const classSubjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      const clsLower = cls.toLowerCase();
      const count = subjects.filter(
        (s) => s.className && s.className.toLowerCase() === clsLower
      ).length;
      counts[cls] = count;
    });
    return counts;
  }, [subjects, availableClasses]);

  // Handle choosing a preset subject chip
  const handleSelectPresetChip = (subName: string) => {
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
  };

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

      await onSaveSubject({
        id: editId || undefined,
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

  const handleEdit = (s: RoutineSubject) => {
    setEditId(s.id);
    setName(s.name);
    setPeriodsPerWeek(s.periodsPerWeek || (s.isLab ? 2 : 5));
    if (s.className && availableClasses.includes(s.className)) {
      setActiveClass(s.className);
    }
    setIsLab(Boolean(s.isLab));
    setTimePref(s.timePref || "any");
    setAllowMulti(Boolean(s.allowMultiplePerDay));
    setMaxPerDay(s.maxPerDay && s.maxPerDay >= 2 ? s.maxPerDay : 2);
    const stream = detectSubjectStream(s.name, s.stream);
    setFormStream(stream);
    setIsCommonSubject(Boolean(s.isCommon || stream === "Common"));
  };

  const handleCancel = () => {
    setEditId(null);
    setName("");
    setPeriodsPerWeek(5);
    setIsLab(false);
    setTimePref("any");
    setAllowMulti(false);
    setMaxPerDay(2);
    setFormStream("General");
    setIsCommonSubject(false);
  };

  // Auto-Sync Preset Subjects for Active Class
  const handleSyncActiveClass = async () => {
    if (activeClass === "all") {
      await handleSyncAllClasses();
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
      for (const item of filteredToAdd) {
        const lower = item.name.toLowerCase();
        const isLabSubject = lower.includes("lab") || lower.includes("practical");
        const isLightSub = lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental");
        await onSaveSubject({
          name: item.name,
          className: activeClass,
          stream: item.stream || (isCurrentClassHs ? detectSubjectStream(item.name) : null),
          isCommon: item.isCommon || (isCurrentClassHs && item.stream === "Common"),
          isHard: false,
          isLab: isLabSubject,
          timePref: "any",
          allowMultiplePerDay: false,
          maxPerDay: 1,
          periodsPerWeek: isLabSubject || isLightSub ? 2 : 5,
        });
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
      for (const subName of toAdd) {
        const lower = subName.toLowerCase();
        const isLight = lower.includes("environmental");
        await onSaveSubject({
          name: subName,
          className: activeClass,
          stream: "Common",
          isCommon: true,
          isHard: false,
          isLab: false,
          timePref: "any",
          allowMultiplePerDay: false,
          maxPerDay: 1,
          periodsPerWeek: isLight ? 2 : 5,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-Sync All Classes Presets
  const handleSyncAllClasses = async () => {
    const existingKeys = new Set(
      subjects.map((s) => `${(s.className || "").toLowerCase()}::${s.name.trim().toLowerCase()}`)
    );

    const toAdd: { className: string; subjectName: string; stream?: string; isCommon?: boolean }[] = [];
    availableClasses.forEach((cls) => {
      const isHs = isHsClass(cls);
      if (isHs) {
        const classStreams = getConfiguredStreamsForClass(cls);
        const streamEntries = [
          ...HS_STREAM_PRESETS.Common.map((p) => ({ name: p, stream: "Common", isCommon: true })),
          ...(classStreams.includes("Science")
            ? HS_STREAM_PRESETS.Science.map((p) => ({ name: p, stream: "Science", isCommon: false }))
            : []),
          ...(classStreams.includes("Commerce")
            ? HS_STREAM_PRESETS.Commerce.map((p) => ({ name: p, stream: "Commerce", isCommon: false }))
            : []),
          ...(classStreams.includes("Arts")
            ? HS_STREAM_PRESETS.Arts.map((p) => ({ name: p, stream: "Arts", isCommon: false }))
            : []),
        ];
        streamEntries.forEach((entry) => {
          const key = `${cls.toLowerCase()}::${entry.name.trim().toLowerCase()}`;
          if (!existingKeys.has(key)) {
            toAdd.push({ className: cls, subjectName: entry.name.trim(), stream: entry.stream, isCommon: entry.isCommon });
            existingKeys.add(key);
          }
        });
      } else {
        const subs = getDatabaseSubjectsForClass(cls);
        subs.forEach((sub) => {
          const key = `${cls.toLowerCase()}::${sub.trim().toLowerCase()}`;
          if (!existingKeys.has(key)) {
            toAdd.push({ className: cls, subjectName: sub.trim() });
            existingKeys.add(key);
          }
        });
      }
    });

    if (toAdd.length === 0) return;

    setIsSyncing(true);
    try {
      for (const item of toAdd) {
        const lower = item.subjectName.toLowerCase();
        const isLabSubject = lower.includes("lab") || lower.includes("practical");
        const isLightSub = lower.includes("physical education") || lower.includes("work education") || lower.includes("environmental");
        await onSaveSubject({
          name: item.subjectName,
          className: item.className,
          stream: item.stream || null,
          isCommon: item.isCommon || false,
          isHard: false,
          isLab: isLabSubject,
          timePref: "any",
          allowMultiplePerDay: false,
          maxPerDay: 1,
          periodsPerWeek: isLabSubject || isLightSub ? 2 : 5,
        });
      }
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
            <span className="text-xs font-bold text-foreground">Select Class to Manage Curriculum</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncAllClasses}
              disabled={isSyncing || isSubmitting}
              className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Auto-Sync All Classes</span>
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
                onClick={() => {
                  setActiveClass(cls);
                  if (editId) handleCancel();
                }}
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
            onClick={() => {
              setActiveClass("all");
              if (editId) handleCancel();
            }}
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
                onClick={() => setSelectedStream("all")}
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
                onClick={() => setSelectedStream("Common")}
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
                  onClick={() => setSelectedStream("Science")}
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
                  onClick={() => setSelectedStream("Commerce")}
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
                  onClick={() => setSelectedStream("Arts")}
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

      {/* 2. Active Class Configurator Form */}
      <form onSubmit={handleSubmit} autoComplete="off" className="bg-card border rounded-lg p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {editId
                ? `Edit Subject for ${targetClassForForm}`
                : `Configure Subject for ${targetClassForForm}`}
            </h2>
            {isCurrentClassHs && selectedStream !== "all" && (
              <Badge variant="secondary" className="text-[10px] font-bold">
                {selectedStream}
              </Badge>
            )}
          </div>

          {activeClass !== "all" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncActiveClass}
              disabled={isSyncing || isSubmitting}
              className="h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {isSyncing
                ? "Syncing..."
                : isCurrentClassHs && selectedStream !== "all"
                ? `Auto-Sync ${selectedStream} Presets`
                : `Auto-Sync ${activeClass} Presets`}
            </Button>
          )}
        </div>

        {/* Preset Subject Chips for Active Class & Selected Stream */}
        {activeClass !== "all" && (
          <div className="p-3 bg-muted/25 border rounded-md space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span>{activeClass} Curriculum Presets</span>
                {isCurrentClassHs && (
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {selectedStream === "all" ? "All Streams" : selectedStream}
                  </Badge>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Click chip to load
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {activeClassPresets.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">
                  No preset subjects configured for {activeClass}.
                </span>
              ) : (
                activeClassPresets.map((sub) => {
                  const isAlreadyAdded = currentClassSubjects.some(
                    (s) => s.name.trim().toLowerCase() === sub.trim().toLowerCase()
                  );
                  const isCurrent = name.trim().toLowerCase() === sub.trim().toLowerCase();

                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleSelectPresetChip(sub)}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium border transition-all select-none flex items-center gap-1",
                        isCurrent
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                          : isAlreadyAdded
                          ? "bg-muted/50 text-muted-foreground/80 border-border hover:bg-muted"
                          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {isCurrent && <Check className="w-3 h-3 text-primary-foreground" />}
                      <span>{sub}</span>
                      {isAlreadyAdded && !isCurrent && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono">
                          (Added)
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Subject Name *</Label>
            <Input
              type="text"
              placeholder="e.g. Mathematics, Bengali, Physics"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                if (isCurrentClassHs) {
                  const det = detectSubjectStream(val);
                  setFormStream(det);
                  if (det === "Common") setIsCommonSubject(true);
                }
              }}
              className="h-9 text-xs font-medium"
              required
            />
          </div>

          {/* Stream Selector (for HS Classes - Only showing configured streams) */}
          {isCurrentClassHs ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Stream</Label>
              <Select
                value={formStream}
                onValueChange={(val: any) => {
                  setFormStream(val);
                  setIsCommonSubject(val === "Common");
                }}
              >
                <SelectTrigger className="h-9 text-xs font-medium bg-background">
                  <SelectValue placeholder="Select Stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Common" className="text-xs">
                    Common (Languages & Core)
                  </SelectItem>
                  {configuredStreamsForActive.includes("Science") && (
                    <SelectItem value="Science" className="text-xs">
                      Science
                    </SelectItem>
                  )}
                  {configuredStreamsForActive.includes("Commerce") && (
                    <SelectItem value="Commerce" className="text-xs">
                      Commerce
                    </SelectItem>
                  )}
                  {configuredStreamsForActive.includes("Arts") && (
                    <SelectItem value="Arts" className="text-xs">
                      Arts / Humanities
                    </SelectItem>
                  )}
                  <SelectItem value="General" className="text-xs">
                    General
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Periods / Week *</Label>
              <Input
                type="number"
                min={1}
                max={18}
                value={periodsPerWeek}
                onChange={(e) => setPeriodsPerWeek(parseInt(e.target.value, 10) || 1)}
                className="h-9 text-xs font-mono font-semibold"
                required
              />
            </div>
          )}

          {isCurrentClassHs && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Periods / Week *</Label>
              <Input
                type="number"
                min={1}
                max={18}
                value={periodsPerWeek}
                onChange={(e) => setPeriodsPerWeek(parseInt(e.target.value, 10) || 1)}
                className="h-9 text-xs font-mono font-semibold"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Period Format</Label>
            <Select
              value={isLab ? "lab" : "single"}
              onValueChange={(val) => setIsLab(val === "lab")}
            >
              <SelectTrigger className="h-9 text-xs font-medium bg-background">
                <SelectValue placeholder="Period Format">
                  {isLab ? "Practical Lab (2 Consec. Slots)" : "Single Period (1 Slot)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single" className="text-xs">
                  Single Period (1 Slot)
                </SelectItem>
                <SelectItem value="lab" className="text-xs">
                  Practical Lab (2 Consec. Slots)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Time Window Preference</Label>
            <Select
              value={timePref}
              onValueChange={(val) => val && setTimePref(val as "any" | "morning" | "afternoon")}
            >
              <SelectTrigger className="h-9 text-xs font-medium bg-background">
                <SelectValue placeholder="Time Window">
                  {timePref === "morning"
                    ? "Morning Preference (Before Tiffin)"
                    : timePref === "afternoon"
                    ? "Afternoon Preference (After Tiffin)"
                    : "Flexible (Anytime during the day)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any" className="text-xs">
                  Flexible (Anytime during the day)
                </SelectItem>
                <SelectItem value="morning" className="text-xs">
                  Morning Preference (Before Tiffin)
                </SelectItem>
                <SelectItem value="afternoon" className="text-xs">
                  Afternoon Preference (After Tiffin)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* HS Class Common Subject Checkbox + Multi-Period Day Policy with Numeric Max Limit */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t">
          <div className="flex flex-wrap items-center gap-4">
            {isCurrentClassHs && (
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-indigo-700 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30 px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-800">
                <input
                  type="checkbox"
                  checked={isCommonSubject}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsCommonSubject(checked);
                    if (checked) setFormStream("Common");
                  }}
                  className="h-3.5 w-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Share2 className="w-3.5 h-3.5" />
                <span>Common across all streams (Science, Commerce, Arts)</span>
              </label>
            )}

            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allowMulti}
                onChange={(e) => setAllowMulti(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>Allow multiple periods in the same day for {targetClassForForm}</span>
            </label>

            {allowMulti && (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <Label className="text-xs font-medium text-foreground whitespace-nowrap">
                  Max Periods / Day:
                </Label>
                <div className="w-28">
                  <Select
                    value={String(maxPerDay)}
                    onValueChange={(val) => setMaxPerDay(Number(val) || 2)}
                  >
                    <SelectTrigger className="h-7 text-xs font-semibold bg-background">
                      <SelectValue placeholder="Limit">{maxPerDay} Periods</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2" className="text-xs">
                        2 Periods / day
                      </SelectItem>
                      <SelectItem value="3" className="text-xs">
                        3 Periods / day
                      </SelectItem>
                      <SelectItem value="4" className="text-xs">
                        4 Periods / day
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 text-xs px-3"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="h-8 text-xs font-semibold px-4"
            >
              {editId ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add to {targetClassForForm}
                </>
              )}
            </Button>
          </div>
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
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
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
            <tbody className="divide-y divide-border">
              {currentClassSubjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeClass === "all" ? 8 : 7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    <BookOpen className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <span>
                      {activeClass === "all"
                        ? "No subjects created yet."
                        : `No subjects configured yet for ${activeClass}${selectedStream !== "all" ? ` (${selectedStream})` : ""}. Click 'Auto-Sync' above.`}
                    </span>
                  </td>
                </tr>
              ) : (
                currentClassSubjects.map((s) => {
                  const subjectStream = detectSubjectStream(s.name, s.stream);
                  const isCommon = s.isCommon || subjectStream === "Common";

                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
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
                            onClick={() => handleEdit(s)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteSubject(s.id)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

