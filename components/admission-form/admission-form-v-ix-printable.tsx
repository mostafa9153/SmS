"use client";

import React from "react";
import {
  AdmissionFormVIxData,
  SchoolInfo,
  DEFAULT_SCHOOL_INFO,
} from "./types";

interface AdmissionFormVIxPrintableViewProps {
  data: AdmissionFormVIxData;
  school?: SchoolInfo;
  activePage?: "all" | "page1" | "page2";
}

export function AdmissionFormVIxPrintableView({
  data,
  school = DEFAULT_SCHOOL_INFO,
  activePage = "all",
}: AdmissionFormVIxPrintableViewProps) {
  // Split Aadhaar into 12 digits for individual boxes
  const aadhaarDigits = (data.basicInfo.aadhaarNo || "")
    .replace(/\D/g, "")
    .padEnd(12, " ")
    .slice(0, 12)
    .split("");

  return (
    <div className="admission-form-document text-black font-sans leading-tight print:w-full print:m-0 print:p-0">
      {/* ========================================================================= */}
      {/* PAGE 1 (FRONT PAGE) */}
      {/* ========================================================================= */}
      {(activePage === "all" || activePage === "page1") && (
        <div
          id="admission-page-1"
          className="admission-sheet relative bg-white mx-auto box-border flex flex-col justify-between"
          style={{
            width: "210mm",
            minHeight: "295mm",
            maxHeight: "295mm",
            padding: "6mm 10mm",
            pageBreakAfter: activePage === "all" ? "always" : "auto",
            breakAfter: activePage === "all" ? "page" : "auto",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {/* Header Section */}
          <div className="w-full">
            {/* Top Form No & Logo Row */}
            <div className="relative flex items-center justify-center mb-1">
              <div className="h-14 w-14 flex items-center justify-center">
                <img
                  src={school.logoUrl || "/logo.png"}
                  alt="School Logo"
                  className="h-14 w-14 object-contain"
                />
              </div>
              <div className="absolute right-0 top-0 text-[12px] font-bold font-mono tracking-wide">
                {data.formNo ? (data.formNo.toLowerCase().startsWith("form no") ? data.formNo : `Form No: ${data.formNo}`) : "Form No: MHS/AF/26/001"}
              </div>
            </div>

            {/* School Title & Subtitle */}
            <div className="text-center">
              <h1 className="text-[20px] font-extrabold uppercase tracking-tight text-black font-serif">
                {school.name}
              </h1>
              <p className="text-[10px] font-medium leading-normal">
                {school.address}
              </p>
              <p className="text-[10px] font-medium leading-normal">
                {school.districtStatePin}
              </p>
              <p className="text-[9.5px] font-medium text-gray-800">
                {school.contact}
              </p>
            </div>

            {/* Academic Year Heading & Floating Boxes */}
            <div className="relative mt-2 mb-2 min-h-[85px] flex items-center justify-center">
              {/* Photo Box (Left) */}
              <div className="absolute left-0 top-0 w-[30mm] h-[36mm] border-2 border-black flex flex-col items-center justify-center text-center p-1 bg-gray-50/30">
                <span className="text-[11px] font-bold tracking-wider">PHOTO</span>
                <span className="text-[8px] text-gray-500 mt-1 leading-tight">
                  Passport Size Photo
                </span>
              </div>

              {/* Center Title */}
              <div className="text-center">
                <h2 className="text-[15px] font-bold text-black">
                  Academic Year: {data.academicYear || "2026"}
                </h2>
                <h3 className="text-[14px] font-bold uppercase tracking-wide text-black mt-0.5 underline">
                  Application Form
                </h3>
              </div>

              {/* For Office Use Box (Right) */}
              <div className="absolute right-0 top-0 w-[42mm] border-2 border-black p-1.5 text-[10.5px] leading-[18px] bg-gray-50/20">
                <div className="font-bold text-[11px] text-center border-b border-black pb-0.5 mb-1">
                  For Office Use
                </div>
                <div className="flex justify-between">
                  <span>SL No –</span>
                  <span className="font-bold">{data.officeUse.slNo || ""}</span>
                </div>
                <div className="flex justify-between">
                  <span>Class –</span>
                  <span className="font-bold">{data.officeUse.class || ""}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sec. -</span>
                  <span className="font-bold">{data.officeUse.sec || ""}</span>
                </div>
                <div className="flex justify-between">
                  <span>Roll No. -</span>
                  <span className="font-bold">{data.officeUse.rollNo || ""}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="w-full space-y-2 mt-4 text-[11px]">
            {/* A. Basic Information */}
            <div>
              <div className="font-bold text-[12px] uppercase border-b border-black/80 pb-0.5 mb-1.5 flex items-center gap-2">
                <span>A. Basic Information:</span>
              </div>

              {/* 1. Name Eng & 2. Name Ben */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold w-[75px] shrink-0">1. Name:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-bold text-[12px] uppercase">
                    {data.basicInfo.nameEng || ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold w-[75px] shrink-0">2. নাম:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-medium text-[12px]">
                    {data.basicInfo.nameBen || ""}
                  </div>
                </div>
              </div>

              {/* 3. DOB & 4. Birth Regn No */}
              <div className="grid grid-cols-12 gap-3 mt-1.5 items-center">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="font-bold shrink-0">3. DOB:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center justify-center font-mono text-[11px] tracking-widest">
                    {data.basicInfo.dob ? data.basicInfo.dob.split("-").reverse().join(" / ") : "DD / MM / YYYY"}
                  </div>
                </div>

                <div className="col-span-7 flex items-center gap-2">
                  <span className="font-bold shrink-0">4. Birth Regn. No:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                    {data.basicInfo.birthRegNo || ""}
                  </div>
                </div>
              </div>

              {/* 5. Gender */}
              <div className="mt-1.5 flex items-center gap-4">
                <span className="font-bold">5. Gender*:</span>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-[11px] font-semibold">MALE</span>
                    <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[11px]">
                      {data.basicInfo.gender === "MALE" ? "✓" : ""}
                    </div>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-[11px] font-semibold">FEMALE</span>
                    <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[11px]">
                      {data.basicInfo.gender === "FEMALE" ? "✓" : ""}
                    </div>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-[11px] font-semibold">TRANSGENDER</span>
                    <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[11px]">
                      {data.basicInfo.gender === "TRANSGENDER" ? "✓" : ""}
                    </div>
                  </label>
                </div>
                <span className="text-[9.5px] italic text-gray-700 ml-auto">
                  (Give ✓ in the box)
                </span>
              </div>

              {/* 6. Social Category & 7. Religion */}
              <div className="grid grid-cols-2 gap-3 mt-1.5 items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold w-[120px] shrink-0">6. Social Category*:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                    {data.basicInfo.socialCategory || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-[90px] shrink-0">7. Religion*:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                    {data.basicInfo.religion || ""}
                  </div>
                </div>
              </div>

              {/* 8. Mother Tongue & 9. Nationality */}
              <div className="grid grid-cols-2 gap-3 mt-1.5 items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold w-[120px] shrink-0">8. Mother Tongue*:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                    {data.basicInfo.motherTongue || ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-[90px] shrink-0">9. Nationality*:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                    {data.basicInfo.nationality || "INDIAN"}
                  </div>
                </div>
              </div>

              {/* 10. Aadhaar No - 12 separate digit boxes */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-bold w-[100px] shrink-0">10. Aadhaar No:</span>
                <div className="flex items-center">
                  {aadhaarDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className={`w-6 h-6 border border-black flex items-center justify-center font-mono font-bold text-[12px] ${
                        idx === 3 || idx === 7 ? "mr-1.5 border-r" : "-mr-[1px]"
                      }`}
                    >
                      {digit.trim()}
                    </div>
                  ))}
                </div>
              </div>

              {/* 11. Blood Group, 12. Student ID, 13. Health ID */}
              <div className="grid grid-cols-12 gap-2 mt-1.5 items-center">
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">11. Blood Group:</span>
                  <div className="flex-1 h-6 border border-black px-1.5 flex items-center justify-center font-bold text-[11px]">
                    {data.basicInfo.bloodGroup || ""}
                  </div>
                </div>
                <div className="col-span-5 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">12. Student ID*:</span>
                  <div className="flex-1 h-6 border border-black px-1.5 flex items-center font-medium text-[11px]">
                    {data.basicInfo.studentId || ""}
                  </div>
                </div>
                <div className="col-span-4 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">13. Health ID:</span>
                  <div className="flex-1 h-6 border border-black px-1.5 flex items-center font-medium text-[11px]">
                    {data.basicInfo.healthId || ""}
                  </div>
                </div>
              </div>

              {/* 14. Identification Mark */}
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-bold shrink-0">14. Identification Mark:</span>
                <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                  {data.basicInfo.identificationMark || ""}
                </div>
              </div>
            </div>

            {/* B. Educational Information */}
            <div className="pt-1">
              <div className="font-bold text-[12px] uppercase border-b border-black/80 pb-0.5 mb-1.5">
                B. Educational Information:
              </div>

              {/* Present Info Row */}
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">1. Present Class*:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-bold text-[11px]">
                    {data.educationalInfo.presentClass || ""}
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">2. Section*:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-bold text-[11px]">
                    {data.educationalInfo.presentSection || ""}
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">3. Roll No:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-bold text-[11px]">
                    {data.educationalInfo.presentRoll || ""}
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">4. Stream:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-medium text-[11px]">
                    {data.educationalInfo.presentStream || ""}
                  </div>
                </div>
              </div>

              {/* Previous Info Row */}
              <div className="grid grid-cols-12 gap-2 mt-1.5 items-center">
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">5. Previous Class*:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-bold text-[11px]">
                    {data.educationalInfo.previousClass || ""}
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">6. Section*:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-bold text-[11px]">
                    {data.educationalInfo.previousSection || ""}
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">7. Roll No:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-bold text-[11px]">
                    {data.educationalInfo.previousRoll || ""}
                  </div>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold shrink-0">8. Stream:</span>
                  <div className="flex-1 h-6 border border-black px-1 flex items-center justify-center font-medium text-[11px]">
                    {data.educationalInfo.previousStream || ""}
                  </div>
                </div>
              </div>

              {/* Medium & Attendance */}
              <div className="grid grid-cols-12 gap-3 mt-1.5 items-center">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="font-bold shrink-0">9. Medium*:</span>
                  <div className="flex-1 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                    {data.educationalInfo.medium || "BENGALI"}
                  </div>
                </div>
                <div className="col-span-7 flex items-center gap-2">
                  <span className="font-bold shrink-0">10. No of days child attend school:</span>
                  <div className="w-20 h-6 border border-black px-2 flex items-center justify-center font-bold text-[11px]">
                    {data.educationalInfo.attendanceDays || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* C. Contact Information */}
            <div className="pt-1">
              <div className="font-bold text-[12px] uppercase border-b border-black/80 pb-0.5 mb-1.5">
                C. Contact Information:
              </div>

              {/* 1. Village & 2. Habitation/Locality */}
              <div className="grid grid-cols-2 gap-4 items-baseline">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">1. Village :</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.contactInfo.village || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">2. Habitation or Locality:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.contactInfo.locality || ""}
                  </div>
                </div>
              </div>

              {/* 3. District & 4. Block/Municipality */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">3. District :</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.contactInfo.district || "South 24 Parganas"}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">4. Block/Municipality*:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.contactInfo.blockMunicipality || ""}
                  </div>
                </div>
              </div>

              {/* 5. Panchayat & 6. Post Office */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">5. Panchayat:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.contactInfo.panchayat || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">6. Post Office*:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.contactInfo.postOffice || ""}
                  </div>
                </div>
              </div>

              {/* 7. Police Station & 8. Pin Code */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-center">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">7. Police Station*:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.contactInfo.policeStation || "Diamond Harbour"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">8. Pin Code*:</span>
                  <div className="w-32 h-6 border border-black px-2 flex items-center justify-center font-mono font-bold text-[11px] tracking-wider">
                    {data.contactInfo.pinCode || "743368"}
                  </div>
                </div>
              </div>

              {/* 9. Contact No */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-bold shrink-0">9. Contact No. +91</span>
                <div className="w-64 h-6 border border-black px-2 flex items-center font-mono font-bold text-[11px] tracking-wider">
                  {data.contactInfo.contactNo || ""}
                </div>
              </div>
            </div>
          </div>

          {/* Page 1 Bottom Indicator */}
          <div className="w-full text-right text-[9px] text-gray-500 pt-1 border-t border-gray-200 mt-2">
            Page 1 of 2 (Front)
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2 (BACK PAGE) */}
      {/* ========================================================================= */}
      {(activePage === "all" || activePage === "page2") && (
        <div
          id="admission-page-2"
          className="admission-sheet relative bg-white mx-auto box-border flex flex-col justify-between"
          style={{
            width: "210mm",
            minHeight: "295mm",
            maxHeight: "295mm",
            padding: "8mm 10mm 6mm 10mm",
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {/* Top of Page 2: Email & Bank Details */}
          <div className="w-full space-y-3 text-[11px]">
            {/* 10. Email */}
            <div className="flex items-baseline gap-2">
              <span className="font-bold shrink-0">10. Email:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                {data.contactInfo.email || ""}
              </div>
            </div>

            {/* D. Bank Details */}
            <div className="pt-1">
              <div className="font-bold text-[12px] uppercase border-b border-black/80 pb-0.5 mb-2">
                D. Bank Details:
              </div>

              <div className="space-y-2">
                {/* 1. Bank Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[95px] shrink-0">1. Bank Name:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                    {data.bankDetails.bankName || ""}
                  </div>
                </div>

                {/* 2. Branch */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[95px] shrink-0">2. Branch:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                    {data.bankDetails.branch || ""}
                  </div>
                </div>

                {/* 3. IFSC */}
                <div className="flex items-center gap-2">
                  <span className="font-bold w-[95px] shrink-0">3. IFSC:</span>
                  <div className="w-64 h-6 border border-black px-2 flex items-center font-mono font-bold text-[11px] uppercase">
                    {data.bankDetails.ifsc || ""}
                  </div>
                </div>

                {/* 4. Account Number */}
                <div className="flex items-center gap-2">
                  <span className="font-bold w-[95px] shrink-0">4. Account Number:</span>
                  <div className="w-72 h-6 border border-black px-2 flex items-center font-mono font-bold text-[11px]">
                    {data.bankDetails.accountNumber || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* E. Guardian's Details */}
            <div className="pt-1">
              <div className="font-bold text-[12px] uppercase border-b border-black/80 pb-0.5 mb-2">
                E. Guardian's Details:
              </div>

              <div className="space-y-2">
                {/* 1. Father's Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[140px] shrink-0">1. Father's Name:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-bold uppercase min-h-[18px]">
                    {data.guardianDetails.fatherNameEng || ""}
                  </div>
                </div>

                {/* 2. পিতার নাম */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[140px] shrink-0">2. পিতার নাম:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                    {data.guardianDetails.fatherNameBen || ""}
                  </div>
                </div>

                {/* 3. Mother's Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[140px] shrink-0">3. Mother's Name:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-bold uppercase min-h-[18px]">
                    {data.guardianDetails.motherNameEng || ""}
                  </div>
                </div>

                {/* 4. মাতার নাম */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[140px] shrink-0">4. মাতার নাম:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                    {data.guardianDetails.motherNameBen || ""}
                  </div>
                </div>

                {/* 5. Guardian's Name */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[140px] shrink-0">5. Guardian's Name*:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-bold uppercase min-h-[18px]">
                    {data.guardianDetails.guardianNameEng || ""}
                  </div>
                </div>

                {/* 6. অভিভাবকের নাম */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[140px] shrink-0">6. অভিভাবকের নাম:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                    {data.guardianDetails.guardianNameBen || ""}
                  </div>
                </div>

                {/* 7. Relationship */}
                <div className="flex items-baseline gap-2">
                  <span className="font-bold w-[190px] shrink-0">
                    7. Relationship(with Guardian's)*:
                  </span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[18px]">
                    {data.guardianDetails.relationship || ""}
                  </div>
                </div>

                {/* 8. Annual Family Income & 9. Guardian's Qualification */}
                <div className="grid grid-cols-2 gap-4 items-center pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold shrink-0">8. Annual Family Income:</span>
                    <div className="w-32 h-6 border border-black px-2 flex items-center font-bold text-[11px]">
                      {data.guardianDetails.annualIncome || ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold shrink-0">9. Guardian's Qualification:</span>
                    <div className="w-36 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                      {data.guardianDetails.guardianQualification || ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* F. Guardian's Contact Information */}
            <div className="pt-1">
              <div className="font-bold text-[12px] uppercase border-b border-black/80 pb-0.5 mb-2">
                F. Guardian's Contact Information:
              </div>

              {/* 1. Village & 2. Habitation/Locality */}
              <div className="grid grid-cols-2 gap-4 items-baseline">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">1. Village :</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.guardianContact.village || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">2. Habitation or Locality:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.guardianContact.locality || ""}
                  </div>
                </div>
              </div>

              {/* 3. District & 4. Block/Municipality */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">3. District :</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.guardianContact.district || "South 24 Parganas"}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">4. Block/Municipality*:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.guardianContact.blockMunicipality || ""}
                  </div>
                </div>
              </div>

              {/* 5. Panchayat & 6. Post Office */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-baseline">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">5. Panchayat:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.guardianContact.panchayat || ""}
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">6. Post Office*:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.guardianContact.postOffice || ""}
                  </div>
                </div>
              </div>

              {/* 7. Police Station & 8. Pin Code */}
              <div className="grid grid-cols-2 gap-4 mt-1.5 items-center">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold shrink-0">7. Police Station*:</span>
                  <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                    {data.guardianContact.policeStation || "Diamond Harbour"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold shrink-0">8. Pin Code*:</span>
                  <div className="w-32 h-6 border border-black px-2 flex items-center justify-center font-mono font-bold text-[11px] tracking-wider">
                    {data.guardianContact.pinCode || "743368"}
                  </div>
                </div>
              </div>

              {/* 9. Contact No */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-bold shrink-0">9. Contact No. +91</span>
                <div className="w-64 h-6 border border-black px-2 flex items-center font-mono font-bold text-[11px] tracking-wider">
                  {data.guardianContact.contactNo || ""}
                </div>
              </div>

              {/* 10. Email */}
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="font-bold shrink-0">10. Email:</span>
                <div className="flex-1 border-b border-dotted border-black pb-0.5 font-medium min-h-[17px]">
                  {data.guardianContact.email || ""}
                </div>
              </div>
            </div>

            {/* G. Other Information */}
            <div className="pt-1">
              <div className="font-bold text-[12px] uppercase border-b border-black/80 pb-0.5 mb-2">
                G. Other Information:
              </div>

              <div className="space-y-2">
                {/* 1. BPL Status & 2. BPL No */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">1. BPL Status :</span>
                    <div className="border border-black px-2 py-0.5 font-bold text-[10.5px]">
                      <span className={data.otherInfo.bplStatus === "YES" ? "text-red-600 underline" : "text-black"}>YES</span>
                      {" / "}
                      <span className={data.otherInfo.bplStatus === "NO" ? "text-red-600 underline" : "text-black"}>NO</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-semibold text-gray-700">If Yes,</span>
                    <span className="font-bold">2. BPL No:</span>
                    <div className="w-48 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                      {data.otherInfo.bplNo || ""}
                    </div>
                  </div>
                </div>

                {/* 3. Children with special need & 4. Type of Disability */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">3. Children with special need:</span>
                    <div className="border border-black px-2 py-0.5 font-bold text-[10.5px]">
                      <span className={data.otherInfo.cwsnStatus === "YES" ? "text-red-600 underline" : "text-black"}>YES</span>
                      {" / "}
                      <span className={data.otherInfo.cwsnStatus === "NO" ? "text-red-600 underline" : "text-black"}>NO</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-semibold text-gray-700">If Yes,</span>
                    <span className="font-bold">4. Type of Disability:</span>
                    <div className="w-48 h-6 border border-black px-2 flex items-center font-medium text-[11px]">
                      {data.otherInfo.disabilityType || ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures Footer */}
          <div className="w-full mt-8 pt-6 border-t border-transparent">
            <div className="grid grid-cols-3 gap-4 text-center items-end">
              <div className="flex flex-col items-center">
                <div className="w-40 border-t border-black pt-1 font-bold text-[11.5px]">
                  Approved by
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-44 border-t border-black pt-1 font-bold text-[11.5px]">
                  Applicant Signature
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-44 border-t border-black pt-1 font-bold text-[11.5px]">
                  Guardian Signature
                </div>
              </div>
            </div>

            {/* Page 2 Bottom Indicator */}
            <div className="w-full text-right text-[9px] text-gray-500 pt-2 mt-4 border-t border-gray-200">
              Page 2 of 2 (Back)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
