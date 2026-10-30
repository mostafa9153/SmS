"use client";

import { Building, Check, Sparkles } from "lucide-react";
import { formatRoomName } from "@/lib/ems/ems-config-loader";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function RoomFilter({ studio }: { studio: EmsPrintDialogState }) {
  const { allRoomsTotalStudents, filteredRooms, roomSearch, rooms, setRoomSearch, setTargetRoomId, targetRoomId } = studio;
  return (
    <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Target Examination Room</span>
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          {rooms.length} Rooms Available
        </span>
      </div>

      {/* Room Search Filter (if > 3 rooms) */}
      {rooms.length > 3 && (
        <SearchInput value={roomSearch} onChange={setRoomSearch} placeholder="Search room..." size="sm" className="flex items-center" />
      )}

      {/* Room Choice Chips Grid */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {/* 1. All Examination Rooms Button */}
        <button
          type="button"
          onClick={() => setTargetRoomId("ALL")}
          className={cn(
            "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all cursor-pointer border select-none",
            targetRoomId === "ALL"
              ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-500/50 shadow-2xs"
              : "bg-slate-50/70 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>All Examination Rooms</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
              {allRoomsTotalStudents} students
            </span>
            {targetRoomId === "ALL" && (
              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
        </button>

        {/* 2. Individual Rooms Grid (2 Columns if multiple) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {filteredRooms.map((r, rIdx) => {
            const isSelected = targetRoomId === r.roomId;
            return (
              <button
                key={r.roomId}
                type="button"
                onClick={() => setTargetRoomId(r.roomId)}
                className={cn(
                  "flex items-center justify-between rounded-xl p-2 text-xs transition-all cursor-pointer border select-none",
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-500/50 shadow-2xs"
                    : "bg-slate-50/70 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0",
                      isSelected ? "bg-indigo-600 text-white" : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    #{rIdx + 1}
                  </span>
                  <span className="font-semibold truncate">
                    {formatRoomName(r.roomNumber)}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 ml-1">
                  {r.occupiedSeats} sts
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
