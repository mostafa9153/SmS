"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, ArrowRight } from "lucide-react";
import { PrintPageStyle } from "@/components/print/print-preview";
import { cn } from "@/lib/utils";

import { ViewerToolbar } from "@/components/routine/viewer/viewer-toolbar";
import { PrintSheetHeader } from "@/components/routine/viewer/print-sheet-header";
import { GridHead } from "@/components/routine/viewer/grid-head";
import { MasterDayRows } from "@/components/routine/viewer/master-day-rows";
import { MasterTeacherRows } from "@/components/routine/viewer/master-teacher-rows";
import { DayRows } from "@/components/routine/viewer/day-rows";
import { NavigationFooter } from "@/components/routine/viewer/navigation-footer";
import { useRoutineViewer } from "@/components/routine/viewer/use-routine-viewer";
import type { RoutineViewerTabProps } from "@/components/routine/viewer/props";

export function RoutineViewerTab(props: RoutineViewerTabProps) {
  const viewer = useRoutineViewer(props);
  const { containerRef, isFullscreen, paperSettings, printSheetRef, routine, viewMode, zoomLevel } = viewer;

  if (!routine || !routine.grid || Object.keys(routine.grid).length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center shadow-xs w-full space-y-4">
        <div className="p-3 bg-muted rounded-full w-fit mx-auto">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">No Timetable Generated Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Please run the constraint satisfaction solver from the Generator engine to create your school timetable.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/routine/generate">
            <Button size="sm" className="h-8 text-xs font-semibold gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Go to Routine Generator
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full transition-all",
        isFullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col h-screen w-screen overflow-hidden p-3 gap-2.5"
          : "space-y-4"
      )}
    >
      <ViewerToolbar viewer={viewer} />

      <PrintSheetHeader viewer={viewer} />

      <PrintPageStyle pageW={paperSettings.pageW} pageH={paperSettings.pageH} margins={paperSettings.margins} />

      <div
        ref={printSheetRef}
        className={cn(
          "routine-print-sheet bg-card border rounded-lg shadow-xs overflow-hidden print:border-black print:rounded-none",
          isFullscreen && "flex-1 min-h-0 flex flex-col rounded-md"
        )}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .routine-print-sheet,
            .routine-print-sheet div {
              overflow: visible !important;
              max-height: none !important;
              height: auto !important;
            }
            .routine-print-sheet { border: 0 !important; box-shadow: none !important; }
            .routine-print-sheet table { width: 100% !important; }
            .routine-print-sheet th,
            .routine-print-sheet td {
              width: auto !important;
              min-width: 0 !important;
              max-width: none !important;
            }
            .routine-print-sheet .sticky { position: static !important; }
            .routine-print-sheet thead { display: table-header-group; }
            .routine-print-sheet tfoot { display: table-footer-group; }
            .routine-print-sheet tr,
            .routine-print-sheet td,
            .routine-print-sheet th { break-inside: avoid; page-break-inside: avoid; }
          }
        `}} />
        <div className={cn("overflow-auto flex-1 min-h-0 relative", isFullscreen && "custom-scrollbar")}>
          <div style={{ zoom: zoomLevel !== 100 ? `${zoomLevel}%` : undefined }} className="min-w-fit">
            <table className="w-full text-xs text-center border-collapse">
          <GridHead viewer={viewer} />
            <tbody className="divide-y divide-border print:divide-black">
              {viewMode === "master" && (
                <MasterDayRows viewer={viewer} />
              )}

              {viewMode === "master-teacher" && (
                <MasterTeacherRows viewer={viewer} />
              )}

              {viewMode !== "master" && viewMode !== "master-teacher" && (
                <DayRows viewer={viewer} />
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <NavigationFooter viewer={viewer} />
    </div>
  );
}
