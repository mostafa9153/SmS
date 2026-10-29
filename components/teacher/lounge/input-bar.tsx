"use client";

import { Send, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

import type { LoungeDrawerState } from "./use-lounge-drawer";

export function InputBar({ lounge }: { lounge: LoungeDrawerState }) {
  const { filteredMentionFaculty, handleInputChange, handleSendMessage, inputText, insertMention, mentionIndex, mentionQuery, sending, setInputText, setMentionIndex, setMentionQuery, setMentionStart, textareaRef } = lounge;
  return (
    <div className="p-2 sm:p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] shrink-0 pb-[max(0.6rem,calc(env(safe-area-inset-bottom,0px)+0.4rem))] border-t border-[#e9edef] dark:border-[#222d34]">
      <form
        onSubmit={handleSendMessage}
        className="flex items-end gap-2"
      >
        {/* Rounded WhatsApp Input Pill */}
        <div className="flex-1 flex items-end bg-white dark:bg-[#2a3942] rounded-3xl px-3 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-border/20 focus-within:ring-1 focus-within:ring-[#00a884]">
          {/* @ Button */}
          <button
            type="button"
            onClick={() => {
              setInputText((prev) => `${prev}@`);
              setMentionQuery("");
              setMentionStart(inputText.length);
              textareaRef.current?.focus();
            }}
            className="p-1 rounded-full text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884] transition-colors cursor-pointer mr-1 shrink-0"
            title="Mention faculty (@)"
          >
            <AtSign className="h-4 w-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (mentionQuery !== null && filteredMentionFaculty.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((prev) => (prev + 1) % filteredMentionFaculty.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((prev) => (prev - 1 + filteredMentionFaculty.length) % filteredMentionFaculty.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(filteredMentionFaculty[mentionIndex]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMentionQuery(null);
                  return;
                }
              }

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message (use @ to mention)"
            rows={1}
            className="flex-1 bg-transparent border-0 py-1 text-[13px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none resize-none max-h-28 custom-scrollbar"
          />
        </div>

        {/* WhatsApp Circular Green Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={!inputText.trim() || sending}
          className={cn(
            "h-11 w-11 rounded-full shrink-0 transition-transform cursor-pointer shadow-md",
            inputText.trim() && !sending
              ? "bg-[#00a884] hover:bg-[#008f6f] text-white scale-100 active:scale-95"
              : "bg-[#00a884]/40 text-white/70 cursor-not-allowed"
          )}
        >
          {sending ? (
            <Spinner className="h-4 w-4 text-white" />
          ) : (
            <Send className="h-5 w-5 text-white ml-0.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
