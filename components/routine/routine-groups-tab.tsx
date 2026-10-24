"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  RoutineClass,
  RoutineSubject,
  RoutineSubjectGroup,
  RoutineGroupOption,
  RoutineTeacher,
  RoutineRoom,
  RoutineAssignment,
  RoutineSettings,
} from "@/lib/routine/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";
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
  Layers,
  Users,
  School,
  BookOpen,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  getGroupsForClass,
  validateGroups,
  teacherGroupLoad,
  groupSlotCost,
} from "@/lib/routine/routine-groups";

// --- Local helpers (keep this component self-contained) ------------------

function parseSectionAndStream(raw: string): { section: string; stream: string } {
  const t = (raw || "").trim();
  const paren = t.match(/^([^()]+?)\s*\(([^()]+)\)\s*$/);
  if (paren) return { section: paren[1].trim(), stream: paren[2].trim() };
  const dash = t.match(/^([^-]+?)\s*-\s*(.+)$/);
  if (dash) return { section: dash[1].trim(), stream: dash[2].trim() };
  if (!t) return { section: "A", stream: "General" };
  return /^[A-Z]{1,3}$/i.test(t)
    ? { section: t, stream: "General" }
    : { section: "A", stream: t };
}

function sectionLabel(cls: RoutineClass): string {
  const { section, stream } = parseSectionAndStream(cls.section || "");
  return stream && stream.toLowerCase() !== "general"
    ? `${cls.className} - ${section} (${stream})`
    : `${cls.className} - ${section}`;
}

function uniqueClassNames(classes: RoutineClass[]): string[] {
  return Array.from(new Set(classes.map((c) => c.className))).sort();
}

function streamsForClass(classes: RoutineClass[], className: string): string[] {
  const set = new Set<string>();
  for (const c of classes) {
    if (c.className !== className) continue;
    const { stream } = parseSectionAndStream(c.section || "");
    if (stream) set.add(stream);
  }
  return Array.from(set).sort();
}

function resolveClassWiseSections(
  classes: RoutineClass[],
  className: string,
  streamFilter: string
): string[] {
  const sf = streamFilter.trim().toLowerCase();
  return classes
    .filter((c) => c.className === className)
    .filter((c) => {
      if (!sf) return true;
      const { stream } = parseSectionAndStream(c.section || "");
      return stream.toLowerCase() === sf;
    })
    .map((c) => c.id);
}

function teacherShort(teachers: RoutineTeacher[], tid: string): string {
  const t = teachers.find((x) => x.id === tid);
  return t?.shortName || t?.name || tid.slice(0, 6);
}

function subjectName(subjects: RoutineSubject[], sid: string): string {
  const s = subjects.find((x) => x.id === sid);
  return s?.name || "—";
}

// --- Props ---------------------------------------------------------------

interface RoutineGroupsTabProps {
  groups: RoutineSubjectGroup[];
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  rooms: RoutineRoom[];
  assignments: RoutineAssignment[];
  settings: RoutineSettings;
  onSaveGroup: (group: RoutineSubjectGroup) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
}

// --- Row (memoized) -------------------------------------------------------

interface GroupRowProps {
  group: RoutineSubjectGroup;
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  onEdit: (g: RoutineSubjectGroup) => void;
  onDelete: (id: string) => void;
}

const GroupRow = React.memo(function GroupRow({
  group,
  classes,
  subjects,
  teachers,
  onEdit,
  onDelete,
}: GroupRowProps) {
  const scopeBadge =
    group.scope === "class"
      ? `Class · ${group.className || "—"}${group.stream ? ` · ${group.stream}` : ""}`
      : `Section · ${group.sectionIds.length}`;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-2 px-3 font-semibold text-foreground">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary/70" />
          {group.name}
          {group.pooled && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-mono">
              POOL
            </Badge>
          )}
        </div>
      </td>
      <td className="py-2 px-3">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-medium",
            group.scope === "class"
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
          )}
        >
          {scopeBadge}
        </Badge>
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-wrap gap-1">
          {group.options.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium"
            >
              <span className="text-foreground">{subjectName(subjects, o.subjectId)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{teacherShort(teachers, o.teacherId)}</span>
            </span>
          ))}
        </div>
      </td>
      <td className="py-2 px-3 font-mono text-[11px]">{group.periodsPerWeek}</td>
      <td className="py-2 px-3 font-mono text-[11px]">{group.periodSize === 2 ? "Double" : "Single"}</td>
      <td className="py-2 px-3 text-right space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(group)}
          aria-label={`Edit ${group.name}`}
          className="h-7 w-7 p-0"
        >
          <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(group.id)}
          aria-label={`Delete ${group.name}`}
          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
});

