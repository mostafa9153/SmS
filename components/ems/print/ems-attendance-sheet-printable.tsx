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

        let leftClassTitle = "";
        let leftStudents: StudentRowItem[] = [];
        let rightClassTitle = "";
        let rightStudents: StudentRowItem[] = [];

        if (classKeys.length >= 2) {
          // 2 or more classes: Left table gets Class 1, Right table gets Class 2
          leftClassTitle = `Class - ${classKeys[0]}`;
          leftStudents = classMap.get(classKeys[0]) || [];

          rightClassTitle = `Class - ${classKeys[1]}`;
          rightStudents = classMap.get(classKeys[1]) || [];
        } else if (classKeys.length === 1) {
          // 1 class: Split students between Left and Right tables
          const allInClass = classMap.get(classKeys[0]) || [];
          const mid = Math.ceil(allInClass.length / 2);
          leftClassTitle = `Class - ${classKeys[0]} (Part 1)`;
          leftStudents = allInClass.slice(0, mid);

          rightClassTitle = `Class - ${classKeys[0]} (Part 2)`;
          rightStudents = allInClass.slice(mid);
        } else {
          // Empty room
          leftClassTitle = "Class - A";
          rightClassTitle = "Class - B";
        }

        // Determine number of rows to render (minimum 20, max 35-40 for A4 single page fit)
        const rowCount = Math.max(20, Math.min(35, Math.max(leftStudents.length, rightStudents.length)));

        return (
          <div key={`attendance-room-wrap-${room.roomId}-${roomIdx}`} className="mb-8 last:mb-0 print:mb-0 flex flex-col items-center">
            {/* Visual Page Counter in Screen Preview */}
            <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
              <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                Page {roomIdx + 1} of {activeRooms.length}
              </span>
              <span>•</span>
              <span>Room {room.roomNumber} ({room.occupiedSeats} Students Allocated)</span>
            </div>

            <div
              className="ems-attendance-sheet w-[210mm] h-[295mm] max-h-[295mm] mx-auto p-[4mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
              style={{
                pageBreakAfter: roomIdx < activeRooms.length - 1 ? "always" : "auto",
                breakAfter: roomIdx < activeRooms.length - 1 ? "page" : "auto",
              }}
            >
              {/* Subtle Large School Logo Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                <img
                  src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                  alt="School Logo Watermark"
                  className="w-80 h-80 object-contain opacity-[0.06] grayscale select-none"
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
                        className="w-8 h-8 object-contain shrink-0"
                      />
                      <div className="leading-tight">
                        <span className="text-[7.5px] font-black text-black uppercase tracking-wider block">
                          EMS REG
                        </span>
                        <span className="text-[6.5px] font-mono font-bold text-neutral-600 block">
                          PG {roomIdx + 1}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-8 text-center">
                      <h2 className="text-[14px] font-black uppercase tracking-wider text-black leading-tight">
                        {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
                      </h2>
                    <p className="text-[8px] font-bold uppercase tracking-wide text-neutral-800 mt-0.5">
                      STUDENT EXAM ATTENDANCE & SCRIPT REGISTER
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="inline-block border-[1.5px] border-black px-2 py-0.5 rounded-[1px] bg-neutral-50 text-center min-w-[70px]">
                      <span className="text-[9px] font-black uppercase text-black block tracking-wide">
                        {room.roomNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-Header Row: Left Class | Center Exam Title | Right Class */}
                <div className="grid grid-cols-12 border-t-[1.2px] border-black mt-1 pt-1 text-[8.5px] font-bold items-center">
                  <div className="col-span-4 pl-1 truncate">
                    <span className="text-black font-extrabold">{leftClassTitle}</span>
                  </div>
                  <div className="col-span-4 text-center truncate">
                    <span className="text-black font-extrabold tracking-wide">
                      {examType} - {academicYear}
                    </span>
                  </div>
                  <div className="col-span-4 text-right pr-1 truncate">
                    <span className="text-black font-extrabold">{rightClassTitle}</span>
                  </div>
                </div>
              </div>

              {/* DUAL-COLUMN SIDE-BY-SIDE REGISTER TABLES */}
              <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
                {/* LEFT TABLE */}
                <div className="flex flex-col h-full">
                  <table className="w-full border-collapse border-[1.2px] border-black text-[7.5px] table-fixed">
                    <thead>
                      <tr className="bg-neutral-100/90 border-b-[1.2px] border-black">
                        <th className="border-r-[1.2px] border-black w-[20px] text-center font-black p-0.5 text-[7px]">
                          Roll
                        </th>
                        <th className="border-r-[1.2px] border-black w-[72px] text-left font-black p-0.5 text-[7px] truncate">
                          Student Name
                        </th>
                        {/* 8 Exam Columns */}
                        {columns8.map((headerText, i) => (
                          <th
                            key={`left-th-${i}`}
                            className="border-r border-black font-bold text-center p-0.5 text-[6px] overflow-hidden leading-tight"
                            style={{ width: "calc((100% - 92px) / 8)" }}
                          >
                            <div className="truncate font-black">{i + 1}</div>
                            <div className="text-[5.5px] font-normal truncate text-neutral-700">
                              {headerText}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rowCount }).map((_, idx) => {
                        const student = leftStudents[idx];
                        return (
                          <tr
                            key={`left-row-${idx}`}
                            className="border-b border-black/80 hover:bg-neutral-50/50"
                            style={{ height: rowCount > 25 ? "5.4mm" : "6.2mm" }}
                          >
                            <td className="border-r-[1.2px] border-black text-center font-bold text-[7.5px] p-0">
                              {student ? String(student.roll).padStart(2, "0") : idx + 1}
                            </td>
                            <td className="border-r-[1.2px] border-black px-1 font-bold text-[7.5px] uppercase truncate text-neutral-950">
                              {student ? student.name : ""}
                            </td>
                            {/* 8 Signature/Script Boxes */}
                            {columns8.map((_, colI) => (
                              <td
                                key={`left-cell-${idx}-${colI}`}
                                className="border-r border-black/70 text-center p-0"
                              />
                            ))}
                          </tr>
                        );
                      })}

                      {/* Footer Row 1: Total Present */}
                      <tr className="border-t-[1.4px] border-black bg-neutral-50 font-bold" style={{ height: "6mm" }}>
                        <td
                          colSpan={2}
                          className="border-r-[1.2px] border-black px-1 text-right font-black uppercase text-[7px]"
                        >
                          Total Present
                        </td>
                        {columns8.map((_, colI) => (
                          <td key={`left-total-${colI}`} className="border-r border-black text-center p-0" />
                        ))}
                      </tr>

                      {/* Footer Row 2: Invigilator Signature */}
                      <tr className="border-t border-black bg-neutral-50 font-bold" style={{ height: "7mm" }}>
                        <td
                          colSpan={2}
                          className="border-r-[1.2px] border-black px-1 text-right font-black uppercase text-[6.5px]"
                        >
                          Invigilator Sign
                        </td>
                        {columns8.map((_, colI) => (
                          <td key={`left-sign-${colI}`} className="border-r border-black text-center p-0" />
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* RIGHT TABLE */}
                <div className="flex flex-col h-full">
                  <table className="w-full border-collapse border-[1.2px] border-black text-[7.5px] table-fixed">
                    <thead>
                      <tr className="bg-neutral-100/90 border-b-[1.2px] border-black">
                        <th className="border-r-[1.2px] border-black w-[20px] text-center font-black p-0.5 text-[7px]">
                          Roll
                        </th>
                        <th className="border-r-[1.2px] border-black w-[72px] text-left font-black p-0.5 text-[7px] truncate">
                          Student Name
                        </th>
                        {/* 8 Exam Columns */}
                        {columns8.map((headerText, i) => (
                          <th
                            key={`right-th-${i}`}
                            className="border-r border-black font-bold text-center p-0.5 text-[6px] overflow-hidden leading-tight"
                            style={{ width: "calc((100% - 92px) / 8)" }}
                          >
                            <div className="truncate font-black">{i + 1}</div>
                            <div className="text-[5.5px] font-normal truncate text-neutral-700">
                              {headerText}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rowCount }).map((_, idx) => {
                        const student = rightStudents[idx];
                        return (
                          <tr
                            key={`right-row-${idx}`}
                            className="border-b border-black/80 hover:bg-neutral-50/50"
                            style={{ height: rowCount > 25 ? "5.4mm" : "6.2mm" }}
                          >
                            <td className="border-r-[1.2px] border-black text-center font-bold text-[7.5px] p-0">
                              {student ? String(student.roll).padStart(2, "0") : idx + 1}
                            </td>
                            <td className="border-r-[1.2px] border-black px-1 font-bold text-[7.5px] uppercase truncate text-neutral-950">
                              {student ? student.name : ""}
                            </td>
                            {/* 8 Signature/Script Boxes */}
                            {columns8.map((_, colI) => (
                              <td
                                key={`right-cell-${idx}-${colI}`}
                                className="border-r border-black/70 text-center p-0"
                              />
                            ))}
                          </tr>
                        );
                      })}

                      {/* Footer Row 1: Total Present */}
                      <tr className="border-t-[1.4px] border-black bg-neutral-50 font-bold" style={{ height: "6mm" }}>
                        <td
                          colSpan={2}
                          className="border-r-[1.2px] border-black px-1 text-right font-black uppercase text-[7px]"
                        >
                          Total Present
                        </td>
                        {columns8.map((_, colI) => (
                          <td key={`right-total-${colI}`} className="border-r border-black text-center p-0" />
                        ))}
                      </tr>

                      {/* Footer Row 2: Invigilator Signature */}
                      <tr className="border-t border-black bg-neutral-50 font-bold" style={{ height: "7mm" }}>
                        <td
                          colSpan={2}
                          className="border-r-[1.2px] border-black px-1 text-right font-black uppercase text-[6.5px]"
                        >
                          Invigilator Sign
                        </td>
                        {columns8.map((_, colI) => (
                          <td key={`right-sign-${colI}`} className="border-r border-black text-center p-0" />
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REGISTER FOOTER */}
              <div className="border-t-[1.2px] border-black pt-1 mt-1 flex items-center justify-between text-[7px] font-bold text-neutral-700">
                <span>
                  Room: <strong>{room.roomNumber}</strong> • Total Capacity: <strong>{room.totalSeats}</strong> • Allocated: <strong>{room.occupiedSeats}</strong>
                </span>
                <span className="uppercase tracking-wider">
                  Marigachi High School Examination Control Department
                </span>
                <span>
                  Headmaster / Centre In-Charge Sign: __________________
                </span>
              </div>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};
