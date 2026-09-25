"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  BonafideCertificatePrintableView,
  BonafideCertificateData,
} from "@/components/certificate/bonafide-certificate-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  ArrowLeft,
  Search,
  Users,
  Eye,
  CheckSquare,
  Square,
  FileCheck,
  History,
  ChevronDown,
  Layers,
  User,
  MapPin,
} from "lucide-react";
import {
  useSchoolProfile,
  getEffectiveHeadTitle,
  parseStudentAddress,
} from "@/lib/utils/school-profile";
import {
  getDocumentSequence,
  saveDocumentSequence,
  formatDocumentNumber,
} from "@/lib/utils/document-sequence";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintBatch } from "@/lib/utils/print-history";
import {
  recordPrintedCertificate,
  buildBonafideCertInsert,
} from "@/lib/utils/certificate-registry";
import { cn } from "@/lib/utils";

const CLASS_OPTIONS = [
  { label: "Select Class...", value: "" },
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
  { label: "Select Section...", value: "" },
  { label: "Section A", value: "A" },
  { label: "Section B", value: "B" },
  { label: "Section C", value: "C" },
  { label: "Section D", value: "D" },
];

const PURPOSE_PRESETS = [
  { label: "Scholarship (OASIS / SVMCM / Aikyashree)", value: "Scholarship Application (OASIS / SVMCM / Aikyashree)" },
  { label: "Opening a Savings Bank Account", value: "Opening a Savings Bank Account" },
  { label: "Passport / Travel Documentation", value: "Passport & Travel Verification" },
  { label: "Railway / Bus Travel Concession", value: "Concession Travel Pass" },
  { label: "Govt Scheme / Welfare Verification", value: "Government Welfare Scheme Verification" },
  { label: "General Academic Verification", value: "Official Academic Verification" },
];

