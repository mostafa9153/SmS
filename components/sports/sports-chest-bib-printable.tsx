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

  // Group participants in chunks of 2 for A4 Portrait sheets (2 big bibs per sheet)
  const chunkedParticipants: SportsParticipant[][] = [];
  for (let i = 0; i < participants.length; i += 2) {
    chunkedParticipants.push(participants.slice(i, i + 2));
  }

  if (participants.length === 0) {
    return (
      <div className="w-[210mm] min-h-[295mm] bg-white text-black p-12 text-center text-gray-500 font-sans">
        No participants selected for chest bib generation.
      </div>
    );
  }

  return (
    <div className="space-y-0 print:space-y-0 font-sans">
      {chunkedParticipants.map((pagePair, pageIndex) => (
        <div
          key={pageIndex}
          className="w-[210mm] h-[295mm] bg-white text-black p-[10mm] mx-auto box-border flex flex-col justify-between print:w-[210mm] print:h-[295mm] print:p-[10mm] print:m-0 print:shadow-none shadow-md page-break-after-always break-after-page"
        >
          {pagePair.map((participant) => (
            <div
              key={participant.studentId}
              className="relative w-full h-[130mm] border-2 border-black border-dashed p-6 flex flex-col justify-between rounded-lg bg-white overflow-hidden"
            >
              {/* Corner Pin Holes Markers */}
              <div className="absolute top-2 left-2 w-3 h-3 border border-black rounded-full flex items-center justify-center text-[7px] font-bold">●</div>
              <div className="absolute top-2 right-2 w-3 h-3 border border-black rounded-full flex items-center justify-center text-[7px] font-bold">●</div>
              <div className="absolute bottom-2 left-2 w-3 h-3 border border-black rounded-full flex items-center justify-center text-[7px] font-bold">●</div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border border-black rounded-full flex items-center justify-center text-[7px] font-bold">●</div>

              {/* Background Watermark behind the Chest Number */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="Watermark"
                  className="w-56 h-56 object-contain opacity-[0.06] grayscale"
                />
              </div>

              {/* School Header with Left Logo */}
              <div className="relative z-10 text-center border-b-2 border-black pb-2 flex items-center justify-between gap-3">
                <div className="w-[42px] h-[42px] shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoSrc}
                    alt="School Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black uppercase tracking-wider">{schoolName}</h2>
                  <div className="text-[11px] font-bold tracking-widest uppercase text-gray-700">
                    Annual Athletic Sports Meet
                  </div>
                </div>
                <div className="w-[42px] shrink-0"></div>
              </div>

              {/* Massive Center Chest Number */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-1.5">
                <span className="text-[11px] font-bold tracking-widest text-gray-500 uppercase">ATHLETE BIB #</span>
                <div className="text-8xl font-black text-black tracking-tighter leading-none select-all font-mono py-1">
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
                    <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 max-w-[92%] mx-auto">
                      {eventsList.map((evName) => (
                        <span
                          key={evName}
                          className="inline-block px-2.5 py-0.5 bg-black text-white text-[11px] font-black uppercase tracking-wider rounded-md"
                        >
                          {evName}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Athlete Details Footer */}
              <div className="relative z-10 border-t-2 border-black pt-2 flex justify-between items-end text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Athlete Name</span>
                  <p className="font-extrabold text-sm uppercase text-black">{participant.studentName}</p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Class & Sec</span>
                  <p className="font-bold text-black">Class {participant.presentClass} ({participant.presentSection})</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Roll No.</span>
                  <p className="font-bold text-black font-mono">#{participant.presentRoll}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
