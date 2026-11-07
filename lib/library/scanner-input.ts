import { SCANNER_MAX_GAP_MS, isScannerBurst } from "./scan-code";

/**
 * Keyboard handling for the library desk (plan C3, C4): telling a scanner's
 * burst from a person typing, and the Alt-based shortcuts. Pure, so it is
 * testable; `use-scanner-capture.ts` wires it to the window.
 */

export interface KeyLike {
  key: string;
  code?: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export type DeskShortcut = "renew" | "issue" | "search" | "close";

const ALT_SHORTCUTS: Record<string, DeskShortcut> = { KeyR: "renew", KeyI: "issue", KeyS: "search" };

/**
 * Alt+R renew, Alt+I issue, Alt+S search, Esc close. Bare letters are never
 * shortcuts: a School ID has `/` and letters in it, and a scanner types them fast.
 */
export function deskShortcut(e: KeyLike): DeskShortcut | null {
  if (e.ctrlKey || e.metaKey) return null;
  if (e.altKey) return ALT_SHORTCUTS[e.code ?? ""] ?? null;
  return e.key === "Escape" ? "close" : null;
}

const isPrintable = (e: KeyLike) => e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey;

export interface ScannerBuffer {
  /** Feed one keydown; returns the scanned code when a burst ends with Enter, else null. */
  push(e: KeyLike, nowMs: number): string | null;
  reset(): void;
}

/**
 * Collects printable keys typed outside any input. A gap longer than
 * `maxGapMs` starts the code over; on Enter the buffer counts as a scan only
 * if every key came at scanner speed, otherwise it is discarded.
 */
export function createScannerBuffer(maxGapMs = SCANNER_MAX_GAP_MS): ScannerBuffer {
  let chars = "";
  let times: number[] = [];
  const reset = () => {
    chars = "";
    times = [];
  };
  return {
    reset,
    push(e, nowMs) {
      if (e.ctrlKey || e.altKey || e.metaKey) return null;
      if (e.key === "Enter") {
        const burst = isScannerBurst(times, maxGapMs);
        const code = chars;
        reset();
        return burst && code ? code : null;
      }
      if (!isPrintable(e)) {
        // Shift and the like are part of typing a capital; Backspace, Tab etc. are a person.
        if (e.key.length > 1 && !["Shift", "CapsLock", "AltGraph"].includes(e.key)) reset();
        return null;
      }
      if (times.length && nowMs - times[times.length - 1] > maxGapMs) reset();
      chars += e.key;
      times.push(nowMs);
      return null;
    },
  };
}

/** A field a person types into; a scanner burst there belongs to that field. */
export function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  return !["button", "checkbox", "radio", "submit", "reset", "file", "range", "color"].includes((el as HTMLInputElement).type);
}
