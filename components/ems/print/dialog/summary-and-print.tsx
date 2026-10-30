"use client";

import { Button } from "@/components/ui/button";
import { Printer, Sparkles } from "lucide-react";
import { formatRoomName } from "@/lib/ems/ems-config-loader";
import { cn } from "@/lib/utils";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function SummaryAndPrint({ studio }: { studio: EmsPrintDialogState }) {
  const { activeDoc, activeRoomObj, currentTotalPages, examHalf, handlePrint, orientation, setExamHalf, targetRoomId, totalOccupiedStudents } = studio;
  return (
    <div className="mt-auto pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>Target Scope:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {targetRoomId === "ALL" ? "All Rooms" : formatRoomName(activeRoomObj?.roomNumber || "")}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>Candidates Included:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
            {totalOccupiedStudents} Students
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>Paper Output:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            A4 {orientation === "landscape" && (activeDoc === "admit" || activeDoc === "slips") ? "Landscape" : "Portrait"} ({currentTotalPages} Page{currentTotalPages > 1 ? "s" : ""})
          </span>
        </div>
      </div>

      {/* Exam Shift (1st Half / 2nd Half) */}
      <div className="flex items-center justify-between p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pl-2">
          Exam Shift:
        </span>
        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-950/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setExamHalf("1st Half")}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
              examHalf === "1st Half"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            1st Half
          </button>
          <button
            type="button"
            onClick={() => setExamHalf("2nd Half")}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
              examHalf === "2nd Half"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            2nd Half
          </button>
        </div>
      </div>

      {/* Master Print Button: Prominent, Glowing, Bottom of Sidebar */}
      <Button
        onClick={handlePrint}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black h-12 text-sm tracking-wide shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer rounded-xl border border-indigo-400/30 gap-2.5"
        title="Print official document (Ctrl + P)"
      >
        <Printer className="w-4.5 h-4.5" />
        <span>Print Document</span>
        <span className="text-[11px] opacity-85 font-normal bg-black/25 px-2 py-0.5 rounded-md font-mono">
          Ctrl+P
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse ml-0.5" />
      </Button>
    </div>
  );
}
