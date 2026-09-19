"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  Users,
  Activity,
  School,
  CalendarClock,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Settings,
  Lock,
  ChevronRight,
  UserCheck,
  Award,
  CheckCircle2,
  Sliders,
  Database,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function AdminHubPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalTeachers: 0,
    activeTeachers: 0,
    totalUsers: 0,
    totalStudents: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadQuickStats() {
      try {
        const supabase = createClient();
        const [teachersRes, usersRes, studentsRes] = await Promise.all([
          supabase.from("staff_profiles").select("id, status", { count: "exact" }),
          supabase.from("user_roles").select("id", { count: "exact" }),
          supabase.from("students").select("id", { count: "exact" }),
        ]);

        const totalTeachers = teachersRes.count || 0;
        const activeTeachers =
          teachersRes.data?.filter((t) => t.status === "ACTIVE").length || totalTeachers;
        const totalUsers = usersRes.count || 0;
        const totalStudents = studentsRes.count || 0;

        setStats({
          totalTeachers,
          activeTeachers,
          totalUsers,
          totalStudents,
          loading: false,
        });
      } catch (err) {
        console.error("Error loading admin stats:", err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }

    loadQuickStats();
  }, []);

  const controlCenters = [
    {
      id: "teacher-management",
      title: "Teacher Management",
      subtitle: "Access, classes & tasks",
      badge: stats.loading ? "..." : `${stats.activeTeachers} Active`,
      href: "/teacher-management",
      icon: <GraduationCap className="h-5 w-5" />,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      id: "authorized-users",
      title: "Authorized Users",
      subtitle: "Manage accounts & security",
      badge: stats.loading ? "..." : `${stats.totalUsers} Logins`,
      href: "/settings/users",
      icon: <Users className="h-5 w-5" />,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      id: "system-audit",
      title: "System Audit",
      subtitle: "Audit trail & security logs",
      badge: "Real-time",
      href: "/settings/audit",
      icon: <Activity className="h-5 w-5" />,
      iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    },
    {
      id: "school-details",
      title: "School Details",
      subtitle: "Branding, UDISE & profile",
      badge: "Institutional",
      href: "/settings/school-details",
      icon: <School className="h-5 w-5" />,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      id: "academic-sessions",
      title: "Academic Sessions",
      subtitle: "Terms, calendars & cycles",
      badge: `${new Date().getFullYear()}`,
      href: "/settings/academic-session",
      icon: <CalendarClock className="h-5 w-5" />,
      iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    },
    {
      id: "presets",
      title: "Presets & Templates",
      subtitle: "Banks, IFSC & feeder schools",
      badge: "Quick Fill",
      href: "/settings/presets",
      icon: <MapPin className="h-5 w-5" />,
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* 1. Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/80 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground tracking-tight">
              Administrative Control Centers
            </h1>
            <Badge className="bg-indigo-600 text-white dark:bg-indigo-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-2xs">
              Admin Panel
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/teacher-management"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors cursor-pointer gap-1.5 shadow-xs flex items-center"
            )}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Teacher Management</span>
          </Link>
          <Link
            href="/settings"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8.5 rounded-xl border-border/80 bg-card hover:bg-muted text-xs font-semibold transition-colors cursor-pointer gap-1.5 shadow-2xs flex items-center"
            )}
          >
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </div>

      {/* 2. Key Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Teachers</p>
            <p className="text-lg font-extrabold text-foreground leading-tight">
              {stats.loading ? "..." : stats.totalTeachers}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Logins</p>
            <p className="text-lg font-extrabold text-foreground leading-tight">
              {stats.loading ? "..." : stats.totalUsers}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Students</p>
            <p className="text-lg font-extrabold text-foreground leading-tight">
              {stats.loading ? "..." : stats.totalStudents}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-2xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">System</p>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
              Online
            </p>
          </div>
        </div>
      </div>

      {/* 3. Administrative Control Centers Grid */}
      <section className="p-5 rounded-3xl bg-card border border-border/80 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Administrative Control Centers
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {controlCenters.map((center) => (
            <Link
              key={center.id}
              href={center.href}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 hover:bg-muted border border-border/60 transition-all duration-150 group shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    center.iconBg
                  )}
                >
                  {center.icon}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {center.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {center.subtitle}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all shrink-0 ml-2" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
