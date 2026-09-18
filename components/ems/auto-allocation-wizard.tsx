"use client";

import React, { useState } from "react";
import { Student } from "@/lib/types";
import { AutoAllocationClassInput, ExamType } from "@/lib/ems/types";
import {
  normalizeClassCode,
  normalizeSectionCode,
  isHigherSecondaryClass,
  toShortStream,
  checkMissingHsRegistrationNos,
  MissingHsStudentInfo,
} from "@/lib/ems/seat-arrangement-algorithm";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  X,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClassColorStyle } from "./seat-card";

export interface HsStudentStats {
  count: number;
  totalEnrolled: number;
  minRegNo: string;
  maxRegNo: string;
  regNoFrom: string;
  regNoTo: string;
  missingRegCount: number;
  missingStudents: Student[];
}

export const calculateHsStudentStats = (
  students: Student[],
  className: string,
  stream: string = "ALL",
  gender: string = "ALL",
  customRegNoFrom?: string,
  customRegNoTo?: string
): HsStudentStats => {
  const normClass = normalizeClassCode(className);
  const streamShort = stream && stream !== "ALL" ? toShortStream(stream) : null;
  const isBoyFilter =
    gender && gender !== "ALL"
      ? gender.toLowerCase().startsWith("boy") || gender.toLowerCase() === "male"
      : null;

  const matched = students.filter((s) => {
    if (s.currentStatus && s.currentStatus !== "Continuing") return false;
    if (normalizeClassCode(s.presentClass) !== normClass) return false;
    if (streamShort && toShortStream(s.academicStream) !== streamShort) return false;
    if (isBoyFilter !== null) {
      if (isBoyFilter && s.gender !== "Male") return false;
      if (!isBoyFilter && s.gender !== "Female") return false;
    }
    return true;
  });

  const missingStudents = matched.filter(
    (s) => !s.boardRegistrationNo || s.boardRegistrationNo.trim() === ""
  );

  if (matched.length === 0) {
    return {
      count: 0,
      totalEnrolled: 0,
      minRegNo: "",
      maxRegNo: "",
      regNoFrom: customRegNoFrom || "",
      regNoTo: customRegNoTo || "",
      missingRegCount: 0,
      missingStudents: [],
    };
  }

  // Sort by board registration number (natural alphanumeric sort)
  const sorted = [...matched].sort((a, b) => {
    const regA = (a.boardRegistrationNo || "").trim() || `${a.presentRoll}`;
    const regB = (b.boardRegistrationNo || "").trim() || `${b.presentRoll}`;
    return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
  });

  const validRegs = sorted
    .map((s) => (s.boardRegistrationNo || "").trim())
    .filter(Boolean);

  const minRegNo = validRegs[0] || "";
  const maxRegNo = validRegs[validRegs.length - 1] || "";

  const effectiveRegFrom = customRegNoFrom !== undefined ? customRegNoFrom : minRegNo;
  const effectiveRegTo = customRegNoTo !== undefined ? customRegNoTo : maxRegNo;

  let inRange = sorted;
  if (effectiveRegFrom && effectiveRegFrom.trim()) {
    const fromVal = effectiveRegFrom.trim();
    const fromIdx = inRange.findIndex(
      (s) => (s.boardRegistrationNo || "").trim().localeCompare(fromVal, undefined, { numeric: true }) >= 0
    );
    if (fromIdx !== -1) inRange = inRange.slice(fromIdx);
  }
  if (effectiveRegTo && effectiveRegTo.trim()) {
    const toVal = effectiveRegTo.trim();
    const toIdx = inRange.findLastIndex(
      (s) => (s.boardRegistrationNo || "").trim().localeCompare(toVal, undefined, { numeric: true }) <= 0
    );
    if (toIdx !== -1) inRange = inRange.slice(0, toIdx + 1);
  }

  return {
    count: inRange.length,
    totalEnrolled: matched.length,
    minRegNo,
    maxRegNo,
    regNoFrom: effectiveRegFrom,
    regNoTo: effectiveRegTo,
    missingRegCount: missingStudents.length,
    missingStudents,
  };
};

// Warning Dialog for HS Students missing Board Registration Numbers
export interface MissingHsRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingStudents: MissingHsStudentInfo[];
  onProceed: () => void;
}

export function MissingHsRegistrationDialog({
  open,
  onOpenChange,
  missingStudents,
  onProceed,
}: MissingHsRegistrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-border shadow-2xl backdrop-blur-xl bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Missing Board Registration Numbers Detected
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {missingStudents.length} Higher Secondary (Class XI/XII) student(s) do not have a Board Registration Number.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1 text-xs">
            <p className="font-semibold">Important Board Exam Notice:</p>
            <p className="text-[11px] leading-relaxed opacity-90">
              For Classes XI & XII, seat arrangement and desk slips are generated strictly by Board Registration Number.
              Students with missing registration numbers will temporarily fallback to their class roll number.
            </p>
          </div>

          <div className="border border-border/80 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border/80 sticky top-0">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Class</th>
                  <th className="p-2">Stream</th>
                  <th className="p-2">Roll</th>
                  <th className="p-2">Gender</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {missingStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="p-2 font-medium text-foreground">{s.name}</td>
                    <td className="p-2 font-mono">{s.presentClass}</td>
                    <td className="p-2">{s.academicStream ? toShortStream(s.academicStream) : "—"}</td>
                    <td className="p-2 font-mono">{s.presentRoll}</td>
                    <td className="p-2">{s.gender}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t border-border/60 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold cursor-pointer"
          >
            Review & Edit in Directory
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onProceed();
            }}
            className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
          >
            Continue with Allocation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
