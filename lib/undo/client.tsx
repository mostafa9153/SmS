"use client";

import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";

const UNDO_WINDOW_MS = 10_000;

/**
 * Success toast with an Undo button for an action whose API response carried an `undoId`.
 * `onUndone` should refresh whatever the action changed (e.g. invalidate queries).
 */
export function toastWithUndo(message: string, undoId: string | null | undefined, onUndone?: () => void) {
  if (!undoId) {
    toast.success(message);
    return;
  }
  toast.success(message, {
    duration: UNDO_WINDOW_MS,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          await apiFetch(`/api/undo/${undoId}`, { method: "POST" });
          toast.success("Undone");
          onUndone?.();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Undo failed");
        }
      },
    },
  });
}
