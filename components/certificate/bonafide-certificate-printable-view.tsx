"use client";

import React from "react";
import QRCode from "react-qr-code";
import {
  type SchoolProfileData,
  getSavedSchoolProfile,
  getEffectiveHeadTitle,
  cleanAddressPart,
  formatSchoolNameParts,
} from "@/lib/utils/school-profile";

export interface BonafideCertificateData {
  paperSize?: "A5" | "A4";
  certificateNo: string;
  issueDate: string;
  copyType?: "Original" | "Duplicate" | "Office Copy";
  academicSession: string;

  // Student Particulars
  studentId: string;
  pen?: string;
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

  // Academic Details
  presentClass: string;
  presentSection: string;
  presentRoll: string;

  // DOB
  dateOfBirth: string; // ISO or DD/MM/YYYY
  dateOfBirthWords?: string;

  // Conduct & Purpose
  conduct: string;
  purpose: string; // e.g. "Scholarship Application (OASIS / SVMCM)", "Opening a Bank Account", "Passport Verification", "Official Purpose"
  remarks?: string;

  // Signatory
  headmasterTitle?: string;
}

interface BonafideCertificatePrintableViewProps {
  data: BonafideCertificateData;
  schoolProfile?: SchoolProfileData;
}

function numberToEnglishWords(num: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " " + numberToEnglishWords(num % 100) : "");
  }
  if (num < 100000) {
    return numberToEnglishWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + numberToEnglishWords(num % 1000) : "");
  }
  return String(num);
}

export function formatDobToWords(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.includes("-") ? dateStr.split("-") : dateStr.split("/");
  let y: number, m: number, d: number;
  if (parts[0].length === 4) {
    y = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    d = parseInt(parts[2], 10);
  } else {
    d = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    y = parseInt(parts[2], 10);
  }

  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

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

  const dayWord = ordinalDays[d] || `${d}th`;
  const monthWord = months[m - 1] || "";
  const yearWord = numberToEnglishWords(y);

  return `${dayWord} day of ${monthWord}, ${yearWord}`;
}

