import React from "react";
import { type InvoiceData, calculateFeeTotal, numberToWordsINR } from "@/lib/utils/fee-config";
import {
  type SchoolProfileData,
  getSavedSchoolProfile,
  getEffectiveHeadTitle,
} from "@/lib/utils/school-profile";
import { CheckCircle2 } from "lucide-react";

interface InvoicePrintableViewProps {
  data: InvoiceData;
  copyType?: "student" | "school" | "office" | "both";
  schoolProfile?: SchoolProfileData;
}

function CompactInvoiceSlip({
  data,
  copyLabel,
  schoolProfile,
}: {
  data: InvoiceData;
  copyLabel: string;
  schoolProfile?: SchoolProfileData;
}) {
  const profile = schoolProfile || getSavedSchoolProfile();
  const grandTotal = calculateFeeTotal(data.feeItems);
  const wordsAmount = numberToWordsINR(grandTotal);
  const logoSrc = profile.schoolLogoUrl && profile.schoolLogoUrl.trim() !== "" ? profile.schoolLogoUrl : "/school-logo.png";
  const signatureSrc = profile.headSignatureUrl && profile.headSignatureUrl.trim() !== "" ? profile.headSignatureUrl : "/hod-signature.png";
  const effectiveHeadTitle = getEffectiveHeadTitle(profile);

  const isBlank = Boolean(
    data.isBlankTemplate || (!data.studentName?.trim() && !data.studentId?.trim())
  );

  return (
    <div className="relative w-full h-full flex flex-col justify-between text-slate-900 font-sans text-xs select-none px-1">
      {/* Background Institutional Watermark with 0.12 opacity */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="School Watermark"
          className="w-36 h-36 object-contain opacity-[0.12] grayscale"
        />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* ================================================================= */}
        {/* 1. TOP HEADER (BREATHABLE, BOLD & BALANCED)                       */}
        {/* ================================================================= */}
        <div className="border-b border-slate-700 pb-1.5 mb-1.5">
          <div className="flex items-center justify-between gap-2.5">
            {/* School Crest - Enlarged */}
            <div className="w-13 h-13 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="School Logo"
                className="w-full h-full object-contain"
              />
            </div>

            {/* School Details */}
            <div className="text-center flex-1 space-y-0.5">
              <h1 className="text-[14.5px] font-black tracking-tight text-slate-950 uppercase leading-none font-serif">
                {profile.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
              </h1>
              <p className="text-[9px] font-bold text-slate-700 leading-tight pt-0.5">
                ({profile.schoolType || "Co-Educational"} &bull; Established {profile.establishedYear || "1966"})
              </p>
              <p className="text-[8px] text-slate-600 leading-tight">
                {profile.village ? `${profile.village}, ` : ""}{profile.policeStation ? `${profile.policeStation}, ` : ""}{profile.district ? `${profile.district}, ` : ""}PIN: {profile.pincode || "743368"}
              </p>
            </div>

            {/* Copy Type Badge */}
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              <span className="inline-block border border-slate-800 bg-slate-100 text-slate-900 font-bold text-[8px] uppercase px-2 py-0.5 rounded tracking-wide leading-none font-sans">
                {copyLabel}
              </span>
              <div className="flex items-center gap-0.5 text-[7.5px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded leading-none">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>{data.paymentStatus || "PAID"}</span>
              </div>
            </div>
          </div>

          {/* Title Ribbon */}
          <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[8.5px]">
            <span className="font-extrabold uppercase tracking-wider text-teal-800">
              ADMISSION &amp; ANNUAL FEE RECEIPT
            </span>
            <span className="font-semibold text-slate-600">
              Session: <strong className="text-slate-900 font-mono">{data.academicSession}</strong>
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. METADATA & STUDENT PARTICULARS                                 */}
        {/* ================================================================= */}
        <div className="bg-slate-50/90 border border-slate-200 rounded p-1.5 mb-1.5 text-[9px] space-y-1 leading-tight">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-1">
            <div>
              <span className="text-slate-500">Receipt No: </span>
              <strong className="font-mono text-slate-900 font-bold">{data.invoiceNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500">Date: </span>
              <strong className="text-slate-900 font-mono">{data.issueDate}</strong>
            </div>
            <div>
              <span className="text-slate-500">Mode: </span>
              <strong className="text-slate-900 uppercase font-semibold">{data.paymentMode}</strong>
            </div>
          </div>

          {/* Row 1: Student Name (& ID only in Pre-Filled mode) */}
          {isBlank ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-slate-500 text-[8.5px] shrink-0 font-medium">Student: </span>
              <span className="flex-1 border-b border-dotted border-slate-400 h-3 align-bottom" />
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-1 pt-0.5">
              <div className="col-span-7">
                <span className="text-slate-500 text-[8.5px]">Student: </span>
                {data.studentName ? (
                  <strong className="text-slate-950 font-bold uppercase text-[10px]">
                    {data.studentName}
                  </strong>
                ) : (
                  <span className="inline-block border-b border-dotted border-slate-400 w-36 h-3 align-bottom" />
                )}
              </div>
              <div className="col-span-5 text-right">
                <span className="text-slate-500 text-[8.5px]">ID: </span>
                {data.studentId || data.penNumber ? (
                  <strong className="font-mono text-slate-900 text-[9px]">
                    {data.studentId || data.penNumber}
                  </strong>
                ) : (
                  <span className="inline-block border-b border-dotted border-slate-400 w-20 h-3 align-bottom" />
                )}
              </div>
            </div>
          )}

          {/* Row 2: Class, Roll No (shifted left), Guardian (shifted left with expansive write-in space) */}
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[8.5px]">
            {/* Class */}
            <div className="shrink-0 flex items-center gap-1">
              <span className="text-slate-500">Class: </span>
              <strong className="text-slate-900 font-bold">
                {data.studentClass || "____"}
                {data.section ? ` (${data.section})` : ""}
              </strong>
            </div>

            {/* Roll No: shifted to the left near Class */}
            <div className="shrink-0 flex items-center gap-1">
              <span className="text-slate-500">Roll No: </span>
              {isBlank ? (
                <span className="inline-block border-b border-dotted border-slate-400 w-11 h-3 align-bottom" />
              ) : (
                <strong className="font-mono text-slate-900">{data.rollNo || "—"}</strong>
              )}
            </div>

            {/* Guardian: shifted left right next to Roll No, expanding to fill remaining width */}
            <div className="flex-1 flex items-center gap-1 min-w-0">
              <span className="text-slate-500 shrink-0">Guardian: </span>
              {isBlank ? (
                <span className="flex-1 border-b border-dotted border-slate-400 h-3 align-bottom" />
              ) : (
                <strong className="text-slate-800 truncate">{data.guardianName || "—"}</strong>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. FEE BREAKDOWN TABLE                                            */}
        {/* ================================================================= */}
        <div className="mb-1.5 overflow-hidden my-auto">
          <table className="w-full text-left border-collapse border border-slate-300 text-[8.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                <th className="py-0.5 px-1.5 border-r border-slate-300 w-4 text-center font-bold">#</th>
                <th className="py-0.5 px-1.5 border-r border-slate-300 font-bold">Particulars / Fee Heads</th>
                <th className="py-0.5 px-1.5 text-right font-bold w-16">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.feeItems.slice(0, 8).map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-center font-mono text-slate-500 text-[8px]">
                    {idx + 1}
                  </td>
                  <td className="py-[1.5px] px-1.5 border-r border-slate-200 font-medium text-slate-800 truncate max-w-[130px]">
                    {item.name}
                  </td>
                  <td className="py-[1.5px] px-1.5 text-right font-mono font-semibold text-slate-900">
                    {Number(item.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-800 bg-slate-100 font-bold text-[9px]">
                <td colSpan={2} className="py-1 px-1.5 border-r border-slate-300 text-right uppercase tracking-wider text-slate-800">
                  Total Paid:
                </td>
                <td className="py-1 px-1.5 text-right font-mono text-[9.5px] text-slate-950 font-extrabold bg-slate-200">
                  ₹{grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="text-[8px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mb-1.5 flex items-center justify-between">
          <span className="truncate">
            <span className="text-slate-500">Words: </span>
            <strong className="text-slate-900 italic capitalize">{wordsAmount}</strong>
          </span>
          <span className="text-[7.5px] font-mono text-slate-400 shrink-0">SMS Generated</span>
        </div>

        {/* ================================================================= */}
        {/* 4. FOOTER SIGNATURES                                              */}
        {/* ================================================================= */}
        <div className="pt-1.5 border-t border-slate-300 grid grid-cols-2 items-end mt-auto">
          {/* Left: Cashier / Dealing Assistant */}
          <div className="text-left space-y-0.5">
            <div className="h-6 flex items-end">
              <span className="w-20 border-b border-slate-400 inline-block" />
            </div>
            <p className="text-[8.5px] font-bold text-slate-800 uppercase leading-none mt-0.5">
              Cashier / Dealing Staff
            </p>
            <p className="text-[7.5px] text-slate-500 leading-none">Office of the School</p>
          </div>

          {/* Right: Headmaster Signature */}
          <div className="text-right flex flex-col items-end space-y-0.5">
            <div className="h-6 flex items-end justify-end relative w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureSrc}
                alt="Head Signature"
                className="max-h-5 object-contain select-none"
              />
            </div>
            <p className="text-[8.5px] font-bold text-slate-950 uppercase leading-none mt-0.5">
              {effectiveHeadTitle}
            </p>
            <p className="text-[7.5px] text-slate-600 leading-none">{profile.schoolName || "Marigachi High School (H.S.)"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoicePrintableView({
  data,
  copyType = "both",
  schoolProfile,
}: InvoicePrintableViewProps) {
  if (copyType === "student") {
    return (
      <div
        id="pure-a5-invoice-sheet"
        className="relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden p-2.5 w-[210mm] h-[146mm] min-w-[210mm] max-w-[210mm] min-h-[146mm] max-h-[146mm] shadow-md print:shadow-none print:border print:border-slate-400 flex items-center justify-center"
      >
        <div className="w-[102mm] h-full border border-slate-300 p-3 rounded bg-white">
          <CompactInvoiceSlip data={data} copyLabel="STUDENT COPY" schoolProfile={schoolProfile} />
        </div>
      </div>
    );
  }

  if (copyType === "school" || copyType === "office") {
    return (
      <div
        id="pure-a5-invoice-sheet"
        className="relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden p-2.5 w-[210mm] h-[146mm] min-w-[210mm] max-w-[210mm] min-h-[146mm] max-h-[146mm] shadow-md print:shadow-none print:border print:border-slate-400 flex items-center justify-center"
      >
        <div className="w-[102mm] h-full border border-slate-300 p-3 rounded bg-white">
          <CompactInvoiceSlip data={data} copyLabel="SCHOOL COPY" schoolProfile={schoolProfile} />
        </div>
      </div>
    );
  }

  // BOTH: Side-by-Side Dual Slips (STUDENT COPY + SCHOOL COPY) on 1 single A5 Landscape Sheet!
  return (
    <div
      id="pure-a5-invoice-sheet"
      className="relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden flex flex-row items-stretch justify-between p-2.5 print:p-2 w-[210mm] h-[146mm] min-w-[210mm] max-w-[210mm] min-h-[146mm] max-h-[146mm] shadow-md print:shadow-none print:border print:border-slate-400"
      style={{
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* LEFT HALF: STUDENT COPY */}
      <div className="w-[calc(50%-3.5mm)] h-full flex flex-col justify-between border border-slate-200 p-3 rounded-lg bg-white">
        <CompactInvoiceSlip data={data} copyLabel="STUDENT COPY" schoolProfile={schoolProfile} />
      </div>

      {/* CENTER PERFORATION / CUTTING LINE */}
      <div className="w-[7mm] shrink-0 flex flex-col items-center justify-between py-1.5 relative select-none">
        <div className="text-[10px] text-slate-400 font-mono">✂</div>
        <div className="h-full border-r border-dashed border-slate-400 my-1" />
        <div className="text-[7px] font-mono text-slate-400 rotate-90 whitespace-nowrap my-auto tracking-widest uppercase">
          Cut Here
        </div>
        <div className="h-full border-r border-dashed border-slate-400 my-1" />
        <div className="text-[10px] text-slate-400 font-mono">✂</div>
      </div>

      {/* RIGHT HALF: SCHOOL COPY */}
      <div className="w-[calc(50%-3.5mm)] h-full flex flex-col justify-between border border-slate-200 p-3 rounded-lg bg-white">
        <CompactInvoiceSlip data={data} copyLabel="SCHOOL COPY" schoolProfile={schoolProfile} />
      </div>
    </div>
  );
}

export function InvoicePrintableA4Sheet({
  invoices,
  copyLabel = "STUDENT COPY",
  schoolProfile,
}: {
  invoices: (InvoiceData | null | undefined)[];
  copyLabel?: string;
  schoolProfile?: SchoolProfileData;
}) {
  return (
    <div className="relative w-[204mm] h-[289mm] mx-auto box-border grid grid-cols-2 grid-rows-2 gap-x-[4mm] gap-y-[5mm]">
      {/* Central Vertical Cutting Guide */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 flex flex-col items-center justify-between py-1 pointer-events-none z-20 select-none">
        <span className="text-[10px] text-slate-400 font-mono">✂</span>
        <div className="h-full border-r border-dashed border-slate-300 my-0.5" />
        <span className="text-[9px] text-slate-400 font-mono">✂</span>
        <div className="h-full border-r border-dashed border-slate-300 my-0.5" />
        <span className="text-[10px] text-slate-400 font-mono">✂</span>
      </div>

      {/* Central Horizontal Cutting Guide */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-4 flex items-center justify-between px-1 pointer-events-none z-20 select-none">
        <span className="text-[10px] text-slate-400 font-mono">✂</span>
        <div className="w-full border-b border-dashed border-slate-300 mx-0.5" />
        <span className="text-[9px] text-slate-400 font-mono">✂</span>
        <div className="w-full border-b border-dashed border-slate-300 mx-0.5" />
        <span className="text-[10px] text-slate-400 font-mono">✂</span>
      </div>

      {/* 4 Quadrants (2x2 Grid) */}
      {[0, 1, 2, 3].map((slotIdx) => {
        const inv = invoices[slotIdx];
        if (inv) {
          return (
            <div
              key={inv.invoiceNumber || slotIdx}
              className="w-[100mm] h-[142mm] border border-slate-300 p-2.5 rounded-lg bg-white box-border flex flex-col justify-between overflow-hidden relative shadow-2xs print:shadow-none print:border-slate-300"
            >
              <CompactInvoiceSlip
                data={inv}
                copyLabel={copyLabel}
                schoolProfile={schoolProfile}
              />
            </div>
          );
        }
        return (
          <div
            key={`empty-slot-${slotIdx}`}
            className="w-[100mm] h-[142mm] border border-dashed border-slate-200 rounded-lg bg-slate-50/20 box-border flex items-center justify-center text-slate-300 text-[10px] font-mono select-none print:border-slate-200 print:bg-transparent"
          >
            <span>✂ Blank / Cut Area</span>
          </div>
        );
      })}
    </div>
  );
}

export function InvoicePrintableBatchView({
  invoices,
  copyType = "both",
  schoolProfile,
}: {
  invoices: InvoiceData[];
  copyType?: "student" | "school" | "office" | "both";
  schoolProfile?: SchoolProfileData;
}) {
  const isA4FourUp = copyType === "student" || copyType === "school" || copyType === "office";
  const copyLabel =
    copyType === "school" || copyType === "office" ? "SCHOOL COPY" : "STUDENT COPY";

  // Bulk Student (or School) copy: Group into 4 slips per A4 sheet (2x2 grid)
  if (isA4FourUp) {
    const chunks: InvoiceData[][] = [];
    for (let i = 0; i < invoices.length; i += 4) {
      chunks.push(invoices.slice(i, i + 4));
    }

    return (
      <div className="w-full print:w-full space-y-6 print:space-y-0">
        {chunks.map((chunk, chunkIdx) => {
          const isLastPage = chunkIdx === chunks.length - 1;
          return (
            <div
              key={`a4-page-${chunkIdx}`}
              id="pure-a4-invoice-sheet"
              className={`relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden w-[210mm] h-[295mm] min-w-[210mm] max-w-[210mm] min-h-[295mm] max-h-[295mm] p-[3mm] shadow-md print:shadow-none print:border-none print:p-[3mm] flex items-center justify-center ${
                !isLastPage ? "print:break-after-page" : ""
              }`}
              style={{
                pageBreakInside: "avoid",
                breakInside: "avoid",
                pageBreakAfter: !isLastPage ? "always" : "auto",
                breakAfter: !isLastPage ? "page" : "auto",
              }}
            >
              <InvoicePrintableA4Sheet
                invoices={chunk}
                copyLabel={copyLabel}
                schoolProfile={schoolProfile}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Dual A5 Landscape (Student + School side-by-side on 1 A5 sheet per student)
  return (
    <div className="w-full print:w-full space-y-4 print:space-y-0">
      {invoices.map((inv, index) => {
        const isLastPage = index === invoices.length - 1;
        return (
          <div
            key={inv.studentId || inv.invoiceNumber || index}
            className={`w-full flex justify-center ${
              !isLastPage ? "print:break-after-page" : ""
            }`}
            style={{
              pageBreakAfter: !isLastPage ? "always" : "auto",
              breakAfter: !isLastPage ? "page" : "auto",
            }}
          >
            <InvoicePrintableView data={inv} copyType={copyType} schoolProfile={schoolProfile} />
          </div>
        );
      })}
    </div>
  );
}

