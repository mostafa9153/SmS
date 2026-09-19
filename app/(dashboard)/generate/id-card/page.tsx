"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  StudentIDCardPrintableView,
} from "@/components/id-card/student-id-card-printable-view";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Printer,
  ArrowLeft,
  Search,
  Users,
  CheckSquare,
  Square,
  Eye,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  GraduationCap,
  AlertTriangle,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/components/ui/toast-banner";

export interface MissingStudentField {
  key: string;
  label: string;
}

export function getMissingStudentFields(student: Student): MissingStudentField[] {
  const missing: MissingStudentField[] = [];
  if (!student.pen || !student.pen.trim()) missing.push({ key: "pen", label: "PEN ID" });
  if (!student.schoolId || !student.schoolId.trim()) missing.push({ key: "schoolId", label: "School ID" });
  if (!student.name || !student.name.trim()) missing.push({ key: "name", label: "Name" });
  if (!student.fatherName && !student.guardianName) missing.push({ key: "fatherName", label: "Father Name" });
  if (!student.studentContact && !student.altMobile) missing.push({ key: "studentContact", label: "Mobile No" });
  if (!student.bloodGroup || !student.bloodGroup.trim()) missing.push({ key: "bloodGroup", label: "Blood Group" });
  if (!student.dob || !student.dob.trim()) missing.push({ key: "dob", label: "DOB" });
  if (!student.photoUrl) missing.push({ key: "photoUrl", label: "Photo" });
  return missing;
}

const CLASS_OPTIONS = [
  { label: "All Classes", value: "all" },
  { label: "Class V", value: "V" },
  { label: "Class VI", value: "VI" },
  { label: "Class VII", value: "VII" },
  { label: "Class VIII", value: "VIII" },
  { label: "Class IX", value: "IX" },
  { label: "Class X", value: "X" },
  { label: "Class XI", value: "XI" },
  { label: "Class XII", value: "XII" },
];

const SECTION_OPTIONS = [
  { label: "All Sections", value: "all" },
  { label: "Section A", value: "A" },
  { label: "Section B", value: "B" },
  { label: "Section C", value: "C" },
  { label: "Section D", value: "D" },
];

