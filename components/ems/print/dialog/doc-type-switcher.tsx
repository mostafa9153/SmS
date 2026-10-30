"use client";

import { FileText, Tag, ClipboardList, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function DocTypeSwitcher({ studio }: { studio: EmsPrintDialogState }) {
  const { activeDoc, benchSlipsPerPage, orientation, setActiveDoc } = studio;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Document Format</span>
        </span>
        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
          4 Standards
        </span>
      </div>

      {/* 4-Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1. Mini Admit Cards */}
        <button
          type="button"
          onClick={() => setActiveDoc("admit")}
          className={cn(
            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
            activeDoc === "admit"
              ? "bg-indigo-600 text-white font-bold border-indigo-500 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/40"
              : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <FileText className={cn("w-4 h-4", activeDoc === "admit" ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
            <span
              className={cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold",
                activeDoc === "admit" ? "bg-indigo-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              {orientation === "landscape" ? "20/A4" : "21/A4"}
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold leading-tight">Admit Cards</span>
            <span className={cn("text-[9px] block truncate", activeDoc === "admit" ? "text-indigo-100" : "text-slate-400")}>
              Roll & details
            </span>
          </div>
        </button>

        {/* 2. Desk / Bench Slips */}
        <button
          type="button"
          onClick={() => setActiveDoc("slips")}
          className={cn(
            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
            activeDoc === "slips"
              ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/40"
              : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <Tag className={cn("w-4 h-4", activeDoc === "slips" ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
            <span
              className={cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold",
                activeDoc === "slips" ? "bg-emerald-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              {benchSlipsPerPage === 33 || benchSlipsPerPage === 32
                ? "33/A4"
                : benchSlipsPerPage === 24
                  ? "24/A4"
                  : orientation === "landscape"
                    ? "56/A4"
                    : "57/A4"}
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold leading-tight">Bench Slips</span>
            <span className={cn("text-[9px] block truncate", activeDoc === "slips" ? "text-emerald-100" : "text-slate-400")}>
              Desk cut labels
            </span>
          </div>
        </button>

        {/* 3. Room Attendance */}
        <button
          type="button"
          onClick={() => setActiveDoc("attendance")}
          className={cn(
            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
            activeDoc === "attendance"
              ? "bg-amber-600 text-white font-bold border-amber-500 shadow-md shadow-amber-600/25 ring-2 ring-amber-400/40"
              : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <ClipboardList className={cn("w-4 h-4", activeDoc === "attendance" ? "text-white" : "text-amber-600 dark:text-amber-400")} />
          </div>
          <div>
            <span className="block text-xs font-bold leading-tight">Attendance</span>
            <span className={cn("text-[9px] block truncate", activeDoc === "attendance" ? "text-amber-100" : "text-slate-400")}>
              Signature sheet
            </span>
          </div>
        </button>

        {/* 4. Room Gate Notice */}
        <button
          type="button"
          onClick={() => setActiveDoc("gate")}
          className={cn(
            "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 select-none",
            activeDoc === "gate"
              ? "bg-purple-600 text-white font-bold border-purple-500 shadow-md shadow-purple-600/25 ring-2 ring-purple-400/40"
              : "bg-slate-50/80 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <div className="flex items-center justify-between w-full">
            <DoorOpen className={cn("w-4 h-4", activeDoc === "gate" ? "text-white" : "text-purple-600 dark:text-purple-400")} />
            <span className={cn(
              "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold",
              activeDoc === "gate" ? "bg-purple-800 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            )}>
              A4 Notice
            </span>
          </div>
          <div>
            <span className="block text-xs font-bold leading-tight">Gate Notice</span>
            <span className={cn("text-[9px] block truncate", activeDoc === "gate" ? "text-purple-100" : "text-slate-400")}>
              Hall door roster
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
