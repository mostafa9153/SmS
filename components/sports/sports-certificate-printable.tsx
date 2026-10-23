"use client";

import React from "react";
import { SportsParticipant, SportsEvent } from "@/lib/sports/types";

export type CertificateTemplate = "classic" | "ornate" | "navy" | "gold-curve";

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
  template?: CertificateTemplate;
}

/* ── Shared helpers ─────────────────────────────────────────────────── */

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveProps(winner: SportsParticipant, schoolProfile: SportsCertificatePrintableViewProps["schoolProfile"]) {
  const schoolName = schoolProfile?.schoolName || "MODEL HIGH SCHOOL";
  const schoolAddress = schoolProfile?.schoolAddress || "School Campus, West Bengal";
  const logoSrc = schoolProfile?.schoolLogoUrl?.trim() || "/school-logo.png";
  const rankText =
    winner.rankPosition === 1 ? "FIRST (1st)" :
    winner.rankPosition === 2 ? "SECOND (2nd)" :
    winner.rankPosition === 3 ? "THIRD (3rd)" :
    `${winner.rankPosition}th`;
  const rankBadgeColor =
    winner.rankPosition === 1 ? "border-amber-600 bg-amber-50 text-amber-900" :
    winner.rankPosition === 2 ? "border-slate-400 bg-slate-50 text-slate-800" :
    winner.rankPosition === 3 ? "border-amber-800 bg-amber-100/50 text-amber-950" :
    "border-black bg-gray-50 text-black";
  return { schoolName, schoolAddress, logoSrc, rankText, rankBadgeColor };
}

/* ── Template 1: Classic (current) ─────────────────────────────────── */

