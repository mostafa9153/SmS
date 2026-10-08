"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileCheck,
  FileText,
} from "lucide-react";
import type { StudentResult } from "@/lib/types";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { EvaluationRegisterPrintable } from "./evaluation-register-printable";
import { cn } from "@/lib/utils";

export interface EvaluationPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentResult[];
  academicYear: number | string;
  selectedClass: string;
  selectedSection: string;
  selectedExam: string;
  subjects: string[];
}

export const EvaluationPrintDialog: React.FC<EvaluationPrintDialogProps> = ({
  open,
  onOpenChange,
  students,
  academicYear,
  selectedClass,
  selectedSection,
  selectedExam,
  subjects,
}) => {
  const { profile: schoolProfile } = useSchoolProfile();
  const [printMode, setPrintMode] = useState<"with_marks" | "blank">("with_marks");
  const [zoom, setZoom] = useState<number>(0.85);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 120);
  };

  // Keyboard shortcut Ctrl+P while open
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {/* 1. SCREEN DIALOG MODAL (Strictly hidden during browser print) */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[96vw] h-[92vh] p-0 gap-0 overflow-hidden flex flex-col bg-neutral-900 border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl print:hidden">
          {/* TOP TOOLBAR */}
          <DialogHeader className="px-4 py-3 border-b border-neutral-800 flex flex-row items-center justify-between space-y-0 bg-neutral-950/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <Printer className="h-4 w-4 text-primary" />
              <DialogTitle className="text-sm font-bold text-neutral-100">
                Print Marks & Evaluation Register
              </DialogTitle>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                Class {selectedClass}-{selectedSection} • {students.length} Students
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Print Mode Switcher */}
              <div className="flex items-center p-0.5 bg-neutral-800 rounded-xl border border-neutral-700">
                <button
                  type="button"
                  onClick={() => setPrintMode("with_marks")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    printMode === "with_marks"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>With Marks</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode("blank")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    printMode === "blank"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Blank Register</span>
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center gap-1 bg-neutral-800 rounded-xl px-1.5 py-1 border border-neutral-700 text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
                  className="p-1 hover:bg-neutral-700 rounded text-neutral-300 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono px-1 text-[11px] text-neutral-400 w-10 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                  className="p-1 hover:bg-neutral-700 rounded text-neutral-300 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(0.85)}
                  className="p-1 hover:bg-neutral-700 rounded text-neutral-300 cursor-pointer ml-0.5"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>

              {/* Print Trigger Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-1.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer ml-1"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Now</span>
              </button>
            </div>
          </DialogHeader>

          {/* PREVIEW CONTAINER */}
          <div className="flex-1 overflow-auto bg-neutral-950 p-4 sm:p-8 flex justify-center custom-scrollbar print:hidden">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
              className="w-[420mm] shrink-0"
            >
              <EvaluationRegisterPrintable
                students={students}
                academicYear={academicYear}
                selectedClass={selectedClass}
                selectedSection={selectedSection}
                selectedExam={selectedExam}
                subjects={subjects}
                schoolProfile={schoolProfile}
                printMode={printMode}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. DEDICATED DIRECT-TO-BODY PRINT PORTAL (100% 1:1 Clean Output in Print) */}
      {mounted && open && typeof document !== "undefined" && createPortal(
        <div id="eval-print-isolated-portal">
          <EvaluationRegisterPrintable
            students={students}
            academicYear={academicYear}
            selectedClass={selectedClass}
            selectedSection={selectedSection}
            selectedExam={selectedExam}
            subjects={subjects}
            schoolProfile={schoolProfile}
            printMode={printMode}
          />
        </div>,
        document.body
      )}
    </>
  );
};
