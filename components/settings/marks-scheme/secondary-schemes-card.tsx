"use client";

import { Award, RotateCcw, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeSchemeTotals } from "@/lib/utils/marks-config";

import type { MarksSchemeState } from "./use-marks-scheme";

export function SecondarySchemesCard({ ms }: { ms: MarksSchemeState }) {
  const { handleOpenEditScheme, handleResetDefaultSchemes, marksSchemes } = ms;
  return (
    <Card className="border bg-card shadow-xs overflow-hidden">
      <CardHeader className="p-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Secondary Evaluation Scheme</span>
                <Badge variant="outline" className="text-[10px] bg-background font-mono font-medium">
                  Class V – X (WBBSE 3-Summative)
                </Badge>
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaultSchemes}
              className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Restore Defaults</span>
            </Button>
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
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">1st Summative</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">2nd Summative</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">3rd / Annual Exam</th>
                <th className="px-4 py-2.5 text-right font-bold text-foreground bg-primary/5 border-l border-r border-primary/15">
                  Total Marks (Annual)
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {marksSchemes
                .filter((s) => s.classCode !== "XI" && s.classCode !== "XII")
                .map((scheme) => {
                  const totals = computeSchemeTotals(scheme);
                  const has1stPractical = (scheme.firstSummativePractical || 0) > 0;
                  const has2ndPractical = (scheme.secondSummativePractical || 0) > 0;
                  const hasAnnualPractical = (scheme.annualPractical || 0) > 0;

                  return (
                    <tr key={scheme.classCode} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary font-mono shrink-0">
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
                            {scheme.firstSummativeWritten}
                            {has1stPractical && <span className="text-amber-600 font-semibold">+{scheme.firstSummativePractical}p</span>}
                            <span> × {scheme.subjectCount}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-bold font-mono text-foreground text-xs">
                            {totals.secondExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {scheme.secondSummativeWritten}
                            {has2ndPractical && <span className="text-amber-600 font-semibold">+{scheme.secondSummativePractical}p</span>}
                            <span> × {scheme.subjectCount}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-xs">
                            {totals.annualExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {scheme.annualWritten}
                            {hasAnnualPractical && <span className="text-amber-600 font-semibold">+{scheme.annualPractical}p</span>}
                            <span> × {scheme.subjectCount}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-extrabold text-xs bg-primary/5 border-l border-r border-primary/15">
                        <span className="inline-flex items-center text-primary bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-md shadow-2xs">
                          {totals.grandTotal} Marks
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditScheme(scheme)}
                          className="h-7 text-xs px-2.5 gap-1.5 hover:border-primary hover:text-primary transition-all shadow-2xs"
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
