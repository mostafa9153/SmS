"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAcademicYear } from "@/lib/hooks/use-academic-year";
import { sessionLabel } from "@/lib/utils/academic-year";

export function TopMobileHeader() {
  const currentSession = useAcademicYear();
  const [greeting, setGreeting] = useState("Welcome");
  const [userName, setUserName] = useState("Administrator");
  const [today, setToday] = useState("");
  const [time, setTime] = useState("");

  // Live clock: greeting, date and time refresh every 20 seconds
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hour = now.getHours();
      setGreeting(hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening");
      setToday(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
      setTime(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
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
              Session {sessionLabel(currentSession)} Active
            </span>
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

        {/* Right: live time and date */}
        {today && (
          <div className="sm:text-right space-y-0.5 shrink-0">
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground tabular-nums leading-none">
              {time}
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {today}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
