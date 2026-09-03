"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents, getStudentResultHistory, getClassResults } from "@/lib/data/students";
import { Student, StudentResult, ClassResultsSummary } from "@/lib/types";
import {
  MarksheetData,
  DEFAULT_CLASS_IX_SUBJECTS,
  createBlankSubjectRows,
  calculateSubjectRow,
  calculateMarksheetTotals,
  SubjectMarksheetRow,
  buildMarksheetFromDBResults,
  getStandardSubjectsForClass,
  getSampleSubjectsForClass,
  getClassScheme,
} from "@/lib/utils/marksheet-calc";
import {
  MarksheetPrintableView,
  MarksheetPrintableBatchView,
} from "@/components/marksheet/marksheet-printable-view";
import { CustomSelect } from "@/components/ui/custom-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast-banner";
import {
  Printer,
  Search,
  Sparkles,
  ArrowLeft,
  User,
  Users,
  Sliders,
  Award,
  RotateCcw,
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Database,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const STANDARD_SECTIONS = ["ALL", "A", "B", "C", "D"];

function MarksheetGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIdParam = searchParams.get("studentId");
  const modeParam = searchParams.get("mode");
  const classParam = searchParams.get("class");
  const sectionParam = searchParams.get("section");

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
  const [bulkSection, setBulkSection] = useState<string>(sectionParam?.toUpperCase() || "ALL");
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
    }); // "02/09/2026"
  }

  // Master Marksheet State (Single Mode)
  const [marksheet, setMarksheet] = useState<MarksheetData>(() => {
    return {
      academicYear: `${currentYear}`,
      studentName: "Synthia Sanam",
      studentClass: "IX",
      section: "A",
      rollNo: "01",
      studentId: "MHS-2026-0036",
      registrationNo: "WB-2026-98124",
      penNumber: "191802010041234",
      guardianName: "Md. Ruhul Amin",
      subjects: DEFAULT_CLASS_IX_SUBJECTS,
      classTeacherName: "S. K. Gayen",
      issueDate: getLiveDate(),
      promotionStatus: "PROMOTED",
      promotedToClass: "X",
      classRank: "1st",
      attendanceDays: 210,
      totalWorkingDays: 235,
    };
  });

  // Fetch all students for selector
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["all-students-for-marksheet"],
    queryFn: getStudents,
  });

  // Auto-fetch results from Database for single student
  async function fetchStudentResultsFromDB(student: Student) {
    setIsFetchingResults(true);
    try {
      const results: StudentResult[] = await getStudentResultHistory(student.id);
      let classSummary: ClassResultsSummary | null = null;
      try {
        const year = results[0]?.academicYear || Number(marksheet.academicYear) || new Date().getFullYear();
        classSummary = await getClassResults(year, student.presentClass || "IX", "ALL", "1st Summative Evaluation");
      } catch (e) {
        // Non-critical
      }

      if (results && results.length > 0) {
        const dbMarksheetData = buildMarksheetFromDBResults(results, student, classSummary);
        setMarksheet((prev) => ({
          ...prev,
          ...dbMarksheetData,
        }));

        const uniqueExams = Array.from(new Set(results.map((r) => r.examName)));
        setDbResultsLoaded({
          found: true,
          count: results.length,
          examNames: uniqueExams,
        });

        showToast({
          type: "success",
          title: "Results Auto-Fetched",
          description: `Loaded ${results.length} exam result(s) from Database (${uniqueExams.join(", ")})`,
        });
      } else {
        const classSubjects = getStandardSubjectsForClass(student.presentClass);
        const blankRows = createBlankSubjectRows(classSubjects);
        setMarksheet((prev) => ({
          ...prev,
          subjects: blankRows,
        }));
        setDbResultsLoaded({
          found: false,
          count: 0,
          examNames: [],
        });
        showToast({
          type: "info",
          title: "Student Loaded",
          description: `No exam results found in database for ${student.name}. Blank template ready for manual entry.`,
        });
      }
    } catch (err: any) {
      console.error("Auto-fetch results error:", err);
      showToast({
        type: "error",
        title: "Auto-fetch Error",
        description: err.message || "Failed to fetch results from database.",
      });
    } finally {
      setIsFetchingResults(false);
    }
  }

  // Load student by query param if provided
  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const match = students.find((s) => s.id === studentIdParam);
      if (match) {
        handleSelectStudent(match);
      }
    }
  }, [studentIdParam, students]);

  // Handle student selection in Single Mode
  async function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    const nextClassMap: Record<string, string> = {
      V: "VI",
      VI: "VII",
      VII: "VIII",
      VIII: "IX",
      IX: "X",
      X: "XI",
      XI: "XII",
    };
    const currentClass = student.presentClass || "IX";
    const promotedTo = nextClassMap[currentClass] || "Next Higher Class";

    const rollNum = Number(student.presentRoll);
    const defaultRankStr =
      !isNaN(rollNum) && rollNum > 0
        ? rollNum === 1
          ? "1st"
          : rollNum === 2
          ? "2nd"
          : rollNum === 3
          ? "3rd"
          : `${rollNum}th`
        : "1st";

    setMarksheet((prev) => ({
      ...prev,
      studentId: student.schoolId || student.id,
      studentName: student.name,
      studentClass: student.presentClass || "IX",
      section: student.presentSection || "A",
      rollNo: String(student.presentRoll || "01"),
      guardianName: student.guardianName || student.fatherName || "",
      penNumber: student.pen || "",
      promotedToClass: promotedTo,
      classRank: defaultRankStr,
    }));

    await fetchStudentResultsFromDB(student);
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

  // Bulk Mode: Filter students by class & section, sorted by Roll No ascending
  const classRoster = useMemo(() => {
    const normClass = bulkClass.toUpperCase().trim();
    const normSec = bulkSection.toUpperCase().trim();

    return students
      .filter((s) => {
        const cMatch = String(s.presentClass || "").toUpperCase().trim() === normClass;
        if (!cMatch) return false;
        if (normSec !== "ALL") {
          return String(s.presentSection || "A").toUpperCase().trim() === normSec;
        }
        return true;
      })
      .sort((a, b) => {
        const rollA = parseInt(String(a.presentRoll || "9999"), 10) || 9999;
        const rollB = parseInt(String(b.presentRoll || "9999"), 10) || 9999;
        return rollA - rollB;
      });
  }, [students, bulkClass, bulkSection]);

  // Automatically select all students when class or section changes in bulk mode
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
    queryKey: ["class-results-for-bulk", bulkClass, bulkSection, bulkAcademicYear],
    queryFn: () =>
      getClassResults(
        parseInt(bulkAcademicYear, 10) || currentYear,
        bulkClass,
        bulkSection === "ALL" ? undefined : bulkSection,
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
          section: s.presentSection || "A",
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
        section: s.presentSection || "A",
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
        attendanceDays: 210,
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

  // Clear scores (Single Mode)
  function handleClearScores() {
    setMarksheet((prev) => ({
      ...prev,
      subjects: createBlankSubjectRows(prev.subjects.map((s) => s.subjectName)),
    }));
    showToast({
      type: "info",
      title: "Scores Cleared",
      description: "All assessment marks reset to blank for fresh entry.",
    });
  }

  // Print Handler
  function handlePrint() {
    if (generatorMode === "single") {
      setMarksheet((prev) => ({
        ...prev,
        issueDate: getLiveDate(),
      }));
    } else {
      setBulkIssueDate(getLiveDate());
    }
    setTimeout(() => {
      window.print();
    }, 50);
  }

  const activeScheme = getClassScheme(marksheet.studentClass);
  const activeSubjectMax =
    (activeScheme?.firstSummativeWritten || 40) +
    (activeScheme?.firstSummativePractical || 10) +
    (activeScheme?.secondSummativeWritten || 40) +
    (activeScheme?.secondSummativePractical || 10) +
    (activeScheme?.annualWritten || 90) +
    (activeScheme?.annualPractical || 10) || 200;
  const grandTotals = calculateMarksheetTotals(marksheet.subjects, activeSubjectMax);

  // Toggle selection in bulk mode
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

  return (
    <div className="p-3.5 sm:p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Top Action Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>CCE Marksheet &amp; Progress Report</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono"
              >
                Generator
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Official Continuous &amp; Comprehensive Evaluation (WBBSE) 3-Term Marksheet Studio.
            </p>
          </div>
        </div>

        {/* Mode Switcher + Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Switcher Segmented Control */}
          <div className="flex items-center rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            <button
              onClick={() => setGeneratorMode("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                generatorMode === "single"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5 text-amber-600" />
              <span>Single Student</span>
            </button>
            <button
              onClick={() => setGeneratorMode("bulk")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                generatorMode === "bulk"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Class Batch (Bulk)</span>
              {classRoster.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary">
                  {selectedStudentIds.length}
                </span>
              )}
            </button>
          </div>

          {generatorMode === "single" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFillSampleData}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Load Sample Marks</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleClearScores}
                className="h-8 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear Scores</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 bg-[#14206b] hover:bg-[#14206b]/90 text-white shadow-sm font-semibold cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>
              {generatorMode === "bulk"
                ? `Print All Marksheets (${selectedStudentIds.length} Pages)`
                : "Print Marksheet"}
            </span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SINGLE MODE CONTENT                                                       */}
      {/* ========================================================================= */}
      {generatorMode === "single" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Data Entry Controls (Scrollable) */}
          <div className="xl:col-span-4 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
            {/* Card 1: Student Selector */}
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
                    <Label className="text-[10px] font-semibold text-muted-foreground">Section</Label>
                    <Input
                      value={marksheet.section}
                      onChange={(e) => setMarksheet({ ...marksheet, section: e.target.value })}
                      className="h-7 text-xs font-semibold"
                    />
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
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground">Reg. No.</Label>
                    <Input
                      value={marksheet.registrationNo}
                      onChange={(e) => setMarksheet({ ...marksheet, registrationNo: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Subject Marks Editor */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>Subject-wise CCE Marks (3 Terms)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {marksheet.subjects.map((sub) => (
                    <div
                      key={sub.id || sub.subjectName}
                      className="p-2.5 rounded-lg border bg-card/60 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{sub.subjectName}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          Total: {sub.overallTotal} / {activeSubjectMax}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Term 1 */}
                        <div className="space-y-1 bg-muted/30 p-1.5 rounded">
                          <span className="text-[10px] font-bold text-muted-foreground">Term 1</span>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder="W"
                              value={sub.term1.periodic}
                              onChange={(e) =>
                                handleMarkChange(sub.id, "term1", "periodic", e.target.value)
                              }
                              className="h-6 text-[10px] px-1 font-mono text-center"
                            />
                            <Input
                              type="number"
                              placeholder="P"
                              value={sub.term1.preparatory}
                              onChange={(e) =>
                                handleMarkChange(sub.id, "term1", "preparatory", e.target.value)
                              }
                              className="h-6 text-[10px] px-1 font-mono text-center"
                            />
                          </div>
                        </div>

                        {/* Term 2 */}
                        <div className="space-y-1 bg-muted/30 p-1.5 rounded">
                          <span className="text-[10px] font-bold text-muted-foreground">Term 2</span>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder="W"
                              value={sub.term2.periodic}
                              onChange={(e) =>
                                handleMarkChange(sub.id, "term2", "periodic", e.target.value)
                              }
                              className="h-6 text-[10px] px-1 font-mono text-center"
                            />
                            <Input
                              type="number"
                              placeholder="P"
                              value={sub.term2.preparatory}
                              onChange={(e) =>
                                handleMarkChange(sub.id, "term2", "preparatory", e.target.value)
                              }
                              className="h-6 text-[10px] px-1 font-mono text-center"
                            />
                          </div>
                        </div>

                        {/* Term 3 (Annual) */}
                        <div className="space-y-1 bg-muted/30 p-1.5 rounded">
                          <span className="text-[10px] font-bold text-muted-foreground">Annual</span>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              placeholder="W"
                              value={sub.term3.periodic}
                              onChange={(e) =>
                                handleMarkChange(sub.id, "term3", "periodic", e.target.value)
                              }
                              className="h-6 text-[10px] px-1 font-mono text-center"
                            />
                            <Input
                              type="number"
                              placeholder="P"
                              value={sub.term3.preparatory}
                              onChange={(e) =>
                                handleMarkChange(sub.id, "term3", "preparatory", e.target.value)
                              }
                              className="h-6 text-[10px] px-1 font-mono text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
            {/* Card 1: Class & Section Selector with Roster Checklist */}
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
                <div className="grid grid-cols-3 gap-2">
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
                    <Label className="text-[10px] font-semibold text-muted-foreground">Section</Label>
                    <CustomSelect
                      value={bulkSection}
                      onChange={(val) => setBulkSection(val)}
                      options={STANDARD_SECTIONS.map((s) => ({
                        label: s === "ALL" ? "All Sec" : `Sec ${s}`,
                        value: s,
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] px-2 py-1 rounded border hover:bg-muted font-semibold text-primary transition-colors cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-[11px] px-2 py-1 rounded border hover:bg-muted font-semibold text-muted-foreground transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Student Checklist Table */}
                <div className="border rounded-xl divide-y max-h-56 overflow-y-auto bg-card text-xs">
                  {displayedRoster.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      No students found in Class {bulkClass}{" "}
                      {bulkSection !== "ALL" ? `Sec ${bulkSection}` : ""}.
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
                              <p className="font-semibold text-foreground text-xs leading-tight">
                                {s.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Roll: <span className="font-bold text-foreground">{s.presentRoll || "—"}</span> • Sec:{" "}
                                {s.presentSection || "A"} • {s.schoolId || s.id}
                              </p>
                            </div>
                          </div>
                          {isChecked && (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-primary/10 text-primary border-primary/30"
                            >
                              Included
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Batch Marksheet Settings */}
            <Card className="border shadow-2xs">
              <CardHeader className="p-4 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                  <Sliders className="h-3.5 w-3.5 text-primary" />
                  <span>Batch Marksheet Particulars</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Class Teacher Name
                    </Label>
                    <Input
                      value={bulkClassTeacher}
                      onChange={(e) => setBulkClassTeacher(e.target.value)}
                      className="text-xs font-semibold h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Issue Date
                    </Label>
                    <Input
                      value={bulkIssueDate}
                      onChange={(e) => setBulkIssueDate(e.target.value)}
                      className="text-xs font-mono h-8"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground flex items-center gap-2">
                  <Database className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    {isLoadingBulkResults
                      ? "Querying database for class examination records..."
                      : classResultsData?.results?.length
                      ? `Found ${classResultsData.results.length} exam entries in DB for this class.`
                      : `No DB exam marks found for Class ${bulkClass} (${bulkAcademicYear}). Using standard evaluation template.`}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Batch Preview Slider & Screen Output */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  Inspection Preview
                </span>
                {bulkMarksheets.length > 0 && (
                  <Badge variant="outline" className="text-[11px] font-mono">
                    Marksheet {currentPreviewIndex + 1} of {bulkMarksheets.length}
                  </Badge>
                )}
              </div>

              {/* Inspector Prev/Next Navigator */}
              {bulkMarksheets.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPreviewIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentPreviewIndex === 0}
                    className="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                    title="Previous Student"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-semibold px-2">
                    {activeBulkPreviewMarksheet.studentName} (Roll:{" "}
                    {activeBulkPreviewMarksheet.rollNo})
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPreviewIndex((prev) =>
                        Math.min(bulkMarksheets.length - 1, prev + 1)
                      )
                    }
                    disabled={currentPreviewIndex >= bulkMarksheets.length - 1}
                    className="p-1.5 rounded-lg border bg-background hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                    title="Next Student"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

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

            {/* Single Screen Preview for inspection (Hidden in print) */}
            <div className="w-full overflow-x-auto rounded-xl border bg-slate-100/80 dark:bg-slate-900/60 p-4 flex justify-center shadow-inner print:hidden">
              {bulkMarksheets.length > 0 ? (
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
              ) : (
                <div className="py-20 text-center text-muted-foreground text-sm">
                  Please select at least 1 student from the left roster to generate marksheets.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH PRINT CANVAS (PRINT ONLY)                                           */}
      {/* Renders all selected students' marksheets with landscape page breaks     */}
      {/* ========================================================================= */}
      {generatorMode === "bulk" && bulkMarksheets.length > 0 && (
        <div id="printable-bulk-marksheet-canvas" className="hidden print:block w-full">
          <MarksheetPrintableBatchView marksheets={bulkMarksheets} />
        </div>
      )}

      {/* Global CSS for Strict Landscape Print Mode */}
      <style jsx global>{`
        @media print {
          /* Hide non-printable elements */
          header,
          aside,
          nav,
          .print\\:hidden,
          button {
            display: none !important;
          }

          /* Exact Landscape Page */
          @page {
            size: landscape;
            margin: 4mm;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Single mode canvas layout */
          #printable-marksheet-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            transform: none !important;
            zoom: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          /* Bulk batch print page break styles */
          .print\\:break-after-page {
            break-after: page !important;
            page-break-after: always !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function MarksheetGeneratorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading Marksheet Generator...</div>}>
      <MarksheetGeneratorContent />
    </Suspense>
  );
}
