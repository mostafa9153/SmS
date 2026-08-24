"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, CheckSquare, Square, Sparkles, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getStudents } from "@/lib/data/students";
import type { Student, StudentFilters } from "@/lib/types";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { exportClassicStrengthExcel } from "@/lib/reports/classic-strength-report";

interface ExportColumn {
  id: string;
  label: string;
  category: "Basic" | "Identifiers" | "Enrolment" | "Family" | "Contact" | "Bank" | "Welfare";
  getValue: (s: Student) => any;
}

const ALL_EXPORT_COLUMNS: ExportColumn[] = [
  // Basic
  { id: "name", label: "Student Name", category: "Basic", getValue: (s) => s.name },
  { id: "gender", label: "Gender", category: "Basic", getValue: (s) => s.gender },
  { id: "dob", label: "Date of Birth", category: "Basic", getValue: (s) => s.dob },
  { id: "age", label: "Current Age", category: "Basic", getValue: (s) => s.dob ? new Date().getFullYear() - new Date(s.dob).getFullYear() : "" },
  { id: "socialCategory", label: "Social Category", category: "Basic", getValue: (s) => s.socialCategory || "General" },
  { id: "religion", label: "Religion", category: "Basic", getValue: (s) => s.religion || "" },
  { id: "motherTongue", label: "Mother Tongue", category: "Basic", getValue: (s) => s.motherTongue || "" },
  { id: "bloodGroup", label: "Blood Group", category: "Basic", getValue: (s) => s.bloodGroup || "" },

  // Identifiers
  { id: "schoolId", label: "School ID", category: "Identifiers", getValue: (s) => s.schoolId },
  { id: "hasAadhaar", label: "Aadhaar (Yes/No)", category: "Identifiers", getValue: (s) => (s.aadhaar && s.aadhaar.trim() !== "") ? "Yes" : "No" },
  { id: "aadhaar", label: "Aadhaar Number", category: "Identifiers", getValue: (s) => s.aadhaar || "" },
  { id: "pen", label: "PEN Number", category: "Identifiers", getValue: (s) => s.pen || "" },
  { id: "studentUniqueCode", label: "Banglar Shiksha (BSP) Code", category: "Identifiers", getValue: (s) => s.studentUniqueCode || "" },
  { id: "birthRegistrationNo", label: "Birth Reg. Number", category: "Identifiers", getValue: (s) => s.birthRegistrationNo || "" },

  // Enrolment
  { id: "presentClass", label: "Class", category: "Enrolment", getValue: (s) => s.presentClass },
  { id: "presentSection", label: "Section", category: "Enrolment", getValue: (s) => s.presentSection },
  { id: "presentRoll", label: "Roll No", category: "Enrolment", getValue: (s) => s.presentRoll },
  { id: "currentStatus", label: "Status", category: "Enrolment", getValue: (s) => s.currentStatus },
  { id: "admissionYear", label: "Admission Year", category: "Enrolment", getValue: (s) => s.admissionYear },
  { id: "admissionDate", label: "Admission Date", category: "Enrolment", getValue: (s) => s.admissionDate || "" },
  { id: "previousSchool", label: "Previous School", category: "Enrolment", getValue: (s) => s.previousSchool || "" },

  // Family
  { id: "fatherName", label: "Father Name", category: "Family", getValue: (s) => s.fatherName },
  { id: "motherName", label: "Mother Name", category: "Family", getValue: (s) => s.motherName },
  { id: "guardianName", label: "Guardian Name", category: "Family", getValue: (s) => s.guardianName || "" },

  // Contact
  { id: "studentContact", label: "Mobile Number", category: "Contact", getValue: (s) => s.studentContact || "" },
  { id: "altMobile", label: "Guardian Contact No", category: "Contact", getValue: (s) => s.altMobile || "" },
  { id: "email", label: "Email ID", category: "Contact", getValue: (s) => s.email || "" },
  { id: "address", label: "Address", category: "Contact", getValue: (s) => s.address || "" },
  { id: "pincode", label: "Pincode", category: "Contact", getValue: (s) => s.pincode || "" },

  // Bank
  { id: "bankIfsc", label: "Bank IFSC Code", category: "Bank", getValue: (s) => s.bankIfsc || "" },
  { id: "bankAccountNo", label: "Bank Account Number", category: "Bank", getValue: (s) => s.bankAccountNo || "" },

  // Welfare & Schemes
  {
    id: "kanyashreeStatus",
    label: "Kanyashree Status",
    category: "Welfare",
    getValue: (s) => {
      if (s.gender !== "Female" || !s.dob) return "N/A";
      const age = new Date().getFullYear() - new Date(s.dob).getFullYear();
      if (age >= 18) return "K2 (Eligible - Age 18+)";
      if (age >= 13) return "K1 (Eligible - Age 13-17)";
      return "Under-age";
    },
  },
  { id: "isBpl", label: "BPL Beneficiary", category: "Welfare", getValue: (s) => s.isBpl ? "Yes" : "No" },
  { id: "isCwsn", label: "CWSN Beneficiary", category: "Welfare", getValue: (s) => s.isCwsn ? "Yes" : "No" },
  { id: "isEws", label: "EWS / Disadvantaged", category: "Welfare", getValue: (s) => s.isEws ? "Yes" : "No" },
];

