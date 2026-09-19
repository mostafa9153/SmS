"use client";

import React, { useMemo } from "react";
import { Student } from "@/lib/types";
import { SchoolProfileData, parseStudentAddress, getEffectiveHeadTitle } from "@/lib/utils/school-profile";
import { cn } from "@/lib/utils";

// ============================================================
// ISO/IEC 15417 Code 128 (Subset B) Vector SVG Generator
// Generates razor-sharp, 100% vector barcodes without external CDNs
// ============================================================
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

function generateCode128BModules(text: string): boolean[] {
  const clean = text.trim() || "STUDENT";
  // Filter ASCII 32 to 126
  const codes: number[] = [104]; // Start Code B
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
    }
  }

  // Calculate checksum: (start + sum(index * code)) % 103
  let sum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    sum += codes[i] * i;
  }
  codes.push(sum % 103);
  codes.push(106); // Stop Code

  // Convert to boolean array of modules (bars = true, spaces = false)
  const modules: boolean[] = [false, false, false, false, false]; // Quiet zone
  for (const sym of codes) {
    const pattern = CODE128_PATTERNS[sym] || "211214";
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }
  modules.push(false, false, false, false, false); // Quiet zone
  return modules;
}

export function Code128BarcodeSVG({ value, className = "h-7 w-40" }: { value: string; className?: string }) {
  const modules = useMemo(() => generateCode128BModules(value), [value]);

  return (
    <svg
      viewBox={`0 0 ${modules.length} 30`}
      preserveAspectRatio="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {modules.map((isBar, idx) =>
        isBar ? (
          <rect key={idx} x={idx} y={0} width={1} height={30} fill="#001a33" />
        ) : null
      )}
    </svg>
  );
}

// ============================================================
// Student ID Card Data Interface
// ============================================================
export interface StudentIDCardProps {
  student: Student;
  schoolProfile: SchoolProfileData;
  academicSession: string; // e.g. "2026" or "2026-27"
  validUpto: string;       // e.g. "31/12/2026"
  cardTitle?: string;      // default: "IDENTITY CARD"
  className?: string;
  isPrintingMode?: boolean;
}

