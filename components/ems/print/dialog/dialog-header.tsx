"use client";

import { Printer, X } from "lucide-react";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function DialogHeader({ studio }: { studio: EmsPrintDialogState }) {
  const { allocation, onOpenChange, schoolProfile } = studio;
  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
          <Printer className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              EMS Print Studio
            </h2>
            <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/25">
              {allocation.examType}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {schoolProfile.schoolName || "High School"} • Academic Year {allocation.academicYear}
          </p>
        </div>
      </div>

      {/* Close Button in Sidebar */}
      <button
        onClick={() => onOpenChange(false)}
        className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
        title="Close Print Studio (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
