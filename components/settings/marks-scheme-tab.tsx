"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  BookOpen,
  Sliders,
  RotateCcw,
  Edit2,
  Plus,
  Trash2,
  CheckCircle2,
  Trophy,
  Save,
  X,
  Info,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import { cn } from "@/lib/utils";
import {
  type ClassMarksScheme,
  type PromotionPolicy,
  DEFAULT_MARKS_SCHEMES,
  DEFAULT_PROMOTION_POLICY,
  MASTER_SUBJECT_BANK,
  getSavedMarksSchemes,
  saveMarksSchemes,
  getSavedPromotionPolicy,
  savePromotionPolicy,
  computeSchemeTotals,
} from "@/lib/utils/marks-config";
import {
  syncMarksSchemeSubjectToRoutine,
  syncRemoveMarksSchemeSubjectFromRoutine,
} from "@/lib/routine/routine-sync";
import { detectSubjectStream } from "@/lib/routine/routine-helpers";
import { STANDARD_HS_STREAMS } from "@/lib/utils/school-profile";

export function MarksSchemeTab() {
  const [marksSchemes, setMarksSchemes] = useState<ClassMarksScheme[]>(DEFAULT_MARKS_SCHEMES);
  const [editingScheme, setEditingScheme] = useState<ClassMarksScheme | null>(null);
  const [editSchemeSubjectCount, setEditSchemeSubjectCount] = useState<number>(5);
  const [editScheme1stWritten, setEditScheme1stWritten] = useState<number>(20);
  const [editScheme1stPractical, setEditScheme1stPractical] = useState<number>(0);
  const [editScheme2ndWritten, setEditScheme2ndWritten] = useState<number>(30);
  const [editScheme2ndPractical, setEditScheme2ndPractical] = useState<number>(0);
  const [editSchemeAnnualWritten, setEditSchemeAnnualWritten] = useState<number>(50);
  const [editSchemeAnnualPractical, setEditSchemeAnnualPractical] = useState<number>(0);
  const [editSchemeOddWritten, setEditSchemeOddWritten] = useState<number>(40);
  const [editSchemeOddPractical, setEditSchemeOddPractical] = useState<number>(10);
  const [editSchemeEvenWritten, setEditSchemeEvenWritten] = useState<number>(40);
  const [editSchemeEvenPractical, setEditSchemeEvenPractical] = useState<number>(10);
  const [editSchemeOddSemMarks, setEditSchemeOddSemMarks] = useState<number>(50);
  const [editSchemeEvenSemMarks, setEditSchemeEvenSemMarks] = useState<number>(50);
  const [editSchemeNotes, setEditSchemeNotes] = useState<string>("");

  // Class Subject Selection State
  const [selectedSubjectClass, setSelectedSubjectClass] = useState<string>("V");
  const [selectedSubjectStream, setSelectedSubjectStream] = useState<"all" | "Common" | "Science" | "Arts" | "Commerce">("all");
  const [selectedNewSubjectToAdd, setSelectedNewSubjectToAdd] = useState<string>("");
  const [customSubjectName, setCustomSubjectName] = useState<string>("");

  // Promotion & Pass Criteria State
  const [promotionPolicy, setPromotionPolicy] = useState<PromotionPolicy>(DEFAULT_PROMOTION_POLICY);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  useEffect(() => {
    try {
      const loadedSchemes = getSavedMarksSchemes();
      setMarksSchemes(loadedSchemes);
      const loadedPolicy = getSavedPromotionPolicy();
      setPromotionPolicy(loadedPolicy);
    } catch (e) {
      console.error("Failed to load local marks schemes", e);
    }

    import("@/lib/utils/school-config-client").then(({ fetchSchoolConfigClient }) => {
      fetchSchoolConfigClient()
        .then((data) => {
          if (data) {
            if (data.marks_schemes && Array.isArray(data.marks_schemes) && data.marks_schemes.length > 0) {
              setMarksSchemes(data.marks_schemes);
              localStorage.setItem("sms_marks_distribution_schemes", JSON.stringify(data.marks_schemes));
            }
            if (data.promotion_policy) {
              setPromotionPolicy(data.promotion_policy);
              localStorage.setItem("sms_promotion_pass_policy", JSON.stringify(data.promotion_policy));
            }
          }
        })
        .catch((err) => console.warn("Failed to sync marks scheme from DB:", err));
    });

    const handleMarksUpdate = () => {
      const fresh = getSavedMarksSchemes();
      setMarksSchemes(fresh);
    };
    window.addEventListener("sms_marks_schemes_updated", handleMarksUpdate);
    return () => {
      window.removeEventListener("sms_marks_schemes_updated", handleMarksUpdate);
    };
  }, []);

  const handleSavePromotionPolicy = () => {
    setIsSavingPolicy(true);
    try {
      savePromotionPolicy(promotionPolicy);
      showToast({
        type: "success",
        title: "Promotion Policy Saved",
        description: `Pass threshold set to ${promotionPolicy.subjectPassPercentage}% per subject.`,
      });
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleOpenEditScheme = (scheme: ClassMarksScheme) => {
    setEditingScheme(scheme);
    setEditSchemeSubjectCount(scheme.subjectCount || 5);
    setEditScheme1stWritten(scheme.firstSummativeWritten || 0);
    setEditScheme1stPractical(scheme.firstSummativePractical || 0);
    setEditScheme2ndWritten(scheme.secondSummativeWritten || 0);
    setEditScheme2ndPractical(scheme.secondSummativePractical || 0);
    setEditSchemeAnnualWritten(scheme.annualWritten || 0);
    setEditSchemeAnnualPractical(scheme.annualPractical || 0);

    const oddW = scheme.oddSemesterWritten !== undefined
      ? scheme.oddSemesterWritten
      : (scheme.firstSummativeWritten !== undefined ? scheme.firstSummativeWritten : 40);
    const oddP = scheme.oddSemesterPractical !== undefined
      ? scheme.oddSemesterPractical
      : (scheme.firstSummativePractical !== undefined ? scheme.firstSummativePractical : 10);
    const evenW = scheme.evenSemesterWritten !== undefined
      ? scheme.evenSemesterWritten
      : (scheme.secondSummativeWritten !== undefined ? scheme.secondSummativeWritten : 40);
    const evenP = scheme.evenSemesterPractical !== undefined
      ? scheme.evenSemesterPractical
      : (scheme.secondSummativePractical !== undefined ? scheme.secondSummativePractical : 10);

    setEditSchemeOddWritten(oddW);
    setEditSchemeOddPractical(oddP);
    setEditSchemeEvenWritten(evenW);
    setEditSchemeEvenPractical(evenP);
    setEditSchemeOddSemMarks(oddW + oddP);
    setEditSchemeEvenSemMarks(evenW + evenP);
    setEditSchemeNotes(scheme.notes || "");
  };

  const handleSaveEditScheme = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheme) return;

    const isHs = editingScheme.classCode === "XI" || editingScheme.classCode === "XII" || editingScheme.isSemesterSystem;

    const updated: ClassMarksScheme[] = marksSchemes.map((s) => {
      if (s.classCode === editingScheme.classCode) {
        return {
          ...s,
          subjectCount: editSchemeSubjectCount,
          firstSummativeWritten: isHs ? editSchemeOddWritten : editScheme1stWritten,
          firstSummativePractical: isHs ? editSchemeOddPractical : editScheme1stPractical,
          secondSummativeWritten: isHs ? editSchemeEvenWritten : editScheme2ndWritten,
          secondSummativePractical: isHs ? editSchemeEvenPractical : editScheme2ndPractical,
          annualWritten: isHs ? editSchemeEvenWritten : editSchemeAnnualWritten,
          annualPractical: isHs ? editSchemeEvenPractical : editSchemeAnnualPractical,
          oddSemesterWritten: editSchemeOddWritten,
          oddSemesterPractical: editSchemeOddPractical,
          oddSemesterMarks: editSchemeOddWritten + editSchemeOddPractical,
          evenSemesterWritten: editSchemeEvenWritten,
          evenSemesterPractical: editSchemeEvenPractical,
          evenSemesterMarks: editSchemeEvenWritten + editSchemeEvenPractical,
          notes: editSchemeNotes.trim() || undefined,
        };
      }
      return s;
    });

    setMarksSchemes(updated);
    saveMarksSchemes(updated);
    setEditingScheme(null);

    showToast({
      type: "success",
      title: "Scheme Updated",
      description: `Evaluation scheme for ${editingScheme.className} updated successfully.`,
    });
  };

  const handleResetDefaultSchemes = () => {
    if (window.confirm("Reset all class marks evaluation schemes to standard WBBSE & WBCHSE defaults?")) {
      setMarksSchemes(DEFAULT_MARKS_SCHEMES);
      saveMarksSchemes(DEFAULT_MARKS_SCHEMES);
      showToast({
        type: "info",
        title: "Defaults Restored",
        description: "Standard WBBSE & WBCHSE marks distribution restored.",
      });
    }
  };

  const handleAddSubjectToClass = (classCode: string, subjectName: string) => {
    const cleanSub = subjectName.trim();
    if (!cleanSub) return;

    const target = marksSchemes.find((s) => s.classCode === classCode);
    if (!target) return;

    const existing = target.subjects || [];
    if (existing.some((x) => x.toLowerCase().trim() === cleanSub.toLowerCase().trim())) {
      showToast({
        type: "info",
        title: "Subject Already Added",
        description: `"${cleanSub}" is already present in ${target.className} curriculum.`,
      });
      return;
    }

    const newSubs = [...existing, cleanSub];
    const updated = marksSchemes.map((s) => {
      if (s.classCode === classCode) {
        return {
          ...s,
          subjects: newSubs,
          subjectCount: newSubs.length,
        };
      }
      return s;
    });

    setMarksSchemes(updated);
    saveMarksSchemes(updated);
    syncMarksSchemeSubjectToRoutine(classCode, cleanSub);

    showToast({
      type: "success",
      title: "Subject Added",
      description: `Added "${cleanSub}" to ${target.className} curriculum.`,
    });

    setSelectedNewSubjectToAdd("");
    setCustomSubjectName("");
  };

  const handleRemoveSubjectFromClass = (classCode: string, subjectToRemove: string) => {
    const target = marksSchemes.find((s) => s.classCode === classCode);
    if (!target) return;
    const existing = target.subjects || [];
    if (existing.length <= 1) {
      showToast({
        type: "error",
        title: "Cannot Remove",
        description: "A class must have at least one subject in its marks scheme.",
      });
      return;
    }

    const updated = marksSchemes.map((s) => {
      if (s.classCode === classCode) {
        const newSubs = (s.subjects || []).filter((sub) => sub !== subjectToRemove);
        return {
          ...s,
          subjects: newSubs,
          subjectCount: newSubs.length,
        };
      }
      return s;
    });

    setMarksSchemes(updated);
    saveMarksSchemes(updated);
    syncRemoveMarksSchemeSubjectFromRoutine(classCode, subjectToRemove);

    showToast({
      type: "success",
      title: "Subject Removed",
      description: `Removed "${subjectToRemove}" from ${target.className}.`,
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      {/* 1. Secondary Classes (V - X) 3-Summative Evaluation Table Card */}
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

      {/* 2. Higher Secondary (XI & XII) Semester Marks Scheme Table Card */}
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
                              {totals.oddWritten !== undefined ? totals.oddWritten : 40}w
                              <span className="text-amber-600 font-semibold"> + {totals.oddPractical !== undefined ? totals.oddPractical : 10}p</span>
                              <span className="text-neutral-500 font-mono"> ({totals.oddSemSubTotal}/sub)</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="font-bold font-mono text-foreground text-xs">
                              {totals.secondExamTotal} <span className="text-[10px] text-muted-foreground font-normal">Marks</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {totals.evenWritten !== undefined ? totals.evenWritten : 40}w
                              <span className="text-amber-600 font-semibold"> + {totals.evenPractical !== undefined ? totals.evenPractical : 10}p</span>
                              <span className="text-neutral-500 font-mono"> ({totals.evenSemSubTotal}/sub)</span>
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

      {/* Card 3: Subject Curriculum & Bank Manager */}
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
                        if (val) setCustomSubjectName("");
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

                  <div className="w-full sm:w-48">
                    <Input
                      placeholder="Or custom subject..."
                      value={customSubjectName}
                      onChange={(e) => {
                        setCustomSubjectName(e.target.value);
                        if (e.target.value) setSelectedNewSubjectToAdd("");
                      }}
                      className={cn("h-9 text-xs", isCustomDuplicate && "border-amber-500 focus-visible:ring-amber-500/30 text-amber-900 dark:text-amber-300")}
                    />
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isCustomDuplicate}
                    onClick={() => {
                      const subToAdd = selectedNewSubjectToAdd || customSubjectName;
                      if (subToAdd) {
                        handleAddSubjectToClass(activeScheme.classCode, subToAdd);
                      } else {
                        showToast({
                          type: "info",
                          title: "Select Subject",
                          description: "Please choose or type a subject to add.",
                        });
                      }
                    }}
                    className={cn(
                      "w-full sm:w-auto h-9 text-xs font-semibold gap-1.5 px-4 shadow-xs",
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

      {/* Card 4: Promotion & Pass Criteria Policy */}
      <Card className="border bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span>Promotion &amp; Pass Criteria Policy</span>
                  <Badge variant="outline" className="text-[10px] bg-background font-medium">
                    Session &amp; Promotion Rules
                  </Badge>
                </CardTitle>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSavePromotionPolicy}
              disabled={isSavingPolicy}
              className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSavingPolicy ? "Saving..." : "Save Policy"}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Classes V – VIII (RTE Auto-Promotion)</span>
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 font-semibold px-2.5 py-1">
                100% Auto-Pass
              </Badge>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Class IX &amp; X Per-Subject Pass %</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={promotionPolicy.subjectPassPercentage ?? 30}
                  onChange={(e) =>
                    setPromotionPolicy((prev) => ({
                      ...prev,
                      subjectPassPercentage: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    }))
                  }
                  className="font-mono text-sm font-bold rounded-lg border border-blue-300 bg-background px-2 py-1 w-16 text-blue-700 dark:text-blue-400 text-center"
                />
                <span className="text-xs font-bold text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EDIT MARKS SCHEME MODAL */}
      <Dialog open={!!editingScheme} onOpenChange={(open) => !open && setEditingScheme(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Edit Marks Scheme: {editingScheme?.className}
            </DialogTitle>
          </DialogHeader>

          {editingScheme && (
            <form onSubmit={handleSaveEditScheme} className="space-y-4 pt-2">
              {editingScheme.classCode === "XI" || editingScheme.classCode === "XII" ? (
                <div className="space-y-3">
                  {/* Odd Semester Configuration */}
                  <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-xs font-bold text-foreground">
                        {editingScheme.classCode === "XI" ? "Odd Semester (Sem 1)" : "Odd Semester (Sem 3)"}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {editSchemeOddWritten + editSchemeOddPractical} Marks / sub
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Written / Theory</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editSchemeOddWritten}
                          onChange={(e) => setEditSchemeOddWritten(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Practical / Project</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editSchemeOddPractical}
                          onChange={(e) => setEditSchemeOddPractical(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Even Semester Configuration */}
                  <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-xs font-bold text-foreground">
                        {editingScheme.classCode === "XI" ? "Even Semester (Sem 2)" : "Even Semester (Sem 4)"}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {editSchemeEvenWritten + editSchemeEvenPractical} Marks / sub
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Written / Theory</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editSchemeEvenWritten}
                          onChange={(e) => setEditSchemeEvenWritten(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Practical / Project</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editSchemeEvenPractical}
                          onChange={(e) => setEditSchemeEvenPractical(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grand Total Preview */}
                  <div className="rounded-lg p-2.5 bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Grand Total Marks (Annual):</span>
                    <span className="font-mono font-extrabold text-xs text-indigo-700 dark:text-indigo-300">
                      {editSchemeSubjectCount * (editSchemeOddWritten + editSchemeOddPractical + editSchemeEvenWritten + editSchemeEvenPractical)} Marks
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-xs font-bold text-foreground">1st Summative</span>
                      <span className="text-[11px] font-mono font-bold text-primary">
                        Total: {editSchemeSubjectCount * ((Number(editScheme1stWritten) || 0) + (Number(editScheme1stPractical) || 0))} Marks
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editScheme1stWritten}
                          onChange={(e) => setEditScheme1stWritten(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Practical / Oral</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editScheme1stPractical}
                          onChange={(e) => setEditScheme1stPractical(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-xs font-bold text-foreground">2nd Summative</span>
                      <span className="text-[11px] font-mono font-bold text-primary">
                        Total: {editSchemeSubjectCount * ((Number(editScheme2ndWritten) || 0) + (Number(editScheme2ndPractical) || 0))} Marks
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editScheme2ndWritten}
                          onChange={(e) => setEditScheme2ndWritten(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Practical / Oral</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editScheme2ndPractical}
                          onChange={(e) => setEditScheme2ndPractical(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border space-y-1.5 bg-card">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-xs font-bold text-foreground">3rd / Annual Exam</span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        Total: {editSchemeSubjectCount * ((Number(editSchemeAnnualWritten) || 0) + (Number(editSchemeAnnualPractical) || 0))} Marks
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Written (per sub)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editSchemeAnnualWritten}
                          onChange={(e) => setEditSchemeAnnualWritten(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Practical / Project</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editSchemeAnnualPractical}
                          onChange={(e) => setEditSchemeAnnualPractical(parseFloat(e.target.value) || 0)}
                          className="text-xs font-mono h-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg p-2.5 bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Grand Total Marks:</span>
                    <span className="font-mono font-extrabold text-xs text-primary">
                      {editSchemeSubjectCount * (
                        (Number(editScheme1stWritten) || 0) +
                        (Number(editScheme1stPractical) || 0) +
                        (Number(editScheme2ndWritten) || 0) +
                        (Number(editScheme2ndPractical) || 0) +
                        (Number(editSchemeAnnualWritten) || 0) +
                        (Number(editSchemeAnnualPractical) || 0)
                      )}{" "}
                      Marks
                    </span>
                  </div>
                </>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingScheme(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-primary-foreground gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Save Scheme
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
