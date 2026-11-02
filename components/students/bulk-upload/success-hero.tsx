"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from 0 up to `value` once, easing out. */
export function CountUp({ value, delay = 0, duration = 900 }: { value: number; delay?: number; duration?: number }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  useEffect(() => {
    if (reducedMotion() || value <= 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, delay, duration]);
  return <>{shown}</>;
}

/** Animated check badge; fires confetti once when `celebrate` is set. */
export function SuccessHero({ celebrate, warn }: { celebrate: boolean; warn?: boolean }) {
  useEffect(() => {
    if (!celebrate || reducedMotion()) return;
    let cancelled = false;
    const timers: number[] = [];
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const colors = ["#10b981", "#34d399", "#2563eb", "#f59e0b", "#ec4899"];
      timers.push(window.setTimeout(() => confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.35 }, colors }), 450));
      timers.push(
        window.setTimeout(() => {
          confetti({ particleCount: 55, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors });
          confetti({ particleCount: 55, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors });
        }, 750),
      );
    });
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [celebrate]);

  const tone = warn ? "amber" : "emerald";
  return (
    <div className="relative mx-auto h-16 w-16">
      <span className={cn("absolute inset-0 rounded-full animate-success-ring", tone === "amber" ? "bg-amber-400/40" : "bg-emerald-400/40")} />
      <span
        className={cn("absolute inset-0 rounded-full animate-success-ring", tone === "amber" ? "bg-amber-400/30" : "bg-emerald-400/30")}
        style={{ animationDelay: "0.55s" }}
      />
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg animate-success-badge",
          tone === "amber"
            ? "bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-500/30"
            : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" className="animate-success-check" />
        </svg>
      </div>
    </div>
  );
}
