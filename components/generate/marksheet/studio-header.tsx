"use client";

import { Button } from "@/components/ui/button";
import { Printer, Sparkles, Users, User, RotateCcw, Award, ChevronLeft } from "lucide-react";

import type { MarksheetGeneratorState } from "./use-marksheet-generator";

export function StudioHeader({ mk }: { mk: MarksheetGeneratorState }) {
  const { classRoster, generatorMode, handleClearMarks, handleFillSampleData, handlePrint, router, selectedStudentIds, setGeneratorMode } = mk;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border p-2 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          title="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center ring-1 ring-amber-500/20 shrink-0">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            CCE Marksheet &amp; Progress Report
          </h1>
        </div>
      </div>

      {/* Action Controls: Wrapped & touch friendly on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap">
        {/* Mode Switcher */}
        <div className="flex items-center justify-between bg-muted/70 p-1 rounded-xl border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setGeneratorMode("single")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
              generatorMode === "single"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Single Student</span>
          </button>
          <button
            type="button"
            onClick={() => setGeneratorMode("bulk")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
              generatorMode === "bulk"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Class Batch (Bulk)</span>
            {classRoster.length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-mono">
                {classRoster.length}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          {/* Quick Actions (Single Mode) */}
          {generatorMode === "single" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFillSampleData}
                className="gap-1.5 text-xs h-10 sm:h-9 cursor-pointer"
                title="Load standard high scores for this class"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Sample Marks</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearMarks}
                className="gap-1.5 text-xs h-10 sm:h-9 cursor-pointer"
                title="Reset all subject marks to blank"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear Scores</span>
              </Button>
            </>
          )}

          {/* Print Trigger */}
          <Button
            size="sm"
            onClick={handlePrint}
            className="col-span-2 sm:col-span-1 gap-1.5 text-xs h-10 sm:h-9 bg-[#14206b] hover:bg-[#14206b]/90 text-white font-bold shadow-md cursor-pointer justify-center"
          >
            <Printer className="h-4 w-4" />
            <span>
              {generatorMode === "single"
                ? "Print Marksheet"
                : `Print All (${selectedStudentIds.length})`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
