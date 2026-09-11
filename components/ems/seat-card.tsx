"use client";

import React, { useState } from "react";
import { SeatAssignment } from "@/lib/ems/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, MapPin, User } from "lucide-react";

interface SeatCardProps {
  seat: SeatAssignment;
  isSearchMatch?: boolean;
  isSwapSource?: boolean;
  onInitiateSwap?: (seat: SeatAssignment) => void;
  onCompleteSwap?: (targetSeat: SeatAssignment) => void;
  swapModeActive?: boolean;
}

// Clean tailored color styles per class with distinct vibrant visual identity
export function getClassColorStyle(className?: string) {
  if (!className) return null;

  // Clean string: remove "CLASS", trim, and extract core class identifier
  let clean = className.trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
  const match = clean.match(/^([IVXLCDM]+|\d+|[A-Z0-9]+)/i);
  if (match) {
    clean = match[1];
  }

  const romanMap: Record<string, string> = {
    "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
    "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
    "11": "XI", "12": "XII",
  };
  const norm = romanMap[clean] || clean;

  const colorMap: Record<
    string,
    { border: string; bg: string; badgeBg: string; textRoll: string; dotBg: string }
  > = {
    // Class V (5) — Azure / Royal Blue
    V: {
      border: "border-blue-500/60 dark:border-blue-500/40",
      bg: "bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-950/30",
      badgeBg: "bg-blue-600 text-white dark:bg-blue-500",
      textRoll: "text-blue-700 dark:text-blue-300",
      dotBg: "bg-blue-600",
    },
    // Class VI (6) — Vibrant Amber / Warm Orange
    VI: {
      border: "border-amber-500/60 dark:border-amber-500/40",
      bg: "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-950/30",
      badgeBg: "bg-amber-600 text-white dark:bg-amber-500",
      textRoll: "text-amber-700 dark:text-amber-300",
      dotBg: "bg-amber-600",
    },
    // Class VII (7) — Clean Teal / Mint
    VII: {
      border: "border-teal-500/60 dark:border-teal-500/40",
      bg: "bg-teal-500/10 hover:bg-teal-500/15 dark:bg-teal-950/30",
      badgeBg: "bg-teal-600 text-white dark:bg-teal-500",
      textRoll: "text-teal-700 dark:text-teal-300",
      dotBg: "bg-teal-600",
    },
    // Class VIII (8) — Deep Purple / Fuchsia
    VIII: {
      border: "border-purple-500/60 dark:border-purple-500/40",
      bg: "bg-purple-500/10 hover:bg-purple-500/15 dark:bg-purple-950/30",
      badgeBg: "bg-purple-600 text-white dark:bg-purple-500",
      textRoll: "text-purple-700 dark:text-purple-300",
      dotBg: "bg-purple-600",
    },
    // Class IX (9) — Fresh Emerald / Jade Green
    IX: {
      border: "border-emerald-500/60 dark:border-emerald-500/40",
      bg: "bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-950/30",
      badgeBg: "bg-emerald-600 text-white dark:bg-emerald-500",
      textRoll: "text-emerald-700 dark:text-emerald-300",
      dotBg: "bg-emerald-600",
    },
    // Class X (10) — Electric Indigo / Cobalt
    X: {
      border: "border-indigo-500/60 dark:border-indigo-500/40",
      bg: "bg-indigo-500/10 hover:bg-indigo-500/15 dark:bg-indigo-950/30",
      badgeBg: "bg-indigo-600 text-white dark:bg-indigo-500",
      textRoll: "text-indigo-700 dark:text-indigo-300",
      dotBg: "bg-indigo-600",
    },
    // Class XI (11) — Vivid Rose / Ruby Pink
    XI: {
      border: "border-rose-500/60 dark:border-rose-500/40",
      bg: "bg-rose-500/10 hover:bg-rose-500/15 dark:bg-rose-950/30",
      badgeBg: "bg-rose-600 text-white dark:bg-rose-500",
      textRoll: "text-rose-700 dark:text-rose-300",
      dotBg: "bg-rose-600",
    },
    // Class XII (12) — Crimson Red
    XII: {
      border: "border-red-500/60 dark:border-red-500/40",
      bg: "bg-red-500/10 hover:bg-red-500/15 dark:bg-red-950/30",
      badgeBg: "bg-red-600 text-white dark:bg-red-500",
      textRoll: "text-red-700 dark:text-red-300",
      dotBg: "bg-red-600",
    },
    // Primary classes
    I: {
      border: "border-sky-500/60 dark:border-sky-500/40",
      bg: "bg-sky-500/10 hover:bg-sky-500/15 dark:bg-sky-950/30",
      badgeBg: "bg-sky-600 text-white dark:bg-sky-500",
      textRoll: "text-sky-700 dark:text-sky-300",
      dotBg: "bg-sky-600",
    },
    II: {
      border: "border-lime-500/60 dark:border-lime-500/40",
      bg: "bg-lime-500/10 hover:bg-lime-500/15 dark:bg-lime-950/30",
      badgeBg: "bg-lime-600 text-white dark:bg-lime-500",
      textRoll: "text-lime-700 dark:text-lime-300",
      dotBg: "bg-lime-600",
    },
    III: {
      border: "border-fuchsia-500/60 dark:border-fuchsia-500/40",
      bg: "bg-fuchsia-500/10 hover:bg-fuchsia-500/15 dark:bg-fuchsia-950/30",
      badgeBg: "bg-fuchsia-600 text-white dark:bg-fuchsia-500",
      textRoll: "text-fuchsia-700 dark:text-fuchsia-300",
      dotBg: "bg-fuchsia-600",
    },
    IV: {
      border: "border-orange-500/60 dark:border-orange-500/40",
      bg: "bg-orange-500/10 hover:bg-orange-500/15 dark:bg-orange-950/30",
      badgeBg: "bg-orange-600 text-white dark:bg-orange-500",
      textRoll: "text-orange-700 dark:text-orange-300",
      dotBg: "bg-orange-600",
    },
    PP: {
      border: "border-pink-500/60 dark:border-pink-500/40",
      bg: "bg-pink-500/10 hover:bg-pink-500/15 dark:bg-pink-950/30",
      badgeBg: "bg-pink-600 text-white dark:bg-pink-500",
      textRoll: "text-pink-700 dark:text-pink-300",
      dotBg: "bg-pink-600",
    },
  };

  if (colorMap[norm]) {
    return colorMap[norm];
  }

  // Fallback palette cycling deterministically based on string hash for custom classes
  const fallbackList = [
    colorMap.V,
    colorMap.VI,
    colorMap.IX,
    colorMap.VIII,
    colorMap.X,
    colorMap.VII,
    colorMap.XI,
    colorMap.XII,
    colorMap.III,
    colorMap.I,
  ];

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % fallbackList.length;
  return fallbackList[index];
}

