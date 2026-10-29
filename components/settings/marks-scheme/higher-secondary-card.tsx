"use client";

import { BookOpen, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeSchemeTotals } from "@/lib/utils/marks-config";

import type { MarksSchemeState } from "./use-marks-scheme";

export function HigherSecondaryCard({ ms }: { ms: MarksSchemeState }) {
  const { handleOpenEditScheme, marksSchemes } = ms;
  return (
    <Card className="border bg-card shadow-xs overflow-hidden">
      <CardHeader className="p-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Higher Secondary Semester Marks Scheme</span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 font-mono font-medium">
                  Class XI &amp; XII (WBCHSE Semester Model)
                </Badge>
              </CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 border-b">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Class</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Subjects</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Odd Semester</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Even Semester</th>
                <th className="px-4 py-2.5 text-right font-bold text-foreground bg-indigo-500/5 border-l border-r border-indigo-500/15">
                  Total Marks (Annual)
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {marksSchemes
                .filter((s) => s.classCode === "XI" || s.classCode === "XII")
                .map((scheme) => {
                  const totals = computeSchemeTotals(scheme);
                  return (
                    <tr key={scheme.classCode} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 font-mono shrink-0">
                            {scheme.classCode}
                          </div>
                          <div className="font-bold text-foreground">{scheme.className}</div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 bg-background shadow-2xs">
                          {scheme.subjectCount} Sub
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-bold font-mono text-foreground text-xs">
                            {totals.firstExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {(scheme.splitVariations && scheme.splitVariations.length > 0)
                              ? scheme.splitVariations.map((v) => `${v.written}w+${v.practical}p`).join(" / ")
                              : "40w+10p / 35w+15p"}{" "}
                            <span className="text-neutral-500 font-mono">(50/sub)</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-bold font-mono text-foreground text-xs">
                            {totals.secondExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {(scheme.splitVariations && scheme.splitVariations.length > 0)
                              ? scheme.splitVariations.map((v) => `${v.written}w+${v.practical}p`).join(" / ")
                              : "40w+10p / 35w+15p"}{" "}
                            <span className="text-neutral-500 font-mono">(50/sub)</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-extrabold text-xs bg-indigo-500/5 border-l border-r border-indigo-500/15">
                        <span className="inline-flex items-center text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 rounded-md shadow-2xs">
                          {totals.grandTotal} Marks
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditScheme(scheme)}
                          className="h-7 text-xs px-2.5 gap-1.5 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-2xs"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit Marks</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
