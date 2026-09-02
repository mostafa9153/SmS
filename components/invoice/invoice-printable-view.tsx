"use client";

import React from "react";
import { type InvoiceData, calculateFeeTotal, numberToWordsINR } from "@/lib/utils/fee-config";
import { CheckCircle2 } from "lucide-react";

interface InvoicePrintableViewProps {
  data: InvoiceData;
  copyType?: "student" | "office" | "both";
}

function SingleSlip({
  data,
  copyLabel,
}: {
  data: InvoiceData;
  copyLabel: string;
}) {
  const grandTotal = calculateFeeTotal(data.feeItems);
  const wordsAmount = numberToWordsINR(grandTotal);

  return (
    <div className="relative bg-white text-slate-900 p-4 sm:p-5 rounded-xl border border-slate-300 shadow-sm print:shadow-none print:border print:border-slate-400 print:rounded-none flex flex-col justify-between font-sans text-xs overflow-hidden print:p-2.5 print:h-[134mm] print:max-h-[134mm] print:box-border">
      {/* Optional faint background watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <span className="text-7xl font-extrabold uppercase tracking-widest text-slate-900 rotate-[-25deg]">
          MARIGACHI H.S.
        </span>
      </div>

      {/* TOP HEADER */}
      <div className="border-b-2 border-slate-800 pb-2 print:pb-1">
        <div className="flex items-center justify-between gap-2.5">
          {/* Logo */}
          <div className="w-14 h-14 print:w-11 print:h-11 relative shrink-0">
            <img
              src="/school-logo.png"
              alt="School Logo"
              className="w-14 h-14 print:w-11 print:h-11 object-contain"
            />
          </div>

          {/* School Titles */}
          <div className="text-center flex-1">
            <h1 className="text-sm sm:text-base print:text-[13px] font-extrabold tracking-tight text-slate-900 uppercase leading-none print:leading-tight">
              MARIGACHI HIGH SCHOOL (H.S.)
            </h1>
            <p className="text-[10px] print:text-[9.5px] font-semibold text-slate-700 leading-tight mt-0.5">
              মড়িগাছি হাই স্কুল (উঃ মাঃ) • স্থাপিত - ১৯৬৬
            </p>
            <p className="text-[9px] print:text-[8px] text-slate-600 leading-tight">
              Govt. Sponsored Higher Secondary Institution • Index: 11180201004 • UDISE: 19180201004
            </p>
            <p className="text-[8.5px] print:text-[7.5px] text-slate-500 leading-tight">
              Vill & P.O.: Kharigachi, P.S.: Diamond Harbour, Dist.: South 24 Parganas, PIN: 743368
            </p>
          </div>

          {/* Copy Badge & Seal */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className="inline-block border-2 border-slate-800 bg-slate-100 text-slate-900 font-extrabold text-[8.5px] uppercase px-1.5 py-0.5 rounded tracking-wider">
              {copyLabel}
            </span>
            <div className="flex items-center gap-1 text-[8.5px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
              <span>{data.paymentStatus || "PAID"}</span>
            </div>
          </div>
        </div>

        {/* Title Ribbon */}
        <div className="mt-1 pt-1 print:mt-0.5 print:pt-0.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[9.5px] print:text-[8px]">
          <span className="font-extrabold uppercase tracking-wide text-primary">
            ADMISSION & ANNUAL FEE RECEIPT
          </span>
          <span className="font-semibold text-slate-600">
            Session: <strong className="text-slate-900 font-mono">{data.academicSession}</strong>
          </span>
        </div>
      </div>

      {/* METADATA STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 py-1.5 print:py-0.5 text-[10px] print:text-[8.5px] border-b border-slate-200 bg-slate-50/70 px-2 my-1.5 print:my-0.5 rounded">
        <div>
          <span className="text-slate-500 block text-[8.5px] print:text-[7.5px] uppercase">Receipt No:</span>
          <span className="font-bold font-mono text-slate-900">{data.invoiceNumber}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[8.5px] print:text-[7.5px] uppercase">Date:</span>
          <span className="font-bold text-slate-900">{data.issueDate}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[8.5px] print:text-[7.5px] uppercase">Time:</span>
          <span className="font-bold text-slate-900">{data.issueTime}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[8.5px] print:text-[7.5px] uppercase">Payment Mode:</span>
          <span className="font-bold text-slate-900">{data.paymentMode}</span>
        </div>
      </div>

      {/* STUDENT PARTICULARS */}
      <div className="rounded border border-slate-200 p-1.5 print:p-1 mb-1.5 print:mb-0.5 bg-white text-[10.5px] print:text-[8.5px] space-y-0.5 leading-tight">
        <div className="grid grid-cols-12 gap-1.5">
          <div className="col-span-7">
            <span className="text-slate-500 text-[9px] print:text-[8px]">Student Name: </span>
            <strong className="text-slate-900 text-[11px] print:text-[9.5px] uppercase font-extrabold">{data.studentName}</strong>
          </div>
          <div className="col-span-5 text-right">
            <span className="text-slate-500 text-[9px] print:text-[8px]">Student ID / PEN: </span>
            <strong className="font-mono text-slate-900">{data.studentId || data.penNumber || "N/A"}</strong>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-0.5 border-t border-slate-100 text-[10px] print:text-[8px]">
          <div>
            <span className="text-slate-500">Class: </span>
            <strong className="text-slate-900">{data.studentClass}</strong>
          </div>
          <div className="text-center">
            <span className="text-slate-500">Section: </span>
            <strong className="text-slate-900">{data.section || "A"}</strong>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Roll No: </span>
            <strong className="font-mono text-slate-900">{data.rollNo || "01"}</strong>
          </div>
        </div>

        {(data.guardianName || data.contactNumber) && (
          <div className="pt-0.5 border-t border-slate-100 text-[9px] print:text-[7.5px] text-slate-600 flex justify-between">
            {data.guardianName && <span>Guardian: <strong className="text-slate-800">{data.guardianName}</strong></span>}
            {data.contactNumber && <span>Contact: <strong className="text-slate-800 font-mono">{data.contactNumber}</strong></span>}
          </div>
        )}
      </div>

      {/* FEE BREAKDOWN TABLE */}
      <div className="flex-1 mb-1 print:mb-0.5 overflow-hidden">
        <table className="w-full text-left border-collapse border border-slate-300 text-[10px] print:text-[8.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-7 text-center font-bold">#</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 font-bold">Particulars / Fee Heads</th>
              <th className="py-0.5 px-1.5 text-right font-bold w-20 print:w-16">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.feeItems.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/50">
                <td className="py-0.5 px-1.5 border-r border-slate-200 text-center font-mono text-slate-500 text-[9px] print:text-[7.5px]">
                  {idx + 1}
                </td>
                <td className="py-0.5 px-1.5 border-r border-slate-200 font-medium text-slate-800">
                  {item.name}
                </td>
                <td className="py-0.5 px-1.5 text-right font-mono font-semibold text-slate-900">
                  {Number(item.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-100/80 font-bold text-[10.5px] print:text-[9px]">
              <td colSpan={2} className="py-0.5 px-1.5 border-r border-slate-300 text-right uppercase tracking-wider text-slate-800">
                Total Amount Paid:
              </td>
              <td className="py-0.5 px-1.5 text-right font-mono text-[11px] print:text-[9.5px] text-slate-950 font-extrabold bg-slate-200/60">
                ₹{grandTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* AMOUNT IN WORDS & ACKNOWLEDGEMENT */}
      <div className="border border-slate-200 rounded p-1.5 print:p-1 mb-1.5 print:mb-0.5 bg-slate-50/50 space-y-0.5 leading-tight">
        <div className="text-[9.5px] print:text-[8px] text-slate-700">
          <span className="text-slate-500 font-medium">In Words: </span>
          <strong className="text-slate-900 italic capitalize">{wordsAmount}</strong>
        </div>
        <div className="text-[9px] print:text-[7.5px] text-slate-600 border-t border-slate-200/60 pt-0.5 flex items-center justify-between">
          <span>Received with thanks from <strong>{data.studentName}</strong>.</span>
          <span className="font-mono text-[8px] text-slate-400">Computer Generated Receipt</span>
        </div>
      </div>

      {/* SIGNATURES SECTION */}
      <div className="pt-1 print:pt-0.5 border-t border-slate-300 grid grid-cols-2 items-end">
        {/* Cashier / Dealing Assistant */}
        <div className="text-center">
          <div className="h-8 print:h-6 flex items-end justify-center">
            <span className="text-slate-400 text-[8.5px] print:text-[7.5px] italic border-b border-dashed border-slate-300 px-4 pb-0.5">
              Verified & Received
            </span>
          </div>
          <p className="text-[9.5px] print:text-[8.5px] font-bold text-slate-800 uppercase mt-0.5">Cashier / Assistant</p>
          <p className="text-[8px] print:text-[7px] text-slate-500">Office of the School</p>
        </div>

        {/* HOD / Headmaster Signature Image & Seal */}
        <div className="text-center flex flex-col items-center">
          <div className="h-8 print:h-6 flex items-end justify-center relative w-28">
            <img
              src="/hod-signature.png"
              alt="HOD Signature"
              className="max-h-7 print:max-h-5 object-contain select-none"
            />
          </div>
          <p className="text-[9.5px] print:text-[8.5px] font-bold text-slate-900 uppercase mt-0.5">
            Teacher-in-Charge / Headmaster
          </p>
          <p className="text-[8px] print:text-[7px] font-medium text-slate-600">
            Marigachi High School (H.S.)
          </p>
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
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full print:m-0">
        <SingleSlip data={data} copyLabel="STUDENT COPY" />
      </div>
    );
  }

  if (copyType === "office") {
    return (
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full print:m-0">
        <SingleSlip data={data} copyLabel="OFFICE / COUNTERFOIL COPY" />
      </div>
    );
  }

  // Both: Dual Perforated Copy (Student + Office) strictly on 1 single A4 page
  return (
    <div className="w-full max-w-3xl mx-auto space-y-3 print:space-y-0 print:max-w-none print:w-full print:m-0 print:h-[278mm] print:overflow-hidden print:flex print:flex-col print:justify-between">
      {/* Student Copy */}
      <div className="print:flex-1">
        <SingleSlip data={data} copyLabel="STUDENT COPY" />
      </div>

      {/* Perforation Divider (Scissor Cut Line) */}
      <div className="relative py-1.5 print:py-1 flex items-center justify-center select-none print:shrink-0">
        <div className="border-b border-dashed border-slate-400 w-full" />
        <div className="absolute bg-white px-2.5 text-[9px] print:text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 border border-slate-300 rounded-full shadow-2xs">
          <span>✂ Cut Along Line</span>
        </div>
      </div>

      {/* Office / Counterfoil Copy */}
      <div className="print:flex-1">
        <SingleSlip data={data} copyLabel="OFFICE / COUNTERFOIL COPY" />
      </div>
    </div>
  );
}
