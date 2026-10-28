"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { apiFetch } from "@/lib/api/client";
import { toastWithUndo } from "@/lib/undo/client";
import { getSectionsForClass, getSubjectListForClass } from "@/lib/utils/marks-config";
import { CLASS_ORDER, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

const ROLE_OPTIONS = [
  { value: "SUBJECT_TEACHER", label: "Subject Teacher" },
  { value: "CLASS_TEACHER", label: "Class Teacher" },
];

export interface ClassAssignment {
  id: string;
  teacherId?: string;
  teacher_id?: string;
  className?: string;
  class_name?: string;
  section: string;
  roleType?: string;
  role_type?: string;
  subject?: string | null;
}

const isClassTeacher = (a: ClassAssignment) => (a.roleType ?? a.role_type) === "CLASS_TEACHER";

/** Assigned classes/subjects for one teacher, with Admin add/remove (both undoable). */
export function ClassScopePanel({
  teacherId,
  assignments,
  onChanged,
}: {
  teacherId: string;
  assignments: ClassAssignment[];
  onChanged: () => void;
}) {
  const [className, setClassName] = useState("V");
  const [section, setSection] = useState("ALL");
  const [roleType, setRoleType] = useState("SUBJECT_TEACHER");
  const [subject, setSubject] = useState("");
  const mine = assignments.filter((a) => (a.teacherId ?? a.teacher_id) === teacherId);
  const sectionOptions = useMemo(() => ["ALL", ...getSectionsForClass(className)], [className]);
  const subjectOptions = useMemo(() => getSubjectListForClass(className), [className]);

  // Mutations (not bare apiFetch) so failures also reach the notification bell.
  const assign = useMutation({
    mutationFn: () =>
      apiFetch<{ undoId?: string }>("/api/teachers/classes", {
        method: "POST",
        json: { teacherId, className, section, roleType, subject: roleType === "SUBJECT_TEACHER" ? subject : undefined },
      }),
    onSuccess: (res) => {
      toastWithUndo(`Class ${className} assigned`, res.undoId, onChanged);
      onChanged();
    },
    onError: (err) => toast.error(err.message || "Could not assign class"),
  });
  const unassign = useMutation({
    mutationFn: (a: ClassAssignment) =>
      apiFetch<{ undoId?: string }>(`/api/teachers/classes?id=${encodeURIComponent(a.id)}`, { method: "DELETE" }),
    onSuccess: (res, a) => {
      toastWithUndo(`Class ${a.className ?? a.class_name} removed`, res.undoId, onChanged);
      onChanged();
    },
    onError: (err) => toast.error(err.message || "Could not remove class"),
  });
  const busy = assign.isPending || unassign.isPending;

  function add() {
    if (roleType === "SUBJECT_TEACHER" && !subject) {
      toast.error("Select a subject");
      return;
    }
    assign.mutate();
  }

  return (
    <>
      <div className="p-3 border-b border-border/60 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <CustomSelect
            value={className}
            onChange={(v) => {
              setClassName(String(v));
              setSection("ALL");
              setSubject("");
            }}
            options={CLASS_ORDER.map((c) => ({ value: c, label: `Class ${c}` }))}
            searchable={false}
          />
          <CustomSelect
            value={section}
            onChange={(v) => setSection(String(v))}
            options={sectionOptions.map((s) => ({ value: s, label: s === "ALL" ? "All sections" : `Sec ${s}` }))}
            searchable={false}
          />
        </div>
        <CustomSelect value={roleType} onChange={(v) => setRoleType(String(v))} options={ROLE_OPTIONS} searchable={false} />
        {roleType === "SUBJECT_TEACHER" && (
          <CustomSelect value={subject} onChange={(v) => setSubject(String(v))} options={subjectOptions} placeholder="Subject" />
        )}
        <Button type="button" size="sm" className="w-full h-8 text-xs" onClick={add} disabled={busy}>
          {assign.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          Assign
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[220px] md:max-h-none">
        {mine.length === 0 ? (
          <EmptyState compact title="No class assignments yet." />
        ) : (
          mine.map((a) => (
            <div key={a.id} className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-foreground">
                  Class {a.className ?? a.class_name} · Sec {a.section}
                </p>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "text-[9px] font-semibold px-1.5 py-0.5 rounded-md border",
                      isClassTeacher(a)
                        ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    )}
                  >
                    {isClassTeacher(a) ? "Class Teacher" : "Subject"}
                  </span>
                  <button
                    type="button"
                    onClick={() => unassign.mutate(a)}
                    disabled={busy}
                    title="Remove"
                    aria-label={`Remove Class ${a.className ?? a.class_name}`}
                    className="p-0.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {unassign.isPending && unassign.variables?.id === a.id ? <Spinner className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              {!isClassTeacher(a) && (
                <p className="text-[10px] text-muted-foreground">
                  Subject: <span className="font-semibold text-foreground">{a.subject || "All Subjects"}</span>
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
