"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents, getStudentResultHistory, getClassResults } from "@/lib/data/students";
import type { Student, StudentResult } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  MarksheetData,
  calculateSubjectRow,
  getSampleSubjectsForClass,
  buildMarksheetFromDBResults,
  getStandardSubjectsForClass,
  getClassScheme,
} from "@/lib/utils/marksheet-calc";
import {
  MarksheetPrintableView,
  MarksheetPrintableBatchView,
} from "@/components/marksheet/marksheet-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast-banner";
import {
  Printer,
  Sparkles,
  Search,
  Users,
  User,
  RotateCcw,
  BookOpen,
  Award,
  RefreshCw,
  Calendar,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function MarksheetGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIdParam = searchParams.get("studentId");
  const modeParam = searchParams.get("mode");
  const classParam = searchParams.get("class");

  // Mode: "single" vs "bulk"
  const [generatorMode, setGeneratorMode] = useState<"single" | "bulk">(
    modeParam === "bulk" ? "bulk" : "single"
  );

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewScale, setPreviewScale] = useState<number>(1.0);
  const [isFetchingResults, setIsFetchingResults] = useState(false);
  const [dbResultsLoaded, setDbResultsLoaded] = useState<{
    found: boolean;
    count: number;
    examNames: string[];
  }>({
    found: false,
    count: 0,
    examNames: [],
  });

  // Bulk Mode States
  const currentYear = new Date().getFullYear();
  const [bulkClass, setBulkClass] = useState<string>(classParam?.toUpperCase() || "IX");
  const [bulkAcademicYear, setBulkAcademicYear] = useState<string>(String(currentYear));
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkRosterSearch, setBulkRosterSearch] = useState("");
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [bulkClassTeacher, setBulkClassTeacher] = useState("S. K. Gayen");
  const [bulkIssueDate, setBulkIssueDate] = useState(() => getLiveDate());

  // Helper for live formatted Indian Date
  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }); // "03/09/2026"
  }

  // Master Marksheet State (Single Mode)
  const [marksheet, setMarksheet] = useState<MarksheetData>(() => {
    return {
      academicYear: `${currentYear}`,
      studentName: "Synthia Sanam",
      studentClass: "IX",
      rollNo: "01",
      studentId: "MHS-2026-0036",
      registrationNo: "WB-2026-98124",
      penNumber: "PEN-2026-98124",
      guardianName: "Md. Ruhul Amin",
      subjects: getSampleSubjectsForClass("IX"),
      classTeacherName: "S. K. Gayen",
      issueDate: getLiveDate(),
      promotionStatus: "PROMOTED",
      promotedToClass: "X",
      classRank: "1st",
      attendanceDays: 215,
      totalWorkingDays: 235,
    };
  });

  // Calculate maximum marks per subject based on current class scheme
  const activeClassScheme = useMemo(() => getClassScheme(marksheet.studentClass), [marksheet.studentClass]);
  const activeSubjectMax = useMemo(() => {
    const t1 = (activeClassScheme?.firstSummativeWritten || 40) + (activeClassScheme?.firstSummativePractical || 10);
    const t2 = (activeClassScheme?.secondSummativeWritten || 40) + (activeClassScheme?.secondSummativePractical || 10);
    const t3 = (activeClassScheme?.annualWritten || 90) + (activeClassScheme?.annualPractical || 10);
    return t1 + t2 + t3 || 200;
  }, [activeClassScheme]);

  // Fetch all students for search dropdown and bulk rosters
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["all-students-for-marksheet"],
    queryFn: getStudents,
  });

  // Handle URL studentId query param auto-selection
  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const match = students.find(
        (s) =>
          s.id === studentIdParam ||
          s.schoolId === studentIdParam ||
          s.pen === studentIdParam
      );
      if (match) {
        handleSelectStudent(match);
      }
    }
  }, [studentIdParam, students]);

  // Fetch student examination results from database
  async function fetchStudentResultsFromDB(student: Student) {
    setIsFetchingResults(true);
    try {
      const results: StudentResult[] = await getStudentResultHistory(student.id);

      if (results && results.length > 0) {
        // Also fetch whole class summary to compare highest marks in class
        let classSummary = null;
        try {
          const classResultRes = await getClassResults(
            parseInt(marksheet.academicYear, 10) || currentYear,
            student.presentClass || "IX",
            undefined,
            "Annual Examination"
          );
          classSummary = classResultRes;
        } catch {
          // ignore class summary error
        }

        const generated = buildMarksheetFromDBResults(results, student, classSummary);
        const uniqueExams = Array.from(new Set(results.map((r) => r.examName || "Evaluation")));

        setMarksheet((prev) => {
          const updated = {
            ...prev,
            ...generated,
            studentName: student.name,
            studentClass: student.presentClass || prev.studentClass,
            rollNo: String(student.presentRoll || prev.rollNo),
            studentId: student.schoolId || student.id,
            registrationNo: (student as any).registrationNo || student.pen || prev.registrationNo,
            penNumber: student.pen || prev.penNumber,
            guardianName: student.guardianName || student.fatherName || prev.guardianName,
            issueDate: getLiveDate(),
          };
          return updated;
        });

        setDbResultsLoaded({
          found: true,
          count: results.length,
          examNames: uniqueExams,
        });

        showToast({
          type: "success",
          title: "Database Results Synced",
          description: `Loaded ${results.length} term results for ${student.name} (${uniqueExams.join(", ")}). Highest marks computed.`,
        });
      } else {
        setDbResultsLoaded({ found: false, count: 0, examNames: [] });
        showToast({
          type: "info",
          title: "No DB Results Found",
          description: `No recorded evaluation marks found for ${student.name}. Loaded standard syllabus template for Class ${student.presentClass || "IX"}.`,
        });
      }
    } catch {
      setDbResultsLoaded({ found: false, count: 0, examNames: [] });
      showToast({
        type: "error",
        title: "Sync Error",
        description: "Could not retrieve student results from database.",
      });
    } finally {
      setIsFetchingResults(false);
    }
  }

  // Student selection handler in Single Mode
  function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    const normClass = (student.presentClass || "IX").toUpperCase().trim();

    // Map next class
    const nextClassMap: Record<string, string> = {
      V: "VI",
      VI: "VII",
      VII: "VIII",
      VIII: "IX",
      IX: "X",
      X: "XI",
      XI: "XII",
    };
    const promotedTo = nextClassMap[normClass] || "Next Higher Class";

    setMarksheet((prev) => ({
      ...prev,
      studentName: student.name,
      studentClass: normClass,
      rollNo: String(student.presentRoll || "01"),
      studentId: student.schoolId || student.id,
      registrationNo: (student as any).registrationNo || student.pen || `WB-${prev.academicYear}-${student.schoolId || student.id}`,
      penNumber: student.pen || "",
      guardianName: student.guardianName || student.fatherName || "",
      promotedToClass: promotedTo,
      subjects: getSampleSubjectsForClass(normClass),
      issueDate: getLiveDate(),
    }));

    // Fetch live DB results for selected student
    fetchStudentResultsFromDB(student);
  }

  // Filter students for searchable dropdown (Single Mode)
  const filteredStudents = studentSearch.trim()
    ? students
        .filter(
          (s) =>
            s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.schoolId?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            s.presentClass?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            String(s.presentRoll).includes(studentSearch)
        )
        .slice(0, 6)
    : [];

  // Bulk Mode: Filter students by class, sorted by Roll No ascending
  const classRoster = useMemo(() => {
    const normClass = bulkClass.toUpperCase().trim();

    return students
      .filter((s) => String(s.presentClass || "").toUpperCase().trim() === normClass)
      .sort((a, b) => {
        const rollA = parseInt(String(a.presentRoll || "9999"), 10) || 9999;
        const rollB = parseInt(String(b.presentRoll || "9999"), 10) || 9999;
        return rollA - rollB;
      });
  }, [students, bulkClass]);

  // Automatically select all students when class changes in bulk mode
  useEffect(() => {
    if (classRoster.length > 0) {
      setSelectedStudentIds(classRoster.map((s) => s.id));
      setCurrentPreviewIndex(0);
    } else {
      setSelectedStudentIds([]);
      setCurrentPreviewIndex(0);
    }
  }, [classRoster]);

  // Bulk Mode: Fetch class results from DB for the selected year and class
  const { data: classResultsData, isLoading: isLoadingBulkResults } = useQuery({
    queryKey: ["class-results-for-bulk", bulkClass, bulkAcademicYear],
    queryFn: () =>
      getClassResults(
        parseInt(bulkAcademicYear, 10) || currentYear,
        bulkClass,
        undefined,
        "Annual Examination"
      ),
    enabled: generatorMode === "bulk" && Boolean(bulkClass),
  });

  // Filter roster by local search in bulk mode
  const displayedRoster = useMemo(() => {
    if (!bulkRosterSearch.trim()) return classRoster;
    const q = bulkRosterSearch.toLowerCase().trim();
    return classRoster.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.presentRoll || "").includes(q) ||
        (s.schoolId && s.schoolId.toLowerCase().includes(q))
    );
  }, [classRoster, bulkRosterSearch]);

  // Build Bulk Marksheets Array
  const bulkMarksheets = useMemo<MarksheetData[]>(() => {
    const selected = classRoster.filter((s) => selectedStudentIds.includes(s.id));
    const nextClassMap: Record<string, string> = {
      V: "VI",
      VI: "VII",
      VII: "VIII",
      VIII: "IX",
      IX: "X",
      X: "XI",
      XI: "XII",
    };
    const promotedTo = nextClassMap[bulkClass] || "Next Higher Class";
    const rawClassResults: StudentResult[] = classResultsData?.results || [];

    return selected.map((s, idx) => {
      const rollNum = Number(s.presentRoll) || idx + 1;
      const rankStr =
        rollNum === 1
          ? "1st"
          : rollNum === 2
          ? "2nd"
          : rollNum === 3
          ? "3rd"
          : `${rollNum}th`;

      // Check if DB results exist for this student
      const studentDBResults = rawClassResults.filter(
        (r) => r.studentId === s.id || (r.roll && s.presentRoll && Number(r.roll) === Number(s.presentRoll))
      );

      if (studentDBResults.length > 0) {
        const generated = buildMarksheetFromDBResults(studentDBResults, s, classResultsData);
        return {
          academicYear: bulkAcademicYear,
          studentName: s.name,
          studentClass: s.presentClass || bulkClass,
          rollNo: String(s.presentRoll || idx + 1),
          studentId: s.schoolId || s.id,
          registrationNo: (s as any).registrationNo || s.pen || `WB-${bulkAcademicYear}-${s.schoolId || s.id}`,
          penNumber: s.pen || "",
          guardianName: s.guardianName || s.fatherName || "",
          subjects: generated.subjects || getSampleSubjectsForClass(bulkClass),
          classTeacherName: bulkClassTeacher,
          issueDate: bulkIssueDate,
          promotionStatus: generated.promotionStatus || "PROMOTED",
          promotedToClass: promotedTo,
          classRank: generated.classRank || rankStr,
          attendanceDays: 215,
          totalWorkingDays: 235,
        };
      }

      // Default sample subjects for that class
      return {
        academicYear: bulkAcademicYear,
        studentName: s.name,
        studentClass: s.presentClass || bulkClass,
        rollNo: String(s.presentRoll || idx + 1),
        studentId: s.schoolId || s.id,
        registrationNo: (s as any).registrationNo || s.pen || `WB-${bulkAcademicYear}-${s.schoolId || s.id}`,
        penNumber: s.pen || "",
        guardianName: s.guardianName || s.fatherName || "",
        subjects: getSampleSubjectsForClass(bulkClass),
        classTeacherName: bulkClassTeacher,
        issueDate: bulkIssueDate,
        promotionStatus: "PROMOTED",
        promotedToClass: promotedTo,
        classRank: rankStr,
        attendanceDays: 215,
        totalWorkingDays: 235,
      };
    });
  }, [
    classRoster,
    selectedStudentIds,
    bulkClass,
    bulkAcademicYear,
    bulkClassTeacher,
    bulkIssueDate,
    classResultsData,
  ]);

  // Active preview marksheet in Bulk Mode
  const activeBulkPreviewMarksheet = useMemo(() => {
    if (bulkMarksheets.length === 0) return marksheet;
    const safeIdx = Math.min(currentPreviewIndex, bulkMarksheets.length - 1);
    return bulkMarksheets[safeIdx] || marksheet;
  }, [bulkMarksheets, currentPreviewIndex, marksheet]);

  // Dynamic Class Change (Single Mode)
  function handleClassChange(newClass: string, autoReloadSubjects: boolean = true) {
    const nextClassMap: Record<string, string> = {
      V: "VI",
      VI: "VII",
      VII: "VIII",
      VIII: "IX",
      IX: "X",
      X: "XI",
      XI: "XII",
    };
    const norm = newClass.toUpperCase().trim().replace(/^CLASS\s+/i, "");
    const promotedTo = nextClassMap[norm] || "Next Higher Class";

    setMarksheet((prev) => {
      const updated: MarksheetData = {
        ...prev,
        studentClass: newClass,
        promotedToClass: promotedTo,
      };
      if (autoReloadSubjects) {
        updated.subjects = getSampleSubjectsForClass(norm);
      }
      return updated;
    });
  }

  // Handle mark change for a subject in Single Mode
  function handleMarkChange(
    subjectId: string,
    term: "term1" | "term2" | "term3",
    field: "periodic" | "preparatory",
    value: string
  ) {
    setMarksheet((prev) => {
      const maxPeriodic = term === "term3" ? 90 : 40;
      const numVal = value === "" ? "" : Math.min(maxPeriodic, Math.max(0, parseInt(value, 10) || 0));

      const nextSubjects = prev.subjects.map((s) => {
        if (s.id !== subjectId) return s;
        const updatedTerm = {
          ...s[term],
          [field]: numVal,
          total:
            (field === "periodic" ? (Number(numVal) || 0) : (Number(s[term].periodic) || 0)) +
            (field === "preparatory" ? (Number(numVal) || 0) : (Number(s[term].preparatory) || 0)),
        };
        const updatedRow = {
          ...s,
          [term]: updatedTerm,
        };
        return calculateSubjectRow(updatedRow, activeSubjectMax);
      });
      return { ...prev, subjects: nextSubjects };
    });
  }

  // Fill sample data (Single Mode)
  function handleFillSampleData() {
    const sample = getSampleSubjectsForClass(marksheet.studentClass);
    setMarksheet((prev) => ({
      ...prev,
      subjects: sample,
      issueDate: getLiveDate(),
    }));
    showToast({
      type: "success",
      title: "Sample Marks Loaded",
      description: `Loaded high-performing CCE evaluation marks for Class ${marksheet.studentClass}.`,
    });
  }

  // Clear marks
  function handleClearMarks() {
    setMarksheet((prev) => {
      const cleared = prev.subjects.map((s) =>
        calculateSubjectRow(
          {
            ...s,
            term1: { periodic: "", preparatory: "", total: 0 },
            term2: { periodic: "", preparatory: "", total: 0 },
            term3: { periodic: "", preparatory: "", total: 0 },
            highestMarksInClass: "",
          },
          activeSubjectMax
        )
      );
      return {
        ...prev,
        subjects: cleared,
        classRank: "",
      };
    });
    showToast({
      type: "info",
      title: "Scores Cleared",
      description: "Subject marks reset to blank for fresh data entry.",
    });
  }

  // Bulk Checklist Toggles
  function toggleStudentSelection(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleSelectAll() {
    setSelectedStudentIds(classRoster.map((s) => s.id));
  }

  function handleDeselectAll() {
    setSelectedStudentIds([]);
  }

  // Trigger Native Browser Print
  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ========================================================================= */}
      {/* EMBEDDED PRINT STYLESHEET (STRICT A4 LANDSCAPE 297mm × 210mm)             */}
      {/* ========================================================================= */}
      <style jsx global>{`
        @page {
          size: 297mm 210mm;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 297mm !important;
            height: 210mm !important;
          }
          body * {
            visibility: hidden;
          }
          #pure-print-container,
          #pure-print-container * {
            visibility: visible !important;
          }
          #pure-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          #pure-a4-landscape-marksheet-sheet {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* DEDICATED PRINT CONTAINER (Off-screen on Web, Solo Visible in Print)      */}
      {/* ========================================================================= */}
      <div id="pure-print-container" className="hidden print:block">
        {generatorMode === "single" ? (
          <div className="w-full flex justify-center">
            <MarksheetPrintableView data={marksheet} />
          </div>
        ) : (
          <MarksheetPrintableBatchView marksheets={bulkMarksheets} />
        )}
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER & STUDIO CONTROLS                                              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            title="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center ring-1 ring-amber-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                CCE Marksheet &amp; Progress Report
              </h1>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-amber-600 border-amber-500/30">
                Generator
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Official Continuous &amp; Comprehensive Evaluation (WBBSE) 3-Term Marksheet Studio.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted/70 p-1 rounded-xl border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setGeneratorMode("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                generatorMode === "single"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Single Student</span>
            </button>
            <button
              type="button"
              onClick={() => setGeneratorMode("bulk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                generatorMode === "bulk"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Class Batch (Bulk)</span>
              {classRoster.length > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-mono">
                  {classRoster.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Actions (Single Mode) */}
          {generatorMode === "single" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFillSampleData}
                className="gap-1.5 text-xs h-9 cursor-pointer"
                title="Load standard high scores for this class"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden md:inline">Load Sample Marks</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearMarks}
                className="gap-1.5 text-xs h-9 cursor-pointer"
                title="Reset all subject marks to blank"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Clear Scores</span>
              </Button>
            </>
          )}

          {/* Print Trigger */}
          <Button
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 text-xs h-9 bg-[#14206b] hover:bg-[#14206b]/90 text-white font-bold shadow-md cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>
              {generatorMode === "single"
                ? "Print Marksheet"
                : `Print All (${selectedStudentIds.length}) Marksheets`}
            </span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SINGLE STUDENT GENERATOR CONTENT                                          */}
      {/* ========================================================================= */}
      {generatorMode === "single" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Data Entry Studio Forms */}
          <div className="xl:col-span-4 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
            {/* Card 1: Student Particulars with Database Search */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>Student Particulars</span>
                </CardTitle>
                {selectedStudent && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFetchingResults}
                    onClick={() => fetchStudentResultsFromDB(selectedStudent)}
                    className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
                    title="Re-sync marks from Database"
                  >
                    <RefreshCw
                      className={`h-3 w-3 text-primary ${isFetchingResults ? "animate-spin" : ""}`}
                    />
                    <span>{isFetchingResults ? "Fetching..." : "Re-sync DB"}</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search student by name, roll, or ID..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                  {filteredStudents.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden divide-y text-xs">
                      {filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            handleSelectStudent(s);
                            setStudentSearch("");
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              Class {s.presentClass} &bull; Roll: {s.presentRoll}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {s.schoolId || s.id.slice(0, 8)}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Full Name</Label>
                    <Input
                      value={marksheet.studentName}
                      onChange={(e) => setMarksheet({ ...marksheet, studentName: e.target.value })}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class</Label>
                    <select
                      value={marksheet.studentClass}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full text-xs h-7 rounded-md border border-input bg-background px-2 font-bold"
                    >
                      {STANDARD_CLASSES.map((c) => (
                        <option key={c} value={c}>
                          Class {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Roll No.</Label>
                    <Input
                      value={marksheet.rollNo}
                      onChange={(e) => setMarksheet({ ...marksheet, rollNo: e.target.value })}
                      className="h-7 text-xs font-semibold font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Student ID</Label>
                    <Input
                      value={marksheet.studentId}
                      onChange={(e) => setMarksheet({ ...marksheet, studentId: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Reg. No. / PEN</Label>
                    <Input
                      value={marksheet.registrationNo}
                      onChange={(e) => setMarksheet({ ...marksheet, registrationNo: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>

                {dbResultsLoaded.found && (
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-700 dark:text-emerald-400 space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <span>✓</span>
                      <span>Synced {dbResultsLoaded.count} DB Evaluation Records</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      Terms: {dbResultsLoaded.examNames.join(", ")}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Subject-wise Marks Entry Studio */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Subject-wise CCE Marks (3 Terms)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {marksheet.subjects.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    className="p-2.5 rounded-lg border bg-card/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{sub.subjectName}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        Total: {sub.overallTotal} / {activeSubjectMax}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      {/* Term 1 */}
                      <div className="p-1.5 rounded border bg-muted/20 space-y-1 text-center">
                        <span className="font-semibold text-muted-foreground block">Term 1</span>
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="P (40)"
                            value={sub.term1.periodic}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term1", "periodic", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                          <Input
                            placeholder="Pr (10)"
                            value={sub.term1.preparatory}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term1", "preparatory", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                        </div>
                      </div>

                      {/* Term 2 */}
                      <div className="p-1.5 rounded border bg-muted/20 space-y-1 text-center">
                        <span className="font-semibold text-muted-foreground block">Term 2</span>
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="P (40)"
                            value={sub.term2.periodic}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term2", "periodic", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                          <Input
                            placeholder="Pr (10)"
                            value={sub.term2.preparatory}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term2", "preparatory", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                        </div>
                      </div>

                      {/* Term 3 */}
                      <div className="p-1.5 rounded border bg-muted/20 space-y-1 text-center">
                        <span className="font-semibold text-muted-foreground block">Annual</span>
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="P (90)"
                            value={sub.term3.periodic}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term3", "periodic", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                          <Input
                            placeholder="Pr (10)"
                            value={sub.term3.preparatory}
                            onChange={(e) =>
                              handleMarkChange(sub.id, "term3", "preparatory", e.target.value)
                            }
                            className="h-6 text-[10px] text-center p-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Card 3: Session & Metadata */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Academic Session &amp; Promotion</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Academic Year</Label>
                    <Input
                      value={marksheet.academicYear}
                      onChange={(e) => setMarksheet({ ...marksheet, academicYear: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Issue Date</Label>
                    <Input
                      value={marksheet.issueDate}
                      onChange={(e) => setMarksheet({ ...marksheet, issueDate: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class Rank / Honors</Label>
                    <Input
                      value={marksheet.classRank || ""}
                      onChange={(e) => setMarksheet({ ...marksheet, classRank: e.target.value })}
                      placeholder="1st, 2nd, 3rd, Top 10"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Promoted To Class</Label>
                    <Input
                      value={marksheet.promotedToClass}
                      onChange={(e) => setMarksheet({ ...marksheet, promotedToClass: e.target.value })}
                      className="h-7 text-xs font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Interactive Single Marksheet Preview */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-primary" />
                Live Marksheet Preview (A4 Landscape)
              </span>

              {/* Zoom Scale Controls */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">Scale:</span>
                {[0.75, 0.85, 1.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPreviewScale(s)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      previewScale === s
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {Math.round(s * 100)}%
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Canvas for Single Preview */}
            <div
              id="printable-marksheet-canvas"
              className="w-full overflow-x-auto rounded-xl border bg-slate-100/80 dark:bg-slate-900/60 p-4 flex justify-center shadow-inner print:p-0 print:border-none print:bg-transparent"
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "center top",
                  transition: "transform 0.15s ease-out",
                }}
                className="shrink-0 m-auto"
              >
                <MarksheetPrintableView data={marksheet} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLASS BATCH (BULK) MODE CONTENT                                           */}
      {/* ========================================================================= */}
      {generatorMode === "bulk" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Class Roster & Batch Settings */}
          <div className="xl:col-span-4 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
            {/* Card 1: Class Selector with Roster Checklist */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>Class Marksheet Roster</span>
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {selectedStudentIds.length} / {classRoster.length} Selected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                {/* Selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class</Label>
                    <CustomSelect
                      value={bulkClass}
                      onChange={(val) => setBulkClass(val)}
                      options={STANDARD_CLASSES.map((c) => ({
                        label: `Class ${c}`,
                        value: c,
                      }))}
                      searchable={false}
                      triggerClassName="h-8 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Academic Year</Label>
                    <Input
                      value={bulkAcademicYear}
                      onChange={(e) => setBulkAcademicYear(e.target.value)}
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Search in class roster + Select/Deselect All buttons */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search roster..."
                      value={bulkRosterSearch}
                      onChange={(e) => setBulkRosterSearch(e.target.value)}
                      className="pl-7 text-xs h-7"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[10px] font-semibold text-primary hover:underline px-1 cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-muted-foreground text-[10px]">&bull;</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[10px] font-semibold text-muted-foreground hover:underline px-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Student Checklist Table */}
                <div className="border rounded-xl divide-y max-h-56 overflow-y-auto bg-card text-xs">
                  {displayedRoster.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      No students found in Class {bulkClass}.
                    </div>
                  ) : (
                    displayedRoster.map((s) => {
                      const isChecked = selectedStudentIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleStudentSelection(s.id)}
                          className={`p-2 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                            isChecked ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold text-foreground text-xs leading-tight">
                                {s.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Roll: {s.presentRoll || "–"} &bull; {s.schoolId || s.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Batch Metadata */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span>Batch Signatures &amp; Issue Date</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Class Teacher</Label>
                    <Input
                      value={bulkClassTeacher}
                      onChange={(e) => setBulkClassTeacher(e.target.value)}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Issue Date</Label>
                    <Input
                      value={bulkIssueDate}
                      onChange={(e) => setBulkIssueDate(e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Live Interactive Batch Preview & Pagination */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  Batch Marksheet Preview ({bulkMarksheets.length} Selected)
                </span>

                {bulkMarksheets.length > 0 && (
                  <div className="flex items-center gap-1 bg-muted/70 px-2 py-0.5 rounded-lg border text-xs">
                    <button
                      type="button"
                      disabled={currentPreviewIndex <= 0}
                      onClick={() => setCurrentPreviewIndex((prev) => Math.max(0, prev - 1))}
                      className="p-0.5 rounded hover:bg-background disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-[11px] font-bold">
                      {currentPreviewIndex + 1} / {bulkMarksheets.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPreviewIndex >= bulkMarksheets.length - 1}
                      onClick={() =>
                        setCurrentPreviewIndex((prev) =>
                          Math.min(bulkMarksheets.length - 1, prev + 1)
                        )
                      }
                      className="p-0.5 rounded hover:bg-background disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Zoom Scale Controls */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">Scale:</span>
                {[0.75, 0.85, 1.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPreviewScale(s)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      previewScale === s
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {Math.round(s * 100)}%
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Canvas for Batch Preview */}
            <div
              id="printable-marksheet-canvas"
              className="w-full overflow-x-auto rounded-xl border bg-slate-100/80 dark:bg-slate-900/60 p-4 flex justify-center shadow-inner print:p-0 print:border-none print:bg-transparent"
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "center top",
                  transition: "transform 0.15s ease-out",
                }}
                className="shrink-0 m-auto"
              >
                <MarksheetPrintableView data={activeBulkPreviewMarksheet} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarksheetGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>Loading Marksheet Studio...</span>
          </div>
        </div>
      }
    >
      <MarksheetGeneratorContent />
    </Suspense>
  );
}