export function StudentIDCardPrintableView({
  student,
  schoolProfile,
  academicSession,
  validUpto,
  cardTitle = "IDENTITY CARD",
  className,
}: StudentIDCardProps) {
  // Format Date of Birth (DD/MM/YYYY)
  const formattedDOB = useMemo(() => {
    if (!student.dob) return "N/A";
    const parts = student.dob.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return student.dob;
  }, [student.dob]);

  // Parse and sanitize address for Village and PIN only
  const { village, pincode } = useMemo(() => {
    return parseStudentAddress(student.address, schoolProfile);
  }, [student.address, schoolProfile]);

  const cleanVillage = useMemo(() => {
    let v = (village || "").trim();
    if (!v && student.address) {
      const match = student.address.match(/(?:vill(?:age)?[:.\s\-+]*)([a-zA-Z\s]+)/i);
      if (match) v = match[1];
    }
    // Strip prefixes like "+P.O-", "Vill-", "P.O.-"
    v = v.replace(/^(?:\+?\s*P\.?O\.?[:.\s\-]*|vill(?:age)?[:.\s\-]*|\+\s*)+/gi, "");
    v = v.replace(/^[+,\-;/.\s]+|[+,\-;/.\s]+$/g, "").trim();
    return v ? v.toUpperCase() : "MARIGACHI";
  }, [village, student.address]);

  const cleanPin = useMemo(() => {
    if (pincode && pincode.length === 6) return pincode;
    if (student.address) {
      const m = student.address.match(/\b\d{6}\b/);
      if (m) return m[0];
    }
    return schoolProfile?.pincode || "743349";
  }, [pincode, student.address, schoolProfile?.pincode]);

  const cleanSchoolDistrict = useMemo(() => {
    const d = schoolProfile?.district || "South 24 Parganas";
    return d.replace(/south\s*24\s*parganas/i, "South 24 Pgs")
            .replace(/north\s*24\s*parganas/i, "North 24 Pgs");
  }, [schoolProfile?.district]);

  // Clean class name (e.g. "Class IX" -> "IX")
  const cleanClass = useMemo(() => {
    if (!student.presentClass) return "—";
    return student.presentClass.replace(/^class\s*/i, "").trim();
  }, [student.presentClass]);

  const cleanSection = useMemo(() => {
    return student.presentSection || "A";
  }, [student.presentSection]);

  // Official student ID (schoolId) or fallback
  const displayStudentId = (student.schoolId || student.admissionNo || student.id || "MHS-001").toUpperCase();

  // Headmaster designation
  const headTitle = getEffectiveHeadTitle(schoolProfile).toUpperCase();

  return (
    <div
      className={cn(
        "cr80-card-root relative bg-white text-[#003366] rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col justify-between select-none print:shadow-none print:rounded-none print:border-none",
        // Exact Physical CR80 Dimensions in Millimeters for Print & Display
        "w-[54mm] h-[85.6mm] max-w-[54mm] max-h-[85.6mm] p-[3mm]",
        className
      )}
      style={{
        width: "54mm",
        height: "85.6mm",
        maxWidth: "54mm",
        maxHeight: "85.6mm",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* 1. Top Right Decorative Wave Accent (Strictly Top Border, Clean White Background for Text) */}
      <div className="absolute top-0 right-0 w-[28mm] h-[6mm] pointer-events-none overflow-hidden z-0">
        <svg viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,0 C35,14 75,4 120,18 L120,0 Z" fill="#38bdf8" opacity="0.5" />
          <path d="M20,0 C55,12 85,6 120,20 L120,0 Z" fill="#0284c7" opacity="0.8" />
          <path d="M45,0 C75,10 95,8 120,24 L120,0 Z" fill="#004080" />
        </svg>
      </div>

      {/* 2. Institutional Faint Watermark in Center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] grayscale overflow-hidden z-0">
        {schoolProfile.schoolLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={schoolProfile.schoolLogoUrl}
            alt="Watermark"
            className="w-44 h-44 object-contain"
          />
        ) : (
          <svg className="w-44 h-44 text-[#003366]" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
            <path d="M50 15 L70 35 L60 85 L40 85 L30 35 Z" />
            <circle cx="50" cy="50" r="18" />
          </svg>
        )}
      </div>

      {/* ======================================================== */}
      {/* TOP HEADER: Logo + Dynamic School Details (No Truncation) */}
      {/* ======================================================== */}
      <div className="relative z-10 flex items-center gap-1.5 pt-0.5 pb-1 shrink-0 border-b border-blue-100/70">
        {/* School Logo */}
        <div className="h-[10.5mm] w-[10.5mm] rounded-full bg-white border border-[#003366] p-0.5 shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
          {schoolProfile.schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={schoolProfile.schoolLogoUrl}
              alt="Logo"
              className="h-full w-full object-contain rounded-full"
            />
          ) : (
            <div className="h-full w-full rounded-full border border-blue-200 bg-blue-50/70 flex flex-col items-center justify-center text-center">
              <span className="text-[8px] font-black leading-none text-[#003366]">MHS</span>
              <span className="text-[5px] font-bold text-slate-500">1965</span>
            </div>
          )}
        </div>

        {/* School Information (Single-Line Crisp Typography) */}
        <div className="leading-tight text-left flex-1 min-w-0">
          <h2 className="text-[7.6px] font-black tracking-tight text-[#002b66] uppercase font-serif whitespace-nowrap leading-tight">
            {schoolProfile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
          </h2>
          <p className="text-[5.8px] text-slate-700 font-semibold leading-[7.5px] mt-0.5 whitespace-nowrap">
            {schoolProfile.village ? `${schoolProfile.village}, ` : ""}{cleanSchoolDistrict}, PIN : {schoolProfile.pincode || "743368"}
          </p>
          <p className="text-[5.4px] text-slate-600 font-medium leading-[7px] whitespace-nowrap">
            Ph : {schoolProfile.schoolPhone || "9800179717"} • UDISE : {schoolProfile.udiseCode || "19181212002"}
          </p>
          <p className="text-[5.2px] text-slate-500 font-medium leading-[6.5px] whitespace-nowrap">
            {schoolProfile.schoolEmail || "marigachihighschool@gmail.com"}
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIBBON BANNER: "IDENTITY CARD" (Inset Bordered Badge)    */}
      {/* ======================================================== */}
      <div className="relative z-10 mx-1 my-0.5 shrink-0">
        <div
          className="bg-[#004080] text-white text-center py-[2.2px] px-2 rounded-[2px] shadow-xs"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <h3 className="text-[9.5px] font-black tracking-widest uppercase font-serif leading-none">
            {cardTitle}
          </h3>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STUDENT PASSPORT PHOTO (Compact, Proportional Fit)        */}
      {/* ======================================================== */}
      <div className="relative z-10 flex flex-col items-center justify-center my-0.5 shrink-0">
        <div className="w-[18.5mm] h-[23mm] bg-slate-50 border border-slate-300 p-[1px] shadow-xs rounded-[2px] flex items-center justify-center overflow-hidden">
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photoUrl}
              alt={student.name}
              className="w-full h-full object-cover rounded-[1px]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span className="text-[5.5px] font-bold mt-0.5 uppercase tracking-wider text-slate-400">PHOTO</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* STUDENT DATA FIELDS (Comfortable, Cohesive, Breathable)  */}
      {/* ======================================================== */}
      <div className="relative z-10 px-0.5 flex-1 flex flex-col justify-center gap-[3.2px] my-0.5">
        {/* 1. Student Name (Prominent Identifier) */}
        <div className="flex items-baseline gap-1 leading-tight">
          <span className="text-[7.0px] font-bold text-[#003366] shrink-0">NAME:</span>
          <span className="font-black text-[#002244] uppercase tracking-tight text-[8.2px]">
            {student.name || "N/A"}
          </span>
        </div>

        {/* 2. Father's Name (Secondary Field) */}
        <div className="flex items-baseline gap-1 leading-tight">
          <span className="text-[6.5px] font-semibold text-[#003366] shrink-0">FATHER:</span>
          <span className="text-[6.8px] font-bold uppercase text-slate-800">
            {student.fatherName || student.guardianName || "N/A"}
          </span>
        </div>

        {/* 3. ID (Prominent) & Roll */}
        <div className="flex items-baseline gap-2.5 leading-tight">
          <div className="flex items-baseline gap-1">
            <span className="text-[7.0px] font-bold text-[#003366]">ID:</span>
            <span className="text-[7.8px] font-black font-mono text-[#002244]">{displayStudentId}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[6.5px] font-semibold text-[#003366]">ROLL:</span>
            <span className="text-[7.0px] font-bold text-slate-800">{student.presentRoll || (student as any).previousRollNo || "—"}</span>
          </div>
        </div>

        {/* 4. PEN ID (Simple Uniform Line) */}
        <div className="flex items-baseline gap-1 leading-tight">
          <span className="text-[6.5px] font-semibold text-[#003366] shrink-0">PEN ID:</span>
          <span className="text-[6.8px] font-bold font-mono text-slate-800">{student.pen || "—"}</span>
        </div>

        {/* 4. Class & Section (Prominent) & Session */}
        <div className="flex items-baseline gap-2 leading-tight">
          <div className="flex items-baseline gap-1">
            <span className="text-[7.0px] font-bold text-[#003366]">CLASS:</span>
            <span className="text-[7.8px] font-black text-[#002244]">{cleanClass}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[7.0px] font-bold text-[#003366]">SEC:</span>
            <span className="text-[7.8px] font-black text-[#002244]">{cleanSection}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[6.5px] font-semibold text-[#003366]">SESSION:</span>
            <span className="text-[6.8px] font-bold font-mono text-slate-800">{academicSession}</span>
          </div>
        </div>

        {/* 5. Mobile No */}
        <div className="flex items-baseline gap-1 leading-tight">
          <span className="text-[6.5px] font-semibold text-[#003366] shrink-0">MOBILE NO.:</span>
          <span className="text-[6.8px] font-bold font-mono text-slate-800">{student.studentContact || student.altMobile || "—"}</span>
        </div>

        {/* 6. Blood Group & DOB (Naturally placed together) */}
        <div className="flex items-baseline gap-3 leading-tight">
          <div className="flex items-baseline gap-1">
            <span className="text-[6.5px] font-semibold text-[#003366]">BLOOD GROUP:</span>
            <span className="text-[7.0px] font-black text-rose-700">{student.bloodGroup || "—"}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[6.5px] font-semibold text-[#003366]">DOB:</span>
            <span className="text-[6.8px] font-bold font-mono text-slate-800">{formattedDOB}</span>
          </div>
        </div>

        {/* 7. Address: Clean Village & PIN */}
        <div className="flex items-baseline gap-1 leading-tight">
          <span className="text-[6.5px] font-semibold text-[#003366] shrink-0">ADDRESS:</span>
          <span className="text-[6.6px] font-bold uppercase text-slate-700">
            VILL- {cleanVillage}, PIN- {cleanPin}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BARCODE + VALID UPTO (LEFT) & SIGNATURE (RIGHT)          */}
      {/* Compact & Discreet Bottom Bar                            */}
      {/* ======================================================== */}
      <div className="relative z-10 pt-1 flex items-end justify-between px-0.5 shrink-0">
        {/* Left: Barcode & Small Discreet Valid Upto */}
        <div className="flex flex-col items-start gap-0.5">
          <div className="bg-white border border-slate-200 p-[1px] rounded-[1px]">
            <Code128BarcodeSVG value={displayStudentId} className="h-[5.8mm] w-[25mm]" />
          </div>
          <div className="flex items-baseline gap-0.5 text-[4.8px] font-medium text-slate-500 leading-none pt-0.5">
            <span>VALID UPTO:</span>
            <span className="font-mono font-bold text-slate-700 text-[5.0px]">{validUpto}</span>
          </div>
        </div>

        {/* Right: Compact Signature & Small Designation */}
        <div className="flex flex-col items-center justify-end min-w-[18mm] text-center">
          {schoolProfile.headSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={schoolProfile.headSignatureUrl}
              alt="Signature"
              className="h-[4.0mm] w-auto max-w-[18mm] object-contain mb-0.5"
            />
          ) : (
            <div className="h-[4.0mm] flex items-center justify-center mb-0.5">
              <svg className="h-[3.8mm] w-12 text-[#003399]" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M5 22 C12 8, 18 26, 25 10 C32 28, 38 12, 50 18 C65 24, 75 8, 90 20 M60 5 L75 25" />
              </svg>
            </div>
          )}
          <span className="text-[5.2px] font-bold text-[#003366] uppercase tracking-tight leading-tight">
            {headTitle}
          </span>
        </div>
      </div>
    </div>
  );
}
