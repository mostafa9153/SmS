"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from "lucide-react";


export interface MissingRollsWarningButtonProps {
  classNameCode: string;
  section: string;
  rollFrom: number;
  rollTo: number;
  enrolledCount: number;
  totalEnrolledInDb: number;
  missingRolls?: number[];
  missingFormatted?: string;
}

export function MissingRollsWarningButton({
  classNameCode,
  section,
  rollFrom,
  rollTo,
  enrolledCount,
  totalEnrolledInDb,
  missingRolls,
  missingFormatted,
}: MissingRollsWarningButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsPinned(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!missingRolls || missingRolls.length === 0) return null;

  const expectedCount = Math.max(0, rollTo - rollFrom + 1);

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
    } else {
      setIsPinned(true);
      setIsOpen(true);
    }
  };

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsPinned(false);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Yellow Warning Triangle Icon Button */}
      <button
        type="button"
        onClick={handleToggleClick}
        className={cn(
          "h-6 w-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 flex items-center justify-center cursor-pointer transition-all shadow-2xs active:scale-95 shrink-0",
          (isOpen || isPinned) && "ring-2 ring-amber-500/40 bg-amber-500/25 text-amber-700 dark:text-amber-300"
        )}
        title={isPinned ? "Click to close missing rolls popover" : `Click to pin open or hover to view ${missingRolls.length} missing roll numbers`}
        aria-label="View missing roll numbers"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
      </button>

      {/* Floating Popover on Hover or Click */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 p-3 rounded-xl border border-amber-500/30 bg-popover/95 backdrop-blur-md shadow-2xl z-[99999] animate-in fade-in-0 zoom-in-95 duration-150 space-y-2 text-foreground pointer-events-auto text-left"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-foreground truncate">
                  Class {classNameCode}-{section} Missing Rolls
                </h5>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Range: Roll {rollFrom}–{rollTo} • {enrolledCount}/{expectedCount} Active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
              >
                {missingRolls.length} Missing
              </Badge>
              <button
                type="button"
                onClick={handleClose}
                className="h-5 w-5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                title="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Formatted Short Summary */}
          <div className="text-[11px] leading-relaxed">
            <span className="text-muted-foreground font-medium">Missing Rolls: </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {missingFormatted}
            </span>
          </div>

          {/* Scrollable list of badges if there are many */}
          {missingRolls.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">
                Detailed list ({missingRolls.length} students not in DB):
              </p>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-muted/40 rounded-lg border border-border/50">
                {missingRolls.map((r) => (
                  <span
                    key={r}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground font-medium"
                  >
                    #{r}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/80 leading-tight italic pt-0.5 border-t border-border/40">
            * These missing rolls are excluded so seated students are placed without gaps.
          </p>
        </div>
      )}
    </div>
  );
}
