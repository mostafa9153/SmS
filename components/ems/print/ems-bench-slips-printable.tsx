"use client";

import React from "react";
import { AllocatedRoom } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import { isHigherSecondaryClass, toShortStream } from "@/lib/ems/seat-arrangement-algorithm";
import { formatRoomName, getClassNumericRank, toColumnMajorGrid } from "@/lib/ems/ems-config-loader";
import { cn } from "@/lib/utils";

export interface EmsBenchSlipsPrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
  orientation?: "portrait" | "landscape";
  slipsPerPage?: number; // 32 (default: 4x8), 24 (3x8), or 57 (mini)
}

interface StudentBenchSlipItem {
  studentName: string;
  studentRoll: number;
  studentClass: string;
  studentSection: string;
  studentRegNo?: string;
  studentStream?: string;
  roomNumber: string;
  columnIndex: number;
  benchIndex: number;
  seatPosition: number;
  globalSeatNumber: number;
}

export const EmsBenchSlipsPrintable: React.FC<EmsBenchSlipsPrintableProps> = ({
  rooms,
  academicYear,
  examType,
  schoolProfile,
  targetRoomId = "ALL",
  orientation = "portrait",
  slipsPerPage = 32,
}) => {
  // Filter target rooms
  const activeRooms =
    targetRoomId === "ALL"
      ? rooms
      : rooms.filter((r) => r.roomId === targetRoomId);

  // Extract all occupied seats
  const slips: StudentBenchSlipItem[] = [];
  activeRooms.forEach((r) => {
    r.seats
      .filter((s) => !s.isVacant && s.studentName)
      .forEach((s) => {
        slips.push({
          studentName: s.studentName || "Student",
          studentRoll: s.studentRoll || 1,
          studentClass: s.studentClass || "VIII",
          studentSection: s.studentSection || "A",
          studentRegNo: s.studentRegNo,
          studentStream: s.studentStream,
          roomNumber: r.roomNumber,
          columnIndex: s.columnIndex,
          benchIndex: s.benchIndex,
          seatPosition: s.seatPosition,
          globalSeatNumber: s.globalSeatNumber,
        });
      });
  });

  // Sort bench slips in the exact same logical order as Admit Cards:
  // 1. Room number (natural alphanumeric)
  // 2. Class (standard grade rank via getClassNumericRank, then natural alphanumeric)
  // 3. If Higher Secondary: Reg No (or Roll); else: Section, then Roll
  slips.sort((a, b) => {
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

  // Chunk slips into pages based on slipsPerPage and orientation:
  // - 32 per page (Default): 4 cols x 8 rows in Portrait; 8 cols x 4 rows in Landscape
  // - 24 per page (3x8): 3 cols x 8 rows in Portrait; 6 cols x 4 rows in Landscape
  // - 57 per page (Mini): 3 cols x 19 rows in Portrait; 4 cols x 14 rows in Landscape (56)
  const isLandscape = orientation === "landscape";
  const resolvedSlipsPerPage = slipsPerPage ?? 32;

  let numCols: number;
  let numRows: number;

  if (resolvedSlipsPerPage === 24) {
    numCols = isLandscape ? 6 : 3;
    numRows = isLandscape ? 4 : 8;
  } else if (resolvedSlipsPerPage === 57 || resolvedSlipsPerPage === 56) {
    numCols = isLandscape ? 4 : 3;
    numRows = isLandscape ? 14 : 19;
  } else {
    // Default: 32 slips per page
    numCols = isLandscape ? 8 : 4;
    numRows = isLandscape ? 4 : 8;
  }

  const SLIPS_PER_PAGE = numCols * numRows;
  const pages: StudentBenchSlipItem[][] = [];
  for (let i = 0; i < slips.length; i += SLIPS_PER_PAGE) {
    pages.push(slips.slice(i, i + SLIPS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  const isMini = resolvedSlipsPerPage === 57 || resolvedSlipsPerPage === 56;

  return (
    <div
      className={cn(
        "ems-print-slips-wrapper w-full bg-white text-neutral-900 font-sans print:p-0 print:m-0",
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
      {pages.map((pageSlips, pageIndex) => (
        <div key={`slip-page-wrap-${pageIndex}`} className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
          {/* Visual Page Counter in Screen Preview */}
          <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
            <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
              Page {pageIndex + 1} of {pages.length}
            </span>
            <span>•</span>
            <span>
              {pageSlips.length} Bench Slips ({
                resolvedSlipsPerPage === 32
                  ? isLandscape ? "8×4 Landscape • 32/Page" : "4×8 Portrait • 32/Page"
                  : resolvedSlipsPerPage === 24
                    ? isLandscape ? "6×4 Landscape • 24/Page" : "3×8 Portrait • 24/Page"
                    : isLandscape ? "4×14 Landscape • 56/Page" : "3×19 Portrait • 57/Page"
              })
            </span>
            <span>•</span>
            <span className="text-emerald-500 font-semibold">
              {!isMini ? "3mm Cut Space • Dashed Border" : "Mini Compact"}
            </span>
          </div>

          <div
            className={cn(
              "ems-slips-sheet mx-auto box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0",
              isLandscape
                ? "landscape w-[297mm] h-[206mm] max-h-[206mm]"
                : "portrait w-[210mm] h-[294mm] max-h-[294mm]",
              isMini
                ? "p-[1mm_3mm]"
                : isLandscape
                  ? "p-[3mm_4mm]"
                  : "p-[3.5mm_4mm]"
            )}
          >
            {/* Grid Layout with dedicated cutting gaps */}
            <div
              className={cn(
                "h-full w-full",
                isMini
                  ? isLandscape
                    ? "grid grid-cols-4 grid-rows-[repeat(14,minmax(0,1fr))] gap-x-[1.8mm] gap-y-[0.3mm]"
                    : "grid grid-cols-3 grid-rows-[repeat(19,minmax(0,1fr))] gap-x-[1.8mm] gap-y-[0.3mm]"
                  : resolvedSlipsPerPage === 24
                    ? isLandscape
                      ? "grid grid-cols-6 grid-rows-[repeat(4,minmax(0,1fr))] gap-x-[3.5mm] gap-y-[3mm]"
                      : "grid grid-cols-3 grid-rows-[repeat(8,minmax(0,1fr))] gap-x-[3.8mm] gap-y-[2.8mm]"
                    : isLandscape
                      ? "grid grid-cols-8 grid-rows-[repeat(4,minmax(0,1fr))] gap-x-[2.8mm] gap-y-[3mm]"
                      : "grid grid-cols-4 grid-rows-[repeat(8,minmax(0,1fr))] gap-x-[3.2mm] gap-y-[2.8mm]"
              )}
            >
              {toColumnMajorGrid(pageSlips, numCols, numRows).map((item, slotIdx) => {
                if (!item) {
                  return (
                    <div
                      key={`empty-slip-${pageIndex}-${slotIdx}`}
                      className="border border-dashed border-neutral-100 rounded-[3px] h-full"
                    />
                  );
                }

                const displayRoom = formatRoomName(item.roomNumber);
                const isHs = isHigherSecondaryClass(item.studentClass);
                const streamText = item.studentStream || (item.studentSection ? toShortStream(item.studentSection) : "") || "Sci";
                const regVal = (item.studentRegNo || "").trim();

                // Compact 2-line layout for 57 Mini slips
                if (isMini) {
                  return (
                    <div
                      key={`slip-${pageIndex}-${slotIdx}-${item.studentRoll}`}
                      className={cn(
                        "relative border border-dashed border-neutral-300 rounded-[2px] flex flex-col justify-between overflow-hidden bg-white h-full box-border",
                        isLandscape ? "px-[1.5mm] py-[0.5mm]" : "px-[2mm] py-[0.8mm]"
                      )}
                    >
                      <span className={cn("absolute -top-1 -right-0.5 text-neutral-400 select-none pointer-events-none opacity-40", isLandscape ? "text-[6px]" : "text-[7px]")}>
                        ✂
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                        <img
                          src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                          alt="Watermark"
                          loading="eager"
                          decoding="async"
                          className={cn("object-contain opacity-[0.15] grayscale print:filter-none print:opacity-[0.14]", isLandscape ? "w-8 h-8" : "w-9 h-9")}
                        />
                      </div>
                      <div className="relative z-10 flex items-center justify-between gap-1 leading-none">
                        {isHs ? (
                          <div
                            className={cn(
                              "font-black text-neutral-950 tracking-tight leading-none shrink-0 font-mono",
                              isLandscape
                                ? regVal.length > 10 ? "text-[12px]" : regVal.length > 7 ? "text-[13px]" : "text-[14px]"
                                : regVal.length > 10 ? "text-[13px]" : regVal.length > 7 ? "text-[14px]" : "text-[15.5px]"
                            )}
                            title={regVal ? `Reg No: ${regVal}` : `Roll ${item.studentRoll}`}
                          >
                            {regVal ? `REG ${regVal}` : `ROLL ${String(item.studentRoll).padStart(2, "0")}`}
                          </div>
                        ) : (
                          <div className={cn("font-black text-neutral-950 tracking-tight leading-none shrink-0 font-mono", isLandscape ? "text-[15.5px]" : "text-[17.5px]")}>
                            ROLL {String(item.studentRoll).padStart(2, "0")}
                          </div>
                        )}
                        <div className={cn("font-black uppercase text-neutral-950 truncate text-right leading-none min-w-0 flex-1 pl-1 tracking-tight", isLandscape ? "text-[11px]" : "text-[12.5px]")}>
                          {item.studentName}
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center justify-between gap-1 leading-none pt-0.5">
                        <div className={cn("font-bold text-neutral-700 leading-none truncate min-w-0", isLandscape ? "text-[9.5px]" : "text-[10.5px]")}>
                          Class:{" "}
                          <span className={cn("font-black text-neutral-950", isLandscape ? "text-[10.5px]" : "text-[11.5px]")}>
                            {isHs ? `${item.studentClass} - ${streamText}` : `${item.studentClass} - ${item.studentSection}`}
                          </span>
                        </div>
                        <div className={cn("flex items-center justify-end space-x-1 font-bold text-neutral-800 leading-none shrink-0", isLandscape ? "text-[7.5px]" : "text-[8.5px]")}>
                          <span className={cn("font-black text-neutral-950 bg-neutral-100 px-1 py-[0.5px] rounded border border-neutral-300 leading-none", isLandscape ? "text-[9px]" : "text-[10px]")}>{displayRoom}</span>
                          <span className="text-neutral-400 text-[7px]">•</span>
                          <span className={cn("text-neutral-600", isLandscape ? "text-[7.5px]" : "text-[8.5px]")}>
                            Col <strong className="font-black text-neutral-950">{item.columnIndex}</strong> • B-<strong className="font-black text-neutral-950">{item.benchIndex}</strong>
                          </span>
                          <span className={cn("bg-indigo-50 border border-indigo-200 text-indigo-950 font-black px-1 py-[0.5px] rounded leading-none", isLandscape ? "text-[7.5px]" : "text-[8.5px]")}>
                            Seat S{item.seatPosition}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Generous 3-line layout for 32 or 24 slips per page with proper cutting space
                return (
                  <div
                    key={`slip-${pageIndex}-${slotIdx}-${item.studentRoll}`}
                    className="relative border border-dashed border-neutral-300 print:border-neutral-400 rounded-[3px] flex flex-col justify-between overflow-hidden bg-white h-full box-border px-[2.5mm] py-[1.8mm]"
                  >
                    {/* Corner Cut Indicator */}
                    <span className="absolute -top-1 -right-0.5 text-neutral-400 select-none pointer-events-none opacity-40 text-[7px]">
                      ✂
                    </span>

                    {/* School Logo Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                      <img
                        src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                        alt="Watermark"
                        loading="eager"
                        decoding="async"
                        className="w-8 h-8 object-contain opacity-[0.11] grayscale print:filter-none print:opacity-[0.10]"
                      />
                    </div>

                    {/* Line 1: Roll / Reg (Left) & Room + Seat Badge (Right) */}
                    <div className="relative z-10 flex items-center justify-between gap-1 leading-none">
                      {isHs ? (
                        <div
                          className={cn(
                            "font-black text-neutral-950 tracking-tight leading-none shrink-0 font-mono",
                            regVal.length > 10 ? "text-[12px]" : regVal.length > 7 ? "text-[13px]" : "text-[14px]"
                          )}
                          title={regVal ? `Reg No: ${regVal}` : `Roll ${item.studentRoll}`}
                        >
                          {regVal ? `REG ${regVal}` : `ROLL ${String(item.studentRoll).padStart(2, "0")}`}
                        </div>
                      ) : (
                        <div className="font-black text-neutral-950 tracking-tight leading-none shrink-0 font-mono text-[14.5px]">
                          ROLL {String(item.studentRoll).padStart(2, "0")}
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0 leading-none">
                        <span className="font-extrabold text-neutral-900 bg-neutral-100 border border-neutral-300 px-1 py-[1px] rounded text-[9px] leading-tight">
                          {displayRoom}
                        </span>
                        <span className="font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-1 py-[1px] rounded text-[9px] leading-tight">
                          S{item.seatPosition}
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Student Full Name */}
                    <div className="relative z-10 py-0.5">
                      <div className="font-black uppercase text-neutral-950 tracking-tight text-[11.5px] leading-tight truncate">
                        {item.studentName}
                      </div>
                    </div>

                    {/* Line 3: Class & Desk Position */}
                    <div className="relative z-10 flex items-center justify-between gap-1 leading-none pt-0.5 border-t border-neutral-100">
                      <div className="font-bold text-neutral-700 leading-none truncate min-w-0 text-[10px]">
                        Class:{" "}
                        <span className="font-black text-neutral-950 text-[10.5px]">
                          {isHs ? `${item.studentClass}-${streamText}` : `${item.studentClass}-${item.studentSection}`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 font-bold text-neutral-800 leading-none shrink-0 text-[8.5px]">
                        <span className="text-neutral-600">
                          Col <strong className="font-black text-neutral-950">{item.columnIndex}</strong> • B-<strong className="font-black text-neutral-950">{item.benchIndex}</strong>
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
