"use client";

import { EmsAdmitCardPrintable } from "../ems-admit-card-printable";
import { EmsBenchSlipsPrintable } from "../ems-bench-slips-printable";
import { EmsAttendanceSheetPrintable } from "../ems-attendance-sheet-printable";
import { EmsGateNoticePrintable } from "../ems-gate-notice-printable";
import { formatRoomName } from "@/lib/ems/ems-config-loader";
import { PrintPreview } from "@/components/print/print-preview";

import type { EmsPrintStudioState } from "./use-ems-print-studio";

export function PreviewCanvas({ studio }: { studio: EmsPrintStudioState }) {
  const { activeClassConfig, activeDoc, activeRoomObj, admitCardsPerPage, allocation, benchSlipsPerPage, classSubjectsConfig, currentTotalPages, examHalf, includeBackSideRoutine, issueDate, orientation, schoolProfile, showAdmitSignature, targetRoomId, totalOccupiedStudents } = studio;
  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs relative print:overflow-visible print:border-0 print:shadow-none">
      {/* Preview Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-muted/20 backdrop-blur-md shrink-0 print:hidden z-10">
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-background text-foreground font-mono text-xs border border-border font-bold shadow-2xs">
            {activeDoc === "admit"
              ? `Mini Admit Cards (${orientation === "landscape" ? "4×5 Landscape • 20/Page" : "3×7 Portrait • 21/Page"})`
              : activeDoc === "slips"
                ? `Desk Bench Slips (${orientation === "landscape" ? "4×14 Landscape • 56/Page" : "3×19 Portrait • 57/Page"})`
                : activeDoc === "attendance"
                  ? "Room Attendance Sheet"
                  : "Room Gate Notice"}
          </span>
          <span className="text-muted-foreground text-xs hidden sm:inline font-medium">
            • {targetRoomId === "ALL" ? "All Rooms" : formatRoomName(activeRoomObj?.roomNumber || "")} ({totalOccupiedStudents} Students, {currentTotalPages} A4 Page{currentTotalPages > 1 ? "s" : ""})
          </span>
        </div>

      </div>

      {/* Document canvas: shared print preview (zoom, drag, fit) */}
      <div className="p-2 sm:p-4 pb-36 sm:pb-4 print:p-0 print:m-0 relative">
        <PrintPreview resetKey={`${activeDoc}-${orientation}-${targetRoomId}`}>
          <div
            id="ems-printable-canvas"
            className="shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25),_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7),_0_0_0_1px_rgba(255,255,255,0.1)] print:shadow-none print:transform-none print:w-full print:m-0 print:p-0 flex flex-col items-center"
          >
            {activeDoc === "admit" && (
              <EmsAdmitCardPrintable
                rooms={allocation.roomAllocations || []}
                academicYear={allocation.academicYear}
                examType={allocation.examType}
                issueDate={issueDate}
                schoolProfile={schoolProfile}
                targetRoomId={targetRoomId}
                showSignature={showAdmitSignature}
                examHalf={examHalf}
                orientation={orientation}
                cardsPerPage={admitCardsPerPage}
                routinesByClass={allocation.routinesByClass}
                examStartTime={allocation.examStartTime}
                includeBackSideRoutine={includeBackSideRoutine}
              />
            )}

            {activeDoc === "slips" && (
              <EmsBenchSlipsPrintable
                rooms={allocation.roomAllocations || []}
                academicYear={allocation.academicYear}
                examType={allocation.examType}
                schoolProfile={schoolProfile}
                targetRoomId={targetRoomId}
                orientation={orientation}
                slipsPerPage={benchSlipsPerPage}
              />
            )}

            {activeDoc === "attendance" && (
              <EmsAttendanceSheetPrintable
                rooms={allocation.roomAllocations || []}
                academicYear={allocation.academicYear}
                examType={allocation.examType}
                schoolProfile={schoolProfile}
                targetRoomId={targetRoomId}
                examHeaders={activeClassConfig.headers}
                examDates={activeClassConfig.dates}
                examHalf={examHalf}
                classSubjectsMap={classSubjectsConfig}
              />
            )}

            {activeDoc === "gate" && (
              <EmsGateNoticePrintable
                rooms={allocation.roomAllocations || []}
                academicYear={allocation.academicYear}
                examType={allocation.examType}
                schoolProfile={schoolProfile}
                targetRoomId={targetRoomId}
                examHalf={examHalf}
              />
            )}
          </div>
        </PrintPreview>
      </div>
    </div>
  );
}
