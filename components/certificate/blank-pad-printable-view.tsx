"use client";

import React from "react";
import {
  type SchoolProfileData,
  getSavedSchoolProfile,
  getEffectiveHeadTitle,
  formatSchoolNameParts,
} from "@/lib/utils/school-profile";

export type BlankPadFontStyle = "classic" | "3d" | "stylish";
export type LetterMode = "structured" | "freeform";

export interface StructuredLetterData {
  recipientPrefix?: string;
  recipientText?: string;
  recipientAlign?: "left" | "center" | "right";
  
  subjectPrefix?: string;
  subjectText?: string;
  subjectAlign?: "center" | "left" | "right";
  subjectBold?: boolean;
  subjectUnderline?: boolean;

  salutationText?: string;
  salutationAlign?: "left" | "center" | "right";

  bodyText?: string;
  bodyAlign?: "justify" | "left" | "center";

  thankingText?: string;
  thankingAlign?: "left" | "center" | "right";

  signoffPrefix?: string;
  signoffDesignation?: string;
  signoffInstitution?: string;
  signoffAlign?: "right" | "left" | "center";
}

export interface BlankPadData {
  paperSize: "A4" | "A5";
  fontStyle?: BlankPadFontStyle;
  letterMode?: LetterMode;
  structuredLetter?: StructuredLetterData;
  bodyFontSize?: number;
  bodyLineHeight?: "normal" | "relaxed" | "loose";
  bodyAlign?: "left" | "justify" | "center";
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
  customEmail?: string;
  customPhone?: string;
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
  const fontStyle: BlankPadFontStyle = data.fontStyle || "classic";
  const { mainName, suffix } = formatSchoolNameParts(profile.schoolName);

  const displayPhone = (data.customPhone !== undefined && data.customPhone.trim() !== ""
    ? data.customPhone
    : (profile.schoolPhone || profile.altPhone || "")).trim();

  const displayEmail = (data.customEmail !== undefined && data.customEmail.trim() !== ""
    ? data.customEmail
    : (profile.schoolEmail || "contact@marigachihighschool.in")).trim();

  const baseFontSize = data.bodyFontSize || (isA4 ? 15 : 12.5);
  const scaledFontSize = isA4 ? baseFontSize : Math.max(9, Math.round(baseFontSize * 0.82));
  const lineHeightVal = data.bodyLineHeight === "loose" ? 2.0 : data.bodyLineHeight === "normal" ? 1.6 : 1.85;

