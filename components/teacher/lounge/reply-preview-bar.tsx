"use client";

import { X, CornerUpLeft } from "lucide-react";

import type { LoungeDrawerState } from "./use-lounge-drawer";

export function ReplyPreviewBar({ lounge }: { lounge: LoungeDrawerState }) {
  const { replyingTo, setReplyingTo } = lounge;
  return (
    <>
      {replyingTo && (
        <div className="mx-2 mb-1 p-2 rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] border border-border/70 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-150 shadow-xs">
          <div className="flex items-center gap-2 min-w-0 border-l-[4px] border-[#00a884] pl-2.5">
            <CornerUpLeft className="h-4 w-4 text-[#00a884] shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#00a884] dark:text-[#25d366] truncate leading-none">
                {replyingTo.sender_name}
              </p>
              <p className="text-[11px] text-[#54656f] dark:text-[#8696a0] truncate mt-0.5 leading-tight">
                {replyingTo.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="h-7 w-7 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[#54656f] dark:text-[#8696a0] flex items-center justify-center shrink-0 cursor-pointer"
            title="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
