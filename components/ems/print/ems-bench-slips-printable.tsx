"use client";

import React from "react";
import { AllocatedRoom } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import { isHigherSecondaryClass, toShortStream } from "@/lib/ems/seat-arrangement-algorithm";

export interface EmsBenchSlipsPrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
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
}) => {
  // Filter target rooms
  const activeRooms =
    targetRoomId === "ALL"
      ? rooms
      : rooms.filter((r) => r.roomId === targetRoomId);

  // Extract all occupied seats
  const slips: StudentBenchSlipItem[] = [];
  activeRooms.forEach((r) => {
    // Sort seats in logical room order: by column, then bench, then seat position
    const sortedSeats = [...r.seats]
      .filter((s) => !s.isVacant && s.studentName)
      .sort((a, b) => {
        if (a.columnIndex !== b.columnIndex) return a.columnIndex - b.columnIndex;
        if (a.benchIndex !== b.benchIndex) return a.benchIndex - b.benchIndex;
        return a.seatPosition - b.seatPosition;
      });

    sortedSeats.forEach((s) => {
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

  // Chunk slips into pages of 57 (3 columns x 19 rows)
  const SLIPS_PER_PAGE = 57;
  const pages: StudentBenchSlipItem[][] = [];
  for (let i = 0; i < slips.length; i += SLIPS_PER_PAGE) {
    pages.push(slips.slice(i, i + SLIPS_PER_PAGE));
  }

  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div className="ems-print-slips-wrapper w-full bg-white text-neutral-900 font-sans print:p-0 print:m-0">
      {pages.map((pageSlips, pageIndex) => (
        <div key={`slip-page-wrap-${pageIndex}`} className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
          {/* Visual Page Counter in Screen Preview */}
          <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
            <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
              Page {pageIndex + 1} of {pages.length}
            </span>
            <span>•</span>
            <span>{pageSlips.length} Bench Slips</span>
          </div>

          <div
            className="ems-slips-sheet w-[210mm] h-[287mm] max-h-[287mm] mx-auto p-[1mm_3mm] box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
          >
            {/* 3 Columns x 19 Rows Grid = 57 Slips */}
            <div className="grid grid-cols-3 grid-rows-[repeat(19,minmax(0,1fr))] gap-x-[1.8mm] gap-y-[0.3mm] h-full w-full">
              {pageSlips.map((item, idx) => {
                const cleanRoom = item.roomNumber.replace(/^Room\s*/i, "").trim();
                const displayRoom = cleanRoom ? `Room ${cleanRoom}` : "Room";
                const isHs = isHigherSecondaryClass(item.studentClass);
                const streamText = item.studentStream || (item.studentSection ? toShortStream(item.studentSection) : "") || "Sci";
                const regVal = (item.studentRegNo || "").trim();

                return (
                  <div
                    key={`slip-${pageIndex}-${idx}`}
                    className="relative border border-dashed border-neutral-300 rounded-[2px] px-[2mm] py-[0.8mm] flex flex-col justify-between overflow-hidden bg-white h-full box-border"
                  >
                    {/* Micro Cut Indicator Icon */}
                    <span className="absolute -top-1 -right-0.5 text-[7px] text-neutral-400 select-none pointer-events-none opacity-40">
                      ✂
                    </span>

                    {/* School Logo Watermark in Background */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                      <img
                        src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                        alt="Watermark"
                        loading="eager"
                        decoding="async"
                        className="w-9 h-9 object-contain opacity-[0.06] grayscale print:filter-none print:opacity-[0.05]"
                      />
                    </div>

                    {/* Line 1: Big Roll or Reg No (Left) & Student Name (Right) */}
                    <div className="relative z-10 flex items-center justify-between gap-1 leading-none">
                      {isHs ? (
                        <div
                          className={`font-black text-neutral-950 tracking-tight leading-none truncate max-w-[125px] ${
                            regVal.length > 10 ? "text-[12px]" : regVal.length > 7 ? "text-[13.5px]" : "text-[15px]"
                          }`}
                          title={regVal ? `Reg No: ${regVal}` : `Roll ${item.studentRoll}`}
                        >
                          {regVal ? `REG ${regVal}` : `ROLL ${String(item.studentRoll).padStart(2, "0")}`}
                        </div>
                      ) : (
                        <div className="text-[17px] font-black text-neutral-950 tracking-tight leading-none">
                          ROLL {String(item.studentRoll).padStart(2, "0")}
                        </div>
                      )}
                      <div className="text-[11.5px] font-black uppercase text-neutral-950 truncate text-right leading-none max-w-[110px]">
                        {item.studentName}
                      </div>
                    </div>

                    {/* Line 2: Class & Section/Stream (Left) & Room, Col, Bench, Seat (Right) */}
                    <div className="relative z-10 flex items-center justify-between gap-1 leading-none pt-0.5">
                      <div className="text-[10.5px] font-bold text-neutral-700 leading-none">
                        Class:{" "}
                        <span className="font-black text-neutral-950 text-[11.5px]">
                          {isHs ? `${item.studentClass} - ${streamText}` : `${item.studentClass} - ${item.studentSection}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-end space-x-1 text-[8.5px] font-bold text-neutral-800 leading-none">
                        <span className="text-[10px] font-black text-neutral-950 bg-neutral-100 px-1 py-0.2 rounded border border-neutral-300 leading-none">{displayRoom}</span>
                        <span className="text-neutral-400 text-[7px]">•</span>
                        <span className="text-neutral-600 text-[8.5px]">
                          Col <strong className="font-black text-neutral-950">{item.columnIndex}</strong> • B-<strong className="font-black text-neutral-950">{item.benchIndex}</strong>
                        </span>
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-950 font-black px-1 py-0.2 rounded text-[8.5px] leading-none">
                          Seat S{item.seatPosition}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Fill empty cells in page if less than 57 slips */}
              {Array.from({ length: SLIPS_PER_PAGE - pageSlips.length }).map((_, i) => (
                <div
                  key={`empty-slip-${i}`}
                  className="border border-dashed border-neutral-100 rounded-[2px] h-full"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
