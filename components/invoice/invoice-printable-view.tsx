"use client";

import React from "react";
import Image from "next/image";
import { type InvoiceData, calculateFeeTotal, numberToWordsINR } from "@/lib/utils/fee-config";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheck } from "lucide-react";

interface InvoicePrintableViewProps {
  data: InvoiceData;
  copyType?: "student" | "office" | "both";
}

function SingleSlip({
  data,
  copyLabel,
  watermark = false,
}: {
  data: InvoiceData;
  copyLabel: string;
  watermark?: boolean;
}) {
  const grandTotal = calculateFeeTotal(data.feeItems);
  const wordsAmount = numberToWordsINR(grandTotal);

  return (
    <div className="relative bg-white text-slate-900 p-5 rounded-xl border border-slate-300 shadow-sm print:shadow-none print:border print:border-slate-400 print:rounded-none flex flex-col justify-between font-sans text-xs overflow-hidden">
      {/* Optional faint background watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <span className="text-7xl font-extrabold uppercase tracking-widest text-slate-900 rotate-[-25deg]">
          MARIGACHI H.S.
        </span>
      </div>

      {/* TOP HEADER */}
      <div className="border-b-2 border-slate-800 pb-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="w-16 h-16 relative shrink-0">
            <img
              src="/school-logo.png"
              alt="School Logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* School Titles */}
          <div className="text-center flex-1">
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 uppercase">
              MARIGACHI HIGH SCHOOL (H.S.)
            </h1>
            <p className="text-[11px] font-semibold text-slate-700">
              মড়িগাছি হাই স্কুল (উঃ মাঃ) • স্থাপিত - ১৯৬৬
            </p>
            <p className="text-[9.5px] text-slate-600 leading-tight mt-0.5">
              Govt. Sponsored Higher Secondary Institution • Index: 11180201004 • UDISE: 19180201004
            </p>
            <p className="text-[9px] text-slate-500">
              Vill & P.O.: Kharigachi, P.S.: Diamond Harbour, Dist.: South 24 Parganas, PIN: 743368
            </p>
          </div>

          {/* Copy Badge & Seal */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className="inline-block border-2 border-slate-800 bg-slate-100 text-slate-900 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded tracking-wider">
              {copyLabel}
            </span>
            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{data.paymentStatus || "PAID"}</span>
            </div>
          </div>
        </div>

        {/* Title Ribbon */}
        <div className="mt-2 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px]">
          <span className="font-extrabold uppercase tracking-wide text-primary">
            ADMISSION & ANNUAL FEE RECEIPT
          </span>
          <span className="font-semibold text-slate-600">
            Session: <strong className="text-slate-900 font-mono">{data.academicSession}</strong>
          </span>
        </div>
      </div>

      {/* METADATA STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 text-[10.5px] border-b border-slate-200 bg-slate-50/70 px-2 my-2 rounded">
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Receipt No:</span>
          <span className="font-bold font-mono text-slate-900">{data.invoiceNumber}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Date:</span>
          <span className="font-bold text-slate-900">{data.issueDate}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Time:</span>
          <span className="font-bold text-slate-900">{data.issueTime}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Payment Mode:</span>
          <span className="font-bold text-slate-900">{data.paymentMode}</span>
        </div>
      </div>

      {/* STUDENT PARTICULARS */}
      <div className="rounded border border-slate-200 p-2 mb-2 bg-white text-[11px] space-y-1">
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-7">
            <span className="text-slate-500 text-[9.5px]">Student Name: </span>
            <strong className="text-slate-900 text-xs uppercase font-extrabold">{data.studentName}</strong>
          </div>
          <div className="col-span-5 text-right">
            <span className="text-slate-500 text-[9.5px]">Student ID / PEN: </span>
            <strong className="font-mono text-slate-900">{data.studentId || data.penNumber || "N/A"}</strong>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-0.5 border-t border-slate-100 text-[10.5px]">
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
          <div className="pt-0.5 border-t border-slate-100 text-[9.5px] text-slate-600 flex justify-between">
            {data.guardianName && <span>Guardian: <strong className="text-slate-800">{data.guardianName}</strong></span>}
            {data.contactNumber && <span>Contact: <strong className="text-slate-800 font-mono">{data.contactNumber}</strong></span>}
          </div>
        )}
      </div>

      {/* FEE BREAKDOWN TABLE */}
      <div className="flex-1 mb-2">
        <table className="w-full text-left border-collapse border border-slate-300 text-[10.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
              <th className="py-1 px-2 border-r border-slate-300 w-8 text-center font-bold">#</th>
              <th className="py-1 px-2 border-r border-slate-300 font-bold">Particulars / Fee Heads</th>
              <th className="py-1 px-2 text-right font-bold w-24">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.feeItems.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50/50">
                <td className="py-1 px-2 border-r border-slate-200 text-center font-mono text-slate-500 text-[10px]">
                  {idx + 1}
                </td>
                <td className="py-1 px-2 border-r border-slate-200 font-medium text-slate-800">
                  {item.name}
                </td>
                <td className="py-1 px-2 text-right font-mono font-semibold text-slate-900">
                  {Number(item.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-100/80 font-bold text-[11px]">
              <td colSpan={2} className="py-1.5 px-2 border-r border-slate-300 text-right uppercase tracking-wider text-slate-800">
                Total Amount Paid:
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-xs text-slate-950 font-extrabold bg-slate-200/60">
                ₹{grandTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* AMOUNT IN WORDS & ACKNOWLEDGEMENT */}
      <div className="border border-slate-200 rounded p-2 mb-3 bg-slate-50/50 space-y-1">
        <div className="text-[10px] text-slate-700">
          <span className="text-slate-500 font-medium">In Words: </span>
          <strong className="text-slate-900 italic capitalize">{wordsAmount}</strong>
        </div>
        <div className="text-[9.5px] text-slate-600 border-t border-slate-200/60 pt-1 flex items-center justify-between">
          <span>Received with thanks from <strong>{data.studentName}</strong>.</span>
          <span className="font-mono text-[9px] text-slate-500">Computer Generated Receipt</span>
        </div>
      </div>

      {/* SIGNATURES SECTION */}
      <div className="pt-2 border-t border-slate-300 grid grid-cols-2 items-end">
        {/* Cashier / Dealing Assistant */}
        <div className="text-center">
          <div className="h-10 flex items-end justify-center">
            <span className="text-slate-400 text-[9px] italic border-b border-dashed border-slate-300 px-6 pb-0.5">
              Verified & Received
            </span>
          </div>
          <p className="text-[10px] font-bold text-slate-800 uppercase mt-1">Cashier / Assistant</p>
          <p className="text-[8.5px] text-slate-500">Office of the School</p>
        </div>

        {/* HOD / Headmaster Signature Image & Seal */}
        <div className="text-center flex flex-col items-center">
          <div className="h-10 flex items-end justify-center relative w-32">
            <img
              src="/hod-signature.png"
              alt="HOD Signature"
              className="max-h-9 object-contain select-none"
            />
          </div>
          <p className="text-[10px] font-bold text-slate-900 uppercase mt-1">
            Teacher-in-Charge / Headmaster
          </p>
          <p className="text-[8.5px] font-medium text-slate-600">
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
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full">
        <SingleSlip data={data} copyLabel="STUDENT COPY" />
      </div>
    );
  }

  if (copyType === "office") {
    return (
      <div className="w-full max-w-2xl mx-auto print:max-w-none print:w-full">
        <SingleSlip data={data} copyLabel="OFFICE / COUNTERFOIL COPY" />
      </div>
    );
  }

  // Both: Dual Perforated Copy (Student + Office) on A4
  return (
    <div className="space-y-4 print:space-y-0 w-full max-w-3xl mx-auto">
      {/* Student Copy */}
      <div className="print:page-break-after-avoid">
        <SingleSlip data={data} copyLabel="STUDENT COPY" />
      </div>

      {/* Perforation Divider (Scissor Cut Line) */}
      <div className="relative py-2 flex items-center justify-center select-none print:py-3">
        <div className="border-b-2 border-dashed border-slate-400 w-full" />
        <div className="absolute bg-white px-3 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border border-slate-300 rounded-full shadow-2xs">
          <span>✂ Cut Along Line</span>
        </div>
      </div>

      {/* Office / Counterfoil Copy */}
      <div>
        <SingleSlip data={data} copyLabel="OFFICE / COUNTERFOIL COPY" />
      </div>
    </div>
  );
}
