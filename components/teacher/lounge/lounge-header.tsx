"use client";

import { X, ChevronLeft, Search, Volume2, VolumeX, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import type { LoungeDrawerState } from "./use-lounge-drawer";

export function LoungeHeader({ lounge }: { lounge: LoungeDrawerState }) {
  const { allFaculty, handleClose, isSearching, setIsSearching, setSearchQuery, soundEnabled, toggleSound } = lounge;
  return (
    <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between shrink-0 shadow-md select-none border-b border-[#006e5a] dark:border-[#2a3942]">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={handleClose}
          className="md:hidden p-1.5 -ml-1 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* WhatsApp Group Avatar */}
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-[#005c4b] dark:bg-[#00a884] text-white flex items-center justify-center font-bold text-sm shadow-xs border border-white/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#25d366] ring-2 ring-[#008069] dark:ring-[#202c33]" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight truncate leading-tight">
              Faculty Lounge
            </h3>
          </div>
          <p className="text-[11px] text-[#c6f6d5] dark:text-[#8696a0] truncate font-medium">
            {allFaculty.length} teachers · tap for info
          </p>
        </div>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setIsSearching(!isSearching);
            if (isSearching) setSearchQuery("");
          }}
          className={cn(
            "p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer",
            isSearching && "bg-white/20 text-white"
          )}
          title="Search messages"
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleSound}
          className="p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={soundEnabled ? "Mute notification sound" : "Unmute notification sound"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-white/50" />}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-0.5"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
