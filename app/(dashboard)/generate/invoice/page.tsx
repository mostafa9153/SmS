"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import type { Student } from "@/lib/types";
import {
  type FeeItem,
  type InvoiceData,
  DEFAULT_FEE_ITEMS,
  getSavedFeeStructure,
  saveFeeStructure,
  calculateFeeTotal,
  generateInvoiceNumber,
} from "@/lib/utils/fee-config";
import {
  InvoicePrintableView,
  InvoicePrintableBatchView,
} from "@/components/invoice/invoice-printable-view";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-banner";
import {
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Search,
  FileText,
  ArrowLeft,
  User,
  Users,
  Sliders,
  Eye,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const STANDARD_SECTIONS = ["ALL", "A", "B", "C", "D"];

function InvoiceGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIdParam = searchParams.get("studentId");
  const modeParam = searchParams.get("mode");
  const classParam = searchParams.get("class");
  const sectionParam = searchParams.get("section");

  // Mode: "single" vs "bulk"
  const [generatorMode, setGeneratorMode] = useState<"single" | "bulk">(
    modeParam === "bulk" ? "bulk" : "single"
  );

  const [copyType, setCopyType] = useState<"both" | "student" | "office">("both");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [autoDateTime, setAutoDateTime] = useState(true);

  // Bulk mode states
  const [bulkClass, setBulkClass] = useState<string>(classParam?.toUpperCase() || "IX");
  const [bulkSection, setBulkSection] = useState<string>(sectionParam?.toUpperCase() || "ALL");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkRosterSearch, setBulkRosterSearch] = useState("");
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const currentYear = new Date().getFullYear();
  const [bulkReceiptPrefix, setBulkReceiptPrefix] = useState(`MHS/${currentYear}/ADM-`);
  const [bulkStartingNo, setBulkStartingNo] = useState(1);
  const [bulkSession, setBulkSession] = useState(`${currentYear} – ${currentYear + 1}`);
  const [bulkPaymentMode, setBulkPaymentMode] = useState<
    "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque"
  >("Cash");
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<
    "Paid" | "Partial" | "Due"
  >("Paid");

  // Helper for live formatted Indian Date & Time
  function getLiveFormattedDateTime() {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }); // "02/09/2026"
    const timeStr = today.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }); // "06:45 PM"
    return { dateStr, timeStr };
  }

  // Invoice State (Single Mode)
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = today.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

    return {
      invoiceNumber: generateInvoiceNumber(36),
      issueDate: dateStr,
      issueTime: timeStr,
      academicSession: `${currentYear} – ${currentYear + 1}`,
      studentName: "Synthia Sanam",
      studentClass: "IX",
      section: "A",
      rollNo: "01",
      studentId: "MHS-2026-0036",
      penNumber: "",
      guardianName: "Md. Ruhul Amin",
      contactNumber: "9876543210",
      feeItems: getSavedFeeStructure(),
      paymentMode: "Cash",
      paymentStatus: "Paid",
      remarks: "Annual admission fee collected with thanks.",
    };
  });

  // Auto-sync current date and time continuously when enabled
  useEffect(() => {
    if (!autoDateTime) return;
    const syncCurrent = () => {
      const { dateStr, timeStr } = getLiveFormattedDateTime();
      setInvoice((prev) => ({
        ...prev,
        issueDate: dateStr,
        issueTime: timeStr,
      }));
    };
    syncCurrent();
    const timer = setInterval(syncCurrent, 30000);
    return () => clearInterval(timer);
  }, [autoDateTime]);

  // Fetch all students
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["all-students-for-invoice"],
    queryFn: getStudents,
  });

  // Load student by query param if provided
  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const match = students.find((s) => s.id === studentIdParam);
      if (match) {
        handleSelectStudent(match);
      }
    }
  }, [studentIdParam, students]);

  // Handle choosing a student in Single Mode
  function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    setInvoice((prev) => ({
      ...prev,
      studentId: student.schoolId || student.id,
      studentName: student.name,
      studentClass: student.presentClass,
      section: student.presentSection || "A",
      rollNo: String(student.presentRoll || "01"),
      guardianName: student.guardianName || student.fatherName || "",
      contactNumber: student.studentContact || student.altMobile || "",
      penNumber: student.pen || "",
    }));
    showToast({
      type: "success",
      title: "Student Loaded",
      description: `Loaded ${student.name} (${student.presentClass}-${student.presentSection || "A"})`,
    });
  }

  // Filter students based on search (Single Mode)
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase().trim();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.schoolId && s.schoolId.toLowerCase().includes(q)) ||
          (s.pen && s.pen.toLowerCase().includes(q)) ||
          (s.presentClass && s.presentClass.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [studentSearch, students]);

  // Bulk Mode: Filter class roster & sort by Roll No ascending
  const classRoster = useMemo(() => {
    const normClass = bulkClass.toUpperCase().trim();
    const normSec = bulkSection.toUpperCase().trim();

    return students
      .filter((s) => {
        const cMatch = String(s.presentClass || "").toUpperCase().trim() === normClass;
        if (!cMatch) return false;
        if (normSec !== "ALL") {
          return String(s.presentSection || "A").toUpperCase().trim() === normSec;
        }
        return true;
      })
      .sort((a, b) => {
        const rollA = parseInt(String(a.presentRoll || "9999"), 10) || 9999;
        const rollB = parseInt(String(b.presentRoll || "9999"), 10) || 9999;
        return rollA - rollB;
      });
  }, [students, bulkClass, bulkSection]);

  // Automatically select all students when class or section changes
  useEffect(() => {
    if (classRoster.length > 0) {
      setSelectedStudentIds(classRoster.map((s) => s.id));
      setCurrentPreviewIndex(0);
    } else {
      setSelectedStudentIds([]);
      setCurrentPreviewIndex(0);
    }
  }, [classRoster]);

  // Filter roster by local search in bulk mode
  const displayedRoster = useMemo(() => {
    if (!bulkRosterSearch.trim()) return classRoster;
    const q = bulkRosterSearch.toLowerCase().trim();
    return classRoster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.presentRoll || "").includes(q) ||
        (s.schoolId && s.schoolId.toLowerCase().includes(q))
    );
  }, [classRoster, bulkRosterSearch]);

  // Bulk Invoices Array
  const bulkInvoices = useMemo<InvoiceData[]>(() => {
    const selected = classRoster.filter((s) => selectedStudentIds.includes(s.id));
    const { dateStr, timeStr } = getLiveFormattedDateTime();

    return selected.map((s, idx) => {
      const serial = String(bulkStartingNo + idx).padStart(4, "0");
      const invoiceNumber = `${bulkReceiptPrefix}${serial}`;

      return {
        invoiceNumber,
        issueDate: invoice.issueDate || dateStr,
        issueTime: invoice.issueTime || timeStr,
        academicSession: bulkSession,
        studentName: s.name,
        studentClass: s.presentClass || bulkClass,
        section: s.presentSection || "A",
        rollNo: String(s.presentRoll || idx + 1),
        studentId: s.schoolId || s.id,
        penNumber: s.pen || "",
        guardianName: s.guardianName || s.fatherName || "",
        contactNumber: s.studentContact || s.altMobile || "",
        feeItems: invoice.feeItems,
        paymentMode: bulkPaymentMode,
        paymentStatus: bulkPaymentStatus,
        remarks: "Annual admission fee collected with thanks.",
      };
    });
  }, [
    classRoster,
    selectedStudentIds,
    bulkStartingNo,
    bulkReceiptPrefix,
    invoice.issueDate,
    invoice.issueTime,
    invoice.feeItems,
    bulkSession,
    bulkClass,
    bulkPaymentMode,
    bulkPaymentStatus,
  ]);

  // Active preview invoice for bulk mode
  const activeBulkPreviewInvoice = useMemo(() => {
    if (bulkInvoices.length === 0) return invoice;
    const safeIdx = Math.min(currentPreviewIndex, bulkInvoices.length - 1);
    return bulkInvoices[safeIdx] || invoice;
  }, [bulkInvoices, currentPreviewIndex, invoice]);

  // Fee Item Management (CRUD)
  function handleFeeNameChange(idx: number, newName: string) {
    setInvoice((prev) => {
      const nextItems = [...prev.feeItems];
      nextItems[idx] = { ...nextItems[idx], name: newName };
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleFeeAmountChange(idx: number, newAmount: number) {
    setInvoice((prev) => {
      const nextItems = [...prev.feeItems];
      nextItems[idx] = { ...nextItems[idx], amount: isNaN(newAmount) ? 0 : newAmount };
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleAddFeeItem() {
    const newItem: FeeItem = {
      id: `fee-${Date.now()}`,
      name: "New Fee Head",
      amount: 50,
    };
    setInvoice((prev) => ({
      ...prev,
      feeItems: [...prev.feeItems, newItem],
    }));
  }

  function handleRemoveFeeItem(idx: number) {
    setInvoice((prev) => {
      const nextItems = prev.feeItems.filter((_, i) => i !== idx);
      return { ...prev, feeItems: nextItems };
    });
  }

  function handleSaveAsDefaultFeeStructure() {
    saveFeeStructure(invoice.feeItems);
    showToast({
      type: "success",
      title: "Saved as Default",
      description: "Current fee breakdown saved as the school's global default.",
    });
  }

  function handleResetDefaultFees() {
    saveFeeStructure(DEFAULT_FEE_ITEMS);
    setInvoice((prev) => ({
      ...prev,
      feeItems: DEFAULT_FEE_ITEMS,
    }));
    showToast({
      type: "info",
      title: "Defaults Restored",
      description: "Fee structure reset to official school standards (8 heads, ₹600 total).",
    });
  }

  const grandTotal = calculateFeeTotal(invoice.feeItems);

  function handlePrint() {
    if (autoDateTime) {
      const { dateStr, timeStr } = getLiveFormattedDateTime();
      setInvoice((prev) => ({
        ...prev,
        issueDate: dateStr,
        issueTime: timeStr,
      }));
    }
    setTimeout(() => {
      window.print();
    }, 50);
  }

  // Toggle student selection in bulk mode
  function toggleStudentSelection(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    setSelectedStudentIds(classRoster.map((s) => s.id));
  }

  function handleDeselectAll() {
    setSelectedStudentIds([]);
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Top Action Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Admission & Fee Invoice</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono"
              >
                Generator
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Official school admission receipt generator with customizable fee heads & dual-copy print.
            </p>
          </div>
        </div>

        {/* Mode Switcher + Print Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher Segmented Control */}
          <div className="flex items-center rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            <button
              onClick={() => setGeneratorMode("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                generatorMode === "single"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5 text-teal-600" />
              <span>Single Student</span>
            </button>
            <button
              onClick={() => setGeneratorMode("bulk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                generatorMode === "bulk"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Class Batch (Bulk)</span>
              {classRoster.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary">
                  {selectedStudentIds.length}
                </span>
              )}
            </button>
          </div>

          {/* Copy Type Selector */}
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setCopyType("both")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                copyType === "both"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dual (Student + Office)
            </button>
            <button
              onClick={() => setCopyType("student")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                copyType === "student"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student Only
            </button>
            <button
              onClick={() => setCopyType("office")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                copyType === "office"
                  ? "bg-background text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Office Only
            </button>
          </div>

          {/* Fixed A5 Format Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-2xs">
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            <span>A5 Landscape Dual-Slip</span>
          </div>

          <Button
            onClick={handlePrint}
            className="gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>
              {generatorMode === "bulk"
                ? `Print Batch (${selectedStudentIds.length} Slips on A5)`
                : "Print Invoice (A5 Landscape)"}
            </span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SINGLE MODE CONTENT                                                       */}
      {/* ========================================================================= */}
      {generatorMode === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
          {/* LEFT COLUMN: Controls & Fee Editor (Hidden in Print) */}
          <div className="lg:col-span-5 space-y-4 print:hidden">
            {/* Card 1: Student Selection */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Student Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Search Existing Student */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name, ID, roll..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                  {filteredStudents.length > 0 && (
                    <div className="absolute z-20 top-9 left-0 right-0 bg-popover border rounded-lg shadow-lg divide-y text-xs overflow-hidden">
                      {filteredStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            handleSelectStudent(s);
                            setStudentSearch("");
                          }}
                          className="p-2 hover:bg-muted/60 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-foreground">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Class {s.presentClass} ({s.presentSection || "A"}) • Roll:{" "}
                              {s.presentRoll || "01"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {s.schoolId || "ID"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Student Fields */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Student Full Name
                    </Label>
                    <Input
                      value={invoice.studentName}
                      onChange={(e) => setInvoice({ ...invoice, studentName: e.target.value })}
                      className="text-xs font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Student ID / PEN
                    </Label>
                    <Input
                      value={invoice.studentId || invoice.penNumber || ""}
                      onChange={(e) => setInvoice({ ...invoice, studentId: e.target.value })}
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Class</Label>
                    <Input
                      value={invoice.studentClass}
                      onChange={(e) => setInvoice({ ...invoice, studentClass: e.target.value })}
                      className="text-xs font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Section</Label>
                    <Input
                      value={invoice.section || ""}
                      onChange={(e) => setInvoice({ ...invoice, section: e.target.value })}
                      className="text-xs font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Roll Number</Label>
                    <Input
                      value={invoice.rollNo || ""}
                      onChange={(e) => setInvoice({ ...invoice, rollNo: e.target.value })}
                      className="text-xs font-mono font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Guardian Name</Label>
                    <Input
                      value={invoice.guardianName || ""}
                      onChange={(e) => setInvoice({ ...invoice, guardianName: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Contact No</Label>
                    <Input
                      value={invoice.contactNumber || ""}
                      onChange={(e) => setInvoice({ ...invoice, contactNumber: e.target.value })}
                      className="text-xs font-mono h-8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Invoice Metadata & Payment */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span>Invoice Metadata & Payment</span>
                </CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !autoDateTime;
                    setAutoDateTime(nextState);
                    if (nextState) {
                      const { dateStr, timeStr } = getLiveFormattedDateTime();
                      setInvoice((prev) => ({ ...prev, issueDate: dateStr, issueTime: timeStr }));
                      showToast({
                        type: "success",
                        title: "Live Auto Date & Time",
                        description: "Current date and time synchronized automatically.",
                      });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    autoDateTime
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      autoDateTime ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                    }`}
                  />
                  <span>Auto Date & Time: {autoDateTime ? "ON" : "OFF"}</span>
                </button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Receipt No</Label>
                    <Input
                      value={invoice.invoiceNumber}
                      onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                      className="text-xs font-mono font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Academic Session
                    </Label>
                    <Input
                      value={invoice.academicSession}
                      onChange={(e) => setInvoice({ ...invoice, academicSession: e.target.value })}
                      className="text-xs font-medium h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Date</Label>
                      {autoDateTime && (
                        <span className="text-[9px] text-emerald-600 font-bold">Auto Live</span>
                      )}
                    </div>
                    <Input
                      value={invoice.issueDate}
                      onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })}
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Time</Label>
                      {autoDateTime && (
                        <span className="text-[9px] text-emerald-600 font-bold">Auto Live</span>
                      )}
                    </div>
                    <Input
                      value={invoice.issueTime}
                      onChange={(e) => setInvoice({ ...invoice, issueTime: e.target.value })}
                      className="text-xs font-mono h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Payment Mode
                    </Label>
                    <CustomSelect
                      value={invoice.paymentMode}
                      onChange={(val) =>
                        setInvoice({
                          ...invoice,
                          paymentMode: val as "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque",
                        })
                      }
                      options={[
                        { label: "Cash", value: "Cash" },
                        { label: "Online / UPI", value: "Online / UPI" },
                        { label: "Bank Transfer", value: "Bank Transfer" },
                        { label: "Cheque", value: "Cheque" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Status</Label>
                    <CustomSelect
                      value={invoice.paymentStatus}
                      onChange={(val) =>
                        setInvoice({
                          ...invoice,
                          paymentStatus: val as "Paid" | "Partial" | "Due",
                        })
                      }
                      options={[
                        { label: "PAID", value: "Paid" },
                        { label: "DUE", value: "Due" },
                        { label: "PARTIAL", value: "Partial" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Fee Particulars Editor */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-foreground">
                    Fee Particulars (Customizable)
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Admin can add, edit name/amount, or delete any fee head.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFeeItem}
                  className="h-7 text-xs font-semibold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item</span>
                </Button>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                <div className="divide-y max-h-72 overflow-y-auto pr-1">
                  {invoice.feeItems.map((item, idx) => (
                    <div key={item.id || idx} className="py-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <Input
                        value={item.name}
                        onChange={(e) => handleFeeNameChange(idx, e.target.value)}
                        placeholder="Fee Head Description"
                        className="text-xs h-7 flex-1 font-medium"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-xs text-muted-foreground font-semibold">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.amount}
                          onChange={(e) => handleFeeAmountChange(idx, parseFloat(e.target.value))}
                          className="text-xs font-mono font-bold h-7 text-right"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveFeeItem(idx)}
                        title="Remove"
                        className="p-1 text-muted-foreground hover:text-rose-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="pt-2 border-t flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase">Grand Total:</span>
                  <span className="text-sm font-mono text-primary font-extrabold">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Save / Reset Actions */}
                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDefaultFees}
                    className="h-7 text-[11px] font-semibold gap-1 text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore Standard</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveAsDefaultFeeStructure}
                    className="h-7 text-[11px] font-semibold gap-1 shadow-2xs"
                  >
                    <Save className="h-3 w-3" />
                    <span>Save as School Default</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Single Invoice Preview */}
          <div className="lg:col-span-7 space-y-3 print:w-full print:m-0 print:p-0">
            <div className="flex items-center justify-between px-1 print:hidden">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Live Invoice Preview (A5 Landscape Dual-Slip)
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Click &apos;Print Invoice&apos; to print both Student &amp; Office copies
              </span>
            </div>

            {/* Printable Canvas */}
            <div
              id="printable-invoice-canvas"
              className="bg-slate-100 dark:bg-slate-900 p-2 sm:p-4 rounded-2xl border shadow-inner overflow-x-auto flex justify-center print:p-0 print:border-none print:bg-transparent print:w-full print:block"
            >
              <InvoicePrintableView data={invoice} copyType={copyType} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLASS BATCH (BULK) MODE CONTENT                                           */}
      {/* ========================================================================= */}
      {generatorMode === "bulk" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Class Filter, Student Roster Selection & Fee Editor */}
          <div className="lg:col-span-5 space-y-4 print:hidden">
            {/* Card 1: Class & Section Selector with Roster Checklist */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Class Roster Selection</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {selectedStudentIds.length} / {classRoster.length} Selected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Class & Section Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Select Class</Label>
                    <CustomSelect
                      value={bulkClass}
                      onChange={(val) => setBulkClass(val)}
                      options={STANDARD_CLASSES.map((c) => ({
                        label: `Class ${c}`,
                        value: c,
                      }))}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Select Section
                    </Label>
                    <CustomSelect
                      value={bulkSection}
                      onChange={(val) => setBulkSection(val)}
                      options={STANDARD_SECTIONS.map((s) => ({
                        label: s === "ALL" ? "All Sections" : `Section ${s}`,
                        value: s,
                      }))}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Search in class roster + Select/Deselect All buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search within class..."
                      value={bulkRosterSearch}
                      onChange={(e) => setBulkRosterSearch(e.target.value)}
                      className="pl-7 text-xs h-7"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] px-2 py-1 rounded border hover:bg-muted font-semibold text-primary transition-colors cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] px-2 py-1 rounded border hover:bg-muted font-semibold text-muted-foreground transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Student Checklist Table */}
                <div className="border rounded-xl divide-y max-h-60 overflow-y-auto bg-card text-xs">
                  {displayedRoster.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      No students found in Class {bulkClass}{" "}
                      {bulkSection !== "ALL" ? `Sec ${bulkSection}` : ""}.
                    </div>
                  ) : (
                    displayedRoster.map((s) => {
                      const isChecked = selectedStudentIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStudentSelection(s.id)}
                          className={`p-2 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                            isChecked ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-foreground text-xs leading-tight">
                                {s.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Roll: <span className="font-bold text-foreground">{s.presentRoll || "—"}</span> • Sec:{" "}
                                {s.presentSection || "A"} • {s.schoolId || s.id}
                              </p>
                            </div>
                          </div>
                          {isChecked && (
                            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">
                              Included
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Batch Invoice Numbering & Payment Settings */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span>Batch Invoice Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Receipt Prefix
                    </Label>
                    <Input
                      value={bulkReceiptPrefix}
                      onChange={(e) => setBulkReceiptPrefix(e.target.value)}
                      className="text-xs font-mono font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Starting Serial No
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={bulkStartingNo}
                      onChange={(e) => setBulkStartingNo(parseInt(e.target.value, 10) || 1)}
                      className="text-xs font-mono font-bold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Academic Session
                    </Label>
                    <Input
                      value={bulkSession}
                      onChange={(e) => setBulkSession(e.target.value)}
                      className="text-xs font-medium h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Payment Mode
                    </Label>
                    <CustomSelect
                      value={bulkPaymentMode}
                      onChange={(val) =>
                        setBulkPaymentMode(
                          val as "Cash" | "Online / UPI" | "Bank Transfer" | "Cheque"
                        )
                      }
                      options={[
                        { label: "Cash", value: "Cash" },
                        { label: "Online / UPI", value: "Online / UPI" },
                        { label: "Bank Transfer", value: "Bank Transfer" },
                        { label: "Cheque", value: "Cheque" },
                      ]}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Batch Fee Particulars (Applies to all) */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-foreground">
                    Shared Fee Structure for Class {bulkClass}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Applied equally to all {selectedStudentIds.length} generated student slips.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFeeItem}
                  className="h-7 text-xs font-semibold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Head</span>
                </Button>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                <div className="divide-y max-h-56 overflow-y-auto pr-1">
                  {invoice.feeItems.map((item, idx) => (
                    <div key={item.id || idx} className="py-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>
                      <Input
                        value={item.name}
                        onChange={(e) => handleFeeNameChange(idx, e.target.value)}
                        placeholder="Fee Head Description"
                        className="text-xs h-7 flex-1 font-medium"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-xs text-muted-foreground font-semibold">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.amount}
                          onChange={(e) => handleFeeAmountChange(idx, parseFloat(e.target.value))}
                          className="text-xs font-mono font-bold h-7 text-right"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveFeeItem(idx)}
                        title="Remove"
                        className="p-1 text-muted-foreground hover:text-rose-600 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground uppercase">Per Student Total:</span>
                  <span className="text-sm font-mono text-primary font-extrabold">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Batch Preview Slider & Screen Output */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  Inspection Preview
                </span>
                {bulkInvoices.length > 0 && (
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Slip {currentPreviewIndex + 1} of {bulkInvoices.length}
                  </Badge>
                )}
              </div>

              {/* Inspector Prev/Next Navigator */}
              {bulkInvoices.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPreviewIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentPreviewIndex === 0}
                    className="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                    title="Previous Student"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-semibold px-2">
                    {activeBulkPreviewInvoice.studentName} (Roll:{" "}
                    {activeBulkPreviewInvoice.rollNo})
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPreviewIndex((prev) =>
                        Math.min(bulkInvoices.length - 1, prev + 1)
                      )
                    }
                    disabled={currentPreviewIndex >= bulkInvoices.length - 1}
                    className="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                    title="Next Student"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Single Screen Preview for inspection (Hidden in print) */}
            <div className="bg-slate-100 dark:bg-slate-900 p-2 sm:p-4 rounded-2xl border shadow-inner print:hidden">
              {bulkInvoices.length > 0 ? (
                <InvoicePrintableView
                  data={activeBulkPreviewInvoice}
                  copyType={copyType}
                />
              ) : (
                <div className="py-20 text-center text-muted-foreground text-sm">
                  Please select at least 1 student from the left roster to generate invoices.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH PRINT CANVAS (PRINT ONLY)                                           */}
      {/* Renders all selected students' invoices with page breaks                 */}
      {/* ========================================================================= */}
      {generatorMode === "bulk" && bulkInvoices.length > 0 && (
        <div id="printable-bulk-canvas" className="hidden print:block w-full">
          <InvoicePrintableBatchView
            invoices={bulkInvoices}
            copyType={copyType}
          />
        </div>
      )}

      {/* Global CSS for Print Optimization */}
      <style jsx global>{`
        @media print {
          /* Hide non-printable UI elements */
          header,
          aside,
          nav,
          .print\\:hidden,
          button {
            display: none !important;
          }

          @page {
            size: 210mm 148mm;
            margin: 0;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 148mm !important;
            max-width: 210mm !important;
            max-height: 148mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Single mode canvas layout */
          #printable-invoice-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: 210mm !important;
            max-width: 210mm !important;
            height: 146mm !important;
            max-height: 146mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          #pure-a5-invoice-sheet {
            width: 210mm !important;
            height: 146mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 146mm !important;
            max-height: 146mm !important;
            margin: 0 auto !important;
            padding: 1.5mm !important;
            box-sizing: border-box !important;
            border: 1px solid #475569 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Bulk batch print canvas */
          #printable-bulk-canvas {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Bulk batch print page break styles */
          .print\\:break-after-page {
            break-after: page !important;
            page-break-after: always !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function AdmissionInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Invoice Generator...</div>}>
      <InvoiceGeneratorContent />
    </Suspense>
  );
}
