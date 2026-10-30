"use client";

import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

import type { LoungeDrawerState } from "./use-lounge-drawer";

export function LoungeFab({ lounge }: { lounge: LoungeDrawerState }) {
  const { handleOpen, isOpen, unreadCount } = lounge;
  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 pointer-events-auto">
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "group relative h-14 w-14 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white shadow-[0_4px_16px_rgba(0,168,132,0.4)] flex items-center justify-center border-2 border-white/20 select-none cursor-pointer",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen
            ? "scale-0 opacity-0 pointer-events-none translate-y-3"
            : "scale-100 opacity-100 translate-y-0 hover:scale-110 active:scale-95 animate-in zoom-in-75 duration-300"
        )}
        title="WhatsApp Faculty Lounge"
      >
        <MessageSquare className="h-6 w-6 transition-transform duration-200 group-hover:scale-110 fill-white" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-[#25d366] text-black text-[10px] font-black shadow-md border-2 border-white animate-bounce">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* WhatsApp ripple ring */}
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-full bg-[#25d366]/40 animate-ping pointer-events-none -z-10" />
        )}
      </button>
    </div>
  );
}
