"use client";

import { Upload, FileSpreadsheet, ArrowRight, Download, GraduationCap, Award, Archive, Trash2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { StudentStatus } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import type { BulkUploadState } from "./use-bulk-upload";

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function UploadStep({ bulk }: { bulk: BulkUploadState }) {
  const { currentYear, downloadSampleTemplate, file, handleDrop, handleFileSelect, handleModeChange, handleRemoveFile, handleSheetChange, isDragging, isParsing, isResultsMode, parsedData, resultExam, resultYear, setIsDragging, setResultExam, setResultYear, setStep, setTargetClass, setTargetSection, setTargetSessionYear, setTargetStatus, targetClass, targetSection, targetSessionYear, targetStatus, uploadType, yearOptions } = bulk;
  return (
    <div className="space-y-5">
      {/* Mode Selection Cards */}
      <div className="space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          1. Select Bulk Upload Mode
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Current Students */}
          <div
            onClick={() => handleModeChange("current_students")}
            className={cn(
              "relative rounded-xl border p-4 cursor-pointer transition-all flex items-center justify-between gap-3",
              uploadType === "current_students"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 p-2.5 text-blue-700 dark:text-blue-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm">Current Active Students</h3>
            </div>
            <div
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all flex items-center justify-center",
                uploadType === "current_students"
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30 bg-transparent"
              )}
            >
              {uploadType === "current_students" && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
              )}
            </div>
          </div>

          {/* Card 2: Old Students */}
          <div
            onClick={() => handleModeChange("old_students")}
            className={cn(
              "relative rounded-xl border p-4 cursor-pointer transition-all flex items-center justify-between gap-3",
              uploadType === "old_students"
                ? "border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-500/20 shadow-xs"
                : "border-border bg-card hover:border-amber-500/40 hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2.5 text-amber-700 dark:text-amber-400">
                <Archive className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm">Old / Archived Students</h3>
            </div>
            <div
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all flex items-center justify-center",
                uploadType === "old_students"
                  ? "border-amber-600 bg-amber-600"
                  : "border-muted-foreground/30 bg-transparent"
              )}
            >
              {uploadType === "old_students" && (
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>

          {/* Card 3: Results Bulk Upload */}
          <div
            onClick={() => handleModeChange("exam_results")}
            className={cn(
              "relative rounded-xl border p-4 cursor-pointer transition-all flex items-center justify-between gap-3",
              uploadType === "exam_results"
                ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-xs"
                : "border-border bg-card hover:border-emerald-500/40 hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/40 p-2.5 text-emerald-700 dark:text-emerald-400">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm">Examination Results</h3>
            </div>
            <div
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all flex items-center justify-center",
                uploadType === "exam_results"
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-muted-foreground/30 bg-transparent"
              )}
            >
              {uploadType === "exam_results" && (
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Card */}
      <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-6 shadow-xs">
        {/* Student Upload Target Session & Class Config */}
        {!isResultsMode ? (
          <div className="rounded-xl bg-muted/30 border p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">
                    Academic Session *
                  </label>
                  {uploadType === "current_students" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                      <Lock className="h-2.5 w-2.5" /> Locked
                    </span>
                  )}
                </div>
                <CustomSelect
                  value={targetSessionYear}
                  disabled={uploadType === "current_students"}
                  onChange={(val) => setTargetSessionYear(Number(val))}
                  options={yearOptions.map((yr) => ({
                    label: `Session ${yr} ${yr === currentYear ? "(Current Active)" : "(Historical Session)"}`,
                    value: yr,
                  }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Target Class
                </label>
                <CustomSelect
                  value={targetClass}
                  onChange={(val) => setTargetClass(String(val))}
                  options={[
                    { label: "Auto-Detect from Excel / Multi-Class", value: "AUTO" },
                    ...CLASSES.map((c) => ({ label: `Class ${c}`, value: c })),
                  ]}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Target Section
                </label>
                <CustomSelect
                  value={targetSection}
                  onChange={(val) => setTargetSection(String(val))}
                  options={[
                    { label: "Auto-Detect from Excel / Any Section", value: "AUTO" },
                    { label: "Section A", value: "A" },
                    { label: "Section B", value: "B" },
                    { label: "Section C", value: "C" },
                  ]}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground block">
                    Default Status *
                  </label>
                  {uploadType === "current_students" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                      <Lock className="h-2.5 w-2.5" /> Locked
                    </span>
                  )}
                </div>
                <CustomSelect
                  value={targetStatus}
                  disabled={uploadType === "current_students"}
                  onChange={(val) => setTargetStatus(val as StudentStatus)}
                  options={[
                    { label: "Continuing (Active)", value: "Continuing" },
                    { label: "Passed Out (Old / Alumni)", value: "Passed Out" },
                    { label: "Drop Out", value: "Drop Out" },
                    { label: "Sent Up M.P.", value: "Sent Up M.P." },
                    { label: "C.C.H.S.", value: "C.C.H.S." },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Result Specific Configuration */
          <div className="rounded-xl bg-muted/30 border p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Academic Session *
                </label>
                <CustomSelect
                  value={resultYear}
                  onChange={(val) => setResultYear(Number(val))}
                  options={yearOptions.map((yr) => ({
                    label: `Session ${yr} ${yr === currentYear ? "(Current)" : "(Historical Archive)"}`,
                    value: yr,
                  }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Default Evaluation / Exam *
                </label>
                <CustomSelect
                  value={resultExam}
                  onChange={(val) => setResultExam(String(val))}
                  options={[
                    { label: "1st Summative Evaluation", value: "1st Summative Evaluation" },
                    { label: "2nd Summative Evaluation", value: "2nd Summative Evaluation" },
                    { label: "3rd Summative Evaluation / Annual", value: "3rd Summative Evaluation" },
                    { label: "Sem I", value: "Sem I" },
                    { label: "Sem II", value: "Sem II" },
                    { label: "Selection Test (Pre-Board)", value: "Selection Test" },
                    { label: "Unit Test", value: "Unit Test" },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Template Downloader Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <p className="text-sm font-semibold">2. Spreadsheet File Upload</p>
          <button
            type="button"
            onClick={() => downloadSampleTemplate(uploadType)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download Sample {isResultsMode ? "Marks" : "Student"} Template
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          className={cn(
            "rounded-xl border-2 border-dashed p-6 sm:p-10 text-center transition-all cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          {isParsing ? (
            <div className="py-6 flex flex-col items-center">
              <Spinner className="h-10 w-10 text-primary mb-3" />
              <p className="text-sm font-medium">Reading spreadsheet…</p>
            </div>
          ) : file && parsedData ? (
            <div className="py-2 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                <span className="font-mono text-sm">{file.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB ·{" "}
                <strong>{parsedData.rawRows.length} data rows detected</strong> ·{" "}
                {parsedData.headers.length} columns found
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Badge variant="outline" className="text-xs font-normal">
                  Sheet: {parsedData.selectedSheet}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-medium",
                    parsedData.headerRowIndex > 0
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300"
                      : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200"
                  )}
                >
                  Headers: Row {parsedData.headerRowIndex + 1}
                  {parsedData.headerRowIndex === 1 && " (BSP Auto-Detected)"}
                </Badge>
                {parsedData.detectedMetadata?.detectedClass && (
                  <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                    Class: {parsedData.detectedMetadata.detectedClass}
                  </Badge>
                )}
                {parsedData.detectedMetadata?.detectedSection && (
                  <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                    Sec: {parsedData.detectedMetadata.detectedSection}
                  </Badge>
                )}
                {parsedData.detectedMetadata?.schoolName && (
                  <Badge variant="outline" className="text-xs text-muted-foreground truncate max-w-[280px]">
                    🏫 {parsedData.detectedMetadata.schoolName}
                  </Badge>
                )}
              </div>

              {/* Multi-Sheet Selector */}
              {parsedData.sheetNames && parsedData.sheetNames.length > 1 && (
                <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-2 pt-2.5 pb-1 border-t mt-1">
                  <span className="text-xs font-semibold text-foreground">Select Active Sheet:</span>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {parsedData.sheetNames.map((sName, idx) => (
                      <button
                        key={sName}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSheetChange(idx);
                        }}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer",
                          parsedData.selectedSheet === sName
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                            : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        📄 {sName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons: Change File and Remove/Deselect File */}
              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById("file-input")?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors border shadow-2xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  Change File
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors border border-rose-200 dark:border-rose-800 shadow-2xs cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove / Deselect File
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-2">
              <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm font-medium">
                Drag and drop your Excel or CSV file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports <strong>.xlsx, .xls, .csv</strong> files up to 10,000 rows
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => setStep(2)}
            disabled={!parsedData || parsedData.rawRows.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm w-full sm:w-auto min-h-[44px]"
          >
            <span>Configure Column Mapping</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
