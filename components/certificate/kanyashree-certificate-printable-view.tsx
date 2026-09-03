"use client";

import React from "react";

export interface KanyashreeCertificateData {
  certificateNo: string;
  issueDate: string;
  schemeType?: string; // "Kanyashree Prakalpa (K1/K2)" | "Aikyashree" | "Oasis" | "Institutional Bonafide"

  // Student Particulars
  studentId: string;
  kanyashreeId?: string;
  pen?: string;
  studentName: string;
  gender: "Female" | "Male" | "Other";
  fatherName: string;
  motherName?: string;

  // Address
  village: string;
  postOffice: string;
  policeStation: string;
  district: string;
  pincode: string;

  // Academic Info
  academicSession: string;
  presentClass: string;
  presentSection: string;
  presentRoll: string;

  // Date of Birth
  dateOfBirth: string; // ISO date or DD/MM/YYYY
  dateOfBirthWords?: string;

  // Marital Status & Character
  isUnmarried: boolean;
  conduct: string;
  remarks?: string;

  // School Authority
  headmasterTitle?: string;
}

interface KanyashreeCertificatePrintableViewProps {
  data: KanyashreeCertificateData;
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

export function KanyashreeCertificatePrintableView({
  data,
}: KanyashreeCertificatePrintableViewProps) {
  const isFemale = data.gender === "Female";
  const childOf = isFemale ? "daughter of" : "son of";
  const pronounSubject = isFemale ? "She" : "He";
  const pronounPossessive = isFemale ? "her" : "his";
  const pronounObject = isFemale ? "her" : "him";

  const dobDisplay = data.dateOfBirth
    ? data.dateOfBirth.includes("-")
      ? data.dateOfBirth.split("-").reverse().join("/")
      : data.dateOfBirth
    : "DD/MM/YYYY";

  const dobInWords = data.dateOfBirthWords || formatDobToWords(data.dateOfBirth);

  return (
    <div
      id="pure-a5-kanyashree-sheet"
      className="relative bg-[#fffdf7] text-slate-900 border-[2.5px] border-[#9333ea] shadow-2xl print:shadow-none print:m-0 print:border-[2.5px] print:border-[#9333ea] font-serif box-border select-none mx-auto overflow-hidden flex flex-col justify-between p-4.5 print:p-4 w-[148mm] h-[210mm] min-w-[148mm] max-w-[148mm] min-h-[210mm] max-h-[210mm]"
      style={{
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {/* Outer Ornate Double Border Ring - Fits tightly 3.5mm from paper edges */}
      <div className="absolute inset-1 border border-[#9333ea]/40 pointer-events-none" />
      <div className="absolute inset-1.5 border-[0.5px] border-dashed border-[#9333ea]/30 pointer-events-none" />

      {/* Decorative Corner Rosettes */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#9333ea] pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#9333ea] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#9333ea] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#9333ea] pointer-events-none" />

      {/* Background Institutional Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/school-logo.png"
          alt="School Watermark"
          className="w-48 h-48 object-contain opacity-[0.045] grayscale"
        />
      </div>

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* =================================================================== */}
        {/* 1. INSTITUTIONAL HEADER                                             */}
        {/* =================================================================== */}
        <div className="border-b-2 border-[#9333ea] pb-2">
          <div className="flex items-center justify-between gap-2.5">
            {/* School Crest */}
            <div className="w-12 h-12 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/school-logo.png"
                alt="Marigachi High School Crest"
                className="w-full h-full object-contain"
              />
            </div>

            {/* School Headings */}
            <div className="text-center flex-1">
              <h1 className="text-[14.5px] font-extrabold tracking-tight uppercase text-[#9333ea] font-serif leading-tight">
                MARIGACHI HIGH SCHOOL (H.S.)
              </h1>
              <p className="text-[9px] font-semibold text-slate-700 tracking-wide mt-0.5">
                (Co-Educational &bull; Established 1966 &bull; Govt. Sponsored)
              </p>
              <p className="text-[8px] text-slate-600 leading-tight mt-0.5">
                Vill. &amp; P.O.: Kharigachi, P.S.: Diamond Harbour, Dist.: South 24 Parganas, PIN: 743368
              </p>
              <p className="text-[7.5px] font-mono text-slate-500 mt-0.5">
                Index: C2-121 &bull; H.S. Code: 102298 &bull; UDISE: 19180201004 &bull; Phone: (03174) 211-926
              </p>
            </div>

            {/* Symmetry seal badge */}
            <div className="w-11 h-11 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border border-dashed border-[#9333ea]/40 flex items-center justify-center text-[7px] font-sans font-semibold text-slate-400 uppercase text-center p-0.5 leading-none">
                Official Seal
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. CERTIFICATE TITLE & REF NO                                       */}
        {/* =================================================================== */}
        <div className="text-center py-1.5 space-y-1">
          <div className="text-[9px] font-mono flex items-center justify-between px-1 text-slate-700">
            <div>
              <span className="font-semibold text-slate-500">Ref. No.: </span>
              <span className="font-bold text-slate-900">{data.certificateNo || "MHS/KP/2026/0001"}</span>
            </div>
            {data.kanyashreeId && (
              <div>
                <span className="font-semibold text-slate-500">KP ID: </span>
                <span className="font-bold text-slate-900 font-mono">{data.kanyashreeId}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-500">Date: </span>
              <span className="font-bold text-slate-900">{data.issueDate}</span>
            </div>
          </div>

          <div className="pt-0.5">
            <div className="inline-block relative">
              <h2 className="text-[13px] px-4 py-0.5 border-b-[2px] border-t-[2px] font-bold uppercase tracking-wider text-[#9333ea] border-[#9333ea]">
                KANYASHREE PRAKALPA CERTIFICATE
              </h2>
            </div>
            <p className="text-[8px] uppercase tracking-widest text-slate-600 font-sans font-bold mt-0.5">
              (INSTITUTIONAL BONAFIDE &amp; UNMARRIED DECLARATION &bull; K1 / K2 SCHEME)
            </p>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. CERTIFICATE BODY (BALANCED, LEGIBLE & AIRY)                      */}
        {/* =================================================================== */}
        <div className="space-y-2.5 text-[11.5px] leading-[1.8] text-slate-800 text-justify px-1 font-serif my-auto">
          <p>
            This is to certify that{" "}
            <span className="font-extrabold uppercase text-[#9333ea] border-b border-dotted border-slate-700 px-0.5">{data.studentName || "________________________"}</span>,{" "}
            {childOf}{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.fatherName || "________________________"}</span>
            {data.motherName ? (
              <> and <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.motherName}</span></>
            ) : null}, residing at Village:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.village || "Marigachi"}</span>, P.O.:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.postOffice || "Kharigachi"}</span>, P.S.:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.policeStation || "Diamond Harbour"}</span>, District:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.district || "South 24 Parganas"}</span>, PIN:{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5 font-mono">{data.pincode || "743368"}</span>, is a bona fide regular student of this institution.
          </p>

          <p>
            {pronounSubject} is presently reading in{" "}
            <span className="font-bold text-[#9333ea]">
              Class {data.presentClass || "X"}
            </span>{" "}
            (Section: <span className="font-bold text-slate-900">{data.presentSection || "A"}</span>, Roll No.: <span className="font-bold text-slate-900 font-mono">{data.presentRoll || "01"}</span>) in the academic session{" "}
            <span className="font-mono font-bold text-slate-900">{data.academicSession || "2026"}</span>.
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
            {data.isUnmarried && (
              <>To the best of our institutional knowledge and records, {pronounSubject.toLowerCase()} is <strong className="font-extrabold text-slate-950 underline decoration-dotted">unmarried</strong>. </>
            )}
            {data.remarks ||
              `${pronounSubject} is an honest, energetic, and sincere student bearing an ${data.conduct || "exemplary moral character"} and disciplined conduct. I wish ${pronounObject} every success and empowerment in all future academic pursuits and career endeavors.`}
          </p>
        </div>

        {/* =================================================================== */}
        {/* 4. FOOTER & SIGNATURES (SOLIDLY ANCHORED)                           */}
        {/* =================================================================== */}
        <div className="pt-2 border-t border-slate-300 mt-auto">
          <div className="flex items-end justify-between px-1">
            {/* Left: Prepared by */}
            <div className="text-left space-y-0.5">
              <div className="h-6 flex items-end">
                <span className="w-24 border-b border-slate-400 inline-block" />
              </div>
              <p className="text-[9.5px] font-bold text-slate-900 uppercase">
                Prepared By
              </p>
              <p className="text-[7.5px] text-slate-500 font-sans">
                Office Staff
              </p>
            </div>

            {/* Middle: Round Seal */}
            <div className="text-center pb-0.5">
              <div className="w-13 h-13 rounded-full border border-dashed border-slate-400 flex items-center justify-center font-sans font-bold text-[7px] text-slate-400 uppercase text-center p-1 leading-tight">
                Institutional Seal
              </div>
            </div>

            {/* Right: Headmaster Signature & Seal */}
            <div className="text-center flex flex-col items-center">
              <div className="h-8 w-28 flex items-end justify-center relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hod-signature.png"
                  alt="Headmaster Signature"
                  className="max-h-7 object-contain select-none"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-950 uppercase mt-0.5 leading-tight">
                {data.headmasterTitle || "Teacher-in-Charge / Headmaster"}
              </p>
              <p className="text-[8.5px] font-medium text-slate-700 leading-tight">
                Marigachi High School (H.S.)
              </p>
              <p className="text-[7.5px] text-slate-500 font-sans leading-tight">
                Diamond Harbour, South 24 Pgs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
