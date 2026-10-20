"use client";

import React from "react";
import { AllocatedRoom, getStudentExamTitle, ExamRoutineItem } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import { formatRoomName, getClassNumericRank, toColumnMajorGrid } from "@/lib/ems/ems-config-loader";
import { isHigherSecondaryClass, toShortStream, normalizeClassCode } from "@/lib/ems/seat-arrangement-algorithm";
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
  cardsPerPage?: number;
  routinesByClass?: Record<string, ExamRoutineItem[]>;
  examStartTime?: string;
  includeBackSideRoutine?: boolean;
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

// Helper to format floor text neatly: e.g. "2nd" -> "2nd Floor"
function formatFloorText(floor?: string): string {
  if (!floor) return "";
  const trimmed = floor.trim();
  if (/floor/i.test(trimmed)) return trimmed;
  return `${trimmed} Floor`;
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
  cardsPerPage = 8,
  routinesByClass,
  examStartTime,
  includeBackSideRoutine = true,
}) => {
  // Resolve school head signature URL
  const headSignatureSrc =
    schoolProfile?.headSignatureUrl && schoolProfile.headSignatureUrl.trim() !== ""
      ? schoolProfile.headSignatureUrl
      : "/hod-signature.png";

  // Fallback to localStorage if routinesByClass is empty or not provided
  const effectiveRoutines = React.useMemo(() => {
    if (routinesByClass && Object.keys(routinesByClass).length > 0) {
      return routinesByClass;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sms_ems_exam_routines");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
            return parsed as Record<string, ExamRoutineItem[]>;
          }
        }
      } catch {}
    }
    return routinesByClass || {};
  }, [routinesByClass]);

  const getClassRoutine = React.useCallback(
    (studentClass?: string): ExamRoutineItem[] => {
      if (!studentClass || !effectiveRoutines) return [];
      // 1. Direct match (e.g. "VIII", "Class VIII")
      if (effectiveRoutines[studentClass] && effectiveRoutines[studentClass].length > 0) {
        return effectiveRoutines[studentClass];
      }
      // 2. Normalized match (e.g. "VIII", "Class VIII", "8")
      const norm = normalizeClassCode(studentClass);
      if (norm && effectiveRoutines[norm] && effectiveRoutines[norm].length > 0) {
        return effectiveRoutines[norm];
      }
      // 3. Scan all keys in effectiveRoutines and match normalized code
      const matchingKey = Object.keys(effectiveRoutines).find(
        (k) => normalizeClassCode(k) === norm && Array.isArray(effectiveRoutines[k]) && effectiveRoutines[k].length > 0
      );
      if (matchingKey && effectiveRoutines[matchingKey]) {
        return effectiveRoutines[matchingKey];
      }
      return [];
    },
    [effectiveRoutines]
  );

  // Fallback to localStorage for exam start time if not provided
  const effectiveStartTime = React.useMemo(() => {
    if (examStartTime && examStartTime.trim() !== "") return examStartTime.trim();
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sms_ems_exam_start_time");
        if (saved && saved.trim() !== "") return saved.trim();
      } catch {}
    }
    return "";
  }, [examStartTime]);

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

  // Chunk students into pages: 8 cards (2x4 portrait or 4x2 landscape) or legacy mini (21 portrait / 20 landscape)
  const isEightPerPage = (cardsPerPage ?? 8) === 8;
  const isLandscape = orientation === "landscape";
  const numCols = isEightPerPage ? (isLandscape ? 4 : 2) : (isLandscape ? 4 : 3);
  const numRows = isEightPerPage ? (isLandscape ? 2 : 4) : (isLandscape ? 5 : 7);
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
      {pages.map((pageStudents, pageIndex) => {
        const frontGrid = toColumnMajorGrid(pageStudents, numCols, numRows);
        const backGrid = frontGrid.map((_, slotIdx) => {
          const col = slotIdx % numCols;
          const row = Math.floor(slotIdx / numCols);
          const mirroredCol = numCols - 1 - col;
          return frontGrid[row * numCols + mirroredCol];
        });

        return (
          <React.Fragment key={`admit-page-bundle-${pageIndex}`}>
            <div key={`admit-page-wrap-${pageIndex}`} className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
              {/* Visual Page Counter in Screen Preview */}
              <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
                <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                  Page {pageIndex + 1} of {pages.length} {includeBackSideRoutine ? "(Front)" : ""}
                </span>
            <span>•</span>
            <span>
              {pageStudents.length} Admit Cards (
              {isEightPerPage
                ? (isLandscape ? "4×2 Landscape • 8/Page" : "2×4 Portrait • 8/Page")
                : (isLandscape ? "4×5 Landscape • 20/Page" : "3×7 Portrait • 21/Page")}
              )
            </span>
            <span>•</span>
            <span className="text-emerald-500 font-semibold">
              Scissor Cut Lines (✂) • Safe Cut Space
            </span>
          </div>

          <div
            className={cn(
              "ems-admit-sheet mx-auto box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0",
              isLandscape
                ? "landscape w-[297mm] h-[206mm] max-h-[206mm] p-[3mm_4.5mm]"
                : "portrait w-[210mm] h-[294mm] max-h-[294mm] p-[3mm_4.5mm]"
            )}
          >
              {/* Grid: 2 cols x 4 rows in Portrait for 8/Page, or legacy 3x7 / 4x5 */}
            <div
              className={cn(
                "h-full w-full",
                isEightPerPage
                  ? isLandscape
                    ? "grid grid-cols-4 grid-rows-[repeat(2,minmax(0,1fr))] gap-x-[4.5mm] gap-y-[3.5mm]"
                    : "grid grid-cols-2 grid-rows-[repeat(4,minmax(0,1fr))] gap-x-[4.5mm] gap-y-[3.5mm]"
                  : isLandscape
                    ? "grid grid-cols-4 grid-rows-[repeat(5,minmax(0,1fr))] gap-x-[2.4mm] gap-y-[1.6mm]"
                    : "grid grid-cols-3 grid-rows-[repeat(7,minmax(0,1fr))] gap-x-[2.4mm] gap-y-[1.6mm]"
              )}
            >
              {frontGrid.map((item, slotIdx) => {
                const col = slotIdx % numCols;
                const row = Math.floor(slotIdx / numCols);
                const hasColRight = col < numCols - 1;
                const hasRowBottom = row < numRows - 1;

                return (
                  <div key={`slot-wrap-${pageIndex}-${slotIdx}`} className="relative h-full w-full">
                    {item ? (
                      <div
                        key={`card-${pageIndex}-${slotIdx}-${item.studentRoll}`}
                        className={cn(
                          "relative border border-dashed border-neutral-300 rounded-[3px] flex flex-col justify-between overflow-hidden bg-white h-full box-border",
                          isEightPerPage ? "p-[2.5mm_3mm]" : "p-[1.5mm]"
                        )}
                      >
                    {/* Repeated subtle watermark logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                      <img
                        src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                        alt="Watermark"
                        loading="eager"
                        decoding="async"
                        className={cn(
                          "object-contain opacity-[0.11] grayscale select-none print:filter-none print:opacity-[0.10]",
                          isEightPerPage ? "w-28 h-28" : "w-16 h-16"
                        )}
                      />
                    </div>

                    {/* Card Top: School Crest, Name, Exam Title & ADMIT badge */}
                    <div className={cn(
                      "relative z-10 border-b-[1.2px] border-neutral-900/90 flex items-center justify-between leading-none",
                      isEightPerPage ? "pb-1.5 mb-1" : "pb-0.5 mb-0.5"
                    )}>
                      <div className="min-w-0 pr-1 flex items-center gap-2">
                        <img
                          src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                          alt="School Logo"
                          className={cn(
                            "object-contain shrink-0",
                            isEightPerPage ? "w-9 h-9" : "w-6 h-6"
                          )}
                        />
                        <div className="min-w-0">
                          <h4 className={cn(
                            "font-black uppercase tracking-tight text-neutral-950 truncate leading-tight",
                            isEightPerPage ? "text-[12.5px]" : "text-[8.5px]"
                          )}>
                            {schoolProfile.schoolName || "Marigachi High School (H.S.)"}
                          </h4>
                          <p className={cn(
                            "font-semibold text-neutral-600 tracking-tight leading-none mt-0.5 truncate flex items-center gap-1",
                            isEightPerPage ? "text-[9.5px]" : "text-[7.5px]"
                          )}>
                            <span>{formatShortExam(getStudentExamTitle(examType, item.studentClass), academicYear)}</span>
                            {effectiveStartTime && (
                              <>
                                <span className="text-neutral-400 font-normal mx-0.5">•</span>
                                <span className="font-bold text-neutral-900">Time: {effectiveStartTime}</span>
                              </>
                            )}
                            {examHalf && (
                              <>
                                <span className="text-neutral-400 font-normal mx-0.5">•</span>
                                <span className="font-bold text-neutral-900">{examHalf}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right pl-1">
                        <span className={cn(
                          "font-black border-[1.5px] border-black text-black rounded-[2px] uppercase tracking-wider bg-transparent leading-none inline-block",
                          isEightPerPage ? "text-[9.5px] px-2 py-1" : "text-[8px] px-1.5 py-0.5"
                        )}>
                          ADMIT
                        </span>
                      </div>
                    </div>

                    {/* Card Middle: Student Profile & Seating Info */}
                    <div className={cn(
                      "relative z-10 grid grid-cols-12 gap-1.5 my-auto items-center",
                      isEightPerPage ? "py-1" : "py-0.5"
                    )}>
                      {/* Left Col: Student Profile (7 cols) */}
                      <div className="col-span-7 flex flex-col justify-center space-y-1 min-w-0 pr-0.5">
                        <div>
                          <span className={cn(
                            "font-black uppercase text-neutral-950 block leading-tight tracking-tight",
                            isEightPerPage ? "text-[16.5px]" : "text-[14.5px] truncate"
                          )}>
                            {item.studentName}
                          </span>
                        </div>

                        {(() => {
                          const isHs = isHigherSecondaryClass(item.studentClass);
                          const streamText = item.studentStream || (item.studentSection ? toShortStream(item.studentSection) : "") || "Sci";
                          const regVal = (item.studentRegNo || "").trim();

                          return (
                            <>
                              <div className={cn(
                                "flex items-center space-x-1 text-neutral-800 font-bold leading-tight",
                                isEightPerPage ? "text-[13px]" : "text-[11.5px]"
                              )}>
                                <span>
                                  Class:{" "}
                                  <strong className={cn(
                                    "font-black text-neutral-950",
                                    isEightPerPage ? "text-[15px]" : "text-[13.5px]"
                                  )}>
                                    {isHs ? `${item.studentClass} - ${streamText}` : `${item.studentClass} - ${item.studentSection}`}
                                  </strong>
                                </span>
                              </div>

                              <div className="pt-0.5">
                                {isHs && regVal ? (
                                  <span className={cn(
                                    "font-black text-neutral-950 rounded-[2px] border-[1.4px] border-neutral-900 tracking-tight leading-none inline-block truncate max-w-full bg-neutral-50/50",
                                    isEightPerPage ? "text-[12px] px-2 py-0.5" : "text-[11px] px-1.5 py-0.5"
                                  )}>
                                    REG: {regVal}
                                  </span>
                                ) : (
                                  <span className={cn(
                                    "font-black text-neutral-950 rounded-[2px] border-[1.4px] border-neutral-900 tracking-wide leading-none inline-block bg-neutral-50/50",
                                    isEightPerPage ? "text-[13.5px] px-2.5 py-0.5" : "text-[12px] px-2 py-0.5"
                                  )}>
                                    ROLL: {String(item.studentRoll).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Right Col: Location, Bench Column & Bench Number (5 cols) */}
                      <div className="col-span-5 flex flex-col justify-center text-right pl-1.5 border-l border-neutral-200/90 space-y-0.5">
                        <div>
                          <span className={cn(
                            "font-black text-neutral-950 block leading-tight tracking-tight",
                            isEightPerPage ? "text-[19px]" : "text-[16.5px]"
                          )}>
                            {formatRoomName(item.roomNumber)}
                          </span>
                          {item.floor && (
                            <span className={cn(
                              "font-bold text-neutral-500 block truncate leading-tight",
                              isEightPerPage ? "text-[10px] mt-0.5" : "text-[9px]"
                            )}>
                              {formatFloorText(item.floor)}
                            </span>
                          )}
                        </div>

                        <div className="pt-0.5 mt-0.5 border-t border-neutral-200/90">
                          <div className={cn(
                            "font-black text-neutral-950 leading-tight",
                            isEightPerPage ? "text-[13px]" : "text-[11.5px]"
                          )}>
                            <span>Col </span>
                            <strong className={cn(
                              "font-black text-neutral-950",
                              isEightPerPage ? "text-[15px]" : "text-[13.5px]"
                            )}>{item.columnIndex}</strong>
                            <span className="text-neutral-400 mx-1">•</span>
                            <span>Bench </span>
                            <strong className={cn(
                              "font-black text-neutral-950",
                              isEightPerPage ? "text-[15px]" : "text-[13.5px]"
                            )}>{item.benchIndex}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Issue Date & Authorized Sign */}
                    <div className={cn(
                      "relative z-10 flex items-end justify-between leading-none",
                      isEightPerPage ? "pt-1" : "pt-0.5"
                    )}>
                      <div className={cn(
                        "text-neutral-500 pb-0.5",
                        isEightPerPage ? "text-[8.5px]" : "text-[7px]"
                      )}>
                        Issued: <span className="font-bold text-neutral-800 font-mono">{issueDate}</span>
                        {effectiveStartTime && (
                          <span className="ml-1.5 pl-1.5 border-l border-neutral-300">
                            Time: <span className="font-bold text-neutral-800 font-mono">{effectiveStartTime}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-center justify-end">
                        {showSignature && headSignatureSrc ? (
                          <div className={cn(
                            "flex items-end justify-center relative",
                            isEightPerPage ? "h-[26px] -mb-1 -top-1" : "h-[15px] -mb-0.5 -top-0.5"
                          )}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={headSignatureSrc}
                              alt="Signature"
                              className={cn(
                                "object-contain select-none mix-blend-multiply",
                                isEightPerPage ? "max-h-[26px] max-w-[90px]" : "max-h-[15px] max-w-[56px]"
                              )}
                            />
                          </div>
                        ) : (
                          <div className={cn(isEightPerPage ? "h-[20px]" : "h-[12px]")} />
                        )}
                        <span className={cn(
                          "font-black text-neutral-800 uppercase tracking-wider leading-tight text-center",
                          isEightPerPage ? "text-[8px]" : "text-[7px]"
                        )}>
                          Authorized Signatory
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={`empty-cell-${pageIndex}-${slotIdx}`}
                    className="border border-dashed border-neutral-100 rounded-[3px] h-full"
                  />
                )}

                    {/* Dedicated Cutting Mark with Scissor between columns */}
                    {hasColRight && (
                      <div
                        className={cn(
                          "absolute top-0 bottom-0 pointer-events-none flex items-center justify-center z-20",
                          isEightPerPage ? "-right-[2.25mm] w-0" : "-right-[1.2mm] w-0"
                        )}
                      >
                        <div className="w-0 h-full border-r border-dashed border-neutral-400/80 print:border-neutral-500" />
                        <span
                          className={cn(
                            "absolute bg-white px-0.5 text-neutral-500 print:text-neutral-700 select-none leading-none rotate-90 font-mono",
                            isEightPerPage ? "text-[8.5px]" : "text-[7px]"
                          )}
                        >
                          ✂
                        </span>
                      </div>
                    )}

                    {/* Dedicated Cutting Mark with Scissor between rows */}
                    {hasRowBottom && (
                      <div
                        className={cn(
                          "absolute left-0 right-0 pointer-events-none flex items-center justify-center z-20",
                          isEightPerPage ? "-bottom-[1.75mm] h-0" : "-bottom-[0.8mm] h-0"
                        )}
                      >
                        <div className="w-full h-0 border-b border-dashed border-neutral-400/80 print:border-neutral-500" />
                        <span
                          className={cn(
                            "absolute bg-white px-1 text-neutral-500 print:text-neutral-700 select-none leading-none font-mono",
                            isEightPerPage ? "text-[8.5px]" : "text-[7px]"
                          )}
                        >
                          ✂
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Back Page (Duplex Routine Page) */}
        {includeBackSideRoutine && (
          <div key={`admit-page-wrap-back-${pageIndex}`} className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
            {/* Visual Page Counter in Screen Preview */}
            <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
              <span className="bg-amber-800/80 text-amber-200 px-2 py-0.5 rounded border border-amber-700">
                Page {pageIndex + 1} of {pages.length} (Back Side - Class Routine)
              </span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">
                Duplex Mirrored (Flip on Long Edge)
              </span>
            </div>

            <div
              className={cn(
                "ems-admit-sheet mx-auto box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0",
                isLandscape
                  ? "landscape w-[297mm] h-[206mm] max-h-[206mm] p-[3mm_4.5mm]"
                  : "portrait w-[210mm] h-[294mm] max-h-[294mm] p-[3mm_4.5mm]"
              )}
            >
              {/* Back Grid: Mirrored columns so cutting line aligns front to back */}
              <div
                className={cn(
                  "h-full w-full",
                  isEightPerPage
                    ? isLandscape
                      ? "grid grid-cols-4 grid-rows-[repeat(2,minmax(0,1fr))] gap-x-[4.5mm] gap-y-[3.5mm]"
                      : "grid grid-cols-2 grid-rows-[repeat(4,minmax(0,1fr))] gap-x-[4.5mm] gap-y-[3.5mm]"
                    : isLandscape
                      ? "grid grid-cols-4 grid-rows-[repeat(5,minmax(0,1fr))] gap-x-[2.4mm] gap-y-[1.6mm]"
                      : "grid grid-cols-3 grid-rows-[repeat(7,minmax(0,1fr))] gap-x-[2.4mm] gap-y-[1.6mm]"
                )}
              >
                {backGrid.map((item, slotIdx) => {
                  const col = slotIdx % numCols;
                  const row = Math.floor(slotIdx / numCols);
                  const hasColRight = col < numCols - 1;
                  const hasRowBottom = row < numRows - 1;

                  return (
                    <div key={`back-slot-wrap-${pageIndex}-${slotIdx}`} className="relative h-full w-full">
                      {item ? (
                        <div
                          key={`back-card-${pageIndex}-${slotIdx}-${item.studentRoll}`}
                          className={cn(
                            "relative border border-dashed border-neutral-300 rounded-[3px] flex flex-col justify-between overflow-hidden bg-white h-full box-border",
                            isEightPerPage ? "p-[2.5mm_3mm]" : "p-[1.5mm]"
                          )}
                        >
                          {/* Watermark logo */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                            <img
                              src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                              alt="Watermark"
                              loading="eager"
                              decoding="async"
                              className={cn(
                                "object-contain opacity-[0.08] grayscale select-none print:filter-none print:opacity-[0.07]",
                                isEightPerPage ? "w-24 h-24" : "w-14 h-14"
                              )}
                            />
                          </div>

                          {/* Card Top: Examination Routine header */}
                          <div
                            className={cn(
                              "relative z-10 border-b-[1.2px] border-neutral-900/90 flex items-center justify-between leading-none",
                              isEightPerPage ? "pb-1 mb-1" : "pb-0.5 mb-0.5"
                            )}
                          >
                            <div className="min-w-0 pr-1 flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "font-black uppercase tracking-tight text-neutral-950 truncate leading-tight",
                                  isEightPerPage ? "text-[11.5px]" : "text-[8.5px]"
                                )}
                              >
                                EXAM ROUTINE • CLASS {item.studentClass}{effectiveStartTime ? ` • ${effectiveStartTime}` : ""}
                              </span>
                            </div>
                            <div className="shrink-0 text-right">
                              <span
                                className={cn(
                                  "font-bold text-neutral-600 uppercase tracking-wider leading-none inline-block font-mono",
                                  isEightPerPage ? "text-[9.5px]" : "text-[8px]"
                                )}
                              >
                                ROLL: {String(item.studentRoll).padStart(2, "0")}
                              </span>
                            </div>
                          </div>

                          {/* Routine Table */}
                          <div className="relative z-10 flex-1 overflow-hidden flex flex-col justify-start">
                            {(() => {
                              const classRoutine = getClassRoutine(item.studentClass);
                              if (!classRoutine || classRoutine.length === 0) {
                                return (
                                  <div className="flex-1 flex items-center justify-center text-center p-2">
                                    <span className="text-[10px] text-neutral-400 font-medium">Routine not configured</span>
                                  </div>
                                );
                              }

                              return (
                                <table className="w-full border-collapse text-left">
                                  <thead>
                                    <tr className="border-b border-neutral-800 bg-neutral-100/90">
                                      <th
                                        className={cn(
                                          "font-bold text-neutral-900 uppercase border-r border-neutral-300 py-0.5 px-1.5",
                                          isEightPerPage ? "text-[9px] w-[30%]" : "text-[7.5px] w-[30%]"
                                        )}
                                      >
                                        Date
                                      </th>
                                      <th
                                        className={cn(
                                          "font-bold text-neutral-900 uppercase border-r border-neutral-300 py-0.5 px-1.5",
                                          isEightPerPage ? "text-[9px] w-[28%]" : "text-[7.5px] w-[28%]"
                                        )}
                                      >
                                        Day
                                      </th>
                                      <th
                                        className={cn(
                                          "font-bold text-neutral-900 uppercase py-0.5 px-1.5",
                                          isEightPerPage ? "text-[9px]" : "text-[7.5px]"
                                        )}
                                      >
                                        Subject
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-neutral-200">
                                    {classRoutine.map((rItem, rIdx) => {
                                      const dateDisplay = rItem.date
                                        ? (() => {
                                            const parts = rItem.date.split("-");
                                            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : rItem.date;
                                          })()
                                        : "-";

                                      return (
                                        <tr key={`r-row-${rIdx}`} className="leading-tight">
                                          <td
                                            className={cn(
                                              "font-semibold text-neutral-900 border-r border-neutral-200 py-0.5 px-1.5 whitespace-nowrap",
                                              isEightPerPage ? "text-[9.5px]" : "text-[8px]"
                                            )}
                                          >
                                            {dateDisplay}
                                          </td>
                                          <td
                                            className={cn(
                                              "font-medium text-neutral-700 border-r border-neutral-200 py-0.5 px-1.5 whitespace-nowrap",
                                              isEightPerPage ? "text-[9px]" : "text-[7.5px]"
                                            )}
                                          >
                                            {rItem.day || "-"}
                                          </td>
                                          <td
                                            className={cn(
                                              "font-bold text-neutral-950 py-0.5 px-1.5 truncate",
                                              isEightPerPage ? "text-[9.5px]" : "text-[8px]"
                                            )}
                                          >
                                            {rItem.subject || "-"}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              );
                            })()}
                          </div>

                          {/* Card Bottom: Minimal school note */}
                          <div
                            className={cn(
                              "relative z-10 border-t border-neutral-200/90 pt-1 flex items-center justify-between text-neutral-500",
                              isEightPerPage ? "text-[8px]" : "text-[7px]"
                            )}
                          >
                            <span className="truncate">{schoolProfile.schoolName || "Marigachi High School (H.S.)"}</span>
                            <span className="font-mono">{formatShortExam(getStudentExamTitle(examType, item.studentClass), academicYear)}</span>
                          </div>

                          {/* Cutting Mark between columns */}
                          {hasColRight && (
                            <div
                              className={cn(
                                "absolute top-0 bottom-0 pointer-events-none flex items-center justify-center z-20",
                                isEightPerPage ? "-right-[2.25mm] w-0" : "-right-[1.2mm] w-0"
                              )}
                            >
                              <div className="w-0 h-full border-r border-dashed border-neutral-400/80 print:border-neutral-500" />
                              <span
                                className={cn(
                                  "absolute bg-white px-0.5 text-neutral-500 print:text-neutral-700 select-none leading-none rotate-90 font-mono",
                                  isEightPerPage ? "text-[8.5px]" : "text-[7px]"
                                )}
                              >
                                ✂
                              </span>
                            </div>
                          )}

                          {/* Cutting Mark between rows */}
                          {hasRowBottom && (
                            <div
                              className={cn(
                                "absolute left-0 right-0 pointer-events-none flex items-center justify-center z-20",
                                isEightPerPage ? "-bottom-[1.75mm] h-0" : "-bottom-[0.8mm] h-0"
                              )}
                            >
                              <div className="w-full h-0 border-b border-dashed border-neutral-400/80 print:border-neutral-500" />
                              <span
                                className={cn(
                                  "absolute bg-white px-1 text-neutral-500 print:text-neutral-700 select-none leading-none font-mono",
                                  isEightPerPage ? "text-[8.5px]" : "text-[7px]"
                                )}
                              >
                                ✂
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
})}
    </div>
  );
};
