"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, RefreshCw, AlertCircle } from "lucide-react";
import { cn, STATUS_STYLES } from "@/lib/utils";
import type { AcademicHistoryEntry, StudentStatus } from "@/lib/types";
import { StatusBadge } from "@/components/students/status-badge";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HistoryTimelineProps {
  history: AcademicHistoryEntry[];
  studentId?: string;
}

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const STATUSES: StudentStatus[] = ["Continuing", "Drop Out", "Passed Out", "Sent Up M.P.", "C.C.H.S."];

export function HistoryTimeline({ history, studentId }: HistoryTimelineProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  
  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Edit Dialog state
  const [editingEntry, setEditingEntry] = useState<AcademicHistoryEntry | null>(null);
  const [editClass, setEditClass] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editRoll, setEditRoll] = useState(1);
  const [editStatus, setEditStatus] = useState<StudentStatus>("Continuing");
  const [errorMsg, setErrorMsg] = useState("");

  // Check role
  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setIsAdmin(roleData?.role === "Admin");
      }
    }
    checkRole();
  }, [supabase]);

  // Mutation to save history correction
  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/students/${studentId}/history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save correction");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries so student profile updates instantly
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
      setEditingEntry(null);
      setErrorMsg("");
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "An error occurred");
    },
  });

  const handleEditClick = (entry: AcademicHistoryEntry) => {
    setEditingEntry(entry);
    setEditClass(entry.class);
    setEditSection(entry.section);
    setEditRoll(entry.roll);
    setEditStatus(entry.status);
    setErrorMsg("");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClass || !editSection || !editStatus) {
      setErrorMsg("All fields are required");
      return;
    }
    setErrorMsg("");
    
    mutation.mutate({
      year: editingEntry?.year,
      class: editClass,
      section: editSection.toUpperCase(),
      roll: editRoll,
      status: editStatus,
    });
  };

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No academic history recorded.
      </p>
    );
  }

  const sorted = [...history].sort((a, b) => b.year - a.year); // descending to show newest first

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

      <div className="flex flex-col gap-0">
        {sorted.map((entry, idx) => {
          const styles = STATUS_STYLES[entry.status];
          const isCurrentYear = idx === 0; // since it's sorted descending, index 0 is newest

          return (
            <div key={`${entry.year}-${idx}`} className="relative flex gap-4">
              {/* Dot */}
              <div
                className={cn(
                  "relative z-10 mt-3.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-background ring-2",
                  styles.dot,
                  `ring-[${styles.chart}]`
                )}
                style={{ boxShadow: `0 0 0 2px ${styles.chart}` }}
              />

              {/* Card */}
              <div
                className={cn(
                  "mb-4 flex-1 rounded-lg border bg-card px-4 py-3 shadow-sm",
                  isCurrentYear && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {entry.year} — Class {entry.class}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Section {entry.section} · Roll No. {entry.roll}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={entry.status} size="sm" />
                    
                    {isCurrentYear && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}

                    {/* Admin only correction button */}
                    {isAdmin && studentId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => handleEditClick(entry)}
                        title="Correct record"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Correction Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Correct History Record ({editingEntry?.year})</DialogTitle>
              <DialogDescription>
                Correct a historical mistake. Every change is logged in the compliance audit trail.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="class" className="text-xs">Class</Label>
                  <Select value={editClass} onValueChange={(val) => setEditClass(val || "")} disabled={mutation.isPending}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => (
                        <SelectItem key={c} value={c}>Class {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="section" className="text-xs">Section</Label>
                  <Input
                    id="section"
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value.substring(0, 1).toUpperCase())}
                    placeholder="e.g. A"
                    disabled={mutation.isPending}
                    maxLength={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="roll" className="text-xs">Roll Number</Label>
                  <Input
                    id="roll"
                    type="number"
                    value={editRoll}
                    onChange={(e) => setEditRoll(parseInt(e.target.value) || 1)}
                    min={1}
                    disabled={mutation.isPending}
                  />
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="status" className="text-xs">Year-End Status</Label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus((val as StudentStatus) || "Continuing")} disabled={mutation.isPending}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEntry(null)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Correction"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