function CertificateClassic({
  winner, event, schoolName, schoolAddress, logoSrc, rankText, rankBadgeColor,
}: ReturnType<typeof resolveProps> & { winner: SportsParticipant; event: SportsEvent }) {
  return (
    <div className="w-[297mm] h-[208mm] bg-white text-black p-[10mm] mx-auto box-border flex flex-col justify-between print:w-[297mm] print:h-[208mm] print:p-[10mm] print:m-0 print:shadow-none shadow-xl font-serif relative overflow-hidden page-break-after-always break-after-page">
      <div className="absolute inset-2 border-4 border-amber-900/80 pointer-events-none" />
      <div className="absolute inset-3 border border-amber-900/40 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" className="w-72 h-72 object-contain opacity-[0.08] grayscale" />
      </div>
      <div className="text-center mt-3 z-10 flex items-center justify-between px-8">
        <div className="w-[56px] h-[56px] shrink-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="School Crest" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 text-center min-w-0">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-amber-950">{schoolName}</h1>
          <p className="text-xs text-gray-600 tracking-wide font-sans mt-0.5">{schoolAddress}</p>
          <div className="my-2.5 inline-block">
            <div className="px-6 py-1 bg-amber-900 text-amber-50 text-sm font-bold uppercase tracking-[0.25em] rounded-sm shadow-sm">
              Certificate of Merit &amp; Achievement
            </div>
            <p className="text-[11px] font-sans font-semibold text-gray-700 uppercase tracking-widest mt-1">
              Annual Athletic Sports Meet • {new Date().getFullYear()}
            </p>
          </div>
        </div>
        <div className="w-[56px] shrink-0" />
      </div>
      <div className="px-12 my-auto text-center z-10 leading-relaxed">
        <p className="text-sm italic text-gray-700">This is proudly awarded to</p>
        <div className="my-2 border-b-2 border-amber-900/60 inline-block px-10 pb-1">
          <span className="text-2xl font-extrabold uppercase tracking-wide text-amber-950 font-serif">{winner.studentName}</span>
        </div>
        <p className="text-sm font-sans text-gray-800 mt-2">
          a student of <span className="font-bold underline decoration-dotted">Class {winner.presentClass}</span> (Section{" "}
          <span className="font-bold underline decoration-dotted">{winner.presentSection}</span>, Roll{" "}
          <span className="font-bold underline decoration-dotted">#{winner.presentRoll}</span>), Bib{" "}
          <span className="font-bold font-mono underline decoration-dotted">{winner.chestNumber}</span>,
        </p>
        <p className="text-sm font-sans text-gray-800 mt-3">
          for securing the{" "}
          <span className={`inline-block px-3 py-0.5 border font-extrabold font-serif rounded ${rankBadgeColor}`}>{rankText} POSITION</span>{" "}
          in the athletic event of
        </p>
        <div className="my-2">
          <span className="text-xl font-bold uppercase tracking-wider text-black border-b border-black/40 pb-0.5">{event.name}</span>
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
      <div className="px-8 pb-3 z-10 flex justify-between items-end text-xs font-sans">
        <div className="text-center w-52">
          <p className="font-bold text-gray-700 text-[11px]">{new Date().toLocaleDateString("en-GB")}</p>
          <div className="border-t border-black/60 pt-1 mt-1 font-semibold text-gray-900">Date of Issue</div>
        </div>
        <div className="text-center w-52">
          <div className="h-9" />
          <div className="border-t border-black/60 pt-1 font-semibold text-gray-900">Sports Coordinator / In-Charge</div>
        </div>
        <div className="text-center w-52">
          <div className="h-9" />
          <div className="border-t border-black/60 pt-1 font-semibold text-gray-900">Headmaster / Principal</div>
        </div>
      </div>
    </div>
  );
}

/* ── Template 2: Ornate Gold Corner ────────────────────────────────── */

const OrnateCorner = ({ rotate }: { rotate: number }) => (
  <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: `rotate(${rotate}deg)`, display: "block" }}>
    <g fill="none" stroke="#B8860B" strokeWidth="1.1">
      <path d="M4,4 L4,82" />
      <path d="M4,4 L82,4" />
      <path d="M11,11 L11,58" />
      <path d="M11,11 L58,11" />
      {/* scroll flourish */}
      <path d="M11,11 C27,2 38,2 50,11 C44,16 34,13 29,8" />
      <path d="M11,11 C2,27 2,38 11,50 C16,44 13,34 8,29" />
    </g>
    {/* curl terminals */}
    <path d="M50,11 C56,6 59,10 54,14 C51,16 48,13 50,11 Z" fill="#B8860B" />
    <path d="M11,50 C6,56 10,59 14,54 C16,51 13,48 11,50 Z" fill="#B8860B" />
    {/* corner bloom */}
    <circle cx="11" cy="11" r="4" fill="#8B6914" stroke="#DAA520" strokeWidth="1" />
    <circle cx="11" cy="11" r="1.6" fill="#DAA520" />
    {/* diamond dots along edges */}
    <g fill="#DAA520">
      <rect x="23.5" y="2.5" width="3" height="3" transform="rotate(45 25 4)" />
      <rect x="38.5" y="2.5" width="3" height="3" transform="rotate(45 40 4)" />
      <rect x="2.5" y="23.5" width="3" height="3" transform="rotate(45 4 25)" />
      <rect x="2.5" y="38.5" width="3" height="3" transform="rotate(45 4 40)" />
    </g>
  </svg>
);

const MidEdgeOrnament = ({ vertical = false }: { vertical?: boolean }) => (
  <svg
    width={vertical ? 14 : 44}
    height={vertical ? 44 : 14}
    viewBox={vertical ? "0 0 14 44" : "0 0 44 14"}
    style={{ display: "block" }}
  >
    {vertical ? (
      <>
        <path d="M7,2 Q0,11 7,22 Q14,33 7,42" fill="none" stroke="#B8860B" strokeWidth="1" />
        <circle cx="7" cy="22" r="2.2" fill="#B8860B" />
      </>
    ) : (
      <>
        <path d="M2,7 Q11,0 22,7 Q33,14 42,7" fill="none" stroke="#B8860B" strokeWidth="1" />
        <circle cx="22" cy="7" r="2.2" fill="#B8860B" />
      </>
    )}
  </svg>
);

