"use client";

import React from "react";
import { SportsParticipant, SportsEvent } from "@/lib/sports/types";

interface SportsCertificatePrintableViewProps {
  winner: SportsParticipant;
  event: SportsEvent;
  schoolProfile?: {
    schoolName?: string;
    schoolAddress?: string;
    affiliationNo?: string;
    estdYear?: string;
    schoolLogoUrl?: string;
  };
}

export function SportsCertificatePrintableView({
  winner,
  event,
  schoolProfile,
}: SportsCertificatePrintableViewProps) {
  const schoolName = schoolProfile?.schoolName || "MODEL HIGH SCHOOL";
  const schoolAddress = schoolProfile?.schoolAddress || "School Campus, West Bengal";
  const logoSrc =
    schoolProfile?.schoolLogoUrl && schoolProfile.schoolLogoUrl.trim() !== ""
      ? schoolProfile.schoolLogoUrl
      : "/school-logo.png";

  const rankText =
    winner.rankPosition === 1
      ? "FIRST (1st)"
      : winner.rankPosition === 2
      ? "SECOND (2nd)"
      : winner.rankPosition === 3
      ? "THIRD (3rd)"
      : `${winner.rankPosition}th`;

  const rankBadgeColor =
    winner.rankPosition === 1
      ? "border-amber-600 bg-amber-50 text-amber-900"
      : winner.rankPosition === 2
      ? "border-slate-400 bg-slate-50 text-slate-800"
      : winner.rankPosition === 3
      ? "border-amber-800 bg-amber-100/50 text-amber-950"
      : "border-black bg-gray-50 text-black";

  return (
    <div className="w-[297mm] h-[208mm] bg-white text-black p-[10mm] mx-auto box-border flex flex-col justify-between print:w-[297mm] print:h-[208mm] print:p-[10mm] print:m-0 print:shadow-none shadow-xl font-serif relative overflow-hidden page-break-after-always break-after-page">
      {/* Decorative Ornate Double Border */}
      <div className="absolute inset-2 border-4 border-amber-900/80 pointer-events-none"></div>
      <div className="absolute inset-3 border border-amber-900/40 pointer-events-none"></div>

      {/* Background Institutional Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="School Watermark"
          className="w-72 h-72 object-contain opacity-[0.08] grayscale"
        />
      </div>

      {/* Certificate Header with Logo */}
      <div className="text-center mt-3 z-10 flex items-center justify-between px-8">
        <div className="w-[56px] h-[56px] shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="School Crest"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex-1 text-center min-w-0">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-amber-950">{schoolName}</h1>
          <p className="text-xs text-gray-600 tracking-wide font-sans mt-0.5">{schoolAddress}</p>
          
          <div className="my-2.5 inline-block">
            <div className="px-6 py-1 bg-amber-900 text-amber-50 text-sm font-bold uppercase tracking-[0.25em] rounded-sm shadow-sm">
              Certificate of Merit & Achievement
            </div>
            <p className="text-[11px] font-sans font-semibold text-gray-700 uppercase tracking-widest mt-1">
              Annual Athletic Sports Meet • {new Date().getFullYear()}
            </p>
          </div>
        </div>

        <div className="w-[56px] shrink-0"></div>
      </div>

      {/* Certificate Body Paragraph */}
      <div className="px-12 my-auto text-center z-10 leading-relaxed">
        <p className="text-sm italic text-gray-700">This is proudly awarded to</p>
        
        <div className="my-2 border-b-2 border-amber-900/60 inline-block px-10 pb-1">
          <span className="text-2xl font-extrabold uppercase tracking-wide text-amber-950 font-serif">
            {winner.studentName}
          </span>
        </div>

        <p className="text-sm font-sans text-gray-800 mt-2">
          a student of <span className="font-bold underline decoration-dotted">Class {winner.presentClass}</span> (Section{" "}
          <span className="font-bold underline decoration-dotted">{winner.presentSection}</span>, Roll{" "}
          <span className="font-bold underline decoration-dotted">#{winner.presentRoll}</span>), Bib Number{" "}
          <span className="font-bold font-mono underline decoration-dotted">{winner.chestNumber}</span>,
        </p>

        <p className="text-sm font-sans text-gray-800 mt-3">
          for securing the{" "}
          <span className={`inline-block px-3 py-0.5 border font-extrabold font-serif rounded ${rankBadgeColor}`}>
            {rankText} POSITION
          </span>{" "}
          in the athletic event of
        </p>

        <div className="my-2">
          <span className="text-xl font-bold uppercase tracking-wider text-black border-b border-black/40 pb-0.5">
            {event.name}
          </span>
          {winner.bestScore && (
            <span className="block text-xs font-mono font-semibold text-gray-600 mt-1">
              Performance: {winner.bestScore} {event.measurementUnit !== "None" ? event.measurementUnit : ""}
            </span>
          )}
        </div>

        <p className="text-xs italic text-gray-600 mt-2 font-serif">
          In recognition of outstanding athletic excellence, sportsman spirit, and exceptional performance.
        </p>
      </div>

      {/* Certificate Signatures Footer */}
      <div className="px-8 pb-3 z-10 flex justify-between items-end text-xs font-sans">
        <div className="text-center w-52">
          <p className="font-bold text-gray-700 text-[11px]">{new Date().toLocaleDateString("en-GB")}</p>
          <div className="border-t border-black/60 pt-1 mt-1 font-semibold text-gray-900">
            Date of Issue
          </div>
        </div>

        <div className="text-center w-52">
          <div className="h-9"></div>
          <div className="border-t border-black/60 pt-1 font-semibold text-gray-900">
            Sports Coordinator / In-Charge
          </div>
        </div>

        <div className="text-center w-52">
          <div className="h-9"></div>
          <div className="border-t border-black/60 pt-1 font-semibold text-gray-900">
            Headmaster / Principal
          </div>
        </div>
      </div>
    </div>
  );
}
