"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  MarksheetData,
  DEFAULT_CLASS_IX_SUBJECTS,
  createBlankSubjectRows,
  calculateSubjectRow,
  calculateMarksheetTotals,
  SubjectMarksheetRow,
} from "@/lib/utils/marksheet-calc";
import { MarksheetPrintableView } from "@/components/marksheet/marksheet-printable-view";
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
  Sliders,
  Award,
  RotateCcw,
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
} from "lucide-react";

function MarksheetGeneratorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentIdParam = searchParams.get("studentId");

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.72);

  // Helper for live formatted Indian Date
  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }); // "02/09/2026"
  }

  // Master Marksheet State
  const [marksheet, setMarksheet] = useState<MarksheetData>(() => {
    const currentYear = new Date().getFullYear();
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

  // Load student by query param if provided
  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const match = students.find((s) => s.id === studentIdParam);
      if (match) {
        handleSelectStudent(match);
      }
    }
  }, [studentIdParam, students]);

  // Handle student selection
  function handleSelectStudent(student: Student) {
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
    const rankStr = !isNaN(rollNum) && rollNum > 0
      ? rollNum === 1 ? "1st" : rollNum === 2 ? "2nd" : rollNum === 3 ? "3rd" : `${rollNum}th`
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
      classRank: rankStr,
    }));

    showToast({
      type: "success",
      title: "Student Loaded",
      description: `Loaded ${student.name} (${student.presentClass}-${student.presentSection || "A"})`,
    });
  }

  // Filter students for searchable dropdown
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

  // Update a specific term mark in a subject row
  function handleMarkChange(
    subjectId: string,
    term: "term1" | "term2" | "term3",
    field: "periodic" | "preparatory",
    value: string
  ) {
    setMarksheet((prev) => {
      const maxPeriodic = term === "term3" ? 90 : 40;
      const maxPrep = 10;
      const numVal = value === "" ? "" : Math.min(field === "periodic" ? maxPeriodic : maxPrep, Math.max(0, Number(value)));

      const updatedSubjects = prev.subjects.map((sub) => {
        if (sub.id !== subjectId) return sub;
        const updatedRow: SubjectMarksheetRow = {
          ...sub,
          [term]: {
            ...sub[term],
            [field]: numVal,
          },
        };
        return calculateSubjectRow(updatedRow);
      });

      return {
        ...prev,
        subjects: updatedSubjects,
      };
    });
  }

  // Update highest marks in class
  function handleHighestMarkChange(subjectId: string, value: string) {
    const numVal = value === "" ? "" : Math.min(200, Math.max(0, Number(value)));
    setMarksheet((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === subjectId ? { ...s, highestMarksInClass: numVal } : s)),
    }));
  }

  // Add custom subject
  function handleAddSubject() {
    const newId = `sub-${Date.now()}`;
    const newSubject: SubjectMarksheetRow = {
      id: newId,
      subjectName: "New Subject",
      term1: { periodic: 0, preparatory: 0, total: 0 },
      term2: { periodic: 0, preparatory: 0, total: 0 },
      term3: { periodic: 0, preparatory: 0, total: 0 },
      overallTotal: 0,
      percentage: 0,
      grade: "D",
      highestMarksInClass: 200,
    };
    setMarksheet((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSubject],
    }));
  }

  // Remove subject
  function handleRemoveSubject(id: string) {
    if (marksheet.subjects.length <= 1) {
      showToast({ type: "error", title: "Cannot Remove", description: "Marksheet must have at least one subject." });
      return;
    }
    setMarksheet((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
    }));
  }

  // Fill sample data
  function handleFillSampleData() {
    setMarksheet((prev) => ({
      ...prev,
      subjects: DEFAULT_CLASS_IX_SUBJECTS,
    }));
    showToast({
      type: "success",
      title: "Sample Marks Loaded",
      description: "Class IX standard scores pre-filled across all 7 subjects.",
    });
  }

  // Clear all scores
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
    setMarksheet((prev) => ({
      ...prev,
      issueDate: getLiveDate(),
    }));
    setTimeout(() => {
      window.print();
    }, 50);
  }

  const grandTotals = calculateMarksheetTotals(marksheet.subjects);

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
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono">
                Generator
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Official Continuous &amp; Comprehensive Evaluation (WBBSE) 3-Term Marksheet Studio.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 bg-[#14206b] hover:bg-[#14206b]/90 text-white shadow-sm font-semibold cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Marksheet</span>
          </Button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Data Entry Controls (Scrollable) */}
        <div className="xl:col-span-4 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-140px)] pr-2">
          {/* Card 1: Student Selector */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Student Particulars</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Search Bar */}
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
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            Class {s.presentClass}-{s.presentSection} &bull; Roll {s.presentRoll}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{s.schoolId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Fields */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="space-y-1 col-span-2">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Student Full Name</Label>
                  <Input
                    value={marksheet.studentName}
                    onChange={(e) => setMarksheet({ ...marksheet, studentName: e.target.value })}
                    className="text-xs font-semibold h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Class</Label>
                  <Input
                    value={marksheet.studentClass}
                    onChange={(e) => setMarksheet({ ...marksheet, studentClass: e.target.value })}
                    className="text-xs font-semibold h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Section</Label>
                  <Input
                    value={marksheet.section}
                    onChange={(e) => setMarksheet({ ...marksheet, section: e.target.value })}
                    className="text-xs font-semibold h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Roll No</Label>
                  <Input
                    value={marksheet.rollNo}
                    onChange={(e) => setMarksheet({ ...marksheet, rollNo: e.target.value })}
                    className="text-xs font-semibold h-8 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Student ID</Label>
                  <Input
                    value={marksheet.studentId}
                    onChange={(e) => setMarksheet({ ...marksheet, studentId: e.target.value })}
                    className="text-xs font-semibold h-8 font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Marksheet Meta & Promotion */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>Session &amp; Promotion Meta</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50">
                {grandTotals.resultStatus}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Academic Year</Label>
                <Input
                  value={marksheet.academicYear}
                  onChange={(e) => setMarksheet({ ...marksheet, academicYear: e.target.value })}
                  className="text-xs font-mono font-bold h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Issue Date</Label>
                <Input
                  value={marksheet.issueDate}
                  onChange={(e) => setMarksheet({ ...marksheet, issueDate: e.target.value })}
                  className="text-xs font-mono h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Promotion Status</Label>
                <select
                  value={marksheet.promotionStatus}
                  onChange={(e) => setMarksheet({ ...marksheet, promotionStatus: e.target.value as any })}
                  className="w-full text-xs font-bold h-8 rounded-lg border bg-background px-2 text-[#14206b]"
                >
                  <option value="PROMOTED">PROMOTED</option>
                  <option value="PASSED">PASSED</option>
                  <option value="DETAINED">DETAINED</option>
                  <option value="ELIGIBLE">ELIGIBLE FOR RETEST</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Promoted To Class</Label>
                <Input
                  value={marksheet.promotedToClass}
                  onChange={(e) => setMarksheet({ ...marksheet, promotedToClass: e.target.value })}
                  className="text-xs font-bold h-8 text-[#14206b]"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] font-semibold text-muted-foreground">Class Rank / Position</Label>
                <Input
                  value={marksheet.classRank || ""}
                  onChange={(e) => setMarksheet({ ...marksheet, classRank: e.target.value })}
                  placeholder="e.g. 1st, 2nd, 3rd, Top 10"
                  className="text-xs font-bold h-8 font-mono text-[#14206b]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Marks Input Matrix (Collapsible Table) */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>Subject Scores Entry</span>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddSubject}
                className="h-6 text-[10px] gap-1 px-2 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Subject</span>
              </Button>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="text-[11px] text-muted-foreground font-medium pb-1 border-b flex justify-between">
                <span>Enter 1st (40+10), 2nd (40+10), 3rd (90+10) marks</span>
                <span className="font-bold text-foreground">Totals Auto-Calculate</span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {marksheet.subjects.map((sub, idx) => (
                  <div key={sub.id} className="p-2.5 rounded-lg border bg-muted/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <span className="text-[11px] font-bold text-muted-foreground">{idx + 1}.</span>
                        <Input
                          value={sub.subjectName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMarksheet((prev) => ({
                              ...prev,
                              subjects: prev.subjects.map((s) => (s.id === sub.id ? { ...s, subjectName: val } : s)),
                            }));
                          }}
                          className="text-xs font-bold h-7 py-0"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px] font-bold text-[#14206b]">
                          {sub.overallTotal}/200 ({sub.grade || "-"})
                        </Badge>
                        <button
                          onClick={() => handleRemoveSubject(sub.id)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md cursor-pointer transition-colors"
                          title="Remove subject"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* 3 Term Inputs Grid */}
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      {/* Term 1 */}
                      <div className="space-y-1 bg-background p-1.5 rounded-md border">
                        <span className="font-bold text-muted-foreground block text-[9.5px]">Term 1 (Max 50)</span>
                        <div className="flex gap-1">
                          <Input
                            placeholder="W /40"
                            type="number"
                            value={sub.term1.periodic}
                            onChange={(e) => handleMarkChange(sub.id, "term1", "periodic", e.target.value)}
                            className="h-6 text-[10px] font-mono px-1 text-center"
                          />
                          <Input
                            placeholder="P /10"
                            type="number"
                            value={sub.term1.preparatory}
                            onChange={(e) => handleMarkChange(sub.id, "term1", "preparatory", e.target.value)}
                            className="h-6 text-[10px] font-mono px-1 text-center"
                          />
                        </div>
                      </div>

                      {/* Term 2 */}
                      <div className="space-y-1 bg-background p-1.5 rounded-md border">
                        <span className="font-bold text-muted-foreground block text-[9.5px]">Term 2 (Max 50)</span>
                        <div className="flex gap-1">
                          <Input
                            placeholder="W /40"
                            type="number"
                            value={sub.term2.periodic}
                            onChange={(e) => handleMarkChange(sub.id, "term2", "periodic", e.target.value)}
                            className="h-6 text-[10px] font-mono px-1 text-center"
                          />
                          <Input
                            placeholder="P /10"
                            type="number"
                            value={sub.term2.preparatory}
                            onChange={(e) => handleMarkChange(sub.id, "term2", "preparatory", e.target.value)}
                            className="h-6 text-[10px] font-mono px-1 text-center"
                          />
                        </div>
                      </div>

                      {/* Term 3 */}
                      <div className="space-y-1 bg-background p-1.5 rounded-md border">
                        <span className="font-bold text-muted-foreground block text-[9.5px]">Term 3 (Max 100)</span>
                        <div className="flex gap-1">
                          <Input
                            placeholder="W /90"
                            type="number"
                            value={sub.term3.periodic}
                            onChange={(e) => handleMarkChange(sub.id, "term3", "periodic", e.target.value)}
                            className="h-6 text-[10px] font-mono px-1 text-center"
                          />
                          <Input
                            placeholder="P /10"
                            type="number"
                            value={sub.term3.preparatory}
                            onChange={(e) => handleMarkChange(sub.id, "term3", "preparatory", e.target.value)}
                            className="h-6 text-[10px] font-mono px-1 text-center"
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

        {/* RIGHT COLUMN: Fixed Centered Live Marksheet Preview (Sticky) */}
        <div className="xl:col-span-8 space-y-2 sticky top-4 h-[calc(100vh-140px)] flex flex-col">
          <div className="flex items-center justify-between px-1 print:hidden shrink-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-primary" />
              Live CCE Marksheet (Centered &amp; Fixed)
            </span>

            {/* Interactive Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border text-xs">
              <button
                type="button"
                onClick={() => setPreviewScale((prev) => Math.max(0.45, Math.round((prev - 0.05) * 100) / 100))}
                className="px-1.5 py-0.5 rounded hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer font-mono font-bold"
                title="Zoom Out"
              >
                &minus;
              </button>
              <span className="font-mono text-[11px] font-bold px-1 min-w-[40px] text-center text-[#14206b]">
                {Math.round(previewScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setPreviewScale((prev) => Math.min(1.2, Math.round((prev + 0.05) * 100) / 100))}
                className="px-1.5 py-0.5 rounded hover:bg-background text-muted-foreground hover:text-foreground cursor-pointer font-mono font-bold"
                title="Zoom In"
              >
                +
              </button>
              <div className="h-3 w-[1px] bg-border mx-0.5" />
              <button
                type="button"
                onClick={() => setPreviewScale(0.72)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-semibold cursor-pointer transition-colors ${
                  previewScale === 0.72 ? "bg-primary text-primary-foreground" : "hover:bg-background text-muted-foreground"
                }`}
              >
                Fit Window
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale(1.0)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-semibold cursor-pointer transition-colors ${
                  previewScale === 1.0 ? "bg-primary text-primary-foreground" : "hover:bg-background text-muted-foreground"
                }`}
              >
                100%
              </button>
            </div>
          </div>

          {/* Printable Canvas with Scaling and Centering */}
          <div className="flex-1 w-full bg-slate-200/70 dark:bg-slate-950/70 rounded-2xl border shadow-inner overflow-auto flex items-center justify-center p-2 lg:p-4">
            <div
              id="printable-marksheet-canvas"
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "center center",
                transition: "transform 0.15s ease-out",
              }}
              className="shrink-0"
            >
              <MarksheetPrintableView data={marksheet} />
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Strict 1-Page A4 Landscape Print Mode */}
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

          /* Exact Landscape Page - Full A4 Fit */
          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #printable-marksheet-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 198mm !important;
            overflow: hidden !important;
            transform: none !important;
            zoom: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
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
