"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdmissionFormGeneratorContent } from "@/app/(dashboard)/generate/admission-form/page";
import { AiScanContent } from "@/app/(dashboard)/admission/new/ai-scan/page";
import {
  FileText,
  Camera,
  Printer,
  Sparkles,
  ArrowLeft,
  FileCheck2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

function OfflineFormHubContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "scan" ? "scan" : "generator";
  const [activeTab, setActiveTab] = useState<"generator" | "scan">(initialTab);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header (Hidden during browser print) */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-0 print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/admission"
              className="p-2 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
                <FileText className="h-3.5 w-3.5" />
                <span>New Admission • Offline Center</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <span>Offline Form Hub &amp; AI Scanner</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Generate blank admission forms for physical distribution, and scan completed paper forms directly with Gemini AI.
              </p>
            </div>
          </div>

          {/* Quick Access to Online Form & Application Desk */}
          <div className="flex items-center gap-2">
            <Link
              href="/admission/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border hover:bg-muted text-xs font-bold transition-all text-foreground cursor-pointer"
            >
              <UserPlus className="h-4 w-4 text-emerald-600" />
              <span>Online Form</span>
            </Link>
            <Link
              href="/admission/applications"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-bold transition-all cursor-pointer"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Application Desk</span>
            </Link>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("generator")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === "generator"
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Printer className="h-4 w-4 text-purple-600" />
            <span>1. Printable Form Generator</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold">
              Class V–IX &amp; XI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === "scan"
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="h-4 w-4 text-pink-600" />
            <span>2. AI Form Scanner</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-700 dark:text-pink-300 font-semibold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>OCR Camera</span>
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Offline Form Generator */}
      {activeTab === "generator" && (
        <div>
          <AdmissionFormGeneratorContent />
        </div>
      )}

      {/* Tab 2: AI Form Scanner */}
      {activeTab === "scan" && (
        <div className="print:hidden">
          <AiScanContent hideBackLink={true} />
        </div>
      )}
    </div>
  );
}

export default function OfflineFormHubPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-muted-foreground animate-pulse">
          Loading Offline Form Hub...
        </div>
      }
    >
      <OfflineFormHubContent />
    </Suspense>
  );
}
