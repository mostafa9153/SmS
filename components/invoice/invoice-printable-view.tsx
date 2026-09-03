"use client";

import React from "react";
import { type InvoiceData, calculateFeeTotal, numberToWordsINR } from "@/lib/utils/fee-config";
import { CheckCircle2 } from "lucide-react";

interface InvoicePrintableViewProps {
  data: InvoiceData;
  copyType?: "student" | "office" | "both";
}

function CompactInvoiceSlip({
  data,
  copyLabel,
}: {
  data: InvoiceData;
  copyLabel: string;
}) {
  const grandTotal = calculateFeeTotal(data.feeItems);
  const wordsAmount = numberToWordsINR(grandTotal);

  return (
    <div className="relative w-full h-full flex flex-col justify-between text-slate-900 font-sans text-xs select-none">
      {/* Faint Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none z-0">
        <span className="text-4xl font-black uppercase tracking-widest text-slate-900 rotate-[-20deg]">
          MARIGACHI H.S.
        </span>
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* ================================================================= */}
        {/* 1. TOP HEADER (BREATHABLE & BALANCED)                             */}
        {/* ================================================================= */}
        <div className="border-b border-slate-700 pb-1.5 mb-1.5">
          <div className="flex items-center justify-between gap-2">
            {/* School Crest */}
            <div className="w-9 h-9 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/school-logo.png"
                alt="School Logo"
                className="w-full h-full object-contain"
              />
            </div>

            {/* School Details */}
            <div className="text-center flex-1">
              <h1 className="text-[11px] font-extrabold tracking-tight text-slate-950 uppercase leading-tight font-serif">
                MARIGACHI HIGH SCHOOL (H.S.)
              </h1>
              <p className="text-[7.5px] font-semibold text-slate-700 leading-tight mt-0.5">
                মড়িগাছি হাই স্কুল (উঃ মাঃ) &bull; স্থাপিত - ১৯৬৬ &bull; Govt. Sponsored
              </p>
              <p className="text-[7px] text-slate-500 leading-tight mt-0.5">
                Kharigachi, Diamond Harbour, South 24 Parganas, PIN: 743368
              </p>
            </div>

            {/* Copy Type Badge */}
            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              <span className="inline-block border border-slate-800 bg-slate-100 text-slate-900 font-bold text-[7px] uppercase px-1.5 py-0.5 rounded tracking-wide leading-none">
                {copyLabel}
              </span>
              <div className="flex items-center gap-0.5 text-[7px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded leading-none">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>{data.paymentStatus || "PAID"}</span>
              </div>
            </div>
          </div>

          {/* Title Ribbon */}
          <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[7.5px]">
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
        <div className="bg-slate-50/90 border border-slate-200 rounded p-1.5 mb-1.5 text-[8px] space-y-1 leading-tight">
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

          <div className="grid grid-cols-12 gap-1 pt-0.5">
            <div className="col-span-7">
              <span className="text-slate-500 text-[7.5px]">Student: </span>
              <strong className="text-slate-950 font-bold uppercase text-[9px]">
                {data.studentName}
              </strong>
            </div>
            <div className="col-span-5 text-right">
              <span className="text-slate-500 text-[7.5px]">ID: </span>
              <strong className="font-mono text-slate-900 text-[8px]">
                {data.studentId || data.penNumber || "N/A"}
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[7.5px]">
            <div>
              <span className="text-slate-500">Class: </span>
              <strong className="text-slate-900">{data.studentClass} ({data.section || "A"})</strong>
            </div>
            <div>
              <span className="text-slate-500">Roll No: </span>
              <strong className="font-mono text-slate-900">{data.rollNo || "01"}</strong>
            </div>
            {data.guardianName && (
              <div className="truncate max-w-[110px]">
                <span className="text-slate-500">Guardian: </span>
                <strong className="text-slate-800">{data.guardianName}</strong>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. FEE BREAKDOWN TABLE                                            */}
        {/* ================================================================= */}
        <div className="mb-1.5 overflow-hidden my-auto">
          <table className="w-full text-left border-collapse border border-slate-300 text-[7.5px]">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                <th className="py-0.5 px-1.5 border-r border-slate-300 w-4 text-center font-bold">#</th>
                <th className="py-0.5 px-1.5 border-r border-slate-300 font-bold">Particulars / Fee Heads</th>
                <th className="py-0.5 px-1.5 text-right font-bold w-14">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.feeItems.slice(0, 8).map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-[1.5px] px-1.5 border-r border-slate-200 text-center font-mono text-slate-500 text-[7px]">
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
              <tr className="border-t border-slate-800 bg-slate-100 font-bold text-[8px]">
                <td colSpan={2} className="py-1 px-1.5 border-r border-slate-300 text-right uppercase tracking-wider text-slate-800">
                  Total Paid:
                </td>
                <td className="py-1 px-1.5 text-right font-mono text-[8.5px] text-slate-950 font-extrabold bg-slate-200">
                  ₹{grandTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Amount in Words */}
        <div className="text-[7px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mb-1.5 flex items-center justify-between">
          <span className="truncate">
            <span className="text-slate-500">Words: </span>
            <strong className="text-slate-900 italic capitalize">{wordsAmount}</strong>
          </span>
          <span className="text-[6.5px] font-mono text-slate-400 shrink-0">SMS Generated</span>
        </div>

        {/* ================================================================= */}
        {/* 4. FOOTER SIGNATURES                                              */}
        {/* ================================================================= */}
        <div className="pt-1.5 border-t border-slate-300 grid grid-cols-2 items-end mt-auto">
          {/* Left: Cashier / Dealing Assistant */}
          <div className="text-left space-y-0.5">
            <div className="h-6 flex items-end">
              <span className="w-18 border-b border-slate-400 inline-block" />
            </div>
            <p className="text-[7.5px] font-bold text-slate-800 uppercase leading-none mt-0.5">
              Cashier / Dealing Staff
            </p>
            <p className="text-[6.5px] text-slate-500 leading-none">Office of the School</p>
          </div>

          {/* Right: Headmaster Signature */}
          <div className="text-right flex flex-col items-end space-y-0.5">
            <div className="h-6 flex items-end justify-end relative w-22">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hod-signature.png"
                alt="Headmaster Signature"
                className="max-h-5 object-contain select-none"
              />
            </div>
            <p className="text-[7.5px] font-bold text-slate-950 uppercase leading-none mt-0.5">
              Teacher-in-Charge / H.M.
            </p>
            <p className="text-[6.5px] text-slate-600 leading-none">Marigachi High School (H.S.)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoicePrintableView({
  data,
  copyType = "both",
}: InvoicePrintableViewProps) {
  if (copyType === "student") {
    return (
      <div
        id="pure-a5-invoice-sheet"
        className="relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden p-2.5 w-[210mm] h-[146mm] min-w-[210mm] max-w-[210mm] min-h-[146mm] max-h-[146mm] shadow-md print:shadow-none print:border print:border-slate-400 flex items-center justify-center"
      >
        <div className="w-[102mm] h-full border border-slate-300 p-2.5 rounded bg-white">
          <CompactInvoiceSlip data={data} copyLabel="STUDENT COPY" />
        </div>
      </div>
    );
  }

  if (copyType === "office") {
    return (
      <div
        id="pure-a5-invoice-sheet"
        className="relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden p-2.5 w-[210mm] h-[146mm] min-w-[210mm] max-w-[210mm] min-h-[146mm] max-h-[146mm] shadow-md print:shadow-none print:border print:border-slate-400 flex items-center justify-center"
      >
        <div className="w-[102mm] h-full border border-slate-300 p-2.5 rounded bg-white">
          <CompactInvoiceSlip data={data} copyLabel="OFFICE / COUNTERFOIL COPY" />
        </div>
      </div>
    );
  }

  // BOTH: Side-by-Side Dual Slips on 1 single A5 Landscape Sheet!
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
      <div className="w-[calc(50%-3.5mm)] h-full flex flex-col justify-between border border-slate-200 p-2.5 rounded-lg bg-white">
        <CompactInvoiceSlip data={data} copyLabel="STUDENT COPY" />
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

      {/* RIGHT HALF: OFFICE COPY */}
      <div className="w-[calc(50%-3.5mm)] h-full flex flex-col justify-between border border-slate-200 p-2.5 rounded-lg bg-white">
        <CompactInvoiceSlip data={data} copyLabel="OFFICE / COUNTERFOIL COPY" />
      </div>
    </div>
  );
}

export function InvoicePrintableBatchView({
  invoices,
  copyType = "both",
}: {
  invoices: InvoiceData[];
  copyType?: "student" | "office" | "both";
}) {
  return (
    <div className="w-full print:w-full space-y-4 print:space-y-0">
      {invoices.map((inv, index) => (
        <div
          key={inv.studentId || index}
          className={`w-full flex justify-center ${
            index < invoices.length - 1 ? "print:break-after-page" : ""
          }`}
          style={{
            pageBreakAfter: index < invoices.length - 1 ? "always" : "auto",
            breakAfter: index < invoices.length - 1 ? "page" : "auto",
          }}
        >
          <InvoicePrintableView data={inv} copyType={copyType} />
        </div>
      ))}
    </div>
  );
}
