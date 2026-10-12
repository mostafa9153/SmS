"use client";

import React from "react";
import { AllocatedRoom } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import { isHigherSecondaryClass, toShortStream } from "@/lib/ems/seat-arrangement-algorithm";
import { formatRoomName, getClassNumericRank, getDatabaseSubjectsForClass } from "@/lib/ems/ems-config-loader";

export interface ClassSubjectConfig {
  headers: string[];
  dates: string[];
}

export interface EmsAttendanceSheetPrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  examHalf?: "1st Half" | "2nd Half";
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
  examHeaders?: string[]; // Fallback array of strings for Subjects
  examDates?: string[]; // Fallback array of strings for Exam dates
  classSubjectsMap?: Record<string, ClassSubjectConfig>; // Specific subjects and dates per class!
  layoutMode?: string; // Kept for interface backward compatibility
}

interface StudentRowItem {
  roll: number;
  name: string;
  studentClass: string;
  section: string;
  regNo?: string;
  stream?: string;
  isHs: boolean;
}

interface PageClassChunk {
  classKey: string;
  cleanClass: string;
  isHs: boolean;
  students: StudentRowItem[];
  subjects: string[];
  dates: string[];
  isLastChunkOfClass: boolean;
  isFirstChunkOfClass: boolean;
}

