"use client";

import { BookOpen, Plus, X, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import { MASTER_SUBJECT_BANK, isSubjectLab, isDefaultLabSubject } from "@/lib/utils/marks-config";
import { detectSubjectStream } from "@/lib/routine/routine-helpers";

import type { MarksSchemeState } from "./use-marks-scheme";

export function SubjectBankCard({ ms }: { ms: MarksSchemeState }) {
  const { customSubjectName, handleAddSubjectToClass, handleRemoveSubjectFromClass, handleToggleSubjectLab, marksSchemes, newSubjectIsLab, selectedNewSubjectToAdd, selectedSubjectClass, selectedSubjectStream, setCustomSubjectName, setNewSubjectIsLab, setSelectedNewSubjectToAdd, setSelectedSubjectClass, setSelectedSubjectStream } = ms;
  return (
    <Card className="border bg-card shadow-xs overflow-visible">
      <CardHeader className="p-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Class Subject Curriculum &amp; Subject Allotment</span>
              </CardTitle>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border">
              {marksSchemes.map((s) => (
                <button
                  key={s.classCode}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectClass(s.classCode);
                    setSelectedNewSubjectToAdd("");
                    setCustomSubjectName("");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all",
                    selectedSubjectClass === s.classCode
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.classCode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 overflow-visible">
        {(() => {
          const activeScheme = marksSchemes.find((s) => s.classCode === selectedSubjectClass) || marksSchemes[0];
          const subjectsList = activeScheme?.subjects || [];
          const isHs = activeScheme.classCode === "XI" || activeScheme.classCode === "XII";

          const filteredSubjects = isHs && selectedSubjectStream !== "all"
            ? subjectsList.filter((sub) => {
                const sStream = detectSubjectStream(sub);
                return sStream === "Common" || sStream === selectedSubjectStream;
              })
            : subjectsList;

          const isCustomDuplicate = customSubjectName.trim()
            ? subjectsList.some((s) => s.toLowerCase().trim() === customSubjectName.trim().toLowerCase())
            : false;

          return (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>Curriculum Subjects for {activeScheme.className}</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {subjectsList.length} Active Subjects
                    </Badge>
                  </h4>
                </div>

                {isHs && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground font-medium">Filter Stream:</span>
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
                      {(["all", "Common", "Science", "Arts", "Commerce"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedSubjectStream(st)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-semibold transition-all",
                            selectedSubjectStream === st
                              ? "bg-background text-foreground shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {st === "all" ? "All" : st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {filteredSubjects.map((sub) => {
                  const sStream = isHs ? detectSubjectStream(sub) : null;
                  const isSubLab = isSubjectLab(activeScheme, sub);
                  return (
                    <span
                      key={sub}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all",
                        sStream === "Science"
                          ? "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 text-cyan-800 dark:text-cyan-300"
                          : sStream === "Commerce"
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300"
                          : sStream === "Arts"
                          ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200 text-purple-800 dark:text-purple-300"
                          : "bg-muted/40 border-border text-foreground"
                      )}
                    >
                      <span>{sub}</span>
                      {sStream && sStream !== "Common" && (
                        <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-background/80 font-bold">
                          {sStream}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleSubjectLab(activeScheme.classCode, sub)}
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all",
                          isSubLab
                            ? "bg-blue-600 text-white shadow-2xs hover:bg-blue-700"
                            : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background border border-border/60"
                        )}
                        title={isSubLab ? "Lab Subject (Click to change to Theory Only)" : "Theory Only (Click to configure 2-period Practical Lab)"}
                      >
                        <FlaskConical className="w-2.5 h-2.5" />
                        <span>{isSubLab ? "Lab" : "+ Lab"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectFromClass(activeScheme.classCode, sub)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                        title="Remove subject"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl border bg-muted/30 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 overflow-visible relative z-20">
                <div className="flex-1">
                  <CustomSelect
                    value={selectedNewSubjectToAdd}
                    onChange={(val) => {
                      setSelectedNewSubjectToAdd(val);
                      if (val) {
                        setCustomSubjectName("");
                        setNewSubjectIsLab(isDefaultLabSubject(val));
                      }
                    }}
                    placeholder="Choose from Master Subject Bank..."
                    options={MASTER_SUBJECT_BANK.flatMap((cat) =>
                      cat.subjects.map((sub) => {
                        const isAlreadyAdded = subjectsList.some(
                          (s) => s.toLowerCase().trim() === sub.toLowerCase().trim()
                        );
                        return {
                          label: sub,
                          value: sub,
                          category: cat.category,
                          disabled: isAlreadyAdded,
                        };
                      })
                    )}
                  />
                </div>

                <div className="w-full sm:w-44">
                  <Input
                    placeholder="Or custom subject..."
                    value={customSubjectName}
                    onChange={(e) => {
                      setCustomSubjectName(e.target.value);
                      if (e.target.value) {
                        setSelectedNewSubjectToAdd("");
                        setNewSubjectIsLab(isDefaultLabSubject(e.target.value));
                      }
                    }}
                    className={cn("h-9 text-xs", isCustomDuplicate && "border-amber-500 focus-visible:ring-amber-500/30 text-amber-900 dark:text-amber-300")}
                  />
                </div>

                <label className="flex items-center gap-1.5 text-xs font-semibold select-none cursor-pointer whitespace-nowrap bg-background border px-2.5 py-1.5 rounded-lg shrink-0 hover:border-primary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={newSubjectIsLab}
                    onChange={(e) => setNewSubjectIsLab(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <FlaskConical className={cn("w-3.5 h-3.5", newSubjectIsLab ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn(newSubjectIsLab ? "text-primary font-bold" : "text-muted-foreground")}>Lab Subject</span>
                </label>

                <Button
                  type="button"
                  size="sm"
                  disabled={isCustomDuplicate}
                  onClick={() => {
                    const subToAdd = selectedNewSubjectToAdd || customSubjectName;
                    if (subToAdd) {
                      handleAddSubjectToClass(activeScheme.classCode, subToAdd, newSubjectIsLab);
                    } else {
                      showToast({
                        type: "info",
                        title: "Select Subject",
                        description: "Please choose or type a subject to add.",
                      });
                    }
                  }}
                  className={cn(
                    "w-full sm:w-auto h-9 text-xs font-semibold gap-1.5 px-4 shadow-xs shrink-0",
                    isCustomDuplicate
                      ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isCustomDuplicate ? "Already in Class" : "Add Subject"}</span>
                </Button>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
