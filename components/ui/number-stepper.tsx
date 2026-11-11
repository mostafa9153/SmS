"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Touch-friendly whole-number input: 44px −/+ buttons (hold to repeat) around a
 * typeable number. `changed` tints the value to show it differs from the saved one.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 100000,
  changed = false,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  changed?: boolean;
  /** Accessible name, e.g. "Bench working". */
  label: string;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.trunc(n)));
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const step = (d: number) => {
    const next = clamp(valueRef.current + d);
    if (next === valueRef.current) return;
    valueRef.current = next;
    onChange(next);
  };
  // Hold to repeat: first repeat after 400ms, then every 80ms.
  const start = (d: number) => {
    step(d);
    const loop = (delay: number) => {
      timer.current = setTimeout(() => {
        step(d);
        loop(80);
      }, delay);
    };
    loop(400);
  };

  const button = (d: number) => (
    <button
      type="button"
      aria-label={`${d > 0 ? "Increase" : "Decrease"} ${label}`}
      disabled={d < 0 ? value <= min : value >= max}
      onPointerDown={(e) => {
        e.preventDefault();
        start(d);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // Keyboard and screen readers fire a click with no pointer (detail 0); pointer presses are handled above.
      onClick={(e) => {
        if (e.detail === 0) step(d);
      }}
      className="h-11 w-11 shrink-0 grid place-items-center rounded-xl border bg-background text-foreground active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer select-none touch-manipulation"
    >
      {d > 0 ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
    </button>
  );

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {button(-1)}
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          setText(raw);
          if (raw !== "") onChange(clamp(Number(raw)));
        }}
        onBlur={() => setText(String(value))}
        className={cn(
          "h-11 w-14 rounded-xl border bg-background text-center text-base font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
          changed && "border-primary text-primary bg-primary/5",
        )}
      />
      {button(1)}
    </div>
  );
}
