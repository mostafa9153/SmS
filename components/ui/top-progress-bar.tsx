"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { playTap } from "@/lib/utils/audio-feedback";

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Complete progress bar when route finishes transitioning
  useEffect(() => {
    if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept internal link clicks to give instant 0ms feedback
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const isTargetBlank = target.getAttribute("target") === "_blank";
      const isExternal = href?.startsWith("http") || href?.startsWith("//");
      const isDownload = target.hasAttribute("download");

      if (href && !isTargetBlank && !isExternal && !isDownload && href !== "#") {
        // Trigger tactile micro-sound
        playTap();

        // Start top progress bar immediately
        setVisible(true);
        setProgress(25);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 85;
            }
            return prev + Math.random() * 15;
          });
        }, 120);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 12px rgba(99, 102, 241, 0.8), 0 0 6px rgba(168, 85, 247, 0.6)",
        }}
      />
    </div>
  );
}

export function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
