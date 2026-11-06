"use client";

import { useEffect, useRef } from "react";
import { createScannerBuffer, deskShortcut, isEditableTarget, type DeskShortcut } from "./scanner-input";

/**
 * Window-level capture for the desk (C3). A scanner's burst typed while focus
 * is on a button or the page body is delivered as a scan; typing inside any
 * field (the scan box included) is left to that field. The burst's Enter is
 * swallowed so it can never press a focused button (W4).
 */
export function useScannerCapture(opts: {
  enabled: boolean;
  onScan: (code: string) => void;
  onShortcut: (s: DeskShortcut) => void;
}) {
  const handlers = useRef(opts);
  useEffect(() => {
    handlers.current = opts;
  });

  useEffect(() => {
    if (!opts.enabled) return;
    const buffer = createScannerBuffer();
    const onKeyDown = (e: KeyboardEvent) => {
      const shortcut = deskShortcut(e);
      if (shortcut) {
        if (shortcut === "close" && isEditableTarget(e.target)) return;
        e.preventDefault();
        handlers.current.onShortcut(shortcut);
        return;
      }
      if (isEditableTarget(e.target)) {
        buffer.reset();
        return;
      }
      const code = buffer.push(e, performance.now());
      if (code) {
        e.preventDefault();
        e.stopPropagation();
        handlers.current.onScan(code);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [opts.enabled]);
}
