"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Student } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X, Users, UserCheck, UserX, RotateCcw, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StudentRosterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  students: Student[];
  rollFrom?: number;
  rollTo?: number;
  regNoFrom?: string;
  regNoTo?: string;
  isHs?: boolean;
  initialExcludedIds?: string[];
  onSave: (excludedIds: string[]) => void;
}

export function StudentRosterDialog({
  isOpen,
  onClose,
  title,
  students,
  rollFrom,
  rollTo,
  regNoFrom,
  regNoTo,
  isHs = false,
  initialExcludedIds = [],
  onSave,
}: StudentRosterDialogProps) {
  const [search, setSearch] = useState("");
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set(initialExcludedIds));

  // Reset internal state when dialog opens or initialExcludedIds changes
  useEffect(() => {
    if (isOpen) {
      setExcludedIds(new Set(initialExcludedIds));
      setSearch("");
    }
  }, [isOpen, initialExcludedIds]);

  // Determine if a student is within the active range boundaries
  const isStudentInRange = (s: Student): boolean => {
    if (isHs) {
      const reg = (s.boardRegistrationNo || "").trim();
      if (!reg) {
        // If range boundaries are defined, students with missing reg cannot fall inside
        return !regNoFrom && !regNoTo;
      }
      if (regNoFrom && regNoFrom.trim() && reg.localeCompare(regNoFrom.trim(), undefined, { numeric: true }) < 0) {
        return false;
      }
      if (regNoTo && regNoTo.trim() && reg.localeCompare(regNoTo.trim(), undefined, { numeric: true }) > 0) {
        return false;
      }
      return true;
    }
    const roll = Number(s.presentRoll) || 0;
    if (rollFrom !== undefined && roll < rollFrom) return false;
    if (rollTo !== undefined && roll > rollTo) return false;
    return true;
  };

  // Sort students by natural order (Roll for Junior, Reg No for HS)
  const sortedStudents = useMemo(() => {
    const list = [...students];
    if (isHs) {
      list.sort((a, b) => {
        const regA = (a.boardRegistrationNo || "").trim();
        const regB = (b.boardRegistrationNo || "").trim();
        // Students with valid Board Registration Numbers come first in alphanumeric order
        if (regA && regB) {
          return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
        }
        if (regA && !regB) return -1;
        if (!regA && regB) return 1;
        // Fallback: students without registration numbers sorted by class roll
        return (Number(a.presentRoll) || 0) - (Number(b.presentRoll) || 0);
      });
    } else {
      list.sort((a, b) => (Number(a.presentRoll) || 0) - (Number(b.presentRoll) || 0));
    }
    return list;
  }, [students, isHs]);

  // Students in active range
  const studentsInRange = useMemo(() => {
    return sortedStudents.filter(isStudentInRange);
  }, [sortedStudents, rollFrom, rollTo, regNoFrom, regNoTo, isHs]);

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return sortedStudents;
    const q = search.trim().toLowerCase();
    return sortedStudents.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const roll = String(s.presentRoll || "");
      const reg = (s.boardRegistrationNo || "").toLowerCase();
      const id = (s.schoolId || s.id || "").toLowerCase();
      return name.includes(q) || roll.includes(q) || reg.includes(q) || id.includes(q);
    });
  }, [sortedStudents, search]);

  // Counts
  const totalCount = sortedStudents.length;
  const inRangeCount = studentsInRange.length;
  const excludedInRangeCount = studentsInRange.filter((s) => excludedIds.has(s.id)).length;
  const activeSelectedCount = inRangeCount - excludedInRangeCount;

  // Toggle single student exclusion
  const handleToggleStudent = (studentId: string, inRange: boolean) => {
    if (!inRange) return; // Cannot toggle students outside roll range
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Bulk actions (apply only to in-range students)
  const handleSelectAllInRange = () => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      studentsInRange.forEach((s) => next.delete(s.id));
      return next;
    });
  };

  const handleDeselectAllInRange = () => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      studentsInRange.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const handleReset = () => {
    setExcludedIds(new Set());
  };

  const handleSave = () => {
    onSave(Array.from(excludedIds));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-4xl! w-[95vw] sm:max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 sm:px-6 border-b border-border/80 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Users className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground tracking-tight truncate">
                {title} — Student Roster
              </DialogTitle>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-muted/50 border-border/70 text-foreground font-semibold">
              {activeSelectedCount} / {inRangeCount} Seated
            </Badge>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* Toolbar: Search & Statistics */}
        <div className="p-3.5 sm:px-6 bg-muted/15 border-b border-border/60 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, roll, reg no, or student ID..."
                className="pl-9 h-8.5 text-xs rounded-xl bg-background border-border/70 shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllInRange}
                className="h-8 text-[11px] font-semibold gap-1.5 px-2.5 rounded-lg cursor-pointer border-border/70 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 shadow-2xs"
              >
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" /> Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAllInRange}
                className="h-8 text-[11px] font-semibold gap-1.5 px-2.5 rounded-lg cursor-pointer border-border/70 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400 shadow-2xs"
              >
                <Square className="h-3.5 w-3.5 text-rose-500" /> Deselect All
              </Button>
              {excludedIds.size > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-[11px] font-semibold gap-1 px-2 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Reset all exclusions"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <strong className="text-foreground">{activeSelectedCount}</strong> Candidates Active
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <strong className="text-foreground">{excludedInRangeCount}</strong> Manually Excluded
            </span>
            {totalCount > inRangeCount && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-muted-foreground/80">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
                  <strong>{totalCount - inRangeCount}</strong> Outside Roll Range
                </span>
              </>
            )}
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] min-h-[260px] p-0">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No students found matching &quot;{search}&quot;.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/80 z-10">
                <tr>
                  <th className="py-2.5 pl-4 sm:pl-6 pr-2 w-12 text-center">Status</th>
                  <th className="py-2.5 px-3 w-32 font-mono">
                    {isHs ? "Reg No" : "Roll"}
                  </th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 font-mono hidden sm:table-cell">Student ID</th>
                  <th className="py-2.5 px-4 text-right w-28">Seating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredStudents.map((s) => {
                  const inRange = isStudentInRange(s);
                  const isExcluded = excludedIds.has(s.id);
                  const isSeated = inRange && !isExcluded;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleToggleStudent(s.id, inRange)}
                      className={cn(
                        "transition-colors",
                        inRange ? "cursor-pointer" : "opacity-45 bg-muted/15 cursor-not-allowed",
                        isSeated && inRange && "hover:bg-primary/5",
                        !isSeated && inRange && "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70"
                      )}
                    >
                      <td className="py-2.5 pl-4 sm:pl-6 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSeated}
                          disabled={!inRange}
                          onCheckedChange={() => handleToggleStudent(s.id, inRange)}
                          className={cn(
                            "cursor-pointer",
                            !inRange && "cursor-not-allowed"
                          )}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        {isHs ? (
                          <div className="flex flex-col">
                            {s.boardRegistrationNo && s.boardRegistrationNo.trim() ? (
                              <span className="font-mono font-bold text-foreground text-xs tracking-tight">
                                {s.boardRegistrationNo}
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                Missing Reg
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Roll {s.presentRoll}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-foreground">
                            #{s.presentRoll}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <span className={cn(!isSeated && inRange && "line-through text-muted-foreground")}>
                          {s.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px] hidden sm:table-cell">
                        {s.schoolId || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {!inRange ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/60">
                            Out of Range
                          </Badge>
                        ) : isSeated ? (
                          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 py-0 h-5 font-semibold">
                            <UserCheck className="h-2.5 w-2.5" /> Seated
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 py-0 h-5 font-semibold">
                            <UserX className="h-2.5 w-2.5" /> Excluded
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 sm:px-6 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground font-medium">
            <strong className="text-foreground font-bold">{activeSelectedCount}</strong> students will be seated
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold h-8.5 px-3.5 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="text-xs font-semibold h-8.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
            >
              Apply Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
