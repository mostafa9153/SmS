"use client";

import React from "react";
import { SchoolProfileData } from "@/lib/utils/school-profile";
import type { StudentResult } from "@/lib/types";
import { normalizeSubjectName } from "@/lib/utils/marksheet-calc";
import { getSubjectFullMarks } from "@/lib/utils/marks-config";

export interface EvaluationRegisterPrintableProps {
  students: StudentResult[];
  academicYear: number | string;
  selectedClass: string;
  selectedSection: string;
  selectedExam: string;
  subjects: string[];
  schoolProfile: SchoolProfileData;
  printMode?: "with_marks" | "blank";
  studentsPerPage?: number;
}

/**
 * Extracts a displayable score for a given subject from StudentResult.
 * Returns empty string "" if no mark is recorded.
 */
function getSubjectScore(result: StudentResult, subjectName: string): string {
  if (!result.subjectMarks) return "";

  let rawVal: any = undefined;
  for (const [k, v] of Object.entries(result.subjectMarks)) {
    if (
      normalizeSubjectName(k) === normalizeSubjectName(subjectName) ||
      k.toLowerCase().trim() === subjectName.toLowerCase().trim()
    ) {
      rawVal = v;
      break;
    }
  }

  if (rawVal === undefined || rawVal === null) return "";

  if (typeof rawVal === "object") {
    if (rawVal.isAbsent) return "AB";
    if (rawVal.total !== undefined && rawVal.total !== null && rawVal.total !== "") return String(rawVal.total);
    if (rawVal.theory !== undefined && rawVal.theory !== null && rawVal.theory !== "") return String(rawVal.theory);
    if (rawVal.written !== undefined && rawVal.written !== null && rawVal.written !== "") return String(rawVal.written);
    return "";
  }

  return rawVal !== "" ? String(rawVal) : "";
}