function BonafideGeneratorContent() {
  const { profile: schoolProfile } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Paper Format State: Default to A5 Portrait
  const [paperSize, setPaperSize] = useState<"A5" | "A4">("A5");

  // Filter States - Only fetch after both class & section are chosen
  const [selectedClass, setSelectedClass] = useState<string>("X");
  const [selectedSection, setSelectedSection] = useState<string>("A");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isSelectionComplete = Boolean(selectedClass && selectedSection);

  // Certificate settings
  const [certSeq, setCertSeq] = useState<number>(() =>
    getDocumentSequence("bonafide-certificate", currentYear)
  );
  const [issueDate, setIssueDate] = useState<string>(getLiveDate);
  const [copyType, setCopyType] = useState<"Original" | "Duplicate" | "Office Copy">("Original");
  const [purpose, setPurpose] = useState<string>(PURPOSE_PRESETS[0].value);
  const [conduct, setConduct] = useState<string>("exemplary moral character");
  const [includeDigitalSignature, setIncludeDigitalSignature] = useState<boolean>(true);
  const [previewScale, setPreviewScale] = useState<number>(0.95);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Editable Student Particulars Form State
  const [studentForm, setStudentForm] = useState({
    studentName: "STUDENT NAME",
    gender: "Male" as "Male" | "Female" | "Other",
    fatherName: "Father Name",
    studentId: `MHS-${currentYear}-0001`,
    pen: "191113056021234",
    presentClass: "X",
    presentSection: "A",
    presentRoll: "1",
    academicSession: String(currentYear),
    dateOfBirth: "2010-01-01",
    village: "Marigachi",
    postOffice: "Marigachi",
    policeStation: "Mathurapur",
    district: "South 24 Parganas",
    pincode: "743349",
  });

  // Print Mode: "single" | "batch"
  const [printMode, setPrintMode] = useState<"single" | "batch">("single");

  // Load students query: ONLY called when both class and section are chosen!
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students", selectedClass, selectedSection],
    queryFn: () => getStudents("summary", selectedClass, selectedSection),
    enabled: isSelectionComplete,
  });

  // Filter students based on Class, Section, and Search (School ID, PEN ID, Name, Roll)
  const filteredStudents = useMemo(() => {
    if (!isSelectionComplete) return [];

    return students
      .filter((s) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = (s.name || "").toLowerCase().includes(q);
          const matchesFather = (s.fatherName || "").toLowerCase().includes(q);
          const matchesRoll = String(s.presentRoll || "").includes(q);
          const matchesSchoolId = (s.schoolId || "").toLowerCase().includes(q);
          const matchesPen = (s.pen || "").toLowerCase().includes(q);
          const matchesId = (s.id || "").toLowerCase().includes(q);

          if (!matchesName && !matchesFather && !matchesRoll && !matchesSchoolId && !matchesPen && !matchesId) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (a.presentRoll || 0) - (b.presentRoll || 0));
  }, [students, isSelectionComplete, searchQuery]);

  // Selected student IDs for batch printing
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Auto-select when filtered students change
  useEffect(() => {
    if (filteredStudents.length > 0) {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
      setActiveStudentId(filteredStudents[0].id);
    } else {
      setSelectedStudentIds([]);
      setActiveStudentId(null);
    }
  }, [filteredStudents]);

  // Active student object for single preview
  const activeStudent = useMemo(() => {
    return filteredStudents.find((s) => s.id === activeStudentId) || filteredStudents[0] || null;
  }, [filteredStudents, activeStudentId]);

  // Auto-sync studentForm when activeStudent changes
  useEffect(() => {
    if (activeStudent) {
      const addr = parseStudentAddress(activeStudent.address, schoolProfile);
      setStudentForm({
        studentName: activeStudent.name || "",
        gender: (activeStudent.gender === "Female" ? "Female" : "Male") as "Male" | "Female" | "Other",
        fatherName: activeStudent.fatherName || "",
        studentId: activeStudent.schoolId || activeStudent.id || "",
        pen: activeStudent.pen || "",
        presentClass: activeStudent.presentClass || selectedClass || "X",
        presentSection: activeStudent.presentSection || selectedSection || "A",
        presentRoll: String(activeStudent.presentRoll || "1"),
        academicSession: String(currentYear),
        dateOfBirth: activeStudent.dob || "2010-01-01",
        village: addr.village || schoolProfile?.village || "Marigachi",
        postOffice: addr.postOffice || schoolProfile?.postOffice || "Marigachi",
        policeStation: addr.policeStation || schoolProfile?.policeStation || "Mathurapur",
        district: addr.district || schoolProfile?.district || "South 24 Parganas",
        pincode: addr.pincode || schoolProfile?.pincode || "743349",
      });
    }
  }, [activeStudent, schoolProfile, selectedClass, selectedSection, currentYear]);

  const schoolCodePrefix = (schoolProfile?.schoolCode || "MHS").split("-")[0].toUpperCase();

  // Transform Student into BonafideCertificateData (for batch printing)
  const buildCertificateDataForStudent = (
    student: Student | null,
    sequenceNum: number
  ): BonafideCertificateData => {
    const certNum = formatDocumentNumber("bonafide-certificate", sequenceNum, currentYear, schoolCodePrefix);
    if (!student) {
      return {
        paperSize,
        certificateNo: certNum,
        issueDate,
        copyType,
        academicSession: studentForm.academicSession || String(currentYear),
        studentId: studentForm.studentId,
        pen: studentForm.pen,
        studentName: studentForm.studentName,
        gender: studentForm.gender,
        fatherName: studentForm.fatherName,
        village: studentForm.village,
        postOffice: studentForm.postOffice,
        policeStation: studentForm.policeStation,
        district: studentForm.district,
        pincode: studentForm.pincode,
        presentClass: studentForm.presentClass,
        presentSection: studentForm.presentSection,
        presentRoll: studentForm.presentRoll,
        dateOfBirth: studentForm.dateOfBirth,
        conduct,
        purpose,
        headmasterTitle: schoolProfile ? getEffectiveHeadTitle(schoolProfile) : "Teacher-in-Charge",
        includeDigitalSignature,
      };
    }

    const addr = parseStudentAddress(student.address, schoolProfile);

    return {
      paperSize,
      certificateNo: certNum,
      issueDate,
      copyType,
      academicSession: String(currentYear),
      studentId: student.schoolId || student.id,
      pen: student.pen || "N/A",
      studentName: student.name,
      gender: student.gender || "Male",
      fatherName: student.fatherName || "Guardian",
      village: addr.village,
      postOffice: addr.postOffice,
      policeStation: addr.policeStation,
      district: addr.district,
      pincode: addr.pincode,
      presentClass: student.presentClass || selectedClass || "X",
      presentSection: student.presentSection || selectedSection || "A",
      presentRoll: String(student.presentRoll || "1"),
      dateOfBirth: student.dob || "2010-01-01",
      conduct,
      purpose,
      headmasterTitle: schoolProfile ? getEffectiveHeadTitle(schoolProfile) : "Teacher-in-Charge",
      includeDigitalSignature,
    };
  };

  const activeCertData = useMemo(() => {
    const certNum = formatDocumentNumber("bonafide-certificate", certSeq, currentYear, schoolCodePrefix);
    return {
      paperSize,
      certificateNo: certNum,
      issueDate,
      copyType,
      academicSession: studentForm.academicSession || String(currentYear),
      studentId: studentForm.studentId,
      pen: studentForm.pen,
      studentName: studentForm.studentName,
      gender: studentForm.gender,
      fatherName: studentForm.fatherName,
      village: studentForm.village,
      postOffice: studentForm.postOffice,
      policeStation: studentForm.policeStation,
      district: studentForm.district,
      pincode: studentForm.pincode,
      presentClass: studentForm.presentClass,
      presentSection: studentForm.presentSection,
      presentRoll: studentForm.presentRoll,
      dateOfBirth: studentForm.dateOfBirth,
      conduct,
      purpose,
      headmasterTitle: schoolProfile ? getEffectiveHeadTitle(schoolProfile) : "Teacher-in-Charge",
      includeDigitalSignature,
    };
  }, [
    studentForm,
    certSeq,
    issueDate,
    copyType,
    conduct,
    purpose,
    includeDigitalSignature,
    schoolProfile,
    currentYear,
    paperSize,
    schoolCodePrefix,
  ]);

  // Selected students to be batch printed
  const studentsToPrint = useMemo(() => {
    return filteredStudents.filter((s) => selectedStudentIds.includes(s.id));
  }, [filteredStudents, selectedStudentIds]);

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
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Print handlers
  const handlePrintSingle = async () => {
    setPrintMode("single");
    const currentSeq = certSeq;
    const nextSeq = currentSeq + 1;
    saveDocumentSequence("bonafide-certificate", nextSeq, currentYear);
    setCertSeq(nextSeq);

    // Record in database registry
    if (activeCertData) {
      const insertData = buildBonafideCertInsert(activeCertData, String(currentYear));
      recordPrintedCertificate(insertData);
      recordPrintBatch(
        {
          docType: "bonafide-certificate",
          mode: "single",
          startSerial: currentSeq,
          endSerial: currentSeq,
          formattedStart: activeCertData.certificateNo,
          formattedEnd: activeCertData.certificateNo,
          count: 1,
          classInfo: `${activeCertData.studentName} (${activeCertData.presentClass}-${activeCertData.presentSection})`,
        },
        currentYear
      );
    }

    setTimeout(() => {
      window.print();
    }, 60);
  };

  const handlePrintBatch = async () => {
    if (studentsToPrint.length === 0) return;
    setPrintMode("batch");

    const startSeq = certSeq;
    const count = studentsToPrint.length;
    const endSeq = startSeq + count - 1;
    const nextSeq = endSeq + 1;

    saveDocumentSequence("bonafide-certificate", nextSeq, currentYear);
    setCertSeq(nextSeq);

    // Record each student certificate
    studentsToPrint.forEach((student, index) => {
      const itemSeq = startSeq + index;
      const certData = buildCertificateDataForStudent(student, itemSeq);
      const insertData = buildBonafideCertInsert(certData, String(currentYear));
      recordPrintedCertificate(insertData);
    });

    const formattedStart = formatDocumentNumber("bonafide-certificate", startSeq, currentYear, schoolCodePrefix);
    const formattedEnd = formatDocumentNumber("bonafide-certificate", endSeq, currentYear, schoolCodePrefix);

    recordPrintBatch(
      {
        docType: "bonafide-certificate",
        mode: "bulk",
        startSerial: startSeq,
        endSerial: endSeq,
        formattedStart,
        formattedEnd,
        count,
        classInfo: `Class ${selectedClass} - ${selectedSection} (${count} students)`,
      },
      currentYear
    );

    setTimeout(() => {
      window.print();
    }, 80);
  };

  const isA5 = paperSize === "A5";

  return (
    <div className="p-3.5 sm:p-6 max-w-[1750px] mx-auto space-y-4 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Studio Header: Hidden in Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-2xl p-4 shadow-2xs print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/generate"
            className="p-2 rounded-xl border bg-muted/40 hover:bg-muted text-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Bonafide Certificate Studio
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono font-semibold uppercase">
                {paperSize} Portrait
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="h-9 rounded-xl text-xs gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintSingle}
            disabled={!activeStudent}
            className="h-9 rounded-xl text-xs gap-1.5 font-semibold"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Active (1)
          </Button>

          <Button
            size="sm"
            onClick={handlePrintBatch}
            disabled={studentsToPrint.length === 0}
            className="h-9 rounded-xl text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Selected ({studentsToPrint.length})
          </Button>
        </div>
      </div>

      {/* Main Studio Grid: Unwraps in Print */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 print:block print:w-full print:m-0 print:p-0">
        {/* Left Column: Filter Controls & Student Roster */}
        <div className="xl:col-span-5 space-y-4 print:hidden">
          {/* 1. Paper Format Switcher */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Paper Format
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize("A5");
                    setPreviewScale(0.95);
                  }}
                  className={cn(
                    "p-2 rounded-xl border text-center transition-all cursor-pointer",
                    paperSize === "A5"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <p className="text-xs">A5 Portrait (Standard)</p>
                  <p className="text-[10px] opacity-75 font-mono">148 × 210 mm</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaperSize("A4");
                    setPreviewScale(0.75);
                  }}
                  className={cn(
                    "p-2 rounded-xl border text-center transition-all cursor-pointer",
                    paperSize === "A4"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <p className="text-xs">A4 Portrait (Full Page)</p>
                  <p className="text-[10px] opacity-75 font-mono">210 × 297 mm</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 2. Class, Section & Search Filter Card */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Student Filter & Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3">
              {/* Class & Section Robust Native Selects */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Class</Label>
                  <div className="relative">
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 pr-8 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                    >
                      {CLASS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-popover text-popover-foreground">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Section</Label>
                  <div className="relative">
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 pr-8 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                    >
                      {SECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-popover text-popover-foreground">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Live Search by Name, Roll, School ID, or PEN */}
              <div className="space-y-1">
                <Label className="text-xs">Search (ID, PEN, Name, Roll)</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    disabled={!isSelectionComplete}
                    placeholder={
                      isSelectionComplete
                        ? "Search by School ID, PEN, Name, or Roll..."
                        : "Select Class & Section above first..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9 rounded-xl disabled:bg-muted/50 disabled:opacity-60"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Roster Controls & Counter */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={!isSelectionComplete || filteredStudents.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Select All ({filteredStudents.length})
                    </>
                  )}
                </button>

                <span className="text-[11px] font-mono text-muted-foreground">
                  {selectedStudentIds.length} of {filteredStudents.length} selected
                </span>
              </div>

              {/* Student Roster List */}
              <div className="max-h-[280px] overflow-y-auto rounded-xl border divide-y divide-border/60 bg-background/50">
                {!isSelectionComplete ? (
                  <div className="p-8 text-center space-y-1 text-muted-foreground">
                    <Users className="h-6 w-6 mx-auto opacity-35 text-primary" />
                    <p className="text-xs font-semibold text-foreground">Select Class & Section</p>
                    <p className="text-[11px] text-muted-foreground">
                      Choose Class and Section above to fetch and search students.
                    </p>
                  </div>
                ) : loadingStudents ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Loading Class {selectedClass}-{selectedSection} students...
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No students found in Class {selectedClass}-{selectedSection}
                    {searchQuery ? ` matching "${searchQuery}"` : ""}.
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    const isActive = student.id === activeStudentId;

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "p-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer text-xs",
                          isActive
                            ? "bg-primary/10 border-l-3 border-primary"
                            : "hover:bg-muted/40"
                        )}
                        onClick={() => setActiveStudentId(student.id)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStudent(student.id);
                            }}
                            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/60" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground truncate">
                                {student.name}
                              </span>
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                Roll {student.presentRoll || "-"}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 truncate font-mono">
                              <span>ID: {student.schoolId || student.id.slice(0, 8)}</span>
                              <span>•</span>
                              <span>PEN: {student.pen || "N/A"}</span>
                              <span>•</span>
                              <span>{student.presentClass}-{student.presentSection}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStudentId(student.id);
                          }}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-semibold shrink-0 transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          View
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Student Particulars Form Card */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  Student Particulars
                </span>
                {activeStudent && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {studentForm.studentName ? studentForm.studentName.slice(0, 18) : "Active Student"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3">
              {/* Student Name & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold">Student Name</Label>
                  <Input
                    value={studentForm.studentName}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, studentName: e.target.value }))}
                    placeholder="Full name of student"
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Gender</Label>
                  <div className="relative">
                    <select
                      value={studentForm.gender}
                      onChange={(e) =>
                        setStudentForm((prev) => ({
                          ...prev,
                          gender: e.target.value as "Male" | "Female" | "Other",
                        }))
                      }
                      className="w-full appearance-none rounded-xl border border-input bg-background px-2.5 py-1.5 pr-6 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                    >
                      <option value="Male">Male (son of)</option>
                      <option value="Female">Female (daughter of)</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Father Name & Date of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Father's Name</Label>
                  <Input
                    value={studentForm.fatherName}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                    placeholder="Father / Guardian Name"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <Input
                    type="date"
                    value={studentForm.dateOfBirth}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* School ID & PEN Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">School ID / Admission No.</Label>
                  <Input
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, studentId: e.target.value }))}
                    placeholder="e.g. MHS-2026-0001"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Banglar Shiksha PEN</Label>
                  <Input
                    value={studentForm.pen}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, pen: e.target.value }))}
                    placeholder="e.g. 191113056021234"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Academic: Class, Section, Roll, Session */}
              <div className="grid grid-cols-4 gap-1.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Class</Label>
                  <Input
                    value={studentForm.presentClass}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, presentClass: e.target.value }))}
                    className="h-8 text-xs text-center font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Sec</Label>
                  <Input
                    value={studentForm.presentSection}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, presentSection: e.target.value }))}
                    className="h-8 text-xs text-center font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Roll</Label>
                  <Input
                    value={studentForm.presentRoll}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, presentRoll: e.target.value }))}
                    className="h-8 text-xs text-center font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Session</Label>
                  <Input
                    value={studentForm.academicSession}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, academicSession: e.target.value }))}
                    className="h-8 text-xs text-center font-bold font-mono"
                  />
                </div>
              </div>

              {/* Address Details */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" />
                  Address Details
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Village</Label>
                    <Input
                      value={studentForm.village}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, village: e.target.value }))}
                      placeholder="Village"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Post Office (P.O.)</Label>
                    <Input
                      value={studentForm.postOffice}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, postOffice: e.target.value }))}
                      placeholder="Post Office"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="space-y-1">
                    <Label className="text-[11px]">P.S.</Label>
                    <Input
                      value={studentForm.policeStation}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, policeStation: e.target.value }))}
                      placeholder="Police Station"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">District</Label>
                    <Input
                      value={studentForm.district}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, district: e.target.value }))}
                      placeholder="District"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">PIN Code</Label>
                    <Input
                      value={studentForm.pincode}
                      onChange={(e) => setStudentForm((prev) => ({ ...prev, pincode: e.target.value }))}
                      placeholder="743349"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Certificate Customization Card */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-primary" />
                Certificate Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-3">
              {/* Purpose Selector & Custom Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purpose of Certificate</Label>
                <div className="relative">
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 pr-8 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                  >
                    {PURPOSE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value} className="bg-popover text-popover-foreground">
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <Input
                  placeholder="Or type custom purpose here..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              {/* Conduct & Copy Type */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Conduct</Label>
                  <Input
                    value={conduct}
                    onChange={(e) => setConduct(e.target.value)}
                    placeholder="exemplary moral character"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Copy Type</Label>
                  <div className="relative">
                    <select
                      value={copyType}
                      onChange={(e) => setCopyType(e.target.value as "Original" | "Duplicate" | "Office Copy")}
                      className="w-full appearance-none rounded-xl border border-input bg-background px-3 py-2 pr-8 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                    >
                      <option value="Original">Original</option>
                      <option value="Duplicate">Duplicate</option>
                      <option value="Office Copy">Office Copy</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Issue Date & Serial Sequence */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date of Issue</Label>
                  <Input
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Next Serial Number</Label>
                  <Input
                    value={formatDocumentNumber("bonafide-certificate", certSeq, currentYear, schoolCodePrefix)}
                    disabled
                    className="h-8 text-xs font-mono bg-muted/40 font-bold"
                  />
                </div>
              </div>

              {/* Digital Head Signature Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Digital Head Signature</Label>
                  <p className="text-[10px] text-muted-foreground">Print institutional digital signature</p>
                </div>
                <Switch
                  checked={includeDigitalSignature}
                  onCheckedChange={setIncludeDigitalSignature}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Sheet Preview (Single) & Batch Container (Print) */}
        <div className="xl:col-span-7 print:w-full print:m-0 print:p-0">
          <div className="sticky top-4 space-y-3">
            {/* Live Scale Controls: Hidden in Print */}
            <div className="flex items-center justify-between print:hidden px-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">
                  {isA5 ? "A5: 148mm × 210mm" : "A4: 210mm × 297mm"}
                </Badge>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {activeStudent ? activeStudent.name : "Preview Sample"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs"
                >
                  -
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground w-12 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale((s) => Math.min(1.5, Number((s + 0.1).toFixed(2))))}
                  className="h-7 w-7 p-0 text-xs"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewScale(isA5 ? 0.95 : 0.75)}
                  className="h-7 px-2 text-[10px]"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Studio Canvas Preview Container */}
            <div
              id="printable-bonafide-canvas"
              className="w-full overflow-auto bg-muted/20 border rounded-2xl p-4 sm:p-6 flex justify-center items-start shadow-inner print:p-0 print:border-none print:bg-transparent print:w-full print:block print:shadow-none"
            >
              {/* Single Student Interactive Preview (Hidden during batch printing) */}
              <div
                style={{ transform: `scale(${previewScale})`, transformOrigin: "top center" }}
                className={cn(
                  "transition-transform duration-150",
                  printMode === "batch"
                    ? "print:hidden"
                    : "print:transform-none print:w-full print:h-full print:m-0 print:p-0 print:block"
                )}
              >
                <BonafideCertificatePrintableView
                  data={activeCertData}
                  schoolProfile={schoolProfile}
                />
              </div>

              {/* Batch Print Multi-Page Container: Rendered only during print */}
              {printMode === "batch" && (
                <div className="hidden print:block w-full">
                  {studentsToPrint.map((student, idx) => {
                    const itemSeq = certSeq - studentsToPrint.length + idx;
                    const studentData = buildCertificateDataForStudent(student, itemSeq);

                    return (
                      <div
                        key={student.id}
                        className="page-break"
                        style={{
                          pageBreakAfter: idx === studentsToPrint.length - 1 ? "avoid" : "always",
                          breakAfter: idx === studentsToPrint.length - 1 ? "avoid" : "page",
                        }}
                      >
                        <BonafideCertificatePrintableView
                          data={studentData}
                          schoolProfile={schoolProfile}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulletproof Native Print CSS */}
      <style jsx global>{`
        @media print {
          header,
          aside,
          nav,
          .print\\:hidden,
          button {
            display: none !important;
          }

          @page {
            size: ${isA5 ? "148mm 210mm" : "210mm 297mm"};
            margin: 0;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: ${isA5 ? "148mm" : "210mm"} !important;
            height: auto !important;
            max-width: ${isA5 ? "148mm" : "210mm"} !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #printable-bonafide-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: ${isA5 ? "148mm" : "210mm"} !important;
            max-width: ${isA5 ? "148mm" : "210mm"} !important;
            box-sizing: border-box !important;
            display: block !important;
          }

          .page-break {
            width: ${isA5 ? "148mm" : "210mm"} !important;
            height: ${isA5 ? "208mm" : "295mm"} !important;
            max-height: ${isA5 ? "208mm" : "295mm"} !important;
            margin: 0 auto !important;
            display: block !important;
            box-sizing: border-box !important;
          }

          #pure-bonafide-sheet {
            width: ${isA5 ? "148mm" : "210mm"} !important;
            height: ${isA5 ? "208mm" : "295mm"} !important;
            min-width: ${isA5 ? "148mm" : "210mm"} !important;
            max-width: ${isA5 ? "148mm" : "210mm"} !important;
            min-height: ${isA5 ? "208mm" : "295mm"} !important;
            max-height: ${isA5 ? "208mm" : "295mm"} !important;
            margin: 0 auto !important;
            padding: ${isA5 ? "3.5mm" : "6mm"} !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* History & Selective Undo Modal */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="bonafide-certificate"
        onUndoBatch={(newStart) => {
          setCertSeq(newStart);
        }}
      />
    </div>
  );
}

export default function BonafideGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-muted-foreground">
          Loading Bonafide Certificate Studio...
        </div>
      }
    >
      <BonafideGeneratorContent />
    </Suspense>
  );
}
