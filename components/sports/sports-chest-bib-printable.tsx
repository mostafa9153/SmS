"use client";

import React from "react";
import { SportsParticipant, SportsEvent } from "@/lib/sports/types";

interface SportsChestBibPrintableViewProps {
  participants: SportsParticipant[];
  event?: SportsEvent;
  schoolProfile?: {
    schoolName?: string;
    schoolLogoUrl?: string;
  };
}

export function SportsChestBibPrintableView({
  participants,
  event,
  schoolProfile,
}: SportsChestBibPrintableViewProps) {
  const schoolName = schoolProfile?.schoolName || "MODEL HIGH SCHOOL";
  const logoSrc =
    schoolProfile?.schoolLogoUrl && schoolProfile.schoolLogoUrl.trim() !== ""
      ? schoolProfile.schoolLogoUrl
      : "/school-logo.png";

  // Deduplicate participants by studentId AND by chestNumber:
  // Strictly guarantees each athlete has exactly ONE bib printed with NO DUPLICATE bib numbers
  const uniqueParticipants: SportsParticipant[] = [];
  const seenStudentIds = new Set<string>();
  const seenChestNumbers = new Set<string>();

  for (const p of participants) {
    if (!p.studentId || seenStudentIds.has(p.studentId)) continue;
    const cleanChest = String(p.chestNumber || "").trim();
    if (cleanChest && cleanChest !== "-" && seenChestNumbers.has(cleanChest)) {
      continue; // Skip duplicate chest number
    }

    seenStudentIds.add(p.studentId);
    if (cleanChest && cleanChest !== "-") {
      seenChestNumbers.add(cleanChest);
    }
    uniqueParticipants.push(p);
  }

  // Group participants in chunks of 2 for A4 Portrait sheets (strictly 2 bibs per sheet)
  const chunkedParticipants: SportsParticipant[][] = [];
  for (let i = 0; i < uniqueParticipants.length; i += 2) {
    chunkedParticipants.push(uniqueParticipants.slice(i, i + 2));
  }

  if (participants.length === 0) {
    return (
      <div className="w-[210mm] min-h-[297mm] bg-white text-black p-12 text-center text-gray-500 font-sans">
        No participants selected for chest bib generation.
      </div>
    );
  }

  return (
    <div className="space-y-0 print:space-y-0 font-sans">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 4mm;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .bib-sheet-container {
                width: 100% !important;
                height: 289mm !important;
                max-height: 289mm !important;
                padding: 2mm !important;
                margin: 0 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
              }
              .bib-single-card {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {chunkedParticipants.map((pagePair, pageIndex) => (
        <div
          key={pageIndex}
          className="bib-sheet-container w-[210mm] h-[297mm] max-h-[297mm] bg-white text-black p-[3mm] mx-auto box-border flex flex-col gap-[3mm] print:w-full print:h-[289mm] print:max-h-[289mm] print:p-[2mm] print:gap-[3mm] print:m-0 print:shadow-none shadow-md break-after-page page-break-after-always last:break-after-auto last:page-break-after-auto overflow-hidden"
        >
          {pagePair.map((participant, pairIndex) => {
            const numStr = String(participant.chestNumber || "");
            const numLen = numStr.length;
            // 250% Massive Chest Number (Scaled specifically for maximum impact while keeping full layout stability)
            const numberSizeClass =
              numLen <= 2
                ? "text-[400px]"
                : numLen === 3
                ? "text-[340px]"
                : "text-[260px]";

            return (
              <React.Fragment key={participant.studentId}>
              <div
                className="bib-single-card relative w-full flex-1 min-h-0 border-[2.5px] border-black border-dashed px-5 py-2 flex flex-col justify-between rounded-xl bg-white box-border overflow-hidden"
                style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
              >
                {/* Corner Pin Holes Markers - Positioned clearly in corners without overlapping text */}
                <div className="absolute top-2 left-2 w-3.5 h-3.5 border border-black rounded-full flex items-center justify-center text-[7px] font-black z-20 pointer-events-none">
                  ●
                </div>
                <div className="absolute top-2 right-2 w-3.5 h-3.5 border border-black rounded-full flex items-center justify-center text-[7px] font-black z-20 pointer-events-none">
                  ●
                </div>
                <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border border-black rounded-full flex items-center justify-center text-[7px] font-black z-20 pointer-events-none">
                  ●
                </div>
                <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border border-black rounded-full flex items-center justify-center text-[7px] font-black z-20 pointer-events-none">
                  ●
                </div>

                {/* Background Watermark behind the Chest Number */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoSrc}
                    alt="Watermark"
                    className="w-80 h-80 object-contain opacity-[0.06] grayscale"
                  />
                </div>

                {/* School Header (Shrink-0: Fixed height) */}
                <div className="relative z-10 text-center border-b-2 border-black pb-1 px-3 flex items-center justify-between gap-2 shrink-0">
                  <div className="w-[38px] h-[38px] shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoSrc}
                      alt="School Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wider leading-tight truncate">
                      {schoolName}
                    </h2>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-gray-700 leading-tight">
                      Annual Athletic Sports Meet
                    </div>
                  </div>
                  <div className="w-[38px] shrink-0"></div>
                </div>

                {/* 250% Giant Chest Number Section (Flex-1 Min-H-0: Anchored & Centered) */}
                <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center my-auto py-0">
                  <span className="text-[10px] font-black tracking-[0.3em] text-gray-400 uppercase mb-0">
                    ATHLETE BIB #
                  </span>
                  <div
                    className={`${numberSizeClass} font-black text-black tracking-tight leading-[0.72] select-all font-mono py-0`}
                  >
                    {participant.chestNumber}
                  </div>

                  {/* All Enrolled Games Displayed Together on This Single Bib */}
                  {(() => {
                    const eventsList =
                      participant.enrolledEvents && participant.enrolledEvents.length > 0
                        ? participant.enrolledEvents
                        : event
                        ? [event.name]
                        : [];

                    if (eventsList.length === 0) return null;

                    return (
                      <div
                        className={`mt-3 grid gap-1.5 w-full max-w-[90%] mx-auto auto-rows-fr ${
                          eventsList.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        }`}
                      >
                        {eventsList.map((evName) => (
                          <span
                            key={evName}
                            className="flex items-center justify-center text-center px-2 py-2 border-2 border-black bg-white text-black text-[22px] sm:text-2xl font-black uppercase tracking-wide rounded-md leading-tight"
                          >
                            {evName}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Athlete Details Footer (Shrink-0: 100% visible, fully intact on Page 1) */}
                <div className="relative z-10 border-t-2 border-black pt-1.5 px-6 pb-0.5 flex justify-between items-end text-xs shrink-0 bg-white">
                  <div className="text-left">
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">
                      Athlete Name
                    </span>
                    <p className="font-black text-sm sm:text-base uppercase text-black leading-tight tracking-wide">
                      {participant.studentName}
                    </p>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">
                      Class & Sec
                    </span>
                    <p className="font-bold text-xs sm:text-sm text-black leading-tight">
                      Class {participant.presentClass} ({participant.presentSection})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">
                      Roll No.
                    </span>
                    <p className="font-black text-xs sm:text-sm text-black font-mono leading-tight">
                      #{participant.presentRoll}
                    </p>
                  </div>
                </div>
              </div>

              {pairIndex === 0 && pagePair.length === 2 && (
                <div className="relative shrink-0 flex items-center justify-center h-0" aria-hidden="true">
                  <div className="absolute left-0 right-0 border-t-2 border-dashed border-gray-400" />
                  <span className="relative bg-white px-2 text-gray-400 text-[10px] tracking-widest flex items-center gap-1">
                    ✂ CUT HERE ✂
                  </span>
                </div>
              )}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
}