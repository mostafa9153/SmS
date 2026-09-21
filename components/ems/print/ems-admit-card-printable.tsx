"use client";

import React from "react";
import { AllocatedRoom } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import { formatRoomName, getClassNumericRank, toColumnMajorGrid } from "@/lib/ems/ems-config-loader";
import { isHigherSecondaryClass, toShortStream } from "@/lib/ems/seat-arrangement-algorithm";
import { cn } from "@/lib/utils";

export interface EmsAdmitCardPrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  examHalf?: "1st Half" | "2nd Half";
  issueDate?: string;
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
  showSignature?: boolean;
  orientation?: "portrait" | "landscape";
}

interface StudentAdmitItem {
  studentName: string;
  studentRoll: number;
  studentClass: string;
  studentSection: string;
  studentRegNo?: string;
  studentStream?: string;
  schoolId?: string;
  roomNumber: string;
  floor?: string;
  building?: string;
  columnIndex: number;
  benchIndex: number;
  seatPosition: number;
  globalSeatNumber: number;
}

// Helper to format exam title concisely: e.g. "3rd Summative Evaluation" -> "3rd Sum. 2026"
function formatShortExam(examType: string, academicYear: number | string): string {
  if (!examType) return `${academicYear}`;
  const shortened = examType
    .replace(/Summative\s*(Evaluation)?/i, "Sum.")
    .replace(/Examination/i, "Exam")
    .replace(/•.*$/, "")
    .trim();
  return `${shortened} ${academicYear}`;
}

