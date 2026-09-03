"use client";

import React from "react";
import {
  MarksheetData,
  calculateMarksheetTotals,
  WBBSE_GRADE_SCALE,
  getClassScheme,
} from "@/lib/utils/marksheet-calc";

interface MarksheetPrintableViewProps {
  data: MarksheetData;
}

export function MarksheetPrintableView({ data }: MarksheetPrintableViewProps) {
  const scheme = getClassScheme(data.studentClass);
  const t1PeriodicMax = scheme?.firstSummativeWritten || 40;
  const t1PrepMax = scheme?.firstSummativePractical || 10;
  const t1TotalMax = t1PeriodicMax + t1PrepMax;

  const t2PeriodicMax = scheme?.secondSummativeWritten || 40;
  const t2PrepMax = scheme?.secondSummativePractical || 10;
  const t2TotalMax = t2PeriodicMax + t2PrepMax;

  const t3PeriodicMax = scheme?.annualWritten || 90;
  const t3PrepMax = scheme?.annualPractical || 10;
  const t3TotalMax = t3PeriodicMax + t3PrepMax;

  const subjectMax = t1TotalMax + t2TotalMax + t3TotalMax || 200;
  const totals = calculateMarksheetTotals(data.subjects, subjectMax);

  // Dynamic row padding and font sizing based on subject count for spacious breathing room
  const rowPad =
    data.subjects.length <= 5
      ? "py-2"
      : data.subjects.length <= 7
      ? "py-[3.8px]"
      : "py-[2.5px]";
  const tbodyFontSize = data.subjects.length >= 8 ? "text-[9px]" : "text-[9.5px]";

  return (
    <div
      id="pure-a4-landscape-marksheet-sheet"
      className="mx-auto bg-[#fffdf5] text-[#111111] p-[4.5mm_7mm_4.5mm_7mm] border-[2.5px] border-[#14206b] relative shadow-2xl print:shadow-none print:m-0 print:border-[2px] font-serif box-border select-none print:w-full print:max-w-[286mm]"
      style={{
        width: "286mm",
        height: "198mm",
        minHeight: "198mm",
        maxHeight: "198mm",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {/* Outer Border Double Accent Line */}
      <div className="absolute inset-1 border border-[#14206b]/35 pointer-events-none" />

      {/* Background Institutional Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/school-logo.png"
          alt="Watermark"
          className="w-[250px] h-[250px] object-contain opacity-[0.042] grayscale"
        />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* =================================================================== */}
        {/* 1. TOP HEADER & METADATA                                            */}
        {/* =================================================================== */}
        <div>
          <div className="flex items-center justify-between gap-3">
            {/* School Logo */}
            <div className="shrink-0 w-[68px] text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/school-logo.png"
                alt="Marigachi High School Logo"
                className="w-[62px] h-[62px] object-contain mx-auto drop-shadow-xs"
              />
            </div>

            {/* Header Text */}
            <div className="flex-1 text-center px-1">
              <h1 className="text-[23px] sm:text-[25px] font-black tracking-tight text-[#14206b] leading-tight m-0 uppercase font-serif">
                Marigachi High School (H.S.)
              </h1>
              <div className="text-[11.5px] font-bold text-[#14206b]/90 italic leading-snug mt-0.5">
                (Co-educational &bull; Higher Secondary Institution &bull; Estd. 1966)
              </div>
              <div className="text-[9.5px] text-neutral-800 leading-tight mt-0.5 tracking-tight font-medium">
                <span>Marigachi, Diamond Harbour, South 24 Parganas &ndash; 743368</span>
                <span className="mx-1.5 font-bold text-[#14206b]">&bull;</span>
                <span>Index No. &ndash; C2-121</span>
                <span className="mx-1.5 font-bold text-[#14206b]">&bull;</span>
                <span>H.S. Code &ndash; 102298</span>
                <span className="mx-1.5 font-bold text-[#14206b]">&bull;</span>
                <span>Phone &ndash; (03174) 211-926</span>
              </div>
            </div>

            {/* Established & UDISE Badge */}
            <div className="shrink-0 w-[110px] text-right text-[10.5px] italic space-y-0.5">
              <div className="font-bold text-[#14206b]">Established &ndash; 1966</div>
              <div className="text-[9px] text-neutral-600 not-italic font-mono">
                UDISE: 19180201004
              </div>
              <div className="text-[8.5px] bg-[#14206b]/10 text-[#14206b] font-bold px-2 py-0.5 rounded-sm inline-block not-italic font-sans">
                WBBSE Curriculum
              </div>
            </div>
          </div>

          {/* Dividing Double Rule */}
          <div className="border-b-[2px] border-[#14206b] my-1.5" />

          {/* CCE Document Title */}
          <div className="text-center py-0.5">
            <h2 className="text-[13.5px] sm:text-[14.5px] font-extrabold tracking-wider text-[#14206b] uppercase underline underline-offset-4 decoration-[#14206b] inline-block font-serif">
              Continuous &amp; Comprehensive Evaluation &ndash; {data.academicYear || "2026"}
            </h2>
            <div className="text-[9.5px] italic text-neutral-600 font-sans mt-0.5 font-medium">
              Annual Academic Progress Report Card
            </div>
          </div>

          {/* Student Info Strip */}
          <div className="flex justify-between items-baseline text-[11.5px] my-1.5 px-1 gap-3 font-serif">
            <div className="flex items-baseline gap-1.5 min-w-[260px]">
              <span className="font-bold text-[#14206b] whitespace-nowrap">Name of the Student:</span>
              <span className="font-extrabold border-b border-[#111] px-2 flex-1 text-left min-w-[160px] text-[12.5px] text-neutral-900 uppercase">
                {data.studentName || "Synthia Sanam"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Class:</span>
              <span className="font-extrabold border-b border-[#111] px-2 text-center min-w-[40px] text-[12px] text-neutral-900">
                {data.studentClass || "IX"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Section:</span>
              <span className="font-extrabold border-b border-[#111] px-2 text-center min-w-[32px] text-[12px] text-neutral-900">
                {data.section || "A"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Roll No.:</span>
              <span className="font-extrabold border-b border-[#111] px-2 text-center min-w-[40px] text-[12px] text-neutral-900 font-mono">
                {data.rollNo || "01"}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[#14206b]">Student ID:</span>
              <span className="font-extrabold border-b border-[#111] px-2 text-center min-w-[120px] text-[11.5px] text-neutral-900 font-mono">
                {data.studentId || "MHS-2026-0036"}
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. MARKS EVALUATION TABLE (SPACIOUS ROW PADDING)                     */}
        {/* =================================================================== */}
        <table className="w-full border-collapse border border-[#14206b] my-1 text-[9.5px]">
          <thead>
            {/* Row 1: Term Group Headers */}
            <tr className="bg-[#14206b] text-white text-center font-bold">
              <th rowSpan={2} className="border border-[#14206b] py-1.5 px-1 text-left pl-2.5 font-serif text-[10.5px] w-[14%]">
                Subject
              </th>
              <th colSpan={3} className="border border-[#14206b] py-1 px-1 text-[10px] w-[19%]">
                1st Summative Evaluation
              </th>
              <th colSpan={3} className="border border-[#14206b] py-1 px-1 text-[10px] w-[19%]">
                2nd Summative Evaluation
              </th>
              <th colSpan={3} className="border border-[#14206b] py-1 px-1 text-[10px] w-[19%]">
                3rd Summative Evaluation
              </th>
              <th colSpan={3} className="border border-[#14206b] py-1 px-1 text-[10px] w-[21%]">
                Overall Marks &amp; Grade
              </th>
              <th rowSpan={2} className="border border-[#14206b] py-1 px-1 text-[9px] w-[8%]">
                Highest Marks<br />in Class
              </th>
            </tr>

            {/* Row 2: Sub-headers */}
            <tr className="bg-[#eef0f8] text-[#14206b] text-center font-bold text-[9px]">
              {/* 1st Term */}
              <th className="border border-[#14206b] py-0.5 px-0.5">Periodic</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">Preparatory</th>
              <th className="border border-[#14206b] py-0.5 px-0.5 text-[#14206b]">Total</th>

              {/* 2nd Term */}
              <th className="border border-[#14206b] py-0.5 px-0.5">Periodic</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">Preparatory</th>
              <th className="border border-[#14206b] py-0.5 px-0.5 text-[#14206b]">Total</th>

              {/* 3rd Term */}
              <th className="border border-[#14206b] py-0.5 px-0.5">Periodic</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">Preparatory</th>
              <th className="border border-[#14206b] py-0.5 px-0.5 text-[#14206b]">Total</th>

              {/* Overall */}
              <th className="border border-[#14206b] py-0.5 px-0.5">Total</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">Percentage</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">Grade</th>
            </tr>

            {/* Row 3: Max Marks */}
            <tr className="bg-slate-100 text-[#14206b] text-center font-bold text-[8.5px] font-mono">
              <th className="border border-[#14206b] py-0.5 px-1 text-left pl-2.5 font-serif font-normal italic text-neutral-600">
                Full Marks &rarr;
              </th>
              <th className="border border-[#14206b] py-0.5 px-0.5">{t1PeriodicMax}</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">{t1PrepMax > 0 ? t1PrepMax : "-"}</th>
              <th className="border border-[#14206b] py-0.5 px-0.5 text-[#14206b]">{t1TotalMax}</th>

              <th className="border border-[#14206b] py-0.5 px-0.5">{t2PeriodicMax}</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">{t2PrepMax > 0 ? t2PrepMax : "-"}</th>
              <th className="border border-[#14206b] py-0.5 px-0.5 text-[#14206b]">{t2TotalMax}</th>

              <th className="border border-[#14206b] py-0.5 px-0.5">{t3PeriodicMax}</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">{t3PrepMax > 0 ? t3PrepMax : "-"}</th>
              <th className="border border-[#14206b] py-0.5 px-0.5 text-[#14206b]">{t3TotalMax}</th>

              <th className="border border-[#14206b] py-0.5 px-0.5 text-[#14206b]">{subjectMax}</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">100%</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">&ndash;</th>
              <th className="border border-[#14206b] py-0.5 px-0.5">&ndash;</th>
            </tr>
          </thead>
          <tbody className={`text-center font-sans ${tbodyFontSize}`}>
            {data.subjects.map((sub, idx) => {
              const isFailingSubject = sub.grade === "D" || (sub.percentage > 0 && sub.percentage < 25);
              return (
                <tr
                  key={sub.id || idx}
                  className={idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}
                >
                  <td className={`border border-[#14206b] text-left pl-2.5 ${rowPad} font-serif font-bold text-[#14206b]`}>
                    {sub.subjectName}
                  </td>
                  <td className={`border border-[#14206b] ${rowPad}`}>{sub.term1.periodic}</td>
                  <td className={`border border-[#14206b] ${rowPad}`}>{sub.term1.preparatory}</td>
                  <td className={`border border-[#14206b] ${rowPad} font-bold text-[#14206b] bg-[#14206b]/5`}>{sub.term1.total}</td>
                  <td className={`border border-[#14206b] ${rowPad}`}>{sub.term2.periodic}</td>
                  <td className={`border border-[#14206b] ${rowPad}`}>{sub.term2.preparatory}</td>
                  <td className={`border border-[#14206b] ${rowPad} font-bold text-[#14206b] bg-[#14206b]/5`}>{sub.term2.total}</td>
                  <td className={`border border-[#14206b] ${rowPad}`}>{sub.term3.periodic}</td>
                  <td className={`border border-[#14206b] ${rowPad}`}>{sub.term3.preparatory}</td>
                  <td className={`border border-[#14206b] ${rowPad} font-bold text-[#14206b] bg-[#14206b]/5`}>{sub.term3.total}</td>
                  <td className={`border border-[#14206b] ${rowPad} font-extrabold text-[#14206b] bg-[#eef0f8]/50`}>{sub.overallTotal}</td>
                  <td className={`border border-[#14206b] ${rowPad} font-semibold ${isFailingSubject ? "text-red-600 font-bold" : "text-neutral-800"}`}>
                    {sub.percentage}%
                  </td>
                  <td className={`border border-[#14206b] ${rowPad} font-extrabold ${isFailingSubject ? "text-red-600 bg-red-50" : "text-[#14206b]"}`}>
                    {sub.grade || (sub.percentage < 25 ? "D" : "")}
                  </td>
                  <td className={`border border-[#14206b] ${rowPad} font-mono`}>{sub.highestMarksInClass}</td>
                </tr>
              );
            })}
            {/* GRAND TOTAL ROW */}
            <tr className="bg-[#eef0f8] font-bold text-[#14206b] border-t-2 border-[#14206b]">
              <td colSpan={10} className="border border-[#14206b] text-right pr-3 py-1 font-serif text-[11px]">
                Grand Total (Out of {totals.maxPossibleMarks}) &ndash;
              </td>
              <td className="border border-[#14206b] py-1 font-extrabold text-[11px] bg-[#14206b] text-white font-mono">
                {totals.totalMarksObtained}
              </td>
              <td className="border border-[#14206b] py-1 font-extrabold text-[10.5px] text-[#14206b] font-mono">
                {totals.overallPercentage}%
              </td>
              <td className={`border border-[#14206b] py-1 font-extrabold text-[12px] ${
                totals.overallGrade === "D" ? "text-red-700 bg-red-100 font-black" : "text-[#14206b] bg-amber-100/80"
              }`}>
                {totals.overallGrade || (totals.overallPercentage < 25 ? "D" : "")}
              </td>
              <td className="border border-[#14206b] py-1 text-neutral-700 font-mono text-[10px]">
                {totals.highestTotalInClass}
              </td>
            </tr>
          </tbody>
        </table>

        {/* =================================================================== */}
        {/* 3. BOTTOM SECTION: SIGNATURES, PROMOTION & SCALE OF EVALUATION      */}
        {/* =================================================================== */}
        {(() => {
          const rankInput = data.classRank || "1st";
          const match = rankInput.match(/\d+/);
          const rankNum = match ? parseInt(match[0], 10) : NaN;
          const isFailing = totals.overallPercentage < 25 || totals.overallGrade === "D";
          const isTop10 = !isFailing && !isNaN(rankNum) && rankNum >= 1 && rankNum <= 10;
          const suffix = rankNum === 1 ? "st" : rankNum === 2 ? "nd" : rankNum === 3 ? "rd" : "th";
          const formattedRank = !isNaN(rankNum) ? `${rankNum}${suffix}` : rankInput;

          return (
            <div className="flex justify-between items-end gap-2 mt-2 pt-1 border-t border-[#14206b]/20">
              {/* Guardian Signature */}
              <div className="w-[14.5%] h-[134px] flex flex-col justify-end text-center pb-0.5">
                <div className="h-[56px]" />
                <div className="border-t-[1.5px] border-[#111] pt-1">
                  <div className="text-[10px] font-bold text-neutral-800 leading-tight font-serif">
                    Signature of Guardian
                  </div>
                  <div className="text-[8px] text-neutral-500 font-sans mt-0.5">
                    Date: ........................
                  </div>
                </div>
              </div>

              {/* Class Teacher Signature */}
              <div className="w-[15%] h-[134px] flex flex-col justify-end text-center pb-0.5">
                <div className="h-[56px]" />
                <div className="border-t-[1.5px] border-[#111] pt-1">
                  <div className="text-[10px] font-bold text-neutral-800 leading-tight font-serif">
                    Signature of Class Teacher
                  </div>
                  <div className="text-[8px] text-neutral-500 font-sans mt-0.5">
                    Date: ........................
                  </div>
                </div>
              </div>

              {/* Headmaster / Teacher-in-Charge Signature */}
              <div className="w-[18.5%] h-[134px] flex flex-col items-center justify-end text-center pb-0.5">
                <div className="h-[56px] flex items-end justify-center mb-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/hod-signature.png"
                    alt="Teacher-in-Charge Signature"
                    className="max-h-[44px] max-w-[135px] object-contain mix-blend-multiply select-none"
                  />
                </div>
                <div className="text-[10px] font-bold text-[#14206b] leading-tight font-serif">
                  Signature of Teacher-in-Charge
                </div>
                <div className="text-[8px] text-neutral-600 font-sans leading-tight mt-0.5">
                  Headmaster &bull; Marigachi High School
                </div>
              </div>

              {/* Promotion & Rank Status Card */}
              <div className={`w-[24%] h-[134px] border-[1.5px] rounded-xs p-1 flex flex-col justify-between text-center shadow-xs ${
                isFailing
                  ? "border-red-600 bg-red-50/70"
                  : "border-[#14206b] bg-amber-50/70"
              }`}>
                <div>
                  <div className="text-[8px] uppercase tracking-wider text-neutral-600 font-sans font-bold">
                    Promotion Status
                  </div>
                  <div className={`text-[11.5px] font-black tracking-wide leading-tight my-0.5 ${
                    isFailing ? "text-red-700" : "text-[#14206b]"
                  }`}>
                    {isFailing
                      ? "DETAINED (FAIL - RETEST REQUIRED)"
                      : data.promotionStatus === "PROMOTED"
                      ? `PROMOTED TO CLASS ${data.promotedToClass || "X"}`
                      : data.promotionStatus === "PASSED"
                      ? "PASSED WITH MERIT"
                      : "ELIGIBLE FOR RETEST"}
                  </div>
                </div>

                {isFailing ? (
                  <div className="my-0.5 py-0.5 px-1 bg-red-100 border border-red-400 rounded shadow-xs">
                    <div className="text-[7.5px] font-bold uppercase tracking-wider text-red-900">
                      Academic Evaluation
                    </div>
                    <div className="text-[11.5px] font-black font-mono text-red-800 leading-tight">
                      GRADE: D (FAIL)
                    </div>
                    <div className="text-[7px] font-semibold text-red-700 tracking-tight">
                      Score Below 25% Qualifying Mark
                    </div>
                  </div>
                ) : isTop10 ? (
                  rankNum === 1 ? (
                    <div className="my-0.5 py-0.5 px-1 bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border border-amber-600 rounded shadow-xs">
                      <div className="text-[7.5px] font-black uppercase tracking-wider text-amber-950 flex items-center justify-center gap-1">
                        <span>&#9733;</span>
                        <span>CLASS TOPPER</span>
                        <span>&#9733;</span>
                      </div>
                      <div className="text-[12px] font-black font-mono text-[#14206b] leading-tight my-0.5">
                        RANK: 1st
                      </div>
                      <div className="text-[7px] font-bold text-amber-900 tracking-tight">
                        ACADEMIC EXCELLENCE
                      </div>
                    </div>
                  ) : rankNum === 2 ? (
                    <div className="my-0.5 py-0.5 px-1 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 border border-slate-500 rounded shadow-xs">
                      <div className="text-[7.5px] font-black uppercase tracking-wider text-slate-900 flex items-center justify-center gap-1">
                        <span>&#9733;</span>
                        <span>2ND POSITION</span>
                        <span>&#9733;</span>
                      </div>
                      <div className="text-[12px] font-black font-mono text-[#14206b] leading-tight my-0.5">
                        RANK: 2nd
                      </div>
                      <div className="text-[7px] font-bold text-slate-700 tracking-tight">
                        DISTINCTION IN MERIT
                      </div>
                    </div>
                  ) : rankNum === 3 ? (
                    <div className="my-0.5 py-0.5 px-1 bg-gradient-to-r from-orange-200 via-amber-100 to-orange-200 border border-amber-700 rounded shadow-xs">
                      <div className="text-[7.5px] font-black uppercase tracking-wider text-amber-950 flex items-center justify-center gap-1">
                        <span>&#9733;</span>
                        <span>3RD POSITION</span>
                        <span>&#9733;</span>
                      </div>
                      <div className="text-[12px] font-black font-mono text-[#14206b] leading-tight my-0.5">
                        RANK: 3rd
                      </div>
                      <div className="text-[7px] font-bold text-amber-900 tracking-tight">
                        HIGH ACHIEVEMENT
                      </div>
                    </div>
                  ) : (
                    <div className="my-0.5 py-0.5 px-1 bg-gradient-to-r from-[#14206b]/15 via-[#14206b]/5 to-[#14206b]/15 border border-[#14206b]/40 rounded shadow-xs">
                      <div className="text-[7.5px] font-black uppercase tracking-wider text-[#14206b] flex items-center justify-center gap-1">
                        <span>&#9733;</span>
                        <span>TOP 10 HONORS</span>
                        <span>&#9733;</span>
                      </div>
                      <div className="text-[11.5px] font-black font-mono text-[#14206b] leading-tight my-0.5">
                        RANK: {formattedRank}
                      </div>
                      <div className="text-[7px] font-bold text-neutral-600 tracking-tight">
                        MERIT ROLL HOLDER
                      </div>
                    </div>
                  )
                ) : (
                  <div className="my-0.5 py-0.5 px-1 bg-slate-100 border border-slate-300 rounded">
                    <div className="text-[7.5px] font-bold uppercase tracking-wider text-neutral-500">
                      Class Position
                    </div>
                    <div className="text-[11.5px] font-extrabold font-mono text-[#14206b] leading-tight">
                      RANK: {formattedRank}
                    </div>
                  </div>
                )}

                <div className="text-[7.5px] text-neutral-600 font-sans">
                  Date: <span className="font-mono font-bold text-neutral-900">{data.issueDate || "03/09/2026"}</span>
                </div>
              </div>

              {/* Complete 7-Row Scale of Evaluation - WBBSE (With Grade D & Fail) */}
              <div className="w-[26%] h-[134px] border border-[#14206b] rounded-xs bg-white overflow-hidden flex flex-col justify-between shadow-2xs">
                <table className="w-full border-collapse text-[7.5px] h-full">
                  <thead>
                    <tr className="bg-[#14206b] text-white text-center font-bold">
                      <th colSpan={3} className="py-0.5 text-[8.5px] tracking-wide font-sans">
                        Scale of Evaluation &ndash; WBBSE
                      </th>
                    </tr>
                    <tr className="bg-[#eef0f8] text-[#14206b] font-bold text-center border-b border-[#14206b] text-[7.5px]">
                      <th className="py-[1px] px-1 text-left pl-1.5">Range of Marks</th>
                      <th className="py-[1px] px-0.5">Grade</th>
                      <th className="py-[1px] px-1 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="font-sans">
                    {WBBSE_GRADE_SCALE.map((g, idx) => {
                      const isCurrentGrade =
                        totals.overallGrade === g.grade ||
                        (g.grade === "D" && (totals.overallPercentage < 25 || totals.overallGrade === "D"));
                      const isFailRow = g.grade === "D";

                      return (
                        <tr
                          key={g.grade}
                          className={`border-t border-[#c8cbe0] ${
                            isCurrentGrade
                              ? isFailRow
                                ? "bg-red-100 text-red-900 font-bold"
                                : "bg-amber-100 text-[#14206b] font-bold"
                              : idx % 2 === 1
                              ? "bg-slate-50/60"
                              : "bg-white"
                          }`}
                        >
                          <td className="py-[0.8px] px-1 pl-1.5 text-left font-mono text-[7.5px] font-semibold">
                            {g.range}
                          </td>
                          <td className={`py-[0.8px] px-0.5 text-center font-black text-[8.5px] ${
                            isFailRow ? "text-red-700" : "text-[#14206b]"
                          }`}>
                            {g.grade}
                          </td>
                          <td className={`py-[0.8px] px-1 text-left text-[7.5px] ${
                            isFailRow ? "text-red-700 font-bold" : "text-neutral-700"
                          }`}>
                            {g.remarks}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function MarksheetPrintableBatchView({
  marksheets,
}: {
  marksheets: MarksheetData[];
}) {
  return (
    <div className="w-full print:w-full space-y-8 print:space-y-0">
      {marksheets.map((ms, index) => (
        <div
          key={ms.studentId || index}
          className={`w-full flex justify-center ${
            index < marksheets.length - 1 ? "print:break-after-page" : ""
          }`}
          style={{
            pageBreakAfter: index < marksheets.length - 1 ? "always" : "auto",
            breakAfter: index < marksheets.length - 1 ? "page" : "auto",
          }}
        >
          <MarksheetPrintableView data={ms} />
        </div>
      ))}
    </div>
  );
}
