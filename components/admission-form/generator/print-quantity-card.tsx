"use client";

import { formatFormNumber } from "@/components/admission-form/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Sparkles, FileText, RefreshCw, CheckCircle2, Hash, ListOrdered, Package, Lock, Users, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

import type { AdmissionGeneratorState } from "./use-admission-form-generator";

export function PrintQuantityCard({ gen }: { gen: AdmissionGeneratorState }) {
  const { availableClasses, availableSections, bulkClass, bulkCount, bulkSection, bulkSerialList, classRoster, filteredStudents, formMode, generationMode, handleResetBlank, handleResetSerialToOne, handleSelectStudent, isSearchFocused, selectedStudent, serialPrefix, setBulkClass, setBulkCount, setBulkSection, setFormMode, setGenerationMode, setIsHistoryOpen, setIsSearchFocused, setPreviewBulkIndex, setStudentSearch, startSerial, studentSearch } = gen;
  return (
    <Card className="shadow-xs border-border/80 rounded-2xl">
      <CardHeader className="p-4 pb-3 border-b bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-violet-600" />
          Print Quantity & Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Mode Selector (Blank vs Pre-filled) */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Form Content Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormMode("blank")}
              className={cn(
                "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                formMode === "blank"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "border-border/70 hover:bg-muted text-muted-foreground"
              )}
            >
              <FileText className="h-4 w-4" />
              <span>Blank Forms</span>
            </button>
            <button
              type="button"
              onClick={() => setFormMode("prefilled")}
              className={cn(
                "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                formMode === "prefilled"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "border-border/70 hover:bg-muted text-muted-foreground"
              )}
            >
              <Sparkles className="h-4 w-4" />
              <span>Pre-filled / Auto-fill</span>
            </button>
          </div>
        </div>

        {/* Quantity Toggle: Single vs Bulk */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setGenerationMode("bulk")}
            className={cn(
              "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
              generationMode === "bulk"
                ? "bg-primary/15 text-primary border-primary shadow-xs"
                : "border-border/70 hover:bg-muted text-muted-foreground"
            )}
          >
            <ListOrdered className="h-4 w-4" />
            <span>
              {formMode === "prefilled"
                ? `Bulk Class (${classRoster.length} Students)`
                : `Bulk Print (${bulkCount} Forms)`}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setGenerationMode("single")}
            className={cn(
              "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
              generationMode === "single"
                ? "bg-primary/15 text-primary border-primary shadow-xs"
                : "border-border/70 hover:bg-muted text-muted-foreground"
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Single Form</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* PRE-FILLED SINGLE STUDENT SEARCH                               */}
        {/* ============================================================== */}
        {formMode === "prefilled" && generationMode === "single" && (
          <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                <Search className="h-3.5 w-3.5" />
                <span>Search & Select Student</span>
              </Label>
              {selectedStudent && (
                <button
                  type="button"
                  onClick={handleResetBlank}
                  className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Selected Student Highlight Card */}
            {selectedStudent ? (
              <div className="p-3 rounded-xl bg-background border-2 border-primary shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                    {selectedStudent.name}
                  </span>
                  <Badge className="text-[10px] bg-primary text-primary-foreground font-mono">
                    Roll: {selectedStudent.presentRoll || "N/A"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Class: <strong className="text-foreground">{selectedStudent.presentClass || "N/A"}</strong>
                  {" · "}
                  Sec: <strong className="text-foreground">{selectedStudent.presentSection || "A"}</strong>
                  {" · "}
                  ID: <strong className="text-foreground font-mono">{selectedStudent.schoolId || selectedStudent.id}</strong>
                </p>
                {selectedStudent.fatherName && (
                  <p className="text-[10.5px] text-muted-foreground truncate">
                    Guardian: {selectedStudent.fatherName}
                  </p>
                )}
              </div>
            ) : null}

            {/* Search Input Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={studentSearch}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder="Type name, ID, roll no or contact..."
                className="pl-8 pr-8 h-9 text-xs font-medium"
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => setStudentSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Search Dropdown Results */}
            {isSearchFocused && (
              <div className="border rounded-xl bg-popover shadow-xl overflow-hidden divide-y divide-border/60 max-h-56 overflow-y-auto z-20">
                <div className="px-3 py-1.5 bg-muted/50 text-[10.5px] font-bold text-muted-foreground flex justify-between items-center">
                  <span>Matching Students ({filteredStudents.length})</span>
                  <button
                    type="button"
                    onClick={() => setIsSearchFocused(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>

                {filteredStudents.length > 0 ? (
                  filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectStudent(s)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Class: <strong className="text-foreground">{s.presentClass || "N/A"}</strong>
                          {" · "}
                          Roll: <strong className="text-foreground">{s.presentRoll || "N/A"}</strong>
                          {" · "}
                          ID: <span className="font-mono">{s.schoolId || s.id}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9.5px] font-bold shrink-0">
                        Select
                      </Badge>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No students found matching &quot;{studentSearch}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PRE-FILLED BULK CLASS & SECTION SELECTOR                       */}
        {/* ============================================================== */}
        {formMode === "prefilled" && generationMode === "bulk" && (
          <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                <Users className="h-3.5 w-3.5" />
                <span>Bulk Auto-fill by Class</span>
              </Label>
              <Badge className="text-[10px] bg-primary text-primary-foreground font-bold">
                {classRoster.length} Students
              </Badge>
            </div>

            {/* Class Selector (Ordered curriculum V -> X / XI -> XII) */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold flex items-center justify-between">
                <span>Select Class</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Class {bulkClass}
                </span>
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                {availableClasses.map((cls: any) => {
                  const code = typeof cls === "string" ? cls : cls.code;
                  const name = typeof cls === "string" ? `Class ${cls}` : cls.name || `Class ${cls.code}`;
                  const isSelected = bulkClass.toUpperCase() === code.toUpperCase();
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setBulkClass(code);
                        setPreviewBulkIndex(0);
                      }}
                      className={cn(
                        "py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Selector (Only shown when multiple sections exist in Class Management settings) */}
            {availableSections.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold flex items-center justify-between">
                  <span>Select Section</span>
                  <span className="text-[10px] text-muted-foreground">
                    {bulkSection === "ALL" ? "All Sections" : `Section ${bulkSection}`}
                  </span>
                </Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {availableSections.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setBulkSection(sec);
                        setPreviewBulkIndex(0);
                      }}
                      className={cn(
                        "flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer min-w-[50px]",
                        bulkSection === sec
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                      )}
                    >
                      {sec === "ALL" ? "All Sec" : `Sec ${sec}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Class Roster Summary */}
            {classRoster.length > 0 ? (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Ready to Print {classRoster.length} Students:
                </p>
                <p className="font-mono text-[10.5px] font-bold">
                  Class {bulkClass} {availableSections.length > 1 ? (bulkSection === "ALL" ? "(All Sections)" : `(Sec ${bulkSection})`) : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Serial: {bulkSerialList[0]} → {bulkSerialList[classRoster.length - 1]} ({classRoster.length * 2} pages)
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs text-center font-medium">
                No students found in Class {bulkClass} {availableSections.length > 1 && bulkSection !== "ALL" ? `(Section ${bulkSection})` : ""}.
              </div>
            )}
          </div>
        )}

        {/* Serial Numbering Controls */}
        <div className="p-3.5 bg-muted/30 rounded-xl border border-border/70 space-y-3">
          {/* Start Serial No. (Auto Continuous Sequence - Locked with Permanent Undo Button) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold flex items-center gap-1.5 text-foreground">
                <Hash className="h-3.5 w-3.5 text-primary" />
                <span>Current Start Serial No.</span>
              </Label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  title="View print batch history & undo"
                  className="text-[10.5px] px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/40 active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>History &amp; Undo</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSerialToOne}
                  title="Reset sequence to 0001 for this year"
                  className="text-[10px] px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <Input
                value={formatFormNumber(serialPrefix, startSerial, 4)}
                disabled
                readOnly
                className="h-9 text-xs sm:text-sm font-mono font-bold uppercase bg-muted/70 text-primary cursor-not-allowed select-none pr-8 border-dashed"
              />
              <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
            </div>
          </div>

          {/* Bulk Quantity Selectors (Only shown in blank bulk mode) */}
          {generationMode === "bulk" && formMode === "blank" && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold">Total Blank Forms to Generate</Label>
                <span className="text-xs font-bold text-primary font-mono">{bulkCount} Forms</span>
              </div>
              <Input
                type="number"
                min={1}
                max={500}
                value={bulkCount}
                onChange={(e) => setBulkCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                className="h-8 text-xs font-bold font-mono"
              />

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {[10, 25, 50, 100, 200].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setBulkCount(count)}
                    className={cn(
                      "flex-1 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer",
                      bulkCount === count
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>

              {/* Serial Range Summary Banner */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium space-y-0.5">
                <p className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Serial Range ({bulkCount} Forms):
                </p>
                <p className="font-mono text-[10.5px] font-bold truncate">
                  {bulkSerialList[0]} → {bulkSerialList[bulkSerialList.length - 1]}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {bulkCount * 2} Pages total (Page 1 Front & Page 2 Back for each form)
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
