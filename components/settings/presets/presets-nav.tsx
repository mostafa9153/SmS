"use client";

import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { GraduationCap } from "lucide-react";
import { ACADEMIC_PRESET_ITEMS, SYSTEM_PRESET_ITEMS } from "@/components/settings/presets/constants";
import type { PresetAddressesState } from "./use-preset-addresses";

export function PresetsNav({ presets }: { presets: PresetAddressesState }) {
  const { activeSection, setActiveSection } = presets;
  return (
    <div className="rounded-2xl border bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 shadow-2xs space-y-2">
      {/* Group 1: Academic Setup */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Academic Setup & Evaluation
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ACADEMIC_PRESET_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 cursor-pointer relative group",
                  isActive
                    ? cn(item.activeBg, item.activeShadow, "scale-[1.01]")
                    : "bg-background border-border/80 hover:border-foreground/30 hover:bg-muted/40 hover:-translate-y-0.5 shadow-2xs hover:shadow-xs"
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "bg-white/20 text-white shadow-xs" : item.iconBg
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : item.iconColor)} />
                </div>
                <span
                  className={cn(
                    "text-xs font-bold truncate leading-tight min-w-0 flex-1",
                    isActive ? "text-white font-extrabold" : "text-foreground"
                  )}
                >
                  {item.title}
                </span>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border/50 my-0.5" />

      {/* Group 2: Master Data & Quick-Fill */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Master Data & Quick-Fill Presets
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SYSTEM_PRESET_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 cursor-pointer relative group",
                  isActive
                    ? cn(item.activeBg, item.activeShadow, "scale-[1.01]")
                    : "bg-background border-border/80 hover:border-foreground/30 hover:bg-muted/40 hover:-translate-y-0.5 shadow-2xs hover:shadow-xs"
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "bg-white/20 text-white shadow-xs" : item.iconBg
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : item.iconColor)} />
                </div>
                <span
                  className={cn(
                    "text-xs font-bold truncate leading-tight min-w-0 flex-1",
                    isActive ? "text-white font-extrabold" : "text-foreground"
                  )}
                >
                  {item.title}
                </span>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
