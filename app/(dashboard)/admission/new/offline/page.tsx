"use client";

import React, { useState, Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdmissionFormGeneratorContent } from "@/app/(dashboard)/generate/admission-form/page";
import { AiScanContent } from "@/app/(dashboard)/admission/new/ai-scan/page";
import {
  Camera,
  Printer,
  FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function OfflineAdmissionCenterContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "scan" ? "scan" : "generator";
  const [activeTab, setActiveTabState] = useState<"generator" | "scan">(initialTab);

  const setActiveTab = (tab: "generator" | "scan") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "generator") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-5">
      {/* Top Single Unified Header */}
      <PageHeader
        title="Offline Admission Center"
        back="/admission/new"
        className="md:flex-row md:items-center border-b pb-4 print:hidden"
        actions={
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
        }
      />

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
