"use client";

import React from "react";

export interface TransferCertificateData {
  certificateNo: string;
  issueDate: string;
  copyType: "Original" | "Duplicate" | "Office Copy";

  // Student Particulars
  studentId: string;
  studentName: string;
  gender: "Male" | "Female" | "Other";
  fatherName: string;
  motherName?: string;

  // Address
  village: string;
  postOffice: string;
  policeStation: string;
  district: string;
  pincode: string;

  // School Leaving Details
  dateOfLeaving: string;
  academicSession: string;
  readingClass: string;
  hasPassedAnnualExam: boolean;
  promotedClass?: string;
  isCourseCompleted?: boolean;

  // Date of Birth
  dateOfBirth: string; // ISO or DD/MM/YYYY
  dateOfBirthDayWords?: string;
  dateOfBirthMonthWords?: string;
  dateOfBirthYearWords?: string;

  // Financial & Conduct
  feesClearedUpToDate: string;
  conduct: string;
  selectedReasonIndex: number; // 1 to 5, or 0 for custom
  customReason?: string;

  // Head of Institution
  hoiTitle?: string;
}

export const LEAVING_REASONS = [
  "Unavoidable change of residence.",
  "Ill health.",
  "Completion of the school course.",
  "Option of the guardian.",
  "Minor or private reason.",
];

interface TransferCertificatePrintableViewProps {
  data: TransferCertificateData;
}

// Convert number to words, e.g. 10 -> "Ten"
function numberToWords(num: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen", "Twenty", "Twenty-One", "Twenty-Two",
    "Twenty-Three", "Twenty-Four", "Twenty-Five", "Twenty-Six", "Twenty-Seven",
    "Twenty-Eight", "Twenty-Nine", "Thirty", "Thirty-One"
  ];
  return ones[num] || String(num);
}

// Parse date into Day, Month, Year in words
export function parseDobComponents(dateStr?: string) {
  if (!dateStr) {
    return {
      dayWords: "Fifteenth",
      monthWords: "August",
      yearWords: "Ten",
      formattedDate: "15/08/2010",
    };
  }

  const parts = dateStr.includes("-") ? dateStr.split("-") : dateStr.split("/");
  let y: number, m: number, d: number;
  if (dateStr.includes("-")) {
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
  } else {
    d = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    y = parseInt(parts[2], 10);
  }

  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return {
      dayWords: dateStr,
      monthWords: "",
      yearWords: "",
      formattedDate: dateStr,
    };
  }

  const ordinalDays = [
    "", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth",
    "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth",
    "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth", "Twenty-First", "Twenty-Second",
    "Twenty-Third", "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh",
    "Twenty-Eighth", "Twenty-Ninth", "Thirtieth", "Thirty-First"
  ];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const yearSuffix = y >= 2000 ? y - 2000 : y;
  const yearInWords = numberToWords(yearSuffix);

  return {
    dayWords: ordinalDays[d] || `${d}th`,
    monthWords: months[m - 1] || "",
    yearWords: yearInWords,
    formattedDate: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  };
}

