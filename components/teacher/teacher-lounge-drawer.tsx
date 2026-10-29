"use client";

import type { TeacherLoungeDrawerProps } from "@/components/teacher/lounge/types";
import { createPortal } from "react-dom";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { LoungeFab } from "@/components/teacher/lounge/lounge-fab";
import { LoungeHeader } from "@/components/teacher/lounge/lounge-header";
import { SearchOverlay } from "@/components/teacher/lounge/search-overlay";
import { ChatWall } from "@/components/teacher/lounge/chat-wall";
import { MentionDropdown } from "@/components/teacher/lounge/mention-dropdown";
import { ReplyPreviewBar } from "@/components/teacher/lounge/reply-preview-bar";
import { InputBar } from "@/components/teacher/lounge/input-bar";
import { useLoungeDrawer } from "@/components/teacher/lounge/use-lounge-drawer";

export type { TeacherChatMessage, FacultyMember } from "@/components/teacher/lounge/types";
export type { ParsedReply } from "@/components/teacher/lounge/helpers";

export function TeacherLoungeDrawer(props: TeacherLoungeDrawerProps) {
  const lounge = useLoungeDrawer(props);
  const { handleClose, isAnimatingOut, mounted, scrollToBottom, shouldRender, showScrollBottom } = lounge;

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {/* 1. True Full-Screen Floating Action Button (WhatsApp Green FAB) */}
      <LoungeFab lounge={lounge} />

      {/* 2. WhatsApp Drawer Panel & Backdrop with Silky-Smooth Open & Close Animations */}
      {shouldRender && (
        <>
          {/* Backdrop for Mobile & Desktop (clicking outside closes) */}
          <div
            className={cn(
              "fixed inset-0 bg-black/50 md:bg-black/30 backdrop-blur-[1.5px] z-50 transition-opacity duration-300 ease-out",
              isAnimatingOut ? "opacity-0" : "opacity-100"
            )}
            onClick={handleClose}
          />

          {/* WhatsApp Drawer Container */}
          <div
            className={cn(
              "fixed z-50 shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
              // Mobile: 100% full screen
              "inset-0 md:inset-auto md:top-0 md:right-0 md:bottom-0",
              // Desktop / Laptop: Sleek WhatsApp Web style side panel
              "md:w-[420px] lg:w-[450px] md:h-screen md:border-l md:border-border/60",
              // WhatsApp Light Background #efeae2, Dark Background #0b141a
              "bg-[#efeae2] dark:bg-[#0b141a] text-[#111b21] dark:text-[#e9edef]",
              // Sliding transform states
              isAnimatingOut
                ? "translate-y-full md:translate-y-0 md:translate-x-full opacity-0 md:opacity-100"
                : "translate-y-0 md:translate-x-0 opacity-100"
            )}
            style={{
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* WhatsApp Top Header Bar */}
            <LoungeHeader lounge={lounge} />

            {/* Search Bar Overlay if Active */}
            <SearchOverlay lounge={lounge} />

            {/* WhatsApp Chat Wall with subtle wallpaper styling */}
            <ChatWall lounge={lounge} />

            {/* Scroll To Bottom Button */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-28 right-5 z-20 h-9 w-9 rounded-full bg-white dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] shadow-md hover:bg-muted transition-all cursor-pointer flex items-center justify-center border border-border/60 animate-in fade-in"
                title="Scroll to latest message"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            )}

            {/* WhatsApp @ Mention Autocomplete Dropdown Popup */}
            <MentionDropdown lounge={lounge} />

            {/* WhatsApp-Style Quoted Reply Preview Bar */}
            <ReplyPreviewBar lounge={lounge} />

            {/* WhatsApp Input Bar (Bottom attached with safe-area padding) */}
            <InputBar lounge={lounge} />
          </div>
        </>
      )}
    </>,
    document.body
  );
}
