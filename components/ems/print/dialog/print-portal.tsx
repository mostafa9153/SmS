"use client";

import { createPortal } from "react-dom";
import { EmsAdmitCardPrintable } from "../ems-admit-card-printable";
import { EmsBenchSlipsPrintable } from "../ems-bench-slips-printable";
import { EmsAttendanceSheetPrintable } from "../ems-attendance-sheet-printable";
import { EmsGateNoticePrintable } from "../ems-gate-notice-printable";
import { cn } from "@/lib/utils";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function PrintPortal({ studio }: { studio: EmsPrintDialogState }) {
  const { activeClassConfig, activeDoc, admitCardsPerPage, allocation, benchSlipsPerPage, classSubjectsConfig, examHalf, includeBackSideRoutine, issueDate, mounted, open, orientation, schoolProfile, showAdmitSignature, targetRoomId } = studio;
  return (
    <>
    {mounted && open && typeof document !== "undefined" && createPortal(
      <div
        id="ems-print-isolated-portal"
        data-ems-dialog-portal="true"
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
            classSubjectsMap={classSubjectsConfig}
            examHeaders={activeClassConfig.headers}
            examDates={activeClassConfig.dates}
            examHalf={examHalf}
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