export const EvaluationRegisterPrintable: React.FC<EvaluationRegisterPrintableProps> = ({
  students,
  academicYear,
  selectedClass,
  selectedSection,
  selectedExam,
  subjects,
  schoolProfile,
  printMode = "with_marks",
  studentsPerPage = 30,
}) => {
  const isHs = selectedClass === "XI" || selectedClass === "XII";
  const subjectFullMarksInfo = React.useMemo(() => {
    return getSubjectFullMarks(selectedClass, selectedExam);
  }, [selectedClass, selectedExam]);
  const defaultFullMarks = subjectFullMarksInfo.totalFull > 0 ? String(subjectFullMarksInfo.totalFull) : "50";

  // Clean subject list
  const cleanSubjects = subjects && subjects.length > 0
    ? subjects.filter((s) => s && s.trim() !== "")
    : ["Bengali", "English", "Mathematics", "Science", "History", "Geography"];

  // Chunk students into pages (strictly 26 per page)
  const pages: StudentResult[][] = [];
  if (students.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < students.length; i += studentsPerPage) {
      pages.push(students.slice(i, i + studentsPerPage));
    }
  }

  const totalPages = pages.length;

  return (
    <div className="evaluation-register-print-root w-full bg-white text-neutral-950 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #eval-print-isolated-portal {
              display: none;
            }
            @page {
              size: 210mm 297mm;
              margin: 0;
            }
            @media print {
              body > *:not(#eval-print-isolated-portal),
              header,
              nav,
              aside,
              button,
              [data-radix-portal],
              [role="dialog"],
              .print\\:hidden {
                display: none !important;
              }
              #eval-print-isolated-portal {
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
              }
              html, body {
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 210mm !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .evaluation-page-break {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .evaluation-page-break:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .evaluation-page-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                width: 210mm !important;
                height: 290mm !important;
                max-height: 290mm !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {pages.map((pageStudents, pageIdx) => {
        return (
          <div
            key={`page-${pageIdx}`}
            className="evaluation-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center"
          >
            {/* Screen Page Indicator */}
            <div className="print:hidden text-[11px] font-mono font-medium text-neutral-500 mb-2 flex items-center space-x-2">
              <span className="bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded border border-neutral-700">
                Page {pageIdx + 1} of {totalPages}
              </span>
              <span>•</span>
              <span>
                Class {selectedClass}-{selectedSection} ({students.length} Total Students)
              </span>
            </div>

            {/* A4 Sheet Container */}
            <div className="evaluation-page-sheet w-[210mm] h-[290mm] max-h-[290mm] mx-auto p-[2mm_4mm] box-border overflow-hidden bg-white text-black relative flex flex-col justify-between shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0 print:h-[290mm]">
              {/* Subtle Large School Logo Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                <img
                  src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                  alt="Watermark"
                  loading="eager"
                  decoding="async"
                  className="w-[120mm] h-[120mm] object-contain opacity-[0.14] grayscale select-none print:filter-none print:opacity-[0.13]"
                />
              </div>

              {/* Main Document Content Wrapper with Perimeter Border */}
              <div className="relative z-10 w-full h-full flex flex-col justify-between border-[1.5px] border-black p-1 bg-transparent">
                {/* 1. TOP HEADER BLOCK */}
                <div className="shrink-0 flex flex-col">
                  {/* Top Three-Box Header */}
                  <div className="grid grid-cols-12 border border-black text-black">
                    {/* Left Box: Logo & EMS Reg Tag */}
                    <div className="col-span-2 border-r border-black p-1 flex flex-col items-center justify-center text-center">
                      <img
                        src={schoolProfile.schoolLogoUrl || "/school-logo.png"}
                        alt="Logo"
                        className="w-8 h-8 object-contain mb-0.5"
                      />
                      <span className="text-[7.5px] font-mono font-bold leading-none">
                        EMS REG
                      </span>
                      <span className="text-[7px] font-mono text-neutral-600 leading-tight">
                        PG {pageIdx + 1}-{totalPages}
                      </span>
                    </div>

                    {/* Center Box: School Name & Subtitle */}
                    <div className="col-span-8 border-r border-black p-1 flex flex-col items-center justify-center text-center">
                      <h1 className="text-[13px] sm:text-[14px] font-black uppercase tracking-tight text-black leading-tight">
                        {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
                      </h1>
                      <p className="text-[8px] sm:text-[8.5px] font-extrabold uppercase text-neutral-800 tracking-wider mt-0.5 leading-none">
                        STUDENT EXAM ATTENDANCE & SCRIPT REGISTER
                      </p>
                    </div>

                    {/* Right Box: Class / Section & Student Count */}
                    <div className="col-span-2 p-1 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-black font-mono leading-tight">
                        {isHs ? `CLASS ${selectedClass}` : `SEC: ${selectedSection}`}
                      </span>
                      <span className="text-[7px] font-bold text-neutral-700 leading-tight mt-0.5">
                        Total: {students.length}
                      </span>
                    </div>
                  </div>

                  {/* Sub-Header Horizontal Bar */}
                  <div className="border-x border-b border-black bg-neutral-100/90 px-2 py-0.5 text-[8.5px] font-bold flex items-center justify-between text-black">
                    <div className="flex items-center gap-1.5 uppercase font-extrabold">
                      <span>CLASS: {selectedClass} - {selectedSection}</span>
                      <span>•</span>
                      <span>{selectedExam} - {academicYear}</span>
                    </div>
                    <div className="font-mono text-[8px] text-neutral-700">
                      Page Students: {pageStudents.length}
                    </div>
                  </div>
                </div>

                {/* 2. TABULATION DATA TABLE (Equal Fixed Widths & 100% Full Page Height) */}
                <div className="flex-1 w-full my-0 overflow-hidden flex flex-col">
                  <table className="w-full h-full table-fixed border-collapse border border-black text-black">
                    <colgroup>
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "24%" }} />
                      {cleanSubjects.map((_, sIdx) => (
                        <col
                          key={`col-sub-${sIdx}`}
                          style={{ width: `${54 / cleanSubjects.length}%` }}
                        />
                      ))}
                    </colgroup>
                    <thead className="shrink-0">
                      <tr className="bg-neutral-50 h-[6.5mm]">
                        {/* Roll */}
                        <th className="border border-black text-center text-[8.5px] font-extrabold uppercase py-0.5">
                          Roll
                        </th>
                        {/* Reg No / School ID */}
                        <th className="border border-black text-center text-[8.5px] font-extrabold uppercase py-0.5">
                          {isHs ? "Reg No" : "School ID"}
                        </th>
                        {/* Student Name */}
                        <th className="border border-black text-left px-1.5 text-[8.5px] font-extrabold uppercase py-0.5 truncate">
                          Student Name
                        </th>
                        {/* Subject Columns (Uniform Equal Space) */}
                        {cleanSubjects.map((sub, sIdx) => (
                          <th
                            key={`sub-header-${sIdx}`}
                            className="border border-black text-center text-[7px] font-extrabold uppercase px-0.5 py-0.5 leading-tight overflow-hidden break-words"
                          >
                            <span className="block line-clamp-2">
                              {sub.replace(/\(.*?\)/g, "").trim().toUpperCase()}
                            </span>
                          </th>
                        ))}
                      </tr>

                      {/* Sub-header row for Total Marks */}
                      <tr className="bg-neutral-50/50 text-neutral-800 text-[7px] font-mono h-[5.5mm]">
                        <th className="border border-black py-0" />
                        <th className="border border-black py-0" />
                        <th className="border border-black py-0 text-left px-1.5 font-black uppercase text-[7.5px] text-black tracking-wide">
                          TOTAL MARKS
                        </th>
                        {cleanSubjects.map((sub, sIdx) => {
                          const subInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                          const subMarks = subInfo.totalFull > 0 ? String(subInfo.totalFull) : defaultFullMarks;
                          return (
                            <th
                              key={`sub-sub-${sIdx}`}
                              className="border border-black text-center py-0.5 font-mono font-bold text-[8px] text-black"
                            >
                              {subMarks}
                            </th>
                          );
                        })}
                      </tr>

                      {/* Class Section Divider Bar */}
                      <tr className="bg-neutral-100 h-[5mm]">
                        <td
                          colSpan={3 + cleanSubjects.length}
                          className="border border-black text-center font-black text-[8px] py-0.5 uppercase tracking-widest text-black"
                        >
                          CLASS: {selectedClass} - {selectedSection}
                        </td>
                      </tr>
                    </thead>

                    <tbody>
                      {pageStudents.map((st, rIdx) => {
                        const regNoDisplay = isHs
                          ? (st.student?.boardRegistrationNo || "")
                          : (st.student?.schoolId || "");

                        return (
                          <tr key={`st-${st.studentId || rIdx}`} className="h-[7.5mm]">
                            {/* Roll */}
                            <td className="border border-black text-center font-mono font-bold text-[8.5px] px-0.5">
                              {st.roll < 10 ? `0${st.roll}` : st.roll}
                            </td>
                            {/* Reg No / School ID */}
                            <td className="border border-black text-center font-mono font-medium text-[8px] px-1">
                              {regNoDisplay}
                            </td>
                            {/* Student Name */}
                            <td className="border border-black text-left px-1.5 font-bold text-[8.5px] uppercase truncate max-w-[48mm]">
                              {st.student?.name || "—"}
                            </td>
                            {/* Subject Marks */}
                            {cleanSubjects.map((sub, sIdx) => {
                              const scoreVal = printMode === "with_marks" ? getSubjectScore(st, sub) : "";
                              return (
                                <td
                                  key={`score-${sIdx}`}
                                  className="border border-black text-center font-mono font-bold text-[9px] px-1"
                                >
                                  {scoreVal}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* Pad empty rows if fewer than studentsPerPage on the final page */}
                      {Array.from({ length: Math.max(0, studentsPerPage - pageStudents.length) }).map((_, padIdx) => (
                        <tr key={`pad-${padIdx}`} className="h-[7.5mm]">
                          <td className="border border-black text-center text-[8.5px]">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                          <td className="border border-black">&nbsp;</td>
                          {cleanSubjects.map((_, sIdx) => (
                            <td key={`pad-sub-${sIdx}`} className="border border-black">&nbsp;</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 3. BOTTOM FOOTER & SIGNATURE BLOCK */}
                <div className="shrink-0 pt-1 border-t border-black grid grid-cols-3 text-[8px] font-bold text-black items-end">
                  <div className="text-left">
                    <span className="block text-[7px] text-neutral-600 font-normal">Generated:</span>
                    <span>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="text-center">
                    <div className="w-28 mx-auto border-b border-dotted border-black mb-0.5" />
                    <span>Teacher / Evaluator Signature</span>
                  </div>
                  <div className="text-right">
                    <div className="w-28 ml-auto border-b border-dotted border-black mb-0.5" />
                    <span>Headmaster / TIC Signature</span>
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