const LaurelWreath = () => (
  <svg viewBox="0 0 100 100" width="92" height="92" style={{ position: "absolute", inset: 0 }}>
    <g fill="#2D5A1B" opacity="0.82">
      <ellipse cx="18" cy="52" rx="6" ry="10" transform="rotate(-30 18 52)" />
      <ellipse cx="23" cy="37" rx="5" ry="9" transform="rotate(-15 23 37)" />
      <ellipse cx="31" cy="24" rx="5" ry="8" transform="rotate(5 31 24)" />
      <ellipse cx="44" cy="17" rx="5" ry="7" transform="rotate(22 44 17)" />
      <ellipse cx="19" cy="67" rx="6" ry="10" transform="rotate(-48 19 67)" />
      <ellipse cx="27" cy="80" rx="5" ry="8" transform="rotate(-65 27 80)" />
    </g>
    <g fill="#2D5A1B" opacity="0.82">
      <ellipse cx="82" cy="52" rx="6" ry="10" transform="rotate(30 82 52)" />
      <ellipse cx="77" cy="37" rx="5" ry="9" transform="rotate(15 77 37)" />
      <ellipse cx="69" cy="24" rx="5" ry="8" transform="rotate(-5 69 24)" />
      <ellipse cx="56" cy="17" rx="5" ry="7" transform="rotate(-22 56 17)" />
      <ellipse cx="81" cy="67" rx="6" ry="10" transform="rotate(48 81 67)" />
      <ellipse cx="73" cy="80" rx="5" ry="8" transform="rotate(65 73 80)" />
    </g>
    <path d="M43,89 Q50,83 57,89 Q50,96 43,89Z" fill="#2D5A1B" opacity="0.82" />
  </svg>
);

