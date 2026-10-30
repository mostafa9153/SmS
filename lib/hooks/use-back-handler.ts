"use client";

import { useEffect, useRef } from "react";

type BackHandler = () => void;

const stack: { current: BackHandler | null }[] = [];

/** Runs the newest registered handler; false when the page has none (caller falls back to history). */
export function runBackHandler(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    const fn = stack[i].current;
    if (fn) {
      fn();
      return true;
    }
  }
  return false;
}

/** Lets a page take over the top bar Back button, e.g. to go one wizard step back instead of leaving the section. */
export function useBackHandler(handler: BackHandler | null) {
  const ref = useRef<BackHandler | null>(null);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    stack.push(ref);
    return () => {
      const i = stack.indexOf(ref);
      if (i !== -1) stack.splice(i, 1);
    };
  }, []);
}
