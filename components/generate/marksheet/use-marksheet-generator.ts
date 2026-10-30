"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents, searchStudents, getStudentById, getStudentResultHistory, getClassResults } from "@/lib/data/students";
import { Student, StudentResult } from "@/lib/types";
import { MarksheetData, calculateSubjectRow, getSampleSubjectsForClass, buildMarksheetFromDBResults, getClassScheme } from "@/lib/utils/marksheet-calc";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { showToast } from "@/components/ui/toast-banner";


export function useMarksheetGenerator() {
  const { profile: schoolProfile } = useSchoolProfile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIdParam = searchParams.get("studentId");
  const modeParam = searchParams.get("mode");
  const classParam = searchParams.get("class");

  // Mode: "single" vs "bulk"
  const [generatorMode, setGeneratorModeState] = useState<"single" | "bulk">(
    modeParam === "bulk" ? "bulk" : "single"
  );

  const setGeneratorMode = (m: "single" | "bulk") => {
    setGeneratorModeState(m);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (m === "single") {
        url.searchParams.delete("mode");
      } else {
        url.searchParams.set("mode", m);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [includeDigitalSignature, setIncludeDigitalSignature] = useState<boolean>(true);
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

  // Single Mode: Debounced Search Query
  const debouncedSearch = useDebounce(studentSearch, 300);
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["students", "search", debouncedSearch],
    queryFn: () => searchStudents({ query: debouncedSearch }, 1, 10, "summary"),
    enabled: generatorMode === "single" && debouncedSearch.trim().length > 0,
  });

  const filteredStudents = searchResults?.data || [];

  // Bulk Mode: Class Roster Query
  const { data: bulkStudents = [], isLoading: isBulkLoading } = useQuery<Student[]>({
    queryKey: ["students", "class", bulkClass],
    queryFn: () => getStudents("summary", bulkClass, "all"),
    enabled: generatorMode === "bulk",
    staleTime: 5 * 60 * 1000,
  });

  // Handle URL studentId query param auto-selection directly from API
  useEffect(() => {
    if (studentIdParam) {
      getStudentById(studentIdParam).then((match) => {
        if (match) {
          handleSelectStudent(match);
        }
      }).catch((err) => console.error("Failed to fetch initial student", err));
    }
  }, [studentIdParam]);

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

  // Bulk Mode: Filter students by class, sorted by Roll No ascending
  const classRoster = useMemo(() => {
    const normClass = bulkClass.toUpperCase().trim();

    return bulkStudents
      .filter((s) => String(s.presentClass || "").toUpperCase().trim() === normClass)
      .sort((a, b) => {
        const rollA = parseInt(String(a.presentRoll || "9999"), 10) || 9999;
        const rollB = parseInt(String(b.presentRoll || "9999"), 10) || 9999;
        return rollA - rollB;
      });
  }, [bulkStudents, bulkClass]);

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

  return {
    activeBulkPreviewMarksheet,
    activeSubjectMax,
    bulkAcademicYear,
    bulkClass,
    bulkClassTeacher,
    bulkIssueDate,
    bulkMarksheets,
    bulkRosterSearch,
    classRoster,
    currentPreviewIndex,
    dbResultsLoaded,
    displayedRoster,
    fetchStudentResultsFromDB,
    filteredStudents,
    generatorMode,
    handleClassChange,
    handleClearMarks,
    handleDeselectAll,
    handleFillSampleData,
    handleMarkChange,
    handlePrint,
    handleSelectAll,
    handleSelectStudent,
    includeDigitalSignature,
    isFetchingResults,
    marksheet,
    router,
    schoolProfile,
    selectedStudent,
    selectedStudentIds,
    setBulkAcademicYear,
    setBulkClass,
    setBulkClassTeacher,
    setBulkIssueDate,
    setBulkRosterSearch,
    setCurrentPreviewIndex,
    setGeneratorMode,
    setIncludeDigitalSignature,
    setMarksheet,
    setStudentSearch,
    studentSearch,
    toggleStudentSelection,
  };
}

export type MarksheetGeneratorState = ReturnType<typeof useMarksheetGenerator>;
