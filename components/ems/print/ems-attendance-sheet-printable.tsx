"use client";

import React from "react";
import { AllocatedRoom, SeatAssignment } from "@/lib/ems/types";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import { isHigherSecondaryClass, toShortStream } from "@/lib/ems/seat-arrangement-algorithm";
import { formatRoomName, getClassNumericRank } from "@/lib/ems/ems-config-loader";

export interface EmsAttendanceSheetPrintableProps {
  rooms: AllocatedRoom[];
  academicYear: number;
  examType: string;
  examHalf?: "1st Half" | "2nd Half";
  schoolProfile: SchoolProfileData;
  targetRoomId?: string; // If undefined or "ALL", print all rooms
  examHeaders?: string[]; // Array of strings for Subjects
  examDates?: string[]; // Array of strings for Exam dates
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

export const EmsAttendanceSheetPrintable: React.FC<EmsAttendanceSheetPrintableProps> = ({
  rooms,
  academicYear,
  examType,
  examHalf,
  schoolProfile,
  targetRoomId = "ALL",
  examHeaders = ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biology"],
  examDates = [],
}) => {
  // Dynamically resolve subject columns list
  const cleanHeaders = (examHeaders && examHeaders.length > 0)
    ? examHeaders.filter((h) => h !== undefined && h !== null && h.trim() !== "")
    : ["Bengali", "English", "Physics", "Chemistry", "Mathematics", "Biology"];

  const columns = cleanHeaders.length > 0 ? cleanHeaders : ["Exam 1", "Exam 2", "Exam 3", "Exam 4", "Exam 5", "Exam 6"];
  const numCols = columns.length;

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

        // Collect all students in this room maintaining class sorting
        const allRoomStudents: { student: StudentRowItem; classKey: string }[] = [];
        classKeys.forEach((key) => {
          const list = classMap.get(key) || [];
          list.forEach((s) => {
            allRoomStudents.push({ student: s, classKey: key });
          });
        });

        // Chunk strictly by 30 students per page
        const STUDENTS_PER_PAGE = 30;
        const studentBatches: { student: StudentRowItem; classKey: string }[][] = [];
        if (allRoomStudents.length === 0) {
          studentBatches.push([]);
        } else {
          for (let i = 0; i < allRoomStudents.length; i += STUDENTS_PER_PAGE) {
            studentBatches.push(allRoomStudents.slice(i, i + STUDENTS_PER_PAGE));
          }
        }

        // Prepare rows for the table
        type RowData =
          | { type: "header"; title: string; isHs: boolean }
          | { type: "student"; student: StudentRowItem; index: number }
          | { type: "total_present"; className: string }
          | { type: "total_absent"; className: string }
          | { type: "invigilator_sign"; className: string }
          | { type: "empty" };

        const displayRoom = formatRoomName(room.roomNumber);

        return studentBatches.map((batch, pageIdx) => {
          // Group batch students by class
          const batchClassMap = new Map<string, StudentRowItem[]>();
          batch.forEach((item) => {
            if (!batchClassMap.has(item.classKey)) {
              batchClassMap.set(item.classKey, []);
            }
            batchClassMap.get(item.classKey)!.push(item.student);
          });

          const pageRows: RowData[] = [];
          batchClassMap.forEach((students, key) => {
            const isHs = students.length > 0 && students[0].isHs;
            pageRows.push({ type: "header", title: `CLASS: ${key}`, isHs });
            students.forEach((s, i) => pageRows.push({ type: "student", student: s, index: i }));
            // Summary rows at the end of each class: Total Present, Total Absent, Invigilator Sign
            pageRows.push({ type: "total_present", className: key });
            pageRows.push({ type: "total_absent", className: key });
            pageRows.push({ type: "invigilator_sign", className: key });
          });

          if (pageRows.length === 0) {
            pageRows.push({ type: "empty" });
          }

          return (
            <div
              key={`attendance-room-${room.roomId}-page-${pageIdx}`}
              className="ems-print-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center"
            >
              {/* Visual Page Counter in Screen Preview */}
              <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
                <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                  Room {roomIdx + 1} of {activeRooms.length}
                  {studentBatches.length > 1 ? ` (Page ${pageIdx + 1}/${studentBatches.length})` : ""}
                </span>
                <span>•</span>
                <span>
                  {displayRoom} ({room.occupiedSeats} Students Allocated)
                </span>
              </div>

              <div
                className="ems-attendance-sheet w-[210mm] h-[287mm] max-h-[287mm] mx-auto p-[1.5mm_3.5mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
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
                            {studentBatches.length > 1 ? `-${pageIdx + 1}` : ""}
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

                  {/* REGISTER TABLE: Multi-Subject Dynamic Columns with Separate Roll and Reg No */}
                  <div className="flex flex-col h-full flex-1 min-h-0 mt-0.5">
                    <table className="w-full border-collapse border-[1.5px] border-black text-[9px] table-fixed h-full">
                      <thead>
                        <tr className="bg-neutral-100/90 border-b-[1.2px] border-black">
                          <th
                            rowSpan={2}
                            className="border-r-[1.5px] border-black w-[36px] text-center font-black p-1 text-[9px] shrink-0"
                          >
                            Roll
                          </th>
                          <th
                            rowSpan={2}
                            className="border-r-[1.5px] border-black w-[76px] text-center font-black p-1 text-[9px] shrink-0"
                          >
                            Reg No
                          </th>
                          <th
                            rowSpan={2}
                            className="border-r-[1.5px] border-black w-[150px] text-left font-black p-1 pl-2 text-[9.5px] truncate shrink-0"
                          >
                            Student Name
                          </th>
                          {/* Dynamic Subject Columns */}
                          {columns.map((headerText, i) => (
                            <th
                              key={`th-subject-${i}`}
                              className="border-r border-black font-black text-center p-1 text-[9px] overflow-hidden leading-tight truncate uppercase tracking-wider text-black"
                              style={{ width: `calc((100% - 262px) / ${numCols})` }}
                            >
                              {headerText}
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-white border-b-[1.5px] border-black">
                          {/* Dynamic Date Row */}
                          {columns.map((_, i) => {
                            const dateVal = examDates?.[i]?.trim();
                            return (
                              <th
                                key={`th-date-${i}`}
                                className="border-r border-black font-semibold text-center px-0.5 py-0.5 text-[8.5px] text-neutral-800 h-[5mm]"
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
                      <tbody className="flex-1">
                        {pageRows.map((row, idx) => {
                          if (row.type === "header") {
                            return (
                              <tr
                                key={`row-${idx}`}
                                className="border-b-[1.2px] border-black bg-neutral-200/90"
                                style={{ height: "5.8mm" }}
                              >
                                <td
                                  colSpan={3 + numCols}
                                  className="text-center font-black text-[10.5px] uppercase tracking-widest text-black py-0.5"
                                >
                                  {row.title}
                                </td>
                              </tr>
                            );
                          }

                          if (row.type === "total_present") {
                            return (
                              <tr
                                key={`row-${idx}`}
                                className="border-b border-black bg-neutral-100 font-bold"
                                style={{ height: "5.8mm" }}
                              >
                                <td
                                  colSpan={3}
                                  className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[9px] text-neutral-900"
                                >
                                  TOTAL PRESENT:
                                </td>
                                {columns.map((_, colI) => (
                                  <td
                                    key={`total-p-${idx}-${colI}`}
                                    className="border-r border-black/80 bg-white text-center p-0"
                                  />
                                ))}
                              </tr>
                            );
                          }

                          if (row.type === "total_absent") {
                            return (
                              <tr
                                key={`row-${idx}`}
                                className="border-b border-black bg-neutral-100 font-bold"
                                style={{ height: "5.8mm" }}
                              >
                                <td
                                  colSpan={3}
                                  className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[9px] text-neutral-900"
                                >
                                  TOTAL ABSENT:
                                </td>
                                {columns.map((_, colI) => (
                                  <td
                                    key={`total-a-${idx}-${colI}`}
                                    className="border-r border-black/80 bg-white text-center p-0"
                                  />
                                ))}
                              </tr>
                            );
                          }

                          if (row.type === "invigilator_sign") {
                            return (
                              <tr
                                key={`row-${idx}`}
                                className="border-b-[1.5px] border-black bg-neutral-50 font-bold"
                                style={{ height: "6.2mm" }}
                              >
                                <td
                                  colSpan={3}
                                  className="border-r-[1.5px] border-black px-2 text-right font-black uppercase text-[8.5px] text-neutral-900"
                                >
                                  INVIGILATOR SIGN:
                                </td>
                                {columns.map((_, colI) => (
                                  <td
                                    key={`sign-${idx}-${colI}`}
                                    className="border-r border-black/80 bg-white text-center p-0"
                                  />
                                ))}
                              </tr>
                            );
                          }

                          const isStudent = row.type === "student";
                          const student = isStudent ? row.student : null;
                          const regVal = student?.regNo?.trim();

                          return (
                            <tr
                              key={`row-${idx}`}
                              className="border-b border-black/70 hover:bg-neutral-50/50"
                              style={{ height: "6.5mm", minHeight: "6.5mm" }}
                            >
                              <td className="border-r-[1.5px] border-black text-center font-black text-[9.5px] p-0 leading-none truncate px-0.5">
                                {student ? String(student.roll).padStart(2, "0") : ""}
                              </td>
                              <td className="border-r-[1.5px] border-black text-center font-mono font-bold text-[9px] p-0 leading-none truncate px-0.5">
                                {regVal || "-"}
                              </td>
                              <td className="border-r-[1.5px] border-black px-2 font-black text-[10.5px] uppercase truncate text-neutral-950 leading-none">
                                {student ? student.name : ""}
                              </td>
                              {/* Dynamic Signature/Script Boxes */}
                              {columns.map((_, colI) => (
                                <td
                                  key={`cell-${idx}-${colI}`}
                                  className="border-r border-black/70 text-center p-0"
                                />
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
          );
        });
      })}
    </div>
  );
};
