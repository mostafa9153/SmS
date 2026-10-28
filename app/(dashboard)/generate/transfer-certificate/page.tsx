"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getStudentById } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  TransferCertificatePrintableView,
  TransferCertificateData,
  LEAVING_REASONS,
  parseDobComponents,
} from "@/components/certificate/transfer-certificate-printable-view";
import { StudentPicker, StudentPickerMode } from "@/components/certificate/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { Switch } from "@/components/ui/switch";
import { ZoomPanViewport } from "@/components/generate/zoom-pan-viewport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  ArrowLeft,
  User,
  Calendar,
  FileSpreadsheet,
  RotateCcw,
  Award,
  ChevronDown,
  Save,
} from "lucide-react";
import { getEffectiveHeadTitle, parseStudentAddress } from "@/lib/utils/school-profile";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import {
  getDocumentSequence,
  saveDocumentSequence,
  formatDocumentNumber,
} from "@/lib/utils/document-sequence";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintBatch } from "@/lib/utils/print-history";
import { cn } from "@/lib/utils";
import { CLASS_LADDER, getNextClass as ladderNextClass } from "@/lib/academic/class-ladder";

const STANDARD_CLASSES: string[] = [...CLASS_LADDER];

function getNextClass(currentClass: string): string {
  return ladderNextClass(currentClass) ?? "College / Higher Studies";
}

type PaperSize = "A5" | "A4" | "A3";
type PaperOrientation = "portrait" | "landscape";
interface PrintMargins { top: number; right: number; bottom: number; left: number; }
const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A5: { w: 148, h: 210 }, A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 },
};

function TransferCertificateGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const { profile: schoolProfile } = useSchoolProfile();

  const [pickerMode, setPickerMode] = useState<StudentPickerMode>("single");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]);
  const [printMode, setPrintMode] = useState<"single" | "batch">("single");

  const [paper, setPaper] = useState<PaperSize>("A5");
  const [orientation, setOrientation] = useState<PaperOrientation>("portrait");
  const [margins, setMargins] = useState<PrintMargins>({ top: 10, right: 10, bottom: 10, left: 10 });
  const [paperOpen, setPaperOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tc-paper-settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.paper) setPaper(s.paper as PaperSize);
        if (s.orientation) setOrientation(s.orientation as PaperOrientation);
        if (s.margins) setMargins(s.margins);
      }
    } catch {}
  }, []);
  const savePaperSettings = () => {
    try {
      localStorage.setItem("tc-paper-settings", JSON.stringify({ paper, orientation, margins }));
    } catch {}
  };
  const pageW = orientation === "landscape" ? PAPER_MM[paper].h : PAPER_MM[paper].w;
  const pageH = orientation === "landscape" ? PAPER_MM[paper].w : PAPER_MM[paper].h;
  const updateMargin = (side: keyof PrintMargins, raw: string) => {
    const value = Math.max(0, Number(raw) || 0);
    setMargins((prev) => ({ ...prev, [side]: value }));
  };

  const currentYear = new Date().getFullYear();
  const [certSeq, setCertSeq] = useState<number>(1);

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Transfer Certificate Master State (Strictly A5)
  const [cert, setCert] = useState<TransferCertificateData>(() => ({
    certificateNo: formatDocumentNumber("transfer-certificate", 1, currentYear),
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
    includeDigitalSignature: true,
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
      photoUrl: s.photoUrl,
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

  // Pre-load student from query param directly from API
  useEffect(() => {
    if (studentIdParam) {
      getStudentById(studentIdParam).then((match) => {
        if (match) {
          applyStudentToCertificate(match);
        }
      }).catch((err) => console.error("Failed to fetch initial student", err));
    }
  }, [studentIdParam]);

  // Pure transform used for bulk printing: builds one certificate's data from
  // a roster student + the common settings currently set in `cert`.
  function buildCertDataForStudent(s: Student, certNo: string): TransferCertificateData {
    const parsedAddr = parseAddress(s.address);
    const passedCls = s.presentClass || "IX";
    const nextCls = getNextClass(passedCls);
    const isPassedOutStatus =
      s.currentStatus === "Passed Out" || s.currentStatus === "C.C.H.S." || passedCls === "XII";
    const dobVal = s.dob || "2011-11-04";
    const dobParsed = parseDobComponents(dobVal);

    return {
      ...cert,
      certificateNo: certNo,
      studentId: s.id,
      studentName: s.name,
      photoUrl: s.photoUrl,
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
      isCourseCompleted: isPassedOutStatus,
      selectedReasonIndex: isPassedOutStatus ? 3 : 1,
      dateOfBirth: dobVal,
      dateOfBirthDayWords: dobParsed.dayWords,
      dateOfBirthMonthWords: dobParsed.monthWords,
      dateOfBirthYearWords: dobParsed.yearWords,
    };
  }

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
  const handlePrintSingle = () => {
    setPrintMode("single");
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

  // Bulk print: one certificate per selected student, sharing the common
  // settings currently configured in the form (issue date, conduct, etc.)
  const handlePrintBatch = () => {
    if (bulkStudents.length === 0) return;
    setPrintMode("batch");

    const startSeq = certSeq;
    const count = bulkStudents.length;
    const endSeq = startSeq + count - 1;
    const nextSeq = endSeq + 1;
    saveDocumentSequence("transfer-certificate", nextSeq, currentYear);
    setCertSeq(nextSeq);

    const formattedStart = formatDocumentNumber("transfer-certificate", startSeq, currentYear);
    const formattedEnd = formatDocumentNumber("transfer-certificate", endSeq, currentYear);
    recordPrintBatch(
      {
        docType: "transfer-certificate",
        mode: "bulk",
        startSerial: startSeq,
        endSerial: endSeq,
        formattedStart,
        formattedEnd,
        count,
        classInfo: `${count} students (bulk)`,
      },
      currentYear
    );

    setTimeout(() => {
      window.print();
    }, 80);
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-[1700px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
      {/* Top Action Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            title="Back"
            className="rounded-xl p-2 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer border border-transparent hover:border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Transfer Certificate
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          {/* Copy Type Selector */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            {(["Original", "Duplicate", "Office Copy"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCert({ ...cert, copyType: type })}
                className={`flex-1 sm:flex-initial text-center px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                  cert.copyType === type
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              title="View print history and undo certificate serials"
              className="gap-1.5 text-xs font-semibold h-10 sm:h-9 px-3 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Undo Print</span>
            </Button>

            {pickerMode === "bulk" ? (
              <Button
                onClick={handlePrintBatch}
                disabled={bulkStudents.length === 0}
                className="gap-2 text-xs font-bold bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white shadow-xs cursor-pointer h-10 sm:h-9 px-4 rounded-xl"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print Selected ({bulkStudents.length})</span>
              </Button>
            ) : (
              <Button
                onClick={handlePrintSingle}
                className="gap-2 text-xs font-bold bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white shadow-xs cursor-pointer h-10 sm:h-9 px-4 rounded-xl"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Inputs + Right Certificate Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
        {/* LEFT COLUMN: Controls & Auto-Fill (Hidden in Print) */}
        <div className="xl:col-span-5 space-y-4 print:hidden">
          {/* Card 1: Student Search & Core Details */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Student Search &amp; Particulars</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              <StudentPicker
                mode={pickerMode}
                onModeChange={setPickerMode}
                selectedStudent={selectedStudent}
                onSelectStudent={applyStudentToCertificate}
                onClearSelection={() => setSelectedStudent(null)}
                selectedIds={bulkStudents.map((s) => s.id)}
                onBulkSelectionChange={setBulkStudents}
              />

              {pickerMode === "bulk" && (
                <p className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-2 leading-relaxed">
                  Name, address &amp; academic details are filled per student automatically at print time. The settings below (reason, dates, signature) apply to every selected certificate.
                </p>
              )}

              {/* Student Name */}
              <div className={cn("space-y-1", pickerMode === "bulk" && "hidden")}>
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
              <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", pickerMode === "bulk" && "hidden")}>
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
                <div className={cn("space-y-1", pickerMode === "bulk" && "hidden")}>
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

              {/* Promotion Outcome Toggle (auto-computed per student in bulk mode) */}
              <div className={cn("pt-2 border-t space-y-2", pickerMode === "bulk" && "hidden")}>
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
              {pickerMode === "bulk" && (
                <p className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-2 leading-relaxed">
                  Reason for leaving is auto-set per student (completion vs. change of residence) based on their status.
                </p>
              )}
              {/* Reason Selector */}
              <div className={cn("space-y-2", pickerMode === "bulk" && "hidden")}>
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
                <div className={cn("space-y-1", pickerMode === "bulk" && "hidden")}>
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

              {/* Address details (per-student in bulk mode) */}
              <div className={cn("grid grid-cols-2 gap-2.5 pt-2 border-t", pickerMode === "bulk" && "hidden")}>
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
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t">
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

              {/* Digital Head Signature Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <Label htmlFor="toggle-tc-digital-sign" className="text-xs font-semibold cursor-pointer">
                  Digital Signature
                </Label>
                <Switch
                  id="toggle-tc-digital-sign"
                  checked={cert.includeDigitalSignature ?? true}
                  onCheckedChange={(checked) => setCert({ ...cert, includeDigitalSignature: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Paper & Margin Collapsible */}
          <div className="border-t pt-2">
            <button
              type="button"
              onClick={() => setPaperOpen((v) => !v)}
              className="w-full flex items-center justify-between px-1 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Paper &amp; Margin</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", paperOpen && "rotate-180")} />
            </button>
            {paperOpen && (
              <div className="space-y-2 pt-1">
                <Select value={paper} onValueChange={(v) => v && setPaper(v as PaperSize)}>
                  <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A5">A5</SelectItem>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={orientation} onValueChange={(v) => v && setOrientation(v as PaperOrientation)}>
                  <SelectTrigger className="w-full h-8 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Portrait</SelectItem>
                    <SelectItem value="landscape">Landscape</SelectItem>
                  </SelectContent>
                </Select>
                <p className="px-1 text-[10px] font-semibold text-muted-foreground">Margin (mm)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["top", "right", "bottom", "left"] as const).map((side) => (
                    <label key={side} className="space-y-0.5">
                      <span className="px-1 text-[10px] capitalize text-muted-foreground">{side}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={1}
                        value={margins[side]}
                        onChange={(e) => updateMargin(side, e.target.value)}
                        className="h-8 text-xs"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={savePaperSettings}
                  className="w-full mt-1 h-8 flex items-center justify-center gap-1.5 text-xs font-semibold border rounded-lg hover:bg-accent transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Settings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Transfer Certificate Preview */}
        <div className="xl:col-span-7 space-y-3.5 print:w-full print:m-0 print:p-0 xl:sticky xl:top-6">
          {/* Certificate Canvas with ZoomPanViewport */}
          <div id="printable-tc-canvas" className={printMode === "batch" ? "print:hidden" : undefined}>
            <ZoomPanViewport
              resetKey={`${paper}-${orientation}`}
              fitMode="contain"
              className="h-[46dvh] sm:h-[52dvh] xl:h-[calc(100dvh-2rem)] w-full print:hidden"
            >
              <TransferCertificatePrintableView data={cert} schoolProfile={schoolProfile} />
            </ZoomPanViewport>
            <div className="hidden print:block">
              <TransferCertificatePrintableView data={cert} schoolProfile={schoolProfile} />
            </div>
          </div>

          {/* Bulk Print Multi-Page Container: Rendered only during print */}
          {printMode === "batch" && (
            <div id="printable-tc-batch" className="hidden print:block">
              {bulkStudents.map((student, idx) => {
                const certNo = formatDocumentNumber(
                  "transfer-certificate",
                  certSeq - bulkStudents.length + idx,
                  currentYear
                );
                const studentData = buildCertDataForStudent(student, certNo);
                return (
                  <div
                    key={student.id}
                    className="page-break"
                    style={{
                      pageBreakAfter: idx === bulkStudents.length - 1 ? "avoid" : "always",
                      breakAfter: idx === bulkStudents.length - 1 ? "avoid" : "page",
                    }}
                  >
                    <TransferCertificatePrintableView data={studentData} schoolProfile={schoolProfile} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, aside, nav, .print\\:hidden, button { display: none !important; }
          @page { size: ${pageW}mm ${pageH}mm; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
          html, body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important;
            width: ${pageW}mm !important; height: auto !important; max-width: ${pageW}mm !important;
            overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-tc-canvas { background: transparent !important; padding: 0 !important; margin: 0 auto !important;
            border: none !important; box-shadow: none !important; width: ${pageW}mm !important;
            max-width: ${pageW}mm !important; box-sizing: border-box !important; display: block !important; }
          #printable-tc-canvas > div { transform: none !important; width: ${pageW}mm !important; margin: 0 !important; display: block !important; }
          #printable-tc-batch { background: transparent !important; padding: 0 !important; margin: 0 auto !important;
            width: ${pageW}mm !important; max-width: ${pageW}mm !important; display: block !important; }
          .page-break { width: ${pageW}mm !important; margin: 0 auto !important; display: block !important; box-sizing: border-box !important; }
          #pure-a5-tc-sheet { width: ${pageW}mm !important; min-width: ${pageW}mm !important; max-width: ${pageW}mm !important;
            margin: 0 auto !important; box-sizing: border-box !important; border: 2.5px solid #1e3a8a !important;
            page-break-inside: avoid !important; break-inside: avoid !important; break-after: avoid !important; }
        }
      ` }} />

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
