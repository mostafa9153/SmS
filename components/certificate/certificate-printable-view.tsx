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

export interface CharacterCertificateData {
  certificateNo: string;
  issueDate: string;
  copyType?: "Original" | "Duplicate" | "Office Copy";
  examType: "MP" | "HS";

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

  // Exam Details
  passingYear: string;
  boardRollNo?: string;
  boardRegistrationNo?: string;

  // Conduct & Character
  conduct: string;
  remarks?: string;

  // School Metadata
  headmasterTitle?: string;
}

interface CertificatePrintableViewProps {
  data: CharacterCertificateData;
  schoolProfile?: SchoolProfileData;
}

export function CertificatePrintableView({ data, schoolProfile }: CertificatePrintableViewProps) {
  const profile = schoolProfile || getSavedSchoolProfile();
  const effectiveHeadTitle = data.headmasterTitle || getEffectiveHeadTitle(profile);
  const logoSrc = profile.schoolLogoUrl && profile.schoolLogoUrl.trim() !== "" ? profile.schoolLogoUrl : "/school-logo.png";

  const isFemale = data.gender === "Female";
  const childOf = isFemale ? "daughter of" : "son of";
  const pronounSubject = isFemale ? "She" : "He";
  const pronounPossessive = isFemale ? "her" : "his";
  const pronounObject = isFemale ? "her" : "him";

  const isMP = data.examType === "MP";
  const examTitle = isMP
    ? "Madhyamik Pariksha (Secondary Examination)"
    : "Higher Secondary (10+2) Examination";
  const examBoard = isMP
    ? "West Bengal Board of Secondary Education (WBBSE)"
    : "West Bengal Council of Higher Secondary Education (WBCHSE)";

  const displayVillage = cleanAddressPart(data.village, "village") || profile.village || "Marigachi";
  const displayPO = cleanAddressPart(data.postOffice, "po") || profile.postOffice || profile.village || "Marigachi";
  const displayPS = cleanAddressPart(data.policeStation, "ps") || profile.policeStation || "Mathurapur";
  const displayDist = cleanAddressPart(data.district, "dist") || profile.district || "South 24 Parganas";
  const displayPin = (data.pincode || "").replace(/\D/g, "") || profile.pincode || "743349";

  const qrPayload = `MHS-CC:${data.certificateNo || "CC-2026"}|ID:${data.studentId || "N/A"}|NAME:${data.studentName || ""}|YEAR:${data.passingYear || "2026"}`;

  return (
    <div
      id="pure-a5-certificate-sheet"
      className="relative bg-[#fffdf7] text-slate-900 border-[2.5px] border-[#14206b] shadow-2xl print:shadow-none print:m-0 print:border-[2.5px] print:border-[#14206b] font-serif box-border select-none mx-auto overflow-hidden flex flex-col justify-between p-4.5 print:p-4 w-[148mm] h-[210mm] min-w-[148mm] max-w-[148mm] min-h-[210mm] max-h-[210mm]"
      style={{
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {/* Outer Ornate Double Border Ring - Fits tightly 3.5mm from paper edges */}
      <div className="absolute inset-1 border border-[#14206b]/40 pointer-events-none" />
      <div className="absolute inset-1.5 border-[0.5px] border-dashed border-[#14206b]/30 pointer-events-none" />

      {/* Decorative Corner Rosettes */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#14206b] pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#14206b] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#14206b] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#14206b] pointer-events-none" />

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
        <div className="border-b-2 border-[#14206b] pt-3 pb-2.5 mt-0.5">
          <div className="flex items-center justify-between gap-3">
            {/* School Crest */}
            <div className="w-[50px] h-[50px] shrink-0 flex items-center justify-center">
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
                <div className="text-center flex-1 space-y-0.5 min-w-0">
                  <h1 className="text-[16px] sm:text-[17px] font-black tracking-normal uppercase text-[#14206b] font-serif leading-tight whitespace-nowrap">
                    {mainName}{suffix ? ` ${suffix}` : ""}
                  </h1>
                  <div className="uppercase leading-none whitespace-nowrap font-serif font-bold text-[#14206b] tracking-wider text-[9.5px]">
                    (Co-Educational)
                  </div>
                  <p className="text-[8.5px] font-semibold text-slate-700 leading-tight pt-0.5 whitespace-nowrap tracking-tight">
                    {profile.village ? `Vill.: ${profile.village}, ` : ""}{profile.postOffice ? `P.O.: ${profile.postOffice}, ` : ""}{profile.policeStation ? `P.S.: ${profile.policeStation}, ` : ""}{profile.district ? `Dist.: ${profile.district}, ` : ""}PIN: {profile.pincode || "743349"}
                  </p>
                  <p className="text-[8px] font-mono font-medium text-slate-600 pt-0.5 whitespace-nowrap tracking-tight">
                    Index: {profile.indexNo || profile.schoolCode || "MHS-1965"} &bull; H.S. Code: {profile.hsCode || "102298"} &bull; UDISE: {profile.udiseCode || "19111305602"} &bull; Phone: {profile.schoolPhone || profile.altPhone || "+91 98765 43210"}
                  </p>
                </div>
              );
            })()}

            {/* Copy Type Badge (Clean without surrounding circle) */}
            <div className="w-[50px] shrink-0 flex items-center justify-end">
              <span className="inline-block border border-slate-700 bg-white text-slate-900 font-bold uppercase rounded font-sans tracking-wide text-[8px] px-1.5 py-0.5 shadow-2xs">
                [{data.copyType || "Original"}]
              </span>
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
              <span className="font-bold text-slate-900">{data.certificateNo || "MHS/CC/2026/0001"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Date: </span>
              <span className="font-bold text-slate-900">{data.issueDate}</span>
            </div>
          </div>

          <div className="pt-0.5">
            <div className="inline-block relative">
              <h2 className="text-[14.5px] px-6 py-0.5 border-b-[2px] border-t-[2px] font-extrabold uppercase tracking-wider text-[#14206b] border-[#14206b]">
                CHARACTER CERTIFICATE
              </h2>
            </div>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-sans font-semibold mt-0.5">
              To Whom It May Concern
            </p>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 3. CERTIFICATE BODY (LARGER TEXT WITH LUXURIOUS SIDE MARGINS)       */}
        {/* =================================================================== */}
        <div className="space-y-3 text-[13.5px] leading-[1.9] text-slate-800 text-justify px-4 sm:px-5 font-serif my-auto">
          <p>
            This is to certify that{" "}
            <span className="font-extrabold uppercase text-[#14206b] border-b border-dotted border-slate-700 px-0.5">{data.studentName || "________________________"}</span>, {childOf}{" "}
            <span className="font-semibold text-slate-900 border-b border-dotted border-slate-700 px-0.5">{data.fatherName || "________________________"}</span>, residing at Village &ndash;{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayVillage}</span>, P.O. &ndash;{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayPO}</span>, P.S. &ndash;{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayPS}</span>, District &ndash;{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5">{displayDist}</span>, PIN &ndash;{" "}
            <span className="font-medium text-slate-900 border-b border-dotted border-slate-700 px-0.5 font-mono">{displayPin}</span>, was a bonafide student of this institution.
          </p>

          <p>
            {pronounSubject} appeared in and successfully passed the{" "}
            <span className="font-bold text-[#14206b]">{examTitle}</span> conducted by the{" "}
            <span className="font-semibold text-slate-900">{examBoard}</span> in{" "}
            <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-700 px-1">
              {data.passingYear || "2026"}
            </span>
            .
          </p>

          <p>
            To the best of my knowledge and according to the school records, {pronounSubject.toLowerCase()}{" "}
            maintained <span className="font-bold text-slate-950">{data.conduct || "good moral character"}</span> and
            conduct during {pronounPossessive} tenure in this institution.
          </p>

          <p>
            {data.remarks ||
              `I wish ${pronounObject} every success and prosperity in ${pronounPossessive} future academic and personal endeavours.`}
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
                <span className="w-20 border-b border-slate-400 inline-block" />
              </div>
              <p className="text-[10px] font-bold text-slate-900 uppercase">
                PREPARED BY
              </p>
              <p className="text-[8px] text-slate-500 font-sans">
                Office Staff
              </p>
            </div>

            {/* Middle-Left: Verification QR */}
            <div className="flex flex-col items-center justify-center space-y-0.5">
              <div className="p-1 bg-white border border-slate-300 rounded shadow-2xs">
                <QRCode value={qrPayload} size={44} level="M" />
              </div>
              <p className="font-mono text-slate-400 tracking-wider font-semibold text-[7px]">
                SCAN TO VERIFY
              </p>
            </div>

            {/* Middle-Right: Round Seal */}
            <div className="text-center pb-0.5">
              <div className="w-13 h-13 rounded-full border border-dashed border-slate-400 flex items-center justify-center font-sans font-bold text-[7.5px] text-slate-400 uppercase text-center p-0.5 leading-tight">
                Institutional Seal
              </div>
            </div>

            {/* Right: Headmaster Signature & Seal */}
            <div className="text-center flex flex-col items-center">
              <div className="h-7 w-28 flex items-end justify-center" />
              <div className="border-t border-dashed border-slate-400 pt-0.5 w-32">
                <p className="text-[10.5px] font-bold text-slate-950 uppercase leading-tight">
                  ({effectiveHeadTitle})
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
