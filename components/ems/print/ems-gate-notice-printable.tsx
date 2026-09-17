"use client";

import React from "react";
import { AllocatedRoom, SeatAssignment } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";

export interface EmsGateNoticePrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
}

interface StudentGateItem {
  sl: number;
  studentName: string;
  studentRoll: number;
  studentClass: string;
  studentSection: string;
  schoolId?: string;
  columnIndex: number;
  benchIndex: number;
  seatPosition: number;
  globalSeatNumber: number;
  seatId: string;
}

export const EmsGateNoticePrintable: React.FC<EmsGateNoticePrintableProps> = ({
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

  return (
    <div className="ems-print-gate-notice-wrapper w-full bg-white text-neutral-950 font-sans print:p-0 print:m-0">
      {activeRooms.map((room, roomIdx) => {
        // Collect all occupied seats for this room, ordered logically by physical seat position
        const occupiedSeats = room.seats
          .filter((s) => !s.isVacant && s.studentName)
          .sort((a, b) => {
            if (a.columnIndex !== b.columnIndex) return a.columnIndex - b.columnIndex;
            if (a.benchIndex !== b.benchIndex) return a.benchIndex - b.benchIndex;
            return a.seatPosition - b.seatPosition;
          });

        // Group students by Class + Section to summarize roll ranges
        const classSummaryMap = new Map<string, number[]>();
        occupiedSeats.forEach((s) => {
          const key = `${s.studentClass || "Class"}-${s.studentSection || "A"}`;
          if (!classSummaryMap.has(key)) {
            classSummaryMap.set(key, []);
          }
          classSummaryMap.get(key)!.push(Number(s.studentRoll) || 0);
        });

        const classSummaries: { classKey: string; count: number; rollRange: string }[] = [];
        classSummaryMap.forEach((rolls, key) => {
          rolls.sort((a, b) => a - b);
          const min = rolls[0] || 1;
          const max = rolls[rolls.length - 1] || rolls.length;
          classSummaries.push({
            classKey: key,
            count: rolls.length,
            rollRange: rolls.length === 1 ? `Roll ${min}` : `Roll ${min} – ${max}`,
          });
        });

        const studentRows: StudentGateItem[] = occupiedSeats.map((s, idx) => ({
          sl: idx + 1,
          studentName: s.studentName || "Student",
          studentRoll: Number(s.studentRoll) || 1,
          studentClass: s.studentClass || "V",
          studentSection: s.studentSection || "A",
          schoolId: s.schoolId,
          columnIndex: s.columnIndex,
          benchIndex: s.benchIndex,
          seatPosition: s.seatPosition,
          globalSeatNumber: s.globalSeatNumber,
          seatId: s.seatId,
        }));

        // Max 26 student rows per A4 page to leave ample room for headers and instructions
        const ROWS_PER_PAGE = 26;
        const pages: StudentGateItem[][] = [];
        if (studentRows.length === 0) {
          pages.push([]);
        } else {
          for (let i = 0; i < studentRows.length; i += ROWS_PER_PAGE) {
            pages.push(studentRows.slice(i, i + ROWS_PER_PAGE));
          }
        }

        return pages.map((pageStudents, pageIdx) => {
          const isLastRoom = roomIdx === activeRooms.length - 1;
          const isLastPageOfRoom = pageIdx === pages.length - 1;
          const pageBreakAfter = isLastRoom && isLastPageOfRoom ? "auto" : "always";

          return (
            <div
              key={`gate-notice-room-${room.roomId}-page-${pageIdx}`}
              className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center"
              style={{ pageBreakAfter }}
            >
              {/* Screen Preview Room/Page Pill */}
              <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
                <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                  Gate Notice: Room {room.roomNumber} (Page {pageIdx + 1}/{pages.length})
                </span>
                <span>•</span>
                <span>{room.occupiedSeats} Candidates Total</span>
              </div>

              <div className="ems-gate-notice-sheet w-[210mm] h-[278mm] max-h-[278mm] mx-auto p-[2.5mm_4mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0">
                {/* School Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                  <img
                    src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                    alt="School Logo Watermark"
                    loading="eager"
                    decoding="async"
                    className="w-96 h-96 object-contain opacity-[0.05] grayscale select-none print:filter-none print:opacity-[0.05]"
                  />
                </div>

                {/* Double Outer Perimeter Border */}
                <div className="relative z-10 border-[2px] border-black h-full flex flex-col justify-between p-[2mm] text-neutral-950">
                  {/* TOP HEADER SECTION */}
                  <div className="border-b-[1.5px] border-black pb-1.5 mb-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                          alt="School Crest"
                          className="w-11 h-11 object-contain shrink-0"
                        />
                        <div>
                          <h1 className="text-sm font-black tracking-tight uppercase text-black leading-tight">
                            {schoolProfile.schoolName || "HIGH SCHOOL EXAMINATION CENTER"}
                          </h1>
                          <p className="text-[9px] text-neutral-700 font-medium">
                            {schoolProfile.schoolAddress || "Institutional Examination Board"}
                            {schoolProfile.schoolPhone ? ` • Tel: ${schoolProfile.schoolPhone}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block bg-black text-white px-2 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-xs">
                          GATE NOTICE
                        </span>
                        <p className="text-[8px] font-mono text-neutral-600 mt-0.5">
                          AY {academicYear} • {examType}
                        </p>
                      </div>
                    </div>

                    {/* Room & Floor Banner */}
                    <div className="mt-1.5 bg-neutral-100 border border-black/80 rounded-sm p-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-black text-white px-2 py-0.5 text-xs font-black tracking-wider rounded-xs">
                          ROOM: {room.roomNumber}
                        </div>
                        <span className="text-[10px] font-bold text-neutral-800">
                          {room.floor ? `${room.floor} Floor` : "Main Floor"}
                          {room.building ? ` • ${room.building}` : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[9.5px]">
                        <span className="font-semibold text-neutral-700">
                          Total Candidates: <strong className="text-black font-mono">{room.occupiedSeats}</strong>
                        </span>
                        <span className="text-neutral-400">•</span>
                        <span className="font-semibold text-neutral-700">
                          Page {pageIdx + 1} of {pages.length}
                        </span>
                      </div>
                    </div>

                    {/* Class & Roll Summary Pills */}
                    {classSummaries.length > 0 && pageIdx === 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px]">
                        <span className="font-bold text-neutral-600 uppercase tracking-wide">
                          Allocated Classes:
                        </span>
                        {classSummaries.map((cs) => (
                          <span
                            key={cs.classKey}
                            className="bg-neutral-200/90 border border-neutral-400 text-black px-1.5 py-0.2 rounded-xs font-semibold"
                          >
                            Class {cs.classKey} ({cs.rollRange} • {cs.count} Students)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* TABLE OF SEATED CANDIDATES */}
                  <div className="flex-1 overflow-hidden">
                    <table className="w-full text-left border-collapse border border-black text-[9px]">
                      <thead>
                        <tr className="bg-neutral-200/90 text-black border-b border-black font-bold uppercase text-[8.5px]">
                          <th className="p-1 border-r border-black w-8 text-center">#</th>
                          <th className="p-1 border-r border-black w-20 text-center">Desk / Seat</th>
                          <th className="p-1 border-r border-black w-18 text-center">Roll No</th>
                          <th className="p-1 border-r border-black w-24">Class & Sec</th>
                          <th className="p-1 border-r border-black">Candidate Name</th>
                          <th className="p-1 border-r border-black w-24">Student / Reg ID</th>
                          <th className="p-1 w-24 text-center">Invigilator Check</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageStudents.map((st) => (
                          <tr
                            key={st.seatId}
                            className="border-b border-black/40 hover:bg-neutral-50 h-[6.8mm] font-medium"
                          >
                            <td className="p-0.5 border-r border-black text-center font-mono text-[8.5px]">
                              {st.sl}
                            </td>
                            <td className="p-0.5 border-r border-black text-center font-mono font-bold text-[8.5px]">
                              C{st.columnIndex} • B{st.benchIndex} • S{st.seatPosition}
                            </td>
                            <td className="p-0.5 border-r border-black text-center font-mono font-black text-[9.5px]">
                              {st.studentRoll}
                            </td>
                            <td className="p-0.5 border-r border-black font-semibold text-[8.5px]">
                              Class {st.studentClass}-{st.studentSection}
                            </td>
                            <td className="p-0.5 border-r border-black font-bold uppercase truncate max-w-[140px]">
                              {st.studentName}
                            </td>
                            <td className="p-0.5 border-r border-black font-mono text-[8px] text-neutral-600 truncate max-w-[90px]">
                              {st.schoolId || "—"}
                            </td>
                            <td className="p-0.5 text-center text-[7.5px] text-neutral-400">
                              [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]
                            </td>
                          </tr>
                        ))}

                        {/* Blank rows filler if room has fewer than 20 students to keep format neat */}
                        {pageStudents.length < 18 && (
                          Array.from({ length: 18 - pageStudents.length }).map((_, bIdx) => (
                            <tr key={`blank-${bIdx}`} className="border-b border-black/20 h-[6.8mm]">
                              <td className="border-r border-black text-center text-neutral-300 font-mono text-[8px]">
                                {pageStudents.length + bIdx + 1}
                              </td>
                              <td className="border-r border-black"></td>
                              <td className="border-r border-black"></td>
                              <td className="border-r border-black"></td>
                              <td className="border-r border-black"></td>
                              <td className="border-r border-black"></td>
                              <td></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* BOTTOM FOOTER: INSTRUCTIONS & SIGNATURES */}
                  <div className="mt-1 pt-1 border-t-[1.5px] border-black">
                    {/* Rules snippet */}
                    <div className="bg-neutral-50 border border-neutral-300 p-1 rounded-xs mb-1.5 text-[7.5px] text-neutral-700 leading-tight">
                      <strong>Important Notice to Candidates:</strong> Check your Roll Number and Seat Position before entering the hall. Occupy designated seats at least 15 minutes prior to commencement. Mobile phones and books are strictly prohibited.
                    </div>

                    <div className="flex items-end justify-between px-3 pt-1 text-[8.5px] font-bold">
                      <div className="text-center">
                        <div className="w-32 border-b border-black/60 mb-0.5"></div>
                        <span className="uppercase text-neutral-700">Exam Hall In-Charge</span>
                      </div>

                      <div className="text-center">
                        <div className="w-32 border-b border-black/60 mb-0.5"></div>
                        <span className="uppercase text-neutral-700">Center Superintendent</span>
                      </div>

                      <div className="text-center">
                        <div className="w-32 border-b border-black/60 mb-0.5"></div>
                        <span className="uppercase text-neutral-700">Headmaster / Principal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        });
      })}
    </div>
  );
};
