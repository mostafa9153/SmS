// Tiny pub/sub so non-React code (fetch helper, QueryClient caches) can raise
// bell notifications without importing the provider.
import type { NotificationCategory, NotificationSeverity } from "@/lib/notifications/types";

export interface ClientNotificationEvent {
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  /** Persist to the server so it survives reloads (default true for errors). */
  persist?: boolean;
}

type Listener = (event: ClientNotificationEvent) => void;
const listeners = new Set<Listener>();

export function onClientNotification(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitClientNotification(event: ClientNotificationEvent) {
  listeners.forEach((l) => l(event));
}

/** Report a failed request or unexpected error to the bell. */
export function reportClientError(title: string, err: unknown) {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Unexpected error";
  emitClientNotification({ category: "system", severity: "error", title, message });
}
