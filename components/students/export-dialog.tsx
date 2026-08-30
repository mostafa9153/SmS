"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Sparkles,
  Loader2,
  Check,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { searchStudents } from "@/lib/data/students";
import { getKanyashreeCategory } from "@/lib/utils";
import type { Student, StudentFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

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
      const cat = getKanyashreeCategory(s);
      if (cat === "K2") return "K2 (Eligible - Age 18+)";
      if (cat === "K1") return "K1 (Eligible - Age 13-17)";
      if (s.gender === "Female") return "Under-age (<13)";
      return "N/A";
    },
  },
  { id: "isBpl", label: "BPL Beneficiary", category: "Welfare", getValue: (s) => s.isBpl ? "Yes" : "No" },
  { id: "isCwsn", label: "CWSN Beneficiary", category: "Welfare", getValue: (s) => s.isCwsn ? "Yes" : "No" },
  { id: "isEws", label: "EWS / Disadvantaged", category: "Welfare", getValue: (s) => s.isEws ? "Yes" : "No" },
];

const PRESETS = {
  bsp: {
    id: "bsp",
    name: "Banglar Shiksha (BSP)",
    badge: "Official",
    cols: ["studentUniqueCode", "name", "gender", "dob", "presentClass", "presentSection", "presentRoll", "fatherName", "motherName", "studentContact", "aadhaar", "pen", "socialCategory", "bankIfsc", "bankAccountNo"],
  },
  exam: {
    id: "exam",
    name: "Board Exam (MP/HS)",
    badge: "Academic",
    cols: ["schoolId", "studentUniqueCode", "name", "gender", "dob", "presentClass", "presentSection", "presentRoll", "fatherName", "motherName", "aadhaar", "pen", "socialCategory", "religion"],
  },
  bank: {
    id: "bank",
    name: "Bank Disbursal",
    badge: "Financial",
    cols: ["schoolId", "name", "presentClass", "presentSection", "presentRoll", "bankIfsc", "bankAccountNo", "studentContact", "kanyashreeStatus"],
  },
  kanyashree: {
    id: "kanyashree",
    name: "Kanyashree / Schemes",
    badge: "Welfare",
    cols: ["schoolId", "name", "gender", "dob", "presentClass", "presentSection", "presentRoll", "aadhaar", "bankIfsc", "bankAccountNo", "kanyashreeStatus", "isBpl"],
  },
  contact: {
    id: "contact",
    name: "Parent Contact",
    badge: "Directory",
    cols: ["schoolId", "name", "presentClass", "presentSection", "presentRoll", "fatherName", "motherName", "guardianName", "studentContact", "altMobile", "address"],
  },
  idcard: {
    id: "idcard",
    name: "ID Card Data",
    badge: "Identity",
    cols: ["schoolId", "name", "presentClass", "presentSection", "presentRoll", "bloodGroup", "dob", "studentContact", "guardianName", "address"],
  },
  attendance: {
    id: "attendance",
    name: "Attendance Register",
    badge: "Register",
    cols: ["presentClass", "presentSection", "presentRoll", "schoolId", "name", "gender", "guardianName", "studentContact"],
  },
  category: {
    id: "category",
    name: "Caste & Census",
    badge: "Demographic",
    cols: ["schoolId", "name", "gender", "presentClass", "presentSection", "socialCategory", "religion", "isBpl", "isCwsn", "isEws"],
  },
};

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: StudentFilters;
}

