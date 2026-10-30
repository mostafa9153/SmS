"use client";

import { Suspense } from "react";
import { FileSpreadsheet, CheckCircle2, XCircle, ArrowLeft, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";
import { UploadStep } from "@/components/students/bulk-upload/upload-step";
import { MappingStep } from "@/components/students/bulk-upload/mapping-step";
import { PreviewStep } from "@/components/students/bulk-upload/preview-step";
import { SummaryStep } from "@/components/students/bulk-upload/summary-step";
import { BatchDialogs } from "@/components/students/bulk-upload/batch-dialogs";
import { useBulkUpload } from "@/components/students/bulk-upload/use-bulk-upload";

const STEPS = [
  { id: 1, label: "Upload & Mode" },
  { id: 2, label: "Column Mapping" },
  { id: 3, label: "Validation & Preview" },
  { id: 4, label: "Import & Summary" },
];

function BulkUploadPageContent() {
  const bulk = useBulkUpload();
  const { importResult, parseError, parsedData, refetchBatches, setShowHistoryModal, setStep, step } = bulk;

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        back
        title="Bulk Upload Management"
        actions={<button
          onClick={() => {
            setShowHistoryModal(true);
            refetchBatches();
          }}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border bg-card px-3.5 py-2.5 min-h-[40px] text-xs font-semibold hover:bg-muted transition-colors shadow-2xs active:scale-95 cursor-pointer"
        >
          <History className="h-4 w-4 text-primary shrink-0" />
          <span>Batch History &amp; Rollback</span>
        </button>}
      />

      {/* Stepper Progress */}
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-0">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors",
                    step > s.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : step === s.id
                      ? "border-primary text-primary bg-primary/10"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:block",
                    step === s.id ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn("flex-1 h-px mx-3", step > s.id ? "bg-primary" : "bg-border")}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Global alert / error */}
      {parseError && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-900">Error</p>
            <p className="text-xs text-rose-700 mt-0.5">{parseError}</p>
          </div>
        </div>
      )}


      {step === 1 && <UploadStep bulk={bulk} />}

      {/* Fallback for steps 2..4 when page is refreshed without active parsed file */}
      {step > 1 && !parsedData && (
        <div className="rounded-2xl border bg-card p-8 text-center space-y-4 shadow-xs animate-fade-in">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">No File Loaded for Step {step}</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Please upload your Excel or CSV file in Step 1 before mapping columns or previewing import data.
            </p>
          </div>
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Step 1: Upload File</span>
          </button>
        </div>
      )}

      {step === 2 && parsedData && <MappingStep bulk={bulk} parsedData={parsedData} />}
      {step === 3 && <PreviewStep bulk={bulk} />}
      {step === 4 && importResult && <SummaryStep bulk={bulk} />}
      <BatchDialogs bulk={bulk} />
    </div>
  );
}

export default function BulkUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Spinner className="h-4 w-4 text-primary" />
          <span>Loading Bulk Import Studio...</span>
        </div>
      }
    >
      <BulkUploadPageContent />
    </Suspense>
  );
}
