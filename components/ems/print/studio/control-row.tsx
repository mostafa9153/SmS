"use client";

import { Button } from "@/components/ui/button";
import { FileText, Tag, ClipboardList, DoorOpen, SlidersHorizontal, Building2, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { formatRoomName } from "@/lib/ems/ems-config-loader";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";

import type { EmsPrintStudioState } from "./use-ems-print-studio";

export function ControlRow({ studio }: { studio: EmsPrintStudioState }) {
  const { activeDoc, activeRoomObj, admitCardsPerPage, allRoomsTotalStudents, benchSlipsPerPage, filteredRooms, isOptionsOpen, isRoomPopoverOpen, orientation, roomPopoverRef, roomSearch, rooms, setActiveDoc, setIsOptionsOpen, setIsRoomPopoverOpen, setRoomSearch, setTargetRoomId, targetRoomId, totalOccupiedStudents } = studio;
  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
      {/* 4 Document Format Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-3xl">
        {/* 1. Mini Admit Cards */}
        <button
          type="button"
          onClick={() => setActiveDoc("admit")}
          className={cn(
            "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
            activeDoc === "admit"
              ? "bg-indigo-600 text-white font-bold border-indigo-500 shadow-sm shadow-indigo-600/25 ring-2 ring-indigo-400/40"
              : "bg-background text-foreground border-border hover:bg-muted/60"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className={cn("w-4 h-4 shrink-0", activeDoc === "admit" ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
            <span className="block text-xs font-bold leading-tight truncate">Admit Cards</span>
          </div>
          <span
            className={cn(
              "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              activeDoc === "admit" ? "bg-indigo-800 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            {admitCardsPerPage === 8 ? "8/A4" : (orientation === "landscape" ? "20/A4" : "21/A4")}
          </span>
        </button>

        {/* 2. Bench Slips */}
        <button
          type="button"
          onClick={() => setActiveDoc("slips")}
          className={cn(
            "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
            activeDoc === "slips"
              ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-sm shadow-emerald-600/25 ring-2 ring-emerald-400/40"
              : "bg-background text-foreground border-border hover:bg-muted/60"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Tag className={cn("w-4 h-4 shrink-0", activeDoc === "slips" ? "text-white" : "text-emerald-600 dark:text-emerald-400")} />
            <span className="block text-xs font-bold leading-tight truncate">Bench Slips</span>
          </div>
          <span
            className={cn(
              "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              activeDoc === "slips" ? "bg-emerald-800 text-white" : "bg-muted text-muted-foreground"
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
        </button>

        {/* 3. Attendance Sheet */}
        <button
          type="button"
          onClick={() => setActiveDoc("attendance")}
          className={cn(
            "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
            activeDoc === "attendance"
              ? "bg-amber-600 text-white font-bold border-amber-500 shadow-sm shadow-amber-600/25 ring-2 ring-amber-400/40"
              : "bg-background text-foreground border-border hover:bg-muted/60"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className={cn("w-4 h-4 shrink-0", activeDoc === "attendance" ? "text-white" : "text-amber-600 dark:text-amber-400")} />
            <span className="block text-xs font-bold leading-tight truncate">Attendance</span>
          </div>
          <span
            className={cn(
              "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              activeDoc === "attendance" ? "bg-amber-800 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            8-Days
          </span>
        </button>

        {/* 4. Gate Notice */}
        <button
          type="button"
          onClick={() => setActiveDoc("gate")}
          className={cn(
            "h-10 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 select-none group",
            activeDoc === "gate"
              ? "bg-purple-600 text-white font-bold border-purple-500 shadow-sm shadow-purple-600/25 ring-2 ring-purple-400/40"
              : "bg-background text-foreground border-border hover:bg-muted/60"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <DoorOpen className={cn("w-4 h-4 shrink-0", activeDoc === "gate" ? "text-white" : "text-purple-600 dark:text-purple-400")} />
            <span className="block text-xs font-bold leading-tight truncate">Gate Notice</span>
          </div>
          <span
            className={cn(
              "text-[9px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              activeDoc === "gate" ? "bg-purple-800 text-white" : "bg-muted text-muted-foreground"
            )}
          >
            A4 Notice
          </span>
        </button>
      </div>

      {/* Target Room Selector + Customize Options Toggle + Print Summary */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Target Room Selector Popover */}
        <div className="relative" ref={roomPopoverRef}>
          <button
            type="button"
            onClick={() => setIsRoomPopoverOpen((prev) => !prev)}
            className="h-10 px-3 rounded-xl border border-border bg-background hover:bg-muted/70 text-foreground text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-2xs transition-all"
            title="Select target examination room"
          >
            <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate max-w-[130px] sm:max-w-[160px]">
              {targetRoomId === "ALL"
                ? "All Rooms"
                : formatRoomName(activeRoomObj?.roomNumber || "")}
            </span>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
              {totalOccupiedStudents} sts
            </span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                isRoomPopoverOpen ? "rotate-180" : ""
              )}
            />
          </button>

          {/* Popover Dropdown Menu */}
          {isRoomPopoverOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between pb-1 border-b border-border/80">
                <span className="text-xs font-bold text-foreground">Select Target Room</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {rooms.length} Room{rooms.length !== 1 ? "s" : ""}
                </span>
              </div>

              {rooms.length > 3 && (
                <SearchInput value={roomSearch} onChange={setRoomSearch} placeholder="Search room, floor..." size="sm" className="flex items-center" />
              )}

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {/* All Examination Rooms option */}
                <button
                  type="button"
                  onClick={() => {
                    setTargetRoomId("ALL");
                    setIsRoomPopoverOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all cursor-pointer border select-none",
                    targetRoomId === "ALL"
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-600/60 shadow-2xs"
                      : "bg-background text-foreground border-border hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>All Examination Rooms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                      {allRoomsTotalStudents} sts
                    </span>
                    {targetRoomId === "ALL" && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>
                </button>

                {/* Filtered Rooms List */}
                {filteredRooms.map((r, rIdx) => {
                  const isSelected = targetRoomId === r.roomId;
                  return (
                    <button
                      key={r.roomId}
                      type="button"
                      onClick={() => {
                        setTargetRoomId(r.roomId);
                        setIsRoomPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-all cursor-pointer border select-none",
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 font-bold border-indigo-400 dark:border-indigo-600/60 shadow-2xs"
                          : "bg-background text-foreground border-border hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0",
                            isSelected ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
                          )}
                        >
                          #{rIdx + 1}
                        </span>
                        <div className="text-left min-w-0">
                          <span className="font-semibold block truncate">
                            {formatRoomName(r.roomNumber)}
                          </span>
                          {r.floor && (
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {r.floor} {r.building ? `• ${r.building}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {r.occupiedSeats} sts
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Customize Options Toggle Button */}
        <Button
          type="button"
          variant={isOptionsOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setIsOptionsOpen((prev) => !prev)}
          className={cn(
            "h-10 px-3 text-xs font-semibold gap-2 rounded-xl transition-all cursor-pointer",
            isOptionsOpen
              ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/25"
              : "border-border hover:bg-muted/70 text-foreground"
          )}
          title="Toggle customization options"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Customize Options</span>
          {isOptionsOpen ? (
            <ChevronUp className="w-3.5 h-3.5 opacity-80" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          )}
        </Button>


      </div>
    </div>
  );
}