export function TransferCertificatePrintableView({
  data,
}: TransferCertificatePrintableViewProps) {
  const isFemale = data.gender === "Female";
  const childOf = isFemale ? "Daughter of" : "Son of";
  const pronounSubject = isFemale ? "She" : "He";
  const pronounPossessive = isFemale ? "Her" : "His";
  const pronounObject = isFemale ? "her" : "him";

  const dobInfo = parseDobComponents(data.dateOfBirth);
  const dayWords = data.dateOfBirthDayWords || dobInfo.dayWords;
  const monthWords = data.dateOfBirthMonthWords || dobInfo.monthWords;
  const yearWords = data.dateOfBirthYearWords || dobInfo.yearWords;
  const dobFormatted = dobInfo.formattedDate;

  return (
    <div
      id="pure-a5-tc-sheet"
      className="relative bg-[#fffdf7] text-slate-900 border-[2.5px] border-[#1e3a8a] shadow-2xl print:shadow-none print:m-0 print:border-[2.5px] print:border-[#1e3a8a] font-serif box-border select-none mx-auto overflow-hidden flex flex-col justify-between p-4.5 print:p-3.5 w-[148mm] h-[210mm] min-w-[148mm] max-w-[148mm] min-h-[210mm] max-h-[210mm]"
      style={{
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {/* Outer Double Border Inset */}
      <div className="absolute inset-1 border border-[#1e3a8a]/40 pointer-events-none" />
      <div className="absolute inset-1.5 border-[0.5px] border-dashed border-[#1e3a8a]/30 pointer-events-none" />

      {/* Decorative Corner Rosettes */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#1e3a8a] pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#1e3a8a] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#1e3a8a] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#1e3a8a] pointer-events-none" />

      {/* Institutional Watermark with 0.12 intensity */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/school-logo.png"
          alt="School Watermark"
          className="w-56 h-56 object-contain opacity-[0.12] grayscale"
        />
      </div>

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* ================================================================= */}
        {/* 1. TOP HEADER & METADATA (LARGE CREST & PROMINENT BRANDING)       */}
        {/* ================================================================= */}
        <div className="border-b-2 border-[#1e3a8a] pt-1 pb-1.5">
          {/* Top identifiers row: No. (Left) - Crest (Center) - Copy Type (Right) */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-700 px-2 mb-1">
            <div>
              <span className="font-semibold text-slate-500">No.- </span>
              <strong className="text-slate-900 font-bold">{data.certificateNo || "MHS/TC/2026/0001"}</strong>
            </div>

            {/* School Crest Centered - Enlarged */}
            <div className="w-16 h-16 shrink-0 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/school-logo.png"
                alt="Marigachi High School Crest"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="text-right">
              <span className="inline-block border border-slate-700 bg-slate-100 text-slate-900 font-bold text-[9px] uppercase px-2 py-0.5 rounded font-sans">
                [{data.copyType || "Original"}]
              </span>
            </div>
          </div>

          {/* School Name & Official Details */}
          <div className="text-center space-y-0.5">
            <h1 className="text-[19px] font-black tracking-normal uppercase text-[#1e3a8a] font-serif leading-none">
              MARIGACHI HIGH SCHOOL
            </h1>
            <p className="text-[10px] font-bold text-slate-700 leading-tight pt-1">
              (Co-Educational) &nbsp;&bull;&nbsp; (Govt. Aided)
            </p>
            <p className="text-[9px] text-slate-600 leading-tight pt-0.5">
              Marigachi, Diamond Harbour, S. 24 Parganas, PIN &ndash; 743368 &bull; Mob &ndash; 9800971797
            </p>
            <p className="text-[8.5px] font-mono text-slate-500 leading-tight pt-0.5">
              Index No. C2-121 &bull; H.S. Code &ndash; 102298 &bull; email &ndash; marigachihighschool@gmail.com
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. TITLE BANNER                                                   */}
        {/* ================================================================= */}
        <div className="text-center py-1.5">
          <div className="inline-block relative">
            <h2 className="text-[14px] px-6 py-0.5 border-b-[2px] border-t-[2px] font-extrabold uppercase tracking-wider text-[#1e3a8a] border-[#1e3a8a]">
              TRANSFER CERTIFICATE
            </h2>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-slate-600 font-sans font-bold mt-0.5">
            [BONAFIDE CERTIFICATE]
          </p>
        </div>

        {/* ================================================================= */}
        {/* 3. CERTIFICATE BODY TEXT (LARGER FONT & LUXURIOUS SIDE MARGINS)   */}
        {/* ================================================================= */}
        <div className="space-y-2 text-[12px] leading-[1.8] text-slate-800 text-justify px-4 sm:px-5 font-serif my-auto">
          {/* Paragraph 1: Certification, parentage, address & date of leaving */}
          <p>
            Certified that{" "}
            <span className="font-extrabold uppercase text-[#1e3a8a] border-b border-dotted border-slate-700 px-0.5">{data.studentName || "________________________"}</span>,{" "}
            {childOf}{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.fatherName || "________________________"}</span>, an inhabitant of Village{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.village || "Marigachi"}</span>, P.O.{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.postOffice || "Kharigachi"}</span>, in the District of{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.district || "South 24 Parganas"}</span>, left this school on{" "}
            <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{data.dateOfLeaving || data.issueDate}</span>.
          </p>

          {/* Paragraph 2: Date of Birth in words */}
          <p>
            {pronounPossessive} date of birth as recorded in the Admission Register was{" "}
            <span className="font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{dayWords}</span> day of{" "}
            <span className="font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{monthWords}</span>, Two Thousand and{" "}
            <span className="font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{yearWords}</span>{" "}
            (in figures: <span className="font-mono font-bold text-slate-900">{dobFormatted}</span>).
          </p>

          {/* Paragraph 3: Class & Promotion Status */}
          <p>
            {pronounSubject} was reading in class{" "}
            <span className="font-bold text-[#1e3a8a] border-b border-dotted border-slate-700 px-1">Class {data.readingClass || "X"}</span> in the session{" "}
            <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-700 px-1">{data.academicSession || "2026"}</span>, and{" "}
            {data.isCourseCompleted ? (
              <span className="font-semibold text-slate-950">has successfully completed the school course of studies</span>
            ) : data.hasPassedAnnualExam ? (
              <>
                <span className="font-semibold text-slate-950">had passed</span> the Annual Examination for promotion to{" "}
                <span className="font-bold text-[#1e3a8a]">Class {data.promotedClass || "XI"}</span>
              </>
            ) : (
              <span className="font-semibold text-slate-950">had not passed the Annual Examination for promotion to the higher class</span>
            )}
            .
          </p>

          {/* Paragraph 4: Financial Clearance & Character */}
          <p>
            All sums due by {pronounObject} have been paid viz. : Fees and fines up to{" "}
            <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{data.feesClearedUpToDate || data.issueDate}</span>.
          </p>

          <p>
            Character :{" "}
            <span className="font-bold text-slate-950 uppercase tracking-wide border-b border-dotted border-slate-700 px-1">{data.conduct || "GOOD"}</span>.
          </p>

          {/* Paragraph 5: Reasons for Leaving (Numbered List with active selection) */}
          <div className="pt-0.5 space-y-0.5 text-[10.5px]">
            <span className="font-bold text-slate-900 block text-[11px]">Reasons for Leaving :</span>
            <div className="grid grid-cols-1 pl-2 space-y-0.5">
              {LEAVING_REASONS.map((reason, idx) => {
                const isSelected = data.selectedReasonIndex === idx + 1;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 ${
                      isSelected
                        ? "font-extrabold text-[#1e3a8a] bg-blue-50/80 px-1.5 py-0.5 rounded"
                        : "text-slate-600"
                    }`}
                  >
                    <span className="font-mono text-[10px] w-3.5 shrink-0">
                      {isSelected ? "✔" : `${idx + 1}.`}
                    </span>
                    <span className={isSelected ? "underline decoration-dotted" : ""}>
                      {reason}
                    </span>
                  </div>
                );
              })}
              {data.selectedReasonIndex === 0 && data.customReason && (
                <div className="flex items-center gap-1.5 font-extrabold text-[#1e3a8a] bg-blue-50/80 px-1.5 py-0.5 rounded">
                  <span className="font-mono text-[10px] w-3.5 shrink-0">✔</span>
                  <span>{data.customReason}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. FOOTER SIGNATURES & OFFICIAL SEAL                              */}
        {/* ================================================================= */}
        <div className="pt-1.5 border-t border-slate-300 mt-auto">
          <div className="flex items-end justify-between px-2">
            {/* Left: Issue Date */}
            <div className="text-left space-y-0.5 pb-0.5">
              <p className="text-[11px] font-bold text-slate-900">
                Date : <span className="font-mono font-semibold">{data.issueDate}</span>
              </p>
              <p className="text-[8.5px] text-slate-500 font-sans">
                Office of Marigachi High School
              </p>
            </div>

            {/* Middle: Round Seal */}
            <div className="text-center pb-0.5">
              <div className="w-14 h-14 rounded-full border border-dashed border-slate-400 flex items-center justify-center font-sans font-bold text-[8px] text-slate-400 uppercase text-center p-1 leading-tight">
                Institutional Seal
              </div>
            </div>

            {/* Right: Signature of HOI */}
            <div className="text-center flex flex-col items-center">
              <div className="h-8 w-28 flex items-end justify-center relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hod-signature.png"
                  alt="Signature of HOI"
                  className="max-h-7 object-contain select-none"
                />
              </div>
              <p className="text-[11px] font-bold text-slate-950 uppercase mt-0.5 leading-tight">
                {data.hoiTitle || "SIGNATURE OF HOI"}
              </p>
              <p className="text-[9.5px] font-medium text-slate-700 leading-tight">
                Marigachi High School (H.S.)
              </p>
              <p className="text-[8.5px] text-slate-500 font-sans leading-tight">
                Diamond Harbour, South 24 Pgs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