// --- Main tab -------------------------------------------------------------

export function RoutineGroupsTab({
  groups,
  classes,
  subjects,
  teachers,
  rooms,
  assignments,
  settings,
  onSaveGroup,
  onDeleteGroup,
}: RoutineGroupsTabProps) {
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterStream, setFilterStream] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoutineSubjectGroup | null>(null);

  const visibleGroups = useMemo(() => {
    if (!filterClass && !filterStream) return groups;
    return groups.filter((g) => {
      if (filterClass && g.className !== filterClass && g.scope === "class") return false;
      if (filterStream && g.stream !== filterStream && g.scope === "class") return false;
      if (g.scope === "section" && (filterClass || filterStream)) {
        const names = new Set(
          g.sectionIds
            .map((cid) => classes.find((c) => c.id === cid))
            .filter(Boolean)
            .map((c) => (c as RoutineClass).className)
        );
        if (filterClass && !names.has(filterClass)) return false;
        if (filterStream) {
          const matchesStream = g.sectionIds.some((cid) => {
            const cls = classes.find((c) => c.id === cid);
            if (!cls) return false;
            const { stream } = parseSectionAndStream(cls.section || "");
            return stream.toLowerCase() === filterStream.toLowerCase();
          });
          if (!matchesStream) return false;
        }
      }
      return true;
    });
  }, [groups, filterClass, filterStream, classes]);

  const issues = useMemo(
    () => validateGroups({ groups, assignments, subjects, teachers, classes }),
    [groups, assignments, subjects, teachers, classes]
  );

  const openAdd = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((g: RoutineSubjectGroup) => {
    setEditing(g);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const g = groups.find((x) => x.id === id);
      if (!g) return;
      if (!confirm(`Delete group "${g.name}"? Members will lose this parallel block.`)) return;
      await onDeleteGroup(id);
      showToast({ type: "success", title: "Group deleted", description: g.name });
    },
    [groups, onDeleteGroup]
  );

  const classNameOptions = useMemo(() => uniqueClassNames(classes), [classes]);
  const streamOptions = useMemo(
    () => (filterClass ? streamsForClass(classes, filterClass) : []),
    [classes, filterClass]
  );

  return (
    <div className="space-y-4 w-full">
      {/* Toolbar */}
      <div className="bg-card border rounded-lg p-3 shadow-xs flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-auto">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Subject Groups</h2>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {groups.length}
          </Badge>
          {issues.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {issues.length} issue{issues.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        <select
          value={filterClass}
          onChange={(e) => {
            setFilterClass(e.target.value);
            setFilterStream("");
          }}
          className="h-8 rounded-md border px-2 text-xs bg-background"
        >
          <option value="">All classes</option>
          {classNameOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <select
          value={filterStream}
          onChange={(e) => setFilterStream(e.target.value)}
          disabled={!filterClass}
          className="h-8 rounded-md border px-2 text-xs bg-background disabled:opacity-50"
        >
          <option value="">All streams</option>
          {streamOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <Button size="sm" onClick={openAdd} className="h-8 text-xs font-semibold px-3 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Group
        </Button>
      </div>

      {/* Issues strip */}
      {issues.length > 0 && (
        <div className="bg-card border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 shadow-xs space-y-1">
          {issues.slice(0, 6).map((it, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              {it.severity === "error" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              )}
              <span className="font-semibold text-foreground">{it.groupName}:</span>
              <span className="text-muted-foreground">{it.message}</span>
            </div>
          ))}
          {issues.length > 6 && (
            <div className="text-[11px] text-muted-foreground pl-5">
              +{issues.length - 6} more…
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/20 border-b text-muted-foreground font-semibold">
                <th className="py-2 px-3">Group</th>
                <th className="py-2 px-3">Scope</th>
                <th className="py-2 px-3">Options</th>
                <th className="py-2 px-3">Periods/wk</th>
                <th className="py-2 px-3">Period</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    <Layers className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <div>No subject groups yet.</div>
                  </td>
                </tr>
              ) : (
                visibleGroups.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    classes={classes}
                    subjects={subjects}
                    teachers={teachers}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GroupDialog
        key={editing?.id || "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        rooms={rooms}
        assignments={assignments}
        groups={groups}
        settings={settings}
        onSave={async (g) => {
          await onSaveGroup(g);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

// --- Dialog --------------------------------------------------------------

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RoutineSubjectGroup | null;
  classes: RoutineClass[];
  subjects: RoutineSubject[];
  teachers: RoutineTeacher[];
  rooms: RoutineRoom[];
  assignments: RoutineAssignment[];
  groups: RoutineSubjectGroup[];
  settings: RoutineSettings;
  onSave: (g: RoutineSubjectGroup) => Promise<void>;
}

type DraftOption = {
  id: string;
  subjectId: string;
  teacherId: string;
  roomId: string | null;
};

const QUICK_CHIPS = ["3rd Language", "Elective", "Lab Block"];

function GroupDialog({
  open,
  onOpenChange,
  editing,
  classes,
  subjects,
  teachers,
  rooms,
  assignments,
  groups,
  settings,
  onSave,
}: GroupDialogProps) {
  const classNameOptions = useMemo(() => uniqueClassNames(classes), [classes]);

  const [name, setName] = useState(editing?.name || "");
  const [periodsPerWeek, setPeriodsPerWeek] = useState<number>(editing?.periodsPerWeek ?? 2);
  const [periodSize, setPeriodSize] = useState<1 | 2>(editing?.periodSize ?? 1);
  const [timePref, setTimePref] = useState<"any" | "morning" | "afternoon">(
    editing?.timePref ?? "any"
  );
  const [scope, setScope] = useState<"class" | "section">(editing?.scope ?? "class");
  const [className, setClassName] = useState<string>(editing?.className || classNameOptions[0] || "");
  const [stream, setStream] = useState<string>(editing?.stream || "");
  const [pooled, setPooled] = useState<boolean>(editing?.pooled ?? true);
  const [sectionIds, setSectionIds] = useState<Set<string>>(
    new Set(editing?.scope === "section" ? editing.sectionIds : [])
  );
  const [options, setOptions] = useState<DraftOption[]>(
    editing?.options.length
      ? editing.options.map((o) => ({
          id: o.id,
          subjectId: o.subjectId,
          teacherId: o.teacherId,
          roomId: o.roomId ?? null,
        }))
      : [
          { id: crypto.randomUUID(), subjectId: "", teacherId: "", roomId: null },
          { id: crypto.randomUUID(), subjectId: "", teacherId: "", roomId: null },
        ]
  );
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const resolvedSectionIds = useMemo(() => {
    if (scope === "section") return Array.from(sectionIds);
    if (!className) return [];
    return resolveClassWiseSections(classes, className, stream);
  }, [scope, sectionIds, className, stream, classes]);

  const resolvedSections = useMemo(
    () =>
      resolvedSectionIds
        .map((id) => classes.find((c) => c.id === id))
        .filter(Boolean) as RoutineClass[],
    [resolvedSectionIds, classes]
  );

  // Subject pool for the dialog: subjects attached to any of the member classes,
  // falling back to all subjects when nothing matches (keeps the dropdown useful).
  const dialogSubjects = useMemo(() => {
    if (resolvedSections.length === 0) return subjects;
    const names = new Set(resolvedSections.map((c) => c.className));
    const matched = subjects.filter(
      (s) => (s.className && names.has(s.className)) || !s.className
    );
    return matched.length > 0 ? matched : subjects;
  }, [subjects, resolvedSections]);

  // --- live validation / summary --------------------------------------
  const liveIssues: string[] = [];
  if (!name.trim()) liveIssues.push("Group name is required.");
  if (periodsPerWeek < 1) liveIssues.push("Periods/week must be ≥ 1.");
  if (options.length < 2) liveIssues.push("Add at least 2 options.");
  const seenTeachers = new Set<string>();
  for (const o of options) {
    if (!o.subjectId) liveIssues.push("Every option needs a subject.");
    if (!o.teacherId) liveIssues.push("Every option needs a teacher.");
    if (o.teacherId && seenTeachers.has(o.teacherId)) {
      liveIssues.push("The same teacher cannot run two options.");
    }
    if (o.teacherId) seenTeachers.add(o.teacherId);
  }
  if (resolvedSectionIds.length === 0) liveIssues.push("Scope resolves to zero sections.");
  if (scope === "class" && !className) liveIssues.push("Pick a class.");

  // Common free slots across all picked teachers across working days
  const commonFreeSlots = useMemo(() => {
    const tids = Array.from(new Set(options.map((o) => o.teacherId).filter(Boolean)));
    if (tids.length < 2) return { common: 0, total: 0 };
    const tObjs = tids
      .map((tid) => teachers.find((t) => t.id === tid))
      .filter(Boolean) as RoutineTeacher[];
    if (tObjs.length < 2) return { common: 0, total: 0 };

    const days = settings.workingDays || [];
    const halfDays = new Set(settings.halfDays || []);
    const periodsPerDay = settings.periodsPerDay || 8;
    const halfDayPeriods = settings.halfDayPeriods || periodsPerDay;
    const breaks = new Set(settings.breaks || []);
    let common = 0;
    let total = 0;
    for (const d of days) {
      const dayCap = halfDays.has(d) ? halfDayPeriods : periodsPerDay;
      const availSets = tObjs.map(
        (t) =>
          new Set(
            t.availableSlots?.[String(d)] ||
              t.availableSlots?.[d as unknown as string] ||
              Array.from({ length: periodsPerDay }, (_, i) => i + 1)
          )
      );
      for (let p = 1; p <= periodsPerDay; p++) {
        if (p > dayCap) break;
        total++;
        if (periodSize === 2) {
          if (breaks.has(p)) continue;
          if (p + 1 > dayCap) continue;
          if (!availSets.every((s) => s.has(p) && s.has(p + 1))) continue;
        } else {
          if (!availSets.every((s) => s.has(p))) continue;
        }
        common++;
      }
    }
    return { common, total };
  }, [options, teachers, settings, periodSize]);

  // Capacity: naïve summary of class' remaining weekly slots (uses first section when scope='class')
  const capacitySummary = useMemo(() => {
    if (resolvedSections.length === 0) return null;
    const workingDays = settings.workingDays?.length || 6;
    const periodsPerDay = settings.periodsPerDay || 8;
    const perSectionCap = workingDays * periodsPerDay;
    const first = resolvedSections[0];
    const sectionAssignments = assignments.filter((a) => a.classId === first.id);
    const used =
      sectionAssignments.reduce((n, a) => n + (a.periodsPerWeek || 0), 0) +
      getGroupsForClass(first.id, groups)
        .filter((g) => g.id !== editing?.id)
        .reduce((n, g) => n + groupSlotCost(g), 0);
    const addedByThis = periodsPerWeek * (periodSize === 2 ? 2 : 1);
    return { cap: perSectionCap, used, added: addedByThis };
  }, [resolvedSections, assignments, groups, editing, settings, periodsPerWeek, periodSize]);

  // Flag any option subject that is also an ordinary assignment on a member section
  const ordinaryClash = useMemo(() => {
    for (const sid of resolvedSectionIds) {
      for (const o of options) {
        if (!o.subjectId) continue;
        if (assignments.some((a) => a.classId === sid && a.subjectId === o.subjectId)) {
          return true;
        }
      }
    }
    return false;
  }, [resolvedSectionIds, options, assignments]);

  const uniqueIssues = Array.from(new Set(liveIssues));

  const autoName = useMemo(() => {
    if (name.trim()) return "";
    if (scope === "class" && className) {
      return `${className} · ${stream || "Group"}`;
    }
    if (scope === "section" && resolvedSections.length === 1) {
      return `${sectionLabel(resolvedSections[0])} · Group`;
    }
    return "Elective Block";
  }, [name, scope, className, stream, resolvedSections]);

  const handleQuickChip = (chip: string) => {
    if (!name.trim()) setName(chip);
  };

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), subjectId: "", teacherId: "", roomId: null },
    ]);
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, patch: Partial<DraftOption>) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const toggleSection = (cid: string) => {
    setSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (liveIssues.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      const finalName = name.trim() || autoName;
      const g: RoutineSubjectGroup = {
        id: editing?.id || crypto.randomUUID(),
        name: finalName,
        scope,
        className: scope === "class" ? className : null,
        stream: scope === "class" ? stream || null : null,
        pooled,
        periodsPerWeek,
        periodSize,
        timePref,
        maxPerDay: null,
        sortOrder: editing?.sortOrder ?? 0,
        sectionIds: resolvedSectionIds,
        options: options.map((o, i) => ({
          id: o.id,
          groupId: editing?.id || "",
          subjectId: o.subjectId,
          teacherId: o.teacherId,
          roomId: o.roomId,
          sortOrder: i,
        })),
      };
      await onSave(g);
      showToast({
        type: "success",
        title: editing ? "Group updated" : "Group added",
        description: finalName,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Save failed",
        description: (err as Error)?.message || "Could not save group.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group-by className for section-wise checkbox list
  const classesByName = useMemo(() => {
    const map = new Map<string, RoutineClass[]>();
    for (const c of classes) {
      const list = map.get(c.className) || [];
      list.push(c);
      map.set(c.className, list);
    }
    return map;
  }, [classes]);

  const streamOptions = useMemo(
    () => (className ? streamsForClass(classes, className) : []),
    [classes, className]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {editing ? "Edit Subject Group" : "Add Subject Group"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto flex-1">
          {/* Section 1 — Basics */}
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[11px] font-medium">Name *</Label>
              <Input
                className={cn("h-8 text-xs", showErrors && !name.trim() && "border-destructive")}
                placeholder={autoName || "e.g. 3rd Language"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {!name.trim() && (
                <div className="flex gap-1 pt-0.5">
                  {QUICK_CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleQuickChip(c)}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Periods/wk *</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={1}
                value={periodsPerWeek}
                onChange={(e) => setPeriodsPerWeek(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium">Period size</Label>
              <div className="flex gap-1">
                {([1, 2] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPeriodSize(v)}
                    className={cn(
                      "h-8 flex-1 rounded border text-[11px] font-medium transition",
                      periodSize === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {v === 1 ? "Single" : "Double"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label className="text-[11px] font-medium">Time preference</Label>
              <div className="flex gap-1">
                {(["any", "morning", "afternoon"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTimePref(v)}
                    className={cn(
                      "h-8 flex-1 rounded border text-[11px] font-medium transition capitalize",
                      timePref === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2 — Scope */}
          <section className="border-t pt-2.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <Label className="text-[11px] font-medium mr-auto">Scope</Label>
              <div className="flex rounded-md border overflow-hidden">
                {(["class", "section"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setScope(v)}
                    className={cn(
                      "h-7 px-3 text-[11px] font-medium transition capitalize",
                      scope === v
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {v}-wise
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pooled}
                  onChange={(e) => setPooled(e.target.checked)}
                  disabled={resolvedSectionIds.length < 2}
                  className="h-3.5 w-3.5"
                />
                Pool
              </label>
            </div>

            {scope === "class" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Class *</Label>
                  <select
                    value={className}
                    onChange={(e) => {
                      setClassName(e.target.value);
                      setStream("");
                    }}
                    className="h-8 w-full rounded-md border px-2 text-xs bg-background"
                  >
                    <option value="">—</option>
                    {classNameOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Stream (optional)</Label>
                  <select
                    value={stream}
                    onChange={(e) => setStream(e.target.value)}
                    disabled={streamOptions.length === 0}
                    className="h-8 w-full rounded-md border px-2 text-xs bg-background disabled:opacity-50"
                  >
                    <option value="">Any</option>
                    {streamOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label className="text-[11px] font-medium">Resolved sections</Label>
                  <div className="h-8 rounded-md border px-2 flex items-center text-[11px] bg-muted/30 overflow-x-auto whitespace-nowrap">
                    {resolvedSections.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      resolvedSections.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 mr-1 rounded border bg-background px-1 py-0 text-[10px]"
                        >
                          {sectionLabel(c)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/20 p-2 max-h-40 overflow-y-auto space-y-2">
                {Array.from(classesByName.entries()).map(([cName, list]) => (
                  <div key={cName}>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {cName}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((c) => {
                        const checked = sectionIds.has(c.id);
                        return (
                          <label
                            key={c.id}
                            className={cn(
                              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] cursor-pointer select-none transition",
                              checked
                                ? "bg-primary/10 border-primary/40 text-foreground"
                                : "bg-background hover:bg-muted"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSection(c.id)}
                              className="h-3 w-3"
                            />
                            {sectionLabel(c)}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">No sections configured.</div>
                )}
              </div>
            )}
          </section>

          {/* Section 3 — Options */}
          <section className="border-t pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-medium">Parallel options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="h-7 text-[11px] px-2 gap-1"
              >
                <Plus className="h-3 w-3" />
                Add option
              </Button>
            </div>

            <div className="rounded-md border divide-y overflow-hidden">
              <div className="grid grid-cols-12 bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-5 py-2 px-2.5">Subject</div>
                <div className="col-span-4 py-2 px-2.5">Teacher</div>
                <div className="col-span-2 py-2 px-2.5">Room</div>
                <div className="col-span-1 py-2 px-1 text-center"></div>
              </div>
              {options.map((o) => {
                const teacherLoadNow = o.teacherId ? teacherGroupLoad(o.teacherId, groups) : 0;
                return (
                  <div key={o.id} className="grid grid-cols-12 items-center text-xs">
                    <div className="col-span-5 py-1.5 px-2">
                      <select
                        value={o.subjectId}
                        onChange={(e) => updateOption(o.id, { subjectId: e.target.value })}
                        className={cn(
                          "h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          showErrors && !o.subjectId && "border-destructive ring-destructive/30"
                        )}
                      >
                        <option value="">Select subject</option>
                        {dialogSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4 py-1.5 px-2">
                      <select
                        value={o.teacherId}
                        onChange={(e) => updateOption(o.id, { teacherId: e.target.value })}
                        className={cn(
                          "h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          showErrors && !o.teacherId && "border-destructive ring-destructive/30"
                        )}
                      >
                        <option value="">Select teacher</option>
                        {teachers.map((t) => (
                          <option
                            key={t.id}
                            value={t.id}
                            disabled={t.id !== o.teacherId && options.some((x) => x.teacherId === t.id)}
                          >
                            {t.shortName || t.name}
                            {teacherLoadNow > 0 && t.id === o.teacherId ? ` (load +${teacherLoadNow})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 py-1.5 px-2">
                      <select
                        value={o.roomId || ""}
                        onChange={(e) =>
                          updateOption(o.id, { roomId: e.target.value || null })
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">None</option>
                        {rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 py-1 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeOption(o.id)}
                        disabled={options.length <= 2}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mx-auto"
                        aria-label="Remove option"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {(ordinaryClash || (showErrors && uniqueIssues.length > 0)) && (
            <section className="space-y-1.5 text-[11px] pt-1">
              {ordinaryClash && (
                <div className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-300 dark:border-amber-900/40 rounded-md p-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    An option subject is also an ordinary assignment on a member section — it will be
                    counted ONCE as this group&apos;s period from now on.
                  </span>
                </div>
              )}
              {showErrors &&
                uniqueIssues.map((msg) => (
                  <div key={msg} className="flex items-center gap-1.5 text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{msg}</span>
                  </div>
                ))}
            </section>
          )}
        </div>

        <DialogFooter className="m-0 mx-0 mb-0 px-5 py-3.5 border-t bg-muted/40 sm:flex-row sm:items-center sm:justify-between w-full shrink-0 gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border text-xs shadow-2xs">
              <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-[11px]">Common free:</span>
              <span
                className={cn(
                  "font-mono font-semibold text-xs",
                  commonFreeSlots.common < periodsPerWeek && commonFreeSlots.total > 0
                    ? "text-destructive"
                    : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {commonFreeSlots.common}
              </span>
              <span className="text-muted-foreground text-[11px]">/ {commonFreeSlots.total}</span>
            </div>

            {capacitySummary && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border text-xs shadow-2xs">
                <School className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px]">Capacity:</span>
                <span className="font-mono font-semibold text-foreground text-xs">{capacitySummary.used}</span>
                <span className="text-muted-foreground text-[11px]">/ {capacitySummary.cap}</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                  +{capacitySummary.added}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:shrink-0 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={saving}
              className="h-8 text-xs font-semibold px-3.5 gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {editing ? "Save Changes" : "Add Group"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
