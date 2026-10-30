export type NotificationCategory = "activity" | "system";
export type NotificationSeverity = "info" | "success" | "warning" | "error";
export type NotificationRole = "Admin" | "Staff" | "Teacher";

/** Shape returned by GET /api/notifications and used by the bell. */
export interface AppNotification {
  id: string;
  type: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string | null;
  time: number;
  isRead: boolean;
  /** true for entries that exist only in this browser tab (not persisted). */
  local?: boolean;
}

export const NOTIFICATION_LIMITS = { title: 200, message: 2000 } as const;
