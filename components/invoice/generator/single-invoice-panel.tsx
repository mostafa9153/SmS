"use client";

import { FEE_SECTIONS } from "@/lib/utils/fee-config";
import { InvoicePrintableView } from "@/components/invoice/invoice-printable-view";
import { PrintPreview } from "@/components/print/print-preview";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, RotateCcw, Save, Search, User, Users, Sliders, Eye, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

import type { InvoiceGeneratorState } from "./use-invoice-generator";

export function SingleInvoicePanel({ gen }: { gen: InvoiceGeneratorState }) {
  const { academicSessionOptions, activeFeeCategory, classOptions, classRoster, copyType, filteredStudents, grandTotal, handleAddFeeItem, handleCategoryTabChange, handleFeeAmountChange, handleFeeNameChange, handleModeChange, handleRemoveFeeItem, handleResetDefaultFees, handleSaveAsDefaultFeeStructure, handleSelectStudent, invoice, isLoadingFullStudent, isSearchLoading, isSingleReceiptLocked, schoolProfile, selectedStudentIds, setCopyType, setInvoice, setIsHistoryOpen, setIsSingleReceiptLocked, setSingleClass, setSingleSection, setStudentSearch, singleClass, singleSection, singleSectionOptions, studentSearch, updateInvoiceClass } = gen;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
      {/* LEFT COLUMN: Controls & Fee Editor (Hidden in Print) */}
      <div className="xl:col-span-5 space-y-4 print:hidden">
        {/* Mode Switcher Segmented Control */}
        <div className="flex items-center w-full rounded-2xl border border-border/80 bg-muted/40 p-1.5 text-xs font-semibold shadow-xs">
          <button
            type="button"
            onClick={() => handleModeChange("single")}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold bg-background text-foreground shadow-xs"
          >
            <User className="h-4 w-4 text-teal-600" />
            <span>Single Student</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("bulk")}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold text-muted-foreground hover:text-foreground"
          >
            <Users className="h-4 w-4 text-primary" />
            <span>Class Batch (Bulk)</span>
            {classRoster.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                {selectedStudentIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Card 1: Student Selection */}
        <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Student Information</span>
            </CardTitle>
            {isLoadingFullStudent && (
              <Badge variant="outline" className="text-[10px] animate-pulse text-amber-600 bg-amber-50 border-amber-300">
                Loading Details...
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* 1. Class & Section Selectors (Required prior to searching) */}
            <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Select Class *
                </Label>
                <CustomSelect
                  value={singleClass}
                  onChange={(val) => {
                    setSingleClass(val);
                    updateInvoiceClass(val);
                  }}
                  options={classOptions}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  Select Section *
                </Label>
                <CustomSelect
                  value={singleSection}
                  onChange={(val) => {
                    setSingleSection(val);
                    setInvoice((prev) => ({
                      ...prev,
                      section: val === "ALL" ? "A" : val,
                    }));
                  }}
                  options={singleSectionOptions}
                />
              </div>
            </div>

            {/* 2. Search Existing Student in Selected Class & Section */}
            <div className="relative space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Search Student</span>
                <span className="text-[10px] text-muted-foreground">
                  Class {singleClass} ({singleSection === "ALL" ? "All Sections" : `Section ${singleSection}`})
                </span>
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by Name, School ID, PEN, or Roll..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
                {isSearchLoading && (
                  <div className="absolute right-2.5 top-2 text-[10px] text-muted-foreground animate-pulse">
                    Searching...
                  </div>
                )}
                {filteredStudents.length > 0 && (
                  <div className="absolute z-20 top-9 left-0 right-0 bg-popover border rounded-lg shadow-lg divide-y text-xs overflow-hidden max-h-60 overflow-y-auto">
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
                            {s.pen ? ` • PEN: ${s.pen}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {s.schoolId || s.pen || "ID"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  onChange={(e) => updateInvoiceClass(e.target.value)}
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
        <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              <span>Invoice Metadata & Payment</span>
            </CardTitle>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-Locked & Live</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Receipt No - Locked by default with toggleable unlock */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Receipt No</Label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(true)}
                      className="text-[9.5px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      title="View print batch history & undo"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> History &amp; Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSingleReceiptLocked(!isSingleReceiptLocked)}
                      className="text-[9.5px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                      title={isSingleReceiptLocked ? "Click to unlock and edit" : "Click to lock"}
                    >
                      {isSingleReceiptLocked ? (
                        <>
                          <Lock className="h-2.5 w-2.5" /> Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" /> Unlocked
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <Input
                    value={invoice.invoiceNumber}
                    disabled={isSingleReceiptLocked}
                    readOnly={isSingleReceiptLocked}
                    onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                    className={cn(
                      "text-xs font-mono font-bold h-8 pr-8",
                      isSingleReceiptLocked
                        ? "bg-muted/60 text-foreground cursor-not-allowed select-none border-dashed"
                        : "bg-background focus:ring-1 focus:ring-primary"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setIsSingleReceiptLocked(!isSingleReceiptLocked)}
                    title={isSingleReceiptLocked ? "Click to unlock" : "Click to lock"}
                    className="absolute right-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isSingleReceiptLocked ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Academic Session */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Academic Session</Label>
                <CustomSelect
                  value={invoice.academicSession}
                  onChange={(val) => setInvoice({ ...invoice, academicSession: String(val) })}
                  options={academicSessionOptions}
                  searchable={false}
                  triggerClassName="h-8 text-xs font-semibold bg-background"
                />
              </div>

              {/* Date - Locked & Auto Live */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Date</Label>
                  <span className="text-[9.5px] text-emerald-600 font-bold flex items-center gap-0.5">
                    Auto Live
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Input
                    value={invoice.issueDate}
                    disabled
                    readOnly
                    className="text-xs font-mono font-bold h-8 bg-muted/60 text-foreground cursor-not-allowed select-none pr-8 border-dashed"
                  />
                  <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                </div>
              </div>

              {/* Time - Locked & Auto Live */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Time</Label>
                  <span className="text-[9.5px] text-emerald-600 font-bold flex items-center gap-0.5">
                    Auto Live
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Input
                    value={invoice.issueTime}
                    disabled
                    readOnly
                    className="text-xs font-mono font-bold h-8 bg-muted/60 text-foreground cursor-not-allowed select-none pr-8 border-dashed"
                  />
                  <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                </div>
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

              {/* Digital Head Signature Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60 col-span-1 sm:col-span-2">
                <Label htmlFor="toggle-invoice-single-sign" className="text-xs font-semibold cursor-pointer">
                  Digital Signature
                </Label>
                <Switch
                  id="toggle-invoice-single-sign"
                  checked={invoice.includeDigitalSignature ?? true}
                  onCheckedChange={(checked) => setInvoice((prev) => ({ ...prev, includeDigitalSignature: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Fee Particulars Editor with 3 Section Presets */}
        <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20 space-y-3">
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-foreground">
                  Fee Particulars (3 Section Presets)
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Select a section preset to configure its default admission fee breakdown.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddFeeItem}
                className="h-7 text-xs font-semibold gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </Button>
            </div>

            {/* 3 Section Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/60 border border-border/60 text-xs">
              {FEE_SECTIONS.map((sec) => {
                const isSelected = activeFeeCategory === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleCategoryTabChange(sec.id)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                      isSelected
                        ? "bg-background text-foreground shadow-xs border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <span className="text-[11px] truncate">{sec.shortLabel}</span>
                    <span className="text-[9.5px] font-normal opacity-75 font-mono">
                      Classes {sec.classRange}
                    </span>
                  </button>
                );
              })}
            </div>
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
      <div className="xl:col-span-7 space-y-3 print:w-full print:m-0 print:p-0">
        {/* Preview Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-2xl shadow-xs print:hidden">
          {/* Copy Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Preview</span>
            </span>
            <div className="flex items-center rounded-xl border bg-muted/50 p-1 text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setCopyType("both")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold",
                  copyType === "both"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Dual (Both)
              </button>
              <button
                type="button"
                onClick={() => setCopyType("student")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  copyType === "student"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setCopyType("school")}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                  copyType === "school"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                School
              </button>
            </div>
          </div>
        </div>

        {/* Printable Canvas Viewport */}
        <PrintPreview
          fitMode="contain"
          resetKey="single-invoice"
          className="h-[460px] sm:h-[580px] w-full print:hidden"
        >
          <div style={{ width: "210mm", height: "146mm" }} className="shrink-0">
            <InvoicePrintableView data={invoice} copyType={copyType} schoolProfile={schoolProfile} />
          </div>
        </PrintPreview>
        {/* Print-only output */}
        <div id="printable-invoice-canvas" className="hidden print:block" style={{ width: "210mm", height: "146mm" }}>
          <InvoicePrintableView data={invoice} copyType={copyType} schoolProfile={schoolProfile} />
        </div>
      </div>
    </div>
  );
}
