"use client";

import type { TeacherLoungeDrawerProps } from "./types";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { showToast } from "@/components/ui/toast-banner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FacultyMember, TeacherChatMessage } from "@/components/teacher/lounge/types";
import { playWhatsAppChime } from "@/components/teacher/lounge/chime";
import { parseMessage } from "@/components/teacher/lounge/helpers";

export function useLoungeDrawer({
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
      const data = await apiFetch<{ messages?: TeacherChatMessage[]; faculty?: FacultyMember[] }>(
        "/api/teachers/chat?limit=80"
      );
      setMessages(data.messages || []);
      if (Array.isArray(data.faculty) && data.faculty.length > 0) {
        setFaculty(data.faculty);
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
      await apiFetch("/api/teachers/chat", {
        method: "POST",
        json: { message: fullPayload },
      });
      setInputText("");
      setReplyingTo(null);
      setMentionQuery(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err) {
      if (err instanceof ApiError) {
        showToast({
          type: "error",
          title: "Send Failed",
          description: err.message || "Could not send message.",
        });
      } else {
        console.error("Failed to send message:", err);
      }
    } finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await apiFetch(`/api/teachers/chat/${msgId}`, {
        method: "PATCH",
        json: { message: editingText.trim() },
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, message: editingText.trim(), is_edited: true } : m))
      );
      setEditingId(null);
      setEditingText("");
    } catch (err) {
      console.error("Failed to update message:", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!await confirm({ title: "Delete this message for everyone?", destructive: true })) return;
    try {
      await apiFetch(`/api/teachers/chat/${msgId}`, {
        method: "DELETE",
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_deleted: true, message: "This message was deleted" } : m))
      );
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

  // Focus happens in an effect so the click handler never touches the ref
  const [mentionFocus, setMentionFocus] = useState(0);
  useEffect(() => {
    if (mentionFocus) textareaRef.current?.focus();
  }, [mentionFocus]);
  const handleMentionUser = (name: string) => {
    setInputText((prev) => `${prev ? `${prev} ` : ""}@${name} `);
    setMentionFocus((n) => n + 1);
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

  return {
    activeMenuMsgId,
    allFaculty,
    currentUser,
    editingId,
    editingText,
    filteredMentionFaculty,
    handleClose,
    handleDeleteMessage,
    handleInputChange,
    handleMentionUser,
    handleOpen,
    handleSaveEdit,
    handleScroll,
    handleSendMessage,
    handleStartReply,
    inputText,
    insertMention,
    isAnimatingOut,
    isOpen,
    isSearching,
    loading,
    mentionIndex,
    mentionQuery,
    messageGroups,
    messages,
    messagesEndRef,
    mounted,
    renderMessageContent,
    replyingTo,
    scrollContainerRef,
    scrollToBottom,
    scrollToQuotedMessage,
    searchQuery,
    sending,
    setActiveMenuMsgId,
    setEditingId,
    setEditingText,
    setInputText,
    setIsSearching,
    setMentionIndex,
    setMentionQuery,
    setMentionStart,
    setReplyingTo,
    setSearchQuery,
    shouldRender,
    showScrollBottom,
    soundEnabled,
    textareaRef,
    toggleSound,
    unreadCount,
  };
}

export type LoungeDrawerState = ReturnType<typeof useLoungeDrawer>;
