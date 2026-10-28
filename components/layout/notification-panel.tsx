"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, BellOff, BellRing, Check, Trash2, AlertCircle, AlertTriangle, CheckCircle2, Activity, Info, X, ShieldAlert, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications, type AppNotification } from "@/lib/stores/notification-store";
import type { NotificationSeverity } from "@/lib/notifications/types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push/client";

export function NotificationPanel() {
  const { notifications, markAsRead, markAllAsRead, clearAll, unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState<"activity" | "system">("activity");
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filteredNotifications = notifications.filter((n) => n.type === activeTab);
  const hasUnread = unreadCount > 0;

  // Click-outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          // Open on the tab that needs attention: unread system alerts win.
          if (!isOpen) setActiveTab(notifications.some((n) => n.type === "system" && !n.isRead) ? "system" : "activity");
          setIsOpen(!isOpen);
        }}
        title="System & Activity Notifications"
        aria-label="System notifications"
        className={cn(
          "relative flex items-center justify-center min-h-[38px] min-w-[38px] rounded-lg p-2 text-muted-foreground transition-all duration-150 outline-none cursor-pointer",
          "hover:bg-accent/80 hover:text-foreground active:scale-95",
          isOpen && "bg-accent text-foreground ring-1 ring-primary/20"
        )}
      >
        <Bell className="h-4.5 w-4.5" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-1.5 ring-background" />
          </span>
        )}
      </button>

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 top-14 sm:top-full mt-0 sm:mt-2 w-auto sm:w-[380px] max-w-[calc(100vw-1rem)] sm:max-w-none rounded-2xl border border-border/80 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-xl z-50 overflow-hidden outline-none animate-in fade-in-0 zoom-in-95 duration-150 origin-top-right"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/25">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-foreground">Notifications</h3>
              {hasUnread ? (
                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-rose-500/20">
                  {unreadCount} new
                </span>
              ) : (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <PushToggle />
              {notifications.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    title="Mark all as read"
                    className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors text-xs font-semibold flex items-center gap-1 px-2 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span className="text-[10px]">Read all</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => clearAll()}
                    title="Clear all"
                    className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer ml-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-2 p-1.5 gap-1 border-b border-border/50 bg-muted/10">
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                activeTab === "activity"
                  ? "bg-background text-primary shadow-xs ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span>User Activity</span>
              {notifications.filter((n) => n.type === "activity" && !n.isRead).length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("system")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                activeTab === "system"
                  ? "bg-background text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-rose-500/25"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              <span>System Alerts</span>
              {notifications.filter((n) => n.type === "system" && !n.isRead).length > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              )}
            </button>
          </div>

          {/* Content List */}
          <div className="max-h-[320px] overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <div className="h-10 w-10 rounded-2xl bg-muted/60 flex items-center justify-center mb-2.5 shadow-2xs">
                  {activeTab === "activity" ? (
                    <Sparkles className="h-5 w-5 text-muted-foreground/60" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-muted-foreground/60" />
                  )}
                </div>
                <p className="text-xs font-bold text-foreground">
                  No {activeTab === "activity" ? "Recent Activity" : "System Alerts"}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onRead={() => {
                    markAsRead(notif.id);
                    if (notif.link) {
                      setIsOpen(false);
                      router.push(notif.link);
                    }
                  }}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-2 border-t border-border/50 bg-muted/15 flex items-center justify-between text-[10px] text-muted-foreground px-3">
              <span>{filteredNotifications.length} items logged</span>
              <span className="font-mono">Live Sync</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SEVERITY_STYLE: Record<NotificationSeverity, { unread: string; bar: string; icon: string; Icon: typeof Info }> = {
  info: { unread: "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10", bar: "bg-blue-500", icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20", Icon: Info },
  success: { unread: "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10", bar: "bg-emerald-500", icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20", Icon: CheckCircle2 },
  warning: { unread: "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10", bar: "bg-amber-500", icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20", Icon: AlertTriangle },
  error: { unread: "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10", bar: "bg-rose-500", icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20", Icon: AlertCircle },
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: () => void;
}) {
  const style = SEVERITY_STYLE[notification.severity] ?? SEVERITY_STYLE.info;
  const Icon = style.Icon;

  return (
    <div
      onClick={onRead}
      className={cn(
        "relative flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 group border",
        !notification.isRead ? style.unread : "bg-card/60 border-border/40 opacity-75 hover:opacity-100 hover:bg-accent/40"
      )}
    >
      {!notification.isRead && (
        <span className={cn("absolute left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full", style.bar)} />
      )}

      <div className={cn("shrink-0 flex items-center justify-center h-7 w-7 rounded-lg shadow-2xs mt-0.5 ml-1 ring-1", style.icon)}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-xs font-bold truncate",
              !notification.isRead ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {notification.title}
          </p>
          <span className="shrink-0 text-[9px] font-medium text-muted-foreground/80">
            {formatDistanceToNow(notification.time, { addSuffix: true })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
          {notification.message}
        </p>
      </div>
    </div>
  );
}

const PUSH_TITLE: Record<PushState, string> = {
  on: "Device notifications on",
  off: "Turn on device notifications",
  denied: "Notifications are blocked in browser settings",
  unsupported: "",
  unconfigured: "",
};

/** Subscribes this browser to web push so alerts reach the phone/desktop even when the app is closed. */
function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState, () => setState("unsupported"));
  }, []);

  if (!state || state === "unsupported" || state === "unconfigured") return null;

  async function toggle() {
    if (busy || state === "denied") return;
    setBusy(true);
    try {
      const next = state === "on" ? await disablePush() : await enablePush();
      setState(next);
      if (next === "on") toast.success("Device notifications on");
      else if (next === "denied") toast.error("Notifications are blocked in browser settings");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change device notifications");
    } finally {
      setBusy(false);
    }
  }

  const Icon = state === "on" ? BellRing : BellOff;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || state === "denied"}
      title={PUSH_TITLE[state]}
      aria-label={PUSH_TITLE[state]}
      aria-pressed={state === "on"}
      className={cn(
        "p-1 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        state === "on" ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", busy && "animate-pulse")} />
    </button>
  );
}
