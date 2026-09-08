"use client";

import React from "react";
import {
  type SchoolProfileData,
  getSavedSchoolProfile,
  getEffectiveHeadTitle,
  cleanAddressPart,
  formatSchoolNameParts,
} from "@/lib/utils/school-profile";

export interface PassCertificateData {
  certificateNo: string;
  issueDate: string;
  copyType?: "Original" | "Duplicate" | "Office Copy";

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

  // Academic History
  admissionYear: string;
  admissionClass: string;
  passingYear: string;
  passedClass: string;
  eligibleForClass?: string;
  isCompletedOrPassedOut?: boolean;

  // Official DOB Record
  dateOfBirth: string; // ISO date or DD/MM/YYYY
  dateOfBirthWords?: string;

  // Conduct & Remarks
  conduct: string;
  remarks?: string;

  // School Metadata
  headmasterTitle?: string;
}

interface PassCertificatePrintableViewProps {
  data: PassCertificateData;
  schoolProfile?: SchoolProfileData;
}

// Convert DD/MM/YYYY or YYYY-MM-DD to words, e.g. "15th August Two Thousand Ten"
export function formatDobToWords(dateStr?: string): string {
  if (!dateStr) return "";
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

  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const ones = [
    "", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth",
    "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth",
    "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth", "Twenty-First", "Twenty-Second",
    "Twenty-Third", "Twenty-Fourth", "Twenty-Fifth", "Twenty-Sixth", "Twenty-Seventh",
    "Twenty-Eighth", "Twenty-Ninth", "Thirtieth", "Thirty-First"
  ];

  const monthName = months[m - 1] || "";
  const dayName = ones[d] || `${d}th`;

  return `${dayName} ${monthName}, ${y}`;
}

