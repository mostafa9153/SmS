"use client";

import { EmsAdmitCardPrintable } from "../ems-admit-card-printable";
import { EmsBenchSlipsPrintable } from "../ems-bench-slips-printable";
import { EmsAttendanceSheetPrintable } from "../ems-attendance-sheet-printable";
import { EmsGateNoticePrintable } from "../ems-gate-notice-printable";
import { PrintPreview } from "@/components/print/print-preview";

import type { EmsPrintDialogState } from "./use-ems-print-dialog";

export function PreviewCanvas({ studio }: { studio: EmsPrintDialogState }) {
  const { activeClassConfig, activeDoc, admitCardsPerPage, allocation, benchSlipsPerPage, classSubjectsConfig, examHalf, includeBackSideRoutine, issueDate, orientation, schoolProfile, showAdmitSignature, targetRoomId } = studio;
  return (
    <div className="flex-1 min-h-0 p-3 sm:p-6 print:p-0 print:m-0 relative z-0">
      <PrintPreview fill resetKey={`${activeDoc}-${orientation}`}>
        <div
          id="ems-printable-canvas"
          className="shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25),_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),_0_0_0_1px_rgba(255,255,255,0.1)] print:shadow-none print:transform-none print:w-full print:m-0 print:p-0 flex flex-col items-center"
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
        </div>
      </PrintPreview>
    </div>
  );
}
