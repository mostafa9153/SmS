"use client";

import { Button } from "@/components/ui/button";
import { Printer, X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

import type { EmsPrintStudioState } from "./use-ems-print-studio";

export function StudioHeader({ studio }: { studio: EmsPrintStudioState }) {
  const { activeDoc, admitCardsPerPage, backAction, examHalf, handlePrint, isDialog, onBackToStep4, onClose, orientation, setAdmitCardsPerPage, setExamHalf, setOrientation } = studio;
  return (
    <header className="px-4 py-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {backAction && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={backAction}
            className="h-9 w-9 hover:border-primary/40 cursor-pointer shadow-2xs shrink-0 rounded-xl"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
            Print Suite
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
        {/* Admit Cards: 8 / Page vs Mini (21) layout switcher */}
        {activeDoc === "admit" && (
          <div className="inline-flex p-0.5 rounded-xl bg-muted/80 border border-border/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setAdmitCardsPerPage(8)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                admitCardsPerPage === 8
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Standard 8 Cards per Page (2×4 Grid)"
            >
              8 / Page
            </button>
            <button
              type="button"
              onClick={() => setAdmitCardsPerPage(21)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                admitCardsPerPage !== 8
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title="Mini Admit Cards (21/Page Portrait or 20/Page Landscape)"
            >
              Mini ({orientation === "landscape" ? "20" : "21"})
            </button>
          </div>
        )}

        {/* Orientation Switcher (Portrait / Landscape) for Admit Cards & Bench Slips */}
        {(activeDoc === "admit" || activeDoc === "slips") && (
          <div className="inline-flex p-0.5 rounded-xl bg-muted/80 border border-border/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                orientation === "portrait"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={activeDoc === "admit" ? (admitCardsPerPage === 8 ? "Portrait (2×4 • 8 Cards)" : "Portrait (3×7 • 21 Cards)") : "Portrait (3×19 • 57 Slips)"}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
                orientation === "landscape"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={activeDoc === "admit" ? (admitCardsPerPage === 8 ? "Landscape (4×2 • 8 Cards)" : "Landscape (4×5 • 20 Cards)") : "Landscape (4×14 • 56 Slips)"}
            >
              Landscape
            </button>
          </div>
        )}

        {/* 1st Half / 2nd Half Switcher (Placed right before Print Document) */}
        <div className="inline-flex p-0.5 rounded-xl bg-muted/80 border border-border/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setExamHalf("1st Half")}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
              examHalf === "1st Half"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Select 1st Half Examination Shift"
          >
            1st Half
          </button>
          <button
            type="button"
            onClick={() => setExamHalf("2nd Half")}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none",
              examHalf === "2nd Half"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Select 2nd Half Examination Shift"
          >
            2nd Half
          </button>
        </div>

        {/* Exactly ONE prominent primary Print Document button with keyboard shortcut */}
        <Button
          type="button"
          onClick={handlePrint}
          className="h-9 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-xs gap-2 cursor-pointer shadow-md shadow-indigo-600/25 px-4 rounded-xl hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>Print Document</span>
          <kbd className="text-[10px] font-mono bg-black/25 text-white/95 px-1.5 py-0.5 rounded ml-1 hidden md:inline">
            Ctrl+P
          </kbd>
        </Button>

        {isDialog && onClose && !onBackToStep4 && (
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-muted hover:bg-rose-50 text-muted-foreground hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
