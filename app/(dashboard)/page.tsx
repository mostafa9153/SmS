import Link from "next/link";
import { UserPlus, Upload, Search, ShieldCheck, Award, CalendarClock, ArrowRight, Sparkles } from "lucide-react";
import { StatCards } from "@/components/dashboard/stat-cards";
import { StatusChart } from "@/components/dashboard/status-chart";
import { ClassStrengthChart } from "@/components/dashboard/class-strength-chart";
import { CategoryDistributionChart } from "@/components/dashboard/category-distribution-chart";
import { WelfareSchemesVisual } from "@/components/dashboard/welfare-schemes-visual";

export default function DashboardPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Hero Welcome Header */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 border border-primary/15 p-4 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-primary/30">
                <Sparkles className="h-3.5 w-3.5" /> Session {currentYear} Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              MHS School Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            <Link
              href="/students/bulk-upload"
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl border border-primary/20 bg-background/80 px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-all duration-150 active:scale-95 shadow-2xs"
            >
              <Upload className="h-4 w-4 text-primary" />
              Bulk Upload
            </Link>
            <Link
              href="/students/add"
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition-all duration-150 active:scale-95 shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              Add Student
            </Link>
          </div>
        </div>
      </div>

      {/* 1. Stat Cards */}
      <StatCards />

      {/* 2. Category & Welfare Visual Analytics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CategoryDistributionChart />
        <WelfareSchemesVisual />
      </div>

      {/* 3. Class Strength & Enrolment Status Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ClassStrengthChart />
        <StatusChart />
      </div>

      {/* Quick Action Hub */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold tracking-tight text-foreground">
            Quick Action Modules
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/students/add"
            className="group flex items-center gap-3.5 rounded-2xl border bg-card/90 p-4 hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200 ring-1 ring-emerald-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                Add New Student
              </p>
            </div>
          </Link>

          <Link
            href="/results"
            className="group flex items-center gap-3.5 rounded-2xl border bg-card/90 p-4 hover:border-amber-500/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-200 ring-1 ring-amber-500/20">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-amber-600 transition-colors">
                Results & Marksheets
              </p>
            </div>
          </Link>

          <Link
            href="/students/bulk-upload"
            className="group flex items-center gap-3.5 rounded-2xl border bg-card/90 p-4 hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200 ring-1 ring-blue-500/20">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-blue-600 transition-colors">
                Bulk Upload Center
              </p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="group flex items-center gap-3.5 rounded-2xl border bg-card/90 p-4 hover:border-rose-500/40 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform duration-200 ring-1 ring-rose-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-rose-600 transition-colors">
                Admin & Access Roles
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
