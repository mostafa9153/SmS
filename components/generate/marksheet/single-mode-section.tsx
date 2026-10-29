"use client";

import { MarksheetPrintableView } from "@/components/marksheet/marksheet-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintPreview } from "@/components/print/print-preview";
import { Search, User, BookOpen, RefreshCw, Calendar, Eye } from "lucide-react";
import { STANDARD_CLASSES } from "@/components/generate/marksheet/constants";
import type { MarksheetGeneratorState } from "./use-marksheet-generator";
import { CustomSelect } from "@/components/ui/custom-select";

export function SingleModeSection({ mk }: { mk: MarksheetGeneratorState }) {
  const { activeSubjectMax, dbResultsLoaded, fetchStudentResultsFromDB, filteredStudents, generatorMode, handleClassChange, handleMarkChange, handleSelectStudent, includeDigitalSignature, isFetchingResults, marksheet, schoolProfile, selectedStudent, setIncludeDigitalSignature, setMarksheet, setStudentSearch, studentSearch } = mk;
  return (
    <>
      {generatorMode === "single" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Data Entry Studio Forms */}
          <div className="xl:col-span-4 space-y-4 print:hidden xl:overflow-y-auto xl:max-h-[calc(100vh-140px)] xl:pr-2 pb-16 xl:pb-36">
            {/* Card 1: Student Particulars with Database Search */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Student Particulars</span>
                </CardTitle>
                {selectedStudent && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFetchingResults}
                    onClick={() => fetchStudentResultsFromDB(selectedStudent)}
                    className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
                    title="Re-sync marks from Database"
                  >
                    <RefreshCw
                      className={`h-3 w-3 text-primary ${isFetchingResults ? "animate-spin" : ""}`}
                    />
                    <span>{isFetchingResults ? "Fetching..." : "Re-sync DB"}</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name, roll, or ID..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                  {filteredStudents.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden divide-y text-xs">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            handleSelectStudent(s);
                            setStudentSearch("");
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              Class {s.presentClass} &bull; Roll: {s.presentRoll}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {s.schoolId || s.id.slice(0, 8)}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Full Name</Label>
                    <Input
                      value={marksheet.studentName}
                      onChange={(e) => setMarksheet({ ...marksheet, studentName: e.target.value })}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class</Label>
                    <CustomSelect
                      value={marksheet.studentClass}
                      onChange={(v: string) => handleClassChange(v)}
                      searchable={false}
                      className="w-full"
                      triggerClassName="h-7 text-xs font-bold"
                      options={STANDARD_CLASSES.map((c) => ({ value: c, label: `Class ${c}` }))}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Roll No.</Label>
                    <Input
                      value={marksheet.rollNo}
                      onChange={(e) => setMarksheet({ ...marksheet, rollNo: e.target.value })}
                      className="h-7 text-xs font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Student ID</Label>
                    <Input
                      value={marksheet.studentId}
                      onChange={(e) => setMarksheet({ ...marksheet, studentId: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Reg. No. / PEN</Label>
                    <Input
                      value={marksheet.registrationNo}
                      onChange={(e) => setMarksheet({ ...marksheet, registrationNo: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                {dbResultsLoaded.found && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-700 dark:text-emerald-400 space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <span>✓</span>
                      <span>Synced {dbResultsLoaded.count} DB Evaluation Records</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      Terms: {dbResultsLoaded.examNames.join(", ")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Subject-wise Marks Entry Studio */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Subject-wise CCE Marks (3 Terms)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {marksheet.subjects.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    className="p-2.5 rounded-lg border bg-card/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{sub.subjectName}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        Total: {sub.overallTotal} / {activeSubjectMax}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      {/* Term 1 */}
                      <div className="p-1.5 rounded border bg-muted/20 space-y-1 text-center">
                        <span className="font-semibold text-muted-foreground block">Term 1</span>
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="P (40)"
                            value={sub.term1.periodic}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term1", "periodic", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                          <Input
                            placeholder="Pr (10)"
                            value={sub.term1.preparatory}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term1", "preparatory", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                        </div>
                      </div>

                      {/* Term 2 */}
                      <div className="p-1.5 rounded border bg-muted/20 space-y-1 text-center">
                        <span className="font-semibold text-muted-foreground block">Term 2</span>
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="P (40)"
                            value={sub.term2.periodic}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term2", "periodic", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                          <Input
                            placeholder="Pr (10)"
                            value={sub.term2.preparatory}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term2", "preparatory", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                        </div>
                      </div>

                      {/* Term 3 */}
                      <div className="p-1.5 rounded border bg-muted/20 space-y-1 text-center">
                        <span className="font-semibold text-muted-foreground block">Annual</span>
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="P (90)"
                            value={sub.term3.periodic}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term3", "periodic", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                          <Input
                            placeholder="Pr (10)"
                            value={sub.term3.preparatory}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term3", "preparatory", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Card 3: Session & Metadata */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Academic Session &amp; Promotion</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Academic Year</Label>
                    <Input
                      value={marksheet.academicYear}
                      onChange={(e) => setMarksheet({ ...marksheet, academicYear: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Issue Date</Label>
                    <Input
                      value={marksheet.issueDate}
                      onChange={(e) => setMarksheet({ ...marksheet, issueDate: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class Rank / Honors</Label>
                    <Input
                      value={marksheet.classRank || ""}
                      onChange={(e) => setMarksheet({ ...marksheet, classRank: e.target.value })}
                      placeholder="1st, 2nd, 3rd, Top 10"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Promoted To Class</Label>
                    <Input
                      value={marksheet.promotedToClass}
                      onChange={(e) => setMarksheet({ ...marksheet, promotedToClass: e.target.value })}
                      className="h-7 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Digital Head Signature Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <Label htmlFor="toggle-marksheet-single-sign" className="text-xs font-semibold cursor-pointer">
                    Digital Signature
                  </Label>
                  <Switch
                    id="toggle-marksheet-single-sign"
                    checked={includeDigitalSignature}
                    onCheckedChange={setIncludeDigitalSignature}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Interactive Single Marksheet Preview */}
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
              </div>

            </div>

            {/* Scrollable Canvas for Single Preview */}
            <PrintPreview
              fitMode="contain"
              resetKey="single-marksheet"
              className="h-[460px] sm:h-[580px] lg:h-[calc(100dvh-14rem)] w-full print:hidden"
            >
              <MarksheetPrintableView data={marksheet} schoolProfile={schoolProfile} includeDigitalSignature={includeDigitalSignature} />
            </PrintPreview>
          </div>
        </div>
      )}
    </>
  );
}