export function BonafideCertificatePrintableView({
  data,
  schoolProfile,
}: BonafideCertificatePrintableViewProps) {
  const profile = schoolProfile || getSavedSchoolProfile();
  const effectiveHeadTitle = data.headmasterTitle || getEffectiveHeadTitle(profile);
  const logoSrc = profile.schoolLogoUrl && profile.schoolLogoUrl.trim() !== "" ? profile.schoolLogoUrl : "/school-logo.png";

  const isA5 = data.paperSize === "A5";

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

  const dobInWords = data.dateOfBirthWords || formatDobToWords(data.dateOfBirth);

  const qrPayload = JSON.stringify({
    type: "BONAFIDE_CERTIFICATE",
    certNo: data.certificateNo,
    student: data.studentName,
    schoolId: data.studentId,
    pen: data.pen || "N/A",
    class: data.presentClass,
    sec: data.presentSection,
    roll: data.presentRoll,
    session: data.academicSession,
    school: profile.schoolName,
    issued: data.issueDate,
  });

  return (
    <div
      id="pure-bonafide-sheet"
      className={`relative bg-[#fffefb] text-slate-900 border-[2.5px] border-[#14206b] shadow-2xl print:shadow-none print:m-0 print:border-[2.5px] print:border-[#14206b] font-serif box-border select-none mx-auto overflow-hidden flex flex-col justify-between ${
        isA5
          ? "w-[148mm] h-[208mm] min-w-[148mm] max-w-[148mm] min-h-[208mm] max-h-[208mm] p-3.5 print:p-3"
          : "w-[210mm] h-[295mm] min-w-[210mm] max-w-[210mm] min-h-[295mm] max-h-[295mm] p-6 print:p-5"
      }`}
      style={{
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {/* Outer Ornate Double Border Ring */}
      <div className="absolute inset-1.5 border border-[#14206b]/40 pointer-events-none" />
      <div className="absolute inset-2 border-[0.5px] border-dashed border-[#14206b]/30 pointer-events-none" />

      {/* Decorative Corner Rosettes */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#14206b] pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#14206b] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#14206b] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#14206b] pointer-events-none" />

      {/* Background Institutional Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="School Crest Watermark"
          className={`object-contain opacity-[0.07] grayscale ${isA5 ? "w-56 h-56" : "w-96 h-96"}`}
        />
      </div>

      {/* INNER CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* =================================================================== */}
        {/* 1. INSTITUTIONAL HEADER                                             */}
        {/* =================================================================== */}
        <div>
          <div className={`border-b-2 border-[#14206b] ${isA5 ? "pt-0.5 pb-2" : "pt-1 pb-3"}`}>
            <div className="flex items-center justify-between gap-3">
              {/* School Crest */}
              <div
                className={`shrink-0 flex items-center justify-center ${
                  isA5 ? "w-[56px] h-[56px]" : "w-[88px] h-[88px]"
                }`}
              >
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
                    <h1
                      className={`font-black tracking-normal uppercase text-[#14206b] font-serif leading-tight ${
                        isA5 ? "text-[19px] sm:text-[20px]" : "text-[27px]"
                      }`}
                    >
                      {mainName}
                    </h1>
                    {suffix && (
                      <div
                        className={`font-black tracking-wider uppercase text-[#14206b] font-serif leading-none ${
                          isA5 ? "text-[13px]" : "text-[17.5px]"
                        }`}
                      >
                        {suffix}
                      </div>
                    )}
                    <p
                      className={`font-semibold text-slate-700 leading-tight pt-0.5 ${
                        isA5 ? "text-[10.5px]" : "text-[13px]"
                      }`}
                    >
                      {profile.village ? `Vill.: ${profile.village}, ` : ""}
                      {profile.postOffice ? `P.O.: ${profile.postOffice}, ` : ""}
                      {profile.policeStation ? `P.S.: ${profile.policeStation}, ` : ""}
                      {profile.district ? `Dist.: ${profile.district}, ` : ""}
                      PIN: {profile.pincode || "743349"}
                    </p>
                    <p
                      className={`font-mono font-medium text-slate-600 pt-0.5 ${
                        isA5 ? "text-[8.5px]" : "text-[11.5px]"
                      }`}
                    >
                      Index: {profile.indexNo || profile.schoolCode || "MHS-1965"} • H.S. Code: {profile.hsCode || "102298"} • UDISE: {profile.udiseCode || "19111305602"}
                      {profile.schoolPhone ? ` • Phone: ${profile.schoolPhone}` : ""}
                    </p>
                  </div>
                );
              })()}

              {/* Official Seal / Copy Badge */}
              <div
                className={`shrink-0 flex items-center justify-center relative text-[#14206b] ${
                  isA5 ? "w-[56px] h-[56px]" : "w-[84px] h-[84px]"
                }`}
              >
                <div className="w-full h-full rounded-full border border-dashed border-[#14206b]/40 flex flex-col items-center justify-center p-0.5 relative overflow-hidden select-none bg-transparent">
                  <div className="flex flex-col items-center justify-center opacity-30 select-none pointer-events-none">
                    <span className={`font-sans font-bold uppercase tracking-widest leading-none mb-0.5 text-center text-slate-600 ${isA5 ? "text-[6.5px]" : "text-[8px]"}`}>
                      OFFICIAL
                    </span>
                    <span className={`font-sans font-semibold uppercase tracking-wider leading-none text-center text-slate-600 ${isA5 ? "text-[6px]" : "text-[7.5px]"}`}>
                      SEAL
                    </span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`inline-block border border-slate-700 bg-white/95 text-slate-900 font-bold uppercase rounded font-sans tracking-wide shadow-xs ${isA5 ? "text-[7.5px] px-1 py-0.2" : "text-[9px] px-1.5 py-0.5"}`}>
                      [{data.copyType || "Original"}]
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reference & Date Bar */}
          <div
            className={`flex items-center justify-between font-serif text-slate-800 border-b border-dotted border-slate-300 ${
              isA5 ? "text-[11px] py-1 px-1" : "text-[13px] py-2 px-1"
            }`}
          >
            <div>
              <span className="font-semibold text-slate-600">Certificate No.: </span>
              <span className="font-mono font-bold text-slate-950">{data.certificateNo}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-600">Date of Issue: </span>
              <span className="font-mono font-bold text-slate-950">{data.issueDate}</span>
            </div>
          </div>

          {/* Certificate Title Header */}
          <div className={`text-center ${isA5 ? "pt-1.5 pb-0.5" : "pt-3 pb-1"}`}>
            <h2
              className={`font-black uppercase text-[#14206b] tracking-wider underline underline-offset-4 decoration-[#14206b]/50 inline-block font-serif ${
                isA5 ? "text-[17px]" : "text-[24px]"
              }`}
            >
              BONAFIDE CERTIFICATE
            </h2>
            <p
              className={`font-serif font-bold uppercase tracking-widest text-slate-600 ${
                isA5 ? "text-[10px] mt-0.5" : "text-[13px] mt-1"
              }`}
            >
              (TO WHOM IT MAY CONCERN)
            </p>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. CERTIFICATE BODY & PARTICULARS                                   */}
        {/* =================================================================== */}
        <div
          className={`text-slate-800 text-justify font-serif my-auto ${
            isA5
              ? "space-y-2 text-[11.5px] leading-[1.7] px-2 sm:px-3"
              : "space-y-3.5 text-[16.5px] leading-[2.05] px-3 sm:px-6"
          }`}
        >
          <p>
            This is to certify that{" "}
            <span className="font-extrabold uppercase text-[#14206b] border-b border-dotted border-slate-700 px-0.5">
              {data.studentName || "________________________"}
            </span>, {childOf}{" "}
            <span className="font-bold text-slate-900 border-b border-dotted border-slate-700 px-0.5">
              {data.fatherName || "________________________"}
            </span>
            {data.motherName ? (
              <>
                {" "}and{" "}
                <span className="font-bold text-slate-900 border-b border-dotted border-slate-700 px-0.5">
                  {data.motherName}
                </span>
              </>
            ) : null}, residing at Village:{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">
              {displayVillage}
            </span>, P.O.:{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">
              {displayPO}
            </span>, P.S.:{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">
              {displayPS}
            </span>, District:{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">
              {displayDist}
            </span>, PIN:{" "}
            <span className="font-mono font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">
              {displayPin}
            </span>, is a bonafide regular student of this educational institution.
          </p>

          <p>
            {pronounSubject} is currently studying in{" "}
            <span className="font-bold text-[#14206b] border-b border-dotted border-slate-700 px-0.5">
              Class {data.presentClass || "X"}
            </span>
            {data.presentSection ? (
              <>
                , Section:{" "}
                <span className="font-bold text-[#14206b] border-b border-dotted border-slate-700 px-0.5">
                  {data.presentSection}
                </span>
              </>
            ) : null}
            {data.presentRoll ? (
              <>
                , Class Roll No.:{" "}
                <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-0.5">
                  {data.presentRoll}
                </span>
              </>
            ) : null}{" "}
            during the academic session{" "}
            <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-0.5">
              {data.academicSession || new Date().getFullYear()}
            </span>.
          </p>

          {/* Student Identifiers Strip - School ID & PEN */}
          <div
            className={`bg-[#14206b]/5 border border-[#14206b]/20 rounded p-1.5 my-1 flex items-center justify-around font-sans ${
              isA5 ? "text-[11px]" : "text-[14px] p-2.5 my-2"
            }`}
          >
            <div>
              <span className="font-semibold text-slate-600">School ID: </span>
              <span className="font-mono font-bold text-[#14206b]">{data.studentId || "N/A"}</span>
            </div>
            <div className="h-3.5 w-px bg-slate-300" />
            <div>
              <span className="font-semibold text-slate-600">PEN: </span>
              <span className="font-mono font-bold text-[#14206b]">{data.pen || "N/A"}</span>
            </div>
          </div>

          <p>
            As per the official Admission Register of the school, {pronounPossessive} recorded Date of Birth is{" "}
            <span className="font-mono font-bold text-slate-950 border-b border-dotted border-slate-700 px-0.5">
              {data.dateOfBirth || "DD/MM/YYYY"}
            </span>
            {dobInWords ? (
              <>
                {" "}(in words: <span className="font-semibold text-slate-900 italic">{dobInWords}</span>)
              </>
            ) : null}.
          </p>

          <p>
            To the best of my knowledge and official school records, {pronounSubject.toLowerCase()} bears an{" "}
            <span className="font-bold text-slate-950">{data.conduct || "exemplary moral character"}</span> and upright conduct.
          </p>

          <p>
            This bonafide certificate is issued upon the request of {pronounPossessive} guardian for the purpose of{" "}
            <span className="font-bold text-[#14206b] border-b border-dotted border-slate-700 px-0.5">
              {data.purpose || "Official & Academic Verification"}
            </span>.
          </p>

          <p>
            {data.remarks ||
              `I wish ${pronounObject} every success, bright prosperity, and excellence in all future academic pursuits.`}
          </p>
        </div>

        {/* =================================================================== */}
        {/* 3. FOOTER & SIGNATURES WITH VERIFICATION QR                         */}
        {/* =================================================================== */}
        <div className={`border-t border-slate-300 mt-auto ${isA5 ? "pt-2" : "pt-3"}`}>
          <div className="flex items-end justify-between px-2">
            {/* Left: Prepared By & Clerk */}
            <div className="text-left space-y-0.5">
              <div className={`flex items-end ${isA5 ? "h-6" : "h-8"}`}>
                <span className={`border-b border-slate-400 inline-block ${isA5 ? "w-20" : "w-28"}`} />
              </div>
              <p className={`font-bold text-slate-900 uppercase ${isA5 ? "text-[9.5px]" : "text-[12.5px]"}`}>
                Prepared By
              </p>
              <p className={`text-slate-500 font-sans ${isA5 ? "text-[8.5px]" : "text-[10px]"}`}>
                Office Staff / Clerk
              </p>
            </div>

            {/* Middle: Verification QR Code & Institutional Stamp */}
            <div className="flex flex-col items-center justify-center space-y-0.5">
              <div className="p-0.5 bg-white border border-slate-300 rounded shadow-2xs">
                <QRCode value={qrPayload} size={isA5 ? 42 : 56} />
              </div>
              <p className={`font-mono text-slate-400 tracking-wider ${isA5 ? "text-[7px]" : "text-[9px]"}`}>
                SCAN TO VERIFY
              </p>
            </div>

            {/* Center-Right: Official Institutional Round Seal */}
            <div className="text-center pb-0.5">
              <div
                className={`rounded-full border border-dashed border-slate-400 flex items-center justify-center font-sans font-bold text-slate-400 uppercase text-center p-0.5 leading-tight ${
                  isA5 ? "w-12 h-12 text-[7.5px]" : "w-16 h-16 text-[9.5px]"
                }`}
              >
                Institutional Seal
              </div>
            </div>

            {/* Right: Head of Institution Signature */}
            <div className="text-center flex flex-col items-center">
              <div className={`flex items-end justify-center ${isA5 ? "h-7 w-28" : "h-10 w-36"}`}>
                {profile.headSignatureUrl && profile.headSignatureUrl.trim() !== "" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.headSignatureUrl}
                    alt="Signature"
                    className={`object-contain ${isA5 ? "max-h-6" : "max-h-9"}`}
                  />
                ) : null}
              </div>
              <div className={`border-t border-slate-800 pt-0.5 ${isA5 ? "w-32" : "w-40"}`}>
                <p className={`font-bold text-slate-950 uppercase leading-tight ${isA5 ? "text-[10.5px]" : "text-[13.5px]"}`}>
                  {effectiveHeadTitle}
                </p>
                <p className={`font-medium text-slate-700 leading-tight ${isA5 ? "text-[9px]" : "text-[11.5px]"}`}>
                  {profile.schoolName}
                </p>
                <p className={`text-slate-500 font-sans leading-tight ${isA5 ? "text-[8px]" : "text-[10px]"}`}>
                  {profile.policeStation ? `${profile.policeStation}, ` : ""}{profile.district || "South 24 Pgs"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