export function PassCertificatePrintableView({ data, schoolProfile }: PassCertificatePrintableViewProps) {
  const profile = schoolProfile || getSavedSchoolProfile();
  const effectiveHeadTitle = data.headmasterTitle || getEffectiveHeadTitle(profile);
  const logoSrc = profile.schoolLogoUrl && profile.schoolLogoUrl.trim() !== "" ? profile.schoolLogoUrl : "/school-logo.png";

  const isFemale = data.gender === "Female";
  const childOf = isFemale ? "daughter of" : "son of";
  const pronounSubject = isFemale ? "She" : "He";
  const pronounPossessive = isFemale ? "her" : "his";
  const pronounObject = isFemale ? "her" : "him";

  const displayVillage = cleanAddressPart(data.village, "village") || profile.village || "Marigachi";
  const displayPO = cleanAddressPart(data.postOffice, "po") || profile.postOffice || profile.village || "Marigachi";
  const displayPS = cleanAddressPart(data.policeStation, "ps") || profile.policeStation || "Mathurapur";
  const displayDist = cleanAddressPart(data.district, "dist") || profile.district || "South 24 Parganas";
  const displayPin = (data.pincode || "").replace(/\D/g, "") || profile.pincode || "743349";

  const dobDisplay = data.dateOfBirth
    ? data.dateOfBirth.includes("-")
      ? data.dateOfBirth.split("-").reverse().join("/")
      : data.dateOfBirth
    : "DD/MM/YYYY";

  const dobInWords = data.dateOfBirthWords || formatDobToWords(data.dateOfBirth);

  return (
    <div
      id="pure-a5-pass-certificate-sheet"
      className="relative bg-[#fffdf7] text-slate-900 border-[2.5px] border-[#0f766e] shadow-2xl print:shadow-none print:m-0 print:border-[2.5px] print:border-[#0f766e] font-serif box-border select-none mx-auto overflow-hidden flex flex-col justify-between p-4.5 print:p-4 w-[148mm] h-[210mm] min-w-[148mm] max-w-[148mm] min-h-[210mm] max-h-[210mm]"
      style={{
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {/* Outer Ornate Double Border Ring - Fits tightly 3.5mm from paper edges */}
      <div className="absolute inset-1 border border-[#0f766e]/40 pointer-events-none" />
      <div className="absolute inset-1.5 border-[0.5px] border-dashed border-[#0f766e]/30 pointer-events-none" />

      {/* Decorative Corner Rosettes */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#0f766e] pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#0f766e] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#0f766e] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#0f766e] pointer-events-none" />

      {/* Background Institutional Watermark with 0.12 intensity */}
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
        {/* =================================================================== */}
        {/* 1. INSTITUTIONAL HEADER (LOWERED & PERFECTLY FITTED CREST)          */}
        {/* =================================================================== */}
        <div className="border-b-2 border-[#0f766e] pt-3 pb-2.5 mt-0.5">
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
                  <h1 className="text-[20px] sm:text-[21px] font-black tracking-normal uppercase text-[#0f766e] font-serif leading-tight whitespace-nowrap">
                    {mainName}
                  </h1>
                  {suffix ? (
                    <div className="text-[14px] font-black tracking-wider uppercase text-[#0f766e] font-serif leading-none">
                      {suffix}
                    </div>
                  ) : null}
                  <p className="text-[10.5px] font-semibold text-slate-700 leading-tight pt-0.5">
                    {profile.village ? `Vill.: ${profile.village}, ` : ""}{profile.postOffice ? `P.O.: ${profile.postOffice}, ` : ""}{profile.policeStation ? `P.S.: ${profile.policeStation}, ` : ""}{profile.district ? `Dist.: ${profile.district}, ` : ""}PIN: {profile.pincode || "743349"}
                  </p>
                  <p className="text-[9px] font-mono font-medium text-slate-600 pt-0.5">
                    Index: {profile.indexNo || profile.schoolCode || "MHS-1965"} &bull; H.S. Code: {profile.hsCode || "102298"} &bull; UDISE: {profile.udiseCode || "19111305602"} &bull; Phone: {profile.schoolPhone || profile.altPhone || "+91 98765 43210"}
                  </p>
                </div>
              );
            })()}

            {/* Symmetry seal badge with Low-Opacity Official Seal & [ORIGINAL] Badge */}
            <div className="w-[80px] h-[80px] shrink-0 flex items-center justify-center relative text-[#0f766e]">
              <div className="w-full h-full rounded-full border border-dashed border-[#0f766e]/35 flex flex-col items-center justify-center p-1 relative overflow-hidden select-none bg-transparent">
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

        {/* =================================================================== */}
        {/* 2. CERTIFICATE TITLE & REF NO                                       */}
        {/* =================================================================== */}
        <div className="text-center py-1.5 space-y-1">
          <div className="text-[10.5px] font-mono flex items-center justify-between px-2 text-slate-700">
            <div>
              <span className="font-semibold text-slate-500">Ref. No.: </span>
              <span className="font-bold text-slate-900">{data.certificateNo || "MHS/POC/2026/0001"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Date: </span>
              <span className="font-bold text-slate-900">{data.issueDate}</span>
            </div>
          </div>

          <div className="pt-0.5">
            <div className="inline-block relative">
              <h2 className="text-[14px] px-6 py-0.5 border-b-[2px] border-t-[2px] font-extrabold uppercase tracking-wider text-[#0f766e] border-[#0f766e]">
                PASS OUT &amp; COMPLETION CERTIFICATE
              </h2>
            </div>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-sans font-semibold mt-0.5">
              To Whom It May Concern
            </p>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. CERTIFICATE BODY (LARGER FONT WITH LUXURIOUS SIDE MARGINS)       */}
        {/* =================================================================== */}
        <div className="space-y-2.5 text-[13px] leading-[1.85] text-slate-800 text-justify px-4 sm:px-5 font-serif my-auto">
          <p>
            This is to certify that{" "}
            <span className="font-extrabold uppercase text-[#0f766e] border-b border-dotted border-slate-700 px-0.5">{data.studentName || "________________________"}</span>, {childOf}{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.fatherName || "________________________"}</span>, residing at Village:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayVillage}</span>, P.O.:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayPO}</span>, P.S.:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayPS}</span>, District:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayDist}</span>, PIN:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5 font-mono">{displayPin}</span>, was a bona fide regular student of this institution.
          </p>

          <p>
            {pronounSubject} was initially admitted into{" "}
            <span className="font-bold text-slate-950">
              {data.admissionClass ? `Class ${data.admissionClass}` : "Class V"}
            </span>{" "}
            in the academic session{" "}
            <span className="font-mono font-bold text-slate-900">
              {data.admissionYear || "2021"}
            </span>, and having successfully appeared in and passed the Annual / Final Examination of{" "}
            <span className="font-bold text-[#0f766e]">
              Class {data.passedClass || "X"}
            </span>{" "}
            in the academic session{" "}
            <span className="font-mono font-bold text-slate-900">
              {data.passingYear || "2026"}
            </span>
            {data.isCompletedOrPassedOut ? (
              <>, has successfully completed {pronounPossessive} course of studies and passed out from this institution.</>
            ) : (
              <>, has qualified for promotion to <span className="font-bold text-slate-950">Class {data.eligibleForClass || "XI"}</span>.</>
            )}
          </p>

          <p>
            According to the official School Admission Register, {pronounPossessive} recorded Date of Birth is{" "}
            <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-1">
              {dobDisplay}
            </span>
            {dobInWords ? (
              <> (in words: <span className="italic font-medium text-slate-900">{dobInWords}</span>)</>
            ) : null}
            .
          </p>

          <p>
            {data.remarks ||
              `To the best of my knowledge, ${pronounSubject.toLowerCase()} bears an ${data.conduct || "exemplary moral character"} and upright conduct during ${pronounPossessive} academic tenure. I wish ${pronounObject} every success and prosperity in all future academic pursuits and career endeavors.`}
          </p>
        </div>

        {/* =================================================================== */}
        {/* 4. FOOTER & SIGNATURES (SOLIDLY ANCHORED)                           */}
        {/* =================================================================== */}
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

            {/* Right: Headmaster Signature & Seal */}
            <div className="text-center flex flex-col items-center">
              <div className="h-8 w-28 flex items-end justify-center" />
              <p className="text-[11px] font-bold text-slate-950 uppercase mt-0.5 leading-tight">
                {effectiveHeadTitle}
              </p>
              <p className="text-[9.5px] font-medium text-slate-700 leading-tight">
                {profile.schoolName || "Marigachi High School (H.S.)"}
              </p>
              <p className="text-[8.5px] text-slate-500 font-sans leading-tight">
                {profile.policeStation || "Diamond Harbour"}, {profile.district || "South 24 Pgs"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
