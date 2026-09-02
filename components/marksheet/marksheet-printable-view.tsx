"use client";

import React from "react";
import Image from "next/image";
import {
  MarksheetData,
  calculateMarksheetTotals,
  WBBSE_GRADE_SCALE,
} from "@/lib/utils/marksheet-calc";

interface MarksheetPrintableViewProps {
  data: MarksheetData;
}

export function MarksheetPrintableView({ data }: MarksheetPrintableViewProps) {
  const totals = calculateMarksheetTotals(data.subjects);

  return (
    <div
      className="mx-auto bg-[#fffdf5] text-[#111111] p-[6mm_10mm_7mm_10mm] border-[2px] border-[#14206b] relative shadow-lg print:shadow-none print:m-0 print:border-[1.5px] font-serif box-border select-none"
      style={{
        width: "281mm",
        minHeight: "192mm",
        maxHeight: "195mm",
      }}
    >
      {/* Background Institutional Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/school-logo.png"
          alt="Watermark"
          className="w-[260px] h-[260px] object-contain opacity-[0.045]"
        />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* TOP HEADER */}
        <div>
          <div className="flex items-start justify-between gap-3">
            {/* School Logo */}
            <div className="shrink-0 w-[78px] text-center pt-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/school-logo.png"
                alt="School Logo"
                className="w-[74px] h-[74px] object-contain mx-auto drop-shadow-xs"
              />
            </div>

            {/* Header Text */}
            <div className="flex-1 text-center px-1">
              <h1 className="text-[25px] sm:text-[27px] font-bold tracking-tight text-[#14206b] leading-tight m-0 uppercase font-serif">
                Morigachi High School (H.S.)
              </h1>
              <div className="text-[12px] font-semibold text-[#14206b]/90 italic leading-snug">
                (Co-educational &bull; Higher Secondary Institution &bull; Estd. 1966)
              </div>
              <div className="text-[10px] text-neutral-800 leading-tight mt-1 tracking-tight">
                <span>Morigachi, Diamond Harbour, South 24 Parganas &ndash; 743368</span>
                <span className="mx-1.5 font-bold text-[#14206b]">&bull;</span>
                <span>Index No. &ndash; C2-121</span>
                <span className="mx-1.5 font-bold text-[#14206b]">&bull;</span>
                <span>H.S. Code &ndash; 102298</span>
                <span className="mx-1.5 font-bold text-[#14206b]">&bull;</span>
                <span>Phone &ndash; 9800971797</span>
              </div>
            </div>

            {/* Established & UDISE Badge */}
            <div className="shrink-0 w-[110px] text-right text-[11px] italic pt-1 space-y-0.5">
              <div className="font-bold text-[#14206b]">Established &ndash; 1966</div>
              <div className="text-[9.5px] text-neutral-600 not-italic font-sans">
                UDISE: 19180201004
              </div>
              <div className="text-[9px] bg-[#14206b]/10 text-[#14206b] font-bold px-1.5 py-0.5 rounded-sm inline-block not-italic">
                WBBSE Curriculum
              </div>
            </div>
          </div>

          {/* Dividing Double Rule */}
          <div className="border-b-[2px] border-[#14206b] my-1.5" />

          {/* CCE Document Title */}
          <div className="text-center my-1.5">
            <h2 className="text-[14px] sm:text-[15px] font-bold tracking-wider text-[#14206b] uppercase underline underline-offset-4 decoration-[#14206b] inline-block">
              Continuous &amp; Comprehensive Evaluation &ndash; {data.academicYear || "2026"}
            </h2>
            <div className="text-[10px] italic text-neutral-600 font-sans mt-0.5">
              Annual Academic Progress Report Card
            </div>
          </div>

          {/* Student Info Strip */}
          <div className="flex justify-between items-baseline text-[12px] my-2 px-1 gap-4 font-serif">
            <div className="flex items-baseline gap-1.5 min-w-[280px]">
              <span className="font-bold text-[#14206b] whitespace-nowrap">Name of the Student:</span>
              <span className="font-bold border-b border-[#111] px-2 flex-1 text-left min-w-[170px] text-[13px] text-neutral-900">
                {data.studentName || "Synthia Sanam"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Class:</span>
              <span className="font-bold border-b border-[#111] px-2 min-w-[45px] text-center text-[12.5px]">
                {data.studentClass || "IX"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Section:</span>
              <span className="font-bold border-b border-[#111] px-2 min-w-[45px] text-center text-[12.5px]">
                {data.section || "A"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Roll No.:</span>
              <span className="font-bold border-b border-[#111] px-2 min-w-[45px] text-center text-[12.5px]">
                {data.rollNo || "01"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Student ID:</span>
              <span className="font-mono text-[11px] border-b border-[#111] px-2 min-w-[90px] text-center font-bold">
                {data.studentId || "MHS-2026-0036"}
              </span>
            </div>
          </div>
        </div>

        {/* MARKS EVALUATION TABLE */}
        <div className="my-1 overflow-hidden">
          <table className="w-full border-collapse text-[10.5px] table-fixed border border-[#14206b]">
            <thead>
              <tr className="bg-[#eef0f8] text-[#14206b] font-bold text-center">
                <th rowSpan={3} className="border border-[#14206b] w-[13%] p-1 text-left pl-2.5">
                  Subject
                </th>
                <th colSpan={3} className="border border-[#14206b] w-[21%] p-0.5">
                  First Periodic Assessment
                </th>
                <th colSpan={3} className="border border-[#14206b] w-[21%] p-0.5">
                  Second Periodic Assessment
                </th>
                <th colSpan={3} className="border border-[#14206b] w-[21%] p-0.5">
                  Third Periodic Assessment
                </th>
                <th colSpan={3} className="border border-[#14206b] w-[16%] p-0.5 bg-[#e4e8f7]">
                  Overall Marks &amp; Grade
                </th>
                <th rowSpan={3} className="border border-[#14206b] w-[8%] p-0.5 text-[9.5px] leading-tight">
                  Highest Marks<br />in Class
                </th>
              </tr>
              <tr className="bg-[#f4f6fc] text-neutral-800 text-[10px] font-bold text-center">
                <th className="border border-[#14206b] p-0.5 w-[7%]">Periodic</th>
                <th className="border border-[#14206b] p-0.5 w-[7%]">Preparatory</th>
                <th className="border border-[#14206b] p-0.5 w-[7%] font-extrabold text-[#14206b]">Total</th>

                <th className="border border-[#14206b] p-0.5 w-[7%]">Periodic</th>
                <th className="border border-[#14206b] p-0.5 w-[7%]">Preparatory</th>
                <th className="border border-[#14206b] p-0.5 w-[7%] font-extrabold text-[#14206b]">Total</th>

                <th className="border border-[#14206b] p-0.5 w-[7%]">Periodic</th>
                <th className="border border-[#14206b] p-0.5 w-[7%]">Preparatory</th>
                <th className="border border-[#14206b] p-0.5 w-[7%] font-extrabold text-[#14206b]">Total</th>

                <th className="border border-[#14206b] p-0.5 w-[6%] font-extrabold text-[#14206b]">Total</th>
                <th className="border border-[#14206b] p-0.5 w-[5%]">Percentage</th>
                <th className="border border-[#14206b] p-0.5 w-[5%] font-extrabold">Grade</th>
              </tr>
              <tr className="bg-[#fafbff] text-[9.5px] text-neutral-600 text-center font-bold">
                <th className="border border-[#14206b] p-0.5">40</th>
                <th className="border border-[#14206b] p-0.5">10</th>
                <th className="border border-[#14206b] p-0.5 text-[#14206b]">50</th>

                <th className="border border-[#14206b] p-0.5">40</th>
                <th className="border border-[#14206b] p-0.5">10</th>
                <th className="border border-[#14206b] p-0.5 text-[#14206b]">50</th>

                <th className="border border-[#14206b] p-0.5">90</th>
                <th className="border border-[#14206b] p-0.5">10</th>
                <th className="border border-[#14206b] p-0.5 text-[#14206b]">100</th>

                <th className="border border-[#14206b] p-0.5 text-[#14206b]">200</th>
                <th className="border border-[#14206b] p-0.5">100%</th>
                <th className="border border-[#14206b] p-0.5">&ndash;</th>
              </tr>
            </thead>
            <tbody className="text-center font-sans text-[10.5px]">
              {data.subjects.map((sub, idx) => (
                <tr
                  key={sub.id || idx}
                  className={`hover:bg-amber-50/50 transition-colors ${
                    idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                  }`}
                >
                  {/* Subject Name */}
                  <td className="border border-[#14206b] text-left pl-2.5 py-1 font-serif font-bold text-[#14206b]">
                    {sub.subjectName}
                  </td>

                  {/* 1st Term */}
                  <td className="border border-[#14206b] py-1">{sub.term1.periodic !== "" ? sub.term1.periodic : "-"}</td>
                  <td className="border border-[#14206b] py-1">{sub.term1.preparatory !== "" ? sub.term1.preparatory : "-"}</td>
                  <td className="border border-[#14206b] py-1 font-bold text-[#14206b] bg-[#14206b]/5">
                    {sub.term1.total || 0}
                  </td>

                  {/* 2nd Term */}
                  <td className="border border-[#14206b] py-1">{sub.term2.periodic !== "" ? sub.term2.periodic : "-"}</td>
                  <td className="border border-[#14206b] py-1">{sub.term2.preparatory !== "" ? sub.term2.preparatory : "-"}</td>
                  <td className="border border-[#14206b] py-1 font-bold text-[#14206b] bg-[#14206b]/5">
                    {sub.term2.total || 0}
                  </td>

                  {/* 3rd Term */}
                  <td className="border border-[#14206b] py-1">{sub.term3.periodic !== "" ? sub.term3.periodic : "-"}</td>
                  <td className="border border-[#14206b] py-1">{sub.term3.preparatory !== "" ? sub.term3.preparatory : "-"}</td>
                  <td className="border border-[#14206b] py-1 font-bold text-[#14206b] bg-[#14206b]/5">
                    {sub.term3.total || 0}
                  </td>

                  {/* Overall Total (200) */}
                  <td className="border border-[#14206b] py-1 font-extrabold text-[#14206b] bg-[#eef0f8]/50">
                    {sub.overallTotal || 0}
                  </td>

                  {/* Overall Percentage */}
                  <td className="border border-[#14206b] py-1 font-semibold text-neutral-800">
                    {sub.percentage ? `${sub.percentage}%` : "-"}
                  </td>

                  {/* Letter Grade */}
                  <td className="border border-[#14206b] py-1 font-extrabold text-[12px] text-[#14206b]">
                    {sub.grade || "-"}
                  </td>

                  {/* Highest in Class */}
                  <td className="border border-[#14206b] py-1 text-neutral-600 font-mono text-[10px]">
                    {sub.highestMarksInClass !== "" && sub.highestMarksInClass !== undefined
                      ? sub.highestMarksInClass
                      : "-"}
                  </td>
                </tr>
              ))}

              {/* GRAND TOTAL ROW */}
              <tr className="bg-[#eef0f8] font-bold text-[#14206b] border-t-2 border-[#14206b]">
                <td colSpan={10} className="border border-[#14206b] text-right pr-3 py-1 font-serif text-[11.5px]">
                  Grand Total (Out of {totals.maxPossibleMarks}) &ndash;
                </td>
                <td className="border border-[#14206b] py-1 font-extrabold text-[12px] bg-[#14206b] text-white">
                  {totals.totalMarksObtained}
                </td>
                <td className="border border-[#14206b] py-1 font-extrabold text-[11px] text-[#14206b]">
                  {totals.overallPercentage}%
                </td>
                <td className="border border-[#14206b] py-1 font-extrabold text-[13px] text-[#14206b] bg-amber-100/70">
                  {totals.overallGrade}
                </td>
                <td className="border border-[#14206b] py-1 text-neutral-700 font-mono text-[10.5px]">
                  {totals.highestTotalInClass > 0 ? totals.highestTotalInClass : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* BOTTOM SECTION: Signatures, Promotion Status & WBBSE Grade Scale */}
        <div className="flex justify-between items-end gap-3 mt-2 pt-1 border-t border-[#14206b]/20">
          {/* 1. Signature of Class Teacher */}
          <div className="w-[17%] flex flex-col justify-end text-center pb-0.5">
            <div className="h-[40px]" />
            <div className="border-t-[1.5px] border-[#111] pt-1">
              <div className="text-[10.5px] font-bold text-neutral-800 leading-tight font-serif">
                Signature of Class Teacher
              </div>
              <div className="text-[9px] text-neutral-500 font-sans mt-0.5">
                Date: ........................
              </div>
            </div>
          </div>

          {/* 2. Signature of Guardian */}
          <div className="w-[17%] flex flex-col justify-end text-center pb-0.5">
            <div className="h-[40px]" />
            <div className="border-t-[1.5px] border-[#111] pt-1">
              <div className="text-[10.5px] font-bold text-neutral-800 leading-tight font-serif">
                Signature of Guardian
              </div>
              <div className="text-[9px] text-neutral-500 font-sans mt-0.5">
                Date: ........................
              </div>
            </div>
          </div>

          {/* 3. Promotion & Result Badge (Center) */}
          <div className="w-[18%] flex flex-col justify-end pb-0.5">
            <div className="border-[1.5px] border-[#14206b] rounded-sm p-1.5 bg-amber-50/80 text-center shadow-2xs">
              <div className="text-[9px] uppercase tracking-wider text-neutral-600 font-sans font-bold">
                Promotion Status
              </div>
              <div className="text-[11.5px] font-extrabold text-[#14206b] tracking-wide my-0.5">
                {data.promotionStatus === "PROMOTED"
                  ? `PROMOTED TO CLASS ${data.promotedToClass || "X"}`
                  : data.promotionStatus === "PASSED"
                  ? "PASSED WITH MERIT"
                  : "ELIGIBLE FOR RETEST"}
              </div>
              <div className="text-[9px] text-neutral-600 font-sans">
                Date: <span className="font-mono font-bold text-neutral-900">{data.issueDate || "02/09/2026"}</span>
              </div>
            </div>
          </div>

          {/* 4. Signature of Teacher-in-Charge / Headmaster (Digital signature on top, no line) */}
          <div className="w-[20%] flex flex-col items-center justify-end text-center pb-0.5">
            <div className="h-[40px] flex items-end justify-center mb-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hod-signature.png"
                alt="Teacher-in-Charge Signature"
                className="max-h-[38px] max-w-[145px] object-contain mix-blend-multiply"
              />
            </div>
            <div className="text-[10.5px] font-bold text-[#14206b] leading-tight font-serif">
              Signature of Teacher-in-Charge
            </div>
            <div className="text-[9px] text-neutral-600 font-sans leading-tight mt-0.5">
              Headmaster &bull; Morigachi High School
            </div>
          </div>

          {/* 5. Official WBBSE Grade Scale Table (Right) */}
          <div className="w-[26%] border border-[#14206b] rounded-xs overflow-hidden">
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr className="bg-[#14206b] text-white text-center font-bold">
                  <th colSpan={3} className="py-0.5 text-[9.5px] tracking-wide">
                    Scale of Evaluation &ndash; WBBSE
                  </th>
                </tr>
                <tr className="bg-[#eef0f8] text-[#14206b] font-bold text-center border-b border-[#14206b]">
                  <th className="py-0.5 px-1 text-left pl-1.5">Range of Marks</th>
                  <th className="py-0.5 px-0.5">Grade</th>
                  <th className="py-0.5 px-1 text-left">Remarks</th>
                </tr>
              </thead>
              <tbody className="font-sans">
                {WBBSE_GRADE_SCALE.map((g, idx) => (
                  <tr
                    key={g.grade}
                    className={`border-t border-[#c8cbe0] ${
                      totals.overallGrade === g.grade
                        ? "bg-amber-100 font-bold"
                        : idx % 2 === 1
                        ? "bg-slate-50/50"
                        : "bg-white"
                    }`}
                  >
                    <td className="py-[1px] px-1 pl-1.5 text-left font-mono text-[8.5px]">{g.range}</td>
                    <td className="py-[1px] px-0.5 text-center font-extrabold text-[#14206b] text-[9.5px]">{g.grade}</td>
                    <td className="py-[1px] px-1 text-left text-neutral-700 text-[8.5px]">{g.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
