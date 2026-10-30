"use client";

import { createPortal } from "react-dom";
import { InvoicePrintableView } from "@/components/invoice/invoice-printable-view";
import { dbRowToInvoiceData, getInvoiceCategoryAndMode } from "@/components/invoice/tracker/helpers";
import type { InvoiceTrackerState } from "./use-invoice-tracker";

export function TrackerPrintLayer({ tracker }: { tracker: InvoiceTrackerState }) {
  const { admissionCategoryFilter, classFilter, filteredList, isPrintingLedger, mounted, reprintInvoice, schoolProfile, sessionFilter, statusFilter, verificationResult } = tracker;
  return (
    <>
      {/* Scoped print CSS for 1-Click Student Copy Reprint & A4 Ledger Portal */}
      <style jsx global>{`
        @media print {
          body:has(#single-invoice-reprint-portal) > *:not(#single-invoice-reprint-portal) {
            display: none !important;
          }
          body:has(#single-invoice-reprint-portal) {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #single-invoice-reprint-portal {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100vw !important;
            min-height: 100vh !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }

          body:has(#ledger-print-portal) > *:not(#ledger-print-portal) {
            display: none !important;
          }
          body:has(#ledger-print-portal) {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #ledger-print-portal {
            display: block !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            padding: 8mm !important;
            background: #ffffff !important;
          }
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
        }
      `}</style>

      {/* Portal 1: Single Student Copy Reprint */}
      {mounted && (reprintInvoice || verificationResult.invoice) && !isPrintingLedger
        ? createPortal(
            <div id="single-invoice-reprint-portal" className="hidden print:flex items-center justify-center">
              <InvoicePrintableView
                data={dbRowToInvoiceData(reprintInvoice || verificationResult.invoice!)}
                copyType="student"
                schoolProfile={schoolProfile}
              />
            </div>,
            document.body
          )
        : null}

      {/* Portal 2: Full A4 Audit Ledger & Fee Registry Print */}
      {mounted && isPrintingLedger
        ? createPortal(
            <div id="ledger-print-portal" className="hidden print:block bg-white text-black p-6 font-sans">
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {schoolProfile?.schoolLogoUrl ? (
                  <img src={schoolProfile.schoolLogoUrl} alt="Logo" className="h-14 w-14 object-contain" />
                ) : null}
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {schoolProfile?.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)"}
                  </h1>
                  <p className="text-[11px] font-semibold text-slate-600">
                    ESTD: {schoolProfile?.establishedYear || "1965"} • UDISE: {schoolProfile?.udiseCode || "19111305602"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {schoolProfile?.schoolAddress || "Marigachi, Mathurapur II, South 24 Parganas, West Bengal - 743349"}
                  </p>
                </div>
              </div>
              <div className="text-right border-l pl-4 border-slate-300">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Official Invoice Audit Ledger
                </h2>
                <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                  Academic Session: {sessionFilter === "ALL" ? "All Sessions" : sessionFilter}
                </p>
                <p className="text-[9.5px] font-mono text-slate-500">
                  Date: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Filter Summary Banner */}
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-300 text-[10px] font-semibold mb-4 flex items-center justify-between">
              <div className="space-x-2">
                <span>Session: <strong className="text-slate-900">{sessionFilter === "ALL" ? "All Sessions" : sessionFilter}</strong></span>
                <span>•</span>
                <span>Class: <strong className="text-slate-900">{classFilter === "ALL" ? "All Classes" : `Class ${classFilter}`}</strong></span>
                <span>•</span>
                <span>Category/Mode: <strong className="text-slate-900">
                  {admissionCategoryFilter === "ALL" ? "All Categories" : admissionCategoryFilter.replace("_", " ")}
                </strong></span>
                <span>•</span>
                <span>Status: <strong className="text-slate-900">{statusFilter}</strong></span>
              </div>
              <div>
                <span>Total Records: <strong className="text-slate-900">{filteredList.length}</strong></span>
                <span className="mx-2">•</span>
                <span>Total Amount: <strong className="text-slate-900">₹{(filteredList.reduce((sum, i) => (i as any).invoice_status !== 'cancelled' ? sum + (Number(i.total_amount) || 0) : sum, 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse text-[10px] text-slate-800">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-left">
                  <th className="p-1.5 border border-slate-900 w-8 text-center">#</th>
                  <th className="p-1.5 border border-slate-900">Invoice No</th>
                  <th className="p-1.5 border border-slate-900">Date &amp; Time</th>
                  <th className="p-1.5 border border-slate-900">Student &amp; Guardian Info</th>
                  <th className="p-1.5 border border-slate-900">Class &amp; Roll</th>
                  <th className="p-1.5 border border-slate-900">Category &amp; Mode</th>
                  <th className="p-1.5 border border-slate-900 text-right">Amount (₹)</th>
                  <th className="p-1.5 border border-slate-900 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((inv, idx) => {
                  const cat = getInvoiceCategoryAndMode(inv);
                  const isCancelled = (inv as any).invoice_status === "cancelled";
                  return (
                    <tr
                      key={inv.id || inv.invoice_number}
                      className={`border-b border-slate-300 ${idx % 2 === 1 ? "bg-slate-50" : "bg-white"} ${
                        isCancelled ? "line-through text-slate-400" : ""
                      }`}
                    >
                      <td className="p-1 border border-slate-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-1 border border-slate-300 font-mono font-bold">{inv.invoice_number}</td>
                      <td className="p-1 border border-slate-300 whitespace-nowrap">
                        {inv.issue_date} {inv.issue_time || ""}
                      </td>
                      <td className="p-1 border border-slate-300 font-medium">
                        <div>{inv.student_name || "[Blank Slip Write-in]"}</div>
                        {inv.guardian_name && (
                          <div className="text-[9px] text-slate-500">G: {inv.guardian_name}</div>
                        )}
                      </td>
                      <td className="p-1 border border-slate-300 font-semibold">
                        {inv.student_class
                          ? `Class ${inv.student_class} ${inv.section ? `- ${inv.section}` : ""} (Roll: ${
                              inv.roll_no || "-"
                            })`
                          : "N/A"}
                      </td>
                      <td className="p-1 border border-slate-300 font-semibold">
                        <span>{cat.label}</span> ({inv.payment_mode || "Cash"})
                      </td>
                      <td className="p-1 border border-slate-300 text-right font-mono font-bold">
                        ₹{Number(inv.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1 border border-slate-300 text-center font-bold">
                        {isCancelled ? "CANCELLED" : "ACTIVE"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Signature Footer */}
            <div className="mt-14 pt-6 border-t border-slate-400 flex items-end justify-between text-[11px] font-bold text-slate-800">
              <div className="text-center w-48 border-t border-slate-400 pt-1">
                Accountant / Cashier
              </div>
              <div className="text-center w-48 border-t border-slate-400 pt-1">
                Teacher In-Charge
              </div>
              <div className="text-center w-52 border-t border-slate-400 pt-1">
                Headmaster / Principal (Seal)
              </div>
            </div>
          </div>,
          document.body
        )
      : null}
    </>
  );
}
