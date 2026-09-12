"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  TransferCertificatePrintableView,
  TransferCertificateData,
  LEAVING_REASONS,
  parseDobComponents,
} from "@/components/certificate/transfer-certificate-printable-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  RotateCcw,
  Eye,
  Award,
} from "lucide-react";
import { useSchoolProfile, getEffectiveHeadTitle, parseStudentAddress } from "@/lib/utils/school-profile";
import {
  getDocumentSequence,
  saveDocumentSequence,
  formatDocumentNumber,
} from "@/lib/utils/document-sequence";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintBatch } from "@/lib/utils/print-history";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function getNextClass(currentClass: string): string {
  const idx = STANDARD_CLASSES.indexOf(currentClass);
  if (idx >= 0 && idx < STANDARD_CLASSES.length - 1) {
    return STANDARD_CLASSES[idx + 1];
  }
  return "College / Higher Studies";
}

function TransferCertificateGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const { profile: schoolProfile } = useSchoolProfile();

  // Fetch all students for search & auto-fill
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewScale, setPreviewScale] = useState<number>(1.0);

  const currentYear = new Date().getFullYear();
  const [certSeq, setCertSeq] = useState<number>(() => getDocumentSequence("transfer-certificate", currentYear));

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Transfer Certificate Master State (Strictly A5)
  const [cert, setCert] = useState<TransferCertificateData>(() => ({
    certificateNo: formatDocumentNumber("transfer-certificate", getDocumentSequence("transfer-certificate", currentYear), currentYear),
    issueDate: getLiveDate(),
    copyType: "Original",
    studentId: `MHS-${currentYear}-0001`,
    studentName: "TANIA HALDER",
    gender: "Female",
    fatherName: "Manas Das",
    village: "Marigachi",
    postOffice: "Mathurapur",
    policeStation: "Diamond Harbour",
    district: "South 24 Parganas",
    pincode: "743368",
    dateOfLeaving: "05/09/2026",
    academicSession: String(currentYear),
    readingClass: "IX",
    hasPassedAnnualExam: true,
    promotedClass: "X",
    isCourseCompleted: false,
    dateOfBirth: "2011-11-04",
    dateOfBirthDayWords: "Fourth",
    dateOfBirthMonthWords: "November",
    dateOfBirthYearWords: "Two Thousand and Eleven",
    feesClearedUpToDate: "05/09/2026",
    conduct: "GOOD",
    selectedReasonIndex: 1, // Default: Unavoidable change of residence
    customReason: "",
    hoiTitle: "Signature of HOI",
  }));

  // Auto-sync sequence when year rolls over or on mount
  useEffect(() => {
    const seq = getDocumentSequence("transfer-certificate", currentYear);
    setCertSeq(seq);
    setCert((prev) => ({
      ...prev,
      certificateNo: formatDocumentNumber("transfer-certificate", seq, currentYear),
    }));
  }, [currentYear]);

  // Auto-fill address components from free-text student address
  function parseAddress(addr?: string) {
    return parseStudentAddress(addr, schoolProfile);
  }

  // Handle student selection from database
  function applyStudentToCertificate(s: Student) {
    setSelectedStudent(s);
    const parsedAddr = parseAddress(s.address);
    const passedCls = s.presentClass || "IX";
    const nextCls = getNextClass(passedCls);

    const isPassedOutStatus =
      s.currentStatus === "Passed Out" ||
      s.currentStatus === "C.C.H.S." ||
      passedCls === "XII";

    const dobVal = s.dob || "2011-11-04";
    const dobParsed = parseDobComponents(dobVal);

    setCert((prev) => ({
      ...prev,
      studentId: s.id,
      studentName: s.name,
      gender: s.gender === "Female" ? "Female" : s.gender === "Male" ? "Male" : "Other",
      fatherName: s.fatherName || s.guardianName || "Guardian",
      motherName: s.motherName || "",
      village: parsedAddr.village,
      postOffice: parsedAddr.postOffice,
      policeStation: parsedAddr.policeStation,
      district: parsedAddr.district,
      pincode: parsedAddr.pincode,
      readingClass: passedCls,
      promotedClass: nextCls,
      academicSession: String(currentYear),
      isCourseCompleted: isPassedOutStatus,
      selectedReasonIndex: isPassedOutStatus ? 3 : 1, // 3: Completion, 1: Change of residence
      dateOfBirth: dobVal,
      dateOfBirthDayWords: dobParsed.dayWords,
      dateOfBirthMonthWords: dobParsed.monthWords,
      dateOfBirthYearWords: dobParsed.yearWords,
      certificateNo: prev.certificateNo || formatDocumentNumber("transfer-certificate", certSeq, currentYear),
    }));
  }

  // Load institutional head designation and defaults from school profile
  useEffect(() => {
    if (schoolProfile) {
      const title = getEffectiveHeadTitle(schoolProfile);
      setCert((prev) => {
        const isDefaultDemo = !selectedStudent;
        return {
          ...prev,
          hoiTitle: title ? `Signature of ${title}` : prev.hoiTitle,
          village: isDefaultDemo ? (schoolProfile.village || prev.village) : prev.village,
          postOffice: isDefaultDemo ? (schoolProfile.postOffice || schoolProfile.village || prev.postOffice) : prev.postOffice,
          policeStation: isDefaultDemo ? (schoolProfile.policeStation || prev.policeStation) : prev.policeStation,
          district: isDefaultDemo ? (schoolProfile.district || prev.district) : prev.district,
          pincode: isDefaultDemo ? (schoolProfile.pincode || prev.pincode) : prev.pincode,
        };
      });
    }
  }, [schoolProfile, selectedStudent]);

  // Pre-load student from query param
  useEffect(() => {
    if (studentIdParam && students.length > 0) {
      const match = students.find((s) => s.id === studentIdParam);
      if (match) {
        applyStudentToCertificate(match);
      }
    }
  }, [studentIdParam, students]);

  // Filter students for search dropdown
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.presentRoll && String(s.presentRoll).includes(q)) ||
          (s.pen && s.pen.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [students, studentSearch]);

  // Handle DOB change with automatic word parsing
  function handleDobChange(val: string) {
    const parsed = parseDobComponents(val);
    setCert((prev) => ({
      ...prev,
      dateOfBirth: val,
      dateOfBirthDayWords: parsed.dayWords,
      dateOfBirthMonthWords: parsed.monthWords,
      dateOfBirthYearWords: parsed.yearWords,
    }));
  }

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Native Direct Print Trigger (Reliable & Zero Blank Issue)
  const handlePrint = () => {
    const currentCertificateNo = cert.certificateNo;
    const nextSeq = certSeq + 1;
    saveDocumentSequence("transfer-certificate", nextSeq, currentYear);
    recordPrintBatch(
      {
        docType: "transfer-certificate",
        mode: "single",
        startSerial: certSeq,
        endSerial: certSeq,
        formattedStart: currentCertificateNo,
        formattedEnd: currentCertificateNo,
        count: 1,
        classInfo: `${cert.studentName} (Class: ${cert.readingClass} → ${cert.promotedClass})`,
      },
      currentYear
    );

    const nextFormattedNo = formatDocumentNumber("transfer-certificate", nextSeq, currentYear);

    let hasAdvanced = false;
    const advanceToNext = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      window.removeEventListener("afterprint", advanceToNext);
      setCertSeq(nextSeq);
      setCert((prev) => ({
        ...prev,
        certificateNo: nextFormattedNo,
        issueDate: getLiveDate(),
      }));
    };

    window.addEventListener("afterprint", advanceToNext, { once: true });

    setTimeout(() => {
      window.print();
      advanceToNext();
    }, 60);
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-[1700px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Transfer Certificate
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Copy Type Selector */}
          <div className="flex items-center rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            {(["Original", "Duplicate", "Office Copy"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCert({ ...cert, copyType: type })}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  cert.copyType === type
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            title="View print history and undo certificate serials"
            className="gap-1.5 text-xs font-semibold h-9 px-3 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Undo Last Print</span>
          </Button>

          <Button
            onClick={handlePrint}
            className="gap-2 text-xs font-bold bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white shadow-xs cursor-pointer h-9 px-4 rounded-xl"
          >
            <Printer className="h-4 w-4" />
            <span>Print TC (A5)</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Inputs + Right Certificate Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
        {/* LEFT COLUMN: Controls & Auto-Fill (Hidden in Print) */}
        <div className="xl:col-span-5 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-140px)] pr-2 pb-48">
          {/* Card 1: Student Search & Core Details */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Student Search &amp; Particulars</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              {/* Search Existing Student */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by Name, Roll, Student ID, or PEN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
                {filteredStudents.length > 0 && (
                  <div className="absolute z-20 top-9 left-0 right-0 rounded-xl border bg-popover text-popover-foreground shadow-lg overflow-hidden py-1">
                    {filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          applyStudentToCertificate(s);
                          setStudentSearch("");
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted/70 text-xs flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Roll: {s.presentRoll || "N/A"} &bull; Class: {s.presentClass || "N/A"} &bull; {s.id}
                          </div>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-primary font-mono px-1.5 py-0.5 rounded">
                          Auto-Fill
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/40 p-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>
                    Auto-filled: <strong>{selectedStudent.name}</strong> ({selectedStudent.id})
                  </span>
                </div>
              )}

              {/* Student Name */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Student Full Name
                </Label>
                <Input
                  value={cert.studentName}
                  onChange={(e) => setCert({ ...cert, studentName: e.target.value })}
                  className="text-xs h-8 font-semibold"
                  placeholder="e.g. Synthia Sanam"
                />
              </div>

              {/* Parent Details & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Father&apos;s / Guardian&apos;s Name
                  </Label>
                  <Input
                    value={cert.fatherName}
                    onChange={(e) => setCert({ ...cert, fatherName: e.target.value })}
                    className="text-xs h-8"
                    placeholder="e.g. Md. Ruhul Amin"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Gender</Label>
                  <CustomSelect
                    value={cert.gender}
                    onChange={(val) =>
                      setCert({
                        ...cert,
                        gender: val as "Male" | "Female" | "Other",
                      })
                    }
                    options={[
                      { label: "Female (Daughter of / She / Her)", value: "Female" },
                      { label: "Male (Son of / He / His)", value: "Male" },
                      { label: "Other (Child of / They / Their)", value: "Other" },
                    ]}
                    className="w-full text-xs h-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Academic, Promotion & Financial Details */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Academic Leaving &amp; Fee Record</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Date Left School</Label>
                  <Input
                    value={cert.dateOfLeaving}
                    onChange={(e) => setCert({ ...cert, dateOfLeaving: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Academic Session</Label>
                  <Input
                    value={cert.academicSession}
                    onChange={(e) => setCert({ ...cert, academicSession: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 2026"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Reading in Class</Label>
                  <CustomSelect
                    value={cert.readingClass}
                    onChange={(val) => {
                      const next = getNextClass(val);
                      setCert({
                        ...cert,
                        readingClass: val,
                        promotedClass: next,
                      });
                    }}
                    options={STANDARD_CLASSES.map((c) => ({
                      label: `Class ${c}`,
                      value: c,
                    }))}
                    className="w-full text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Fees Paid Up To Date</Label>
                  <Input
                    value={cert.feesClearedUpToDate}
                    onChange={(e) => setCert({ ...cert, feesClearedUpToDate: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>

              {/* Promotion Outcome Toggle */}
              <div className="pt-2 border-t space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Annual Exam / Promotion Status
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCert({
                        ...cert,
                        hasPassedAnnualExam: true,
                        isCourseCompleted: false,
                      })
                    }
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                      cert.hasPassedAnnualExam && !cert.isCourseCompleted
                        ? "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 font-bold"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Passed &amp; Promoted
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCert({
                        ...cert,
                        hasPassedAnnualExam: false,
                        isCourseCompleted: false,
                      })
                    }
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                      !cert.hasPassedAnnualExam && !cert.isCourseCompleted
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Not Promoted
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCert({
                        ...cert,
                        isCourseCompleted: true,
                      })
                    }
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                      cert.isCourseCompleted
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Course Completed
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Reason for Leaving & Official DOB */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Award className="h-3.5 w-3.5 text-primary" />
                <span>Reason for Leaving &amp; Date of Birth</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              {/* Reason Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Reason for Leaving (Select 1 of 5 Standard Reasons)
                  </Label>
                  <span className="text-[10px] font-mono text-primary font-bold">
                    Option {cert.selectedReasonIndex || "Custom"}
                  </span>
                </div>

                {/* Direct 1-Click Interactive Options List (Zero Clipping) */}
                <div className="space-y-1.5 bg-muted/20 p-2 rounded-xl border">
                  {LEAVING_REASONS.map((r, i) => {
                    const isSelected = cert.selectedReasonIndex === i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setCert({ ...cert, selectedReasonIndex: i + 1 })
                        }
                        className={`w-full flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-500/15 border border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold shadow-2xs"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-mono mt-0.5 ${
                            isSelected
                              ? "bg-[#1e3a8a] text-white font-bold"
                              : "border border-muted-foreground/40 text-muted-foreground"
                          }`}
                        >
                          {isSelected ? "✓" : String(i + 1)}
                        </span>
                        <span className="leading-tight flex-1">{r}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      setCert({ ...cert, selectedReasonIndex: 0 })
                    }
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                      cert.selectedReasonIndex === 0
                        ? "bg-blue-500/15 border border-blue-500/40 text-blue-700 dark:text-blue-300 font-bold shadow-2xs"
                        : "hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-mono ${
                        cert.selectedReasonIndex === 0
                          ? "bg-[#1e3a8a] text-white font-bold"
                          : "border border-muted-foreground/40 text-muted-foreground"
                      }`}
                    >
                      {cert.selectedReasonIndex === 0 ? "✓" : "+"}
                    </span>
                    <span>Other / Custom Reason</span>
                  </button>
                </div>

                {cert.selectedReasonIndex === 0 && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-[11px] text-muted-foreground">Custom Reason Description</Label>
                    <Input
                      value={cert.customReason || ""}
                      onChange={(e) => setCert({ ...cert, customReason: e.target.value })}
                      className="text-xs h-8"
                      placeholder="e.g. Admission to Higher Educational Institution"
                    />
                  </div>
                )}
              </div>

              {/* DOB Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Date of Birth (DOB)</Label>
                  <Input
                    type="date"
                    value={cert.dateOfBirth}
                    onChange={(e) => handleDobChange(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Conduct Rating</Label>
                  <CustomSelect
                    value={cert.conduct}
                    onChange={(val) => setCert({ ...cert, conduct: val })}
                    options={[
                      { label: "Good", value: "Good" },
                      { label: "Very Good", value: "Very Good" },
                      { label: "Exemplary", value: "Exemplary" },
                    ]}
                    className="w-full text-xs h-8"
                  />
                </div>
              </div>

              {/* Address details */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Village</Label>
                  <Input
                    value={cert.village}
                    onChange={(e) => setCert({ ...cert, village: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Post Office</Label>
                  <Input
                    value={cert.postOffice}
                    onChange={(e) => setCert({ ...cert, postOffice: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">District</Label>
                  <Input
                    value={cert.district}
                    onChange={(e) => setCert({ ...cert, district: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Certificate Ref No</Label>
                  <Input
                    value={cert.certificateNo}
                    onChange={(e) => setCert({ ...cert, certificateNo: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Issue Date</Label>
                  <Input
                    value={cert.issueDate}
                    onChange={(e) => setCert({ ...cert, issueDate: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Live Print-Ready Certificate Preview */}
        <div className="xl:col-span-7 space-y-4 print:w-full print:m-0 print:p-0">
          <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-base font-semibold tracking-tight text-foreground">
                Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-border/80 text-xs text-muted-foreground font-normal bg-background/60">
                A5 Portrait
              </span>
            </div>

            {/* Scale slider */}
            <div className="flex items-center gap-2 bg-background border border-border/80 px-2.5 py-1 rounded-xl shadow-2xs">
              <span className="text-[11px] text-muted-foreground font-semibold">Scale:</span>
              {[0.9, 1.0, 1.1].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPreviewScale(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                    previewScale === s
                      ? "bg-[#1e3a8a] text-white font-bold shadow-2xs"
                      : "bg-background hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {Math.round(s * 100)}%
                </button>
              ))}
            </div>
          </div>

          {/* Certificate Canvas */}
          <div
            id="printable-tc-canvas"
            className="w-full overflow-x-auto rounded-xl border bg-slate-100/80 dark:bg-slate-900/60 p-4 flex justify-center shadow-inner print:p-0 print:border-none print:bg-transparent print:w-full print:block"
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "center top",
                transition: "transform 0.15s ease-out",
              }}
              className="shrink-0 m-auto print:transform-none print:w-full print:h-full print:m-0 print:p-0 print:block"
            >
              <TransferCertificatePrintableView data={cert} schoolProfile={schoolProfile} />
            </div>
          </div>
        </div>
      </div>

      {/* Direct Global Print Stylesheet */}
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

          @page {
            size: 148mm 210mm;
            margin: 0;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 148mm !important;
            height: 210mm !important;
            max-width: 148mm !important;
            max-height: 210mm !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Single mode canvas layout */
          #printable-tc-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: 148mm !important;
            max-width: 148mm !important;
            height: 208mm !important;
            max-height: 208mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: block !important;
          }

          #printable-tc-canvas > div {
            transform: none !important;
            width: 148mm !important;
            height: 208mm !important;
            margin: 0 !important;
            display: block !important;
          }

          #pure-a5-tc-sheet {
            width: 148mm !important;
            height: 208mm !important;
            min-width: 148mm !important;
            max-width: 148mm !important;
            min-height: 208mm !important;
            max-height: 208mm !important;
            margin: 0 auto !important;
            padding: 3.5mm !important;
            box-sizing: border-box !important;
            border: 2.5px solid #1e3a8a !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Print Batch History & Selective Undo Modal */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="transfer-certificate"
        onUndoBatch={(newStart) => {
          setCertSeq(newStart);
          setCert((prev) => ({
            ...prev,
            certificateNo: formatDocumentNumber("transfer-certificate", newStart, currentYear),
          }));
        }}
      />
    </div>
  );
}

export default function TransferCertificateGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-muted-foreground">
          Loading Transfer Certificate Generator...
        </div>
      }
    >
      <TransferCertificateGeneratorContent />
    </Suspense>
  );
}
