"use client";

import React from "react";
import { SportsEvent, SportsParticipant } from "@/lib/sports/types";

interface SportsCallSheetPrintableViewProps {
  event: SportsEvent;
  participants: SportsParticipant[];
  schoolProfile?: {
    schoolName?: string;
    schoolAddress?: string;
    affiliationNo?: string;
    estdYear?: string;
    schoolLogoUrl?: string;
  };
}

export function SportsCallSheetPrintableView({
  event,
  participants,
  schoolProfile,
}: SportsCallSheetPrintableViewProps) {
  const schoolName = schoolProfile?.schoolName || "MODEL HIGH SCHOOL";
  const schoolAddress = schoolProfile?.schoolAddress || "School Campus, West Bengal";
  const logoSrc =
    schoolProfile?.schoolLogoUrl && schoolProfile.schoolLogoUrl.trim() !== ""
      ? schoolProfile.schoolLogoUrl
      : "/school-logo.png";

  return (
    <div className="relative w-[210mm] min-h-[295mm] bg-white text-black p-[8mm] mx-auto box-border flex flex-col justify-between print:w-[210mm] print:min-h-[295mm] print:p-[8mm] print:m-0 print:shadow-none shadow-md font-sans overflow-hidden">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="School Watermark"
          className="w-72 h-72 object-contain opacity-[0.07] grayscale"
        />
      </div>

      <div className="relative z-10">
        {/* Header Block with Left Logo */}
        <div className="border-b-2 border-black pb-2.5 mb-3 flex items-center justify-between gap-3">
          {/* Left School Logo */}
          <div className="w-[52px] h-[52px] shrink-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="School Logo"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Center Titles */}
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-xl font-black uppercase tracking-wider text-black">{schoolName}</h1>
            <p className="text-[11px] text-gray-700">{schoolAddress}</p>
            <div className="inline-block mt-1.5 px-3 py-0.5 bg-black text-white text-[11px] font-bold uppercase tracking-widest rounded-sm">
              Annual Athletic Meet • Event Call & Marshalling Sheet
            </div>
          </div>

          {/* Right Spacer / ESTD balance */}
          <div className="w-[52px] shrink-0 text-right text-[10px] text-gray-500 font-mono hidden sm:block">
            {schoolProfile?.estdYear ? `ESTD: ${schoolProfile.estdYear}` : ""}
          </div>
        </div>

        {/* Event Meta Grid */}
        <div className="grid grid-cols-4 gap-2 text-xs border border-black p-2 mb-3 bg-gray-50/70">
          <div>
            <span className="font-semibold text-gray-600 block text-[10px] uppercase">Event Name</span>
            <span className="font-bold text-sm text-black">{event.name}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600 block text-[10px] uppercase">Category</span>
            <span className="font-bold text-black">{event.category} ({event.gender})</span>
          </div>
          <div>
            <span className="font-semibold text-gray-600 block text-[10px] uppercase">Eligible Classes</span>
            <span className="font-bold text-black">{event.eligibleClasses.join(", ") || "All"}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-gray-600 block text-[10px] uppercase">Total Participants</span>
            <span className="font-bold text-sm text-black">{participants.length} Athletes</span>
          </div>
        </div>

        {/* Participant Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-center font-bold">
                <th className="border-r border-black p-1.5 w-10">Sl.</th>
                <th className="border-r border-black p-1.5 w-20 bg-gray-200 text-black font-extrabold text-sm">Chest #</th>
                <th className="border-r border-black p-1.5 w-16">Roll</th>
                <th className="border-r border-black p-1.5 text-left pl-2">Athlete Name</th>
                <th className="border-r border-black p-1.5 w-24">Class & Sec</th>
                <th className="border-r border-black p-1.5 w-20">Lane / Heat</th>
                <th className="border-r border-black p-1.5 w-16">Call [✓]</th>
                <th className="p-1.5 w-24">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                    No participants enrolled in this event yet.
                  </td>
                </tr>
              ) : (
                participants.map((p, index) => (
                  <tr key={p.studentId} className="border-b border-black/70 hover:bg-gray-50">
                    <td className="border-r border-black p-1.5 text-center font-medium">{index + 1}</td>
                    <td className="border-r border-black p-1.5 text-center font-black text-sm bg-gray-50">
                      {p.chestNumber}
                    </td>
                    <td className="border-r border-black p-1.5 text-center font-semibold">{p.presentRoll}</td>
                    <td className="border-r border-black p-1.5 text-left pl-2 font-bold uppercase tracking-tight">
                      {p.studentName}
                    </td>
                    <td className="border-r border-black p-1.5 text-center">
                      Class {p.presentClass} - {p.presentSection}
                    </td>
                    <td className="border-r border-black p-1.5 text-center text-gray-700 font-medium">
                      {p.laneOrHeat || "-"}
                    </td>
                    <td className="border-r border-black p-1.5 text-center">
                      <div className="w-4 h-4 border border-black mx-auto rounded-none"></div>
                    </td>
                    <td className="p-1.5 text-center text-gray-400"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Signatures Footer */}
      <div className="relative z-10 mt-6 pt-4 border-t border-black flex justify-between items-end text-xs">
        <div className="text-center w-48">
          <div className="border-b border-black border-dashed mb-1 h-8"></div>
          <p className="font-semibold">Event Marshaller / Starter</p>
        </div>
        <div className="text-center text-[10px] text-gray-500">
          Generated via {schoolName} SMS Sports Engine • {new Date().toLocaleDateString("en-GB")}
        </div>
        <div className="text-center w-48">
          <div className="border-b border-black border-dashed mb-1 h-8"></div>
          <p className="font-semibold">Sports Secretary / Headmaster</p>
        </div>
      </div>
    </div>
  );
}
