"use client";

import React from "react";
import {
  type SchoolProfileData,
  getSavedSchoolProfile,
  getEffectiveHeadTitle,
  formatSchoolNameParts,
} from "@/lib/utils/school-profile";

export interface BlankPadData {
  paperSize: "A4" | "A5";
  showRefDate: boolean;
  refNo: string;
  issueDate: string;
  showWatermark: boolean;
  watermarkOpacity?: number;
  borderStyle: "ornate" | "single" | "none";
  showSignature: boolean;
  signatoryTitle?: string;
  includeSignatureImage?: boolean;
  bodyContent?: string;
}

interface BlankPadPrintableViewProps {
  data: BlankPadData;
  schoolProfile?: SchoolProfileData;
}

export function BlankPadPrintableView({ data, schoolProfile }: BlankPadPrintableViewProps) {
  const profile = schoolProfile || getSavedSchoolProfile();
  const effectiveHeadTitle = data.signatoryTitle || getEffectiveHeadTitle(profile);
  const logoSrc = profile.schoolLogoUrl && profile.schoolLogoUrl.trim() !== "" ? profile.schoolLogoUrl : "/school-logo.png";
  const signatureSrc = profile.headSignatureUrl && profile.headSignatureUrl.trim() !== "" ? profile.headSignatureUrl : "/hod-signature.png";

  const isA4 = data.paperSize === "A4";
  const { mainName, suffix } = formatSchoolNameParts(profile.schoolName);

  return (
    <div
      id="pure-blank-pad-sheet"
      className={`relative bg-[#fffdfa] text-slate-900 shadow-2xl print:shadow-none print:m-0 font-serif box-border select-none mx-auto overflow-hidden flex flex-col justify-between ${
        isA4
          ? "w-[210mm] h-[295mm] min-w-[210mm] max-w-[210mm] min-h-[295mm] max-h-[295mm] p-7 print:p-6"
          : "w-[148mm] h-[208mm] min-w-[148mm] max-w-[148mm] min-h-[208mm] max-h-[208mm] p-5 print:p-4"
      } ${
        data.borderStyle === "ornate"
          ? "border-[2.5px] border-[#14206b] print:border-[2.5px] print:border-[#14206b]"
          : data.borderStyle === "single"
          ? "border border-slate-400 print:border print:border-slate-400"
          : "border-none"
      }`}
      style={{
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {/* Decorative Ornate Borders (when ornate style is chosen) */}
      {data.borderStyle === "ornate" && (
        <>
          <div className="absolute inset-1 border border-[#14206b]/40 pointer-events-none" />
          <div className="absolute inset-1.5 border-[0.5px] border-dashed border-[#14206b]/30 pointer-events-none" />
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#14206b] pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#14206b] pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#14206b] pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#14206b] pointer-events-none" />
        </>
      )}

      {/* Institutional Watermark */}
      {data.showWatermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="School Crest Watermark"
            style={{ opacity: data.watermarkOpacity ?? 0.08 }}
            className={`object-contain grayscale ${isA4 ? "w-96 h-96" : "w-64 h-64"}`}
          />
        </div>
      )}

      {/* INNER CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* =================================================================== */}
        {/* 1. INSTITUTIONAL HEADER                                             */}
        {/* =================================================================== */}
        <div>
          <div className="border-b-2 border-[#14206b] pb-3 pt-1">
            <div className="flex items-center justify-between gap-4">
              {/* School Logo */}
              <div
                className={`shrink-0 flex items-center justify-center ${
                  isA4 ? "w-[92px] h-[92px]" : "w-[72px] h-[72px]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="School Crest"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* School Details */}
              <div className="text-center flex-1 space-y-0.5">
                <h1
                  className={`font-black tracking-normal uppercase text-[#14206b] font-serif leading-tight ${
                    isA4 ? "text-[24px]" : "text-[18px]"
                  }`}
                >
                  {mainName}
                </h1>
                {suffix && (
                  <div
                    className={`font-black tracking-wider uppercase text-[#14206b] font-serif leading-none ${
                      isA4 ? "text-[15px]" : "text-[12px]"
                    }`}
                  >
                    {suffix}
                  </div>
                )}
                <p
                  className={`font-semibold text-slate-700 leading-tight pt-0.5 ${
                    isA4 ? "text-[12px]" : "text-[10px]"
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
                    isA4 ? "text-[10px]" : "text-[8.5px]"
                  }`}
                >
                  Index: {profile.indexNo || profile.schoolCode || "MHS-1965"} &bull; H.S. Code: {profile.hsCode || "102298"} &bull; UDISE: {profile.udiseCode || "19111305602"}
                  {profile.schoolPhone ? ` &bull; Phone: ${profile.schoolPhone}` : ""}
                </p>
              </div>

              {/* Symmetry placeholder / right crest or blank balancer */}
              <div
                className={`shrink-0 flex items-center justify-center opacity-0 pointer-events-none ${
                  isA4 ? "w-[92px] h-[92px]" : "w-[72px] h-[72px]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>

          {/* Optional Ref. No. & Date Strip */}
          {data.showRefDate && (
            <div
              className={`flex items-center justify-between border-b border-dotted border-slate-400 py-1.5 px-1 font-serif text-slate-800 ${
                isA4 ? "text-[12.5px]" : "text-[11px]"
              }`}
            >
              <div>
                <span className="font-semibold">Ref. No.: </span>
                {data.refNo ? (
                  <span className="font-mono font-bold">{data.refNo}</span>
                ) : (
                  <span className="tracking-widest text-slate-400">....................................</span>
                )}
              </div>
              <div>
                <span className="font-semibold">Date: </span>
                {data.issueDate ? (
                  <span className="font-mono font-bold">{data.issueDate}</span>
                ) : (
                  <span className="tracking-widest text-slate-400">........................</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 2. BODY AREA (BLANK BY DEFAULT, OPTIONAL TYPED CONTENT)            */}
        {/* =================================================================== */}
        <div className="flex-1 py-4 px-1 min-h-[120px]">
          {data.bodyContent && data.bodyContent.trim() !== "" ? (
            <div
              className={`font-serif leading-relaxed text-slate-900 whitespace-pre-wrap ${
                isA4 ? "text-[14px]" : "text-[12px]"
              }`}
            >
              {data.bodyContent}
            </div>
          ) : (
            /* Blank Pad area */
            <div className="w-full h-full" />
          )}
        </div>

        {/* =================================================================== */}
        {/* 3. OPTIONAL SIGNATURE FOOTER                                        */}
        {/* =================================================================== */}
        {data.showSignature && (
          <div className="mt-auto pt-4 pb-1">
            <div className="flex justify-end pr-2">
              <div className="text-center w-56 space-y-1">
                {data.includeSignatureImage && (
                  <div className="h-10 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={signatureSrc}
                      alt="Head Signature"
                      className="max-h-9 object-contain"
                    />
                  </div>
                )}
                {!data.includeSignatureImage && <div className="h-8" />}
                <div className="border-t border-slate-900 pt-1">
                  <p className={`font-serif font-bold text-slate-900 ${isA4 ? "text-[13px]" : "text-[11.5px]"}`}>
                    {effectiveHeadTitle}
                  </p>
                  <p className={`font-serif text-slate-700 ${isA4 ? "text-[11px]" : "text-[9.5px]"}`}>
                    {profile.schoolName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
