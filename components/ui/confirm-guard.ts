import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

/** Set on the confirm popup; while it exists, other dialogs must not dismiss themselves. */
export const CONFIRM_ATTR = "data-confirm-dialog";

const DISMISS_REASONS = new Set(["outside-press", "escape-key", "focus-out"]);

type OnOpenChange = DialogPrimitive.Root.Props["onOpenChange"];

/**
 * The confirm dialog is mounted at the app root, so a dialog/sheet that asks
 * for confirmation sees clicks, Escape and focus inside it as "outside" and
 * would close underneath it. Cancel those dismissals while a confirm is open.
 */
export function keepOpenDuringConfirm(onOpenChange: OnOpenChange): NonNullable<OnOpenChange> {
  return (open, details) => {
    if (!open && DISMISS_REASONS.has(details.reason) && typeof document !== "undefined" && document.querySelector(`[${CONFIRM_ATTR}]`)) {
      details.cancel();
      return;
    }
    onOpenChange?.(open, details);
  };
}
