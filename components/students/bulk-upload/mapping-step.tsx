"use client";

import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { autoSuggestMapping, TARGET_FIELDS, RESULT_TARGET_FIELDS, autoSuggestResultMapping, type ParsedExcelResult } from "@/lib/utils/excel-parser";
import type { BulkUploadState } from "./use-bulk-upload";

export function MappingStep({ bulk, parsedData }: { bulk: BulkUploadState; parsedData: ParsedExcelResult }) {
  const { columnMapping, handleHeaderRowChange, handleMappingChange, handleProceedToPreview, isResultsMode, setColumnMapping, setStep } = bulk;
  return (
    <div className="rounded-xl border bg-card p-6 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-sm font-semibold">
            2. Map Excel Headers to {isResultsMode ? "Evaluation & Marks Fields" : "Student Profile Fields"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ensure each column from your file is matched correctly. Unmapped columns can be ignored.
          </p>
        </div>
        <button
          onClick={() => {
            if (isResultsMode) {
              setColumnMapping(autoSuggestResultMapping(parsedData.headers));
            } else {
              setColumnMapping(autoSuggestMapping(parsedData.headers));
            }
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded px-2.5 py-1"
        >
          <Sparkles className="h-3 w-3 text-amber-500" />
          Auto-Suggest All
        </button>
      </div>

      {/* Header Row Selector & Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-lg border text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-foreground">Header Row:</span>
          <div className="w-[270px]">
            <CustomSelect
              value={parsedData.headerRowIndex}
              onChange={(val) => handleHeaderRowChange(Number(val))}
              options={[
                { label: "Row 1 (Top Row)", value: 0 },
                {
                  label: `Row 2 (Banglar Shiksha / 2nd Row)${parsedData.headerRowIndex === 1 ? " ✨ Auto" : ""}`,
                  value: 1,
                },
                { label: "Row 3 (3rd Row)", value: 2 },
                { label: "Row 4 (4th Row)", value: 3 },
              ]}
            />
          </div>
          <span className="text-muted-foreground hidden sm:inline">
            ({parsedData.rawRows.length} data rows start from Row {parsedData.headerRowIndex + 2})
          </span>
        </div>

        {parsedData.detectedMetadata?.schoolName && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-medium text-foreground">🏫 {parsedData.detectedMetadata.schoolName}</span>
            {parsedData.detectedMetadata.diseCode && (
              <span className="opacity-75 font-mono">({parsedData.detectedMetadata.diseCode})</span>
            )}
          </div>
        )}
      </div>

      {/* Mapping Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/70 sticky top-0 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Excel Column</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Sample Value (Row 1)</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Target {isResultsMode ? "Marks" : "Student"} Field
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {parsedData.headers.map((header) => {
                const sampleVal = parsedData.rawRows[0]?.[header];
                const currentMapping = columnMapping[header] || "ignore";

                return (
                  <tr key={header} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-semibold text-foreground">
                      {header}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                      {sampleVal !== undefined && sampleVal !== null && sampleVal !== ""
                        ? String(sampleVal)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 min-w-[280px]">
                      <CustomSelect
                        value={currentMapping}
                        onChange={(val) => handleMappingChange(header, String(val))}
                        options={[
                          { label: "Ignore this column", value: "ignore" },
                          ...(isResultsMode
                            ? RESULT_TARGET_FIELDS.map((f) => ({
                                label: `${f.label}${f.required ? " *" : ""}`,
                                value: f.key,
                              }))
                            : TARGET_FIELDS.map((f) => ({
                                label: `${f.label}${f.required ? " *" : ""}`,
                                value: f.key,
                                icon: f.icon,
                              }))),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          onClick={() => setStep(1)}
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground py-2 min-h-[40px] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Upload
        </button>
        <button
          onClick={handleProceedToPreview}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm min-h-[44px] cursor-pointer"
        >
          <span>Validate &amp; Preview Rows</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}
