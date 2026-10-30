
import { QUICK_TAGS, WHATSAPP_SENDER_COLORS } from "@/components/teacher/lounge/constants";

export function getWhatsAppSenderColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return WHATSAPP_SENDER_COLORS[Math.abs(hash) % WHATSAPP_SENDER_COLORS.length];
}

export function getInitials(name: string): string {
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

export function parseMessage(raw: string): {
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
