"use client";

import React, { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdmissionApplicationById } from "@/lib/data/admission";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, CheckCircle2, ShieldCheck, QrCode } from "lucide-react";

export default function ApplicationReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { profile } = useSchoolProfile();

  const { data: application, isLoading, error } = useQuery({
    queryKey: ["admission-application", id],
    queryFn: () => getAdmissionApplicationById(id),
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
        Loading Application Receipt...
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-bold text-destructive">Application not found</p>
        <Link href="/admission/new/apply" className="text-xs text-primary underline">
          Return to Admission Form
        </Link>
      </div>
    );
  }

  const schoolName = profile?.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)";
  const addressLine = profile?.schoolAddress || "Vill & P.O - Marigachi, P.S - Baduria, Dist - North 24 Parganas, PIN - 743401";
  const logoSrc = profile?.schoolLogoUrl || "/logo.png";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admission/new/apply"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border hover:bg-muted text-xs font-bold text-foreground transition-colors cursor-pointer"
            title="Submit another application"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Apply Another</span>
          </Link>
          <div>
            <h1 className="text-lg font-black text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Application Submitted Successfully</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Receipt Slip</span>
          </Button>
        </div>
      </div>

      {/* Printable Receipt Paper Container */}
      <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:p-0 max-w-2xl mx-auto space-y-6 select-none font-sans">
        {/* Header with School Crest */}
        <div className="text-center border-b-2 border-slate-800 pb-4 relative">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src={logoSrc} alt="School Logo" className="h-16 w-16 object-contain" />
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-black tracking-tight uppercase text-slate-950">
                {schoolName}
              </h2>
              <p className="text-[11px] font-medium text-slate-600 max-w-md mx-auto">
                {addressLine}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase mt-0.5">
                Index No: 15-081 • H.S. Code: 115272 • U-DISE: 19110714202
              </p>
            </div>
          </div>

          <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider mt-1">
            New Admission Application Receipt (Session 2026)
          </div>
        </div>

        {/* Application Key Info Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Application No
            </span>
            <span className="font-mono font-black text-sm text-primary">
              {application.applicationNo}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Target Admission Class
            </span>
            <span className="font-black text-sm text-slate-900">
              Class {application.targetClass}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Submission Date
            </span>
            <span className="font-semibold text-xs text-slate-800">
              {new Date(application.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Student Details Grid */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 border-b border-slate-200">
            Candidate Particulars
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                Student Name
              </span>
              <span className="font-bold text-slate-900 text-sm">{application.studentName}</span>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                Gender &amp; DOB
              </span>
              <span className="font-bold text-slate-900">
                {application.gender} • {application.dob || "N/A"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                Father&apos;s Name
              </span>
              <span className="font-semibold text-slate-800">{application.fatherName || "N/A"}</span>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                Mother&apos;s Name
              </span>
              <span className="font-semibold text-slate-800">{application.motherName || "N/A"}</span>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                Contact Mobile
              </span>
              <span className="font-mono font-bold text-slate-900">
                {application.studentContact || "N/A"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                Category &amp; Religion
              </span>
              <span className="font-semibold text-slate-800">
                {application.socialCategory || "General"} • {application.religion || "Islam"}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                Residential Address
              </span>
              <span className="text-slate-800">
                {application.village || application.address || "N/A"},{" "}
                P.O: {application.postOffice || "N/A"}, P.S: {application.policeStation || "N/A"},{" "}
                Dist: {application.district || "N/A"} - {application.pincode || ""}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Instructions Banner */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1.5">
          <p className="font-bold flex items-center gap-1.5 text-amber-900">
            <ShieldCheck className="h-4 w-4" />
            <span>Instructions for Admission Confirmation:</span>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
            <li>
              Please submit this <strong>Receipt Slip</strong> at the school admission counter along with 2 passport photographs.
            </li>
            <li>
              Original and photocopy of the <strong>Birth Certificate</strong> and <strong>Transfer Certificate (TC)</strong> must be shown.
            </li>
            <li>
              The school authority will verify the payment and assign your official <strong>Section &amp; Roll Number</strong>.
            </li>
          </ul>
        </div>

        {/* Signature & Seal Footer */}
        <div className="pt-8 flex items-end justify-between border-t border-dashed border-slate-300 text-xs">
          <div className="text-center">
            <div className="w-36 border-b border-slate-400 mb-1" />
            <span className="text-[10px] text-slate-500 font-semibold uppercase">
              Candidate / Parent Signature
            </span>
          </div>

          <div className="text-center">
            <div className="w-40 border-b border-slate-400 mb-1" />
            <span className="text-[10px] text-slate-500 font-semibold uppercase">
              Authorized Cashier / Teacher Seal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
