"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DoorOpen,
  Sliders,
  Wand2,
  MapPin,
  Sparkles,
} from "lucide-react";

interface EmsNavTabsProps {
  activeTab?: string;
}

export function EmsNavTabs({ activeTab }: EmsNavTabsProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/ems",
      label: "Command Center",
      sublabel: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: pathname === "/ems",
    },
    {
      href: "/ems/rooms",
      label: "Classroom Setup",
      sublabel: "Benches & Halls",
      icon: <DoorOpen className="h-4 w-4" />,
      active: pathname.startsWith("/ems/rooms"),
    },
    {
      href: "/ems/manual",
      label: "Manual Allocation",
      sublabel: "Column-by-Column",
      icon: <Sliders className="h-4 w-4" />,
      active: pathname.startsWith("/ems/manual"),
    },
    {
      href: "/ems/auto",
      label: "Auto Allocation",
      sublabel: "Smart Wizard",
      icon: <Wand2 className="h-4 w-4 text-purple-500" />,
      active: pathname.startsWith("/ems/auto"),
      badge: "Smart",
    },
    {
      href: "/ems/seating-map",
      label: "Visual Seating Map",
      sublabel: "2D Blueprint",
      icon: <MapPin className="h-4 w-4 text-emerald-500" />,
      active: pathname.startsWith("/ems/seating-map"),
    },
  ];

  return (
    <div className="w-full flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/40 border border-border/60 overflow-x-auto shadow-xs backdrop-blur-xs mb-6">
      {navLinks.map((link) => {
        const isActive = link.active;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              isActive
                ? "bg-card text-foreground shadow-sm border border-border/80 font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span
              className={`p-1 rounded-lg ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-transparent text-muted-foreground"
              }`}
            >
              {link.icon}
            </span>
            <div className="flex flex-col items-start leading-none">
              <span className="flex items-center gap-1.5">
                {link.label}
                {link.badge && (
                  <span className="text-[9px] px-1 py-0.2 bg-purple-500/15 text-purple-700 dark:text-purple-300 rounded font-bold uppercase">
                    {link.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-normal mt-0.5">
                {link.sublabel}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
