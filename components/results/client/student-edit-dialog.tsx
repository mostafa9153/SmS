"use client";

import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSubjectFullMarks } from "@/lib/utils/marks-config";
import { sanitizeScoreInput } from "@/components/results/client/helpers";
import type { ResultsClientState } from "./use-results-client";

export function StudentEditDialog({ rc }: { rc: ResultsClientState }) {
  const { classSubjects, currentClassFullMarks, editingStudentResult, handleSaveModal, modalError, modalRemarks, modalStudentScores, promotionPolicy, selectedClass, selectedExam, setEditingStudentResult, setModalError, setModalRemarks, setModalStudentScores, subjectFullMarksInfo } = rc;
  return (
    <Dialog open={!!editingStudentResult} onOpenChange={(open) => !open && setEditingStudentResult(null)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-sm font-bold">
            <span>Marksheet Entry: {editingStudentResult?.student?.name}</span>
            <Badge variant="outline" className="text-xs font-mono">
              Class {selectedClass}-{editingStudentResult?.section} • Roll {editingStudentResult?.roll}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {selectedExam} • Full Marks: {currentClassFullMarks}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {modalError && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 p-3 text-xs text-rose-800 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Subject-Wise Breakdown Table */}
          <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Subject</th>
                  <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-28">
                    Written / Theory
                  </th>
                  {subjectFullMarksInfo.hasPractical && (
                    <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-28">
                      Practical / Project
                    </th>
                  )}
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground w-16">Total</th>
                  <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-20">Status</th>
                  <th className="px-2 py-2 text-center font-semibold text-muted-foreground bg-primary/5 w-44">
                    Supplementary / Re-test
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {classSubjects.map((sub) => {
                  const entry = modalStudentScores[sub] || { theory: "", practical: "", suppTheory: "", suppPractical: "" };
                  const subFullInfo = getSubjectFullMarks(selectedClass, selectedExam, sub);
                  const maxWritten = subFullInfo.writtenFull;
                  const maxPractical = subFullInfo.practicalFull;
                  const maxSubTotal = subFullInfo.totalFull;

                  const tVal = parseFloat(entry.theory) || 0;
                  const pVal = parseFloat(entry.practical) || 0;
                  const subTotal = tVal + pVal;

                  const reqSubPassPct = promotionPolicy.subjectPassPercentage ?? promotionPolicy.minPassPercentage ?? 30;
                  const tPass = maxWritten > 0 ? (tVal / maxWritten) * 100 >= (promotionPolicy.theoryPassPercentage ?? 30) : true;
                  const pPass = maxPractical > 0 ? (pVal / maxPractical) * 100 >= (promotionPolicy.practicalPassPercentage ?? 30) : true;
                  const isOriginalPassed = (tVal > 0 || pVal > 0) && tPass && pPass && (maxSubTotal > 0 ? (subTotal / maxSubTotal) * 100 >= reqSubPassPct : true);

                  const hasSuppInput = (entry.suppTheory !== "" && entry.suppTheory !== undefined) || (entry.suppPractical !== "" && entry.suppPractical !== undefined);
                  const suppTVal = entry.suppTheory !== "" ? (parseFloat(entry.suppTheory) || 0) : tVal;
                  const suppPVal = entry.suppPractical !== "" ? (parseFloat(entry.suppPractical) || 0) : pVal;
                  const suppTotal = suppTVal + suppPVal;

                  const suppTPass = maxWritten > 0 ? (suppTVal / maxWritten) * 100 >= (promotionPolicy.theoryPassPercentage ?? 30) : true;
                  const suppPPass = maxPractical > 0 ? (suppPVal / maxPractical) * 100 >= (promotionPolicy.practicalPassPercentage ?? 30) : true;
                  const isSuppPassed = hasSuppInput && suppTPass && suppPPass && (maxSubTotal > 0 ? (suppTotal / maxSubTotal) * 100 >= reqSubPassPct : true);

                  return (
                    <tr key={sub} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">
                        <div className="font-semibold">{sub}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Max: {maxWritten}w + {maxPractical}p = {maxSubTotal}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={maxWritten}
                          value={entry.theory}
                          onChange={(e) => {
                            const val = sanitizeScoreInput(e.target.value, maxWritten);
                            setModalStudentScores((prev) => ({
                              ...prev,
                              [sub]: {
                                ...prev[sub],
                                theory: val,
                                practical: prev[sub]?.practical || "",
                                suppTheory: prev[sub]?.suppTheory || "",
                                suppPractical: prev[sub]?.suppPractical || "",
                              },
                            }));
                            setModalError(null);
                          }}
                          placeholder={`0 to ${maxWritten}`}
                          className="w-full text-center font-mono text-xs rounded-xl border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                      </td>
                      {subjectFullMarksInfo.hasPractical && (
                        <td className="px-2 py-2 text-center">
                          {subFullInfo.hasPractical ? (
                            <input
                              type="number"
                              min="0"
                              max={maxPractical}
                              value={entry.practical}
                              onChange={(e) => {
                                const val = sanitizeScoreInput(e.target.value, maxPractical);
                                setModalStudentScores((prev) => ({
                                  ...prev,
                                  [sub]: {
                                    theory: prev[sub]?.theory || "",
                                    practical: val,
                                    suppTheory: prev[sub]?.suppTheory || "",
                                    suppPractical: prev[sub]?.suppPractical || "",
                                  },
                                }));
                                setModalError(null);
                              }}
                              placeholder={`0 to ${maxPractical}`}
                              className="w-full text-center font-mono text-xs rounded-xl border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                            />
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right font-mono font-bold text-foreground">
                        {isSuppPassed && hasSuppInput ? suppTotal : subTotal}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">/ {maxSubTotal}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {isSuppPassed ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold px-1.5 py-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400"
                          >
                            Cleared (Supp)
                          </Badge>
                        ) : isOriginalPassed ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                          >
                            Pass
                          </Badge>
                        ) : (subTotal > 0 || hasSuppInput) ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold px-1.5 py-0 bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300"
                          >
                            Fail
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </td>
                      {/* Supplementary Entry Inputs */}
                      <td className="px-2 py-2 bg-primary/5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxWritten}
                            value={entry.suppTheory}
                            onChange={(e) => {
                              const val = sanitizeScoreInput(e.target.value, maxWritten);
                              setModalStudentScores((prev) => ({
                                ...prev,
                                [sub]: {
                                  theory: prev[sub]?.theory || "",
                                  practical: prev[sub]?.practical || "",
                                  suppTheory: val,
                                  suppPractical: prev[sub]?.suppPractical || "",
                                },
                              }));
                              setModalError(null);
                            }}
                            placeholder="Supp Th"
                            title="Supplementary / Re-test Written Marks"
                            className="w-1/2 text-center font-mono text-[11px] rounded-lg border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-[10px]"
                          />
                          {subFullInfo.hasPractical ? (
                            <input
                              type="number"
                              min="0"
                              max={maxPractical}
                              value={entry.suppPractical}
                              onChange={(e) => {
                                const val = sanitizeScoreInput(e.target.value, maxPractical);
                                setModalStudentScores((prev) => ({
                                  ...prev,
                                  [sub]: {
                                    theory: prev[sub]?.theory || "",
                                    practical: prev[sub]?.practical || "",
                                    suppTheory: prev[sub]?.suppTheory || "",
                                    suppPractical: val,
                                  },
                                }));
                                setModalError(null);
                              }}
                              placeholder="Supp Pr"
                              title="Supplementary / Re-test Practical Marks"
                              className="w-1/2 text-center font-mono text-[11px] rounded-lg border py-1 bg-background outline-none focus:ring-1 focus:ring-primary shadow-2xs placeholder:text-[10px]"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 w-1/2 text-center">N/A</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Optional Remarks */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Excellent progress in Mathematics"
              value={modalRemarks}
              onChange={(e) => setModalRemarks(e.target.value)}
              className="w-full rounded-xl border border-border/80 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary shadow-2xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => setEditingStudentResult(null)}
            className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveModal}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
          >
            Save Marksheet & Re-Rank
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
