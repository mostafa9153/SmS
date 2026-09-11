"use client";

import React from "react";
import { AllocatedRoom, SeatAssignment } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";

export interface EmsAttendanceSheetPrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
  examHeaders?: string[]; // Array of up to 8 strings for Date/Subject
}

interface StudentRowItem {
  roll: number;
  name: string;
  studentClass: string;
  section: string;
}

export const EmsAttendanceSheetPrintable: React.FC<EmsAttendanceSheetPrintableProps> = ({
  rooms,
  academicYear,
  examType,
  schoolProfile,
  targetRoomId = "ALL",
  examHeaders = ["Date 1", "Date 2", "Date 3", "Date 4", "Date 5", "Date 6", "Date 7", "Date 8"],
}) => {
  // Ensure exactly 8 headers
  const columns8 = Array.from({ length: 8 }).map((_, i) => examHeaders[i] || `Exam ${i + 1}`);

  // Filter target rooms
  const activeRooms =
    targetRoomId === "ALL"
      ? rooms
      : rooms.filter((r) => r.roomId === targetRoomId);

  return (
    <div className="ems-print-attendance-wrapper w-full bg-white text-neutral-950 font-sans print:p-0 print:m-0">
      {activeRooms.map((room, roomIdx) => {
        // Extract occupied seats for this room
        const occupiedSeats = room.seats.filter((s) => !s.isVacant && s.studentName);

        // Group students by Class + Section
        const classMap = new Map<string, StudentRowItem[]>();
        occupiedSeats.forEach((s) => {
          const key = `${s.studentClass || "Class"}-${s.studentSection || "A"}`;
          if (!classMap.has(key)) {
            classMap.set(key, []);
          }
          classMap.get(key)!.push({
            roll: s.studentRoll || 1,
            name: s.studentName || "Student",
            studentClass: s.studentClass || "",
            section: s.studentSection || "",
          });
        });

        // Sort students within each class by roll
        classMap.forEach((list) => {
          list.sort((a, b) => a.roll - b.roll);
        });

        const classKeys = Array.from(classMap.keys());

        // Prepare rows for the single table
        type RowData =
          | { type: "header"; title: string }
          | { type: "student"; student: StudentRowItem; index: number }
          | { type: "empty" };

        const allRows: RowData[] = [];
        classKeys.forEach((key) => {
          allRows.push({ type: "header", title: `Class: ${key}` });
          const students = classMap.get(key) || [];
          students.forEach((s, i) => allRows.push({ type: "student", student: s, index: i }));
        });

        // Pad with empty rows if the room has very few students, just to make the table look complete
        if (allRows.length < 25) {
          const emptyCount = 25 - allRows.length;
          for (let i = 0; i < emptyCount; i++) {
            allRows.push({ type: "empty" });
          }
        }

        // Chunk rows into pages (max 28 rows per page to fit strictly within 292mm A4)
        const MAX_ROWS_PER_PAGE = 28;
        const pages: RowData[][] = [];
        for (let i = 0; i < allRows.length; i += MAX_ROWS_PER_PAGE) {
          pages.push(allRows.slice(i, i + MAX_ROWS_PER_PAGE));
        }

        return pages.map((pageRows, pageIdx) => {
          const isLastRoom = roomIdx === activeRooms.length - 1;
          const isLastPageOfRoom = pageIdx === pages.length - 1;
          const pageBreakAfter = isLastRoom && isLastPageOfRoom ? "auto" : "always";

          return (
            <div
              key={`attendance-room-${room.roomId}-page-${pageIdx}`}
              className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center"
            >
              {/* Visual Page Counter in Screen Preview */}
              <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
                <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                  Room {roomIdx + 1} of {activeRooms.length}
                  {pages.length > 1 ? ` (Page ${pageIdx + 1}/${pages.length})` : ""}
                </span>
                <span>•</span>
                <span>
                  Room {room.roomNumber} ({room.occupiedSeats} Students Allocated)
                </span>
              </div>

              <div
                className="ems-attendance-sheet w-[210mm] h-[278mm] max-h-[278mm] mx-auto p-[2mm_4mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
              >
                {/* Subtle Large School Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                  <img
                    src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                    alt="School Logo Watermark"
                    loading="eager"
                    decoding="async"
                    className="w-96 h-96 object-contain opacity-[0.06] grayscale select-none print:filter-none print:opacity-[0.05]"
                  />
                </div>

                {/* Outer Heavy Border matching West Bengal School Registers */}
                <div className="relative z-10 border-[1.8px] border-black h-full flex flex-col justify-between text-neutral-950 p-[1.5mm]">
                  {/* TOP HEADER SECTION */}
                  <div className="border-b-[1.5px] border-black pb-1 mb-1">
                    {/* School Name, Crest Logo & Room Box */}
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-2 flex items-center space-x-1.5 pl-0.5">
                        <img
                          src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                          alt="School Crest"
                          className="w-10 h-10 object-contain shrink-0"
                        />
                        <div className="leading-tight">
                          <span className="text-[8.5px] font-black text-black uppercase tracking-wider block">
                            EMS REG
                          </span>
                          <span className="text-[7.5px] font-mono font-bold text-neutral-600 block">
                            PG {roomIdx + 1}
                            {pages.length > 1 ? `-${pageIdx + 1}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-8 text-center">
                        <h2 className="text-[17px] font-black uppercase tracking-wider text-black leading-tight">
                          {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
                        </h2>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-800 mt-1">
                          STUDENT EXAM ATTENDANCE & SCRIPT REGISTER
                        </p>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="inline-block border-[1.5px] border-black px-3 py-1 rounded-[1px] bg-neutral-50 text-center min-w-[80px]">
                          <span className="text-[11px] font-black uppercase text-black block tracking-wide">
                            {room.roomNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Header Row: Center Exam Title */}
                    <div className="grid grid-cols-12 border-t-[1.2px] border-black mt-1.5 pt-1.5 text-[10px] font-bold items-center">
                      <div className="col-span-12 text-center truncate">
                        <span className="text-black font-extrabold tracking-wide uppercase">
                          {examType} - {academicYear}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SINGLE WIDE REGISTER TABLE */}
                  <div className="flex flex-col h-full flex-1 min-h-0 mt-1">
                    <table className="w-full border-collapse border-[1.5px] border-black text-[9px] table-fixed h-full">
                      <thead>
                        <tr className="bg-neutral-100/90 border-b-[1.2px] border-black">
                          <th
                            rowSpan={2}
                            className="border-r-[1.5px] border-black w-[45px] text-center font-black p-1.5 text-[9px]"
                          >
                            Roll
                          </th>
                          <th
                            rowSpan={2}
                            className="border-r-[1.5px] border-black w-[280px] text-left font-black p-1.5 pl-3 text-[9px] truncate"
                          >
                            Student Name
                          </th>
                          {/* 8 Exam Columns - Subject Names */}
                          {columns8.map((headerText, i) => (
                            <th
                              key={`th-subject-${i}`}
                              className="border-r border-black font-black text-center p-1 text-[8.5px] overflow-hidden leading-tight truncate uppercase tracking-wider text-black"
                              style={{ width: "calc((100% - 325px) / 8)" }}
                            >
                              {headerText}
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-white border-b-[1.5px] border-black">
                          {/* 8 Exam Columns - Date Row */}
                          {columns8.map((_, i) => (
                            <th
                              key={`th-date-${i}`}
                              className="border-r border-black font-semibold text-center px-0.5 py-0.5 text-[8.5px] text-neutral-700 h-[6mm] select-none"
                            >
                              <span className="font-mono tracking-widest">&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="flex-1">
                        {pageRows.map((row, idx) => {
                          if (row.type === "header") {
                            return (
                              <tr
                                key={`row-${idx}`}
                                className="border-b-[1.2px] border-black bg-neutral-200/60"
                                style={{ height: "7mm" }}
                              >
                                <td
                                  colSpan={10}
                                  className="text-center font-black text-[10.5px] uppercase tracking-widest text-black"
                                >
                                  {row.title}
                                </td>
                              </tr>
                            );
                          }

                          const isStudent = row.type === "student";

                          return (
                            <tr
                              key={`row-${idx}`}
                              className="border-b border-black/80 hover:bg-neutral-50/50"
                              style={{ height: "6.5mm" }}
                            >
                              <td className="border-r-[1.5px] border-black text-center font-bold text-[10px] p-0">
                                {isStudent ? String(row.student.roll).padStart(2, "0") : ""}
                              </td>
                              <td className="border-r-[1.5px] border-black px-3 font-extrabold text-[10px] uppercase truncate text-neutral-950">
                                {isStudent ? row.student.name : ""}
                              </td>
                              {/* 8 Signature/Script Boxes */}
                              {columns8.map((_, colI) => (
                                <td
                                  key={`cell-${idx}-${colI}`}
                                  className="border-r border-black/70 text-center p-0"
                                />
                              ))}
                            </tr>
                          );
                        })}

                        {/* Fill remaining vertical space if needed */}
                        <tr className="border-0">
                          <td colSpan={10} className="border-0 p-0"></td>
                        </tr>

                        {/* Footer Row 1: Total Present */}
                        <tr className="border-t-[1.5px] border-black bg-neutral-50 font-bold" style={{ height: "7.5mm" }}>
                          <td
                            colSpan={2}
                            className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[9px]"
                          >
                            Total Present
                          </td>
                          {columns8.map((_, colI) => (
                            <td key={`total-${colI}`} className="border-r border-black text-center p-0" />
                          ))}
                        </tr>

                        {/* Footer Row 2: Invigilator Signature */}
                        <tr className="border-t border-black bg-neutral-50 font-bold" style={{ height: "8.5mm" }}>
                          <td
                            colSpan={2}
                            className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[8.5px]"
                          >
                            Invigilator Sign
                          </td>
                          {columns8.map((_, colI) => (
                            <td key={`sign-${colI}`} className="border-r border-black text-center p-0" />
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* REGISTER FOOTER */}
                <div className="border-t-[1.5px] border-black pt-1.5 mt-1.5 flex items-center justify-between text-[8px] font-bold text-neutral-700">
                  <span>
                    Room: <strong className="text-black text-[9px]">{room.roomNumber}</strong> • Total Capacity: <strong>{room.totalSeats}</strong> • Allocated: <strong>{room.occupiedSeats}</strong>
                  </span>
                  <span className="uppercase tracking-wider text-black">
                    Marigachi High School Examination Control Department
                  </span>
                  <span>
                    Headmaster / Centre In-Charge Sign: __________________
                  </span>
                </div>
              </div>
            </div>
          );
        });
      })}
    </div>
  );
};