function CertificateOrnate({
  winner, event, schoolName, schoolAddress, logoSrc, rankText, rankBadgeColor,
}: ReturnType<typeof resolveProps> & { winner: SportsParticipant; event: SportsEvent }) {
  const year = new Date().getFullYear();
  const dateStr = new Date().toLocaleDateString("en-GB");

  return (
    <div
      className="w-[297mm] h-[210mm] bg-white text-black mx-auto box-border flex flex-col print:w-[297mm] print:h-[210mm] print:m-0 print:shadow-none shadow-xl relative overflow-hidden page-break-after-always break-after-page"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      {/* Google Fonts for gothic title + script name */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Great+Vibes&display=swap');`}</style>

      {/* Ornate corners */}
      <div style={{ position: "absolute", top: 8, left: 8 }}><OrnateCorner rotate={0} /></div>
      <div style={{ position: "absolute", top: 8, right: 8 }}><OrnateCorner rotate={90} /></div>
      <div style={{ position: "absolute", bottom: 8, left: 8 }}><OrnateCorner rotate={270} /></div>
      <div style={{ position: "absolute", bottom: 8, right: 8 }}><OrnateCorner rotate={180} /></div>

      {/* Mid-edge flourishes */}
      <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)" }}><MidEdgeOrnament /></div>
      <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)" }}><MidEdgeOrnament /></div>
      <div style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)" }}><MidEdgeOrnament vertical /></div>
      <div style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}><MidEdgeOrnament vertical /></div>

      {/* Gold frame lines */}
      <div style={{ position: "absolute", inset: 11, border: "1px solid #B8860B", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 16, border: "0.6px solid #DAA520", pointerEvents: "none" }} />

      {/* Watermark */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" style={{ width: 200, height: 200, objectFit: "contain", opacity: 0.06, filter: "grayscale(1)" }} />
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
          padding: "16mm 28mm 14mm",
        }}
      >
        {/* Header: logo + school + title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: 92, height: 92, marginBottom: 4, flexShrink: 0 }}>
            <LaurelWreath />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt={schoolName}
              style={{ position: "absolute", width: 48, height: 48, objectFit: "contain", top: "50%", left: "50%", transform: "translate(-50%, -55%)" }}
            />
          </div>

          <p style={{ fontSize: 48, fontWeight: 700, letterSpacing: "0.06em", color: "#2b2b2b", textTransform: "uppercase", margin: 0, lineHeight: 1.1, textAlign: "center" }}>
            {schoolName}
          </p>
          <p style={{ fontSize: 31.5, color: "#777", letterSpacing: "0.02em", margin: "4px 0 0", lineHeight: 1.25, textAlign: "center" }}>{schoolAddress}</p>

          <h1
            style={{
              fontFamily: "'UnifrakturMaguntia', 'Palatino Linotype', 'Book Antiqua', serif",
              fontSize: 48,
              color: "#8B6914",
              letterSpacing: "0.02em",
              margin: "10px 0 3px",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            Certificate of Merit &amp; Achievement
          </h1>

          <p style={{ fontSize: 10, color: "#888", letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
            Annual Athletic Sports Meet • {year}
          </p>
        </div>

        {/* Body: recipient + details */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <p style={{ fontSize: 13, color: "#666", fontStyle: "italic", margin: "0 0 4px" }}>This is proudly awarded to</p>

          <div style={{ borderBottom: "1.5px solid #B8860B", paddingBottom: 6, marginBottom: 12 }}>
            <span
              style={{
                fontFamily: "'Great Vibes', 'Brush Script MT', 'Segoe Script', cursive",
                fontSize: 60,
                color: "#1a1a1a",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              {toTitleCase(winner.studentName)}
            </span>
          </div>

          <p style={{ fontSize: 40, color: "#333", textAlign: "center", margin: "0 0 10px", lineHeight: 1.3, maxWidth: "90%" }}>
            a student of <strong>Class {winner.presentClass}</strong> (Section <strong>{winner.presentSection}</strong>, Roll{" "}
            <strong>#{winner.presentRoll}</strong>), Bib <strong>{winner.chestNumber}</strong>
          </p>

          <p style={{ fontSize: 40, color: "#333", textAlign: "center", margin: "0 0 10px", lineHeight: 1.3, maxWidth: "90%" }}>
            for securing the{" "}
            <span
              className={rankBadgeColor}
              style={{ border: "1px solid", padding: "2px 14px", fontWeight: "bold", borderRadius: 3, display: "inline-block" }}
            >
              {rankText} POSITION
            </span>{" "}
            in the athletic event of
          </p>

          <div style={{ marginBottom: 6, textAlign: "center" }}>
            <span style={{ fontSize: 22, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(0,0,0,0.35)", paddingBottom: 3 }}>
              {event.name}
            </span>
            {winner.bestScore && (
              <span style={{ display: "block", fontSize: 11, fontFamily: "monospace", color: "#666", marginTop: 4 }}>
                Performance: {winner.bestScore} {event.measurementUnit !== "None" ? event.measurementUnit : ""}
              </span>
            )}
          </div>

          <p style={{ fontSize: 12, fontStyle: "italic", color: "#888", textAlign: "center", maxWidth: "80%", margin: 0 }}>
            In recognition of outstanding athletic excellence, sportsman spirit, and exceptional performance.
          </p>
        </div>

        {/* Footer signatures */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ textAlign: "center", width: 180 }}>
            <p style={{ fontWeight: "bold", color: "#555", fontSize: 11.5, margin: 0 }}>{dateStr}</p>
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.55)", paddingTop: 5, fontSize: 11, fontWeight: 600, marginTop: 4 }}>Date of Issue</div>
          </div>
          <div style={{ textAlign: "center", width: 180 }}>
            <div style={{ height: 40 }} />
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.55)", paddingTop: 5, fontSize: 11, fontWeight: 600 }}>Sports Coordinator</div>
          </div>
          <div style={{ textAlign: "center", width: 180 }}>
            <div style={{ height: 40 }} />
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.55)", paddingTop: 5, fontSize: 11, fontWeight: 600 }}>Headmaster / Principal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main export ────────────────────────────────────────────────────── */

export function SportsCertificatePrintableView({
  winner,
  event,
  schoolProfile,
  template = "classic",
}: SportsCertificatePrintableViewProps) {
  const shared = resolveProps(winner, schoolProfile);

  if (template === "ornate") {
    return <CertificateOrnate {...shared} winner={winner} event={event} />;
  }

  // default: classic
  return <CertificateClassic {...shared} winner={winner} event={event} />;
}