export function SeatCard({
  seat,
  isSearchMatch,
  isSwapSource,
  onInitiateSwap,
  onCompleteSwap,
  swapModeActive,
}: SeatCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const colorTheme = getClassColorStyle(seat.studentClass);

  const handleClick = () => {
    if (swapModeActive) {
      if (onCompleteSwap) onCompleteSwap(seat);
    } else {
      setDetailsOpen(true);
    }
  };

  // Vacant Seat: Clean & minimal without extra text
  if (seat.isVacant) {
    return (
      <div
        onClick={swapModeActive ? handleClick : undefined}
        className={`w-[88px] sm:w-[94px] h-[78px] rounded-xl p-2 border-2 border-dashed transition-all flex items-center justify-center text-center select-none shrink-0 ${
          isSwapSource
            ? "border-amber-500 ring-4 ring-amber-400/40 bg-amber-500/10"
            : swapModeActive
            ? "border-primary/60 bg-primary/5 hover:bg-primary/10 cursor-pointer hover:scale-105"
            : "border-border/60 bg-muted/20 text-muted-foreground/50"
        }`}
      >
        <span className="text-xs font-semibold text-muted-foreground/60">Vacant</span>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={`w-[88px] sm:w-[94px] h-[78px] rounded-xl p-1.5 border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between items-center text-center select-none shrink-0 ${
          colorTheme?.border || "border-border"
        } ${colorTheme?.bg || "bg-card"} ${
          isSearchMatch
            ? "ring-4 ring-amber-400 dark:ring-amber-300 shadow-xl scale-105 z-10 animate-bounce"
            : ""
        } ${
          isSwapSource
            ? "ring-4 ring-amber-500 animate-pulse bg-amber-500/20 z-10"
            : swapModeActive
            ? "hover:ring-2 hover:ring-primary hover:scale-105"
            : "hover:-translate-y-0.5"
        }`}
      >
        {/* 1. Class & Sec */}
        <Badge
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs leading-none ${
            colorTheme?.badgeBg || "bg-primary text-white"
          }`}
        >
          {seat.studentClass} - {seat.studentSection || "A"}
        </Badge>

        {/* 2. Roll */}
        <div className="my-0.5">
          <span
            className={`text-sm sm:text-base font-black tracking-tight leading-none ${
              colorTheme?.textRoll || "text-foreground"
            }`}
          >
            Roll {seat.studentRoll !== undefined ? String(seat.studentRoll).padStart(2, "0") : "--"}
          </span>
        </div>

        {/* 3. Student Name */}
        <span
          className="text-[9px] sm:text-[10px] font-medium text-foreground/80 truncate max-w-[78px] sm:max-w-[84px] leading-tight block"
          title={seat.studentName}
        >
          {seat.studentName || "Student"}
        </span>
      </div>

      {/* Clean Seat Details & Swap Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xs border border-border/80 shadow-2xl backdrop-blur-xl bg-card/95">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${colorTheme?.bg || "bg-primary/10"} border ${
                  colorTheme?.border || "border-primary/20"
                }`}
              >
                <User className={`h-5 w-5 ${colorTheme?.textRoll || "text-primary"}`} />
              </div>
              <div className="text-left">
                <DialogTitle className="text-base font-bold">
                  {seat.studentName || "Student"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <Badge className={`text-[10px] font-bold ${colorTheme?.badgeBg || "bg-primary"}`}>
                    Class {seat.studentClass}-{seat.studentSection || "A"}
                  </Badge>
                  <span className="font-bold text-foreground">Roll: {seat.studentRoll}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs">
            <div className="p-2.5 bg-muted/30 rounded-xl border border-border/60 flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {seat.roomNumber} • Column {seat.columnIndex} • Bench {seat.benchIndex}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border/60 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            {onInitiateSwap && (
              <Button
                size="sm"
                onClick={() => {
                  setDetailsOpen(false);
                  onInitiateSwap(seat);
                }}
                className="text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Swap Seat
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
