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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Students",
    icon: <Users className="h-4 w-4" />,
    children: [
      { label: "All Students", href: "/students" },
      { label: "Add Student", href: "/students/add" },
      { label: "Bulk Upload", href: "/students/bulk-upload" },
    ],
  },
  {
    label: "Results & Marks",
    href: "/results",
    icon: <Award className="h-4 w-4" />,
  },
  {
    label: "Promotion & Transfer",
    href: "/students/promotion",
    icon: <ArrowUpDown className="h-4 w-4" />,
  },
  {
    label: "Academic Session",
    href: "/academic-session",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
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
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isGroupActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && (
          <div className="ml-7 mt-1 flex flex-col gap-0.5">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  pathname === child.href || pathname.startsWith(child.href + "/")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {child.label}
              </Link>
            ))}
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {item.icon}
      {item.label}
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
        "flex h-full flex-col bg-background",
        mobile ? "w-72" : "w-64 border-r"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <School className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">MHS School</p>
            <p className="text-[10px] text-muted-foreground">Admin Portal</p>
          </div>
        </div>
        {mobile ? (
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            title="Collapse sidebar (মেনু বন্ধ করুন)"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <NavGroup key={item.label} item={item} onNavigate={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <p className="text-[10px] text-muted-foreground text-center">
          SMS v1.0 · Phase 1
        </p>
      </div>
    </aside>
  );
}
