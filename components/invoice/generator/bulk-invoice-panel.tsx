"use client";

import { FEE_SECTIONS } from "@/lib/utils/fee-config";
import { InvoicePrintableView, InvoicePrintableA4Sheet } from "@/components/invoice/invoice-printable-view";
import { PrintPreview } from "@/components/print/print-preview";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, RotateCcw, Save, FileText, User, Users, Eye, CheckSquare, Square, ChevronLeft, ChevronRight, Receipt, Lock, Unlock, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";

import type { InvoiceGeneratorState } from "./use-invoice-generator";

export function BulkInvoicePanel({ gen }: { gen: InvoiceGeneratorState }) {
  const { academicSessionOptions, activeA4Chunk, activeBulkPreviewInvoice, activeFeeCategory, bulkAssignedTeacher, bulkBlankCount, bulkClass, bulkFillMode, bulkInvoices, bulkPaymentMode, bulkReceiptPrefix, bulkRosterSearch, bulkSection, bulkSession, bulkStartingNo, classOptions, classRoster, copyType, currentPreviewIndex, displayedRoster, grandTotal, handleAddFeeItem, handleBulkClassChange, handleCategoryTabChange, handleDeselectAll, handleFeeAmountChange, handleFeeNameChange, handleModeChange, handleRemoveFeeItem, handleResetDefaultFees, handleSaveAsDefaultFeeStructure, handleSelectAll, invoice, isA4FourUp, isBulkPrefixLocked, isBulkStartingNoLocked, safeA4PageIndex, schoolProfile, sectionOptions, selectedStudentIds, setBulkAssignedTeacher, setBulkBlankCount, setBulkFillMode, setBulkPaymentMode, setBulkReceiptPrefix, setBulkRosterSearch, setBulkSection, setBulkSession, setBulkStartingNo, setCopyType, setCurrentA4PageIndex, setCurrentPreviewIndex, setInvoice, setIsBulkPrefixLocked, setIsBulkStartingNoLocked, setIsHistoryOpen, toggleStudentSelection, totalA4Pages } = gen;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Class Filter, Student Roster Selection & Fee Editor */}
      <div className="xl:col-span-5 space-y-4 print:hidden">
        {/* Mode Switcher Segmented Control */}
        <div className="flex items-center w-full rounded-2xl border border-border/80 bg-muted/40 p-1.5 text-xs font-semibold shadow-xs">
          <button
            type="button"
            onClick={() => handleModeChange("single")}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4 text-teal-600" />
            <span>Single Student</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("bulk")}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all cursor-pointer font-bold bg-background text-foreground shadow-xs"
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

        {/* Card 1: Class & Section Selector with Roster Checklist */}
        <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>Class Roster Selection</span>
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {bulkFillMode === "blank"
                  ? `${bulkBlankCount} Blank Slips`
                  : `${selectedStudentIds.length} / ${classRoster.length} Selected`}
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
                  onChange={handleBulkClassChange}
                  options={classOptions}
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
                  options={sectionOptions}
                  searchable={false}
                  triggerClassName="h-8 text-xs font-bold"
                />
              </div>
            </div>

            {bulkFillMode === "blank" ? (
              <div className="p-4 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/5 text-center space-y-2">
                <FileText className="h-7 w-7 mx-auto text-teal-600 dark:text-teal-400 opacity-80" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">
                    Blank Slips Mode Active
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Generating {bulkBlankCount} blank printable slips for Class {bulkClass}{" "}
                    {bulkSection !== "ALL" ? `(${bulkSection})` : ""}. Student name, ID, roll, and guardian lines are empty for manual entry.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkFillMode("fill")}
                  className="h-7 text-[11px] font-semibold gap-1.5 cursor-pointer mt-1"
                >
                  <UserCheck className="h-3 w-3 text-teal-600" />
                  <span>Switch to Pre-Filled Roster</span>
                </Button>
              </div>
            ) : (
              <>
                {/* Search in class roster + Select/Deselect All buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <SearchInput value={bulkRosterSearch} onChange={setBulkRosterSearch} placeholder="Search within class..." size="sm" className="flex-1" />
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Batch Invoice Numbering & Payment Settings */}
        <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span>Batch Invoice Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5">
            {/* Invoice Data Fill Mode (Pre-Filled vs Blank) */}
            <div className="space-y-1.5 pb-2.5 border-b border-border/70">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Invoice Data Fill Mode
                </Label>
                <span className="text-[9.5px] font-semibold text-teal-600 dark:text-teal-400">
                  {bulkFillMode === "fill" ? "Class Roster (Full Data)" : "Blank Slips (Manual Entry)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-1 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={() => setBulkFillMode("fill")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    bulkFillMode === "fill"
                      ? "bg-background text-foreground shadow-2xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <UserCheck className="h-3.5 w-3.5 text-teal-600" />
                  <span>Pre-Filled</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkFillMode("blank")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    bulkFillMode === "blank"
                      ? "bg-background text-foreground shadow-2xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span>Blank Template</span>
                </button>
              </div>

              {bulkFillMode === "blank" && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
                    <div>
                      <p className="text-xs font-bold text-teal-800 dark:text-teal-300">
                        Number of Blank Slips
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Name, Guardian, ID &amp; Roll will be blank lines
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="1"
                        max="500"
                        value={bulkBlankCount}
                        onChange={(e) =>
                          setBulkBlankCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className="w-18 h-7 text-xs font-mono font-bold text-center bg-background"
                      />
                      <span className="text-[11px] font-semibold text-muted-foreground">slips</span>
                    </div>
                  </div>

                  {/* Teacher Assignment — MANDATORY for blank slips */}
                  <div className="p-3 rounded-xl border border-amber-400/30 bg-amber-500/5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <Label className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        Assign to Teacher
                        <span className="text-rose-500 ml-0.5">*</span>
                      </Label>
                    </div>
                    <Input
                      id="blank-assigned-teacher"
                      value={bulkAssignedTeacher}
                      onChange={(e) => setBulkAssignedTeacher(e.target.value)}
                      placeholder="Enter teacher's full name..."
                      className={cn(
                        "h-8 text-xs font-semibold",
                        !bulkAssignedTeacher.trim()
                          ? "border-amber-400/50 focus:border-amber-500 focus:ring-amber-500/30"
                          : "border-emerald-400/50 bg-emerald-500/5"
                      )}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Slips will be tracked under this teacher&apos;s name in Track &amp; Verify.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Receipt Prefix */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Receipt Prefix
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsBulkPrefixLocked(!isBulkPrefixLocked)}
                    className="text-[9.5px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                    title={isBulkPrefixLocked ? "Click to unlock and edit" : "Click to lock"}
                  >
                    {isBulkPrefixLocked ? (
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
                <div className="relative flex items-center">
                  <Input
                    value={bulkReceiptPrefix}
                    disabled={isBulkPrefixLocked}
                    readOnly={isBulkPrefixLocked}
                    onChange={(e) => setBulkReceiptPrefix(e.target.value)}
                    className={cn(
                      "text-xs font-mono font-bold h-8 pr-8",
                      isBulkPrefixLocked
                        ? "bg-muted/60 text-foreground cursor-not-allowed select-none border-dashed"
                        : "bg-background focus:ring-1 focus:ring-primary"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setIsBulkPrefixLocked(!isBulkPrefixLocked)}
                    title={isBulkPrefixLocked ? "Click to unlock" : "Click to lock"}
                    className="absolute right-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isBulkPrefixLocked ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Starting Serial No */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Starting Serial No
                  </Label>
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
                      onClick={() => setIsBulkStartingNoLocked(!isBulkStartingNoLocked)}
                      className="text-[9.5px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                      title={isBulkStartingNoLocked ? "Click to unlock and edit" : "Click to lock"}
                    >
                      {isBulkStartingNoLocked ? (
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
                    type="number"
                    min="1"
                    value={bulkStartingNo}
                    disabled={isBulkStartingNoLocked}
                    readOnly={isBulkStartingNoLocked}
                    onChange={(e) => setBulkStartingNo(parseInt(e.target.value, 10) || 1)}
                    className={cn(
                      "text-xs font-mono font-bold h-8 pr-8",
                      isBulkStartingNoLocked
                        ? "bg-muted/60 text-foreground cursor-not-allowed select-none border-dashed"
                        : "bg-background focus:ring-1 focus:ring-primary"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setIsBulkStartingNoLocked(!isBulkStartingNoLocked)}
                    title={isBulkStartingNoLocked ? "Click to unlock" : "Click to lock"}
                    className="absolute right-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {isBulkStartingNoLocked ? (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Academic Session
                </Label>
                <CustomSelect
                  value={bulkSession}
                  onChange={(val) => setBulkSession(String(val))}
                  options={academicSessionOptions}
                  searchable={false}
                  triggerClassName="h-8 text-xs font-semibold bg-background"
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

              {/* Digital Head Signature Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60 col-span-1 sm:col-span-2">
                <Label htmlFor="toggle-invoice-bulk-sign" className="text-xs font-semibold cursor-pointer">
                  Digital Signature
                </Label>
                <Switch
                  id="toggle-invoice-bulk-sign"
                  checked={invoice.includeDigitalSignature ?? true}
                  onCheckedChange={(checked) => setInvoice((prev) => ({ ...prev, includeDigitalSignature: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Batch Fee Particulars (Applies to all) with 3 Section Presets */}
        <Card className="border border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/20 space-y-3">
            <div className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-foreground">
                  Shared Fee Structure for Class {bulkClass}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Applied equally to all{" "}
                  {bulkFillMode === "blank"
                    ? `${bulkBlankCount} blank`
                    : `${selectedStudentIds.length}`}{" "}
                  generated student slips.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddFeeItem}
                className="h-7 text-xs font-semibold gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Head</span>
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

            {/* Save / Reset Actions */}
            <div className="pt-2 border-t flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaultFees}
                className="h-7 text-[11px] font-semibold gap-1 text-muted-foreground cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore Standard</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveAsDefaultFeeStructure}
                className="h-7 text-[11px] font-semibold gap-1 shadow-2xs cursor-pointer"
              >
                <Save className="h-3 w-3" />
                <span>Save as Default</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Batch Preview Slider & Screen Output */}
      <div className="xl:col-span-7 space-y-3">
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

          {/* Inspector Prev/Next Navigator in Bulk Mode */}
          {bulkInvoices.length > 0 && (
            isA4FourUp ? (
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentA4PageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={safeA4PageIndex === 0}
                  className="h-7 w-7 rounded-lg cursor-pointer"
                  title="Previous A4 Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-bold px-2 font-mono">
                  A4 Page {safeA4PageIndex + 1} / {totalA4Pages}:{" "}
                  <span className="text-primary font-sans font-semibold">
                    Slips {safeA4PageIndex * 4 + 1}–{Math.min(bulkInvoices.length, safeA4PageIndex * 4 + 4)} of {bulkInvoices.length}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentA4PageIndex((prev) =>
                      Math.min(totalA4Pages - 1, prev + 1)
                    )
                  }
                  disabled={safeA4PageIndex >= totalA4Pages - 1}
                  className="h-7 w-7 rounded-lg cursor-pointer"
                  title="Next A4 Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPreviewIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentPreviewIndex === 0}
                  className="h-7 w-7 rounded-lg cursor-pointer"
                  title="Previous Student"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-bold px-2 font-mono">
                  {currentPreviewIndex + 1} / {bulkInvoices.length}:{" "}
                  <span className="text-primary font-sans">
                    {activeBulkPreviewInvoice.studentName ||
                      `Blank Slip #${activeBulkPreviewInvoice.invoiceNumber}`}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentPreviewIndex((prev) =>
                      Math.min(bulkInvoices.length - 1, prev + 1)
                    )
                  }
                  disabled={currentPreviewIndex >= bulkInvoices.length - 1}
                  className="h-7 w-7 rounded-lg cursor-pointer"
                  title="Next Student"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          )}
        </div>

        {/* Scaled Preview Viewport */}
        {bulkInvoices.length > 0 ? (
          <PrintPreview
            fitMode="contain"
            resetKey={`bulk-${isA4FourUp}`}
            className="h-[460px] sm:h-[580px] w-full print:hidden"
          >
            <div
              style={{
                width: "210mm",
                height: isA4FourUp ? "295mm" : "146mm",
              }}
              className="shrink-0"
            >
              {isA4FourUp ? (
                <div
                  id="pure-a4-invoice-sheet"
                  className="relative bg-white text-slate-900 border border-slate-400 font-sans box-border select-none mx-auto overflow-hidden w-[210mm] h-[295mm] min-w-[210mm] max-w-[210mm] min-h-[295mm] max-h-[295mm] p-[3mm] shadow-md flex items-center justify-center"
                >
                  <InvoicePrintableA4Sheet
                    invoices={activeA4Chunk}
                    copyLabel={copyType === "school" ? "SCHOOL COPY" : "STUDENT COPY"}
                    schoolProfile={schoolProfile}
                  />
                </div>
              ) : (
                <InvoicePrintableView
                  data={activeBulkPreviewInvoice}
                  copyType={copyType}
                  schoolProfile={schoolProfile}
                />
              )}
            </div>
          </PrintPreview>
        ) : (
          <div className="py-24 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2 border border-border/80 rounded-2xl bg-muted/40 min-h-[460px]">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">Please select at least 1 student from the left roster to preview invoice.</p>
          </div>
        )}
      </div>
    </div>
  );
}
