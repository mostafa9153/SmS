"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  useSchoolProfile,
  SchoolProfileData,
} from "@/lib/utils/school-profile";
import {
  getDynamicClassCodes,
  getDynamicSectionsForClass,
  getDatabaseSubjectsForClass,
  syncAllEmsConfigsFromDb,
} from "@/lib/ems/ems-config-loader";
import {
  TabulationSheetPrintableView,
  TabulationStudentItem,
} from "@/components/tabulation/tabulation-sheet-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  FileSpreadsheet,
  BookOpen,
  Users,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCheck,
  RefreshCw,
  ArrowLeft,
  Eye,
} from "lucide-react";

export default function TabulationGeneratorPage() {
  const router = useRouter();
  const { profile: schoolProfile } = useSchoolProfile();

  // Academic year auto-detection
  const [academicYear] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sms_active_academic_year");
      if (saved && !isNaN(parseInt(saved))) return parseInt(saved);
    }
    return new Date().getFullYear();
  });
  const evaluationTitle = "Summative Evaluation";

  // Universal Default School Logo (Synced from DB school_profile or standard fallback)
  const effectiveLogoUrl =
    schoolProfile?.schoolLogoUrl && schoolProfile.schoolLogoUrl.trim() !== ""
      ? schoolProfile.schoolLogoUrl
      : "/school-logo.png";

  // Class, Section, Subject state
  const [availableClasses, setAvailableClasses] = useState<string[]>(["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]);
  const [selectedClass, setSelectedClass] = useState<string>("VII");
  const [selectedSection, setSelectedSection] = useState<string>("B");
  const [selectedSubject, setSelectedSubject] = useState<string>("Bengali");
  const [isAllSubjectsMode, setIsAllSubjectsMode] = useState<boolean>(false);
  const [customSubjectText, setCustomSubjectText] = useState<string>("");

  // Layout & Preview state
  const [zoom, setZoom] = useState<number>(0.75);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [manualCount, setManualCount] = useState<number>(31);

  // Sync freshest classes from DB
  useEffect(() => {
    syncAllEmsConfigsFromDb().then(() => {
      const classes = getDynamicClassCodes();
      if (classes.length > 0) {
        setAvailableClasses(classes);
        if (!classes.includes(selectedClass)) {
          setSelectedClass(classes[0]);
        }
      }
    });
  }, []);

  // Fetch all students from DB (with caching and reactive refetch)
  const { data: allStudents = [], isLoading: isStudentsLoading, refetch } = useQuery({
    queryKey: ["students", "all"],
    queryFn: getStudents,
    staleTime: 60 * 1000,
  });

  // Compute available sections for the selected class
  const availableSections = useMemo(() => {
    return getDynamicSectionsForClass(selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(selectedSection) && selectedSection !== "ALL") {
      setSelectedSection(availableSections[0]);
    }
  }, [availableSections, selectedSection]);

  // Reactive listener for live updates made in Settings -> School Details -> Class Subjects
  const [schemesVersion, setSchemesVersion] = useState(0);
  useEffect(() => {
    const handleSchemesUpdate = () => {
      setSchemesVersion((v) => v + 1);
    };
    window.addEventListener("sms_marks_schemes_updated", handleSchemesUpdate);
    window.addEventListener("storage", handleSchemesUpdate);
    return () => {
      window.removeEventListener("sms_marks_schemes_updated", handleSchemesUpdate);
      window.removeEventListener("storage", handleSchemesUpdate);
    };
  }, []);

  // Compute real available subjects directly from Settings / School Details / Class Subjects (besio na komo na)
  const availableSubjects = useMemo(() => {
    return getDatabaseSubjectsForClass(selectedClass, allStudents);
  }, [selectedClass, allStudents, schemesVersion]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject) && !isAllSubjectsMode) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject, isAllSubjectsMode]);

  // Helper to normalize class strings (e.g. "7", "VII", "Class 7" -> "VII")
  const normalizeClassStr = (raw?: string | null): string => {
    if (!raw) return "";
    const s = String(raw).trim().toUpperCase().replace(/^CLASS\s*[-_]?\s*/i, "");
    const romanMap: Record<string, string> = {
      "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
      "6": "VI", "7": "VII", "8": "VIII", "9": "IX", "10": "X",
      "11": "XI", "12": "XII",
    };
    return romanMap[s] || s;
  };

  // Helper to normalize section strings (e.g. "Sec B", "B" -> "B")
  const normalizeSectionStr = (raw?: string | null): string => {
    if (!raw) return "A";
    const s = String(raw).trim().toUpperCase().replace(/^SEC(TION)?\s*[-_]?\s*/i, "");
    if (s === "ALL") return "ALL";
    return s || "A";
  };

  // Extract student roll number
  const getStudentRollNumber = (s: any): number => {
    if (typeof s.presentRoll === "number" && !isNaN(s.presentRoll)) return s.presentRoll;
    if (typeof s.presentRoll === "string" && !isNaN(parseInt(s.presentRoll))) return parseInt(s.presentRoll);
    if (typeof s.roll === "number" && !isNaN(s.roll)) return s.roll;
    if (typeof s.rollNumber === "number" && !isNaN(s.rollNumber)) return s.rollNumber;
    return 9999;
  };

  // Filter and auto-fetch students strictly matching selected Class, Section, and Subject
  const dbMatchedStudents: TabulationStudentItem[] = useMemo(() => {
    const targetClass = normalizeClassStr(selectedClass);
    const targetSection = normalizeSectionStr(selectedSection);
    const targetSubject = selectedSubject ? selectedSubject.trim().toUpperCase() : "";

    return allStudents
      .filter((s: Student) => {
        const studentClass = normalizeClassStr(s.presentClass);
        const studentSection = normalizeSectionStr(s.presentSection);
        const isContinuing = !s.currentStatus || s.currentStatus.toLowerCase() === "continuing";

        const matchesClassAndSection =
          studentClass === targetClass &&
          (targetSection === "ALL" || studentSection === targetSection);
        if (!matchesClassAndSection || !isContinuing) return false;

        // Subject elective check (Only for Higher Secondary XI/XII streams; in V-X all enrolled students study all subjects)
        const isHigherSecondary = ["XI", "XII"].includes(targetClass);
        if (isHigherSecondary && targetSubject && targetSubject !== "CUSTOM" && !isAllSubjectsMode) {
          const studentElectives = [
            ...(s.mandatorySubjects || []),
            ...(s.additionalSubjects || []),
          ].map((sub) => sub.trim().toUpperCase());

          if (studentElectives.length > 0) {
            const matchesSubject = studentElectives.some(
              (sub) => sub.includes(targetSubject) || targetSubject.includes(sub)
            );
            if (!matchesSubject) return false;
          }
        }

        return true;
      })
      .map((s: Student) => ({
        roll: getStudentRollNumber(s),
        name: (s.name || "").trim().toUpperCase(),
        studentId: s.id,
      }))
      .sort((a, b) => a.roll - b.roll);
  }, [allStudents, selectedClass, selectedSection, selectedSubject, isAllSubjectsMode]);

  // Final student list: DB matched students or graceful numbered blank rows fallback
  const enrolledStudents: TabulationStudentItem[] = useMemo(() => {
    if (dbMatchedStudents.length > 0) {
      return dbMatchedStudents;
    }

    // Fallback if no students in DB for this class/sec: generate empty numbered rows
    return Array.from({ length: manualCount }).map((_, i) => ({
      roll: i + 1,
      name: "",
    }));
  }, [dbMatchedStudents, manualCount]);

  // Keyboard shortcut: Ctrl + P to trigger print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 60);
  };

  // Determine subjects to render
  const subjectsToRender = isAllSubjectsMode
    ? availableSubjects
    : [selectedSubject === "CUSTOM" ? customSubjectText : selectedSubject];

  return (
    <div className="p-3.5 sm:p-6 max-w-[1700px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* ============================================================== */}
      {/* TOP HEADER (Hidden in Print)                                   */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Exam Tabulation Sheet
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Status Pill */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border bg-muted/40 text-muted-foreground">
            <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-foreground">Class {selectedClass}-{selectedSection}</span>
            <span>&bull;</span>
            <span>{enrolledStudents.length} Students</span>
            <span>&bull;</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">
              {isAllSubjectsMode ? `Batch (${availableSubjects.length} Subs)` : selectedSubject}
            </span>
          </div>

          <Button
            onClick={handlePrint}
            className="gap-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer rounded-xl h-9 px-3.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Tabulation Sheet</span>
            <span className="hidden sm:inline-block text-[10px] opacity-80 font-normal bg-black/20 px-1 rounded">
              Ctrl+P
            </span>
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN GRID: Controls (Left) + Canvas Preview (Right)             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
        
        {/* LEFT COLUMN: Controls (Hidden in Print) */}
        <div className="xl:col-span-4 space-y-4 print:hidden">
          
          {/* Card 1: Class & Section Selector */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  Class &amp; Section Selection
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  Year {academicYear}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Class Selector */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Class:</Label>
                  <CustomSelect
                    value={selectedClass}
                    onChange={(val) => setSelectedClass(val)}
                    options={availableClasses.map((c) => ({
                      value: c,
                      label: `Class ${c}`,
                    }))}
                  />
                </div>

                {/* Section Selector */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Section:</Label>
                  <CustomSelect
                    value={selectedSection}
                    onChange={(val) => setSelectedSection(val)}
                    options={[
                      { value: "ALL", label: "All Sections (Entire Class)" },
                      ...availableSections.map((s) => ({
                        value: s,
                        label: `Sec ${s}`,
                      })),
                    ]}
                  />
                </div>
              </div>

              {/* Student Auto-Fetch Status */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Matched Students:</span>
                  <span className="font-mono font-bold text-foreground">
                    {enrolledStudents.length} Students
                  </span>
                </div>

                {dbMatchedStudents.length > 0 ? (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">
                        Auto-fetched <strong>{dbMatchedStudents.length}</strong> students (Roll {dbMatchedStudents[0].roll} &ndash; {dbMatchedStudents[dbMatchedStudents.length - 1].roll})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="p-1 hover:bg-emerald-500/20 rounded text-emerald-700 dark:text-emerald-400 hover:text-foreground shrink-0 ml-1 cursor-pointer transition-colors"
                      title="Refresh student list from database"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold block">No database records found for Class {selectedClass}-{selectedSection}.</span>
                    <span className="text-[11px] text-muted-foreground block">Using {manualCount} numbered blank rows:</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Input
                        type="number"
                        min={10}
                        max={320}
                        step={10}
                        value={manualCount}
                        onChange={(e) => setManualCount(parseInt(e.target.value) || 80)}
                        className="h-7 w-20 text-xs font-mono"
                      />
                      <span className="text-[11px] text-muted-foreground">Rows to print (80/page)</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Subject Selection */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  Subject Selection
                </CardTitle>

                <button
                  type="button"
                  onClick={() => setIsAllSubjectsMode(!isAllSubjectsMode)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer ${
                    isAllSubjectsMode
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isAllSubjectsMode ? "✓ Batch: All Subjects" : "Batch: All Subjects"}
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              {!isAllSubjectsMode ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Choose Specific Subject:</Label>
                    <CustomSelect
                      value={selectedSubject}
                      onChange={(val) => setSelectedSubject(val)}
                      options={[
                        ...availableSubjects.map((sub) => ({
                          value: sub,
                          label: sub,
                        })),
                        { value: "CUSTOM", label: "Custom / Blank Subject" },
                      ]}
                    />
                  </div>

                  {/* 1-Click Quick Subject Selection Buttons */}
                  <div className="pt-2 border-t space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Class {selectedClass} Subjects ({availableSubjects.length}):
                      </span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">1-Click Pick</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSubjects.map((sub) => {
                        const isSelected = selectedSubject === sub;
                        return (
                          <button
                            key={`quick-sub-btn-${sub}`}
                            type="button"
                            onClick={() => setSelectedSubject(sub)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-600 shadow-xs scale-102"
                                : "bg-muted/60 hover:bg-purple-500/10 hover:border-purple-300 text-foreground border-border/80"
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedSubject === "CUSTOM" && (
                    <div className="pt-2 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Type Custom Subject Name:</Label>
                      <Input
                        value={customSubjectText}
                        onChange={(e) => setCustomSubjectText(e.target.value)}
                        placeholder="Leave blank for handwriting..."
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-800 dark:text-purple-300 space-y-1.5">
                  <span className="font-bold flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Generating {availableSubjects.length} Subject Sheets:
                  </span>
                  <p className="text-[11px] leading-relaxed font-mono text-muted-foreground">
                    {availableSubjects.join(", ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Each subject will be rendered on a fresh A4 register sheet (40 rows left + 40 rows right) ready for printing!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Printing Advice Callout */}
          <div className="p-3 bg-muted/40 border rounded-xl text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground block mb-1">💡 Printing Advice:</span>
            In the browser print preview, ensure <strong>Margins: None</strong> and <strong>Background Graphics: Checked</strong> are selected for pixel-perfect A4 zero-margin output (40 rows left &amp; 40 rows right &bull; 80 students/sheet).
          </div>
        </div>

        {/* RIGHT COLUMN: Live Print-Ready Preview Canvas */}
        <div className="xl:col-span-8 space-y-4 print:w-full print:m-0 print:p-0">
          <div className="flex items-center justify-between px-1 print:hidden">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-base font-semibold tracking-tight text-foreground">
                Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-border/80 text-xs text-muted-foreground font-normal bg-background/60">
                A4 Portrait
              </span>
            </div>

            {/* Smooth Line Scale Slider Zoom Control */}
            <div className="flex items-center gap-2 bg-background border border-border/80 px-2.5 py-1 rounded-xl shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <span>Scale:</span>
              </span>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.05).toFixed(2))))}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Zoom Out (-5%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Range Line Scale Slider */}
              <div className="flex items-center w-24 sm:w-32">
                <input
                  type="range"
                  min="0.4"
                  max="1.5"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
                  title={`Slide to zoom: ${Math.round(zoom * 100)}%`}
                />
              </div>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.05).toFixed(2))))}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Zoom In (+5%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {/* Percentage Badge & Reset */}
              <button
                type="button"
                onClick={() => setZoom(0.75)}
                className="px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border border-purple-500/20"
                title="Click to reset to default 75%"
              >
                <span>{Math.round(zoom * 100)}%</span>
                <RotateCcw className="w-2.5 h-2.5 opacity-60 hover:opacity-100" />
              </button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div
            id="tabulation-printable-canvas"
            className="w-full overflow-x-auto rounded-xl border bg-slate-100/80 dark:bg-slate-900/60 p-4 sm:p-6 flex justify-center shadow-inner print:p-0 print:border-none print:bg-transparent print:w-full print:block"
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center top",
                transition: "transform 0.15s ease-out",
              }}
              className="shrink-0 m-auto shadow-2xl print:shadow-none print:transform-none print:w-full print:m-0 print:p-0 print:block"
            >
              {subjectsToRender.map((sub, sIdx) => (
                <div
                  key={`subject-sheet-wrap-${sIdx}`}
                  className={sIdx > 0 ? "mt-12 print:mt-0" : ""}
                  style={{
                    pageBreakAfter: sIdx < subjectsToRender.length - 1 ? "always" : "auto",
                    breakAfter: sIdx < subjectsToRender.length - 1 ? "page" : "auto",
                  }}
                >
                  <TabulationSheetPrintableView
                    schoolProfile={schoolProfile}
                    academicYear={academicYear}
                    evaluationTitle={evaluationTitle}
                    className={selectedClass}
                    section={selectedSection}
                    subject={sub}
                    students={enrolledStudents}
                    showWatermark={showWatermark}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ZERO-MARGIN NATIVE PRINT STYLESHEET                            */}
      {/* ============================================================== */}
      <style jsx global>{`
        @media print {
          @page {
            size: 210mm 297mm;
            margin: 0;
          }

          body,
          html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide non-printable elements */
          header,
          aside,
          nav,
          button,
          .print\\:hidden {
            display: none !important;
          }

          /* Reset Canvas */
          #tabulation-printable-canvas {
            transform: none !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            display: block !important;
          }

          #tabulation-printable-canvas > div {
            transform: none !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          .tabulation-print-container {
            display: block !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .tabulation-page-wrapper {
            display: block !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .tabulation-page-wrapper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .tabulation-sheet {
            width: 210mm !important;
            height: 295mm !important;
            max-height: 295mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
