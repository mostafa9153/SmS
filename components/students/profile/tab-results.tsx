"use client";

import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Clock, Trophy, Sparkles, Plus } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import Link from "next/link";
import { SectionTitle } from "@/components/students/profile/info-primitives";
import type { StudentProfileState } from "./use-student-profile";

export function ResultsTab({ profile }: { profile: StudentProfileState }) {
  const { currentYear, resultHistory, setIsAddResultOpen, setResError, setResExam, setResMarks, setResRemarks, setResYear, student } = profile;
  if (!student) return null;
  return (
    <TabsContent value="results" className="mt-4">
      <div className="rounded-xl border bg-card p-5 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <SectionTitle>Academic Examination Results</SectionTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-year evaluation records, percentage breakdown, and dual rank rankings.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                setResYear(new Date().getFullYear());
                setResExam("1st Summative Evaluation");
                setResMarks("");
                setResRemarks("");
                setResError("");
                setIsAddResultOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Record Exam Marks
            </button>
            <Link
              href="/results"
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline px-2 py-1"
            >
              <Trophy className="h-3.5 w-3.5" /> Class Results Module →
            </Link>
          </div>
        </div>

        {/* Section 1: Current Active Academic Session */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                Current Academic Session ({currentYear}) — Class {student.presentClass}-{student.presentSection}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Full Marks: {student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500}
            </span>
          </div>

          {/* 3 Evaluations Cards for Current Year */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["1st Summative Evaluation", "2nd Summative Evaluation", "Annual Examination"].map((examName) => {
              const examRes = resultHistory.find(
                (r) => r.academicYear === currentYear && r.examName === examName
              );
              const isEntered = !!examRes && examRes.marksObtained > 0;
              const currentClassFullMarks = student.presentClass === "VI" ? 1050 : student.presentClass === "VII" || student.presentClass === "VIII" ? 1200 : student.presentClass === "IX" || student.presentClass === "X" ? 700 : 500;

              return (
                <div
                  key={examName}
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition-all",
                    isEntered ? "bg-card shadow-xs" : "bg-muted/20 border-dashed"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{examName}</span>
                    {isEntered ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                        Recorded
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted">
                        Pending
                      </Badge>
                    )}
                  </div>

                  {isEntered ? (
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold font-mono text-foreground">
                          {examRes.marksObtained}
                          <span className="text-xs font-normal text-muted-foreground ml-1">/ {examRes.fullMarks}</span>
                        </span>
                        <span className={cn("text-xs font-bold font-mono px-2 py-0.5 rounded", examRes.percentage >= 60 ? "bg-emerald-100 text-emerald-800" : examRes.percentage >= 35 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800")}>
                          {examRes.percentage}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                        <span>Grade: <strong className="text-foreground">{examRes.grade?.split(" ")[0]}</strong></span>
                        <div className="flex items-center gap-2">
                          {examRes.rankInSection && (
                            <span className="font-bold text-amber-700">Sec: #{examRes.rankInSection}</span>
                          )}
                          {examRes.rankInClass && (
                            <span className="font-bold text-primary">Class: #{examRes.rankInClass}</span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setResYear(currentYear);
                          setResExam(examName);
                          setResMarks(String(examRes.marksObtained));
                          setResRemarks(examRes.remarks || "");
                          setResError("");
                          setIsAddResultOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border bg-muted/40 py-1.5 text-xs font-medium hover:bg-muted transition-colors mt-2"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" /> Update {currentYear} Marks
                      </button>
                    </div>
                  ) : (
                    <div className="py-2 text-center space-y-3">
                      <p className="text-xs text-muted-foreground">Marks not yet entered for this exam.</p>
                      <button
                        onClick={() => {
                          setResYear(currentYear);
                          setResExam(examName);
                          setResMarks("");
                          setResRemarks("");
                          setResError("");
                          setIsAddResultOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Enter {examName.split(" ")[0]} Marks
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Trend Chart */}
        {resultHistory.length > 0 && (
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Multi-Year Performance Trend (Percentage)
            </p>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resultHistory.map((r) => ({
                    yearClass: `${r.academicYear} (Cl ${r.class})`,
                    percentage: r.percentage,
                    marks: `${r.marksObtained}/${r.fullMarks}`,
                    grade: r.grade,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="yearClass" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, "Percentage"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {resultHistory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.percentage >= 60 ? "#059669" : entry.percentage >= 35 ? "#d97706" : "#e11d48"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Section 2: Complete Examination History (Past & All Sessions) */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Examination History Log (অতীত শিক্ষাবর্ষের ফলাফল)
            </p>
            <span className="text-xs text-muted-foreground">Total: {resultHistory.length} Exam Records</span>
          </div>

          {resultHistory.length === 0 ? (
            <div className="py-8 text-center rounded-lg border bg-muted/20">
              <Trophy className="h-7 w-7 text-muted-foreground/40 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-foreground">No Historical Exam Records</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Results entered across current and past years will be logged here chronologically.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto shadow-2xs">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/70 border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Year</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Class / Sec / Roll</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Exam Name</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Marks Obtained</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Percentage</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Grade</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Section Rank</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">Class Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resultHistory.map((res) => (
                    <tr key={res.id} className={cn("transition-colors", res.academicYear === currentYear ? "bg-emerald-50/20" : "hover:bg-muted/30")}>
                      <td className="px-3 py-2.5 text-xs font-bold font-mono text-foreground">
                        {res.academicYear}
                        {res.academicYear === currentYear && (
                          <span className="ml-1.5 inline-block text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded">Current</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        Class {res.class} - {res.section} (Roll: {res.roll})
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-foreground">{res.examName}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono font-bold">
                        {res.marksObtained} <span className="text-[10px] text-muted-foreground font-normal">/ {res.fullMarks}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-mono">
                        <span className={cn("font-bold", res.percentage >= 60 ? "text-emerald-700" : res.percentage >= 35 ? "text-amber-700" : "text-rose-600")}>
                          {res.percentage}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {res.grade ? (
                          <Badge variant="outline" className="text-[10px]">
                            {res.grade.split(" ")[0]}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold text-amber-700">
                        {res.rankInSection ? (
                          res.rankInSection === 1 ? "🥇 1st" : res.rankInSection === 2 ? "🥈 2nd" : res.rankInSection === 3 ? "🥉 3rd" : `${res.rankInSection}th`
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold text-primary">
                        {res.rankInClass ? (
                          res.rankInClass === 1 ? "🥇 1st" : res.rankInClass === 2 ? "🥈 2nd" : res.rankInClass === 3 ? "🥉 3rd" : `${res.rankInClass}th`
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