export function ExportDialog({ open, onOpenChange, activeFilters }: ExportDialogProps) {
  const router = useRouter();
  const [selectedColIds, setSelectedColIds] = useState<Set<string>>(
    new Set(["name", "schoolId", "presentClass", "presentSection", "presentRoll", "dob", "gender", "fatherName", "studentContact", "pen", "aadhaar"])
  );
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [fileFormat, setFileFormat] = useState<"xlsx" | "csv">("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (id: string) => {
    const next = new Set(selectedColIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedColIds(next);
    setActivePreset(null);
  };

  const selectAll = () => {
    setSelectedColIds(new Set(ALL_EXPORT_COLUMNS.map((c) => c.id)));
    setActivePreset(null);
  };

  const clearAll = () => {
    setSelectedColIds(new Set(["name", "schoolId"]));
    setActivePreset(null);
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    setSelectedColIds(new Set(PRESETS[presetKey].cols));
    setActivePreset(presetKey);
  };

  const handleGoToClassicReport = () => {
    onOpenChange(false);
    router.push("/reports");
  };

  // Compute active filters list for display
  const activeFilterBadges: string[] = [];
  if (activeFilters.query) activeFilterBadges.push(`Search: "${activeFilters.query}"`);
  if (activeFilters.class) activeFilterBadges.push(`Class: ${activeFilters.class}`);
  if (activeFilters.section) activeFilterBadges.push(`Section: ${activeFilters.section}`);
  if (activeFilters.gender) activeFilterBadges.push(`Gender: ${activeFilters.gender}`);
  if (activeFilters.socialCategory) activeFilterBadges.push(`Category: ${activeFilters.socialCategory}`);
  if (activeFilters.status) activeFilterBadges.push(`Status: ${activeFilters.status}`);
  if (activeFilters.admissionYear) activeFilterBadges.push(`Year: ${activeFilters.admissionYear}`);
  if (activeFilters.scheme) activeFilterBadges.push(`Scheme: ${activeFilters.scheme}`);
  if (activeFilters.hasAadhaar) activeFilterBadges.push(`Aadhaar: ${activeFilters.hasAadhaar === "yes" ? "Yes" : "No"}`);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      // Fetch all students strictly matching active directory filters
      const res = await searchStudents(activeFilters, 1, 100000);
      const filtered = res.data || [];

      if (filtered.length === 0) {
        alert("No students found matching the applied filters.");
        return;
      }

      const exportColumns = ALL_EXPORT_COLUMNS.filter((c) => selectedColIds.has(c.id));

      const rows = filtered.map((student) => {
        const rowObj: Record<string, any> = {};
        for (const col of exportColumns) {
          rowObj[col.label] = col.getValue(student);
        }
        return rowObj;
      });
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

      const timestamp = new Date().toISOString().split("T")[0];
      const filterTag = activeFilters.class ? `_Class_${activeFilters.class}` : "";
      const filename = `Students_Report${filterTag}_${timestamp}.${fileFormat}`;

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
              <DialogTitle className="text-base font-bold text-foreground">
                Report
              </DialogTitle>
              <DialogDescription className="sr-only">
                Student report export
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                {selectedColIds.size} of {ALL_EXPORT_COLUMNS.length} Columns Selected
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Quick Presets Section */}
          <div className="bg-muted/40 p-4 rounded-xl border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-foreground">Quick Presets & Templates</span>
              </div>

              {/* Redirect to Official Classic Report */}
              <button
                type="button"
                onClick={handleGoToClassicReport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1.5 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Go to official West Bengal Students Strength Tabulation Report"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Classic Report</span>
                <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-200">
                  Tabulation ↗
                </span>
              </button>
            </div>

            {/* Presets List */}
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(PRESETS).map(([key, p]) => {
                const isActive = activePreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key as any)}
                    className={cn(
                      "group flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all shadow-2xs cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                        : "bg-background text-foreground hover:bg-muted/80 hover:border-primary/40"
                    )}
                  >
                    <span>{p.name}</span>
                    <span
                      className={cn(
                        "rounded px-1 py-0.5 text-[9px] uppercase tracking-wider font-semibold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {p.badge}
                    </span>
                  </button>
                );
              })}

              <div className="h-4 w-px bg-border mx-1" />

              {/* Utility Select / Reset Buttons */}
              <button
                type="button"
                onClick={selectAll}
                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
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
                    <span className="text-[11px] text-muted-foreground/60">
                      ({catCols.filter((c) => selectedColIds.has(c.id)).length} of {catCols.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {catCols.map((col) => {
                      const isSelected = selectedColIds.has(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => toggleColumn(col.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer select-none",
                            isSelected
                              ? "bg-primary/5 border-primary/40 text-foreground font-semibold shadow-2xs"
                              : "bg-background border-border/70 text-muted-foreground hover:border-border hover:bg-muted/40"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-md border transition-colors shrink-0",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
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
        <div className="border-t px-6 py-3.5 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Format Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Export Format:</span>
            <div className="flex items-center rounded-lg border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setFileFormat("xlsx")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer",
                  fileFormat === "xlsx"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFileFormat("csv")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer",
                  fileFormat === "csv"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border rounded-xl bg-background hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting || selectedColIds.size === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
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
