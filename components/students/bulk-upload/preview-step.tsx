"use client";

import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import type { BulkUploadState } from "./use-bulk-upload";

export function PreviewStep({ bulk }: { bulk: BulkUploadState }) {
  const { errorIssues, isImporting, isResultsMode, mappedResultRows, mappedRows, previewRows, resultPreviewRows, resultsImportMutation, setStep, studentImportMutation, validationIssues } = bulk;
  return (
    <div className="rounded-xl border bg-card p-6 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-sm font-semibold">3. Data Validation & Import Preview</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review matched data and potential warnings before executing the database write.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Total Std.: {isResultsMode ? mappedResultRows.length : mappedRows.length}
          </Badge>
          {errorIssues.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorIssues.length} Errors
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="preview" className="text-xs">
            Rows Preview ({isResultsMode ? resultPreviewRows.length : previewRows.length})
          </TabsTrigger>
          <TabsTrigger value="issues" className="text-xs">
            Issues & Warnings ({validationIssues.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Preview Table */}
        <TabsContent value="preview" className="mt-3">
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[350px] overflow-y-auto overflow-x-auto">
              {isResultsMode ? (
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-muted/70 sticky top-0 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Student Name / ID</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Class / Sec / Roll</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Session &amp; Exam</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Marks Obtained</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Percentage</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {resultPreviewRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-xs font-semibold">{row.name || row.schoolId || row.studentUniqueCode}</td>
                        <td className="px-3 py-2 text-xs">{row.class ? `${row.class}-${row.section || "A"} (${row.roll || 1})` : "—"}</td>
                        <td className="px-3 py-2 text-xs font-mono">{row.academicYear} &middot; {row.examName}</td>
                        <td className="px-3 py-2 text-xs font-bold text-primary">{row.marksObtained} {row.fullMarks ? `/ ${row.fullMarks}` : ""}</td>
                        <td className="px-3 py-2 text-xs">{row.percentage !== undefined ? `${row.percentage}%` : "—"}</td>
                        <td className="px-3 py-2">
                          {row.errors && row.errors.length > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">Error</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Ready</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-muted/70 sticky top-0 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Action</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Student Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">School ID / PEN</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Class & Roll</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          {row.action === "update" ? (
                            <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px]">Update</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">New</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold">{row.name}</td>
                        <td className="px-3 py-2 text-xs font-mono">{row.schoolId || row.pen || "Auto-Generated"}</td>
                        <td className="px-3 py-2 text-xs">Class {row.presentClass} - {row.presentSection} (#{row.presentRoll})</td>
                        <td className="px-3 py-2">
                          {(row.errors && row.errors.length > 0) ? (
                            <Badge variant="destructive" className="text-[10px]">Error</Badge>
                          ) : (row.warnings && row.warnings.length > 0) ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Warning</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Valid</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Issues */}
        <TabsContent value="issues" className="mt-3">
          {validationIssues.length === 0 ? (
            <div className="p-8 text-center rounded-lg border bg-muted/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-800">No issues found!</p>
              <p className="text-xs text-muted-foreground mt-0.5">All spreadsheet rows passed validation checks cleanly.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/70 sticky top-0 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Field</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Issue Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {validationIssues.map((issue, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{issue.row}</td>
                        <td className="px-3 py-2 text-xs font-mono">{issue.field}</td>
                        <td className="px-3 py-2 text-xs">{issue.issue}</td>
                        <td className="px-3 py-2">
                          {issue.severity === "error" ? (
                            <Badge variant="destructive" className="text-[10px]">Error</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Warning</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Mapping
        </button>
        <button
          onClick={() => {
            if (isResultsMode) {
              resultsImportMutation.mutate(mappedResultRows);
            } else {
              studentImportMutation.mutate(mappedRows);
            }
          }}
          disabled={isImporting || errorIssues.length > 0}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isImporting ? (
            <>
              <Spinner className="h-4 w-4" />
              Importing into Database…
            </>
          ) : (
            <>
              Confirm & Run Bulk Import <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
