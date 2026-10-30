"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { onClientNotification, type ClientNotificationEvent } from "@/lib/notifications/client-events";
import type { AppNotification, NotificationCategory } from "@/lib/notifications/types";

export type { AppNotification };
type NotificationType = NotificationCategory;

interface NotificationContextProps {
  notifications: AppNotification[];
  addNotification: (type: NotificationType, title: string, message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const QUERY_KEY = ["notifications"] as const;
const DEDUPE_MS = 30_000;

function post(body: unknown) {
  return apiFetch<{ id?: string }>("/api/notifications", { method: "POST", json: body });
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState<AppNotification[]>([]);
  const recent = useRef(new Map<string, number>());
  const pathname = usePathname() ?? "";
  const signedOutPage = pathname.startsWith("/login") || pathname.startsWith("/teacher/login") || pathname.startsWith("/apply/");

  const { data: serverItems = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<AppNotification[]>("/api/notifications"),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
    enabled: !signedOutPage,
    meta: { silent: true },
  });

  const push = useCallback(
    (event: ClientNotificationEvent) => {
      const key = `${event.title}|${event.message}`;
      const now = Date.now();
      if (now - (recent.current.get(key) ?? 0) < DEDUPE_MS) return;
      recent.current.set(key, now);

      const id = `local-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      setLocalItems((prev) => [
        { id, type: event.category, severity: event.severity, title: event.title, message: event.message, link: event.link, time: now, isRead: false, local: true },
        ...prev,
      ]);

      if (event.persist === false) return;
      // Persist so it survives reloads; keep the local copy if the server is unavailable.
      post({ action: "report", title: event.title, message: event.message, severity: event.severity, category: event.category, link: event.link })
        .then(() => {
          setLocalItems((prev) => prev.filter((n) => n.id !== id));
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        })
        .catch(() => {});
    },
    [queryClient],
  );

  useEffect(() => onClientNotification(push), [push]);

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string) =>
      push({ category: type, severity: type === "system" ? "error" : "success", title, message }),
    [push],
  );

  const setServer = useCallback(
    (update: (items: AppNotification[]) => AppNotification[]) =>
      queryClient.setQueryData<AppNotification[]>(QUERY_KEY, (prev) => update(prev ?? [])),
    [queryClient],
  );

  const markAsRead = useCallback(
    (id: string) => {
      if (id.startsWith("local-")) {
        setLocalItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        return;
      }
      setServer((items) => items.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      post({ action: "read", ids: [id] }).catch(() => {});
    },
    [setServer],
  );

  const markAllAsRead = useCallback(() => {
    setLocalItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setServer((items) => items.map((n) => ({ ...n, isRead: true })));
    post({ action: "read_all" }).catch(() => {});
  }, [setServer]);

  const clearAll = useCallback(() => {
    setLocalItems([]);
    setServer(() => []);
    post({ action: "clear_all" }).catch(() => {});
  }, [setServer]);

  const notifications = useMemo(
    () => [...localItems, ...serverItems].sort((a, b) => b.time - a.time),
    [localItems, serverItems],
  );
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead, clearAll, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

const defaultContextValue: NotificationContextProps = {
  notifications: [],
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
  unreadCount: 0,
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  return context || defaultContextValue;
}
