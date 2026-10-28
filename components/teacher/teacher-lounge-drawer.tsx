"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Send, X, ChevronLeft, ChevronDown, Edit2, Trash2, CheckCheck, Search, Volume2, VolumeX, ArrowDown, CornerUpLeft, AtSign, Users, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/toast-banner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";

export interface TeacherChatMessage {
  id: string;
  user_id: string;
  teacher_id?: string | null;
  sender_name: string;
  message: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FacultyMember {
  id: string;
  name: string;
  designation?: string;
}

interface TeacherLoungeDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  currentUser: any;
  currentProfile?: any;
  currentStaff?: any;
  onUnreadChange?: (count: number) => void;
}

// Gentle WhatsApp-like notification pop
function playWhatsAppChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(830.61, now); // G#5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.06); // C6
    gain2.gain.setValueAtTime(0.15, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.28);
  } catch {
    // Audio restricted before user gesture
  }
}

const QUICK_TAGS = [
  { label: "📢 Notice", tag: "[Notice]", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { label: "🔄 Duty Swap", tag: "[Duty Swap]", color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30" },
  { label: "📝 Exam/Marks", tag: "[Marks]", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  { label: "☕ Break", tag: "[Break]", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { label: "❓ Query", tag: "[Query]", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
];

// WhatsApp Group Member distinctive name colors
const WHATSAPP_SENDER_COLORS = [
  "#1f7a8c", // Teal Blue
  "#e056fd", // Purple
  "#f0932b", // Orange
  "#eb4d4b", // Red
  "#22a6b3", // Cyan
  "#6ab04c", // Green
  "#be2edd", // Magenta
  "#4834d4", // Deep Blue
];

function getWhatsAppSenderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WHATSAPP_SENDER_COLORS[Math.abs(hash) % WHATSAPP_SENDER_COLORS.length];
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name || "F").slice(0, 2).toUpperCase();
}

export interface ParsedReply {
  id: string;
  sender: string;
  text: string;
}

function parseMessage(raw: string): {
  reply: ParsedReply | null;
  tag: string | null;
  cleanText: string;
} {
  let text = raw || "";
  let reply: ParsedReply | null = null;

  const replyMatch = text.match(/^\[reply:([^|]+)\|([^|]+)\|([^\]]*)\]/);
  if (replyMatch) {
    try {
      reply = {
        id: replyMatch[1],
        sender: replyMatch[2],
        text: decodeURIComponent(replyMatch[3] || ""),
      };
    } catch {
      reply = {
        id: replyMatch[1],
        sender: replyMatch[2],
        text: replyMatch[3] || "",
      };
    }
    text = text.slice(replyMatch[0].length);
  }

  let tag: string | null = null;
  for (const t of QUICK_TAGS) {
    if (text.startsWith(t.tag)) {
      tag = t.tag;
      text = text.slice(t.tag.length).trim();
      break;
    }
  }

  return { reply, tag, cleanText: text };
}

export function TeacherLoungeDrawer({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onOpen: propOnOpen,
  currentUser,
  currentProfile,
  currentStaff,
  onUnreadChange,
}: TeacherLoungeDrawerProps) {
  const confirm = useConfirm();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;

  // Animation lifecycle
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const [messages, setMessages] = useState<TeacherChatMessage[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // WhatsApp-style Quoted Reply
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    sender_name: string;
    message: string;
  } | null>(null);

  // Active Context Menu for bubble
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);

  // WhatsApp @ Mention Autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(0);
  const [mentionIndex, setMentionIndex] = useState<number>(0);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sms_teacher_chat_sound");
      return stored !== "false";
    }
    return true;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  const handleOpen = () => {
    if (propOnOpen) propOnOpen();
    else setInternalIsOpen(true);
  };

  const handleClose = () => {
    setActiveMenuMsgId(null);
    if (propOnClose) propOnClose();
    else setInternalIsOpen(false);
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sms_teacher_chat_sound", String(next));
      }
      if (next) playWhatsAppChime();
      return next;
    });
  };

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teachers/chat?limit=80");
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        if (Array.isArray(data.faculty) && data.faculty.length > 0) {
          setFaculty(data.faculty);
        }
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMessages();
    }
  }, [isOpen, loadMessages]);

  const allFaculty = useMemo(() => {
    const map = new Map<string, FacultyMember>();
    faculty.forEach((f) => map.set(f.name.toLowerCase().trim(), f));

    messages.forEach((m) => {
      const key = m.sender_name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { id: m.user_id, name: m.sender_name, designation: "Teacher" });
      }
    });

    if (currentProfile?.full_name) {
      const myKey = currentProfile.full_name.toLowerCase().trim();
      if (!map.has(myKey)) {
        map.set(myKey, { id: currentUser?.id, name: currentProfile.full_name, designation: currentProfile.role || "Teacher" });
      }
    }

    return Array.from(map.values());
  }, [faculty, messages, currentProfile, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      onUnreadChange?.(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
  }, [isOpen, onUnreadChange]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBottom(false);
  };

  const scrollToQuotedMessage = (id: string) => {
    const el = document.getElementById(`wa-msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-[#25d366]/20", "dark:bg-[#00a884]/30", "transition-colors", "duration-500");
      setTimeout(() => {
        el.classList.remove("bg-[#25d366]/20", "dark:bg-[#00a884]/30");
      }, 1400);
    } else {
      showToast({
        type: "info",
        title: "Earlier Message",
        description: "Quoted message is from earlier in history.",
      });
    }
  };

  // Realtime Supabase Listener
  useEffect(() => {
    const channel = supabase
      .channel("public:teacher_chat_messages:lounge_wa")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "teacher_chat_messages" },
        (payload) => {
          const newMsg = payload.new as TeacherChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          const myName = (currentStaff?.full_name || currentProfile?.full_name || "").toLowerCase().trim();
          const isMentioned = myName && newMsg.message.toLowerCase().includes(`@${myName}`);

          if (newMsg.user_id !== currentUser?.id) {
            if (soundEnabled) {
              playWhatsAppChime();
            }

            if (!isOpen) {
              setUnreadCount((prev) => {
                const next = prev + 1;
                onUnreadChange?.(next);
                return next;
              });

              showToast({
                type: isMentioned ? "warning" : "info",
                title: isMentioned
                  ? `📢 ${newMsg.sender_name} mentioned you!`
                  : newMsg.sender_name,
                description: parseMessage(newMsg.message).cleanText,
              });

              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                new Notification(newMsg.sender_name, {
                  body: parseMessage(newMsg.message).cleanText,
                  icon: "/favicon.ico",
                });
              }
            } else {
              const el = scrollContainerRef.current;
              if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 220) {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }
          } else {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "teacher_chat_messages" },
        (payload) => {
          const updatedMsg = payload.new as TeacherChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentUser?.id, isOpen, soundEnabled, onUnreadChange, currentStaff, currentProfile]);

  // @ Mention detection as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@([a-zA-Z0-9_\s]{0,25})$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[1].length - 1);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (teacher: FacultyMember) => {
    const before = inputText.slice(0, mentionStart);
    const cursorPos = textareaRef.current?.selectionStart || inputText.length;
    const after = inputText.slice(cursorPos);
    const newText = `${before}@${teacher.name} ${after}`;
    setInputText(newText);
    setMentionQuery(null);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + teacher.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 50);
  };

  const filteredMentionFaculty = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim();
    return allFaculty
      .filter((f) => f.name.toLowerCase().includes(q) || f.designation?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [allFaculty, mentionQuery]);

  // Send message with WhatsApp quoted reply
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    let fullPayload = trimmed;
    if (replyingTo) {
      const cleanSnippet = parseMessage(replyingTo.message).cleanText.slice(0, 90).replace(/\n/g, " ");
      fullPayload = `[reply:${replyingTo.id}|${replyingTo.sender_name}|${encodeURIComponent(cleanSnippet)}]${trimmed}`;
    }

    setSending(true);
    try {
      const res = await fetch("/api/teachers/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullPayload }),
      });
      const data = await res.json();
      if (data.success) {
        setInputText("");
        setReplyingTo(null);
        setMentionQuery(null);
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      } else {
        showToast({
          type: "error",
          title: "Send Failed",
          description: data.error || "Could not send message.",
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      const res = await fetch(`/api/teachers/chat/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editingText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, message: editingText.trim(), is_edited: true } : m))
        );
        setEditingId(null);
        setEditingText("");
      }
    } catch (err) {
      console.error("Failed to update message:", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!await confirm({ title: "Delete this message for everyone?", destructive: true })) return;
    try {
      const res = await fetch(`/api/teachers/chat/${msgId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true, message: "This message was deleted" } : m))
        );
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleStartReply = (msg: TeacherChatMessage) => {
    setActiveMenuMsgId(null);
    setReplyingTo({
      id: msg.id,
      sender_name: msg.sender_name,
      message: parseMessage(msg.message).cleanText,
    });
    textareaRef.current?.focus();
  };

  const handleMentionUser = (name: string) => {
    setInputText((prev) => `${prev ? `${prev} ` : ""}@${name} `);
    textareaRef.current?.focus();
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.message.toLowerCase().includes(q) ||
        m.sender_name.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Group messages by Date (WhatsApp format: TODAY, YESTERDAY, Oct 15, 2026)
  const messageGroups = useMemo(() => {
    const groups: { [dateStr: string]: TeacherChatMessage[] } = {};
    filteredMessages.forEach((msg) => {
      const date = new Date(msg.created_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });

      if (date.toDateString() === today.toDateString()) {
        key = "TODAY";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "YESTERDAY";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(msg);
    });
    return groups;
  }, [filteredMessages]);

  // Render message text with WhatsApp-style @Mentions
  const renderMessageContent = (text: string, isBubbleMe: boolean) => {
    const myName = (currentStaff?.full_name || currentProfile?.full_name || "").toLowerCase().trim();
    const parts = text.split(/(@[a-zA-Z0-9_\s]{2,30}?(?=[.,!?\n\r]|$|\s{2,}))/g);

    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const mentionName = part.slice(1).trim();
        const isMeMentioned = myName && mentionName.toLowerCase() === myName;

        return (
          <span
            key={idx}
            className={cn(
              "font-bold select-none cursor-pointer",
              isMeMentioned
                ? "bg-[#25d366]/30 text-[#005c4b] dark:text-[#25d366] px-1 py-0.2 rounded"
                : isBubbleMe
                ? "text-[#027eb5] dark:text-[#53bdeb] underline"
                : "text-[#027eb5] dark:text-[#53bdeb] underline"
            )}
          >
            @{mentionName}
          </span>
        );
      }
      return part;
    });
  };

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      {/* 1. True Full-Screen Floating Action Button (WhatsApp Green FAB) */}
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

            {/* Search Bar Overlay if Active */}
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

            {/* WhatsApp Chat Wall with subtle wallpaper styling */}
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

            {/* WhatsApp-Style Quoted Reply Preview Bar */}
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

            {/* WhatsApp Input Bar (Bottom attached with safe-area padding) */}
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
          </div>
        </>
      )}
    </>,
    document.body
  );
}
