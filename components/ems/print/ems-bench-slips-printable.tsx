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
        <div key={`slip-page-wrap-${pageIndex}`} className="mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
          {/* Visual Page Counter in Screen Preview */}
          <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
            <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
              Page {pageIndex + 1} of {pages.length}
            </span>
            <span>•</span>
            <span>{pageSlips.length} Bench Slips</span>
          </div>

          <div
            className="ems-slips-sheet w-[210mm] h-[295mm] max-h-[295mm] mx-auto p-[3.5mm] box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
            style={{
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto",
              breakAfter: pageIndex < pages.length - 1 ? "page" : "auto",
            }}
          >
          {/* 3 Columns x 10 Rows Grid = 30 Slips */}
          <div className="grid grid-cols-3 grid-rows-10 gap-[1.5mm] h-full w-full">
            {pageSlips.map((item, idx) => (
              <div
                key={`slip-${pageIndex}-${idx}`}
                className="relative border border-dashed border-neutral-300 rounded-[2px] p-[1.5mm] flex flex-col justify-between overflow-hidden bg-white"
                style={{ height: "27.5mm", boxSizing: "border-box" }}
              >
                {/* Micro Cut Indicator Icon */}
                <span className="absolute -top-1.5 -right-1 text-[8px] text-neutral-400 select-none pointer-events-none opacity-40">
                  ✂
                </span>

                {/* Top Header: Dual Logos & School Title */}
                <div className="flex items-center justify-between border-b border-neutral-200 pb-0.5 leading-none">
                  {/* Left Logo */}
                  <img
                    src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                    alt="School Logo"
                    className="w-3.5 h-3.5 object-contain shrink-0"
                  />

                  {/* Center Text */}
                  <div className="text-center px-1 min-w-0 flex-1">
                    <h5 className="text-[7.5px] font-black uppercase text-neutral-900 truncate leading-tight">
                      {schoolProfile.schoolName || "Marigachi High School (H.S.)"}
                    </h5>
                    <p className="text-[6px] font-semibold text-neutral-600 truncate leading-none mt-0.5">
                      {examType} • {academicYear}
                    </p>
                  </div>

                  {/* Right Secondary Emblem */}
                  <img
                    src="/logo.png"
                    alt="Secondary Emblem"
                    className="w-3.5 h-3.5 object-contain shrink-0"
                  />
                </div>

                {/* Middle Content: Big Roll, Student Name & Location */}
                <div className="grid grid-cols-12 gap-1 my-auto items-center">
                  {/* Left: Roll Number in High Visibility font (5 cols) */}
                  <div className="col-span-5 flex flex-col justify-center">
                    <span className="text-[14px] font-black text-neutral-950 tracking-tight leading-none">
                      ROLL {String(item.studentRoll).padStart(2, "0")}
                    </span>
                    <span className="text-[7.5px] font-bold text-neutral-800 leading-tight mt-0.5">
                      Class: {item.studentClass}-{item.studentSection}
                    </span>
                  </div>

                  {/* Right: Student Name & Exact Desk Coordinates (7 cols) */}
                  <div className="col-span-7 bg-neutral-50 border border-neutral-200/80 rounded px-1 py-0.5 text-right">
                    <span className="text-[8.5px] font-extrabold uppercase text-neutral-950 block truncate leading-tight">
                      {item.studentName}
                    </span>
                    <div className="flex items-center justify-end space-x-1 text-[7px] text-neutral-700 font-semibold pt-0.5">
                      <span className="bg-neutral-200/80 px-1 rounded text-neutral-900 font-bold">
                        {item.roomNumber}
                      </span>
                      <span>
                        C{item.columnIndex} • B{item.benchIndex}
                      </span>
                      <span className="font-extrabold text-indigo-900">
                        S{item.seatPosition}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Seat No & Desk Sticker Footer */}
                <div className="border-t border-neutral-200 pt-0.5 flex items-center justify-between text-[6px] text-neutral-500 font-medium">
                  <span className="uppercase tracking-wider font-semibold text-neutral-600">
                    Desk Seating Slip
                  </span>
                  <span className="font-mono font-bold text-neutral-800">
                    Seat #{String(item.globalSeatNumber).padStart(2, "0")}
                  </span>
                </div>
              </div>
            ))}

            {/* Fill empty cells in page if less than 30 slips */}
            {Array.from({ length: SLIPS_PER_PAGE - pageSlips.length }).map((_, i) => (
              <div
                key={`empty-slip-${i}`}
                className="border border-dashed border-neutral-100 rounded-[2px]"
                style={{ height: "27.5mm" }}
              />
            ))}
          </div>
        </div>
      </div>
      ))}
    </div>
  );
};
