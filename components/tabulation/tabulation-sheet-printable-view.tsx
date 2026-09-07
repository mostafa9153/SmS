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
  layoutMode?: "dual-copy" | "continuous"; // "dual-copy" = office copy + teacher copy (specimen), "continuous" = roll 1-31 left, roll 32-62 right
  showWatermark?: boolean;
}

const ROWS_PER_PAGE = 31; // Matches specimen: 31 students fit perfectly on A4 portrait

export const TabulationSheetPrintableView: React.FC<TabulationSheetProps> = ({
  schoolProfile,
  academicYear,
  evaluationTitle = "Summative Evaluation",
  className: studentClass,
  section,
  subject,
  students,
  layoutMode = "dual-copy",
  showWatermark = true,
}) => {
  // Ensure students are sorted by roll
  const sortedStudents = [...students].sort((a, b) => a.roll - b.roll);

  // If continuous mode: each page holds 2 x ROWS_PER_PAGE (left and right columns)
  // If dual-copy mode: each page holds ROWS_PER_PAGE (both left and right get the SAME students)
  const pageSize = layoutMode === "continuous" ? ROWS_PER_PAGE * 2 : ROWS_PER_PAGE;

  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / pageSize) || 1);

  const pages: { leftStudents: (TabulationStudentItem | null)[]; rightStudents: (TabulationStudentItem | null)[] }[] = [];

  for (let p = 0; p < totalPages; p++) {
    if (layoutMode === "dual-copy") {
      // Both columns receive the same students for that page
      const pageSlice = sortedStudents.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
      // Pad to ROWS_PER_PAGE
      const padded: (TabulationStudentItem | null)[] = Array.from({ length: ROWS_PER_PAGE }).map(
        (_, i) => pageSlice[i] || null
      );
      pages.push({
        leftStudents: padded,
        rightStudents: padded,
      });
    } else {
      // Continuous 2-column: Left column gets first 31, Right column gets next 31
      const startIdx = p * pageSize;
      const leftSlice = sortedStudents.slice(startIdx, startIdx + ROWS_PER_PAGE);
      const rightSlice = sortedStudents.slice(startIdx + ROWS_PER_PAGE, startIdx + pageSize);

      const paddedLeft: (TabulationStudentItem | null)[] = Array.from({ length: ROWS_PER_PAGE }).map(
        (_, i) => leftSlice[i] || null
      );
      const paddedRight: (TabulationStudentItem | null)[] = Array.from({ length: ROWS_PER_PAGE }).map(
        (_, i) => rightSlice[i] || null
      );

      pages.push({
        leftStudents: paddedLeft,
        rightStudents: paddedRight,
      });
    }
  }

  const renderSingleTable = (
    tableStudents: (TabulationStudentItem | null)[],
    copyLabel?: string
  ) => {
    return (
      <div className="flex flex-col h-full justify-between select-none">
        {/* TOP HEADER */}
        <div className="text-center pb-1">
          {/* School Name */}
          <h2 className="text-[12px] font-black uppercase tracking-tight text-black leading-tight">
            {schoolProfile.schoolName || "MORIGACHI HIGH SCHOOL (H. S.)"}
          </h2>

          {/* Exam Title */}
          <p className="text-[9px] font-bold text-neutral-800 leading-tight mt-0.5">
            {evaluationTitle} - {academicYear}
          </p>

          {/* Class, Subject, Section Subheader */}
          <div className="grid grid-cols-12 text-[9px] font-bold text-black border-t border-black mt-1 pt-0.5 items-center">
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

          <div className="grid grid-cols-12 text-[9px] font-bold text-black border-t border-black mt-0.5 pt-0.5 items-center">
            <div className="col-span-5 text-left text-purple-900 font-extrabold truncate">
              Sec - {section}
            </div>
            <div className="col-span-7 text-center text-red-700 font-extrabold uppercase tracking-wide">
              Summative
            </div>
          </div>
        </div>

        {/* MARKS TABLE */}
        <div className="flex-1 min-h-0">
          <table className="w-full border-collapse border-[1.2px] border-black text-[7.5px] table-fixed">
            <thead>
              <tr className="border-b-[1.2px] border-black bg-neutral-100/70 text-black">
                <th className="border-r-[1.2px] border-black w-[18px] text-center font-black p-0.5 text-[7px]">
                  Rol
                </th>
                <th className="border-r-[1.2px] border-black text-left font-black p-0.5 pl-1 text-[7px] truncate" style={{ width: "calc(100% - 72px)" }}>
                  Name of Students
                </th>
                <th className="border-r border-black w-[18px] text-center font-black p-0.5 text-[6.5px] text-red-700">
                  1st
                </th>
                <th className="border-r border-black w-[18px] text-center font-black p-0.5 text-[6.5px] text-red-700">
                  2nd
                </th>
                <th className="w-[18px] text-center font-black p-0.5 text-[6.5px] text-red-700">
                  3rd
                </th>
              </tr>
            </thead>
            <tbody>
              {tableStudents.map((st, idx) => (
                <tr
                  key={`st-row-${idx}`}
                  className="border-b border-black/80"
                  style={{ height: "6.8mm", boxSizing: "border-box" }}
                >
                  {/* Roll Number */}
                  <td className="border-r-[1.2px] border-black text-center font-mono font-bold text-[7.5px] p-0 text-black">
                    {st ? st.roll : idx + 1}
                  </td>

                  {/* Student Name (ALL CAPS) */}
                  <td className="border-r-[1.2px] border-black px-1 font-bold text-[7.5px] uppercase truncate text-black">
                    {st ? st.name : ""}
                  </td>

                  {/* 1st Summative Score Box */}
                  <td className="border-r border-black text-center p-0 font-mono text-[7.5px]" />

                  {/* 2nd Summative Score Box */}
                  <td className="border-r border-black text-center p-0 font-mono text-[7.5px]" />

                  {/* 3rd Summative Score Box */}
                  <td className="text-center p-0 font-mono text-[7.5px]" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER SIGNATURE & COPY LABEL */}
        <div className="pt-1.5 flex items-center justify-between text-[7px] font-semibold text-neutral-700 border-t border-dashed border-neutral-400 mt-1">
          <span>{copyLabel || "Evaluator Copy"}</span>
          <span className="font-mono">Subject Teacher's Sign: ______________</span>
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
            <span>
              {layoutMode === "dual-copy" ? "Twin Office + Teacher Copy" : "Continuous Roster"}
            </span>
          </div>

          {/* Actual Sheet Box */}
          <div
            className="tabulation-sheet w-[210mm] h-[295mm] max-h-[295mm] mx-auto p-[4.5mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0"
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
                  className="w-80 h-80 object-contain opacity-[0.08] grayscale select-none"
                />
              </div>
            )}

            {/* TWIN COLUMNS CONTAINER WITH CENTER DASHED CUTTING LINE */}
            <div className="relative z-10 w-full h-full grid grid-cols-2 gap-[5mm]">
              {/* LEFT HALF TABLE */}
              <div className="relative pr-[2.5mm] border-r border-dashed border-neutral-400 flex flex-col justify-between h-full">
                {/* Micro Cut Scissors Icon on divider */}
                <span className="absolute -top-1 -right-2 text-[8px] text-neutral-400 select-none pointer-events-none bg-white px-0.5">
                  ✂
                </span>
                <span className="absolute top-1/2 -right-2 text-[8px] text-neutral-400 select-none pointer-events-none bg-white px-0.5">
                  ✂
                </span>
                <span className="absolute -bottom-1 -right-2 text-[8px] text-neutral-400 select-none pointer-events-none bg-white px-0.5">
                  ✂
                </span>

                {renderSingleTable(
                  page.leftStudents,
                  layoutMode === "dual-copy" ? "Office / School Record Copy" : `Rolls: ${page.leftStudents[0]?.roll || 1}-${page.leftStudents[page.leftStudents.length - 1]?.roll || 31}`
                )}
              </div>

              {/* RIGHT HALF TABLE */}
              <div className="pl-[2.5mm] flex flex-col justify-between h-full">
                {renderSingleTable(
                  page.rightStudents,
                  layoutMode === "dual-copy" ? "Subject Teacher / Evaluator Copy" : `Rolls: ${page.rightStudents[0]?.roll || 32}-${page.rightStudents[page.rightStudents.length - 1]?.roll || 62}`
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
