"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { SECTION_THEMES } from "@/components/admission/application-form/section-themes";
import { renderBilingualText } from "@/components/admission/application-form/bilingual-text";

export function CollapsibleCard({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  badge,
  onSaveAndNext,
  isLastSection,
  isSaved,
  isLocked,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  onSaveAndNext?: () => void;
  isLastSection?: boolean;
  isSaved?: boolean;
  isLocked?: boolean;
  children: React.ReactNode;
}) {
  const theme = SECTION_THEMES[id] || {
    card: "border-border/80 bg-card hover:border-primary/40",
    iconBox: "bg-muted/60 text-foreground border border-border/50",
    title: "text-foreground",
  };

  return (
    <div
      id={`section-card-${id}`}
      className={cn(
        "rounded-2xl border transition-all duration-200 scroll-mt-28",
        isLocked
          ? "border-dashed border-border/60 bg-muted/20 opacity-75"
          : theme.card,
        isOpen ? "overflow-visible shadow-md ring-1 ring-black/5 dark:ring-white/5 opacity-100" : "overflow-hidden"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between transition-colors text-left select-none rounded-t-2xl",
          isLocked ? "cursor-not-allowed hover:bg-muted/40" : "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("p-2 sm:p-2.5 rounded-xl shrink-0", isLocked ? "bg-muted text-muted-foreground border border-border/40" : theme.iconBox)}>
            {icon}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-bold text-sm sm:text-[15.5px] tracking-tight", isLocked ? "text-muted-foreground" : theme.title)}>
              {renderBilingualText(title)}
            </span>
            {badge && !isLocked && (
              <Badge variant="secondary" className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25 shadow-2xs">
                {badge}
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-border/60 text-muted-foreground inline-flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Locked
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isSaved && (
            <span
              title="Section completed"
              className="inline-flex items-center justify-center p-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
            </span>
          )}
          <div className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-transform">
            {isLocked ? <Lock className="w-4 h-4 text-muted-foreground/50" /> : isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {isOpen && !isLocked && (
        <div className="p-4 sm:p-5 pt-2 sm:pt-2 border-t border-border/50 animate-in fade-in-50 duration-200 overflow-visible space-y-4">
          {children}

          {onSaveAndNext && (
            <div className="pt-3 border-t border-border/50 flex items-center justify-end">
              <Button
                type="button"
                onClick={onSaveAndNext}
                className="h-9 sm:h-10 px-5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
              >
                <span>{isLastSection ? "Save Section" : "Save & Next"}</span>
                {!isLastSection && <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

