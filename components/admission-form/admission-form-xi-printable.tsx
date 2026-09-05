"use client";

import React from "react";
import {
  AdmissionFormXIData,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
} from "./types";

interface AdmissionFormXIPrintableViewProps {
  data: AdmissionFormXIData;
  school?: SchoolInfo;
  activePage?: "all" | "page1" | "page2";
}

export function AdmissionFormXIPrintableView({
  data,
  school = DEFAULT_SCHOOL_INFO,
  activePage = "all",
}: AdmissionFormXIPrintableViewProps) {
  // Split Aadhaar into 12 digits for individual boxes
  const aadhaarDigits = (data.basicInfo.aadhaarNo || "")
    .replace(/\D/g, "")
    .padEnd(12, " ")
    .slice(0, 12)
    .split("");

  const displayFormNo = data.formNo
    ? data.formNo.toLowerCase().startsWith("form no")
      ? data.formNo
      : `Form No: ${data.formNo}`
    : "Form No: MHS/AF/26/001";

  return (
    <div className="admission-form-document text-black font-sans leading-normal print:w-full print:m-0 print:p-0">
      {/* ========================================================================= */}
      {/* PAGE 1 (FRONT PAGE) - CLASS XI */}
      {/* ========================================================================= */}
      {(activePage === "all" || activePage === "page1") && (
        <div
          id="admission-page-1"
          className="admission-sheet relative bg-white mx-auto box-border flex flex-col justify-between border-2 border-black overflow-hidden"
          style={{
            width: "210mm",
            minHeight: "295mm",
            maxHeight: "295mm",
            padding: "5mm 8mm 4mm 8mm",
            pageBreakAfter: activePage === "all" ? "always" : "auto",
            breakAfter: activePage === "all" ? "page" : "auto",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {/* Institutional Watermark (Page 1) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
            <img
              src={school.logoUrl || "/logo.png"}
              alt="School Watermark"
              className="w-[340px] h-[340px] object-contain opacity-[0.06] grayscale pointer-events-none"
            />
          </div>

          {/* Header Section */}
          <div className="w-full relative z-10">
            {/* Top School Header with Logo on Left, School Details in True Center, Form No on Right */}
            <div className="border-b-2 border-black pb-2 mb-2.5">
              <div className="grid grid-cols-[110px_1fr_110px] items-center gap-2">
                {/* 1. Left: School Logo */}
                <div className="flex items-center justify-start">
                  <div className="w-[62px] h-[62px] flex items-center justify-center">
                    <img
                      src={school.logoUrl || "/logo.png"}
                      alt="School Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>

                {/* 2. Center: School Name & Details (True Center & Larger Font) */}
                <div className="text-center px-1">
                  <h1 className="text-[23px] font-black uppercase tracking-tight text-black font-serif leading-tight">
                    {school.name}
                  </h1>
                  <p className="text-[12px] font-bold leading-tight mt-1 text-gray-950">
                    {school.address}
                  </p>
                  <p className="text-[11.5px] font-bold leading-tight text-gray-950">
                    {school.districtStatePin}
                  </p>
                  <p className="text-[10.5px] font-semibold text-gray-800 leading-tight">
                    {school.contact}
                  </p>
                </div>

                {/* 3. Right: Form No Badge (Small & Compact) */}
                <div className="flex items-center justify-end">
                  <div className="border border-black bg-gray-50 px-2 py-1 text-[11px] font-bold font-mono tracking-tight text-right whitespace-nowrap shadow-xs">
                    {displayFormNo}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Header Row: 3:4 Passport Photo Box (Left) + Center Title + Tall For Office Use Box (Right) */}
            <div className="flex items-stretch justify-between gap-4 mb-2.5">
              {/* Photo Box (3:4 aspect ratio: 35mm x 46mm) */}
              <div
                className="border-2 border-black flex flex-col items-center justify-center text-center p-2 bg-gray-50/30 shrink-0"
                style={{ width: "35mm", height: "46mm" }}
              >
                <span className="text-[13px] font-black tracking-wider">PHOTO</span>
                <span className="text-[9px] text-gray-700 mt-1.5 leading-tight font-bold">
                  Affix Passport Size Photograph
                </span>
                <span className="text-[8.5px] text-gray-500 mt-1 font-semibold">
                  (3.5 cm × 4.5 cm)
                </span>
              </div>

              {/* Center Title */}
              <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                <h2 className="text-[19px] font-black text-black tracking-tight">
                  Academic Year: {data.academicYear || "2026"}
                </h2>
                <h3 className="text-[16.5px] font-black uppercase tracking-wider text-black mt-2 underline decoration-2 underline-offset-4">
                  Admission Application Form - XI
                </h3>
              </div>

              {/* For Office Use Box (Tall like Photo box: 48mm x 46mm) */}
              <div
                className="border-2 border-black p-2 text-[11.5px] leading-tight bg-gray-50/30 shrink-0 flex flex-col justify-between"
                style={{ width: "48mm", height: "46mm" }}
              >
                <div className="font-black text-[12px] text-center border-b-2 border-black pb-0.5 tracking-wider uppercase bg-gray-100">
                  For Office Use
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold">D.O.A. -</span>
                  <span className="font-bold font-mono">{data.officeUse.doa || ""}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold">SL No –</span>
                  <span className="font-bold font-mono">{data.officeUse.slNo || ""}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold">Class –</span>
                  <span className="font-bold font-mono">{data.officeUse.class || ""}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold">Sec. -</span>
                  <span className="font-bold font-mono">{data.officeUse.sec || ""}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="font-bold">Roll No. -</span>
                  <span className="font-bold font-mono">{data.officeUse.rollNo || ""}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="w-full space-y-2.5 text-[12.5px]">
            {/* A. Basic Information */}
            <div>
              <div className="font-black text-[13.5px] uppercase bg-gray-100 border-2 border-black px-2.5 py-0.5 mb-1.5 flex items-center">
                <span>A. Basic Information:</span>
              </div>

              {/* 1. Name Eng & 2. Name Ben */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[90px] shrink-0">1. Name:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-black text-[13.5px] uppercase tracking-wide bg-white">
                    {data.basicInfo.nameEng || ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[90px] shrink-0">2. নাম:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[13.5px] bg-white">
                    {data.basicInfo.nameBen || ""}
                  </div>
                </div>
              </div>

              {/* 3. DOB & 4. Birth Regn No */}
              <div className="grid grid-cols-12 gap-3 mt-1.5 items-center">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">3. DOB:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2 flex items-center justify-center font-mono font-black text-[13px] tracking-widest bg-white">
                    {data.basicInfo.dob ? data.basicInfo.dob.split("-").reverse().join(" / ") : ""}
                  </div>
                </div>

                <div className="col-span-7 flex items-center gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">4. Birth Regn. No:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                    {data.basicInfo.birthRegNo || ""}
                  </div>
                </div>
              </div>

              {/* 5. Gender */}
              <div className="mt-1.5 flex items-center gap-4">
                <span className="font-bold text-[12.5px]">5. Gender*:</span>
                <div className="flex items-center gap-7">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[12.5px] font-bold">MALE</span>
                    <div className="w-5 h-5 border-2 border-black flex items-center justify-center font-black text-[13px] bg-white">
                      {data.basicInfo.gender === "MALE" ? "✓" : ""}
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[12.5px] font-bold">FEMALE</span>
                    <div className="w-5 h-5 border-2 border-black flex items-center justify-center font-black text-[13px] bg-white">
                      {data.basicInfo.gender === "FEMALE" ? "✓" : ""}
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[12.5px] font-bold">TRANSGENDER</span>
                    <div className="w-5 h-5 border-2 border-black flex items-center justify-center font-black text-[13px] bg-white">
                      {data.basicInfo.gender === "TRANSGENDER" ? "✓" : ""}
                    </div>
                  </label>
                </div>
                <span className="text-[11px] italic text-gray-700 ml-auto font-bold">
                  (Give ✓ in the box)
                </span>
              </div>

              {/* 6. Social Category & 7. Religion */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[135px] shrink-0">6. Social Category*:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                    {data.basicInfo.socialCategory || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[100px] shrink-0">7. Religion*:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                    {data.basicInfo.religion || ""}
                  </div>
                </div>
              </div>

              {/* 8. Mother Tongue & 9. Nationality */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[135px] shrink-0">8. Mother Tongue*:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                    {data.basicInfo.motherTongue || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[100px] shrink-0">9. Nationality*:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                    {data.basicInfo.nationality || ""}
                  </div>
                </div>
              </div>

              {/* 10. Aadhaar No - 12 separate digit boxes */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-bold text-[12.5px] w-[115px] shrink-0">10. Aadhaar No:</span>
                <div className="flex items-center">
                  {aadhaarDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className={`w-8 h-8 border-2 border-black flex items-center justify-center font-mono font-black text-[15px] bg-white ${
                        idx === 3 || idx === 7 ? "mr-2.5 border-r-2" : "-mr-[2px]"
                      }`}
                    >
                      {digit.trim()}
                    </div>
                  ))}
                </div>
              </div>

              {/* 11. Blood Group, 12. Student ID, 13. Health ID */}
              <div className="grid grid-cols-12 gap-2.5 mt-1.5 items-center">
                <div className="col-span-3 flex items-center gap-1">
                  <span className="font-bold text-[12.5px] shrink-0">11. Blood Group:</span>
                  <div className="flex-1 h-8 border-2 border-black px-1.5 flex items-center justify-center font-black text-[12.5px] bg-white">
                    {data.basicInfo.bloodGroup || ""}
                  </div>
                </div>
                <div className="col-span-5 flex items-center gap-1">
                  <span className="font-bold text-[12.5px] shrink-0">12. Student ID*:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                    {data.basicInfo.studentId || ""}
                  </div>
                </div>
                <div className="col-span-4 flex items-center gap-1">
                  <span className="font-bold text-[12.5px] shrink-0">13. Health ID:</span>
                  <div className="flex-1 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                    {data.basicInfo.healthId || ""}
                  </div>
                </div>
              </div>

              {/* 14. Identification Mark */}
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-bold text-[12.5px] shrink-0">14. Identification Mark:</span>
                <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                  {data.basicInfo.identificationMark || ""}
                </div>
              </div>
            </div>

            {/* B. Educational Information (Class XI specific) */}
            <div className="pt-0.5">
              <div className="font-black text-[13.5px] uppercase bg-gray-100 border-2 border-black px-2.5 py-0.5 mb-1.5">
                B. Educational Information:
              </div>

              {/* 1. School Name */}
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-bold text-[12.5px] shrink-0">1. School Name :</span>
                <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-black text-[13px] min-h-[22px]">
                  {data.educationalInfo.previousSchoolName || ""}
                </div>
              </div>

              {/* Marks Obtained & Percentage */}
              <div className="grid grid-cols-12 gap-4 items-center mb-1.5">
                <div className="col-span-6 flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">2. Marks Obtained :</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-black font-mono text-[13.5px] min-h-[22px]">
                    {data.educationalInfo.marksObtained || ""}
                  </div>
                </div>
                <div className="col-span-6 flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">3. Percentage :</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-black font-mono text-[13.5px] min-h-[22px]">
                    {data.educationalInfo.percentage ? `${data.educationalInfo.percentage}%` : ""}
                  </div>
                </div>
              </div>

              {/* Subject Marks Breakdown (Grid of 7 standard Madhyamik subjects) */}
              <div className="grid grid-cols-7 gap-1.5 items-center pt-0.5">
                {/* 4. Beng */}
                <div className="border-2 border-black p-1 text-center bg-gray-50/40 rounded-xs">
                  <span className="block text-[11.5px] font-black text-black">4. Beng.</span>
                  <div className="h-7.5 flex items-center justify-center font-black font-mono text-[13.5px] bg-white mt-0.5">
                    {data.educationalInfo.bengMarks || ""}
                  </div>
                </div>

                {/* 5. Eng */}
                <div className="border-2 border-black p-1 text-center bg-gray-50/40 rounded-xs">
                  <span className="block text-[11.5px] font-black text-black">5. Eng.</span>
                  <div className="h-7.5 flex items-center justify-center font-black font-mono text-[13.5px] bg-white mt-0.5">
                    {data.educationalInfo.engMarks || ""}
                  </div>
                </div>

                {/* 6. Math */}
                <div className="border-2 border-black p-1 text-center bg-gray-50/40 rounded-xs">
                  <span className="block text-[11.5px] font-black text-black">6. Math.</span>
                  <div className="h-7.5 flex items-center justify-center font-black font-mono text-[13.5px] bg-white mt-0.5">
                    {data.educationalInfo.mathMarks || ""}
                  </div>
                </div>

                {/* 7. L. Sc. */}
                <div className="border-2 border-black p-1 text-center bg-gray-50/40 rounded-xs">
                  <span className="block text-[11.5px] font-black text-black">7. L. Sc.</span>
                  <div className="h-7.5 flex items-center justify-center font-black font-mono text-[13.5px] bg-white mt-0.5">
                    {data.educationalInfo.lscMarks || ""}
                  </div>
                </div>

                {/* 8. P. Sc. */}
                <div className="border-2 border-black p-1 text-center bg-gray-50/40 rounded-xs">
                  <span className="block text-[11.5px] font-black text-black">8. P. Sc.</span>
                  <div className="h-7.5 flex items-center justify-center font-black font-mono text-[13.5px] bg-white mt-0.5">
                    {data.educationalInfo.pscMarks || ""}
                  </div>
                </div>

                {/* 9. Hist */}
                <div className="border-2 border-black p-1 text-center bg-gray-50/40 rounded-xs">
                  <span className="block text-[11.5px] font-black text-black">9. Hist.</span>
                  <div className="h-7.5 flex items-center justify-center font-black font-mono text-[13.5px] bg-white mt-0.5">
                    {data.educationalInfo.histMarks || ""}
                  </div>
                </div>

                {/* 10. Geo */}
                <div className="border-2 border-black p-1 text-center bg-gray-50/40 rounded-xs">
                  <span className="block text-[11.5px] font-black text-black">10. Geo.</span>
                  <div className="h-7.5 flex items-center justify-center font-black font-mono text-[13.5px] bg-white mt-0.5">
                    {data.educationalInfo.geoMarks || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* C. Contact Information */}
            <div className="pt-0.5">
              <div className="font-black text-[13.5px] uppercase bg-gray-100 border-2 border-black px-2.5 py-0.5 mb-1.5">
                C. Contact Information:
              </div>

              {/* 1. Village & 2. Habitation/Locality */}
              <div className="grid grid-cols-2 gap-5 items-baseline">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">1. Village :</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.contactInfo.village || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">2. Habitation or Locality:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.contactInfo.locality || ""}
                  </div>
                </div>
              </div>

              {/* 3. District & 4. Block/Municipality */}
              <div className="grid grid-cols-2 gap-5 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">3. District :</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.contactInfo.district || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">4. Block/Municipality*:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.contactInfo.blockMunicipality || ""}
                  </div>
                </div>
              </div>

              {/* 5. Panchayat & 6. Post Office */}
              <div className="grid grid-cols-2 gap-5 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">5. Panchayat:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.contactInfo.panchayat || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">6. Post Office*:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.contactInfo.postOffice || ""}
                  </div>
                </div>
              </div>

              {/* 7. Police Station & 8. Pin Code */}
              <div className="grid grid-cols-2 gap-5 mt-1.5 items-center">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">7. Police Station*:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.contactInfo.policeStation || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">8. Pin Code*:</span>
                  <div className="w-40 h-8 border-2 border-black px-2.5 flex items-center justify-center font-mono font-black text-[13.5px] tracking-wider bg-white">
                    {data.contactInfo.pinCode || ""}
                  </div>
                </div>
              </div>

              {/* 9. Contact No */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-bold text-[12.5px] shrink-0">9. Contact No. +91</span>
                <div className="w-80 h-8 border-2 border-black px-2.5 flex items-center font-mono font-black text-[13.5px] tracking-wider bg-white">
                  {data.contactInfo.contactNo || ""}
                </div>
              </div>
            </div>
          </div>

          {/* Page 1 Bottom Indicator */}
          <div className="w-full text-right text-[11px] text-gray-800 pt-1.5 border-t border-gray-400 mt-2 font-bold">
            Page 1 of 2 (Front)
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2 (BACK PAGE) - COMMON TO CLASS XI */}
      {/* ========================================================================= */}
      {(activePage === "all" || activePage === "page2") && (
        <div
          id="admission-page-2"
          className="admission-sheet relative bg-white mx-auto box-border flex flex-col justify-between border-2 border-black overflow-hidden"
          style={{
            width: "210mm",
            minHeight: "295mm",
            maxHeight: "295mm",
            padding: "6mm 8mm 4mm 8mm",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {/* Institutional Watermark (Page 2) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
            <img
              src={school.logoUrl || "/logo.png"}
              alt="School Watermark"
              className="w-[340px] h-[340px] object-contain opacity-[0.06] grayscale pointer-events-none"
            />
          </div>

          {/* Top of Page 2: Email & Bank Details */}
          <div className="w-full space-y-3 text-[12.5px] relative z-10">
            {/* 10. Email */}
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-[12.5px] shrink-0">10. Email:</span>
              <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                {data.contactInfo.email || ""}
              </div>
            </div>

            {/* D. Bank Details */}
            <div className="pt-0.5">
              <div className="font-black text-[13.5px] uppercase bg-gray-100 border-2 border-black px-2.5 py-0.5 mb-2">
                D. Bank Details:
              </div>

              <div className="space-y-1.5">
                {/* 1. Bank Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[120px] shrink-0">1. Bank Name:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.bankDetails.bankName || ""}
                  </div>
                </div>

                {/* 2. Branch */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[120px] shrink-0">2. Branch:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.bankDetails.branch || ""}
                  </div>
                </div>

                {/* 3. IFSC */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[120px] shrink-0">3. IFSC:</span>
                  <div className="w-80 h-8 border-2 border-black px-2.5 flex items-center font-mono font-black text-[13.5px] uppercase tracking-wider bg-white">
                    {data.bankDetails.ifsc || ""}
                  </div>
                </div>

                {/* 4. Account Number */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] w-[120px] shrink-0">4. Account Number:</span>
                  <div className="w-88 h-8 border-2 border-black px-2.5 flex items-center font-mono font-black text-[13.5px] tracking-wider bg-white">
                    {data.bankDetails.accountNumber || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* E. Guardian's Details */}
            <div className="pt-0.5">
              <div className="font-black text-[13.5px] uppercase bg-gray-100 border-2 border-black px-2.5 py-0.5 mb-2">
                E. Guardian's Details:
              </div>

              <div className="space-y-1.5">
                {/* 1. Father's Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[160px] shrink-0">1. Father's Name:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-black text-[13px] uppercase min-h-[22px]">
                    {data.guardianDetails.fatherNameEng || ""}
                  </div>
                </div>

                {/* 2. পিতার নাম */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[160px] shrink-0">2. পিতার নাম:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianDetails.fatherNameBen || ""}
                  </div>
                </div>

                {/* 3. Mother's Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[160px] shrink-0">3. Mother's Name:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-black text-[13px] uppercase min-h-[22px]">
                    {data.guardianDetails.motherNameEng || ""}
                  </div>
                </div>

                {/* 4. মাতার নাম */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[160px] shrink-0">4. মাতার নাম:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianDetails.motherNameBen || ""}
                  </div>
                </div>

                {/* 5. Guardian's Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[160px] shrink-0">5. Guardian's Name*:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-black text-[13px] uppercase min-h-[22px]">
                    {data.guardianDetails.guardianNameEng || ""}
                  </div>
                </div>

                {/* 6. অভিভাবকের নাম */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[160px] shrink-0">6. অভিভাবকের নাম:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianDetails.guardianNameBen || ""}
                  </div>
                </div>

                {/* 7. Relationship */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] w-[220px] shrink-0">
                    7. Relationship(with Guardian's)*:
                  </span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianDetails.relationship || ""}
                  </div>
                </div>

                {/* 8. Annual Family Income & 9. Guardian's Qualification */}
                <div className="grid grid-cols-2 gap-5 items-center pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[12.5px] shrink-0">8. Annual Family Income:</span>
                    <div className="w-40 h-8 border-2 border-black px-2.5 flex items-center font-black text-[13px] bg-white">
                      {data.guardianDetails.annualIncome || ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[12.5px] shrink-0">9. Guardian's Qualification:</span>
                    <div className="w-44 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                      {data.guardianDetails.guardianQualification || ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* F. Guardian's Contact Information */}
            <div className="pt-0.5">
              <div className="font-black text-[13.5px] uppercase bg-gray-100 border-2 border-black px-2.5 py-0.5 mb-2">
                F. Guardian's Contact Information:
              </div>

              {/* 1. Village & 2. Habitation/Locality */}
              <div className="grid grid-cols-2 gap-5 items-baseline">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">1. Village :</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianContact.village || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">2. Habitation or Locality:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianContact.locality || ""}
                  </div>
                </div>
              </div>

              {/* 3. District & 4. Block/Municipality */}
              <div className="grid grid-cols-2 gap-5 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">3. District :</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianContact.district || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">4. Block/Municipality*:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianContact.blockMunicipality || ""}
                  </div>
                </div>
              </div>

              {/* 5. Panchayat & 6. Post Office */}
              <div className="grid grid-cols-2 gap-5 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">5. Panchayat:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianContact.panchayat || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">6. Post Office*:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianContact.postOffice || ""}
                  </div>
                </div>
              </div>

              {/* 7. Police Station & 8. Pin Code */}
              <div className="grid grid-cols-2 gap-5 mt-1.5 items-center">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">7. Police Station*:</span>
                  <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                    {data.guardianContact.policeStation || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[12.5px] shrink-0">8. Pin Code*:</span>
                  <div className="w-40 h-8 border-2 border-black px-2.5 flex items-center justify-center font-mono font-black text-[13.5px] tracking-wider bg-white">
                    {data.guardianContact.pinCode || ""}
                  </div>
                </div>
              </div>

              {/* 9. Contact No */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-bold text-[12.5px] shrink-0">9. Contact No. +91</span>
                <div className="w-80 h-8 border-2 border-black px-2.5 flex items-center font-mono font-black text-[13.5px] tracking-wider bg-white">
                  {data.guardianContact.contactNo || ""}
                </div>
              </div>

              {/* 10. Email */}
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-bold text-[12.5px] shrink-0">10. Email:</span>
                <div className="flex-1 border-b-2 border-dotted border-black pb-0.5 font-bold text-[13px] min-h-[22px]">
                  {data.guardianContact.email || ""}
                </div>
              </div>
            </div>

            {/* G. Other Information */}
            <div className="pt-0.5">
              <div className="font-black text-[13.5px] uppercase bg-gray-100 border-2 border-black px-2.5 py-0.5 mb-2">
                G. Other Information:
              </div>

              <div className="space-y-1.5">
                {/* 1. BPL Status & 2. BPL No */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[12.5px]">1. BPL Status :</span>
                    <div className="border-2 border-black px-3 py-1 font-black text-[12.5px] bg-white">
                      <span className={data.otherInfo.bplStatus === "YES" ? "text-red-600 underline font-black" : "text-black"}>YES</span>
                      {" / "}
                      <span className={data.otherInfo.bplStatus === "NO" ? "text-red-600 underline font-black" : "text-black"}>NO</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold text-gray-900 text-[12.5px]">If Yes,</span>
                    <span className="font-bold text-[12.5px]">2. BPL No:</span>
                    <div className="w-60 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                      {data.otherInfo.bplNo || ""}
                    </div>
                  </div>
                </div>

                {/* 3. Children with special need & 4. Type of Disability */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[12.5px]">3. Children with special need:</span>
                    <div className="border-2 border-black px-3 py-1 font-black text-[12.5px] bg-white">
                      <span className={data.otherInfo.cwsnStatus === "YES" ? "text-red-600 underline font-black" : "text-black"}>YES</span>
                      {" / "}
                      <span className={data.otherInfo.cwsnStatus === "NO" ? "text-red-600 underline font-black" : "text-black"}>NO</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold text-gray-900 text-[12.5px]">If Yes,</span>
                    <span className="font-bold text-[12.5px]">4. Type of Disability:</span>
                    <div className="w-60 h-8 border-2 border-black px-2.5 flex items-center font-bold text-[12.5px] bg-white">
                      {data.otherInfo.disabilityType || ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="w-full mt-auto pt-6 pb-1">
            <div className="grid grid-cols-3 gap-6 text-center items-end">
              <div className="flex flex-col items-center">
                <div className="w-48 border-t-2 border-black pt-1.5 font-black text-[13px] tracking-wide uppercase">
                  Approved by
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-52 border-t-2 border-black pt-1.5 font-black text-[13px] tracking-wide uppercase">
                  Applicant Signature
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-52 border-t-2 border-black pt-1.5 font-black text-[13px] tracking-wide uppercase">
                  Guardian Signature
                </div>
              </div>
            </div>

            {/* Page 2 Bottom Indicator */}
            <div className="w-full text-right text-[11px] text-gray-800 pt-1.5 mt-3 border-t border-gray-400 font-bold">
              Page 2 of 2 (Back)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
