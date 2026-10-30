"use client";

import { Button } from "@/components/ui/button";
import { FileText, Layers, ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

import type { AdmissionGeneratorState } from "./use-admission-form-generator";

export function PreviewToolbar({ gen }: { gen: AdmissionGeneratorState }) {
  const { activePageView, bulkCount, bulkSerialList, classRoster, formMode, generationMode, previewBulkIndex, setActivePageView, setPreviewBulkIndex } = gen;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-2xl mb-4 shadow-xs print:hidden">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Bulk Form Index Navigator (Bulk mode only) */}
        {generationMode === "bulk" && (
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
            <Button
              variant="ghost"
              size="icon"
              disabled={previewBulkIndex <= 0}
              onClick={() => setPreviewBulkIndex((i) => Math.max(0, i - 1))}
              className="h-7 w-7 rounded-lg cursor-pointer"
              title="Previous Form Serial"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="text-xs font-bold px-2 font-mono">
              {formMode === "prefilled" && classRoster.length > 0 ? (
                <>
                  Student {previewBulkIndex + 1} of {classRoster.length}:{" "}
                  <span className="text-primary font-sans">
                    {classRoster[previewBulkIndex]?.name} (Roll {classRoster[previewBulkIndex]?.presentRoll || "N/A"})
                  </span>
                </>
              ) : (
                <>
                  Form {previewBulkIndex + 1} of {bulkCount}:{" "}
                  <span className="text-primary">{bulkSerialList[previewBulkIndex]}</span>
                </>
              )}
            </span>

            <Button
              variant="ghost"
              size="icon"
              disabled={
                previewBulkIndex >=
                (formMode === "prefilled" ? Math.max(0, classRoster.length - 1) : bulkCount - 1)
              }
              onClick={() =>
                setPreviewBulkIndex((i) =>
                  Math.min(
                    formMode === "prefilled" ? Math.max(0, classRoster.length - 1) : bulkCount - 1,
                    i + 1
                  )
                )
              }
              className="h-7 w-7 rounded-lg cursor-pointer"
              title="Next Form Serial"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Page Switcher Icon Controls (Click to change page without scrolling) */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setActivePageView("page1")}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activePageView === "page1"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="View Page 1 (Front)"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Page 1</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePageView("page2")}
            className={cn(
              "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activePageView === "page2"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="View Page 2 (Back)"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Page 2</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePageView((prev) => (prev === "page2" ? "page1" : "page2"))}
            className="p-1 text-xs font-bold rounded-lg bg-background hover:bg-muted text-foreground border border-border/80 shadow-2xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            title="Flip Page (Page 1 ↔ Page 2)"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
          </button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <button
            type="button"
            onClick={() => setActivePageView("all")}
            className={cn(
              "px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1",
              activePageView === "all"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="View Both Pages Stacked"
          >
            <Layers className="h-3 w-3" />
            <span>Both</span>
          </button>
        </div>
      </div>

    </div>
  );
}