export const EmsAdmitCardPrintable: React.FC<EmsAdmitCardPrintableProps> = ({
  rooms,
  academicYear,
  examType,
  examHalf,
  issueDate = new Date().toLocaleDateString("en-GB"),
  schoolProfile,
  targetRoomId = "ALL",
  showSignature = true,
  orientation = "portrait",
}) => {
  // Resolve school head signature URL
  const headSignatureSrc =
    schoolProfile?.headSignatureUrl && schoolProfile.headSignatureUrl.trim() !== ""
      ? schoolProfile.headSignatureUrl
      : "/hod-signature.png";

  // Filter target rooms
  const activeRooms =
    targetRoomId === "ALL"
      ? rooms
      : rooms.filter((r) => r.roomId === targetRoomId);

  // Extract and flatten all occupied student seats
  const students: StudentAdmitItem[] = [];
  activeRooms.forEach((r) => {
    r.seats
      .filter((s) => !s.isVacant && s.studentName)
      .forEach((s) => {
        students.push({
          studentName: s.studentName || "Student",
          studentRoll: s.studentRoll || 1,
          studentClass: s.studentClass || "VIII",
          studentSection: s.studentSection || "A",
          studentRegNo: s.studentRegNo,
          studentStream: s.studentStream,
          schoolId: s.schoolId,
          roomNumber: r.roomNumber,
          floor: r.floor || "Ground Floor",
          building: r.building || "Main Building",
          columnIndex: s.columnIndex,
          benchIndex: s.benchIndex,
          seatPosition: s.seatPosition,
          globalSeatNumber: s.globalSeatNumber,
        });
      });
  });

  // Sort students by Room, Class, and RegNo/Roll
  students.sort((a, b) => {
    if (a.roomNumber !== b.roomNumber) {
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    }
    if (a.studentClass !== b.studentClass) {
      return (
        getClassNumericRank(a.studentClass) - getClassNumericRank(b.studentClass) ||
        a.studentClass.localeCompare(b.studentClass, undefined, { numeric: true })
      );
    }
    if (isHigherSecondaryClass(a.studentClass)) {
      const regA = (a.studentRegNo || "").trim() || `${a.studentRoll}`;
      const regB = (b.studentRegNo || "").trim() || `${b.studentRoll}`;
      return regA.localeCompare(regB, undefined, { numeric: true });
    }
    if (a.studentSection !== b.studentSection) {
      return a.studentSection.localeCompare(b.studentSection);
    }
    return (a.studentRoll || 0) - (b.studentRoll || 0);
  });

  // Chunk students into pages: 20 for landscape (4 columns x 5 rows) or 21 for portrait (3 columns x 7 rows)
  const isLandscape = orientation === "landscape";
  const numCols = isLandscape ? 4 : 3;
  const numRows = isLandscape ? 5 : 7;
  const CARDS_PER_PAGE = numCols * numRows;
  const pages: StudentAdmitItem[][] = [];
  for (let i = 0; i < students.length; i += CARDS_PER_PAGE) {
    pages.push(students.slice(i, i + CARDS_PER_PAGE));
  }

  // Fallback empty page if no students
  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div
      className={cn(
        "ems-print-admit-wrapper w-full bg-white text-neutral-900 font-sans print:p-0 print:m-0",
        isLandscape ? "ems-orientation-landscape" : "ems-orientation-portrait"
      )}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: ${isLandscape ? "297mm 210mm" : "210mm 297mm"};
              margin: 0;
            }
          `,
        }}
      />
      {pages.map((pageStudents, pageIndex) => (
        <div key={`admit-page-wrap-${pageIndex}`} className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
          {/* Visual Page Counter in Screen Preview */}
          <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
            <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
              Page {pageIndex + 1} of {pages.length}
            </span>
            <span>•</span>
            <span>
              {pageStudents.length} Admit Cards ({isLandscape ? "4×5 Landscape • 20/Page" : "3×7 Portrait • 21/Page"})
            </span>
          </div>

          <div
            className={cn(
              "ems-admit-sheet mx-auto box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0",
              isLandscape
                ? "landscape w-[297mm] h-[206mm] max-h-[206mm] p-[2mm_3.5mm]"
                : "portrait w-[210mm] h-[294mm] max-h-[294mm] p-[2mm_4mm]"
            )}
          >
            {/* Grid: 4 cols x 5 rows in Landscape or 3 cols x 7 rows in Portrait */}
            <div
              className={cn(
                "h-full w-full",
                isLandscape
                  ? "grid grid-cols-4 grid-rows-[repeat(5,minmax(0,1fr))] gap-x-[2mm] gap-y-[1.2mm]"
                  : "grid grid-cols-3 grid-rows-[repeat(7,minmax(0,1fr))] gap-x-[2mm] gap-y-[1.2mm]"
              )}
            >
              {toColumnMajorGrid(pageStudents, numCols, numRows).map((item, slotIdx) => {
                if (!item) {
                  return (
                    <div
                      key={`empty-cell-${pageIndex}-${slotIdx}`}
                      className="border border-dashed border-neutral-100 rounded-[3px] h-full"
                    />
                  );
                }

                return (
                  <div
                    key={`card-${pageIndex}-${slotIdx}-${item.studentRoll}`}
                    className="relative border border-dashed border-neutral-300 rounded-[3px] p-[1.5mm] flex flex-col justify-between overflow-hidden bg-white h-full box-border"
                  >
                  {/* Repeated subtle watermark logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                    <img
                      src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                      alt="Watermark"
                      loading="eager"
                      decoding="async"
                      className="w-14 h-14 object-contain opacity-[0.15] grayscale print:filter-none print:opacity-[0.14]"
                    />
                  </div>

                  {/* Card Top: School Name & Exam Title */}
                  <div className="relative z-10 border-b border-neutral-200 pb-0.5 mb-0.5 flex items-center justify-between leading-none">
                    <div className="min-w-0 pr-1">
                      <h4 className="text-[8.5px] font-black uppercase tracking-tight text-neutral-900 truncate leading-tight">
                        {schoolProfile.schoolName || "Marigachi High School (H.S.)"}
                      </h4>
                      <p className="text-[7.5px] font-bold text-neutral-600 tracking-tight leading-none mt-0.5 flex items-center gap-1">
                        <span>{formatShortExam(examType, academicYear)}</span>
                        {examHalf && (
                          <span className="text-[7px] font-black uppercase text-neutral-950 border border-neutral-900 px-1 py-[0.5px] rounded-[2px] leading-none bg-neutral-100 print:bg-transparent">
                            [ {examHalf} ]
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[8.5px] font-black border border-neutral-900 text-neutral-950 px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider bg-transparent leading-none">
                        ADMIT
                      </span>
                    </div>
                  </div>

                  {/* Card Middle: Student Profile & Seating Info */}
                  <div className="relative z-10 grid grid-cols-12 gap-1 my-auto items-center">
                    {/* Left Col: Student Profile (7 cols) */}
                    <div className="col-span-7 flex flex-col justify-center space-y-0.5 min-w-0 pr-0.5">
                      <div className="truncate">
                        <span className="text-[15.5px] font-black uppercase text-neutral-950 block truncate leading-tight tracking-tight">
                          {item.studentName}
                        </span>
                      </div>

                      {(() => {
                        const isHs = isHigherSecondaryClass(item.studentClass);
                        const streamText = item.studentStream || (item.studentSection ? toShortStream(item.studentSection) : "") || "Sci";
                        const regVal = (item.studentRegNo || "").trim();

                        return (
                          <>
                            <div className="flex items-center space-x-1 text-[12.5px] text-neutral-800 font-bold leading-tight">
                              <span>
                                Class:{" "}
                                <strong className="font-black text-neutral-950 text-[14.5px]">
                                  {isHs ? `${item.studentClass} - ${streamText}` : `${item.studentClass} - ${item.studentSection}`}
                                </strong>
                              </span>
                            </div>

                            <div className="pt-0.5">
                              {isHs && regVal ? (
                                <span className="text-[11px] font-black text-neutral-950 px-1.5 py-0.5 rounded-[2px] border-[1.2px] border-neutral-900 tracking-tight leading-none inline-block truncate max-w-full">
                                  REG: {regVal}
                                </span>
                              ) : (
                                <span className="text-[13px] font-black text-neutral-950 px-2 py-0.5 rounded-[2px] border-[1.2px] border-neutral-900 tracking-wide leading-none inline-block">
                                  ROLL: {String(item.studentRoll).padStart(2, "0")}
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Right Col: Location, Bench Column & Bench Number (5 cols) */}
                    <div className="col-span-5 flex flex-col justify-center text-right pl-1 border-l border-neutral-200/80 space-y-0.5">
                      <div>
                        <span className="text-[16.5px] font-black text-neutral-950 block leading-tight tracking-tight">
                          {formatRoomName(item.roomNumber)}
                        </span>
                        {item.floor && (
                          <span className="text-[10px] font-bold text-neutral-500 block truncate leading-tight">
                            {item.floor}
                          </span>
                        )}
                      </div>

                      <div className="pt-0.5 mt-0.5 border-t border-neutral-200/80">
                        <div className="text-[12.5px] font-black text-neutral-950 leading-tight">
                          <span>Col </span>
                          <strong className="font-black text-neutral-950 text-[14.5px]">{item.columnIndex}</strong>
                          <span className="text-neutral-400 mx-1">•</span>
                          <span>Bench </span>
                          <strong className="font-black text-neutral-950 text-[14.5px]">{item.benchIndex}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Issue Date & Authorized Sign */}
                  <div className="relative z-10 border-t border-neutral-200/90 pt-0.5 flex items-end justify-between leading-none">
                    <div className="text-[7px] text-neutral-500 pb-0.5">
                      Issued: <span className="font-bold text-neutral-700">{issueDate}</span>
                    </div>

                    <div className="flex flex-col items-end justify-end">
                      {showSignature && headSignatureSrc ? (
                        <div className="h-[11px] flex items-end justify-end -mb-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={headSignatureSrc}
                            alt="Signature"
                            className="max-h-[11px] max-w-[50px] object-contain select-none mix-blend-multiply"
                          />
                        </div>
                      ) : null}
                      <span className="text-[7px] font-bold text-neutral-800 uppercase tracking-tight leading-tight">
                        Authorized Signatory
                      </span>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
