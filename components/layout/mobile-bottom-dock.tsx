"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Award,
  Briefcase,
  LayoutGrid,
  Sparkles,
  GraduationCap,
  ClipboardCheck,
  ArrowUpDown,
  Upload,
  ShieldCheck,
  Sliders,
  ChevronRight,
  Receipt,
  UserPlus,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

interface HubAction {
  title: string;
  desc: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accentBg: string;
}

const HUB_ACTIONS: HubAction[] = [
  {
    title: "Admission Portal",
    desc: "Online applicant intake & AI scan",
    href: "/admission",
    icon: GraduationCap,
    color: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    title: "Document Hub",
    desc: "Certificates, ID cards & marksheets",
    href: "/generate",
    icon: Sparkles,
    color: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "Results & Marks",
    desc: "Summative marks, ranks & marksheets",
    href: "/results",
    icon: Award,
    color: "text-yellow-600 dark:text-yellow-400",
    accentBg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    title: "EMS Exam Manager",
    desc: "Seating blueprint & room rosters",
    href: "/ems",
    icon: ClipboardCheck,
    color: "text-indigo-600 dark:text-indigo-400",
    accentBg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    title: "Teacher Workspace",
    desc: "Attendance & syllabus tracking",
    href: "/teacher",
    icon: Briefcase,
    color: "text-sky-600 dark:text-sky-400",
    accentBg: "bg-sky-500/10 border-sky-500/20",
  },
  {
    title: "Staff & Employees",
    desc: "Teaching & non-teaching staff directory",
    href: "/employees",
    icon: UserPlus,
    color: "text-blue-600 dark:text-blue-400",
    accentBg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "Bulk Upload Engine",
    desc: "Excel & Banglar Shiksha sync",
    href: "/students/bulk-upload",
    icon: Upload,
    color: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-500/10 border-teal-500/20",
  },
  {
    title: "Promotion & Transfer",
    desc: "Academic rollover & TC records",
    href: "/students/promotion",
    icon: ArrowUpDown,
    color: "text-purple-600 dark:text-purple-400",
    accentBg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    title: "Fee Invoices",
    desc: "Invoices, challans & receipts",
    href: "/admission/invoices",
    icon: Receipt,
    color: "text-amber-600 dark:text-yellow-400",
    accentBg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    title: "Admin Panel",
    desc: "Audit logs, security & backup",
    href: "/admin-hub",
    icon: ShieldCheck,
    color: "text-rose-600 dark:text-rose-400",
    accentBg: "bg-rose-500/10 border-rose-500/20",
  },
  {
    title: "System Settings",
    desc: "Academic session & user security",
    href: "/settings",
    icon: Sliders,
    color: "text-slate-600 dark:text-slate-300",
    accentBg: "bg-slate-500/10 border-slate-500/20",
  },
];

