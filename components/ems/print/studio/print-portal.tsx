"use client";

import { createPortal } from "react-dom";
import { EmsAdmitCardPrintable } from "../ems-admit-card-printable";
import { EmsBenchSlipsPrintable } from "../ems-bench-slips-printable";
import { EmsAttendanceSheetPrintable } from "../ems-attendance-sheet-printable";
import { EmsGateNoticePrintable } from "../ems-gate-notice-printable";
import { cn } from "@/lib/utils";

import type { EmsPrintStudioState } from "./use-ems-print-studio";

export function PrintPortal({ studio }: { studio: EmsPrintStudioState }) {
  const { activeClassConfig, activeDoc, admitCardsPerPage, allocation, benchSlipsPerPage, classSubjectsConfig, examHalf, includeBackSideRoutine, issueDate, mounted, orientation, schoolProfile, showAdmitSignature, targetRoomId } = studio;
  return (
    <>
      {mounted && typeof document !== "undefined" && !document.querySelector('[data-ems-dialog-portal="true"]') && createPortal(
        <div
          id="ems-print-isolated-portal"
          className={cn(
            orientation === "landscape" &&
              (activeDoc === "admit" || activeDoc === "slips") &&
              "ems-orientation-landscape"
          )}
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
        </div>,
        document.body
      )}
    </>
  );
}
