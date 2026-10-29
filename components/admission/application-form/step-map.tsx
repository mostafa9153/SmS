"use client";

import { cn } from "@/lib/utils";
import { Lock, Check } from "lucide-react";
import { toast } from "sonner";

import type { AdmissionFormState } from "./use-admission-form";

export function StepMap({ form }: { form: AdmissionFormState }) {
  const { SECTION_META, SECTION_ORDER, isSectionUnlocked, openSections, savedSections, setOpenSections } = form;
  return (
    <>
      {(() => {
        const activeSection = SECTION_ORDER.find((sec) => openSections[sec]) || "A";
        const savedCount = Object.keys(savedSections).length;
        const progressPct = Math.round((savedCount / SECTION_ORDER.length) * 100);
        const lineProgress = Math.min(100, (savedCount / (SECTION_ORDER.length - 1)) * 100);

        return (
          <div className="sticky top-0 sm:top-2 z-40 bg-card/95 dark:bg-card/95 backdrop-blur-xl px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-border/90 shadow-lg shadow-black/5 mb-4 transition-all duration-300">
            {/* Top Row: Active Section Info & Colorful Progress */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs shrink-0">
                  {activeSection}
                </span>
                <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate">
                  {SECTION_META[activeSection]?.full || `Section ${activeSection}`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                  {savedCount} of {SECTION_ORDER.length} done
                </span>
                <span className="text-[11.5px] font-black font-mono text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 px-2 py-0.5 rounded-full shadow-2xs">
                  {progressPct}%
                </span>
              </div>
            </div>

            {/* Smart Colorful Pipeline Rail */}
            <div className="relative flex items-center justify-between w-full px-1">
              {/* Background Connecting Rail */}
              <div className="absolute left-3 right-3 sm:left-3.5 sm:right-3.5 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 bg-muted/80 rounded-full z-0" />

              {/* Dynamic Animated Gradient Line */}
              <div
                className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 via-purple-600 to-emerald-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(99,102,241,0.45)] z-0"
                style={{
                  width: savedCount > 0 ? `calc(${lineProgress}% * (100% - 24px) / 100)` : "0%",
                }}
              />

              {SECTION_ORDER.map((sec, idx) => {
                const isSaved = !!savedSections[sec];
                const isOpen = !!openSections[sec];
                const isUnlocked = isSectionUnlocked(sec);

                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      if (isUnlocked) {
                        setOpenSections({
                          A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false, I: false,
                          [sec]: true,
                        });
                        const el = document.getElementById(`section-card-${sec}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        const prevSec = SECTION_ORDER[idx - 1];
                        toast.warning(`Please complete Section ${prevSec} and click "Save & Next" first.`);
                      }
                    }}
                    title={`${sec}. ${SECTION_META[sec]?.label || sec}`}
                    className={cn(
                      "relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-black transition-all select-none shrink-0",
                      isOpen
                        ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/35 ring-4 ring-indigo-500/30 ring-offset-2 ring-offset-background scale-110 sm:scale-115 animate-pulse"
                        : isSaved
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-500/40 hover:scale-110 cursor-pointer"
                        : isUnlocked
                        ? "bg-card text-foreground border-2 border-indigo-400 dark:border-indigo-500 hover:border-indigo-600 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:scale-105 cursor-pointer"
                        : "bg-muted text-muted-foreground/40 border border-border/50 cursor-not-allowed text-[10px]"
                    )}
                  >
                    {isSaved ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : isUnlocked ? (
                      sec
                    ) : (
                      <Lock className="w-2.5 h-2.5 opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </>
  );
}
