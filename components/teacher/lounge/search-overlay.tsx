"use client";

import { Search } from "lucide-react";

import type { LoungeDrawerState } from "./use-lounge-drawer";

export function SearchOverlay({ lounge }: { lounge: LoungeDrawerState }) {
  const { isSearching, searchQuery, setSearchQuery } = lounge;
  return (
    <>
      {isSearching && (
        <div className="p-2 bg-[#f0f2f5] dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#222d34] flex items-center gap-2 animate-in fade-in duration-150">
          <Search className="h-3.5 w-3.5 text-[#54656f] dark:text-[#8696a0] ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in chat..."
            className="flex-1 bg-white dark:bg-[#202c33] rounded-lg px-3 py-1.5 text-xs text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] border border-border/40 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#54656f] dark:text-[#8696a0] hover:text-foreground text-xs px-2"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </>
  );
}