function StudentIDCardStudioContent() {
  const { profile: schoolProfile } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  // Filter States
  const [selectedClass, setSelectedClass] = useState<string>("V");
  const [selectedSection, setSelectedSection] = useState<string>("A");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Load students by class and section
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students", selectedClass, selectedSection],
    queryFn: () => getStudents("summary", selectedClass, selectedSection),
  });

  // Selected student IDs for batch printing
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [previewScale, setPreviewScale] = useState<number>(1.35);

  // Custom configurations
  const isHigherSecondary = selectedClass === "XI" || selectedClass === "XII";

  // Session rule: Class V-X = Single year (e.g. 2026), Class XI-XII = 2-year (e.g. 2026-27)
  const defaultSession = useMemo(() => {
    if (isHigherSecondary) {
      const nextShort = (currentYear + 1).toString().slice(-2);
      return `${currentYear}-${nextShort}`;
    }
    return `${currentYear}`;
  }, [isHigherSecondary, currentYear]);

  // Valid Upto rule: Class V-X = 31/12/YYYY, Class XI-XII = editable (defaults to 2-year span)
  const defaultValidUpto = useMemo(() => {
    if (isHigherSecondary) {
      return `30/06/${currentYear + 2}`;
    }
    return `31/12/${currentYear}`;
  }, [isHigherSecondary, currentYear]);

  const [sessionString, setSessionString] = useState<string>(defaultSession);
  const [validUptoString, setValidUptoString] = useState<string>(defaultValidUpto);
  const [cardTitle, setCardTitle] = useState<string>("IDENTITY CARD");

  // Synchronize defaults when class changes
  useEffect(() => {
    setSessionString(defaultSession);
    setValidUptoString(defaultValidUpto);
  }, [defaultSession, defaultValidUpto]);

  // Filter students based on Class, Section, and Search Query
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Class filter
      if (selectedClass !== "all") {
        const studentClass = (s.presentClass || "").trim().toUpperCase();
        if (studentClass !== selectedClass.toUpperCase()) return false;
      }

      // Section filter
      if (selectedSection !== "all") {
        const studentSec = (s.presentSection || "").trim().toUpperCase();
        if (studentSec !== selectedSection.toUpperCase()) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.name || "").toLowerCase().includes(q);
        const matchesFather = (s.fatherName || "").toLowerCase().includes(q);
        const matchesRoll = String(s.presentRoll || "").includes(q);
        const matchesSchoolId = (s.schoolId || "").toLowerCase().includes(q);
        const matchesId = (s.id || "").toLowerCase().includes(q);
        const matchesPen = (s.pen || "").toLowerCase().includes(q);
        if (!matchesName && !matchesFather && !matchesRoll && !matchesSchoolId && !matchesId && !matchesPen) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => (a.presentRoll || 0) - (b.presentRoll || 0));
  }, [students, selectedClass, selectedSection, searchQuery]);

  // Auto-select all filtered students whenever the filtered list changes significantly
  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
      setPreviewIndex(0);
    } else {
      setSelectedStudentIds([]);
    }
  }, [filteredStudents]);

  // Students to be printed
  const studentsToPrint = useMemo(() => {
    return filteredStudents.filter((s) => selectedStudentIds.includes(s.id));
  }, [filteredStudents, selectedStudentIds]);

  // Selected student for preview
  const currentPreviewStudent: Student | undefined = studentsToPrint[previewIndex] || filteredStudents[0];

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Single student printing state (null means bulk mode)
  const [printingSingleStudent, setPrintingSingleStudent] = useState<Student | null>(null);
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);
  const [studentsWithIssues, setStudentsWithIssues] = useState<Student[]>([]);
  const [pendingPrintMode, setPendingPrintMode] = useState<"bulk" | Student | null>(null);

  const executeDirectBulkPrint = (includeAll: boolean = true) => {
    setWarningModalOpen(false);
    let toPrint = studentsToPrint;
    if (!includeAll) {
      toPrint = toPrint.filter((s) => getMissingStudentFields(s).length === 0);
    }
    if (toPrint.length === 0) {
      showToast({ type: "error", title: "No complete cards available to print" });
      return;
    }
    setPrintingSingleStudent(null);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const executeDirectSinglePrint = (student: Student) => {
    setWarningModalOpen(false);
    setPrintingSingleStudent(student);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintingSingleStudent(null);
      }, 1000);
    }, 100);
  };

  // Print Interceptor for Bulk
  const handlePrintBulk = () => {
    if (studentsToPrint.length === 0) return;
    const issues = studentsToPrint.filter((s) => getMissingStudentFields(s).length > 0);
    if (issues.length > 0) {
      setStudentsWithIssues(issues);
      setPendingPrintMode("bulk");
      setWarningModalOpen(true);
      showToast({
        type: "error",
        title: "⚠️ Missing Student Details Found",
        description: `${issues.length} student(s) have missing required IDs (PEN, School ID, Mobile, etc.)`
      });
    } else {
      executeDirectBulkPrint(true);
    }
  };

  // Print Interceptor for Single Card
  const handlePrintSingle = (student: Student) => {
    const issues = getMissingStudentFields(student);
    if (issues.length > 0) {
      setStudentsWithIssues([student]);
      setPendingPrintMode(student);
      setWarningModalOpen(true);
      showToast({
        type: "error",
        title: "⚠️ Missing Information",
        description: `${student.name} is missing: ${issues.map((i) => i.label).join(", ")}`
      });
    } else {
      executeDirectSinglePrint(student);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-12 print:bg-white print:p-0 print:m-0">
      {/* Studio Header (Hidden in Print) */}
      <div className="border-b bg-card print:hidden">
        <div className="max-w-[1700px] mx-auto px-4 py-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/generate"
              className="h-9 w-9 rounded-xl border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  CR80 PVC Single
                </span>
                <span className="text-xs text-muted-foreground">54mm × 85.6mm</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mt-0.5">
                Bulk Student ID Card Studio
              </h1>
            </div>
          </div>

          {/* Print Action Button */}
          <div className="flex items-center gap-2.5">
            <Button
              onClick={handlePrintBulk}
              disabled={studentsToPrint.length === 0}
              size="lg"
              className="rounded-xl px-5 gap-2 font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print {studentsToPrint.length} ID Cards</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace (Hidden in Print) */}
      <div className="max-w-[1700px] mx-auto p-4 sm:p-6 print:hidden space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ================================================================ */}
          {/* LEFT PANEL: Filters, Batch Controls & Student Selection (5 Cols) */}
          {/* ================================================================ */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-5">
            
            {/* Filter Card: Class, Section & Search */}
            <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Class &amp; Batch Filters</h2>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredStudents.length} Found
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Class</Label>
                  <CustomSelect
                    value={selectedClass}
                    onChange={setSelectedClass}
                    options={CLASS_OPTIONS}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Section</Label>
                  <CustomSelect
                    value={selectedSection}
                    onChange={setSelectedSection}
                    options={SECTION_OPTIONS}
                  />
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by student name, roll, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Customization Card: Session, Valid Date, Banner */}
            <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">Session &amp; Validity Rules</h2>
                </div>
                {isHigherSecondary ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                    Class XI-XII (2-Year)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                    Class V-X (Annual)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Academic Session</Label>
                  <Input
                    type="text"
                    value={sessionString}
                    onChange={(e) => setSessionString(e.target.value)}
                    className="text-xs h-8.5 rounded-xl font-mono"
                    placeholder="e.g. 2026 or 2026-27"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    {isHigherSecondary ? "Auto set to 2-year cycle" : "Single year for V–X"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Valid Upto</Label>
                  <Input
                    type="text"
                    value={validUptoString}
                    onChange={(e) => setValidUptoString(e.target.value)}
                    className="text-xs h-8.5 rounded-xl font-mono"
                    placeholder="e.g. 31/12/2026"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    {isHigherSecondary ? "Editable for XI & XII" : "Default: 31st Dec"}
                  </span>
                </div>
              </div>
            </div>

            {/* Student Roster Table with Multi-Select Checkboxes */}
            <div className="rounded-2xl border bg-card shadow-xs overflow-hidden flex flex-col max-h-[500px]">
              <div className="p-3.5 border-b bg-muted/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>
                      Select All ({selectedStudentIds.length}/{filteredStudents.length})
                    </span>
                  </button>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Class {selectedClass} • Sec {selectedSection}
                </span>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-border/60">
                {loadingStudents ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Loading student database...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-bold text-foreground">No students matched</p>
                    <p>Try adjusting the Class or Section filter above.</p>
                  </div>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleStudent(s.id)}
                        className={cn(
                          "p-2.5 px-3.5 flex items-center justify-between text-xs transition-colors cursor-pointer select-none hover:bg-muted/40",
                          isChecked && "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStudent(s.id);
                            }}
                            className="text-blue-600 shrink-0"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-foreground truncate">
                                {s.name}
                              </p>
                              {(() => {
                                const missing = getMissingStudentFields(s);
                                if (missing.length > 0) {
                                  return (
                                    <span
                                      className="text-[9.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0"
                                      title={`Missing: ${missing.map((m) => m.label).join(", ")}`}
                                    >
                                      <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                      {missing.length} missing
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 shrink-0">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              Roll: {s.presentRoll || "—"} • ID: {s.schoolId || s.id}
                              {s.pen ? ` • PEN: ${s.pen}` : " • No PEN"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {s.presentClass}-{s.presentSection || "A"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintSingle(s);
                            }}
                            className="h-7 w-7 rounded-lg border border-transparent hover:border-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer"
                            title={`Print single card for ${s.name}`}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT PANEL: Live Interactive Preview & Pagination (7 Cols)      */}
          {/* ================================================================ */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-center justify-start space-y-4">
            
            {/* Preview Control Bar */}
            <div className="w-full max-w-[440px] bg-card border rounded-2xl p-2.5 px-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={previewIndex <= 0}
                  onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                  className="h-7 w-7 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold font-mono text-foreground">
                  Card {studentsToPrint.length > 0 ? previewIndex + 1 : 0} of {studentsToPrint.length}
                </span>
                <button
                  type="button"
                  disabled={previewIndex >= studentsToPrint.length - 1}
                  onClick={() => setPreviewIndex((p) => Math.min(studentsToPrint.length - 1, p + 1))}
                  className="h-7 w-7 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Print current card only */}
              {currentPreviewStudent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrintSingle(currentPreviewStudent)}
                  className="h-7 text-xs px-2.5 gap-1.5 font-bold rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/40 cursor-pointer"
                  title="Print only this student's CR80 card"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Single</span>
                </Button>
              )}

              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewScale((s) => Math.max(0.8, s - 0.1))}
                  className="h-7 w-7 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-muted-foreground w-10 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewScale((s) => Math.min(1.5, s + 0.1))}
                  className="h-7 w-7 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Live Visual Canvas */}
            <div className="w-full flex items-center justify-center min-h-[580px] p-4 bg-muted/40 border border-dashed rounded-3xl overflow-hidden">
              {currentPreviewStudent ? (
                <div
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: "center top",
                    transition: "transform 0.15s ease",
                  }}
                  className="shadow-2xl rounded-2xl"
                >
                  <StudentIDCardPrintableView
                    student={currentPreviewStudent}
                    schoolProfile={schoolProfile}
                    academicSession={sessionString}
                    validUpto={validUptoString}
                    cardTitle={cardTitle}
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <p className="font-bold text-sm">No student selected</p>
                  <p className="text-xs mt-1">Select at least one student from the left panel to preview.</p>
                </div>
              )}
            </div>

            {/* Printing Format Notice */}
            <div className="text-center text-xs text-muted-foreground max-w-md">
              <p>
                <strong>Printer Mode:</strong> Each ID card is formatted strictly for <strong>CR80 PVC (54mm × 85.6mm)</strong>. Continuous card-by-card printing is active with zero margins.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* WARNING AUDIT MODAL (Visible when missing data is detected)         */}
      {/* ==================================================================== */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Missing Student Information Detected!</h3>
                  <p className="text-xs text-amber-100">Review missing identifiers before printing ID cards</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWarningModalOpen(false)}
                className="text-white/80 hover:text-white text-lg p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Table of Missing Data */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Important Notice:</span> The following student records have missing required fields (such as <strong>PEN ID, School ID, Mobile No, Blood Group, or DOB</strong>). If printed now, placeholder values (e.g. <code>—</code>) will appear on the physical cards.
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Roll &amp; Name</th>
                      <th className="py-2.5 px-3">Class / Sec</th>
                      <th className="py-2.5 px-3">Missing Fields</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground font-medium">
                    {studentsWithIssues.map((st) => {
                      const missing = getMissingStudentFields(st);
                      return (
                        <tr key={st.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-foreground">{st.name}</span>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Roll: {st.presentRoll || "—"} • ID: {st.schoolId || st.id}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-muted-foreground">
                            {st.presentClass} - {st.presentSection || "A"}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {missing.map((m) => (
                                <span
                                  key={m.key}
                                  className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-500/20"
                                >
                                  {m.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={`/students/${st.id}/edit`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-bold underline inline-flex items-center gap-1"
                            >
                              Edit Profile
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-muted/30 px-6 py-3.5 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWarningModalOpen(false)}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close &amp; Review Records
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pendingPrintMode === "bulk") {
                      executeDirectBulkPrint(true);
                    } else if (pendingPrintMode) {
                      executeDirectSinglePrint(pendingPrintMode);
                    }
                  }}
                  className="rounded-xl bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Print Anyway
                </Button>
                {pendingPrintMode === "bulk" && (
                  <Button
                    size="sm"
                    onClick={() => executeDirectBulkPrint(false)}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Print Only Complete Cards ({studentsToPrint.length - studentsWithIssues.length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PRINT ENGINE OUTPUT (Visible ONLY in @media print)                   */}
      {/* Renders every selected card on its own 54mm x 85.6mm page            */}
      {/* ==================================================================== */}
      <div id="cr80-print-container" className="hidden print:block w-[54mm] m-0 p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            /* 1. Global Print Color Exactness */
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* 2. Hide all screen UI, headers, sidebars, buttons */
            header,
            aside,
            nav,
            .print\\:hidden,
            button,
            input,
            select {
              display: none !important;
            }

            /* 3. Strict Physical CR80 PVC (54mm × 85.6mm) - Zero Margins (NO !important inside @page) */
            @page {
              size: 54mm 85.6mm;
              margin: 0;
            }

            /* 4. Base Page Document Reset */
            html,
            body {
              background: white !important;
              color: #003366 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 54mm !important;
              height: auto !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* 5. Print Container */
            #cr80-print-container {
              display: block !important;
              width: 54mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            /* 6. Isolated Single Card Page per Student */
            .cr80-page-isolated {
              width: 54mm !important;
              height: 85.6mm !important;
              max-width: 54mm !important;
              max-height: 85.6mm !important;
              page-break-before: auto !important;
              break-before: auto !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              position: relative !important;
              display: block !important;
              background: white !important;
            }

            /* Prevent trailing blank card after the last card */
            .cr80-page-isolated:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }

            /* Root card strictly constrained to exact 54mm x 85.6mm box */
            .cr80-card-root {
              width: 54mm !important;
              height: 85.6mm !important;
              max-width: 54mm !important;
              max-height: 85.6mm !important;
              padding: 3mm !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              border-radius: 0 !important;
              border: none !important;
              box-shadow: none !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />

        {(printingSingleStudent ? [printingSingleStudent] : studentsToPrint).map((student) => (
          <div key={student.id} className="cr80-page-isolated">
            <StudentIDCardPrintableView
              student={student}
              schoolProfile={schoolProfile}
              academicSession={sessionString}
              validUpto={validUptoString}
              cardTitle={cardTitle}
              isPrintingMode={true}
              className="shadow-none border-none rounded-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentIDCardStudioPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm">Loading Student ID Studio...</div>}>
      <StudentIDCardStudioContent />
    </Suspense>
  );
}
