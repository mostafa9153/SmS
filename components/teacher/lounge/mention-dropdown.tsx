"use client";

import { AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials, getWhatsAppSenderColor } from "@/components/teacher/lounge/helpers";
import type { LoungeDrawerState } from "./use-lounge-drawer";

export function MentionDropdown({ lounge }: { lounge: LoungeDrawerState }) {
  const { filteredMentionFaculty, insertMention, mentionIndex, mentionQuery } = lounge;
  return (
    <>
      {mentionQuery !== null && filteredMentionFaculty.length > 0 && (
        <div className="mx-3 mb-1 p-1 rounded-xl bg-white dark:bg-[#202c33] text-foreground border border-border/80 shadow-2xl z-30 animate-in fade-in-50 zoom-in-95 duration-150 max-h-48 overflow-y-auto custom-scrollbar">
          <div className="px-2.5 py-1 text-[10px] font-bold text-[#00a884] uppercase tracking-wider flex items-center justify-between border-b border-border/40">
            <span className="flex items-center gap-1">
              <AtSign className="h-3 w-3" /> Mention Teacher
            </span>
            <span>{filteredMentionFaculty.length} suggestions</span>
          </div>
          {filteredMentionFaculty.map((f, idx) => (
            <button
              key={f.id}
              type="button"
              onClick={() => insertMention(f)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                mentionIndex === idx
                  ? "bg-[#00a884]/15 text-[#008069] dark:text-[#00a884] font-bold"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div
                style={{ backgroundColor: getWhatsAppSenderColor(f.name) }}
                className="h-7 w-7 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs"
              >
                {getInitials(f.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-xs leading-tight">{f.name}</p>
                {f.designation && (
                  <p className="text-[10px] text-muted-foreground truncate leading-tight">
                    {f.designation}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