const PRESETS = {
  bsp: {
    name: "Banglar Shiksha (BSP) Standard",
    cols: ["studentUniqueCode", "name", "gender", "dob", "presentClass", "presentSection", "presentRoll", "fatherName", "motherName", "studentContact", "aadhaar", "pen", "socialCategory", "bankIfsc", "bankAccountNo"],
  },
  bank: {
    name: "Bank Disbursal Format",
    cols: ["schoolId", "name", "presentClass", "presentSection", "presentRoll", "bankIfsc", "bankAccountNo", "studentContact", "kanyashreeStatus"],
  },
  contact: {
    name: "Parent Contact Directory",
    cols: ["schoolId", "name", "presentClass", "presentSection", "presentRoll", "fatherName", "motherName", "guardianName", "studentContact", "altMobile", "address"],
  },
};

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: StudentFilters;
}

export function ExportDialog({ open, onOpenChange, activeFilters }: ExportDialogProps) {
  const [selectedColIds, setSelectedColIds] = useState<Set<string>>(
    new Set(["name", "schoolId", "presentClass", "presentSection", "presentRoll", "dob", "gender", "fatherName", "studentContact", "pen", "aadhaar"])
  );
  const [fileFormat, setFileFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (id: string) => {
    const next = new Set(selectedColIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedColIds(next);
  };

  const selectAll = () => {
    setSelectedColIds(new Set(ALL_EXPORT_COLUMNS.map((c) => c.id)));
  };

  const clearAll = () => {
    setSelectedColIds(new Set(["name", "schoolId"]));
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    setSelectedColIds(new Set(PRESETS[presetKey].cols));
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      // Fetch all students matching active filters
      const allStudents = await getStudents();
      
      // Filter in-memory using activeFilters
      const filtered = allStudents.filter((s) => {
        if (activeFilters.class && s.presentClass !== activeFilters.class) return false;
        if (activeFilters.section && s.presentSection !== activeFilters.section) return false;
        if (activeFilters.status && s.currentStatus !== activeFilters.status) return false;
        if (activeFilters.admissionYear && s.admissionYear !== activeFilters.admissionYear) return false;
        if (activeFilters.query) {
          const q = activeFilters.query.toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.schoolId.toLowerCase().includes(q) ||
            (s.pen && s.pen.toLowerCase().includes(q)) ||
            (s.aadhaar && s.aadhaar.includes(q))
          );
        }
        return true;
      });

      const exportColumns = ALL_EXPORT_COLUMNS.filter((c) => selectedColIds.has(c.id));

      const rows = filtered.map((student) => {
        const rowObj: Record<string, any> = {};
        for (const col of exportColumns) {
          rowObj[col.label] = col.getValue(student);
        }
        return rowObj;
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `Students_Report_${timestamp}.${fileFormat}`;

      if (fileFormat === "xlsx") {
        XLSX.writeFile(workbook, filename);
      } else {
        XLSX.writeFile(workbook, filename, { bookType: "csv" });
      }

      onOpenChange(false);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadClassicReport = async () => {
    setIsExporting(true);
    try {
      const allStudents = await getStudents();
      const filtered = allStudents.filter((s) => {
        if (activeFilters.class && s.presentClass !== activeFilters.class) return false;
        if (activeFilters.section && s.presentSection !== activeFilters.section) return false;
        if (activeFilters.status && s.currentStatus !== activeFilters.status) return false;
        if (activeFilters.admissionYear && s.admissionYear !== activeFilters.admissionYear) return false;
        if (activeFilters.query) {
          const q = activeFilters.query.toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.schoolId.toLowerCase().includes(q) ||
            (s.pen && s.pen.toLowerCase().includes(q)) ||
            (s.aadhaar && s.aadhaar.includes(q))
          );
        }
        return true;
      });

      const listToExport = filtered.length > 0 ? filtered : allStudents;
      exportClassicStrengthExcel(listToExport, "MARIGACHI HIGH SCHOOL (H. S.)");
      onOpenChange(false);
    } catch (err: any) {
      alert(`Classic Report export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const categories = ["Basic", "Identifiers", "Enrolment", "Family", "Contact", "Bank", "Welfare"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="border-b px-6 py-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Export Custom Student Report
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Select the exact data columns to include in your customized Excel or CSV export.
                </DialogDescription>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              {selectedColIds.size} of {ALL_EXPORT_COLUMNS.length} Columns Selected
            </span>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Presets Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Quick Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Highlighted Classic Report Button */}
              <button
                type="button"
                onClick={handleDownloadClassicReport}
                disabled={isExporting}
                title="Download complete Class & Section Matrix Report (West Bengal High School Standard)"
                className="group relative inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-95 transition-all ring-2 ring-amber-400/50"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-100 animate-pulse" />
                <span>Classic Report</span>
                <span className="rounded bg-black/20 px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-100">
                  .xlsx
                </span>
              </button>

              <div className="h-4 w-px bg-border mx-0.5" />

              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as any)}
                  className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 hover:border-primary/40 transition-all shadow-2xs"
                >
                  {p.name}
                </button>
              ))}
              <div className="h-4 w-px bg-border mx-0.5" />
              <button
                onClick={selectAll}
                className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Categorized Column Checkboxes */}
          <div className="space-y-5">
            {categories.map((category) => {
              const catCols = ALL_EXPORT_COLUMNS.filter((c) => c.category === category);
              if (!catCols.length) return null;

              return (
                <div key={category} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {category} Fields
                    </span>
                    <span className="text-[10px] text-muted-foreground">({catCols.length})</span>
                    <div className="flex-1 border-t" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {catCols.map((col) => {
                      const isSelected = selectedColIds.has(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => toggleColumn(col.id)}
                          className={cn(
                            "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs text-left cursor-pointer select-none transition-all",
                            isSelected
                              ? "bg-primary/5 border-primary/50 text-foreground font-semibold shadow-2xs"
                              : "bg-background border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          )}
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded-md flex items-center justify-center border transition-colors shrink-0",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 bg-background"
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{col.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs text-muted-foreground font-medium">
              Export Format:
            </span>
            <div className="flex rounded-lg border bg-background p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setFileFormat("xlsx")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                  fileFormat === "xlsx"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFileFormat("csv")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                  fileFormat === "csv"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-initial rounded-lg border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || selectedColIds.size === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Download Report ({selectedColIds.size})
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
