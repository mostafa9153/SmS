"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { MarksheetPrintableView } from "@/components/marksheet/marksheet-printable-view";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintPreview } from "@/components/print/print-preview";
import { Users, CheckSquare, Square, ChevronLeft, ChevronRight, GraduationCap, Eye } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { STANDARD_CLASSES } from "@/components/generate/marksheet/constants";
import type { MarksheetGeneratorState } from "./use-marksheet-generator";

export function BulkModeSection({ mk }: { mk: MarksheetGeneratorState }) {
  const { activeBulkPreviewMarksheet, bulkAcademicYear, bulkClass, bulkClassTeacher, bulkIssueDate, bulkMarksheets, bulkRosterSearch, classRoster, currentPreviewIndex, displayedRoster, generatorMode, handleDeselectAll, handleSelectAll, includeDigitalSignature, schoolProfile, selectedStudentIds, setBulkAcademicYear, setBulkClass, setBulkClassTeacher, setBulkIssueDate, setBulkRosterSearch, setCurrentPreviewIndex, setIncludeDigitalSignature, toggleStudentSelection } = mk;
  return (
    <>
      {generatorMode === "bulk" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Class Roster & Batch Settings */}
          <div className="xl:col-span-4 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
            {/* Card 1: Class Selector with Roster Checklist */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Class Marksheet Roster</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {selectedStudentIds.length} / {classRoster.length} Selected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class</Label>
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
                    <Label className="text-[10px] font-semibold text-muted-foreground">Academic Year</Label>
                    <Input
                      value={bulkAcademicYear}
                      onChange={(e) => setBulkAcademicYear(e.target.value)}
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Search in class roster + Select/Deselect All buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <SearchInput value={bulkRosterSearch} onChange={setBulkRosterSearch} placeholder="Search roster..." size="sm" className="flex-1" />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[10px] font-semibold text-primary hover:underline px-1 cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-muted-foreground text-[10px]">&bull;</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[10px] font-semibold text-muted-foreground hover:underline px-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Student Checklist Table */}
                <div className="border rounded-xl divide-y max-h-56 overflow-y-auto bg-card text-xs">
                  {displayedRoster.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      No students found in Class {bulkClass}.
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
                              <div className="font-semibold text-foreground text-xs leading-tight">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Roll: {s.presentRoll || "–"} &bull; {s.schoolId || s.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Batch Metadata */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span>Batch Signatures &amp; Issue Date</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class Teacher</Label>
                    <Input
                      value={bulkClassTeacher}
                      onChange={(e) => setBulkClassTeacher(e.target.value)}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Issue Date</Label>
                    <Input
                      value={bulkIssueDate}
                      onChange={(e) => setBulkIssueDate(e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Digital Head Signature Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <Label htmlFor="toggle-marksheet-bulk-sign" className="text-xs font-semibold cursor-pointer">
                    Digital Signature
                  </Label>
                  <Switch
                    id="toggle-marksheet-bulk-sign"
                    checked={includeDigitalSignature}
                    onCheckedChange={setIncludeDigitalSignature}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Interactive Batch Preview & Pagination */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-base font-semibold tracking-tight text-foreground">
                  Preview
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-border/80 text-xs text-muted-foreground font-normal bg-background/60">
                  A4 Landscape
                </span>

                {bulkMarksheets.length > 0 && (
                  <div className="flex items-center gap-1 bg-muted/70 px-2 py-0.5 rounded-lg border text-xs ml-1">
                    <button
                      type="button"
                      disabled={currentPreviewIndex <= 0}
                      onClick={() => setCurrentPreviewIndex((prev) => Math.max(0, prev - 1))}
                      className="p-0.5 rounded hover:bg-background disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-[11px] font-bold">
                      {currentPreviewIndex + 1} / {bulkMarksheets.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPreviewIndex >= bulkMarksheets.length - 1}
                      onClick={() =>
                        setCurrentPreviewIndex((prev) =>
                          Math.min(bulkMarksheets.length - 1, prev + 1)
                        )
                      }
                      className="p-0.5 rounded hover:bg-background disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Scrollable Canvas for Batch Preview */}
            <PrintPreview
              fitMode="contain"
              resetKey={`bulk-marksheet-${currentPreviewIndex}`}
              className="h-[460px] sm:h-[580px] lg:h-[calc(100dvh-14rem)] w-full print:hidden"
            >
              <MarksheetPrintableView data={activeBulkPreviewMarksheet} schoolProfile={schoolProfile} includeDigitalSignature={includeDigitalSignature} />
            </PrintPreview>
          </div>
        </div>
      )}
    </>
  );
}
