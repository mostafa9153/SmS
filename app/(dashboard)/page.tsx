import Link from "next/link";
import nextDynamic from "next/dynamic";
import { GraduationCap, Sparkles, ShieldCheck, Award } from "lucide-react";
import { TopMobileHeader } from "@/components/dashboard/top-mobile-header";
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar";
import { StatCards } from "@/components/dashboard/stat-cards";
import { AppleActivityRings } from "@/components/dashboard/apple-activity-rings";
import { WelfareSchemesVisual } from "@/components/dashboard/welfare-schemes-visual";
import { Skeleton } from "@/components/ui/skeleton";

const StatusChart = nextDynamic(
  () => import("@/components/dashboard/status-chart").then((m) => m.StatusChart),
  { loading: () => <Skeleton className="h-[300px] w-full rounded-3xl" /> }
);
const ClassStrengthChart = nextDynamic(
  () => import("@/components/dashboard/class-strength-chart").then((m) => m.ClassStrengthChart),
  { loading: () => <Skeleton className="h-[300px] w-full rounded-3xl" /> }
);
const CategoryDistributionChart = nextDynamic(
  () => import("@/components/dashboard/category-distribution-chart").then((m) => m.CategoryDistributionChart),
  { loading: () => <Skeleton className="h-[300px] w-full rounded-3xl" /> }
);

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* 1. Top Mobile Header */}
      <TopMobileHeader />

      {/* 2. Horizontal Scrollable Touch Quick Action Glass Pills */}
      <QuickActionsBar />

      {/* 3. Bento Grid Metric Cards (Neon Cyber Amber & Emerald Highlights) */}
      <StatCards />

      {/* 4. Activity Rings (SVG rings for Attendance, Fees, Syllabus) */}
      <AppleActivityRings />

      {/* 5. Class Strength & Welfare Visual Analytics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ClassStrengthChart />
        <WelfareSchemesVisual />
      </div>

      {/* 6. Category & Enrolment Status Breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CategoryDistributionChart />
        <StatusChart />
      </div>

      {/* 7. Quick Action Hub (Glass Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-[#FACC15]" />
            Core Academic Modules
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Link
            href="/admission"
            className="glass-panel group flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-3xl p-4 border border-border/60 dark:border-white/10 shadow-sm dark:shadow-none hover:border-emerald-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] cursor-pointer"
          >
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Admission Portal
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                New intake & AI scanner
              </p>
            </div>
          </Link>

          <Link
            href="/results"
            className="glass-panel group flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-3xl p-4 border border-border/60 dark:border-white/10 shadow-sm dark:shadow-none hover:border-amber-500/40 dark:hover:border-[#FACC15]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(250,204,21,0.15)] cursor-pointer"
          >
            <div className="rounded-2xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-amber-800 dark:text-[#FACC15] group-hover:scale-110 transition-transform duration-200 shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-amber-800 dark:group-hover:text-[#FACC15] transition-colors">
                Results & Marks
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Tabulation & marksheets
              </p>
            </div>
          </Link>

          <Link
            href="/generate"
            className="glass-panel group flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-3xl p-4 border border-border/60 dark:border-white/10 shadow-sm dark:shadow-none hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] cursor-pointer"
          >
            <div className="rounded-2xl bg-purple-500/10 border border-purple-500/25 p-2.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Document Hub
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ID cards & certificates
              </p>
            </div>
          </Link>

          <Link
            href="/settings/users"
            className="glass-panel group flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-3xl p-4 border border-border/60 dark:border-white/10 shadow-sm dark:shadow-none hover:border-rose-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] cursor-pointer"
          >
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-2.5 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform duration-200 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                Admin Roles
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Security & privileges
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
