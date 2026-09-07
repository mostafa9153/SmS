"use client";

import React from "react";
import { AllocatedRoom } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";

export interface EmsAdmitCardPrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  issueDate?: string;
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
}

interface StudentAdmitItem {
  studentName: string;
  studentRoll: number;
  studentClass: string;
  studentSection: string;
  schoolId?: string;
  roomNumber: string;
  floor?: string;
  building?: string;
  columnIndex: number;
  benchIndex: number;
  seatPosition: number;
  globalSeatNumber: number;
}

export const EmsAdmitCardPrintable: React.FC<EmsAdmitCardPrintableProps> = ({
  rooms,
  academicYear,
  examType,
  issueDate = new Date().toLocaleDateString("en-GB"),
  schoolProfile,
  targetRoomId = "ALL",
}) => {
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

  // Sort students by Room, Class, and Roll
  students.sort((a, b) => {
    if (a.roomNumber !== b.roomNumber) return a.roomNumber.localeCompare(b.roomNumber);
    if (a.studentClass !== b.studentClass) return a.studentClass.localeCompare(b.studentClass);
    if (a.studentSection !== b.studentSection) return a.studentSection.localeCompare(b.studentSection);
    return a.studentRoll - b.studentRoll;
  });

  // Chunk students into pages of 21 (3 columns x 7 rows)
  const CARDS_PER_PAGE = 21;
  const pages: StudentAdmitItem[][] = [];
  for (let i = 0; i < students.length; i += CARDS_PER_PAGE) {
    pages.push(students.slice(i, i + CARDS_PER_PAGE));
  }

  // Fallback empty page if no students
  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <div className="ems-print-admit-wrapper w-full bg-white text-neutral-900 font-sans print:p-0 print:m-0">
      {pages.map((pageStudents, pageIndex) => (
        <div key={`admit-page-wrap-${pageIndex}`} className="mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
          {/* Visual Page Counter in Screen Preview */}
          <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
            <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
              Page {pageIndex + 1} of {pages.length}
            </span>
            <span>•</span>
            <span>{pageStudents.length} Admit Cards</span>
          </div>

          <div
            className="ems-admit-sheet w-[210mm] h-[295mm] max-h-[295mm] mx-auto p-[3.5mm] box-border overflow-hidden bg-white relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
            style={{
              pageBreakAfter: pageIndex < pages.length - 1 ? "always" : "auto",
              breakAfter: pageIndex < pages.length - 1 ? "page" : "auto",
            }}
          >
          {/* 3 Columns x 7 Rows Grid = 21 Cards */}
          <div className="grid grid-cols-3 grid-rows-7 gap-[2mm] h-full w-full">
            {pageStudents.map((item, idx) => (
              <div
                key={`card-${pageIndex}-${idx}`}
                className="relative border border-dashed border-neutral-300 rounded-[3px] p-[2mm] flex flex-col justify-between overflow-hidden bg-white"
                style={{ height: "40.5mm", boxSizing: "border-box" }}
              >
                {/* Repeated subtle watermark logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                  <img
                    src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                    alt="Watermark"
                    className="w-14 h-14 object-contain opacity-[0.06] grayscale"
                  />
                </div>

                {/* Card Top: School Name & Exam Title */}
                <div className="relative z-10 border-b border-neutral-200 pb-0.5 mb-1 flex items-center justify-between">
                  <div className="min-w-0 pr-1">
                    <h4 className="text-[8px] font-extrabold uppercase tracking-tight text-neutral-900 truncate leading-tight">
                      {schoolProfile.schoolName || "Marigachi High School (H.S.)"}
                    </h4>
                    <p className="text-[6.5px] font-semibold text-neutral-600 truncate leading-none mt-0.5">
                      {examType} • {academicYear}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[6px] font-mono font-bold bg-neutral-900 text-white px-1 py-0.5 rounded-[2px] uppercase">
                      Admit
                    </span>
                  </div>
                </div>

                {/* Card Middle: Student Profile & Seating Info */}
                <div className="relative z-10 grid grid-cols-12 gap-1 my-auto">
                  {/* Left Col: Student Profile (7 cols) */}
                  <div className="col-span-7 flex flex-col justify-center space-y-0.5">
                    <div className="truncate">
                      <span className="text-[9px] font-black uppercase text-neutral-950 block truncate leading-tight">
                        {item.studentName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[7px] text-neutral-700 font-medium">
                      <span>
                        Class: <strong className="font-bold text-neutral-900">{item.studentClass} - {item.studentSection}</strong>
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 pt-0.5">
                      <span className="text-[7.5px] font-extrabold bg-neutral-100 text-neutral-900 px-1 py-0.5 rounded border border-neutral-300">
                        ROLL: {String(item.studentRoll).padStart(2, "0")}
                      </span>
                      {item.schoolId && (
                        <span className="text-[6px] text-neutral-500 font-mono truncate">
                          ID: {item.schoolId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Col: Location Box (5 cols) */}
                  <div className="col-span-5 bg-neutral-50/80 border border-neutral-200 rounded p-1 flex flex-col justify-between text-right">
                    <div>
                      <span className="text-[7.5px] font-black text-neutral-900 block leading-tight">
                        {item.roomNumber}
                      </span>
                      <span className="text-[6px] text-neutral-500 block truncate leading-tight">
                        {item.floor}
                      </span>
                    </div>

                    <div className="pt-0.5 border-t border-neutral-200/60 mt-0.5">
                      <div className="text-[6.5px] text-neutral-700 leading-tight">
                        Col <strong className="font-bold">{item.columnIndex}</strong> • B-<strong className="font-bold">{item.benchIndex}</strong>
                      </div>
                      <div className="text-[7.5px] font-bold text-indigo-900 leading-tight">
                        Seat: S{item.seatPosition} <span className="text-[6px] text-neutral-500 font-mono">(#{String(item.globalSeatNumber).padStart(2, "0")})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Issue Date & Authorized Sign */}
                <div className="relative z-10 border-t border-neutral-200 pt-0.5 flex items-center justify-between text-[6px] text-neutral-500">
                  <span>Issued: {issueDate}</span>
                  <span className="font-semibold text-neutral-700 uppercase">
                    Authorized Signatory
                  </span>
                </div>
              </div>
            ))}

            {/* Fill empty cells in page if less than 21 cards */}
            {Array.from({ length: CARDS_PER_PAGE - pageStudents.length }).map((_, i) => (
              <div
                key={`empty-cell-${i}`}
                className="border border-dashed border-neutral-100 rounded-[3px]"
                style={{ height: "40.5mm" }}
              />
            ))}
          </div>
        </div>
      </div>
      ))}
    </div>
  );
};