  return (
    <div
      id="pure-blank-pad-sheet"
      className={`relative bg-[#fffdfa] text-slate-900 shadow-2xl print:shadow-none print:m-0 font-serif box-border select-none mx-auto overflow-hidden flex flex-col justify-between ${
        isA4
          ? "w-[210mm] h-[295mm] min-w-[210mm] max-w-[210mm] min-h-[295mm] max-h-[295mm] p-8 sm:p-9 print:p-8"
          : "w-[148mm] h-[208mm] min-w-[148mm] max-w-[148mm] min-h-[208mm] max-h-[208mm] p-6 sm:p-7 print:p-6"
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
        {/* 1. INSTITUTIONAL HEADER (Enlarged +10%)                             */}
        {/* =================================================================== */}
        <div>
          <div className="border-b-2 border-[#14206b] pb-3.5 pt-1.5">
            <div className="flex items-center justify-between gap-3">
              {/* School Logo */}
              <div
                className={`shrink-0 flex items-center justify-center ${
                  isA4 ? "w-[102px] h-[102px]" : "w-[82px] h-[82px]"
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
              <div className="text-center flex-1 space-y-0.5 overflow-hidden">
                <h1
                  className={`uppercase leading-tight whitespace-nowrap overflow-visible ${
                    fontStyle === "3d"
                      ? `${isA4 ? "text-[26px] sm:text-[26.5px]" : "text-[19px] sm:text-[19.5px]"} font-black text-[#14206b] [font-family:'Cinzel_Decorative','Cinzel',serif] tracking-tight [text-shadow:_1px_1px_0px_#27387d,_2px_2px_0px_#1b2759,_3px_3px_0px_#101736,_4px_4px_3px_rgba(0,0,0,0.35)]`
                      : fontStyle === "stylish"
                      ? `${isA4 ? "text-[26.5px] sm:text-[27.5px]" : "text-[20px]"} font-extrabold text-[#0f172a] [font-family:'Cinzel',serif] tracking-[0.08em] drop-shadow-xs`
                      : `${isA4 ? "text-[28.5px] sm:text-[29.5px]" : "text-[21px] sm:text-[22px]"} font-black text-[#14206b] font-serif tracking-normal`
                  }`}
                >
                  {mainName}
                </h1>
                {suffix && (
                  <div
                    className={`uppercase leading-none whitespace-nowrap ${
                      isA4 ? "text-[17.5px]" : "text-[14.5px]"
                    } ${
                      fontStyle === "3d"
                        ? "font-black text-[#14206b] [font-family:'Cinzel_Decorative','Cinzel',serif] tracking-wider [text-shadow:_1px_1px_0px_#27387d,_2px_2px_0px_#1b2759,_3px_3px_2px_rgba(0,0,0,0.3)]"
                        : fontStyle === "stylish"
                        ? "font-extrabold text-[#0f172a] [font-family:'Cinzel',serif] tracking-[0.16em]"
                        : "font-black text-[#14206b] font-serif tracking-wider"
                    }`}
                  >
                    {suffix}
                  </div>
                )}
                <p
                  className={`font-semibold text-slate-700 leading-snug pt-0.5 whitespace-nowrap text-center ${
                    isA4 ? "text-[13.8px]" : "text-[11px]"
                  }`}
                >
                  {profile.village ? `Vill.: ${profile.village}, ` : ""}
                  {profile.postOffice ? `P.O.: ${profile.postOffice}, ` : ""}
                  {profile.policeStation ? `P.S.: ${profile.policeStation}, ` : ""}
                  {profile.district ? `Dist.: ${profile.district}, ` : ""}
                  <span className="whitespace-nowrap">PIN: {profile.pincode || "743349"}</span>
                </p>
                <p
                  className={`font-mono font-medium text-slate-600 pt-0.5 leading-snug whitespace-nowrap ${
                    isA4 ? "text-[12.7px]" : "text-[10.5px]"
                  }`}
                >
                  Index: {profile.indexNo || profile.schoolCode || "MHS-1965"} • H.S. Code: {profile.hsCode || "102298"} • UDISE: {profile.udiseCode || "19111305602"}
                </p>
                {(displayPhone || displayEmail) && (
                  <p
                    className={`font-mono font-medium text-slate-600 pt-0.5 leading-snug flex items-center justify-center flex-wrap gap-x-2 whitespace-nowrap ${
                      isA4 ? "text-[12.7px]" : "text-[10.5px]"
                    }`}
                  >
                    {displayPhone && <span>Phone: {displayPhone}</span>}
                    {displayPhone && displayEmail && <span>•</span>}
                    {displayEmail && <span>Email: {displayEmail}</span>}
                  </p>
                )}
              </div>

              {/* Symmetry placeholder / right crest or blank balancer */}
              <div
                className={`shrink-0 flex items-center justify-center opacity-0 pointer-events-none ${
                  isA4 ? "w-[102px] h-[102px]" : "w-[82px] h-[82px]"
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
                isA4 ? "text-[15.5px]" : "text-[13.5px]"
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
        {/* 2. BODY AREA (OFFICIAL LETTER / NOTICE / CORRESPONDENCE)           */}
        {/* =================================================================== */}
        <div className="flex-1 py-5 px-3 sm:px-6 min-h-[140px]">
          {data.letterMode === "structured" && data.structuredLetter ? (
            <div
              style={{
                fontSize: `${scaledFontSize}px`,
                lineHeight: lineHeightVal,
              }}
              className="font-serif text-slate-900 space-y-3 sm:space-y-4"
            >
              {/* Recipient Section (To) */}
              {(data.structuredLetter.recipientPrefix || data.structuredLetter.recipientText) && (
                <div
                  className={`${
                    data.structuredLetter.recipientAlign === "center"
                      ? "text-center"
                      : data.structuredLetter.recipientAlign === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {data.structuredLetter.recipientPrefix && (
                    <p className="font-semibold">{data.structuredLetter.recipientPrefix}</p>
                  )}
                  {data.structuredLetter.recipientText && (
                    <div className="whitespace-pre-line leading-relaxed pl-2 sm:pl-3">
                      {data.structuredLetter.recipientText}
                    </div>
                  )}
                </div>
              )}

              {/* Subject Section */}
              {data.structuredLetter.subjectText && (
                <div
                  className={`py-1 ${
                    data.structuredLetter.subjectAlign === "left"
                      ? "text-left"
                      : data.structuredLetter.subjectAlign === "right"
                      ? "text-right"
                      : "text-center"
                  }`}
                >
                  <span
                    className={`inline-block tracking-normal ${
                      data.structuredLetter.subjectBold !== false ? "font-bold" : "font-normal"
                    } ${
                      data.structuredLetter.subjectUnderline !== false
                        ? "underline underline-offset-4 decoration-slate-900"
                        : ""
                    }`}
                  >
                    {data.structuredLetter.subjectPrefix
                      ? `${data.structuredLetter.subjectPrefix} `
                      : "Sub: "}
                    {data.structuredLetter.subjectText}
                  </span>
                </div>
              )}

              {/* Salutation Section */}
              {data.structuredLetter.salutationText && (
                <div
                  className={`${
                    data.structuredLetter.salutationAlign === "center"
                      ? "text-center"
                      : data.structuredLetter.salutationAlign === "right"
                      ? "text-right"
                      : "text-left"
                  } font-semibold`}
                >
                  {data.structuredLetter.salutationText}
                </div>
              )}

              {/* Body Content Section */}
              {data.structuredLetter.bodyText && (
                <div
                  className={`whitespace-pre-line ${
                    data.structuredLetter.bodyAlign === "left"
                      ? "text-left"
                      : data.structuredLetter.bodyAlign === "center"
                      ? "text-center"
                      : "text-justify"
                  }`}
                  style={{ textIndent: data.structuredLetter.bodyAlign === "center" ? "0" : "2rem" }}
                >
                  {data.structuredLetter.bodyText}
                </div>
              )}

              {/* Thanking Note Section */}
              {data.structuredLetter.thankingText && (
                <div
                  className={`pt-1.5 ${
                    data.structuredLetter.thankingAlign === "center"
                      ? "text-center"
                      : data.structuredLetter.thankingAlign === "right"
                      ? "text-right"
                      : "text-left"
                  } font-semibold`}
                >
                  {data.structuredLetter.thankingText}
                </div>
              )}

              {/* Inline Signoff Section (if bottom signature is off) */}
              {!data.showSignature &&
                (data.structuredLetter.signoffPrefix || data.structuredLetter.signoffDesignation) && (
                  <div
                    className={`pt-4 flex ${
                      data.structuredLetter.signoffAlign === "left"
                        ? "justify-start text-left"
                        : data.structuredLetter.signoffAlign === "center"
                        ? "justify-center text-center"
                        : "justify-end text-right"
                    }`}
                  >
                    <div className="inline-block text-center min-w-[200px] space-y-1">
                      {data.structuredLetter.signoffPrefix && (
                        <p className="font-semibold mb-6">{data.structuredLetter.signoffPrefix}</p>
                      )}
                      <p className="font-bold border-t border-slate-800 pt-1">
                        ({data.structuredLetter.signoffDesignation || effectiveHeadTitle})
                      </p>
                      <p className={`text-slate-700 ${isA4 ? "text-[12px]" : "text-[10px]"}`}>
                        {data.structuredLetter.signoffInstitution || profile.schoolName}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          ) : data.bodyContent && data.bodyContent.trim() !== "" ? (
            <div
              style={{
                fontSize: `${scaledFontSize}px`,
                lineHeight: lineHeightVal,
              }}
              className={`font-serif text-slate-900 whitespace-pre-wrap tracking-normal ${
                data.bodyAlign === "justify"
                  ? "text-justify"
                  : data.bodyAlign === "center"
                  ? "text-center"
                  : "text-left"
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
