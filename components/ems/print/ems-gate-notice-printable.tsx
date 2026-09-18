"use client";

import React from "react";
import { AllocatedRoom, SeatAssignment } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import { cleanColumnLabel } from "@/lib/ems/room-storage";

export interface EmsGateNoticePrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
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
        const cleanRoom = room.roomNumber.replace(/^Room\s*/i, "").trim();
        const displayRoom = cleanRoom ? `Room ${cleanRoom}` : "Room";

        // Group seats by column and bench for 2D floor blueprint
        const columnData = room.columns.map((colConfig) => {
          const colSeats = room.seats.filter(
            (s) => s.columnIndex === colConfig.columnIndex
          );
          const benches: { benchIndex: number; seats: SeatAssignment[] }[] = [];

          for (let b = 1; b <= colConfig.benchCount; b++) {
            const benchSeats = colSeats
              .filter((s) => s.benchIndex === b)
              .sort((a, b) => a.seatPosition - b.seatPosition);
            benches.push({ benchIndex: b, seats: benchSeats });
          }

          return {
            config: colConfig,
            benches,
          };
        });

        // Group students by Class + Section to summarize roll ranges
        const occupiedSeats = room.seats.filter(
          (s) => !s.isVacant && s.studentName
        );
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

        const isLastRoom = roomIdx === activeRooms.length - 1;
        const pageBreakAfter = isLastRoom ? "auto" : "always";

        return (
          <div
            key={`gate-notice-room-${room.roomId}`}
            className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center"
            style={{ pageBreakAfter }}
          >
            {/* Screen Preview Room/Page Pill */}
            <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
              <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                Gate Notice (2D Blueprint): {displayRoom} ({roomIdx + 1} of {activeRooms.length})
              </span>
              <span>•</span>
              <span>{room.occupiedSeats} Candidates Allocated</span>
            </div>

            <div className="ems-gate-notice-sheet w-[210mm] h-[287mm] max-h-[287mm] mx-auto p-[2mm_3.5mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0">
              {/* School Logo Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                <img
                  src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                  alt="School Logo Watermark"
                  loading="eager"
                  decoding="async"
                  className="w-96 h-96 object-contain opacity-[0.05] grayscale select-none print:filter-none print:opacity-[0.04]"
                />
              </div>

              {/* Double Outer Perimeter Border */}
              <div className="relative z-10 border-[1.8px] border-black h-full flex flex-col justify-between p-[1.5mm] text-neutral-950">
                {/* TOP HEADER SECTION */}
                <div className="border-b-[1.5px] border-black pb-1 mb-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                        alt="School Crest"
                        className="w-10 h-10 object-contain shrink-0"
                      />
                      <div>
                        <h1 className="text-[15px] font-black tracking-tight uppercase text-black leading-tight">
                          {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
                        </h1>
                        <p className="text-[8.5px] text-neutral-700 font-bold tracking-tight">
                          {schoolProfile.schoolAddress || "Institutional Examination Board"}
                          {schoolProfile.schoolPhone ? ` • Tel: ${schoolProfile.schoolPhone}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block bg-black text-white px-2 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-[2px]">
                        2D SEATING BLUEPRINT • GATE NOTICE
                      </span>
                      <p className="text-[8px] font-mono font-bold text-neutral-800 mt-0.5">
                        AY {academicYear} • {examType}
                      </p>
                    </div>
                  </div>

                  {/* Room & Floor Banner */}
                  <div className="mt-1 bg-neutral-100 border border-black/80 rounded-[2px] px-2 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-black text-white px-2 py-0.5 text-[11px] font-black tracking-wider rounded-[2px]">
                        {displayRoom.toUpperCase()}
                      </div>
                      <span className="text-[9.5px] font-bold text-neutral-800">
                        {room.floor ? `${room.floor} Floor` : "Main Floor"}
                        {room.building ? ` • ${room.building}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[9px] font-bold text-neutral-800">
                      <span>
                        Total Capacity: <strong className="text-black font-mono">{room.totalSeats}</strong>
                      </span>
                      <span className="text-neutral-400">•</span>
                      <span>
                        Allocated: <strong className="text-black font-mono">{room.occupiedSeats}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Allocated Classes Summary Pills */}
                  {classSummaries.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[8.5px]">
                      <span className="font-black text-neutral-700 uppercase tracking-wide">
                        Allocated:
                      </span>
                      {classSummaries.map((cs) => (
                        <span
                          key={cs.classKey}
                          className="bg-neutral-200/90 border border-neutral-400 text-black px-1.5 py-0.2 rounded-[2px] font-bold"
                        >
                          Class {cs.classKey} ({cs.rollRange} • {cs.count} Students)
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2D VISUAL ROOM BLUEPRINT / FLOOR PLAN */}
                <div className="flex-1 flex flex-col justify-between overflow-hidden my-0.5 bg-neutral-50/40 border border-neutral-300 rounded-[2px] p-1">
                  {/* COLUMNS & BENCHES GRID */}
                  <div className="flex-1 flex flex-row justify-center items-stretch gap-1 overflow-hidden py-0.5">
                    {columnData.map((col, cIdx) => (
                      <React.Fragment key={col.config.columnIndex}>
                        {/* Column Container */}
                        <div className="flex-1 flex flex-col items-stretch min-w-0 border border-neutral-400 bg-white rounded-[2px] p-1 shadow-2xs">
                          {/* Column Header */}
                          <div className="text-center py-1 px-1 bg-neutral-200 border-b border-neutral-400 rounded-[1px] mb-1">
                            <span className="text-[12px] font-black text-neutral-950 uppercase tracking-wider truncate block leading-none">
                              {cleanColumnLabel(col.config.columnLabel, col.config.columnIndex)}
                            </span>
                          </div>

                          {/* Benches Stack */}
                          <div className="flex-1 flex flex-col justify-between gap-1">
                            {col.benches.map((bench) => (
                              <div
                                key={bench.benchIndex}
                                className="border border-neutral-400 bg-neutral-50 rounded-[2px] p-0.5 flex flex-col justify-between shadow-2xs"
                              >
                                {/* Bench Desk Header Bar */}
                                <div className="h-2 rounded-t-[1px] bg-neutral-900 mb-0.5 flex items-center justify-between px-1.5">
                                  <span className="text-[7.5px] font-mono font-black text-neutral-100 uppercase">
                                    BENCH-{bench.benchIndex}
                                  </span>
                                  <span className="text-[7.5px] font-mono font-bold text-neutral-300 uppercase">
                                    DESK
                                  </span>
                                </div>

                                {/* Seats on this Bench */}
                                <div className="grid grid-cols-3 gap-0.5">
                                  {bench.seats.map((seat) => {
                                    if (seat.isVacant || !seat.studentName) {
                                      return (
                                        <div
                                          key={seat.seatId}
                                          className="border border-dashed border-neutral-300 rounded-[1px] p-1 flex flex-col items-center justify-center bg-white/70 min-h-[16mm]"
                                        >
                                          <span className="text-[11px] font-mono font-black text-neutral-400">
                                            S{seat.seatPosition}
                                          </span>
                                          <span className="text-[9.5px] font-bold text-neutral-300 uppercase">
                                            VACANT
                                          </span>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={seat.seatId}
                                        className="border border-neutral-400 bg-white rounded-[1px] p-1 flex flex-col justify-between overflow-hidden shadow-2xs min-h-[16mm]"
                                      >
                                        {/* Roll & Seat Pos (75% Larger) */}
                                        <div className="flex items-center justify-between leading-none border-b border-neutral-200 pb-0.5">
                                          <span className="text-[16px] font-black text-neutral-950 font-mono tracking-tight leading-none">
                                            R-{String(seat.studentRoll).padStart(2, "0")}
                                          </span>
                                          <span className="text-[11.5px] font-black bg-neutral-100 border border-neutral-400 px-1 py-0.2 rounded-[1px] text-neutral-950 leading-none">
                                            S{seat.seatPosition}
                                          </span>
                                        </div>

                                        {/* Student Name (75% Larger) */}
                                        <div className="py-0.5 truncate leading-tight">
                                          <span className="text-[13px] font-black uppercase text-neutral-950 truncate block tracking-tight leading-tight">
                                            {seat.studentName}
                                          </span>
                                        </div>

                                        {/* Class & Section (75% Larger) */}
                                        <div className="leading-none pt-0.5 border-t border-neutral-100 flex items-center justify-between text-[11px] font-bold text-neutral-700">
                                          <span className="truncate">
                                            Cl: <strong className="font-black text-neutral-950 text-[12px]">{seat.studentClass}-{seat.studentSection}</strong>
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Ultra-narrow Aisle Divider between columns */}
                        {cIdx < columnData.length - 1 && (
                          <div className="flex flex-col items-center justify-center px-0.5 shrink-0 select-none">
                            <div className="h-full w-px border-r border-dashed border-neutral-400" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* BOTTOM FOOTER: INSTRUCTIONS & SIGNATURES */}
                <div className="border-t-[1.5px] border-black pt-1 mt-0.5">
                  <div className="flex items-center justify-between text-[7.5px] text-neutral-700 font-bold bg-neutral-50 border border-neutral-300 p-0.5 rounded-[1px] mb-1">
                    <span>• Candidates must locate their exact Room, Column, Bench & Seat before entering.</span>
                    <span>• Report any seating discrepancy to Exam Controller.</span>
                  </div>

                  <div className="flex items-end justify-between px-2 pt-0.5 text-[8px] font-bold">
                    <div className="text-center">
                      <div className="w-28 border-b border-black/60 mb-0.5"></div>
                      <span className="uppercase text-neutral-700">Exam Hall In-Charge</span>
                    </div>

                    <div className="text-center">
                      <div className="w-28 border-b border-black/60 mb-0.5"></div>
                      <span className="uppercase text-neutral-700">Center Superintendent</span>
                    </div>

                    <div className="text-center">
                      <div className="w-28 border-b border-black/60 mb-0.5"></div>
                      <span className="uppercase text-neutral-700">Headmaster / Principal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
