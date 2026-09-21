"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Calendar, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function TopMobileHeader() {
  const [greeting, setGreeting] = useState("Welcome");
  const [userName, setUserName] = useState("Administrator");
  const [today, setToday] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    setToday(
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );

    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.full_name || user.email?.split("@")[0];
          if (name) setUserName(name);
        }
      } catch (e) {
        // Fallback to default
      }
    }
    loadUser();
  }, []);

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-border/60 dark:border-white/10 relative transition-all duration-300 shadow-sm dark:shadow-none">
      {/* Background iOS Ambient Glows - isolated in overflow-hidden container to avoid clipping notifications */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-500/10 dark:bg-[#FACC15]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-emerald-500/10 dark:bg-[#10B981]/10 rounded-full blur-3xl" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        {/* Left: Greeting & Academic Session */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-gold inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-[#FACC15] animate-pulse" />
              Session 2026-27 Active
            </span>

            {today && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 dark:bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-border/50 dark:border-white/5">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                {today}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>{greeting},</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-amber-800 dark:from-white dark:via-slate-200 dark:to-[#FACC15]">
              {userName}
            </span>
          </h1>

          <p className="text-xs text-muted-foreground font-medium">
            Marigachi High School (H.S.) · Management Console
          </p>
        </div>

        {/* Right: Actions with Notifications, Theme Toggle & Quick Shortcuts */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* iOS Glass Notification Bell Trigger */}
          <div className="glass-pill rounded-2xl flex items-center justify-center p-0.5 border border-border/60 dark:border-white/10 shrink-0">
            <NotificationPanel />
          </div>

          {/* Theme Toggle (Light / Dark Mode) */}
          <ThemeToggle />

          <Link
            href="/admission"
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 dark:from-[#FACC15] dark:to-[#F59E0B] px-4 py-2.5 text-xs font-black text-slate-950 hover:opacity-95 transition-all active:scale-95 shadow-sm border border-amber-600/30 dark:border-transparent dark:shadow-[0_0_20px_rgba(250,204,21,0.3)]"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Admission</span>
          </Link>

          <Link
            href="/generate"
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-2xl glass-pill px-3.5 py-2.5 text-xs font-bold text-foreground hover:border-amber-500/40 dark:hover:border-[#FACC15]/40 hover:text-amber-800 dark:hover:text-[#FACC15] transition-all active:scale-95 border border-border/60 dark:border-white/10"
          >
            <Sparkles className="h-4 w-4 text-amber-700 dark:text-[#FACC15]" />
            <span>Generate</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
