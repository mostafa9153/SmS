"use client";

import Link from "next/link";
import {
  UserPlus,
  Receipt,
  CalendarCheck,
  CreditCard,
  Sparkles,
  ClipboardCheck,
  Award,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "+ Admission",
    href: "/admission/new/ai-scan",
    icon: UserPlus,
    color: "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-300",
    badge: "AI Scan",
  },
  {
    label: "Collect Fee",
    href: "/admission/invoices",
    icon: Receipt,
    color: "text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300",
  },
  {
    label: "Mark Attendance",
    href: "/teacher",
    icon: CalendarCheck,
    color: "text-sky-600 dark:text-sky-400 group-hover:text-sky-500 dark:group-hover:text-sky-300",
  },
  {
    label: "Generate ID",
    href: "/generate/id-card",
    icon: Sparkles,
    color: "text-purple-600 dark:text-purple-400 group-hover:text-purple-500 dark:group-hover:text-purple-300",
  },
  {
    label: "EMS Blueprint",
    href: "/ems",
    icon: ClipboardCheck,
    color: "text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300",
  },
  {
    label: "Exam Marks",
    href: "/results",
    icon: Award,
    color: "text-amber-700 dark:text-yellow-400 group-hover:text-amber-800 dark:group-hover:text-yellow-300",
  },
  {
    label: "Bulk Upload",
    href: "/students/bulk-upload",
    icon: Upload,
    color: "text-teal-600 dark:text-teal-400 group-hover:text-teal-500 dark:group-hover:text-teal-300",
  },
];

export function QuickActionsBar() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary dark:bg-[#FACC15]" />
          Touch Quick Actions
        </p>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          Swipe horizontally for more modules
        </span>
      </div>

      {/* Horizontal Scrollable Glass Pills Container */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1 scroll-smooth">
        {QUICK_ACTIONS.map((action) => {
          const IconComponent = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "glass-pill flex items-center gap-2 px-3.5 py-2 rounded-2xl shrink-0 transition-all duration-200 border border-border/60 dark:border-white/10",
                "hover:border-primary/40 dark:hover:border-[#FACC15]/40 hover:bg-muted/80 dark:hover:bg-white/[0.08] active:scale-95 group cursor-pointer"
              )}
            >
              <div className="h-7 w-7 rounded-xl bg-muted/80 dark:bg-white/[0.06] border border-border/50 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <IconComponent className={cn("h-4 w-4 transition-colors", action.color)} />
              </div>
              <span className="text-xs font-bold text-foreground whitespace-nowrap group-hover:text-primary dark:group-hover:text-[#FACC15] transition-colors">
                {action.label}
              </span>
              {action.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  {action.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