export function MobileBottomDock() {
  const pathname = usePathname();
  const [isHubOpen, setIsHubOpen] = useState(false);

  const isHomeActive = pathname === "/";
  const isAdmissionActive = pathname.startsWith("/admission");
  const isStudentsActive =
    pathname === "/active-students" ||
    pathname === "/students" ||
    pathname.startsWith("/old-students") ||
    (pathname.startsWith("/students/") &&
      !["/students/add", "/students/bulk-upload", "/students/promotion"].some((r) =>
        pathname.startsWith(r)
      ));
  const isStaffActive =
    pathname.startsWith("/employees") ||
    pathname.startsWith("/teacher-management");
  const isHubActive =
    isHubOpen ||
    ["/results", "/teacher", "/generate", "/ems", "/settings", "/students/promotion", "/students/bulk-upload", "/admin-hub"].some(
      (prefix) => pathname.startsWith(prefix)
    );

  return (
    <>
      {/* Floating Mobile Glass Dock */}
      <nav
        aria-label="Mobile bottom navigation dock"
        className="block md:hidden fixed bottom-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.25rem))] inset-x-3.5 z-40 max-w-md mx-auto print:hidden"
      >
        <div className="ios-blur-dock rounded-3xl p-1.5 shadow-lg dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.85)] border border-border/60 dark:border-white/12">
          <div className="grid grid-cols-5 items-center justify-items-center h-14 px-1">
            {/* 1. Home */}
            <Link
              href="/"
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full rounded-2xl py-1 transition-all duration-200 active:scale-90",
                isHomeActive
                  ? "text-primary dark:text-[#FACC15] font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isHomeActive && (
                <span className="absolute inset-0 rounded-2xl bg-primary/10 ring-1 ring-primary/20 dark:bg-[#FACC15]/10 dark:ring-[#FACC15]/30 animate-scale-in" />
              )}
              <LayoutDashboard className="h-5 w-5 relative z-10 transition-transform" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 relative z-10">
                Home
              </span>
              {isHomeActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary dark:bg-[#FACC15] shadow-xs dark:shadow-[0_0_6px_#FACC15]" />
              )}
            </Link>

            {/* 2. Admission */}
            <Link
              href="/admission"
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full rounded-2xl py-1 transition-all duration-200 active:scale-90",
                isAdmissionActive
                  ? "text-primary dark:text-[#FACC15] font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isAdmissionActive && (
                <span className="absolute inset-0 rounded-2xl bg-primary/10 ring-1 ring-primary/20 dark:bg-[#FACC15]/10 dark:ring-[#FACC15]/30 animate-scale-in" />
              )}
              <GraduationCap className="h-5 w-5 relative z-10 transition-transform" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 relative z-10">
                Admission
              </span>
              {isAdmissionActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary dark:bg-[#FACC15] shadow-xs dark:shadow-[0_0_6px_#FACC15]" />
              )}
            </Link>

            {/* 3. Students */}
            <Link
              href="/active-students"
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full rounded-2xl py-1 transition-all duration-200 active:scale-90",
                isStudentsActive
                  ? "text-primary dark:text-[#FACC15] font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isStudentsActive && (
                <span className="absolute inset-0 rounded-2xl bg-primary/10 ring-1 ring-primary/20 dark:bg-[#FACC15]/10 dark:ring-[#FACC15]/30 animate-scale-in" />
              )}
              <Users className="h-5 w-5 relative z-10 transition-transform" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 relative z-10">
                Students
              </span>
              {isStudentsActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary dark:bg-[#FACC15] shadow-xs dark:shadow-[0_0_6px_#FACC15]" />
              )}
            </Link>

            {/* 4. Staff */}
            <Link
              href="/employees"
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full rounded-2xl py-1 transition-all duration-200 active:scale-90",
                isStaffActive
                  ? "text-primary dark:text-[#FACC15] font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isStaffActive && (
                <span className="absolute inset-0 rounded-2xl bg-primary/10 ring-1 ring-primary/20 dark:bg-[#FACC15]/10 dark:ring-[#FACC15]/30 animate-scale-in" />
              )}
              <UserPlus className="h-5 w-5 relative z-10 transition-transform" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 relative z-10">
                Staff
              </span>
              {isStaffActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary dark:bg-[#FACC15] shadow-xs dark:shadow-[0_0_6px_#FACC15]" />
              )}
            </Link>

            {/* 5. More / Hub (Triggers Bottom Sheet) */}
            <button
              type="button"
              onClick={() => setIsHubOpen(true)}
              aria-label="Open More Hub"
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full rounded-2xl py-1 transition-all duration-200 active:scale-90 cursor-pointer",
                isHubActive
                  ? "text-primary dark:text-[#FACC15] font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isHubActive && (
                <span className="absolute inset-0 rounded-2xl bg-primary/10 ring-1 ring-primary/20 dark:bg-[#FACC15]/10 dark:ring-[#FACC15]/30 animate-scale-in" />
              )}
              <LayoutGrid className="h-5 w-5 relative z-10 transition-transform" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 relative z-10">
                More
              </span>
              {isHubActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary dark:bg-[#FACC15] shadow-xs dark:shadow-[0_0_6px_#FACC15]" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hub Bottom Sheet */}
      <Sheet open={isHubOpen} onOpenChange={setIsHubOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={true}
          className="p-0 border-t border-border/60 dark:border-white/12 rounded-t-[2.25rem] bg-background/95 dark:bg-[#07090E]/95 backdrop-blur-3xl max-w-lg mx-auto pb-safe focus:outline-none shadow-2xl"
        >
          {/* Sheet Handle Indicator */}
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 dark:bg-white/20 mx-auto mt-3 mb-1" />

          <SheetHeader className="px-5 pt-2 pb-3 text-left">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary dark:bg-[#FACC15] shadow-xs dark:shadow-[0_0_8px_#FACC15]" />
                  Marigachi SMS Hub
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Quick Operations & Modules · Session 2026-27
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="px-4 py-2 overflow-y-auto max-h-[65vh] space-y-2.5 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HUB_ACTIONS.map((item) => {
                const IconComponent = item.icon;
                const isItemActive = pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setIsHubOpen(false)}
                    className={cn(
                      "flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-200 active:scale-95 group",
                      isItemActive
                        ? "bg-primary/10 border-primary/25 dark:bg-[#FACC15]/10 dark:border-[#FACC15]/35 shadow-xs dark:shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                        : "glass-pill border-border/60 dark:border-white/10 hover:border-primary/30 dark:hover:border-white/20 hover:bg-muted/80 dark:hover:bg-white/[0.08]"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-200 group-hover:scale-110",
                        item.accentBg
                      )}
                    >
                      <IconComponent className={cn("h-5 w-5", item.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary dark:group-hover:text-[#FACC15] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.desc}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>

            {/* Quick System Controls: Theme Switcher */}
            <div className="pt-2 border-t border-border/60 dark:border-white/10 mt-2">
              <ThemeToggle showLabel className="w-full justify-start py-2.5 px-4 rounded-xl" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
