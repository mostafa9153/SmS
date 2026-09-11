"use client";

import React from "react";
import { AllocatedRoom } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";

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
        roomNumber: r.roomNumber,
        columnIndex: s.columnIndex,
        benchIndex: s.benchIndex,
        seatPosition: s.seatPosition,
        globalSeatNumber: s.globalSeatNumber,
      });
    });
  });

  // Chunk slips into pages of 30 (3 columns x 10 rows)
  const SLIPS_PER_PAGE = 30;
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
            className="ems-slips-sheet w-[210mm] h-[278mm] max-h-[278mm] mx-auto p-[2mm_4mm] box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
          >
            {/* 3 Columns x 10 Rows Grid = 30 Slips */}
            <div className="grid grid-cols-3 grid-rows-10 gap-x-[2mm] gap-y-[1mm] h-full w-full">
              {pageSlips.map((item, idx) => (
                <div
                  key={`slip-${pageIndex}-${idx}`}
                  className="relative border border-dashed border-neutral-300 rounded-[2px] p-[2mm] flex flex-col justify-between overflow-hidden bg-white h-full box-border"
                >
                  {/* Micro Cut Indicator Icon */}
                  <span className="absolute -top-1.5 -right-1 text-[8px] text-neutral-400 select-none pointer-events-none opacity-40">
                    ✂
                  </span>

                  {/* School Logo Watermark in Background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                    <img
                      src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                      alt="Watermark"
                      loading="eager"
                      decoding="async"
                      className="w-14 h-14 object-contain opacity-[0.08] grayscale print:filter-none print:opacity-[0.05]"
                    />
                  </div>

                  {/* Top Mini Header: Exam Type & Room Number */}
                  <div className="relative z-10 flex items-center justify-between border-b border-neutral-200/80 pb-0.5 leading-none">
                    <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider truncate max-w-[130px]">
                      {examType} • {academicYear}
                    </span>
                    <span className="text-[7.5px] font-black text-neutral-900 bg-neutral-100 border border-neutral-300 px-1 py-0.2 rounded leading-none">
                      Room {item.roomNumber}
                    </span>
                  </div>

                  {/* Main Body: Big Roll, Class, Student Name & Bench Coordinates */}
                  <div className="relative z-10 grid grid-cols-12 gap-1 my-auto items-center">
                    {/* Left: Roll Number & Class Section (6 cols) */}
                    <div className="col-span-6 flex flex-col justify-center">
                      <div className="text-[17px] font-black text-neutral-950 tracking-tight leading-none">
                        ROLL {String(item.studentRoll).padStart(2, "0")}
                      </div>
                      <div className="text-[10.5px] font-bold text-neutral-700 leading-tight mt-1">
                        Class: <span className="font-black text-neutral-950 text-[11px]">{item.studentClass} - {item.studentSection}</span>
                      </div>
                    </div>

                    {/* Right: Student Name & Bench Coordinates (6 cols) */}
                    <div className="col-span-6 flex flex-col justify-center text-right">
                      <div className="text-[11px] font-black uppercase text-neutral-950 block truncate leading-tight">
                        {item.studentName}
                      </div>
                      <div className="flex items-center justify-end space-x-1 text-[8.5px] font-bold text-neutral-800 pt-1">
                        <span className="text-neutral-600">
                          Col <strong className="font-black text-neutral-950">{item.columnIndex}</strong> • B-<strong className="font-black text-neutral-950">{item.benchIndex}</strong>
                        </span>
                        <span className="bg-indigo-50 border border-indigo-200 text-indigo-950 font-black px-1.5 py-0.2 rounded text-[9px] leading-none">
                          Seat S{item.seatPosition}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Fill empty cells in page if less than 30 slips */}
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
