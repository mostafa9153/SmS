"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdmissionFormGeneratorContent } from "@/app/(dashboard)/generate/admission-form/page";
import { AiScanContent } from "@/app/(dashboard)/admission/new/ai-scan/page";
import {
  Camera,
  Printer,
  ArrowLeft,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function OfflineAdmissionCenterContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "scan" ? "scan" : "generator";
  const [activeTab, setActiveTab] = useState<"generator" | "scan">(initialTab);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-5">
      {/* Top Single Unified Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 print:hidden">
        {/* Left: Back Link & Page Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/admission"
            className="p-2.5 rounded-xl border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Back to Admission Hub"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>Offline Admission Center</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeTab === "generator"
                ? "Generate and batch-print official admission forms with auto serial numbering."
                : "Scan paper admission forms via device camera or image upload powered by Gemini AI."}
            </p>
          </div>
        </div>

        {/* Center / Right: ONLY 2 Sections */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-muted/80 p-1 rounded-2xl border">
            <button
              type="button"
              onClick={() => setActiveTab("generator")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "generator"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Printer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>Form Generator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("scan")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "scan"
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Camera className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              <span>AI Form Scanner</span>
            </button>
          </div>

          <Link
            href="/admission/applications"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-bold transition-all cursor-pointer"
            title="View submitted and scanned applications"
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Applications</span>
          </Link>
        </div>
      </div>

      {/* Section 1: Form Generator */}
      {activeTab === "generator" && (
        <div>
          <AdmissionFormGeneratorContent embedded={true} />
        </div>
      )}

      {/* Section 2: AI Form Scanner */}
      {activeTab === "scan" && (
        <div className="print:hidden">
          <AiScanContent embedded={true} hideBackLink={true} />
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
          Loading Offline Admission Center...
        </div>
      }
    >
      <OfflineAdmissionCenterContent />
    </Suspense>
  );
}
