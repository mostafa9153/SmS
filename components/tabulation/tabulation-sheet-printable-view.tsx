"use client";

import React from "react";
import { SchoolProfileData } from "@/lib/utils/school-profile";

export interface TabulationStudentItem {
  roll: number;
  name: string;
  studentId?: string;
}

export interface TabulationSheetProps {
  schoolProfile: SchoolProfileData;
  academicYear: number | string;
  evaluationTitle?: string; // e.g. "Summative Evaluation"
  className: string;        // e.g. "VII"
  section: string;          // e.g. "B"
  subject: string;          // e.g. "BENGALI" or "MATHEMATICS"
  students: TabulationStudentItem[];
  showWatermark?: boolean;
}

// 40 rows per column = 80 student records per A4 sheet (2 continuous columns)
const ROWS_PER_COLUMN = 40;
const ROWS_PER_PAGE = ROWS_PER_COLUMN * 2; // 80 rows per A4 page

export const TabulationSheetPrintableView: React.FC<TabulationSheetProps> = ({
  schoolProfile,
  academicYear,
  evaluationTitle = "Summative Evaluation",
  className: studentClass,
  section,
  subject,
  students,
  showWatermark = true,
}) => {
  // Ensure students are strictly sorted by roll number
  const sortedStudents = [...students].sort((a, b) => a.roll - b.roll);

  // Calculate total pages needed (at least 1 page)
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / ROWS_PER_PAGE) || 1);

  const pages: {
    leftStudents: TabulationStudentItem[];
    rightStudents: TabulationStudentItem[];
    startRollLeft: number;
    endRollLeft: number;
    startRollRight: number;
    endRollRight: number;
  }[] = [];

  for (let p = 0; p < totalPages; p++) {
    const pageStartIdx = p * ROWS_PER_PAGE;
    const leftSlice = sortedStudents.slice(pageStartIdx, pageStartIdx + ROWS_PER_COLUMN);
    const rightSlice = sortedStudents.slice(pageStartIdx + ROWS_PER_COLUMN, pageStartIdx + ROWS_PER_PAGE);

    const startRollLeft = p * ROWS_PER_PAGE + 1;
    const endRollLeft = p * ROWS_PER_PAGE + ROWS_PER_COLUMN;
    const startRollRight = p * ROWS_PER_PAGE + ROWS_PER_COLUMN + 1;
    const endRollRight = (p + 1) * ROWS_PER_PAGE;

    // Fill left column first (Row 1 to 40)
    const paddedLeft: TabulationStudentItem[] = Array.from({ length: ROWS_PER_COLUMN }).map((_, i) => {
      const existing = leftSlice[i];
      if (existing) return existing;
      return {
        roll: startRollLeft + i,
        name: "",
      };
    });

    // Then fill right column (Row 41 to 80)
    const paddedRight: TabulationStudentItem[] = Array.from({ length: ROWS_PER_COLUMN }).map((_, i) => {
      const existing = rightSlice[i];
      if (existing) return existing;
      return {
        roll: startRollRight + i,
        name: "",
      };
    });

    pages.push({
      leftStudents: paddedLeft,
      rightStudents: paddedRight,
      startRollLeft,
      endRollLeft,
      startRollRight,
      endRollRight,
    });
  }

  const renderSingleTable = (
    tableStudents: TabulationStudentItem[],
    rangeLabel: string,
    signatureLabel: string
  ) => {
    return (
      <div className="flex flex-col h-full justify-between select-none">
        {/* TOP INSTITUTIONAL HEADER */}
        <div className="text-center pb-1 shrink-0">
          {/* School Name */}
          <h2 className="text-[11.5px] font-black uppercase tracking-tight text-black leading-tight">
            {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
          </h2>

          {/* Exam Title */}
          <p className="text-[8.5px] font-bold text-neutral-800 leading-tight mt-0.5">
            {evaluationTitle} - {academicYear}
          </p>

          {/* Class & Subject Subheader */}
          <div className="grid grid-cols-12 text-[8.5px] font-bold text-black border-t border-black mt-1 pt-0.5 items-center">
            <div className="col-span-5 text-left text-purple-900 font-extrabold truncate">
              Class - {studentClass}
            </div>
            <div className="col-span-7 text-left pl-1 text-black font-extrabold truncate flex items-center gap-1">
              <span>Sub :-</span>
              <span className="underline decoration-dotted truncate">
                {subject && subject.trim() !== "" ? subject.toUpperCase() : "_________________"}
              </span>
            </div>
          </div>

          {/* Section & Summative Tag */}
          <div className="grid grid-cols-12 text-[8.5px] font-bold text-black border-t border-black mt-0.5 pt-0.5 items-center">
            <div className="col-span-5 text-left text-purple-900 font-extrabold truncate">
              Sec - {section}
            </div>
            <div className="col-span-7 text-center text-red-700 font-extrabold uppercase tracking-wide">
              Summative
            </div>
          </div>
        </div>

        {/* 40-ROW TABULATION TABLE: Fully expanded to fill the entire A4 vertical page */}
        <div className="flex-1 min-h-0 flex flex-col justify-between my-0.5">
          <table className="w-full h-full border-collapse border-[1.2px] border-black text-[7.5px] table-fixed">
            <thead>
              <tr className="border-b-[1.2px] border-black bg-neutral-100/80 text-black" style={{ height: "6.2mm" }}>
                <th className="border-r-[1.2px] border-black w-[19px] text-center font-black p-0 text-[7.5px]">
                  Rol
                </th>
                <th className="border-r-[1.2px] border-black text-left font-black p-0 pl-1 text-[7.5px] truncate" style={{ width: "calc(100% - 66px)" }}>
                  Name of Students
                </th>
                <th className="border-r border-black w-[16px] text-center font-black p-0 text-[6.5px] text-red-700">
                  1st
                </th>
                <th className="border-r border-black w-[16px] text-center font-black p-0 text-[6.5px] text-red-700">
                  2nd
                </th>
                <th className="w-[16px] text-center font-black p-0 text-[6.5px] text-red-700">
                  3rd
                </th>
              </tr>
            </thead>
            <tbody>
              {tableStudents.map((st, idx) => (
                <tr
                  key={`st-row-${st.roll}-${idx}`}
                  className="border-b border-black/70"
                  style={{ height: "6.45mm", boxSizing: "border-box" }}
                >
                  {/* Sequential Roll Number */}
                  <td className="border-r-[1.2px] border-black text-center font-mono font-bold text-[7.5px] p-0 text-black leading-none">
                    {st.roll}
                  </td>

                  {/* Student Name */}
                  <td className="border-r-[1.2px] border-black px-1 font-bold text-[7.5px] uppercase truncate text-black leading-none">
                    {st.name || ""}
                  </td>

                  {/* 1st Summative Score Box */}
                  <td className="border-r border-black text-center p-0 font-mono text-[7px]" />

                  {/* 2nd Summative Score Box */}
                  <td className="border-r border-black text-center p-0 font-mono text-[7px]" />

                  {/* 3rd Summative Score Box */}
                  <td className="text-center p-0 font-mono text-[7px]" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER: ROLL RANGE & SIGNATURE LINE */}
        <div className="pt-1 flex items-center justify-between text-[7px] font-semibold text-neutral-800 border-t border-black/60 mt-0.5 shrink-0">
          <span className="font-mono font-bold text-black">{rangeLabel}</span>
          <span className="font-mono">{signatureLabel}: ______________</span>
        </div>
      </div>
    );
  };

  const effectiveLogoUrl =
    schoolProfile?.schoolLogoUrl && schoolProfile.schoolLogoUrl.trim() !== ""
      ? schoolProfile.schoolLogoUrl
      : "/school-logo.png";

  return (
    <div className="tabulation-print-container flex flex-col items-center">
      {pages.map((page, pageIdx) => (
        <div key={`tabulation-page-${pageIdx}`} className="w-full flex flex-col items-center">
          {/* Visual Page Counter in Screen Preview */}
          <div className="print:hidden text-[11px] font-mono font-medium text-neutral-400 mb-2 flex items-center space-x-2">
            <span className="bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded border border-neutral-700">
              Page {pageIdx + 1} of {totalPages}
            </span>
            <span>•</span>
            <span className="text-neutral-300">
              Class {studentClass}-{section} ({subject || "General"})
            </span>
            <span>•</span>
            <span className="text-neutral-300 font-medium">
              Roll {page.startRollLeft} – {page.endRollRight} (40 Rows/Col)
            </span>
          </div>

          {/* Actual Pure A4 Sheet Box (210mm x 295mm) */}
          <div
            className="tabulation-sheet w-[210mm] h-[295mm] max-h-[295mm] mx-auto p-[4mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
            style={{
              pageBreakAfter: pageIdx < pages.length - 1 ? "always" : "auto",
              breakAfter: pageIdx < pages.length - 1 ? "page" : "auto",
            }}
          >
            {/* Background Subtle Watermark Logo */}
            {showWatermark && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                <img
                  src={effectiveLogoUrl}
                  alt="School Logo Watermark"
                  className="w-80 h-80 object-contain opacity-[0.07] grayscale select-none"
                />
              </div>
            )}

            {/* TWO CONTINUOUS COLUMNS (40 Rows Left -> 40 Rows Right) */}
            <div className="relative z-10 w-full h-full grid grid-cols-2 gap-[4.5mm]">
              {/* LEFT COLUMN: Roll 1 - 40 */}
              <div className="relative pr-[2.25mm] border-r border-black/80 flex flex-col justify-between h-full">
                {renderSingleTable(
                  page.leftStudents,
                  `Roll ${page.startRollLeft} – ${page.endRollLeft}`,
                  "Subject Teacher's Sign"
                )}
              </div>

              {/* RIGHT COLUMN: Roll 41 - 80 */}
              <div className="pl-[2.25mm] flex flex-col justify-between h-full">
                {renderSingleTable(
                  page.rightStudents,
                  `Roll ${page.startRollRight} – ${page.endRollRight}`,
                  "Head of Institution's Sign"
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
