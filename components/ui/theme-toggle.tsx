"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    // Read current applied theme from DOM or localStorage
    const saved = localStorage.getItem("sms-theme");
    if (saved) {
      const darkActive = saved === "dark";
      setIsDark(darkActive);
      document.documentElement.classList.toggle("dark", darkActive);
    } else {
      const darkActive = document.documentElement.classList.contains("dark");
      setIsDark(darkActive);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sms-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sms-theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-xl bg-white/[0.05] border border-white/10 animate-pulse",
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode (লাইট মোড)" : "Switch to Dark Mode (ডার্ক মোড)"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={cn(
        "group relative flex items-center justify-center gap-2 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer",
        showLabel
          ? "w-full px-3.5 py-2.5 bg-muted/60 hover:bg-muted dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-border/70 dark:border-white/10 text-xs font-semibold text-foreground"
          : "h-9 w-9 glass-pill hover:border-amber-500/40 dark:hover:border-[#FACC15]/40 text-foreground hover:text-amber-700 dark:hover:text-[#FACC15] shadow-xs",
        className
      )}
    >
      <div className="relative h-4 w-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-[#FACC15] transition-all duration-300 transform group-hover:rotate-45 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
        ) : (
          <Moon className="h-4 w-4 text-indigo-500 transition-all duration-300 transform group-hover:-rotate-12 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
        )}
      </div>

      {showLabel && (
        <span className="flex-1 text-left">
          {isDark ? "Light Mode (লাইট মোড)" : "Dark Mode (ডার্ক মোড)"}
        </span>
      )}
    </button>
  );
}
