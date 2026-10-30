"use client";

import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { sanitizeScoreInput } from "@/components/results/client/helpers";
import type { ResultsClientState } from "./use-results-client";

export function SubjectBatchView({ rc }: { rc: ResultsClientState }) {
  const { filteredResults, isHs, isLoading, promotionPolicy, selectedClass, selectedExam, selectedSection, selectedSubject, setIsBatchModified, setSubjectBatchScores, subjectBatchScores, subjectFullMarksInfo } = rc;
  return (
    <div className="space-y-3">
      {/* Sub-Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card border border-border/80 rounded-2xl px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">
            Class {selectedClass} • Section {selectedSection} • {selectedSubject}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-mono bg-muted/60 text-muted-foreground">
            {selectedExam}
          </span>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          Full Marks:{" "}
          <strong className="text-foreground font-mono">
            {subjectFullMarksInfo.hasPractical
              ? `Written: ${subjectFullMarksInfo.writtenFull} + Project: ${subjectFullMarksInfo.practicalFull} = ${subjectFullMarksInfo.totalFull}`
              : `Written: ${subjectFullMarksInfo.writtenFull} Marks`}
          </strong>
        </div>
      </div>

      {/* Desktop Table (Hidden on Mobile) */}
      <div className="hidden md:block rounded-2xl border border-border/80 bg-card/90 overflow-x-auto shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                Roll
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Student Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wider uppercase w-40">
                {isHs ? "Reg No" : "School ID"}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-14">
                Sec
              </th>
              {/* Written Input */}
              <th className="px-4 py-3 text-center text-xs font-bold text-foreground bg-primary/5 border-l w-32 tracking-wider uppercase">
                Written ({subjectFullMarksInfo.writtenFull})
              </th>
              {/* Project & Practical Input (Class 9-12 Only) */}
              {subjectFullMarksInfo.hasPractical && (
                <th className="px-4 py-3 text-center text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-950/20 border-l w-36 tracking-wider uppercase">
                  Project & Practical ({subjectFullMarksInfo.practicalFull})
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground tracking-wider uppercase border-l w-28">
                Total
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-24">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase w-16">
                Absent
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner className="h-6 w-6 text-primary" />
                    <span className="text-xs">Loading student roster…</span>
                  </div>
                </td>
              </tr>
            ) : filteredResults.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-muted-foreground text-xs">
                  No students found in Class {selectedClass} - Section {selectedSection}.
                </td>
              </tr>
            ) : (
              filteredResults.map((r) => {
                const score = subjectBatchScores[r.studentId] || { written: "", practical: "", isAbsent: false };
                const wNum = parseFloat(score.written) || 0;
                const pNum = parseFloat(score.practical) || 0;
                const subTotal = score.isAbsent ? 0 : wNum + pNum;
                const hasEntered = score.isAbsent || score.written !== "" || score.practical !== "";

                const tPass =
                  subjectFullMarksInfo.writtenFull > 0
                    ? (wNum / subjectFullMarksInfo.writtenFull) * 100 >= promotionPolicy.theoryPassPercentage
                    : true;
                const pPass =
                  subjectFullMarksInfo.practicalFull > 0
                    ? (pNum / subjectFullMarksInfo.practicalFull) * 100 >= promotionPolicy.practicalPassPercentage
                    : true;
                const isSubPassed =
                  !score.isAbsent &&
                  tPass &&
                  pPass &&
                  (subTotal / subjectFullMarksInfo.totalFull) * 100 >= (promotionPolicy.subjectPassPercentage ?? promotionPolicy.minPassPercentage ?? 30);

                return (
                  <tr key={r.studentId} className="hover:bg-primary/[0.04] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {r.roll}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {r.student?.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                      {isHs ? (
                        <div className="font-semibold text-foreground">
                          {r.student?.boardRegistrationNo || <span className="text-muted-foreground/40 italic">—</span>}
                        </div>
                      ) : (
                        <div>{r.student?.schoolId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-muted-foreground">
                      {r.section}
                    </td>

                    {/* Written Input Box */}
                    <td className="px-3 py-2 text-center bg-primary/[0.02] border-l">
                      <input
                        type="number"
                        min="0"
                        max={subjectFullMarksInfo.writtenFull}
                        step="0.5"
                        disabled={score.isAbsent}
                        placeholder={`0 to ${subjectFullMarksInfo.writtenFull}`}
                        value={score.written}
                        onChange={(e) => {
                          const val = sanitizeScoreInput(e.target.value, subjectFullMarksInfo.writtenFull);
                          setSubjectBatchScores((prev) => ({
                            ...prev,
                            [r.studentId]: {
                              ...prev[r.studentId],
                              written: val,
                            },
                          }));
                          setIsBatchModified(true);
                        }}
                        className={cn(
                          "w-24 mx-auto text-center font-mono text-xs font-bold rounded-xl border border-border/90 py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary shadow-2xs transition-all",
                          score.isAbsent && "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                        )}
                      />
                    </td>

                    {/* Project & Practical Input Box */}
                    {subjectFullMarksInfo.hasPractical && (
                      <td className="px-3 py-2 text-center bg-purple-500/[0.03] border-l">
                        <input
                          type="number"
                          min="0"
                          max={subjectFullMarksInfo.practicalFull}
                          step="0.5"
                          disabled={score.isAbsent}
                          placeholder={`0 to ${subjectFullMarksInfo.practicalFull}`}
                          value={score.practical}
                          onChange={(e) => {
                            const val = sanitizeScoreInput(e.target.value, subjectFullMarksInfo.practicalFull);
                            setSubjectBatchScores((prev) => ({
                              ...prev,
                              [r.studentId]: {
                                ...prev[r.studentId],
                                practical: val,
                              },
                            }));
                            setIsBatchModified(true);
                          }}
                          className={cn(
                            "w-24 mx-auto text-center font-mono text-xs font-bold rounded-xl border border-border/90 py-1.5 bg-background outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs transition-all",
                            score.isAbsent && "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          )}
                        />
                      </td>
                    )}

                    {/* Total Score */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground border-l">
                      {score.isAbsent ? (
                        <span className="text-rose-600 font-bold">AB (0)</span>
                      ) : hasEntered ? (
                        <span>
                          {subTotal}{" "}
                          <span className="text-[11px] text-muted-foreground font-normal">
                            / {subjectFullMarksInfo.totalFull}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 font-normal italic">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 text-center">
                      {score.isAbsent ? (
                        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 font-bold">
                          Absent
                        </Badge>
                      ) : hasEntered ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5",
                            isSubPassed
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300"
                          )}
                        >
                          {isSubPassed ? "Pass" : "Fail"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>

                    {/* Absent Checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={score.isAbsent}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSubjectBatchScores((prev) => ({
                            ...prev,
                            [r.studentId]: {
                              ...prev[r.studentId],
                              isAbsent: checked,
                              written: checked ? "0" : prev[r.studentId]?.written || "",
                              practical: checked ? "0" : prev[r.studentId]?.practical || "",
                            },
                          }));
                          setIsBatchModified(true);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        title="Mark as Absent"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (<md) */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {isLoading ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-xs text-muted-foreground">
            <Spinner className="h-5 w-5 mx-auto mb-2 text-primary" />
            Loading student roster…
          </div>
        ) : filteredResults.length === 0 ? (
          <EmptyState compact title="No students found." className="rounded-2xl border bg-card" />
        ) : (
          filteredResults.map((r) => {
            const score = subjectBatchScores[r.studentId] || { written: "", practical: "", isAbsent: false };
            const wNum = parseFloat(score.written) || 0;
            const pNum = parseFloat(score.practical) || 0;
            const subTotal = score.isAbsent ? 0 : wNum + pNum;

            return (
              <div
                key={r.studentId}
                className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-1 rounded-lg">
                      Roll {r.roll}
                    </span>
                    <span className="font-bold text-sm text-foreground">{r.student?.name}</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={score.isAbsent}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSubjectBatchScores((prev) => ({
                          ...prev,
                          [r.studentId]: {
                            ...prev[r.studentId],
                            isAbsent: checked,
                            written: checked ? "0" : prev[r.studentId]?.written || "",
                            practical: checked ? "0" : prev[r.studentId]?.practical || "",
                          },
                        }));
                        setIsBatchModified(true);
                      }}
                      className="h-4 w-4 rounded text-rose-600 cursor-pointer"
                    />
                    <span>Absent</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Written ({subjectFullMarksInfo.writtenFull})
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={subjectFullMarksInfo.writtenFull}
                      disabled={score.isAbsent}
                      placeholder="0"
                      value={score.written}
                      onChange={(e) => {
                        const val = sanitizeScoreInput(e.target.value, subjectFullMarksInfo.writtenFull);
                        setSubjectBatchScores((prev) => ({
                          ...prev,
                          [r.studentId]: { ...prev[r.studentId], written: val },
                        }));
                        setIsBatchModified(true);
                      }}
                      className="w-full text-center font-mono font-bold rounded-xl border py-1.5 bg-background outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                    />
                  </div>

                  {subjectFullMarksInfo.hasPractical && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 block">
                        Project ({subjectFullMarksInfo.practicalFull})
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={subjectFullMarksInfo.practicalFull}
                        disabled={score.isAbsent}
                        placeholder="0"
                        value={score.practical}
                        onChange={(e) => {
                          const val = sanitizeScoreInput(e.target.value, subjectFullMarksInfo.practicalFull);
                          setSubjectBatchScores((prev) => ({
                            ...prev,
                            [r.studentId]: { ...prev[r.studentId], practical: val },
                          }));
                          setIsBatchModified(true);
                        }}
                        className="w-full text-center font-mono font-bold rounded-xl border py-1.5 bg-background outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs">
                  <span className="text-muted-foreground">
                    {isHs ? "Reg No: " : "ID: "}
                    <strong className="font-mono text-foreground">
                      {isHs ? (r.student?.boardRegistrationNo || "—") : r.student?.schoolId}
                    </strong>
                  </span>
                  <span className="font-mono font-bold">
                    Total: {score.isAbsent ? "AB (0)" : `${subTotal} / ${subjectFullMarksInfo.totalFull}`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
