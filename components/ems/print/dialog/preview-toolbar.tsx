"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function PreviewToolbar({ studio }: { studio: EmsPrintDialogState }) {
  const { activeDoc, currentTotalPages, onOpenChange, orientation, setOrientation, totalOccupiedStudents } = studio;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/60 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-2xl shrink-0 print:hidden shadow-xs relative z-10">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md text-slate-800 dark:text-neutral-200 font-mono text-xs border border-white/80 dark:border-neutral-700 font-bold shadow-2xs">
          {activeDoc === "admit"
            ? `Mini Admit Cards (${orientation === "landscape" ? "4×5 Landscape • 20/Page" : "3×7 Portrait • 21/Page"})`
            : activeDoc === "slips"
              ? `Desk Bench Slips (${orientation === "landscape" ? "4×14 Landscape • 56/Page" : "3×19 Portrait • 57/Page"})`
              : activeDoc === "attendance"
                ? "Room Attendance Sheet"
                : "Room Gate Notice"}
        </span>
        <span className="text-slate-500 dark:text-neutral-400 text-xs hidden sm:inline font-medium">
          • {totalOccupiedStudents} students ({currentTotalPages} A4 Page{currentTotalPages > 1 ? "s" : ""})
        </span>
      </div>

      {/* Orientation Switcher for Admit & Slips in Preview Header */}
      {(activeDoc === "admit" || activeDoc === "slips") && (
        <div className="hidden sm:inline-flex p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 border border-slate-300/80 dark:border-slate-700 shadow-2xs">
          <button
            type="button"
            onClick={() => setOrientation("portrait")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
              orientation === "portrait"
                ? activeDoc === "admit"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title={activeDoc === "admit" ? "Portrait (3×7 • 21 Cards)" : "Portrait (3×19 • 57 Slips)"}
          >
            Portrait {activeDoc === "admit" ? "(21)" : "(57)"}
          </button>
          <button
            type="button"
            onClick={() => setOrientation("landscape")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
              orientation === "landscape"
                ? activeDoc === "admit"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
            title={activeDoc === "admit" ? "Landscape (4×5 • 20 Cards)" : "Landscape (4×14 • 56 Slips)"}
          >
            Landscape {activeDoc === "admit" ? "(20)" : "(56)"}
          </button>
        </div>
      )}

      {/* Close button (zoom lives in the preview) */}
      <div className="flex items-center gap-2">
        {/* Prominent High-Contrast Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="h-8.5 px-3 rounded-xl bg-white/80 hover:bg-rose-50 text-slate-700 hover:text-rose-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-white/80 dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:border-rose-300 dark:hover:border-rose-800 group backdrop-blur-md"
          title="Close Print Studio (Esc)"
        >
          <X className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>Close</span>
          <span className="text-[10px] font-mono text-slate-400 group-hover:text-rose-500 ml-0.5 hidden sm:inline">
            Esc
          </span>
        </button>
      </div>
    </div>
  );
}
