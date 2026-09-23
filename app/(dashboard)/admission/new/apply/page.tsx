"use client";

import React, { useState } from "react";
import { AdmissionApplicationForm, AdmissionFormData } from "@/components/admission/admission-application-form";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { School, CheckCircle2, Printer, Download, Sparkles, RefreshCw, Phone, MapPin, Calendar, User, FileText } from "lucide-react";
import QRCode from "react-qr-code";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export default function PublicOnlineApplyPage() {
  const { profile } = useSchoolProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<AdmissionFormData | null>(null);
  const [applicationResult, setApplicationResult] = useState<any>(null);

  const currentYear = new Date().getFullYear();

  const fireConfettiCelebration = () => {
    try {
      // First burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"],
      });
      // Second delayed burst for maximum celebration
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 250);
    } catch (e) {
      console.warn("Confetti error:", e);
    }
  };

  const handleSubmit = async (formData: AdmissionFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        targetClass: formData.presentClass,
        admissionType: "new",
        formMethod: "online",
        academicYear: String(currentYear),
        // Flattened address strings
        address: `${formData.presentVillage || ""}, ${formData.presentPostOffice || ""}, ${formData.presentPoliceStation || ""}, ${formData.presentDistrict || ""} - ${formData.presentPincode || ""}`.replace(/^, /, ""),
        village: formData.presentVillage,
        gramPanchayat: formData.presentPanchayat,
        block: formData.presentBlock,
        postOffice: formData.presentPostOffice,
        policeStation: formData.presentPoliceStation,
        district: formData.presentDistrict,
        pincode: formData.presentPincode,
      };

      const res = await fetch("/api/admission/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to submit application");
      }

      const json = await res.json();
      setApplicationResult(json.application || json);
      setSubmittedData(formData);
      setIsSubmitted(true);
      
      // Fire celebration animation
      fireConfettiCelebration();

      // Clear any cached drafts
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("sms_admission_apply_draft");
          localStorage.removeItem("sms_admission_saved_sections");
        } catch (_) {}
      }

      toast.success("অনলাইন আবেদন সফলভাবে জমা হয়েছে!", {
        description: "আপনার আবেদন নম্বর তৈরি হয়েছে। রসিদটি প্রিন্ট করে রাখুন।",
      });
    } catch (err: any) {
      toast.error(err.message || "আবেদন জমা দিতে সমস্যা হয়েছে। দয়া করে সব ফিল্ড দেখে পুনরায় চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSubmittedData(null);
    setApplicationResult(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("sms_admission_apply_draft");
        localStorage.removeItem("sms_admission_saved_sections");
      } catch (_) {}
    }
  };

  // SUCCESSFUL SUBMISSION RECEIPT VIEW
  if (isSubmitted) {
    const appNo =
      applicationResult?.applicationNo ||
      applicationResult?.application_no ||
      `APP-${currentYear}-${submittedData?.presentClass || "V"}-001`;

    return (
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/40 py-6 sm:py-10 px-3 sm:px-6 relative overflow-hidden">
        {/* Background Watermark */}
        {profile?.schoolLogoUrl && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
            <img src={profile.schoolLogoUrl} alt="Watermark" className="w-[500px] h-[500px] object-contain select-none" />
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          {/* Header Status */}
          <div className="text-center space-y-2 print:hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50 dark:ring-emerald-900/30">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              আবেদন সফলভাবে গৃহীত হয়েছে
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Online Admission Receipt
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              নিচের আবেদন প্রাপ্তি রসিদটি প্রিন্ট অথবা সেভ করে সংরক্ষণ করুন।
            </p>
          </div>

          {/* PRINTABLE RECEIPT CARD */}
          <div
            id="printable-receipt"
            className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden print:shadow-none print:border-2 print:border-black print:m-0 print:rounded-none"
          >
            {/* School Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6 text-center print:bg-white print:text-black print:border-b-2 print:border-black">
              <div className="flex items-center justify-center gap-3 mb-2">
                {profile?.schoolLogoUrl ? (
                  <img
                    src={profile.schoolLogoUrl}
                    alt={profile.schoolName}
                    className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-full bg-white p-1 shadow-sm print:shadow-none print:border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center print:border">
                    <School className="w-7 h-7 text-white print:text-black" />
                  </div>
                )}
                <div className="text-left">
                  <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wide leading-tight">
                    {profile?.schoolName || "Model High School (H.S.)"}
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90 leading-tight">
                    {profile?.schoolAddress || "Vill & P.O. - Mathurapur, South 24 Parganas"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] opacity-80 print:opacity-100 font-mono">
                    {profile?.udiseCode && <span>UDISE: {profile.udiseCode}</span>}
                    {profile?.indexNo && <span>| Index: {profile.indexNo}</span>}
                    {profile?.boardAffiliation && <span>| {profile.boardAffiliation}</span>}
                  </div>
                </div>
              </div>

              {/* Application Number Pill */}
              <div className="mt-3 pt-3 border-t border-white/20 print:border-black/30 flex items-center justify-between flex-wrap gap-2">
                <div className="text-left">
                  <span className="text-[11px] uppercase tracking-wider block opacity-80 print:opacity-100 font-semibold">
                    আবেদন প্রাপ্তিস্বীকার পত্র (Application Receipt)
                  </span>
                  <span className="text-xs opacity-90 font-medium">
                    শিক্ষাবর্ষ: {currentYear}–{currentYear + 1}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white text-blue-950 px-3.5 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base shadow-sm print:border print:border-black">
                  <span>{appNo}</span>
                </div>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="p-5 sm:p-7 space-y-5">
              <div className="grid sm:grid-cols-[1fr_130px] gap-6 items-start">
                {/* Student Info Table */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm">
                    <div className="text-muted-foreground print:text-gray-600 font-medium">আবেদনকারীর নাম:</div>
                    <div className="font-bold text-foreground print:text-black uppercase">
                      {submittedData?.studentName || "N/A"}
                    </div>

                    {submittedData?.studentNameBengali && (
                      <>
                        <div className="text-muted-foreground print:text-gray-600 font-medium">নাম (বাংলায়):</div>
                        <div className="font-bold text-foreground print:text-black">
                          {submittedData.studentNameBengali}
                        </div>
                      </>
                    )}

                    <div className="text-muted-foreground print:text-gray-600 font-medium">আবেদিত শ্রেণি:</div>
                    <div className="font-bold text-blue-700 dark:text-blue-400 print:text-black">
                      Class {submittedData?.presentClass || "N/A"}
                    </div>

                    <div className="text-muted-foreground print:text-gray-600 font-medium">পিতার নাম:</div>
                    <div className="font-medium text-foreground print:text-black uppercase">
                      {submittedData?.fatherName || "N/A"}
                    </div>

                    <div className="text-muted-foreground print:text-gray-600 font-medium">মাতার নাম:</div>
                    <div className="font-medium text-foreground print:text-black uppercase">
                      {submittedData?.motherName || "N/A"}
                    </div>

                    <div className="text-muted-foreground print:text-gray-600 font-medium">জন্ম তারিখ:</div>
                    <div className="font-medium text-foreground print:text-black font-mono">
                      {submittedData?.dob || "N/A"}
                    </div>

                    <div className="text-muted-foreground print:text-gray-600 font-medium">মোবাইল নম্বর:</div>
                    <div className="font-bold text-foreground print:text-black font-mono">
                      {submittedData?.studentContact || "N/A"}
                    </div>

                    <div className="text-muted-foreground print:text-gray-600 font-medium">ঠিকানা:</div>
                    <div className="font-medium text-foreground print:text-black text-xs">
                      {submittedData?.presentVillage}, {submittedData?.presentPostOffice}, {submittedData?.presentDistrict} - {submittedData?.presentPincode}
                    </div>

                    <div className="text-muted-foreground print:text-gray-600 font-medium">জমা দেওয়ার তারিখ ও সময়:</div>
                    <div className="font-medium text-foreground print:text-black text-xs font-mono">
                      {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </div>

                {/* QR Code & Status Stamp */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-2 print:bg-transparent print:border print:border-black">
                  <div className="p-2 bg-white rounded-lg shadow-2xs">
                    <QRCode value={appNo} size={105} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground print:text-black font-mono">
                    {appNo}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-bold uppercase tracking-wider print:border-black print:text-black">
                    Pending Verification
                  </Badge>
                </div>
              </div>

              {/* Important Instructions Box */}
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 rounded-xl text-xs space-y-1.5 border border-amber-200 dark:border-amber-800/60 print:bg-white print:text-black print:border-black">
                <p className="font-bold flex items-center gap-1.5 text-[12.5px] text-amber-900 dark:text-amber-300 print:text-black">
                  <FileText className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 print:text-black" />
                  গুরুত্বপূর্ণ নির্দেশাবলী (Important Instructions for Verification):
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] sm:text-xs text-amber-900/90 dark:text-amber-300/90 print:text-black">
                  <li>এই রসিদটির একটি প্রিন্ট কপি নিয়ে বিদ্যালয় অফিসে যোগাযোগ করুন।</li>
                  <li>আবেদনকারীর আসল জন্ম শংসাপত্র (Birth Certificate) ও আধার কার্ড সঙ্গে আনবেন।</li>
                  <li>পূর্ববর্তী বিদ্যালয়ের ছাড়পত্র (Transfer Certificate/Marksheet) প্রযোজ্য হলে সঙ্গে আনবেন।</li>
                  <li>পাসপোর্ট সাইজের রঙিন ছবি (২ কপি) জমা দিতে হবে।</li>
                </ol>
              </div>

              {/* Signatures for Print */}
              <div className="pt-8 grid grid-cols-2 gap-4 text-center text-xs font-bold text-muted-foreground print:text-black">
                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 print:border-black pt-2">
                  অভিভাবকের স্বাক্ষর (Guardian Signature)
                </div>
                <div className="border-t border-dashed border-slate-300 dark:border-slate-700 print:border-black pt-2">
                  প্রধান শিক্ষক / ভেরিফায়ার স্বাক্ষর (Headmaster Signature)
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center print:hidden pt-2">
            <Button
              size="lg"
              onClick={handlePrint}
              className="h-11 px-6 font-bold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> রসিদ প্রিন্ট করুন (Print Receipt)
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handlePrint}
              className="h-11 px-6 font-bold gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> PDF ডাউনলোড
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={handleReset}
              className="h-11 px-4 font-bold gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> নতুন আবেদন করুন
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT ONLINE APPLICATION FORM VIEW
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/40 py-6 sm:py-10 px-3.5 sm:px-6 relative">
      {/* Background Watermark */}
      {profile?.schoolLogoUrl && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
          <img src={profile.schoolLogoUrl} alt="Watermark" className="w-[500px] h-[500px] object-contain select-none" />
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* School Details Header */}
        <div className="rounded-2xl border bg-card/95 backdrop-blur-xs p-5 sm:p-6 shadow-sm text-center relative overflow-hidden">
          {/* Subtle Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
            {profile?.schoolLogoUrl ? (
              <img
                src={profile.schoolLogoUrl}
                alt={profile.schoolName}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl bg-background border p-1 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <School className="w-10 h-10" />
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
                  অনলাইন ভর্তি পোর্টাল {currentYear}–{currentYear + 1}
                </Badge>
                {profile?.boardAffiliation && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {profile.boardAffiliation}
                  </Badge>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">
                {profile?.schoolName || "Model High School (H.S.)"}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                {profile?.schoolAddress && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    {profile.schoolAddress}
                  </span>
                )}
                {profile?.udiseCode && (
                  <span className="font-mono font-semibold">UDISE: {profile.udiseCode}</span>
                )}
                {profile?.indexNo && (
                  <span className="font-mono font-semibold">Index: {profile.indexNo}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Admission Form */}
        <AdmissionApplicationForm
          onSubmit={handleSubmit}
          submitButtonText="অনলাইন আবেদন জমা দিন (Submit Application)"
          isSubmitting={isSubmitting}
          mode="public"
        />
      </div>
    </div>
  );
}