export const EmsAttendanceSheetPrintable: React.FC<EmsAttendanceSheetPrintableProps> = ({
  rooms,
  academicYear,
  examType,
  examHalf,
  schoolProfile,
  targetRoomId = "ALL",
  examHeaders = ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biology"],
  examDates = [],
  classSubjectsMap = {},
}) => {
  // Global fallback clean headers
  const globalCleanHeaders = (examHeaders && examHeaders.length > 0)
    ? examHeaders.filter((h) => h !== undefined && h !== null && h.trim() !== "")
    : ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biology"];

  // Filter target rooms
  const activeRooms =
    targetRoomId === "ALL"
      ? rooms
      : rooms.filter((r) => r.roomId === targetRoomId);

  // Helper to resolve subjects and dates for a specific class
  const resolveClassSubjectsAndDates = (classStr: string) => {
    const cleanCls = (classStr || "VII")
      .trim()
      .toUpperCase()
      .replace(/^CLASS\s*[-_]?\s*/i, "")
      .split("-")[0]
      .trim();

    // Check direct key or clean class key in map
    const cfg = classSubjectsMap[cleanCls] || classSubjectsMap[classStr];
    if (cfg && Array.isArray(cfg.headers) && cfg.headers.length > 0) {
      return {
        subjects: cfg.headers.filter(Boolean),
        dates: cfg.dates || [],
      };
    }

    // Fallback from database presets
    const dbSubs = getDatabaseSubjectsForClass(cleanCls, [], false);
    if (dbSubs && dbSubs.length > 0) {
      return {
        subjects: dbSubs,
        dates: Array(dbSubs.length).fill(""),
      };
    }

    return {
      subjects: globalCleanHeaders,
      dates: examDates,
    };
  };

  return (
    <div className="ems-print-attendance-wrapper w-full bg-white text-neutral-950 font-sans print:p-0 print:m-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: 210mm 297mm;
              margin: 0;
            }
          `,
        }}
      />
      {activeRooms.map((room, roomIdx) => {
        // Extract occupied seats for this room
        const occupiedSeats = room.seats.filter((s) => !s.isVacant && s.studentName);

        // Group students by Class + Section / Stream
        const classMap = new Map<string, StudentRowItem[]>();
        occupiedSeats.forEach((s) => {
          const isHs = isHigherSecondaryClass(s.studentClass);
          const streamText = s.studentStream || (s.studentSection ? toShortStream(s.studentSection) : "") || "Sci";
          const key = isHs
            ? `${s.studentClass || "XI"}${streamText ? ` - ${streamText}` : ""}`
            : `${s.studentClass || "Class"}${s.studentSection ? ` - ${s.studentSection}` : ""}`;

          if (!classMap.has(key)) {
            classMap.set(key, []);
          }
          classMap.get(key)!.push({
            roll: s.studentRoll !== undefined && s.studentRoll !== null ? s.studentRoll : 1,
            name: s.studentName || "Student",
            studentClass: s.studentClass || "",
            section: s.studentSection || "",
            regNo: s.studentRegNo,
            stream: streamText,
            isHs,
          });
        });

        // Sort students within each class: for HS by natural alphanumeric sort of Reg No, else by Roll
        classMap.forEach((list) => {
          if (list.length > 0 && list[0].isHs) {
            list.sort((a, b) => {
              const regA = (a.regNo || "").trim() || `${a.roll}`;
              const regB = (b.regNo || "").trim() || `${b.roll}`;
              return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
            });
          } else {
            list.sort((a, b) => (a.roll || 0) - (b.roll || 0));
          }
        });

        // Sort classKeys in grade sequence: V -> VI -> VII -> ... -> XI -> XII
        const classKeys = Array.from(classMap.keys()).sort((a, b) => {
          return getClassNumericRank(a) - getClassNumericRank(b) || a.localeCompare(b, undefined, { numeric: true });
        });
        const classLabel = classKeys.length > 0 ? `Class: ${classKeys.join(", ")}` : "";

        // Build list of classes with their full student lists and resolved subjects/dates
        interface ClassData {
          classKey: string;
          cleanClass: string;
          isHs: boolean;
          students: StudentRowItem[];
          subjects: string[];
          dates: string[];
        }

        const classDataList: ClassData[] = classKeys.map((key) => {
          const students = classMap.get(key) || [];
          const rawClass = students[0]?.studentClass || key;
          const cleanClass = rawClass.replace(/^CLASS\s*[-_]?\s*/i, "").split("-")[0].trim();
          const isHs = students.length > 0 && students[0].isHs;
          const { subjects, dates } = resolveClassSubjectsAndDates(rawClass);

          return {
            classKey: key,
            cleanClass,
            isHs,
            students,
            subjects,
            dates,
          };
        });

        // Chunk students into pages: Target 33 students per page
        // 33 rows at 7.15mm completely fill the page down to the footer, eliminating the bottom gap
        const TARGET_STUDENTS_PER_PAGE = 33;
        const pages: { chunks: PageClassChunk[] }[] = [];

        if (classDataList.length === 0) {
          pages.push({ chunks: [] });
        } else {
          let currentPageChunks: PageClassChunk[] = [];
          let currentSlotsUsed = 0; // Total vertical row-equivalent slots on current page (33 max)

          classDataList.forEach((clsData) => {
            let remainingStudents = [...clsData.students];
            let isFirstChunk = true;

            while (remainingStudents.length > 0) {
              // Table header overhead if this is a subsequent sub-table on the same page
              const extraHeaderSlots = currentPageChunks.length > 0 ? 2 : 0;
              const slotsAvailable = Math.max(0, TARGET_STUDENTS_PER_PAGE - currentSlotsUsed - extraHeaderSlots);

              // If page has very little remaining space (< 5 slots) and already has students, push to next page
              if (slotsAvailable < 5 && currentSlotsUsed > 0) {
                pages.push({ chunks: currentPageChunks });
                currentPageChunks = [];
                currentSlotsUsed = 0;
                continue;
              }

              const maxTake = Math.max(slotsAvailable, currentSlotsUsed === 0 ? TARGET_STUDENTS_PER_PAGE : 0);
              const takeCount = Math.min(remainingStudents.length, maxTake);
              const slice = remainingStudents.slice(0, takeCount);
              remainingStudents = remainingStudents.slice(takeCount);

              const isLastChunk = remainingStudents.length === 0;

              currentPageChunks.push({
                classKey: clsData.classKey,
                cleanClass: clsData.cleanClass,
                isHs: clsData.isHs,
                students: slice,
                subjects: clsData.subjects,
                dates: clsData.dates,
                isFirstChunkOfClass: isFirstChunk,
                isLastChunkOfClass: isLastChunk,
              });

              isFirstChunk = false;
              // Summary rows take ~2 slots when a class ends
              const summarySlots = isLastChunk ? 2 : 0;
              currentSlotsUsed += slice.length + extraHeaderSlots + summarySlots;

              if (currentSlotsUsed >= TARGET_STUDENTS_PER_PAGE && remainingStudents.length > 0) {
                pages.push({ chunks: currentPageChunks });
                currentPageChunks = [];
                currentSlotsUsed = 0;
              }
            }
          });

          if (currentPageChunks.length > 0) {
            pages.push({ chunks: currentPageChunks });
          }
        }

        const displayRoom = formatRoomName(room.roomNumber);

        return pages.map((pageData, pageIdx) => {
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
                  {displayRoom} ({room.occupiedSeats} Students Allocated)
                </span>
              </div>

              <div
                className="ems-attendance-sheet w-[210mm] h-[294mm] max-h-[294mm] mx-auto p-[1.5mm_3.5mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
              >
                {/* Subtle Large School Logo Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                  <img
                    src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                    alt="School Logo Watermark"
                    loading="eager"
                    decoding="async"
                    className="w-96 h-96 object-contain opacity-[0.14] grayscale select-none print:filter-none print:opacity-[0.13]"
                  />
                </div>

                {/* Outer Heavy Border */}
                <div className="relative z-10 border-[1.8px] border-black h-full flex flex-col justify-between text-neutral-950 p-[1.2mm]">
                  {/* TOP HEADER SECTION */}
                  <div className="border-b-[1.5px] border-black pb-1 mb-1">
                    {/* School Name, Crest Logo & Room Box */}
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-2 flex items-center space-x-1.5 pl-0.5">
                        <img
                          src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                          alt="School Crest"
                          className="w-9 h-9 object-contain shrink-0"
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
                      <div className="col-span-7 text-center">
                        <h2 className="text-[16px] font-black uppercase tracking-wider text-black leading-tight">
                          {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
                        </h2>
                        <p className="text-[8.5px] font-bold uppercase tracking-wide text-neutral-800 mt-0.5">
                          STUDENT EXAM ATTENDANCE &amp; SCRIPT REGISTER
                        </p>
                      </div>
                      <div className="col-span-3 text-right">
                        <div className="inline-block border-[1.5px] border-black px-2 py-0.5 rounded-[1px] bg-neutral-50 text-center min-w-[90px]">
                          <span className="text-[11px] font-black uppercase text-black block tracking-wide leading-tight">
                            {displayRoom}
                          </span>
                          <span className="text-[8px] font-bold font-mono text-neutral-800 block border-t border-black/40 mt-0.5 pt-0.5">
                            Total Students: {occupiedSeats.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Header Row: Class Info + Exam Title + Half + Room Total Info */}
                    <div className="grid grid-cols-12 border-t-[1.2px] border-black mt-1 pt-1 text-[9.5px] font-bold items-center">
                      <div className="col-span-12 text-center truncate flex items-center justify-center gap-2">
                        {classLabel && (
                          <>
                            <span className="text-black font-black tracking-wide uppercase">
                              {classLabel}
                            </span>
                            <span className="text-neutral-400">•</span>
                          </>
                        )}
                        <span className="text-black font-black tracking-wide uppercase">
                          {examType} - {academicYear}
                        </span>
                        {examHalf && (
                          <>
                            <span className="text-neutral-400">•</span>
                            <span className="text-black font-black uppercase tracking-wide">
                              {examHalf}
                            </span>
                          </>
                        )}
                        <span className="text-neutral-400">•</span>
                        <span className="text-neutral-800 font-bold tracking-wide">
                          Room Students: <strong className="text-black font-mono font-black">{occupiedSeats.length}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* REGISTER TABLES CONTAINER: Class-Specific Sub-Tables with Their Own Subject Columns */}
                  <div className="flex-1 flex flex-col justify-start min-h-0 mt-0.5 space-y-2">
                    {pageData.chunks.length === 0 ? (
                      <div className="border border-black p-4 text-center text-neutral-400 font-bold text-xs">
                        No students allocated in this room
                      </div>
                    ) : (
                      pageData.chunks.map((chunk, chunkIdx) => {
                        const classSubjects = chunk.subjects;
                        const classDates = chunk.dates;
                        const classNumCols = classSubjects.length || 1;
                        const isHs = chunk.isHs;

                        return (
                          <div key={`chunk-table-${chunk.classKey}-${chunkIdx}`} className="w-full">
                            <table className="w-full border-collapse border-[1.5px] border-black text-[9px] table-fixed">
                              <thead>
                                {/* Class Header Banner */}
                                <tr className="border-b-[1.2px] border-black bg-neutral-200/95 h-[5.6mm]">
                                  <th
                                    colSpan={(isHs ? 3 : 2) + classNumCols}
                                    className="text-center font-black text-[10px] uppercase tracking-widest text-black py-0.5 h-[5.6mm]"
                                  >
                                    CLASS: {chunk.classKey}
                                  </th>
                                </tr>

                                {/* Dynamic Subject Column Headers for THIS Specific Class */}
                                <tr className="bg-neutral-100/90 border-b-[1.2px] border-black h-[6.0mm]">
                                  <th
                                    rowSpan={2}
                                    className={`border-r-[1.5px] border-black ${isHs ? "w-[36px]" : "w-[42px]"} text-center font-black p-0.5 text-[9.5px] shrink-0`}
                                  >
                                    Roll
                                  </th>
                                  {isHs && (
                                    <th
                                      rowSpan={2}
                                      className="border-r-[1.5px] border-black w-[76px] text-center font-black p-0.5 text-[9.5px] shrink-0"
                                    >
                                      Reg No
                                    </th>
                                  )}
                                  <th
                                    rowSpan={2}
                                    className={`border-r-[1.5px] border-black ${isHs ? "w-[150px]" : "w-[170px]"} text-left font-black p-0.5 pl-2 text-[10px] truncate shrink-0`}
                                  >
                                    Student Name
                                  </th>
                                  {classSubjects.map((headerText, i) => (
                                    <th
                                      key={`th-sub-${chunkIdx}-${i}`}
                                      className="border-r border-black font-black text-center p-0.5 text-[9px] overflow-hidden leading-tight truncate uppercase tracking-wider text-black"
                                      style={{ width: `calc((100% - ${isHs ? "262px" : "212px"}) / ${classNumCols})` }}
                                    >
                                      {headerText}
                                    </th>
                                  ))}
                                </tr>

                                {/* Date Row for THIS Specific Class */}
                                <tr className="bg-white border-b-[1.5px] border-black h-[5.0mm]">
                                  {classSubjects.map((_, i) => {
                                    const dateVal = classDates?.[i]?.trim();
                                    return (
                                      <th
                                        key={`th-date-${chunkIdx}-${i}`}
                                        className="border-r border-black font-semibold text-center px-0.5 py-0.5 text-[8.5px] text-neutral-800 h-[5.0mm]"
                                      >
                                        {dateVal ? (
                                          <span className="font-mono font-bold tracking-tight text-[8.5px] text-black">
                                            {dateVal}
                                          </span>
                                        ) : (
                                          <span className="font-mono tracking-widest text-neutral-400 select-none">
                                            &nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;
                                          </span>
                                        )}
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>

                              <tbody>
                                {/* Student Rows: Uniform fixed height of 7.15mm (33 rows fill the page cleanly) */}
                                {chunk.students.map((student, stIdx) => {
                                  const regVal = student.regNo?.trim();
                                  return (
                                    <tr
                                      key={`student-row-${chunkIdx}-${student.roll}-${stIdx}`}
                                      className="border-b border-black/70 hover:bg-neutral-50/50 h-[7.15mm]"
                                      style={{ height: "7.15mm" }}
                                    >
                                      <td className="border-r-[1.5px] border-black text-center font-black text-[10px] p-0 leading-none truncate px-0.5 h-[7.15mm]">
                                        {String(student.roll).padStart(2, "0")}
                                      </td>
                                      {isHs && (
                                        <td className="border-r-[1.5px] border-black text-center font-mono font-bold text-[9.5px] p-0 leading-none truncate px-0.5 h-[7.15mm]">
                                          {regVal || "-"}
                                        </td>
                                      )}
                                      <td className="border-r-[1.5px] border-black px-2 font-black text-[11px] uppercase truncate text-neutral-950 leading-none h-[7.15mm]">
                                        {student.name}
                                      </td>
                                      {classSubjects.map((_, colI) => (
                                        <td
                                          key={`cell-${chunkIdx}-${stIdx}-${colI}`}
                                          className="border-r border-black/70 text-center p-0 h-[7.15mm]"
                                        />
                                      ))}
                                    </tr>
                                  );
                                })}

                                {/* Summary Rows for THIS Class at the conclusion of the class */}
                                {chunk.isLastChunkOfClass && (
                                  <>
                                    <tr
                                      className="border-b border-black bg-neutral-100 font-bold h-[5.8mm]"
                                      style={{ height: "5.8mm" }}
                                    >
                                      <td
                                        colSpan={isHs ? 3 : 2}
                                        className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[9.5px] text-neutral-900 h-[5.8mm]"
                                      >
                                        TOTAL PRESENT:
                                      </td>
                                      {classSubjects.map((_, colI) => (
                                        <td
                                          key={`total-p-${chunkIdx}-${colI}`}
                                          className="border-r border-black/80 bg-white text-center p-0 h-[5.8mm]"
                                        />
                                      ))}
                                    </tr>

                                    <tr
                                      className="border-b border-black bg-neutral-100 font-bold h-[5.8mm]"
                                      style={{ height: "5.8mm" }}
                                    >
                                      <td
                                        colSpan={isHs ? 3 : 2}
                                        className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[9.5px] text-neutral-900 h-[5.8mm]"
                                      >
                                        TOTAL ABSENT:
                                      </td>
                                      {classSubjects.map((_, colI) => (
                                        <td
                                          key={`total-a-${chunkIdx}-${colI}`}
                                          className="border-r border-black/80 bg-white text-center p-0 h-[5.8mm]"
                                        />
                                      ))}
                                    </tr>

                                    <tr
                                      className="border-b-[1.5px] border-black bg-neutral-50 font-bold h-[6.0mm]"
                                      style={{ height: "6.0mm" }}
                                    >
                                      <td
                                        colSpan={isHs ? 3 : 2}
                                        className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[9px] text-neutral-900 h-[6.0mm]"
                                      >
                                        INVIGILATOR SIGN:
                                      </td>
                                      {classSubjects.map((_, colI) => (
                                        <td
                                          key={`sign-${chunkIdx}-${colI}`}
                                          className="border-r border-black/80 bg-white text-center p-0 h-[6.0mm]"
                                        />
                                      ))}
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* REGISTER FOOTER */}
                  <div className="border-t-[1.5px] border-black pt-1 mt-1 flex items-center justify-between text-[8px] font-bold text-neutral-700">
                    <span>
                      Room: <strong className="text-black text-[9px]">{displayRoom}</strong> • Total Capacity: <strong>{room.totalSeats}</strong> • Allocated: <strong>{room.occupiedSeats}</strong>
                    </span>
                    <span className="uppercase tracking-wider text-black">
                      {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"} EXAMINATION CONTROL DEPARTMENT
                    </span>
                    <span>
                      Headmaster / Centre In-Charge Sign: __________________
                    </span>
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
