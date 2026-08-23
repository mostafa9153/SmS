"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Sparkles,
  History,
  Info,
  Download,
  GraduationCap,
  Award,
  Archive,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  executeBulkUpload,
  executeResultsBulkUpload,
  rollbackBulkUpload,
  getImportBatches,
} from "@/lib/data/students";
import {
  parseExcelFile,
  autoSuggestMapping,
  applyMapping,
  validateMappedRows,
  TARGET_FIELDS,
  TEMPLATE_PRESETS,
  RESULT_TARGET_FIELDS,
  RESULT_TEMPLATE_PRESETS,
  autoSuggestResultMapping,
  applyResultMapping,
  validateResultRows,
  type ParsedExcelResult,
} from "@/lib/utils/excel-parser";
import type {
  Student,
  ColumnMapping,
  ValidationIssue,
  BulkPreviewRow,
  BulkUploadType,
  BulkResultRow,
} from "@/lib/types";

const STEPS = [
  { id: 1, label: "Upload & Mode" },
  { id: 2, label: "Column Mapping" },
  { id: 3, label: "Validation & Preview" },
  { id: 4, label: "Import & Summary" },
];

export default function BulkUploadPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  // Wizard State
  const [step, setStep] = useState(1);
  const [uploadType, setUploadType] = useState<BulkUploadType>("current_students");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("auto");

  // Result specific settings
  const [resultYear, setResultYear] = useState<number>(currentYear);
  const [resultExam, setResultExam] = useState<string>("1st Summative Evaluation");

  // Excel parsed data
  const [parsedData, setParsedData] = useState<ParsedExcelResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Validated data for Students
  const [mappedRows, setMappedRows] = useState<Array<Partial<Student>>>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [previewRows, setPreviewRows] = useState<BulkPreviewRow[]>([]);

  // Validated data for Results
  const [mappedResultRows, setMappedResultRows] = useState<BulkResultRow[]>([]);
  const [resultPreviewRows, setResultPreviewRows] = useState<any[]>([]);

  // Execution & Result state
  const [importResult, setImportResult] = useState<any | null>(null);
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);
  const [rollbackConfirmBatchId, setRollbackConfirmBatchId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Query past batches
  const { data: pastBatches = [], refetch: refetchBatches } = useQuery({
    queryKey: ["import-batches"],
    queryFn: getImportBatches,
    enabled: showHistoryModal,
  });

  // Handle file drop/upload
  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setIsParsing(true);
      setParseError(null);

      try {
        const parsed = await parseExcelFile(selectedFile);
        setParsedData(parsed);

        // Auto-suggest mapping based on upload mode
        if (uploadType === "exam_results") {
          let initialMapping = autoSuggestResultMapping(parsed.headers);
          if (selectedTemplate !== "auto" && RESULT_TEMPLATE_PRESETS[selectedTemplate]) {
            const presetMapping = RESULT_TEMPLATE_PRESETS[selectedTemplate].mapping;
            initialMapping = { ...initialMapping, ...presetMapping };
          }
          setColumnMapping(initialMapping);
        } else {
          let initialMapping = autoSuggestMapping(parsed.headers);
          if (selectedTemplate !== "auto" && TEMPLATE_PRESETS[selectedTemplate]) {
            const presetMapping = TEMPLATE_PRESETS[selectedTemplate].mapping;
            initialMapping = { ...initialMapping, ...presetMapping };
          }
          setColumnMapping(initialMapping);
        }
      } catch (err: any) {
        console.error("Excel parse error:", err);
        setParseError(err.message || "Failed to read Excel file. Make sure it is a valid .xlsx, .xls, or .csv file.");
      } finally {
        setIsParsing(false);
      }
    },
    [uploadType, selectedTemplate]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect]
  );

  // Mode change handler
  const handleModeChange = (mode: BulkUploadType) => {
    setUploadType(mode);
    setSelectedTemplate("auto");
    if (parsedData) {
      if (mode === "exam_results") {
        setColumnMapping(autoSuggestResultMapping(parsedData.headers));
      } else {
        setColumnMapping(autoSuggestMapping(parsedData.headers));
      }
    }
  };

  // Move from Step 2 to Step 3: Run Validation & Preview
  const handleProceedToPreview = () => {
    if (!parsedData) return;

    if (uploadType === "exam_results") {
      const transformed = applyResultMapping(parsedData.rawRows, columnMapping, resultYear, resultExam);
      setMappedResultRows(transformed);
      const { issues, previewRows: pRows } = validateResultRows(transformed);
      setValidationIssues(issues);
      setResultPreviewRows(pRows);
    } else {
      const transformed = applyMapping(parsedData.rawRows, columnMapping as any);
      setMappedRows(transformed);
      const { issues, previewRows: pRows } = validateMappedRows(transformed);
      setValidationIssues(issues);
      setPreviewRows(pRows);
    }
    setStep(3);
  };

  // Student Import Mutation
  const studentImportMutation = useMutation({
    mutationFn: (rows: Array<Partial<Student>>) => executeBulkUpload(rows, uploadType as any),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["students-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
      setStep(4);
    },
    onError: (err: any) => {
      setParseError(err.message || "Import execution failed");
    },
  });

  // Results Import Mutation
  const resultsImportMutation = useMutation({
    mutationFn: (rows: BulkResultRow[]) => executeResultsBulkUpload(rows, resultYear, resultExam),
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["student-results"] });
      queryClient.invalidateQueries({ queryKey: ["class-results"] });
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
      setStep(4);
    },
    onError: (err: any) => {
      setParseError(err.message || "Results import execution failed");
    },
  });

  // Rollback Mutation
  const rollbackMutation = useMutation({
    mutationFn: (batchId: string) => rollbackBulkUpload(batchId),
    onSuccess: (data) => {
      setRollbackSuccessMsg(data.message || "Batch successfully rolled back and removed!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student-results"] });
      queryClient.invalidateQueries({ queryKey: ["import-batches"] });
      setRollbackConfirmBatchId(null);
      refetchBatches();
    },
    onError: (err: any) => {
      alert(`Rollback failed: ${err.message}`);
    },
  });

  // Template Download helper
  const downloadSampleTemplate = (type: BulkUploadType) => {
    let wsData: any[] = [];
    let filename = "Template.xlsx";

    if (type === "exam_results") {
      filename = `Results_Marksheet_${resultYear}_Template.xlsx`;
      wsData = [
        [
          "Student Code",
          "Student Name",
          "Class",
          "Section",
          "Roll No",
          "Academic Year",
          "Exam Name",
          "Bengali",
          "English",
          "Mathematics",
          "Physical Science",
          "Life Science",
          "History",
          "Geography",
          "Total Marks",
          "Full Marks",
        ],
        [
          "BSP-2025-001",
          "Abir Das",
          "IX",
          "A",
          1,
          resultYear,
          resultExam,
          75,
          68,
          82,
          70,
          78,
          65,
          72,
          510,
          700,
        ],
        [
          "BSP-2025-002",
          "Tanmoy Roy",
          "IX",
          "A",
          2,
          resultYear,
          resultExam,
          80,
          74,
          88,
          76,
          85,
          72,
          79,
          554,
          700,
        ],
      ];
    } else if (type === "old_students") {
      filename = "Old_Students_Archive_Template.xlsx";
      wsData = [
        [
          "Student Code",
          "Student Name",
          "Gender",
          "Date of Birth",
          "Admission Year",
          "Class",
          "Section",
          "Roll No",
          "Status",
          "Father Name",
          "Mother Name",
          "Guardian Contact No",
          "Aadhaar Y/N",
        ],
        [
          "BSP-2023-010",
          "Rahul Sen",
          "Male",
          "2008-04-12",
          2020,
          "X",
          "A",
          15,
          "Alumni",
          "Sunil Sen",
          "Mita Sen",
          "9876543210",
          "Yes",
        ],
      ];
    } else {
      filename = "Current_Students_Enrollment_Template.xlsx";
      wsData = [
        [
          "Student Code",
          "Roll No",
          "Student Name",
          "Student DOB",
          "Academic Year",
          "Father Name",
          "Mother Name",
          "Guardian Contact Number",
          "Student Contact Number",
          "Bank IFS Code",
          "Bank A/C number",
          "Aadhaar Y/N",
        ],
        [
          "BSP-2026-101",
          1,
          "Rohit Sharma",
          "2012-05-15",
          currentYear,
          "Gopal Sharma",
          "Sita Sharma",
          "9830012345",
          "9830012345",
          "SBIN0001234",
          "123456789012",
          "Yes",
        ],
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  };

  const isResultsMode = uploadType === "exam_results";
  const isImporting = studentImportMutation.isPending || resultsImportMutation.isPending;
  const errorIssues = validationIssues.filter((i) => i.severity === "error");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bulk Upload Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Import, evaluate, and manage student enrollments, historical archives, and examination marks in bulk.
          </p>
        </div>
        <button
          onClick={() => setShowHistoryModal(true)}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-md border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shadow-sm"
        >
          <History className="h-4 w-4 text-primary" />
          Batch History & Delete/Rollback
        </button>
      </div>

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

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 1: Upload File & Mode Selection                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Mode Selection Cards */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Bulk Upload Mode
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Current Students */}
              <div
                onClick={() => handleModeChange("current_students")}
                className={cn(
                  "rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3",
                  uploadType === "current_students"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 p-2.5 text-blue-700 dark:text-blue-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Current Active Students</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enrolment records for the live {currentYear} academic session.
                    </p>
                  </div>
                </div>
                <Badge variant={uploadType === "current_students" ? "default" : "outline"} className="w-fit text-[10px]">
                  {uploadType === "current_students" ? "Selected Mode" : "Select"}
                </Badge>
              </div>

              {/* Card 2: Old Students */}
              <div
                onClick={() => handleModeChange("old_students")}
                className={cn(
                  "rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3",
                  uploadType === "old_students"
                    ? "border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-border bg-card hover:border-amber-500/40 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2.5 text-amber-700 dark:text-amber-400">
                    <Archive className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Old / Archived Students</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Alumni, passed-out cohorts & transferred student archives.
                    </p>
                  </div>
                </div>
                <Badge variant={uploadType === "old_students" ? "default" : "outline"} className="w-fit text-[10px]">
                  {uploadType === "old_students" ? "Selected Mode" : "Select"}
                </Badge>
              </div>

              {/* Card 3: Results Bulk Upload */}
              <div
                onClick={() => handleModeChange("exam_results")}
                className={cn(
                  "rounded-xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3",
                  uploadType === "exam_results"
                    ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20 shadow-xs"
                    : "border-border bg-card hover:border-emerald-500/40 hover:bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/40 p-2.5 text-emerald-700 dark:text-emerald-400">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Examination Results</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Marksheet archives for both Old and Current sessions.
                    </p>
                  </div>
                </div>
                <Badge variant={uploadType === "exam_results" ? "default" : "outline"} className="w-fit text-[10px]">
                  {uploadType === "exam_results" ? "Selected Mode" : "Select"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="rounded-xl border bg-card p-6 space-y-5 shadow-xs">
            {/* Result Specific Configuration */}
            {isResultsMode && (
              <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-semibold text-xs">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <span>Target Evaluation & Academic Session</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Academic Session (Year)
                    </label>
                    <select
                      value={resultYear}
                      onChange={(e) => setResultYear(Number(e.target.value))}
                      className="w-full rounded-md border bg-background px-3 py-2 text-xs font-semibold"
                    >
                      {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((yr) => (
                        <option key={yr} value={yr}>
                          Session {yr} {yr === currentYear ? "(Current)" : "(Historical Archive)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Default Evaluation / Exam
                    </label>
                    <select
                      value={resultExam}
                      onChange={(e) => setResultExam(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-xs font-semibold"
                    >
                      <option value="1st Summative Evaluation">1st Summative Evaluation</option>
                      <option value="2nd Summative Evaluation">2nd Summative Evaluation</option>
                      <option value="3rd Summative Evaluation">3rd Summative Evaluation / Annual</option>
                      <option value="Selection Test">Selection Test (Pre-Board)</option>
                      <option value="Unit Test">Unit Test</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Template Downloader Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <p className="text-sm font-semibold">Spreadsheet File Upload</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload .xlsx, .xls, or .csv containing{" "}
                  {isResultsMode ? "student examination marks" : "student records"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadSampleTemplate(uploadType)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 hover:bg-primary/5 px-3 py-1.5 rounded-md transition-colors"
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
                "rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer",
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
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                  <p className="text-sm font-medium">Reading spreadsheet…</p>
                </div>
              ) : file && parsedData ? (
                <div className="py-2 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                    <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                    {file.name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB ·{" "}
                    <strong>{parsedData.rawRows.length} rows detected</strong> ·{" "}
                    {parsedData.headers.length} columns found
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      Sheet: {parsedData.selectedSheet}
                    </Badge>
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
                className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                Configure Column Mapping <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 2: Interactive Column Mapping                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 2 && parsedData && (
        <div className="rounded-xl border bg-card p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <p className="text-sm font-semibold">
                2. Map Excel Headers to {isResultsMode ? "Evaluation & Marks Fields" : "Student Profile Fields"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ensure each column from your file is matched correctly. Unmapped columns can be ignored.
              </p>
            </div>
            <button
              onClick={() => {
                if (isResultsMode) {
                  setColumnMapping(autoSuggestResultMapping(parsedData.headers));
                } else {
                  setColumnMapping(autoSuggestMapping(parsedData.headers));
                }
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded px-2.5 py-1"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              Auto-Suggest All
            </button>
          </div>

          {/* Mapping Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/70 sticky top-0 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Excel Column</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Sample Value (Row 1)</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Maps to Field</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedData.headers.map((header) => {
                    const sampleVal = parsedData.rawRows[0]?.[header];
                    const currentMapping = columnMapping[header] || "ignore";

                    return (
                      <tr key={header} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-semibold text-foreground">
                          {header}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                          {sampleVal !== undefined && sampleVal !== null && sampleVal !== ""
                            ? String(sampleVal)
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={currentMapping}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                [header]: e.target.value as any,
                              }))
                            }
                            className={cn(
                              "rounded-md border px-2.5 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-primary w-full max-w-xs",
                              currentMapping === "ignore"
                                ? "bg-muted/40 text-muted-foreground"
                                : "bg-background font-semibold text-foreground border-primary/40"
                            )}
                          >
                            <option value="ignore">— Ignore this column —</option>

                            {isResultsMode ? (
                              <>
                                <optgroup label="Student Identifiers">
                                  {RESULT_TARGET_FIELDS.filter((f) => f.category === "Identifier").map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} {f.required ? "*" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Enrolment Specifics">
                                  {RESULT_TARGET_FIELDS.filter((f) => f.category === "Enrolment").map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Exam & Marks">
                                  {RESULT_TARGET_FIELDS.filter((f) => ["Exam", "Marks"].includes(f.category)).map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} {f.required ? "*" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Individual Subjects">
                                  {RESULT_TARGET_FIELDS.filter((f) => f.category === "Subjects").map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </>
                            ) : (
                              <>
                                <optgroup label="Core & Identifiers">
                                  {TARGET_FIELDS.filter((f) => ["Core", "Identifiers"].includes(f.category)).map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} {f.required ? "*" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Enrolment Details">
                                  {TARGET_FIELDS.filter((f) => f.category === "Enrolment").map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} {f.required ? "*" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Demographics">
                                  {TARGET_FIELDS.filter((f) => f.category === "Demographics").map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} {f.required ? "*" : ""}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Family & Contact">
                                  {TARGET_FIELDS.filter((f) => ["Family", "Contact"].includes(f.category)).map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                                <optgroup label="Bank Details">
                                  {TARGET_FIELDS.filter((f) => f.category === "Bank").map((f) => (
                                    <option key={f.key} value={f.key}>
                                      {f.label}
                                    </option>
                                  ))}
                                </optgroup>
                              </>
                            )}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Upload
            </button>
            <button
              onClick={handleProceedToPreview}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              Validate & Preview Rows <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 3: Validation & Preview                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="rounded-xl border bg-card p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <p className="text-sm font-semibold">3. Data Validation & Import Preview</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review matched data and potential warnings before executing the database write.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Total Rows: {isResultsMode ? mappedResultRows.length : mappedRows.length}
              </Badge>
              {errorIssues.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {errorIssues.length} Errors
                </Badge>
              )}
            </div>
          </div>

          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="preview" className="text-xs">
                Rows Preview ({isResultsMode ? resultPreviewRows.length : previewRows.length})
              </TabsTrigger>
              <TabsTrigger value="issues" className="text-xs">
                Issues & Warnings ({validationIssues.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Preview Table */}
            <TabsContent value="preview" className="mt-3">
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-[350px] overflow-y-auto">
                  {isResultsMode ? (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/70 sticky top-0 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Student Name / ID</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Class / Sec / Roll</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Session & Exam</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Marks Obtained</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Percentage</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {resultPreviewRows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{row.rowNumber}</td>
                            <td className="px-3 py-2 text-xs font-semibold">{row.name || row.schoolId || row.studentUniqueCode}</td>
                            <td className="px-3 py-2 text-xs">{row.class ? `${row.class}-${row.section || "A"} (${row.roll || 1})` : "—"}</td>
                            <td className="px-3 py-2 text-xs font-mono">{row.academicYear} · {row.examName}</td>
                            <td className="px-3 py-2 text-xs font-bold text-primary">{row.marksObtained} {row.fullMarks ? `/ ${row.fullMarks}` : ""}</td>
                            <td className="px-3 py-2 text-xs">{row.percentage !== undefined ? `${row.percentage}%` : "—"}</td>
                            <td className="px-3 py-2">
                              {row.errors.length > 0 ? (
                                <Badge variant="destructive" className="text-[10px]">Error</Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Ready</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/70 sticky top-0 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Action</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Student Name</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">School ID / PEN</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Class & Roll</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {previewRows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{row.rowNumber}</td>
                            <td className="px-3 py-2">
                              {row.action === "update" ? (
                                <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px]">Update</Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">New</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs font-semibold">{row.name}</td>
                            <td className="px-3 py-2 text-xs font-mono">{row.schoolId || row.pen || "Auto-Generated"}</td>
                            <td className="px-3 py-2 text-xs">Class {row.presentClass} - {row.presentSection} (#{row.presentRoll})</td>
                            <td className="px-3 py-2">
                              {(row.errors && row.errors.length > 0) ? (
                                <Badge variant="destructive" className="text-[10px]">Error</Badge>
                              ) : (row.warnings && row.warnings.length > 0) ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Warning</Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Valid</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Issues */}
            <TabsContent value="issues" className="mt-3">
              {validationIssues.length === 0 ? (
                <div className="p-8 text-center rounded-lg border bg-muted/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-emerald-800">No issues found!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All spreadsheet rows passed validation checks cleanly.</p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/70 sticky top-0 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Field</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Issue Description</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {validationIssues.map((issue, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{issue.row}</td>
                            <td className="px-3 py-2 text-xs font-mono">{issue.field}</td>
                            <td className="px-3 py-2 text-xs">{issue.issue}</td>
                            <td className="px-3 py-2">
                              {issue.severity === "error" ? (
                                <Badge variant="destructive" className="text-[10px]">Error</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Warning</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Mapping
            </button>
            <button
              onClick={() => {
                if (isResultsMode) {
                  resultsImportMutation.mutate(mappedResultRows);
                } else {
                  studentImportMutation.mutate(mappedRows);
                }
              }}
              disabled={isImporting || errorIssues.length > 0}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing into Database…
                </>
              ) : (
                <>
                  Confirm & Run Bulk Import <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* STEP 4: Import Summary & Instant Rollback                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {step === 4 && importResult && (
        <div className="rounded-xl border bg-card p-6 space-y-6 shadow-xs">
          <div className="text-center py-4 space-y-2">
            <div className="rounded-full bg-emerald-100 p-3 w-14 h-14 mx-auto flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Bulk Import Completed Successfully!</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Batch ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{importResult.batchId}</code>
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-emerald-50/60 border-emerald-200 p-3 text-center">
              <p className="text-xs font-semibold text-emerald-800">Records Created</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{importResult.summary.createdCount}</p>
            </div>
            <div className="rounded-lg border bg-sky-50/60 border-sky-200 p-3 text-center">
              <p className="text-xs font-semibold text-sky-800">Records Updated</p>
              <p className="text-2xl font-bold text-sky-700 mt-1">{importResult.summary.updatedCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/60 p-3 text-center">
              <p className="text-xs font-semibold text-muted-foreground">Skipped</p>
              <p className="text-2xl font-bold text-muted-foreground mt-1">{importResult.summary.skippedCount}</p>
            </div>
            <div className="rounded-lg border bg-rose-50/60 border-rose-200 p-3 text-center">
              <p className="text-xs font-semibold text-rose-800">Failed / Errors</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">{importResult.summary.errorCount}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
            <button
              onClick={() => setRollbackConfirmBatchId(importResult.batchId)}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium border border-rose-200 hover:bg-rose-50 px-3.5 py-2 rounded-md transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo / Delete This Batch
            </button>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setParsedData(null);
                  setImportResult(null);
                }}
                className="flex-1 sm:flex-none rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
              >
                Upload Another File
              </button>
              <a
                href={isResultsMode ? "/results" : "/students"}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {isResultsMode ? "View Marks & Results" : "View Students Directory"}{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Batch History & Full Delete/Rollback Modal                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Batches & Batch Deletion History</DialogTitle>
            <DialogDescription>
              Audit all past bulk uploads (Students & Examination Results) and delete/rollback any batch.
            </DialogDescription>
          </DialogHeader>

          {rollbackSuccessMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              {rollbackSuccessMsg}
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto rounded-lg border divide-y">
            {pastBatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No past bulk import batches found in audit logs.
              </div>
            ) : (
              pastBatches.map((batch: any) => {
                const isResultBatch =
                  batch.uploadType === "exam_results" || batch.action === "RESULTS_BULK_UPLOAD";
                const isOldStudentsBatch = batch.uploadType === "old_students";
                const isRolledBack = batch.status === "Rolled_Back";

                return (
                  <div
                    key={batch.batchId}
                    className={cn(
                      "flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors",
                      isRolledBack && "opacity-60 bg-muted/20"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono font-semibold bg-muted px-1.5 py-0.5 rounded">
                          {batch.batchId.slice(0, 14)}…
                        </code>

                        {isResultBatch ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            📊 Exam Results {batch.targetYear ? `(${batch.targetYear})` : ""}
                          </Badge>
                        ) : isOldStudentsBatch ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                            🏛️ Old Students Archive
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                            🎓 Active Students
                          </Badge>
                        )}

                        <Badge variant="outline" className="text-[10px]">
                          {batch.totalAffected} records
                        </Badge>

                        {isRolledBack && (
                          <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                            Rolled Back / Deleted
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Uploaded on {new Date(batch.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>

                    {!isRolledBack && (
                      <button
                        onClick={() => setRollbackConfirmBatchId(batch.batchId)}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-md transition-colors font-medium ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Batch
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete / Rollback Confirmation Dialog */}
      <Dialog
        open={!!rollbackConfirmBatchId}
        onOpenChange={(open) => !open && setRollbackConfirmBatchId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-700 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirm Batch Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete / rollback batch{" "}
              <code className="font-mono text-xs bg-muted px-1 rounded">
                {rollbackConfirmBatchId?.slice(0, 14)}…
              </code>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-2 border-y my-2">
            <p className="font-semibold text-foreground">This deletion action will:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Permanently remove all newly created records (Students / Exam Results) in this batch.</li>
              <li>Revert any records updated during this batch back to their exact prior values.</li>
              <li>Record an administrative deletion timestamp in the security audit log.</li>
            </ul>
          </div>
          <DialogFooter>
            <button
              onClick={() => setRollbackConfirmBatchId(null)}
              className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                rollbackConfirmBatchId && rollbackMutation.mutate(rollbackConfirmBatchId)
              }
              disabled={rollbackMutation.isPending}
              className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {rollbackMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting Batch…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Yes, Delete Entire Batch
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
