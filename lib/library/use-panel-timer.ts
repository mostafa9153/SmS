"use client";

import { useEffect, useRef, useState } from "react";

export const PANEL_IDLE_MS = 60_000;
export const PANEL_WARN_MS = 10_000;

/**
 * W5: the borrower panel closes after a minute of no activity. Any key or
 * mouse move restarts the clock; while `paused` (a question is open or
 * something is being typed) it stays full. Returns the time left.
 */
export function usePanelTimer(active: boolean, paused: boolean, onExpire: () => void) {
  const [left, setLeft] = useState(PANEL_IDLE_MS);
  const lastActive = useRef(0);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    if (!active) return;
    lastActive.current = Date.now();
    const bump = () => {
      lastActive.current = Date.now();
    };
    const events = ["keydown", "mousemove", "pointerdown", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, bump, true);
    const timer = setInterval(() => {
      if (paused) lastActive.current = Date.now();
      const remaining = PANEL_IDLE_MS - (Date.now() - lastActive.current);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) expire.current();
    }, 250);
    return () => {
      for (const e of events) window.removeEventListener(e, bump, true);
      clearInterval(timer);
      setLeft(PANEL_IDLE_MS);
    };
  }, [active, paused]);

  return left;
}
