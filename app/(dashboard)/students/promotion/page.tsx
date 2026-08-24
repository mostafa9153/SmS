"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStudents,
  getDistinctClasses,
  getDistinctSections,
  bulkUpdateStudents,
} from "@/lib/data/students";
import type { Student, StudentStatus } from "@/lib/types";
import { StatusBadge } from "@/components/students/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, sortClasses } from "@/lib/utils";
import { ArrowRight, ChevronDown } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const CLASS_NEXT: Record<string, string> = {
  V: "VI", VI: "VII", VII: "VIII", VIII: "IX",
  IX: "X", X: "XI", XI: "XII", XII: "XII",
};

export default function PromotionPage() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [mode, setMode] = useState<"result" | "manual">("result");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<"promote" | "detain" | "transfer" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["students-all"],
    queryFn: getStudents,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["distinct-classes"],
    queryFn: getDistinctClasses,
    staleTime: Infinity,
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["distinct-sections"],
    queryFn: getDistinctSections,
    staleTime: Infinity,
  });

  // Only show active Continuing students for Promotion/Transfer
  const filtered = allStudents.filter(
    (s) =>
      s.currentStatus === "Continuing" &&
      (!selectedClass || s.presentClass === selectedClass) &&
      (!selectedSection || s.presentSection === selectedSection)
  );

  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: (updates: { id: string; changes: Partial<Omit<Student, "id">> }[]) =>
      bulkUpdateStudents(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-all"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setSelectedIds(new Set());
      setConfirmOpen(false);
    },
  });

  function handleConfirm() {
    const currentYear = new Date().getFullYear();
    const updates = filtered
      .filter((s) => selectedIds.has(s.id))
      .map((s) => {
        if (action === "promote") {
          const nextClass = CLASS_NEXT[s.presentClass] ?? s.presentClass;
          
          // 1. Historical record of the class just completed
          const completedClassHistory = {
            year: currentYear - 1,
            class: s.presentClass,
            section: s.presentSection,
            roll: s.presentRoll,
            status: "Continuing" as StudentStatus,
          };

          // 2. New entry for the promoted class
          const newPromotedHistory = {
            year: currentYear,
            class: nextClass,
            section: s.presentSection,
            roll: s.presentRoll,
            status: "Continuing" as StudentStatus,
          };

          return {
            id: s.id,
            changes: {
              presentClass: nextClass,
              currentStatus: "Continuing" as StudentStatus,
              previousClass: s.presentClass,
              previousSection: s.presentSection,
              previousRollNo: s.presentRoll,
              academicHistory: [...(s.academicHistory || []), completedClassHistory, newPromotedHistory],
            },
          };
        } else if (action === "transfer") {
          // Transfer Out (TC Issued)
          const transferHistory = {
            year: currentYear,
            class: s.presentClass,
            section: s.presentSection,
            roll: s.presentRoll,
            status: "Drop Out" as StudentStatus,
          };

          return {
            id: s.id,
            changes: {
              currentStatus: "Drop Out" as StudentStatus,
              academicHistory: [...(s.academicHistory || []), transferHistory],
            },
          };
        } else {
          // Detain (Repeat in same class)
          const detainHistory = {
            year: currentYear,
            class: s.presentClass,
            section: s.presentSection,
            roll: s.presentRoll,
            status: "Continuing" as StudentStatus,
          };

          return {
            id: s.id,
            changes: {
              currentStatus: "Continuing" as StudentStatus,
              academicHistory: [...(s.academicHistory || []), detainHistory],
            },
          };
        }
      });
    mutation.mutate(updates);
  }

  const selectedStudents = filtered.filter((s) => selectedIds.has(s.id));

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl font-bold">Promotion & Transfer</h1>
      </div>

      {/* Controls */}
      <div className="rounded-xl border bg-card p-4 flex flex-wrap gap-4 items-center">
        {/* Class */}
        <div className="min-w-[150px]">
          <CustomSelect
            value={selectedClass}
            onChange={(val) => {
              setSelectedClass(val);
              setSelectedIds(new Set());
            }}
            placeholder="All Classes"
            options={[
              { label: "All Classes", value: "" },
              ...sortClasses(classes).map((c) => ({ label: `Class ${c}`, value: c })),
            ]}
          />
        </div>

        {/* Section */}
        <div className="min-w-[150px]">
          <CustomSelect
            value={selectedSection}
            onChange={(val) => {
              setSelectedSection(val);
              setSelectedIds(new Set());
            }}
            placeholder="All Sections"
            options={[
              { label: "All Sections", value: "" },
              ...sections.map((s) => ({ label: `Section ${s}`, value: s })),
            ]}
          />
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-md border overflow-hidden ml-auto">
          <button
            onClick={() => setMode("result")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "result" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            Result Based
          </button>
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors border-l",
              mode === "manual" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <p className="text-sm font-semibold text-primary">
            {selectedIds.size} student{selectedIds.size > 1 ? "s" : ""} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setAction("promote"); setConfirmOpen(true); }}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs active:scale-95"
            >
              Promote Selected
            </button>
            <button
              onClick={() => { setAction("detain"); setConfirmOpen(true); }}
              className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-2xs active:scale-95"
            >
              Detain Selected
            </button>
            <button
              onClick={() => { setAction("transfer"); setConfirmOpen(true); }}
              className="rounded-xl bg-slate-700 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-2xs active:scale-95"
            >
              Transfer Out (TC)
            </button>
          </div>
        </div>
      )}

      {/* Student table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Name</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Class / Sec / Roll</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">→ After Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No active continuing students match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b last:border-0 transition-colors",
                      selectedIds.has(s.id) ? "bg-primary/5" : "hover:bg-muted/30"
                    )}
                  >
                    <td className="pl-4 pr-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{s.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {s.presentClass} / {s.presentSection} / {s.presentRoll}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={s.currentStatus} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground/60">{s.presentClass}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          Class {CLASS_NEXT[s.presentClass] ?? s.presentClass}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "promote"
                ? "Confirm Promotion"
                : action === "transfer"
                ? "Confirm Transfer (TC Out)"
                : "Confirm Class Detention"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              The following {selectedStudents.length} student(s) will be{" "}
              <strong>
                {action === "promote"
                  ? "promoted to the next academic grade"
                  : action === "transfer"
                  ? "transferred out (TC issued)"
                  : "detained to repeat the same grade"}
              </strong>:
            </p>
            <div className="max-h-48 overflow-y-auto rounded-xl border divide-y text-xs">
              {selectedStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Class {s.presentClass} ({s.presentSection}) — Roll: {s.presentRoll}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {action === "promote" ? (
                      <div className="flex items-center gap-1 font-semibold text-emerald-600">
                        <span>{s.presentClass}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{CLASS_NEXT[s.presentClass] ?? s.presentClass}</span>
                      </div>
                    ) : action === "transfer" ? (
                      <StatusBadge status="Drop Out" size="sm" />
                    ) : (
                      <span className="font-semibold text-amber-600">Repeat Class {s.presentClass}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={mutation.isPending}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-semibold text-white transition-colors shadow-xs active:scale-95",
                  action === "promote"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : action === "transfer"
                    ? "bg-slate-800 hover:bg-slate-900"
                    : "bg-amber-600 hover:bg-amber-700"
                )}
              >
                {mutation.isPending ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
