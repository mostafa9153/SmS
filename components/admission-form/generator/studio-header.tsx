"use client";

import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, FileText, RotateCcw, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

import type { AdmissionGeneratorState } from "./use-admission-form-generator";

export function StudioHeader({ gen }: { gen: AdmissionGeneratorState }) {
  const { bulkCount, classRoster, embedded, formMode, generationMode, handlePrintBulk, handlePrintSingle, router, setIsHistoryOpen, setIsTrackerOpen } = gen;
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 print:hidden",
        embedded && "bg-card border p-3.5 rounded-2xl shadow-2xs pb-3.5 mb-2"
      )}
    >
      <div className="flex items-center gap-3">
        {!embedded && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 rounded-xl"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          {!embedded && (
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Admission Form Generator
              </h1>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Print blank or prefilled admission forms for Class V–IX & Class XI with automatic serial tracking
          </p>
        </div>
      </div>

      {/* Quick Actions Header Buttons */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTrackerOpen(true)}
          title="Track online & offline admission form sales and receipts"
          className="flex items-center justify-center gap-1.5 text-xs font-semibold h-10 sm:h-9.5 px-3 rounded-xl border-teal-300 dark:border-teal-700 bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 cursor-pointer shadow-2xs"
        >
          <BarChart3 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>Form Tracker</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsHistoryOpen(true)}
          title="View print history and undo any printed batch"
          className="gap-1.5 text-xs font-semibold h-10 sm:h-9.5 px-3 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer shadow-2xs justify-center"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span>Undo Print</span>
        </Button>

        {generationMode === "bulk" ? (
          <Button
            size="sm"
            onClick={handlePrintBulk}
            disabled={formMode === "prefilled" && classRoster.length === 0}
            className="col-span-2 sm:col-span-1 gap-2 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 h-10 sm:h-9.5 cursor-pointer justify-center"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>
              {formMode === "prefilled"
                ? `Print ${classRoster.length} Forms`
                : `Print ${bulkCount} Forms`}
            </span>
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintSingle("page1")}
              className="gap-1.5 text-xs font-semibold h-10 sm:h-9.5 rounded-xl border-border/80 cursor-pointer justify-center"
              title="Print Page 1 only"
            >
              <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>Page 1</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrintSingle("page2")}
              className="gap-1.5 text-xs font-semibold h-10 sm:h-9.5 rounded-xl border-border/80 cursor-pointer justify-center"
              title="Print Page 2 only"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Page 2</span>
            </Button>
            <Button
              size="sm"
              onClick={() => handlePrintSingle("all")}
              className="col-span-2 sm:col-span-1 gap-2 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 h-10 sm:h-9.5 cursor-pointer justify-center"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>Print Full Form</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
