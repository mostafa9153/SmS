"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Sliders, ShieldCheck, Sparkles, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

interface RoutineLayoutProps {
  children: React.ReactNode;
}

export default function RoutineLayout({ children }: RoutineLayoutProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/routine",
      label: "Setup Hub",
      icon: Sliders,
      isActive: pathname === "/routine",
    },
    {
      href: "/routine/assignments",
      label: "Verify & Audit",
      icon: ShieldCheck,
      isActive: pathname === "/routine/assignments",
    },
    {
      href: "/routine/generate",
      label: "Generator",
      icon: Sparkles,
      isActive: pathname === "/routine/generate",
    },
    {
      href: "/routine/viewer",
      label: "Routine Viewer",
      icon: Table2,
      isActive: pathname === "/routine/viewer",
    },
  ];

  return (
    <div className={cn(
      "flex flex-col min-h-[calc(100vh-4rem)] p-4 md:p-6 mx-auto w-full space-y-5",
      pathname === "/routine/viewer" ? "max-w-none" : "max-w-7xl"
    )}>
      {/* Top Header */}
      <PageHeader
        icon={CalendarClock}
        title="Routine Maker"
        actions={<nav className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/70 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                  link.isActive
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", link.href === "/routine/generate" && link.isActive ? "text-amber-500" : "")} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>}
        className="print:hidden border-b border-border pb-3.5"
      />

      {/* Main Content Body */}
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

