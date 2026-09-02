"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents, getStudentById } from "@/lib/data/students";
import type { Student } from "@/lib/types";
import {
  type FeeItem,
  type InvoiceData,
  DEFAULT_FEE_ITEMS,
  getSavedFeeStructure,
  saveFeeStructure,
  calculateFeeTotal,
  numberToWordsINR,
  generateInvoiceNumber,
} from "@/lib/utils/fee-config";
import { InvoicePrintableView } from "@/components/invoice/invoice-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast-banner";
import {
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowLeft,
  User,
  Sliders,
  DollarSign,
  Layers,
  Eye,
} from "lucide-react";

function InvoiceGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIdParam = searchParams.get("studentId");

  const [copyType, setCopyType] = useState<"both" | "student" | "office">("both");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Invoice State
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const timeStr = today.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const currentYear = today.getFullYear();

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

  // Fetch all students for selector
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

  // Handle choosing a student
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

  // Filter students based on search
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
  const wordsAmount = numberToWordsINR(grandTotal);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-6">
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
              <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono">
                Generator
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Official school admission receipt generator with customizable fee heads & dual-copy print.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setCopyType("both")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                copyType === "both" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Dual (Student + Office)
            </button>
            <button
              onClick={() => setCopyType("student")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                copyType === "student" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student Only
            </button>
            <button
              onClick={() => setCopyType("office")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                copyType === "office" ? "bg-background text-foreground shadow-2xs font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Office Only
            </button>
          </div>

          <Button
            onClick={handlePrint}
            className="gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Controls + Right Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                            Class {s.presentClass} ({s.presentSection || "A"}) • Roll: {s.presentRoll || "01"}
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
                  <Label className="text-[11px] font-semibold text-muted-foreground">Student Full Name</Label>
                  <Input
                    value={invoice.studentName}
                    onChange={(e) => setInvoice({ ...invoice, studentName: e.target.value })}
                    className="text-xs font-bold h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Student ID / PEN</Label>
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
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>Invoice Metadata & Payment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Receipt No</Label>
                <Input
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                  className="text-xs font-mono font-bold h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Academic Session</Label>
                <Input
                  value={invoice.academicSession}
                  onChange={(e) => setInvoice({ ...invoice, academicSession: e.target.value })}
                  className="text-xs font-mono h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={invoice.issueDate}
                  onChange={(e) => setInvoice({ ...invoice, issueDate: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Time</Label>
                <Input
                  value={invoice.issueTime}
                  onChange={(e) => setInvoice({ ...invoice, issueTime: e.target.value })}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Payment Mode</Label>
                <select
                  value={invoice.paymentMode}
                  onChange={(e) => setInvoice({ ...invoice, paymentMode: e.target.value as any })}
                  className="w-full text-xs font-semibold h-8 rounded-lg border bg-background px-2"
                >
                  <option value="Cash">Cash</option>
                  <option value="Online / UPI">Online / UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Status</Label>
                <select
                  value={invoice.paymentStatus}
                  onChange={(e) => setInvoice({ ...invoice, paymentStatus: e.target.value as any })}
                  className="w-full text-xs font-bold h-8 rounded-lg border bg-background px-2 text-emerald-600"
                >
                  <option value="Paid">PAID</option>
                  <option value="Partial">PARTIAL</option>
                  <option value="Due">DUE</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Customizable Fee Heads (Admin CRUD) */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                  <span>Fee Particulars (Customizable)</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  Admin can add, edit name/amount, or delete any fee head.
                </CardDescription>
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
                <span className="text-sm font-mono text-primary font-extrabold">₹{grandTotal.toFixed(2)}</span>
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

        {/* RIGHT COLUMN: Live Invoice Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1 print:hidden">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-primary" />
              Live Invoice Preview (Print Ready)
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Click &apos;Print Invoice&apos; to print or save PDF
            </span>
          </div>

          {/* Printable Canvas */}
          <div id="printable-invoice-canvas" className="bg-slate-100 dark:bg-slate-900 p-2 sm:p-4 rounded-2xl border shadow-inner">
            <InvoicePrintableView data={invoice} copyType={copyType} />
          </div>
        </div>
      </div>

      {/* Global CSS for Print Mode */}
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

          /* Ensure page margins and background colors print cleanly */
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #printable-invoice-canvas {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
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
