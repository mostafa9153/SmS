"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Upload,
  ArrowUpDown,
  Settings,
  ChevronDown,
  School,
  X,
  Award,
  CalendarClock,
  PanelLeftClose,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  iconBg: string;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110",
  },
  {
    label: "Students",
    icon: <Users className="h-4 w-4" />,
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110",
    children: [
      { label: "All Students Directory", href: "/students" },
      { label: "Add New Student", href: "/students/add" },
      { label: "Bulk Upload & Archive", href: "/students/bulk-upload" },
    ],
  },
  {
    label: "Results & Marks",
    href: "/results",
    icon: <Award className="h-4 w-4" />,
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 group-hover:scale-110",
  },
  {
    label: "Promotion & Transfer",
    href: "/students/promotion",
    icon: <ArrowUpDown className="h-4 w-4" />,
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-500/20 group-hover:scale-110",
  },
  {
    label: "Academic Session",
    href: "/academic-session",
    icon: <CalendarClock className="h-4 w-4" />,
    iconBg: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-110",
  },
  {
    label: "Settings & Access",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20 group-hover:scale-110",
  },
];

function NavGroup({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((c) => pathname.startsWith(c.href));
    }
    return false;
  });

  if (item.children) {
    const isGroupActive = item.children.some((c) =>
      pathname.startsWith(c.href)
    );
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
            isGroupActive
              ? "bg-primary/10 text-primary font-semibold shadow-2xs"
              : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
          )}
        >
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200", item.iconBg)}>
            {item.icon}
          </div>
          <span className="flex-1 text-left text-xs font-semibold tracking-tight">{item.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200",
              open && "rotate-180 text-foreground"
            )}
          />
        </button>

        {open && (
          <div className="ml-5 pl-4 border-l-2 border-primary/20 flex flex-col gap-1 py-1 transition-all duration-300">
            {item.children.map((child) => {
              const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 relative",
                    isChildActive
                      ? "bg-primary/15 text-primary font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                >
                  {isChildActive && (
                    <span className="absolute -left-[18px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" />
                  )}
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href!}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 relative",
        isActive
          ? "bg-gradient-to-r from-primary/15 via-primary/8 to-transparent text-primary font-semibold shadow-2xs border-l-3 border-primary"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
      )}
    >
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-200", item.iconBg)}>
        {item.icon}
      </div>
      <span className="text-xs font-semibold tracking-tight">{item.label}</span>
      {isActive && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}

export function Sidebar({
  mobile = false,
  onClose,
}: {
  mobile?: boolean;
  onClose?: () => void;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar/95 backdrop-blur-md border-sidebar-border transition-all duration-300",
        mobile ? "w-72" : "w-64 border-r"
      )}
    >
      {/* Brand Logo Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border/60 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/20 transition-transform duration-300 hover:scale-105">
            <School className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold tracking-tight text-foreground">
                MHS School
              </p>
              <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                Live
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Academic & Marks Portal
            </p>
          </div>
        </div>

        {mobile ? (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            title="Collapse sidebar (মেনু বন্ধ করুন)"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 hover:scale-105"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Main Menu
        </p>
        {navItems.map((item) => (
          <NavGroup key={item.label} item={item} onNavigate={onClose} />
        ))}
      </nav>

      {/* Footer Profile & Version */}
      <div className="border-t border-sidebar-border/60 p-3 space-y-2">
        <div className="rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/10 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                A
              </div>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-foreground truncate max-w-[110px]">
                Administrator
              </p>
              <p className="text-[10px] text-muted-foreground">Session 2026</p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
        </div>
      </div>
    </aside>
  );
}

