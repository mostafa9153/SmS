"use client";

import React from "react";
import { cn } from "@/lib/utils";

import { PAPER_MM, type PaperOrientation, type PaperSize, type PrintMargins } from "@/lib/print/paper";

export { PAPER_MM };
export type { PaperOrientation, PaperSize, PrintMargins };

export interface ClassTeacherRow {
  className: string;
  section: string;
  teacherName: string | null;
}

interface ClassTeacherListPrintableProps {
  rows: ClassTeacherRow[];
  paper: PaperSize;
  orientation: PaperOrientation;
  margins: PrintMargins;
  academicYear: number;
  schoolName: string;
  schoolLogoUrl?: string;
  headName?: string;
  headDesignation?: string;
  headSignatureUrl?: string;
  preview?: boolean;
}

// Reference content area: A4 with 10mm margins. Font and spacing scale against this.
const REF_AREA_MM2 = 190 * 277;
const MIN_ROW_MM = 6;
const MAX_ROW_MM = 14;
export const MIN_USABLE_MM = 60;

export function getPageBox(paper: PaperSize, orientation: PaperOrientation, margins: PrintMargins) {
  const base = PAPER_MM[paper];
  const pageW = orientation === "landscape" ? base.h : base.w;
  const pageH = orientation === "landscape" ? base.w : base.h;
  return {
    pageW,
    pageH,
    usableW: Math.max(MIN_USABLE_MM, pageW - margins.left - margins.right),
    usableH: Math.max(MIN_USABLE_MM, pageH - margins.top - margins.bottom),
  };
}

export function getPageCount(
  rowCount: number,
  paper: PaperSize,
  orientation: PaperOrientation,
  margins: PrintMargins
) {
  const m = getFitMetrics(getPageBox(paper, orientation, margins));
  return Math.max(1, Math.ceil(rowCount / m.rowsPerPage));
}

export function getFitMetrics(box: { usableW: number; usableH: number }) {
  const k = Math.sqrt((box.usableW * box.usableH) / REF_AREA_MM2);
  const headerMm = 30 * k;
  const theadMm = 8 * k;
  const footerMm = 34 * k;
  const bodyMm = box.usableH - headerMm - theadMm - footerMm;
  const rowsPerPage = Math.max(1, Math.floor(bodyMm / (MIN_ROW_MM * k)));
  return { k, headerMm, theadMm, footerMm, bodyMm, rowsPerPage };
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export const ClassTeacherListPrintable: React.FC<ClassTeacherListPrintableProps> = ({
  rows,
  paper,
  orientation,
  margins,
  academicYear,
  schoolName,
  schoolLogoUrl,
  headName,
  headDesignation,
  headSignatureUrl,
  preview = false,
}) => {
  const box = getPageBox(paper, orientation, margins);
  const m = getFitMetrics(box);
  const pages = chunk(rows, m.rowsPerPage);
  const { pageW, pageH } = box;

  return (
    <div
      className={cn(
        "class-teacher-list-root text-neutral-950 font-sans",
        preview ? "flex flex-col gap-6" : "bg-white"
      )}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #class-teacher-list-print-portal {
              display: none;
            }
            @page {
              size: ${pageW}mm ${pageH}mm;
              margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
            }
            .ctl-table th,
            .ctl-table td {
              border: 0.25mm solid #000;
              padding: 0 1.5mm;
              vertical-align: middle;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
            }
            .ctl-table th {
              font-weight: 700;
              text-align: center;
            }
            @media print {
              body > *:not(#class-teacher-list-print-portal) {
                display: none !important;
              }
              #class-teacher-list-print-portal {
                display: block !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: ${box.usableW}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                color: black !important;
              }
              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .ctl-page {
                box-shadow: none !important;
                border: none !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {pages.map((pageRows, pageIdx) => {
        const offset = pageIdx * m.rowsPerPage;
        const rowH = Math.min(MAX_ROW_MM * m.k, m.bodyMm / Math.max(1, pageRows.length));
        const isLast = pageIdx === pages.length - 1;

        const sheet = (
          <div
            className={cn(
              "ctl-page flex flex-col bg-white overflow-hidden",
              !preview && "mx-auto shadow-md border print:shadow-none print:border-none"
            )}
            style={{
              width: `${box.usableW}mm`,
              height: `${box.usableH}mm`,
              boxSizing: "border-box",
              pageBreakAfter: isLast ? "auto" : "always",
              breakAfter: isLast ? "auto" : "page",
              outline: preview ? "1px dashed rgba(100,116,139,0.55)" : undefined,
            }}
          >
            <div
              className="flex items-center justify-center text-center"
              style={{ height: `${m.headerMm}mm`, gap: `${3 * m.k}mm` }}
            >
              {schoolLogoUrl && (
                <img
                  src={schoolLogoUrl}
                  alt=""
                  style={{ height: `${12 * m.k}mm`, width: "auto", objectFit: "contain" }}
                />
              )}
              <div>
                <div style={{ fontSize: `${14 * m.k}pt`, fontWeight: 800 }}>{schoolName}</div>
                <div style={{ fontSize: `${11 * m.k}pt`, fontWeight: 700 }}>
                  Class Teacher List {academicYear}
                </div>
              </div>
            </div>

            <table
              className="ctl-table w-full"
              style={{
                borderCollapse: "collapse",
                tableLayout: "fixed",
                fontSize: `${10 * m.k}pt`,
              }}
            >
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "62%" }} />
              </colgroup>
              <thead>
                <tr style={{ height: `${m.theadMm}mm` }}>
                  <th>Sl</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Class Teacher</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={`${row.className}-${row.section}`} style={{ height: `${rowH}mm` }}>
                    <td className="text-center">{offset + i + 1}</td>
                    <td className="text-center font-bold">{row.className}</td>
                    <td className="text-center">{row.section}</td>
                    <td>{row.teacherName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isLast && (
              <div
                className="flex items-end justify-end text-right"
                style={{ marginTop: "auto", height: `${m.footerMm}mm`, fontSize: `${10 * m.k}pt` }}
              >
                <div className="flex flex-col items-end" style={{ gap: `${1 * m.k}mm` }}>
                  {headSignatureUrl && (
                    <img
                      src={headSignatureUrl}
                      alt=""
                      style={{ maxHeight: `${8 * m.k}mm`, width: "auto", objectFit: "contain" }}
                    />
                  )}
                  {headName && <div style={{ fontWeight: 700 }}>{headName}</div>}
                  {headDesignation && <div>{headDesignation}</div>}
                </div>
              </div>
            )}
          </div>
        );

        if (!preview) {
          return <React.Fragment key={`page-${pageIdx}`}>{sheet}</React.Fragment>;
        }

        return (
          <div
            key={`page-${pageIdx}`}
            className="bg-white shadow-lg"
            style={{
              width: `${pageW}mm`,
              height: `${pageH}mm`,
              padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
              boxSizing: "border-box",
            }}
          >
            {sheet}
          </div>
        );
      })}
    </div>
  );
};
