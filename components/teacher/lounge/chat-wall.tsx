"use client";

import { MessageSquare, ChevronDown, Edit2, Trash2, CheckCheck, CornerUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { getWhatsAppSenderColor, parseMessage } from "@/components/teacher/lounge/helpers";
import { QUICK_TAGS } from "@/components/teacher/lounge/constants";
import type { LoungeDrawerState } from "./use-lounge-drawer";

export function ChatWall({ lounge }: { lounge: LoungeDrawerState }) {
  const { activeMenuMsgId, currentUser, editingId, editingText, handleDeleteMessage, handleMentionUser, handleSaveEdit, handleScroll, handleStartReply, loading, messageGroups, messages, messagesEndRef, renderMessageContent, scrollContainerRef, scrollToQuotedMessage, setActiveMenuMsgId, setEditingId, setEditingText } = lounge;
  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar relative bg-[#efeae2] dark:bg-[#0b141a]"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0.02) 1px, transparent 1px)`,
        backgroundSize: "20px 20px",
      }}
    >
      {loading && messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-[#54656f] dark:text-[#8696a0] gap-2">
          <Spinner className="h-4 w-4 text-[#00a884]" />
          Loading WhatsApp messages...
        </div>
      ) : Object.keys(messageGroups).length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#54656f] dark:text-[#8696a0]">
          <div className="h-12 w-12 rounded-full bg-[#00a884]/10 text-[#00a884] flex items-center justify-center mb-3">
            <MessageSquare className="h-6 w-6" />
          </div>
          <p className="text-xs font-bold text-[#111b21] dark:text-[#e9edef]">WhatsApp Faculty Chat</p>
          <p className="text-[11px] text-[#54656f] dark:text-[#8696a0] mt-1 max-w-[240px]">
            Use <span className="font-bold text-[#00a884]">@</span> to mention any teacher or click the reply arrow to quote a message.
          </p>
        </div>
      ) : (
        Object.entries(messageGroups).map(([dateLabel, groupMessages]) => (
          <div key={dateLabel} className="space-y-2.5">
            {/* WhatsApp Date Chip Pill */}
            <div className="flex items-center justify-center my-2">
              <span className="px-3 py-1 rounded-lg text-[10.5px] font-semibold bg-white dark:bg-[#182229] text-[#54656f] dark:text-[#8696a0] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] uppercase tracking-wide select-none">
                {dateLabel}
              </span>
            </div>

            {groupMessages.map((msg) => {
              const isMe = msg.user_id === currentUser?.id;
              const isEditing = editingId === msg.id;
              const { reply, tag, cleanText } = parseMessage(msg.message);
              const matchedTag = QUICK_TAGS.find((q) => q.tag === tag);
              const senderColor = getWhatsAppSenderColor(msg.sender_name);

              return (
                <div
                  key={msg.id}
                  id={`wa-msg-${msg.id}`}
                  className={cn(
                    "flex w-full group relative transition-colors duration-300",
                    isMe ? "justify-end" : "justify-start"
                  )}
                >
                  {/* WhatsApp Message Bubble */}
                  <div
                    className={cn(
                      "relative max-w-[85%] sm:max-w-[80%] px-3 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] rounded-lg text-[13px] leading-relaxed transition-all",
                      isMe
                        // Outgoing: WhatsApp soft light green (#d9fdd3) or dark green (#005c4b)
                        ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none"
                        // Incoming: WhatsApp pure white (#ffffff) or dark card (#202c33)
                        : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none",
                      msg.is_deleted && "italic opacity-60 bg-[#f0f2f5] dark:bg-[#182229]"
                    )}
                  >
                    {/* WhatsApp Sender Name (in Group Chat for others) */}
                    {!isMe && !msg.is_deleted && (
                      <div
                        style={{ color: senderColor }}
                        className="font-bold text-[12px] leading-tight mb-1 truncate select-none cursor-pointer"
                        onClick={() => handleMentionUser(msg.sender_name)}
                      >
                        {msg.sender_name}
                      </div>
                    )}

                    {/* WhatsApp Quoted Reply Block */}
                    {reply && !msg.is_deleted && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToQuotedMessage(reply.id);
                        }}
                        className={cn(
                          "mb-1.5 p-1.5 rounded-md border-l-[4px] cursor-pointer transition-opacity hover:opacity-90 text-left select-none",
                          isMe
                            ? "bg-[#cbfbc4] dark:bg-[#025143] border-[#00a884]"
                            : "bg-[#f5f6f6] dark:bg-[#1d272d] border-[#00a884]"
                        )}
                        title="Click to view quoted message"
                      >
                        <div className="text-[11px] font-bold text-[#00a884] dark:text-[#25d366] truncate mb-0.5">
                          {reply.sender}
                        </div>
                        <p className="text-[11px] text-[#54656f] dark:text-[#8696a0] truncate line-clamp-1">
                          {reply.text}
                        </p>
                      </div>
                    )}

                    {/* Quick Tag Pill inside message if present */}
                    {matchedTag && !msg.is_deleted && (
                      <div className="mb-1">
                        <span className={cn("inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border", matchedTag.color)}>
                          {matchedTag.label}
                        </span>
                      </div>
                    )}

                    {/* Editing Inline Mode */}
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5 py-1">
                        <Input
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-[#2a3942]"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(msg.id)}
                            className="h-6 px-2 bg-[#00a884] text-white text-[11px]"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-6 px-2 text-[11px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Message text content */}
                        <div className="whitespace-pre-wrap break-words pr-14">
                          {renderMessageContent(cleanText, isMe)}
                        </div>

                        {/* WhatsApp Timestamp & Blue Double Checkmarks */}
                        <div className="absolute right-1.5 bottom-1 flex items-center gap-1 select-none pointer-events-none text-[10px] text-[#54656f] dark:text-[#8696a0]/80">
                          {msg.is_edited && <span className="italic text-[9px] mr-0.5">(edited)</span>}
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMe && !msg.is_deleted && (
                            <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                          )}
                        </div>
                      </>
                    )}

                    {/* WhatsApp Bubble Dropdown / Action Trigger */}
                    {!msg.is_deleted && !isEditing && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuMsgId((prev) => (prev === msg.id ? null : msg.id))
                          }
                          className="p-1 rounded-full bg-black/10 dark:bg-white/10 text-foreground hover:bg-black/20 transition-colors cursor-pointer"
                          title="Options"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>

                        {/* WhatsApp Menu Dropdown */}
                        {activeMenuMsgId === msg.id && (
                          <div className="absolute right-0 top-6 z-30 min-w-[120px] rounded-lg bg-popover text-popover-foreground shadow-lg border border-border p-1 animate-in fade-in-50 zoom-in-95 duration-100 text-xs">
                            <button
                              type="button"
                              onClick={() => handleStartReply(msg)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-muted text-left cursor-pointer"
                            >
                              <CornerUpLeft className="h-3.5 w-3.5 text-[#00a884]" />
                              <span>Reply</span>
                            </button>

                            {isMe && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    setEditingId(msg.id);
                                    setEditingText(cleanText);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-muted text-left cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuMsgId(null);
                                    handleDeleteMessage(msg.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-muted text-rose-600 dark:text-rose-400 text-left cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
