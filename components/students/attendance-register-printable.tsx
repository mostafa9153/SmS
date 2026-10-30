"use client";

import React from "react";

const ACTIVE_STATUSES = [
  "Continuing",
  "New Admission",
  "Sent Up M.P.",
  "Detained",
  "10th test fail",
  "exam fail - C.C",
  "C.C.H.S.",
  "Supplementary",
  "Compartmental",
  "Suspended",
];

export { ACTIVE_STATUSES };

interface AttendanceRegisterStudent {
  presentRoll: number;
  name: string;
  fatherName: string;
  studentContact?: string;
  pen?: string;
  dob: string;
  aadhaar?: string;
}

interface AttendanceRegisterPrintableProps {
  students: AttendanceRegisterStudent[];
  className: string;
  section: string;
  schoolLogoUrl?: string;
}

const ROWS_PER_PAGE = 35;

function formatDOB(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

export const AttendanceRegisterPrintable: React.FC<AttendanceRegisterPrintableProps> = ({
  students,
  className,
  section,
  schoolLogoUrl,
}) => {
  const pages: AttendanceRegisterStudent[][] = [];
  if (students.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < students.length; i += ROWS_PER_PAGE) {
      pages.push(students.slice(i, i + ROWS_PER_PAGE));
    }
  }
  const totalPages = pages.length;

  return (
    <div className="attendance-register-print-root w-full bg-white text-neutral-950 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #attendance-register-print-portal {
              display: none;
            }
            @page {
              size: 420mm 297mm;
              margin: 0;
            }
            @media print {
              body > *:not(#attendance-register-print-portal) {
                display: none !important;
              }
              #attendance-register-print-portal {
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 420mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
              }
              html, body {
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 420mm !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .ar-page-break {
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .ar-page-break:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              .ar-page-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                width: 420mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {pages.map((pageStudents, pageIdx) => {
        return (
          <div
            key={`page-${pageIdx}`}
            className="ar-page-break mb-8 last:mb-0 print:mb-0 flex flex-col items-center"
          >
            <div className="print:hidden text-[15px] font-mono font-medium text-neutral-500 mb-2 flex items-center gap-2">
              <span className="bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded border border-neutral-700">
                Page {pageIdx + 1} of {totalPages}
              </span>
              <span>•</span>
              <span>
                Class {className}-{section} ({students.length} Students)
              </span>
            </div>

            <div className="ar-page-sheet w-[420mm] h-[297mm] max-h-[297mm] mx-auto p-[4mm] box-border overflow-hidden bg-white text-black relative flex flex-col shadow-2xl ring-1 ring-black/10 print:shadow-none print:ring-0">
              {/* Watermark */}
              {schoolLogoUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
                  <img
                    src={schoolLogoUrl}
                    alt=""
                    loading="eager"
                    decoding="async"
                    className="w-[120mm] h-[120mm] object-contain opacity-[0.08] grayscale select-none"
                  />
                </div>
              )}

              <div className="relative z-10 w-full h-full flex flex-col">
                <table className="w-full border-collapse text-[16px] leading-tight flex-1">
                  <thead>
                    <tr className="bg-neutral-100/80">
                      <th className="border border-black/70 px-[1.5mm] py-[1mm] text-center font-bold w-[16mm]">Roll</th>
                      <th className="border border-black/70 px-[1.5mm] py-[1mm] text-left font-bold w-[70mm]">Student Name</th>
                      <th className="border border-black/70 px-[1.5mm] py-[1mm] text-left font-bold w-[65mm]">Father&apos;s Name</th>
                      <th className="border border-black/70 px-[1.5mm] py-[1mm] text-center font-bold w-[35mm]">Phone</th>
                      <th className="border border-black/70 px-[1.5mm] py-[1mm] text-center font-bold w-[40mm]">PEN ID</th>
                      <th className="border border-black/70 px-[1.5mm] py-[1mm] text-center font-bold w-[28mm]">DOB</th>
                      <th className="border border-black/70 px-[1.5mm] py-[1mm] text-center font-bold w-[45mm]">Aadhar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageStudents.map((student, idx) => (
                      <tr key={`${student.presentRoll}-${idx}`} className="hover:bg-neutral-50/50">
                        <td className="border border-black/50 px-[1.5mm] text-center font-bold font-mono h-[7.75mm]">
                          {student.presentRoll}
                        </td>
                        <td className="border border-black/50 px-[1.5mm] text-left h-[7.75mm] truncate max-w-[70mm]">
                          {student.name}
                        </td>
                        <td className="border border-black/50 px-[1.5mm] text-left h-[7.75mm] truncate max-w-[65mm]">
                          {student.fatherName}
                        </td>
                        <td className="border border-black/50 px-[1.5mm] text-center font-mono h-[7.75mm]">
                          {student.studentContact || "—"}
                        </td>
                        <td className="border border-black/50 px-[1.5mm] text-center font-mono h-[7.75mm]">
                          {student.pen || "—"}
                        </td>
                        <td className="border border-black/50 px-[1.5mm] text-center font-mono h-[7.75mm]">
                          {formatDOB(student.dob)}
                        </td>
                        <td className="border border-black/50 px-[1.5mm] text-center font-mono h-[7.75mm]">
                          {student.aadhaar || "—"}
                        </td>
                      </tr>
                    ))}
                    {pageStudents.length === 0 && (
                      <tr>
                        <td colSpan={8} className="border border-black/50 px-[2mm] py-[4mm] text-center text-neutral-400 text-[10px]">
                          No students found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
