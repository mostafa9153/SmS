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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, sortClasses } from "@/lib/utils";
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
  BookOpen,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  validateGroups,
} from "@/lib/routine/routine-groups";
import { isPooledGroup } from "@/lib/routine/routine-domain";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CustomSelect } from "@/components/ui/custom-select";

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
  return sortClasses(Array.from(new Set(classes.map((c) => c.className))));
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
  return t?.shortName || t?.name || "—";
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
  const confirm = useConfirm();
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
      if (!await confirm({ title: `Delete group "${g.name}"? Members will lose this parallel block.`, destructive: true })) return;
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

        <CustomSelect placeholder="All classes"
          value={filterClass}
          onChange={(v: string) => {
            setFilterClass(v);
            setFilterStream("");
          }}
          searchable={false}
          triggerClassName="h-8 text-xs"
          options={[{ value: "", label: "All classes" }, ...classNameOptions.map((n) => ({ value: n, label: n }))]}
        />

        <CustomSelect placeholder="All streams"
          value={filterStream}
          onChange={(v: string) => setFilterStream(v)}
          disabled={!filterClass}
          searchable={false}
          triggerClassName="h-8 text-xs"
          options={[{ value: "", label: "All streams" }, ...streamOptions.map((s) => ({ value: s, label: s }))]}
        />

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
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleGroups.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState compact icon={Layers} title="No subject groups yet" />
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
        assignments={assignments}
        groups={groups}
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
  assignments: RoutineAssignment[];
  groups: RoutineSubjectGroup[];
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
  assignments,
  groups,
  onSave,
}: GroupDialogProps) {
  const classNameOptions = useMemo(() => uniqueClassNames(classes), [classes]);

  const [name, setName] = useState(editing?.name || "");
  const periodSize: 1 | 2 = editing?.periodSize ?? 1;
  const [scope, setScope] = useState<"class" | "section">(editing?.scope ?? "class");
  const [className, setClassName] = useState<string>(
    editing?.className ||
      (editing?.scope === "section"
        ? classes.find((c) => c.id === editing.sectionIds[0])?.className
        : "") ||
      classNameOptions[0] ||
      ""
  );
  const [stream, setStream] = useState<string>(editing?.stream || "");
  const [sectionIds, setSectionIds] = useState<Set<string>>(
    new Set(
      editing?.scope === "section"
        ? editing.sectionIds
        : classes.filter((c) => c.className === (editing?.className || classNameOptions[0] || "")).map((c) => c.id)
    )
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
  if (options.length < 2) liveIssues.push("Add at least 2 options.");
  const seenSubjects = new Set<string>();
  for (const o of options) {
    if (!o.subjectId) liveIssues.push("Every option needs a subject.");
    if (o.subjectId && seenSubjects.has(o.subjectId)) {
      liveIssues.push("The same subject cannot be listed twice.");
    }
    if (o.subjectId) seenSubjects.add(o.subjectId);
    const other = groups.find(
      (g) =>
        g.id !== editing?.id &&
        g.options.some((x) => x.subjectId === o.subjectId) &&
        g.sectionIds.some((sid) => resolvedSectionIds.includes(sid))
    );
    if (o.subjectId && other) {
      liveIssues.push(
        `${subjectName(subjects, o.subjectId)} is already in group "${other.name}" for these sections.`
      );
    }
  }
  if (resolvedSectionIds.length === 0) liveIssues.push("Scope resolves to zero sections.");
  if (scope === "class" && !className) liveIssues.push("Pick a class.");

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

  const selectClassSections = (cName: string) => {
    setClassName(cName);
    setSectionIds(new Set(classes.filter((c) => c.className === cName).map((c) => c.id)));
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
      const optSubjects = options
        .map((o) => subjects.find((s) => s.id === o.subjectId))
        .filter(Boolean) as RoutineSubject[];
      const periodsPerWeek = Math.max(
        1,
        ...optSubjects.map((s) => s.periodsPerWeek || 0),
        optSubjects.length ? 0 : editing?.periodsPerWeek ?? 2
      );
      const timePref = optSubjects.find((s) => s.timePref !== "any")?.timePref ?? "any";
      const g: RoutineSubjectGroup = {
        id: editing?.id || crypto.randomUUID(),
        name: finalName,
        scope,
        className: scope === "class" ? className : null,
        stream: scope === "class" ? stream || null : null,
        pooled: isPooledGroup(scope),
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

  const classSections = useMemo(
    () => classes.filter((c) => c.className === className),
    [classes, className]
  );

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
          <section className="grid grid-cols-1 sm:grid-cols-1 gap-2.5">
            <div className="space-y-1">
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
                    onClick={() => {
                      setScope(v);
                      if (v === "section" && className) {
                        const ids = classes.filter((c) => c.className === className).map((c) => c.id);
                        if (!ids.some((id) => sectionIds.has(id))) setSectionIds(new Set(ids));
                      }
                    }}
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
            </div>

            {scope === "class" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Class *</Label>
                  <CustomSelect placeholder="—"
                    value={className}
                    onChange={(v: string) => {
                      setClassName(v);
                      setStream("");
                    }}
                    searchable={false}
                    className="w-full"
                    triggerClassName="h-8 text-xs"
                    options={[{ value: "", label: "—" }, ...classNameOptions.map((n) => ({ value: n, label: n }))]}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Stream (optional)</Label>
                  <CustomSelect placeholder="Any"
                    value={stream}
                    onChange={(v: string) => setStream(v)}
                    disabled={streamOptions.length === 0}
                    searchable={false}
                    className="w-full"
                    triggerClassName="h-8 text-xs"
                    options={[{ value: "", label: "Any" }, ...streamOptions.map((s) => ({ value: s, label: s }))]}
                  />
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
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium">Class *</Label>
                  <CustomSelect placeholder="—"
                    value={className}
                    onChange={(v: string) => selectClassSections(v)}
                    searchable={false}
                    className="w-full"
                    triggerClassName="h-8 text-xs"
                    options={[{ value: "", label: "—" }, ...classNameOptions.map((n) => ({ value: n, label: n }))]}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {classSections.map((c) => {
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
                  {classSections.length === 0 && (
                    <div className="text-[11px] text-muted-foreground">No sections.</div>
                  )}
                </div>
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

            <div className="rounded-md border divide-y">
              <div className="grid grid-cols-12 rounded-t-md bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-11 py-2 px-2.5">Subject</div>
                <div className="col-span-1 py-2 px-1 text-center"></div>
              </div>
              {options.map((o) => (
                <div key={o.id} className="grid grid-cols-12 items-center text-xs">
                  <div className="col-span-11 py-1.5 px-2">
                    <CustomSelect placeholder="Select subject"
                      value={o.subjectId}
                      onChange={(v: string) => updateOption(o.id, { subjectId: v, teacherId: "" })}
                      className="w-full"
                      triggerClassName={cn("h-8 text-xs", showErrors && !o.subjectId && "border-destructive ring-destructive/30")}
                      options={[
                        { value: "", label: "Select subject" },
                        ...dialogSubjects.map((s) => ({
                          value: s.id,
                          label: s.name,
                          disabled: s.id !== o.subjectId && options.some((x) => x.subjectId === s.id),
                        })),
                      ]}
                    />
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
              ))}
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

        <DialogFooter className="m-0 mx-0 mb-0 px-5 py-3.5 border-t bg-muted/40 sm:flex-row sm:items-center sm:justify-end w-full shrink-0 gap-3">
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
