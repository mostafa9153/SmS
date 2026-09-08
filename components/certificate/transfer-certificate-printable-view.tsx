"use client";

import React from "react";
import {
  type SchoolProfileData,
  getSavedSchoolProfile,
  getEffectiveHeadTitle,
  cleanAddressPart,
  formatSchoolNameParts,
} from "@/lib/utils/school-profile";

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
  schoolProfile?: SchoolProfileData;
}

// Helper to convert numbers to English words
function numberToEnglishWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ` ${ones[num % 10]}` : "");
  if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? ` and ${numberToEnglishWords(num % 100)}` : "");
  if (num >= 2000 && num < 2100) {
    const rem = num - 2000;
    return rem === 0 ? "Two Thousand" : `Two Thousand and ${numberToEnglishWords(rem)}`;
  }
  if (num >= 1900 && num < 2000) {
    const rem = num - 1900;
    return rem === 0 ? "Nineteen Hundred" : `Nineteen Hundred and ${numberToEnglishWords(rem)}`;
  }
  return String(num);
}

// Parse date into Day, Month, Year in words
export function parseDobComponents(dateStr?: string) {
  if (!dateStr) {
    return {
      dayWords: "Fourth",
      monthWords: "November",
      yearWords: "Two Thousand and Eleven",
      formattedDate: "04/11/2011",
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

  return {
    dayWords: ordinalDays[d] || `${d}th`,
    monthWords: months[m - 1] || "",
    yearWords: numberToEnglishWords(y),
    formattedDate: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
  };
}

export function TransferCertificatePrintableView({
  data,
  schoolProfile,
}: TransferCertificatePrintableViewProps) {
  const profile = schoolProfile || getSavedSchoolProfile();
  const effectiveHoiTitle = data.hoiTitle || getEffectiveHeadTitle(profile);
  const logoSrc = profile.schoolLogoUrl && profile.schoolLogoUrl.trim() !== "" ? profile.schoolLogoUrl : "/school-logo.png";

  const isFemale = data.gender === "Female";
  const childOf = isFemale ? "daughter of" : "son of";
  const pronounSubject = isFemale ? "She" : "He";
  const pronounPossessive = isFemale ? "Her" : "His";
  const pronounObject = isFemale ? "her" : "him";

  const dobInfo = parseDobComponents(data.dateOfBirth);
  const dayWords = data.dateOfBirthDayWords || dobInfo.dayWords;
  const monthWords = data.dateOfBirthMonthWords || dobInfo.monthWords;
  const yearWords = data.dateOfBirthYearWords || dobInfo.yearWords;
  const dobFormatted = dobInfo.formattedDate;

  const displayVillage = cleanAddressPart(data.village, "village") || profile.village || "Marigachi";
  const displayPO = cleanAddressPart(data.postOffice, "po") || profile.postOffice || profile.village || "Mathurapur";
  const displayPS = cleanAddressPart(data.policeStation, "ps") || profile.policeStation || "Diamond Harbour";
  const displayDist = cleanAddressPart(data.district, "dist") || profile.district || "South 24 Parganas";

  const activeReason =
    data.selectedReasonIndex === 0 && data.customReason
      ? data.customReason
      : LEAVING_REASONS[data.selectedReasonIndex - 1] ||
        data.customReason ||
        "Unavoidable change of residence.";

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
          src={logoSrc}
          alt="School Watermark"
          className="w-56 h-56 object-contain opacity-[0.12] grayscale"
        />
      </div>

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* ================================================================= */}
        {/* 1. INSTITUTIONAL HEADER (MATCHING CHARACTER CERTIFICATE)          */}
        {/* ================================================================= */}
        <div className="border-b-2 border-[#1e3a8a] pt-3 pb-2.5 mt-0.5">
          <div className="flex items-center justify-between gap-3.5">
            {/* School Crest - Fits full header text height */}
            <div className="w-[84px] h-[84px] shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="School Crest"
                className="w-full h-full object-contain"
              />
            </div>

            {/* School Headings */}
            {(() => {
              const { mainName, suffix } = formatSchoolNameParts(profile.schoolName);
              return (
                <div className="text-center flex-1 space-y-0.5">
                  <h1 className="text-[20px] sm:text-[21px] font-black tracking-normal uppercase text-[#1e3a8a] font-serif leading-tight whitespace-nowrap">
                    {mainName}
                  </h1>
                  {suffix ? (
                    <div className="text-[14px] font-black tracking-wider uppercase text-[#1e3a8a] font-serif leading-none">
                      {suffix}
                    </div>
                  ) : null}
                  <p className="text-[10.5px] font-semibold text-slate-700 leading-tight pt-0.5">
                    {profile.village ? `Vill.: ${profile.village}, ` : ""}{profile.postOffice ? `P.O.: ${profile.postOffice}, ` : ""}{profile.policeStation ? `P.S.: ${profile.policeStation}, ` : ""}{profile.district ? `Dist.: ${profile.district}, ` : ""}PIN &ndash; {profile.pincode || "743349"} &bull; Mob &ndash; {profile.schoolPhone || profile.altPhone || "+91 98765 43210"}
                  </p>
                  <p className="text-[9px] font-mono font-medium text-slate-600 leading-tight pt-0.5">
                    Index No. {profile.indexNo || profile.schoolCode || "MHS-1965"} &bull; H.S. Code &ndash; {profile.hsCode || "102298"} &bull; email &ndash; {profile.schoolEmail || "contact@marigachihighschool.in"}
                  </p>
                </div>
              );
            })()}

            {/* Symmetry seal badge with Low-Opacity Official Seal & [ORIGINAL] Badge */}
            <div className="w-[80px] h-[80px] shrink-0 flex items-center justify-center relative text-[#1e3a8a]">
              <div className="w-full h-full rounded-full border border-dashed border-[#1e3a8a]/35 flex flex-col items-center justify-center p-1 relative overflow-hidden select-none bg-transparent">
                {/* Low-opacity Official Seal Text */}
                <div className="flex flex-col items-center justify-center opacity-25 select-none pointer-events-none">
                  <span className="text-[7.5px] font-sans font-bold uppercase tracking-widest leading-none mb-0.5 text-center text-slate-500">
                    OFFICIAL
                  </span>
                  <span className="text-[7px] font-sans font-semibold uppercase tracking-wider leading-none text-center text-slate-500">
                    SEAL
                  </span>
                </div>

                {/* Overlay [ORIGINAL] badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="inline-block border border-slate-700 bg-white/95 text-slate-900 font-bold text-[8.5px] uppercase px-1.5 py-0.5 rounded font-sans tracking-wide shadow-xs">
                    [{data.copyType || "Original"}]
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. CERTIFICATE TITLE & REF NO / DATE (MATCHING CHARACTER CERT)   */}
        {/* ================================================================= */}
        <div className="text-center py-1 space-y-1">
          <div className="text-[10.5px] font-mono flex items-center justify-between px-2 text-slate-700">
            <div>
              <span className="font-semibold text-slate-500">Ref. No.: </span>
              <span className="font-bold text-slate-900">{data.certificateNo || "MHS/TC/2026/0001"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Date: </span>
              <span className="font-bold text-slate-900">{data.issueDate}</span>
            </div>
          </div>

          <div className="pt-0.5">
            <div className="inline-block relative">
              <h2 className="text-[14.5px] px-6 py-0.5 border-b-[2px] border-t-[2px] font-extrabold uppercase tracking-wider text-[#1e3a8a] border-[#1e3a8a]">
                TRANSFER CERTIFICATE
              </h2>
            </div>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-sans font-semibold mt-0.5">
              To Whom It May Concern
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. CERTIFICATE BODY TEXT (LARGER FONT & LUXURIOUS SIDE MARGINS)   */}
        {/* ================================================================= */}
        <div className="space-y-2.5 text-[13px] leading-[1.85] text-slate-800 text-justify px-4 sm:px-5 font-serif my-auto">
          {/* Paragraph 1: Certification, parentage, address & date of leaving */}
          <p>
            Certified that{" "}
            <span className="font-extrabold uppercase text-[#1e3a8a] border-b border-dotted border-slate-700 px-0.5">{data.studentName || "________________________"}</span>,{" "}
            {childOf}{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.fatherName || "________________________"}</span>, an inhabitant of Village:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayVillage}</span>, P.O.:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayPO}</span>, P.S.:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayPS}</span>, in the District of{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayDist}</span>, left this school on{" "}
            <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{data.dateOfLeaving || data.issueDate}</span>.
          </p>

          {/* Paragraph 2: Date of Birth in words */}
          <p>
            {pronounPossessive} date of birth, as recorded in the Admission Register, is the{" "}
            <span className="font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{dayWords}</span> day of{" "}
            <span className="font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{monthWords}</span>,{" "}
            <span className="font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{yearWords}</span>{" "}
            (in figures: <span className="font-mono font-bold text-slate-900">{dobFormatted}</span>).
          </p>

          {/* Paragraph 3: Class & Promotion Status */}
          <p>
            {pronounSubject} was studying in Class{" "}
            <span className="font-bold text-[#1e3a8a] border-b border-dotted border-slate-700 px-1">{data.readingClass || "IX"}</span> during the academic session{" "}
            <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-700 px-1">{data.academicSession || "2026"}</span>, and{" "}
            {data.isCourseCompleted ? (
              <span className="font-semibold text-slate-950">has successfully completed the school course of studies</span>
            ) : data.hasPassedAnnualExam ? (
              <>
                <span className="font-semibold text-slate-950">has passed the Annual Examination for promotion to</span>{" "}
                <span className="font-bold text-[#1e3a8a]">Class {data.promotedClass || "X"}</span>
              </>
            ) : (
              <span className="font-semibold text-slate-950">had not passed the Annual Examination for promotion to the higher class</span>
            )}
            .
          </p>

          {/* Paragraph 4: Financial Clearance */}
          <p>
            All dues and school fees have been paid by {pronounObject} up to{" "}
            <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">{data.feesClearedUpToDate || data.dateOfLeaving || data.issueDate}</span>.
          </p>

          {/* Paragraph 5: Character & Reason for Leaving */}
          <div className="pt-0.5 space-y-1">
            <p>
              <span className="font-semibold text-slate-900">Character: </span>
              <span className="font-bold text-slate-950 uppercase tracking-wide border-b border-dotted border-slate-700 px-1">
                {data.conduct || "GOOD"}
              </span>
            </p>
            <p className="pt-0.5">
              <span className="font-semibold text-slate-900">Reason for Leaving: </span>
              <span className="italic font-semibold text-slate-950 border-b border-dotted border-slate-700 px-1">
                {activeReason}
              </span>
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. FOOTER & SIGNATURES (MATCHING CHARACTER CERTIFICATE)           */}
        {/* ================================================================= */}
        <div className="pt-2 border-t border-slate-300 mt-auto">
          <div className="flex items-end justify-between px-2">
            {/* Left: Prepared by */}
            <div className="text-left space-y-0.5">
              <div className="h-6 flex items-end">
                <span className="w-24 border-b border-slate-400 inline-block" />
              </div>
              <p className="text-[10.5px] font-bold text-slate-900 uppercase">
                PREPARED BY
              </p>
              <p className="text-[8.5px] text-slate-500 font-sans">
                Office Staff
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
              <div className="h-8 w-28 flex items-end justify-center" />
              <p className="text-[11px] font-bold text-slate-950 uppercase mt-0.5 leading-tight">
                {effectiveHoiTitle}
              </p>
              <p className="text-[9.5px] font-medium text-slate-700 leading-tight">
                {profile.schoolName || "Marigachi High School (H.S.)"}
              </p>
              <p className="text-[8.5px] text-slate-500 font-sans leading-tight">
                {profile.policeStation || "Mathurapur"}, {profile.district || "South 24 Parganas"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
