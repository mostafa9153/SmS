"use client";

import { useState, useCallback } from "react";
import { currentYearIST, sessionYears } from "@/lib/utils/academic-year";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { executeBulkUpload, executeResultsBulkUpload, rollbackBulkUpload, getImportBatches } from "@/lib/data/students";
import { toast } from "sonner";
import { useNotifications } from "@/lib/stores/notification-store";
import { parseExcelFile, reparseWithHeaderRow, autoSuggestMapping, applyMapping, validateMappedRows, TEMPLATE_PRESETS, RESULT_TEMPLATE_PRESETS, autoSuggestResultMapping, applyResultMapping, validateResultRows, type ParsedExcelResult } from "@/lib/utils/excel-parser";
import { Student, StudentStatus, ValidationIssue, BulkPreviewRow, BulkUploadType, BulkResultRow, ImportBatchRecord } from "@/lib/types";
import { downloadSampleTemplate as downloadTemplate, exportImportIssues } from "./bulk-templates";

export function useBulkUpload() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const currentYear = currentYearIST();
  const yearOptions = sessionYears(currentYear, 11).map(Number);

  // Wizard State with URL synchronization
  const stepParam = searchParams.get("step");
  const initialStep = stepParam ? Math.min(Math.max(parseInt(stepParam, 10) || 1, 1), 4) : 1;
  const [step, setStepState] = useState(initialStep);

  const setStep = (newStep: number | ((prev: number) => number)) => {
    setStepState((prev) => {
      const nextStep = typeof newStep === "function" ? newStep(prev) : newStep;
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (nextStep === 1) {
          url.searchParams.delete("step");
        } else {
          url.searchParams.set("step", String(nextStep));
        }
        window.history.replaceState(null, "", url.toString());
      }
      return nextStep;
    });
  };
  const { addNotification } = useNotifications();
  const [uploadType, setUploadType] = useState<BulkUploadType>("current_students");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("auto");

  // Student specific target settings (Year, Class, Section, Status)
  const [targetSessionYear, setTargetSessionYear] = useState<number>(currentYear);
  const [targetClass, setTargetClass] = useState<string>("AUTO");
  const [targetSection, setTargetSection] = useState<string>("AUTO");
  const [targetStatus, setTargetStatus] = useState<StudentStatus>("Continuing");

  // Result specific settings
  const [resultYear, setResultYear] = useState<number>(currentYear);
  const [resultExam, setResultExam] = useState<string>("1st Summative Evaluation");

  // Excel parsed data
  const [parsedData, setParsedData] = useState<ParsedExcelResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const handleMappingChange = (header: string, targetKey: string) => {
    setColumnMapping((prev) => ({ ...prev, [header]: targetKey }));
  };

  // Validated data for Students
  const [mappedRows, setMappedRows] = useState<Array<Partial<Student>>>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [previewRows, setPreviewRows] = useState<BulkPreviewRow[]>([]);

  // Validated data for Results
  const [mappedResultRows, setMappedResultRows] = useState<BulkResultRow[]>([]);
  const [resultPreviewRows, setResultPreviewRows] = useState<any[]>([]);

  // Execution & Result state
  const [importResult, setImportResult] = useState<any | null>(null);
  const [issueFilter, setIssueFilter] = useState<"all" | "skipped" | "errors">("all");
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);
  const [rollbackConfirmBatchId, setRollbackConfirmBatchId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);


  // Query past batches
  const {
    data: pastBatches = [],
    isLoading: isLoadingBatches,
    isFetching: isFetchingBatches,
    refetch: refetchBatches,
  } = useQuery<ImportBatchRecord[]>({
    queryKey: ["import-batches"],
    queryFn: getImportBatches,
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

        // Auto-assign metadata from BSP / header banner if found
        if (parsed.detectedMetadata) {
          if (parsed.detectedMetadata.detectedClass) {
            setTargetClass(parsed.detectedMetadata.detectedClass);
          }
          if (parsed.detectedMetadata.detectedSection) {
            setTargetSection(parsed.detectedMetadata.detectedSection);
          }
          if (parsed.detectedMetadata.detectedAcademicYear) {
            const yrMatch = parsed.detectedMetadata.detectedAcademicYear.match(/\b(20\d{2})\b/);
            if (yrMatch) {
              const yr = parseInt(yrMatch[1], 10);
              setTargetSessionYear(yr);
              setResultYear(yr);
            }
          }
        }

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

  // Instant Header Row switch without re-reading file buffer
  const handleHeaderRowChange = useCallback(
    (newRowIndex: number) => {
      if (!parsedData) return;
      const reloaded = reparseWithHeaderRow(parsedData, newRowIndex);
      setParsedData(reloaded);

      if (uploadType === "exam_results") {
        let initialMapping = autoSuggestResultMapping(reloaded.headers);
        if (selectedTemplate !== "auto" && RESULT_TEMPLATE_PRESETS[selectedTemplate]) {
          initialMapping = { ...initialMapping, ...RESULT_TEMPLATE_PRESETS[selectedTemplate].mapping };
        }
        setColumnMapping(initialMapping);
      } else {
        let initialMapping = autoSuggestMapping(reloaded.headers);
        if (selectedTemplate !== "auto" && TEMPLATE_PRESETS[selectedTemplate]) {
          initialMapping = { ...initialMapping, ...TEMPLATE_PRESETS[selectedTemplate].mapping };
        }
        setColumnMapping(initialMapping);
      }
    },
    [parsedData, uploadType, selectedTemplate]
  );

  // Handle switching active sheet in multi-sheet Excel file
  const handleSheetChange = useCallback(
    async (sheetIndex: number) => {
      if (!file) return;
      setIsParsing(true);
      try {
        const parsed = await parseExcelFile(file, { sheetIndex });
        setParsedData(parsed);

        if (parsed.detectedMetadata) {
          if (parsed.detectedMetadata.detectedClass) {
            setTargetClass(parsed.detectedMetadata.detectedClass);
          }
          if (parsed.detectedMetadata.detectedSection) {
            setTargetSection(parsed.detectedMetadata.detectedSection);
          }
        }

        if (uploadType === "exam_results") {
          let initialMapping = autoSuggestResultMapping(parsed.headers);
          if (selectedTemplate !== "auto" && RESULT_TEMPLATE_PRESETS[selectedTemplate]) {
            initialMapping = { ...initialMapping, ...RESULT_TEMPLATE_PRESETS[selectedTemplate].mapping };
          }
          setColumnMapping(initialMapping);
        } else {
          let initialMapping = autoSuggestMapping(parsed.headers);
          if (selectedTemplate !== "auto" && TEMPLATE_PRESETS[selectedTemplate]) {
            initialMapping = { ...initialMapping, ...TEMPLATE_PRESETS[selectedTemplate].mapping };
          }
          setColumnMapping(initialMapping);
        }
      } catch (err: any) {
        setParseError(err.message || "Failed to switch sheet");
      } finally {
        setIsParsing(false);
      }
    },
    [file, uploadType, selectedTemplate]
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

  // Remove / Deselect selected file
  const handleRemoveFile = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
    setMappedRows([]);
    setMappedResultRows([]);
    setValidationIssues([]);
    setPreviewRows([]);
    setResultPreviewRows([]);
    setParseError(null);
    const input = document.getElementById("file-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }, []);

  // Mode change handler
  const handleModeChange = (mode: BulkUploadType) => {
    setUploadType(mode);
    setSelectedTemplate("auto");
    if (mode === "old_students") {
      setTargetSessionYear(currentYear - 1);
      setTargetStatus("Passed Out");
    } else if (mode === "current_students") {
      setTargetSessionYear(currentYear);
      setTargetStatus("Continuing");
    }

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
      const transformed = applyMapping(
        parsedData.rawRows,
        columnMapping as any,
        uploadType === "current_students" ? currentYear : targetSessionYear,
        targetClass,
        targetSection,
        uploadType === "current_students" ? "Continuing" : targetStatus
      );
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
      
      addNotification("activity", "Bulk Upload Successful", `Imported ${data.insertedCount} students in batch ${data.batchId}`);
      
      setStep(4);
    },
    onError: (err: any) => {
      setParseError(err.message || "Import execution failed");
      addNotification("system", "Upload Failed", `Bulk import failed: ${err.message || "Unknown error"}`);
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
      
      addNotification("activity", "Results Uploaded", `Successfully uploaded ${data.insertedCount} results in batch ${data.batchId}`);
      
      setStep(4);
    },
    onError: (err: any) => {
      setParseError(err.message || "Results import execution failed");
      addNotification("system", "Results Upload Failed", `Failed: ${err.message}`);
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
      addNotification("activity", "Batch Rolled Back", `Successfully reverted batch ${data.batchId}`);
    },
    onError: (err: any) => {
      toast.error(`Rollback failed: ${err.message}`);
      addNotification("system", "Rollback Error", err.message);
    },
  });

  // Template Download helper
  const downloadSampleTemplate = (type: BulkUploadType) =>
    downloadTemplate(type, { targetClass, targetSection, resultYear, resultExam, targetSessionYear });
  const exportSkippedAndErrorsExcel = () => exportImportIssues(importResult);

  const isResultsMode = uploadType === "exam_results";
  const isImporting = studentImportMutation.isPending || resultsImportMutation.isPending;
  const errorIssues = validationIssues.filter((i) => i.severity === "error");

  return {
    columnMapping,
    currentYear,
    downloadSampleTemplate,
    errorIssues,
    exportSkippedAndErrorsExcel,
    file,
    handleDrop,
    handleFileSelect,
    handleHeaderRowChange,
    handleMappingChange,
    handleModeChange,
    handleProceedToPreview,
    handleRemoveFile,
    handleSheetChange,
    importResult,
    isDragging,
    isFetchingBatches,
    isImporting,
    isLoadingBatches,
    isParsing,
    isResultsMode,
    issueFilter,
    mappedResultRows,
    mappedRows,
    parseError,
    parsedData,
    pastBatches,
    previewRows,
    refetchBatches,
    resultExam,
    resultPreviewRows,
    resultYear,
    resultsImportMutation,
    rollbackConfirmBatchId,
    rollbackMutation,
    rollbackSuccessMsg,
    setColumnMapping,
    setFile,
    setImportResult,
    setIsDragging,
    setIssueFilter,
    setParsedData,
    setResultExam,
    setResultYear,
    setRollbackConfirmBatchId,
    setShowHistoryModal,
    setStep,
    setTargetClass,
    setTargetSection,
    setTargetSessionYear,
    setTargetStatus,
    showHistoryModal,
    step,
    studentImportMutation,
    targetClass,
    targetSection,
    targetSessionYear,
    targetStatus,
    uploadType,
    validationIssues,
    yearOptions,
  };
}

export type BulkUploadState = ReturnType<typeof useBulkUpload>;
