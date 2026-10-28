"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudentById } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  KanyashreeCertificatePrintableView,
  KanyashreeCertificateData,
  formatDobToWords,
} from "@/components/certificate/kanyashree-certificate-printable-view";
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
  User,
  Calendar,
  HeartHandshake,
  GraduationCap,
  RotateCcw,
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
import {
  recordPrintedCertificate,
  buildKanyashreeCertInsert,
} from "@/lib/utils/certificate-registry";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const STANDARD_SECTIONS = ["A", "B", "C", "D"];

const SCHEME_OPTIONS = [
  { label: "Kanyashree Prakalpa (K1 / K2)", value: "Kanyashree Prakalpa (K1 / K2)" },
  { label: "Aikyashree Scholarship", value: "Aikyashree Scholarship" },
  { label: "Oasis Scholarship Scheme", value: "Oasis Scholarship Scheme" },
  { label: "Institutional Bonafide & Leaving", value: "Institutional Bonafide & Leaving" },
];

type PaperSize = "A5" | "A4" | "A3";
type PaperOrientation = "portrait" | "landscape";
interface PrintMargins { top: number; right: number; bottom: number; left: number; }
const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A5: { w: 148, h: 210 }, A4: { w: 210, h: 297 }, A3: { w: 297, h: 420 },
};

function KanyashreeCertificateGeneratorContent() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const { profile: schoolProfile } = useSchoolProfile();

  const [pickerMode, setPickerMode] = useState<StudentPickerMode>("single");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]);
  const [printMode, setPrintMode] = useState<"single" | "batch">("single");

  const { data: directStudentData } = useQuery({
    queryKey: ["students", "direct", studentIdParam],
    queryFn: () => getStudentById(studentIdParam!),
    enabled: !!studentIdParam,
    staleTime: 5 * 60 * 1000,
  });

  const [paper, setPaper] = useState<PaperSize>("A5");
  const [orientation, setOrientation] = useState<PaperOrientation>("portrait");
  const [margins, setMargins] = useState<PrintMargins>({ top: 10, right: 10, bottom: 10, left: 10 });
  const [paperOpen, setPaperOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("kanyashree-paper-settings");
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
      localStorage.setItem("kanyashree-paper-settings", JSON.stringify({ paper, orientation, margins }));
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

  // Master State (Strictly A5)
  const [cert, setCert] = useState<KanyashreeCertificateData>(() => ({
    certificateNo: formatDocumentNumber("kanyashree", 1, currentYear),
    issueDate: getLiveDate(),
    copyType: "Original",
    schemeType: "Kanyashree Prakalpa (K1 / K2)",
    studentId: `MHS-${currentYear}-0001`,
    kanyashreeId: "19111305602200010",
    pen: "20180201010",
    studentName: "TANIA HALDER",
    gender: "Female",
    fatherName: "Manas Das",
    motherName: "Chaitali Saha",
    village: "Marigachi",
    postOffice: "Mathurapur",
    policeStation: "Diamond Harbour",
    district: "South 24 Parganas",
    pincode: "743368",
    academicSession: String(currentYear),
    presentClass: "IX",
    presentSection: "A",
    presentRoll: "10",
    dateOfBirth: "2011-11-04",
    dateOfBirthWords: "Fourth November, Two Thousand Eleven",
    isUnmarried: true,
    conduct: "exemplary moral character",
    remarks:
      "She bears an exemplary moral character and disciplined conduct. I wish her all success and empowerment in all future academic pursuits and career endeavours.",
    headmasterTitle: "Teacher-in-Charge / Headmaster",
    includeDigitalSignature: true,
  }));

  // Auto-sync sequence when year rolls over or on mount
  useEffect(() => {
    const seq = getDocumentSequence("kanyashree", currentYear);
    setCertSeq(seq);
    setCert((prev) => ({
      ...prev,
      certificateNo: formatDocumentNumber("kanyashree", seq, currentYear),
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
    const isFemale = s.gender === "Female";
    const pronounObject = isFemale ? "her" : "him";
    const pronounSubject = isFemale ? "She" : "He";

    const dobVal = s.dob || "2011-11-04";
    const dobWords = formatDobToWords(dobVal);

    setCert((prev) => ({
      ...prev,
      studentId: s.id,
      kanyashreeId: s.kanyashreeId || (s.pen ? `19111305602${s.pen.slice(-6)}` : `19111305602${s.id.replace(/\D/g, "").padStart(8, "0")}`),
      pen: s.pen || "",
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
      presentClass: s.presentClass || "IX",
      presentSection: s.presentSection || "A",
      presentRoll: s.presentRoll ? String(s.presentRoll).padStart(2, "0") : "10",
      academicSession: String(currentYear),
      dateOfBirth: dobVal,
      dateOfBirthWords: dobWords,
      isUnmarried: true,
      certificateNo: prev.certificateNo || formatDocumentNumber("kanyashree", certSeq, currentYear),
      remarks: `${pronounSubject} bears an exemplary moral character and disciplined conduct. I wish ${pronounObject} all success and empowerment in all future academic pursuits and career endeavours.`,
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
          headmasterTitle: title || prev.headmasterTitle,
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
    if (directStudentData) {
      applyStudentToCertificate(directStudentData);
    }
  }, [directStudentData]);

  // Pure transform used for bulk printing: builds one certificate's data from
  // a roster student + the common settings currently set in `cert`.
  function buildCertDataForStudent(s: Student, certNo: string): KanyashreeCertificateData {
    const parsedAddr = parseAddress(s.address);
    const isFemale = s.gender === "Female";
    const pronounObject = isFemale ? "her" : "him";
    const pronounSubject = isFemale ? "She" : "He";
    const dobVal = s.dob || "2011-11-04";
    const dobWords = formatDobToWords(dobVal);

    return {
      ...cert,
      certificateNo: certNo,
      studentId: s.id,
      kanyashreeId: s.kanyashreeId || (s.pen ? `19111305602${s.pen.slice(-6)}` : `19111305602${s.id.replace(/\D/g, "").padStart(8, "0")}`),
      pen: s.pen || "",
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
      presentClass: s.presentClass || "IX",
      presentSection: s.presentSection || "A",
      presentRoll: s.presentRoll ? String(s.presentRoll).padStart(2, "0") : "10",
      dateOfBirth: dobVal,
      dateOfBirthWords: dobWords,
      remarks: `${pronounSubject} bears an exemplary moral character and disciplined conduct. I wish ${pronounObject} all success and empowerment in all future academic pursuits and career endeavours.`,
    };
  }

  // Handle DOB change with automatic word parsing
  function handleDobChange(val: string) {
    const words = formatDobToWords(val);
    setCert((prev) => ({
      ...prev,
      dateOfBirth: val,
      dateOfBirthWords: words,
    }));
  }

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Native Direct Print Trigger
  const handlePrintSingle = () => {
    setPrintMode("single");
    const currentCertificateNo = cert.certificateNo;
    const nextSeq = certSeq + 1;
    saveDocumentSequence("kanyashree", nextSeq, currentYear);
    recordPrintBatch(
      {
        docType: "kanyashree",
        mode: "single",
        startSerial: certSeq,
        endSerial: certSeq,
        formattedStart: currentCertificateNo,
        formattedEnd: currentCertificateNo,
        count: 1,
        classInfo: `${cert.studentName} (${cert.schemeType})`,
      },
      currentYear
    );
    // Persist printed certificate to database registry & local cache
    recordPrintedCertificate(buildKanyashreeCertInsert(cert, String(currentYear)));

    const nextFormattedNo = formatDocumentNumber("kanyashree", nextSeq, currentYear);

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
  // settings currently configured in the form (issue date, scheme, etc.)
  const handlePrintBatch = () => {
    if (bulkStudents.length === 0) return;
    setPrintMode("batch");

    const startSeq = certSeq;
    const count = bulkStudents.length;
    const endSeq = startSeq + count - 1;
    const nextSeq = endSeq + 1;
    saveDocumentSequence("kanyashree", nextSeq, currentYear);
    setCertSeq(nextSeq);

    bulkStudents.forEach((student, idx) => {
      const certNo = formatDocumentNumber("kanyashree", startSeq + idx, currentYear);
      const certData = buildCertDataForStudent(student, certNo);
      recordPrintedCertificate(buildKanyashreeCertInsert(certData, String(currentYear)));
    });

    const formattedStart = formatDocumentNumber("kanyashree", startSeq, currentYear);
    const formattedEnd = formatDocumentNumber("kanyashree", endSeq, currentYear);
    recordPrintBatch(
      {
        docType: "kanyashree",
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
      <PageHeader
        back
        icon={HeartHandshake}
        title="Kanyashree & Bonafide Certificate"
        actions={<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
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
                className="gap-2 text-xs font-bold bg-[#9333ea] hover:bg-[#9333ea]/90 text-white shadow-xs cursor-pointer h-10 sm:h-9 px-4 rounded-xl"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print Selected ({bulkStudents.length})</span>
              </Button>
            ) : (
              <Button
                onClick={handlePrintSingle}
                className="gap-2 text-xs font-bold bg-[#9333ea] hover:bg-[#9333ea]/90 text-white shadow-xs cursor-pointer h-10 sm:h-9 px-4 rounded-xl"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print (A5)</span>
              </Button>
            )}
          </div>
        </div>}
        className="border-b pb-4 print:hidden"
      />

      {/* Main Grid: Left Inputs + Right Certificate Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
        {/* LEFT COLUMN: Controls & Auto-Fill (Hidden in Print) */}
        <div className="xl:col-span-5 space-y-4 print:hidden">
          {/* Card 1: Kanyashree Student Search & Particulars */}
          {/* Card 1: Student Search & Core Details */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Kanyashree Student Search &amp; Particulars</span>
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
                  Name, address &amp; academic details are filled per student automatically at print time. The settings below (scheme, dates, signature) apply to every selected certificate.
                </p>
              )}

              {/* Student Name */}
              <div className={cn("space-y-1", pickerMode === "bulk" && "hidden")}>
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Applicant Student Full Name
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
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Mother&apos;s Name (Optional)
                  </Label>
                  <Input
                    value={cert.motherName || ""}
                    onChange={(e) => setCert({ ...cert, motherName: e.target.value })}
                    className="text-xs h-8"
                    placeholder="Mother's Name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Academic Enrollment & Marital Status (per-student in bulk mode) */}
          <Card className={cn("border shadow-2xs overflow-visible", pickerMode === "bulk" && "hidden")}>
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span>Class Enrollment &amp; Kanyashree Records</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Present Class</Label>
                  <CustomSelect
                    value={cert.presentClass}
                    searchable={false}
                    onChange={(val) => setCert({ ...cert, presentClass: val })}
                    options={STANDARD_CLASSES.map((c) => ({
                      label: `Class ${c}`,
                      value: c,
                    }))}
                    className="w-full text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Section</Label>
                  <CustomSelect
                    value={cert.presentSection}
                    searchable={false}
                    onChange={(val) => setCert({ ...cert, presentSection: val })}
                    options={STANDARD_SECTIONS.map((s) => ({
                      label: `Section ${s}`,
                      value: s,
                    }))}
                    className="w-full text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Roll No</Label>
                  <Input
                    value={cert.presentRoll}
                    onChange={(e) => setCert({ ...cert, presentRoll: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 01"
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
              </div>

              {/* Kanyashree ID & Banglar Siksha Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Kanyashree / Portal ID</Label>
                  <Input
                    value={cert.kanyashreeId || ""}
                    onChange={(e) => setCert({ ...cert, kanyashreeId: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 19180201004..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">PEN / Student Code</Label>
                  <Input
                    value={cert.pen || ""}
                    onChange={(e) => setCert({ ...cert, pen: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 20180201004"
                  />
                </div>
              </div>

              {/* Unmarried Status Declaration */}
              <div className="pt-2 border-t space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Marital Status Declaration (Kanyashree Requirement)
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCert({ ...cert, isUnmarried: true })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      cert.isUnmarried
                        ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    ✓ Certified Unmarried
                  </button>
                  <button
                    type="button"
                    onClick={() => setCert({ ...cert, isUnmarried: false })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      !cert.isUnmarried
                        ? "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 font-bold"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Standard Bonafide (Omit Unmarried)
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Date of Birth & Address Record */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Date of Birth &amp; Residential Address</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* DOB Inputs */}
              <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", pickerMode === "bulk" && "hidden")}>
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
                  <Label className="text-[11px] text-muted-foreground">DOB in Words</Label>
                  <Input
                    value={cert.dateOfBirthWords || ""}
                    onChange={(e) => setCert({ ...cert, dateOfBirthWords: e.target.value })}
                    className="text-xs h-8 italic"
                    placeholder="e.g. Fifteenth August, 2010"
                  />
                </div>
              </div>

              {/* Address Details */}
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
                  <Label className="text-[11px] text-muted-foreground">Police Station</Label>
                  <Input
                    value={cert.policeStation}
                    onChange={(e) => setCert({ ...cert, policeStation: e.target.value })}
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
                  <Label className="text-[11px] text-muted-foreground">PIN Code</Label>
                  <Input
                    value={cert.pincode}
                    onChange={(e) => setCert({ ...cert, pincode: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t">
                <Label className="text-[11px] text-muted-foreground">Certificate Ref No</Label>
                <Input
                  value={cert.certificateNo}
                  onChange={(e) => setCert({ ...cert, certificateNo: e.target.value })}
                  className="text-xs h-8 font-mono max-w-[200px]"
                />
              </div>

              {/* Digital Head Signature Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <Label htmlFor="toggle-kanya-digital-sign" className="text-xs font-semibold cursor-pointer">
                  Digital Signature
                </Label>
                <Switch
                  id="toggle-kanya-digital-sign"
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

        {/* RIGHT COLUMN: Kanyashree Certificate Preview */}
        <div className="xl:col-span-7 space-y-3.5 print:w-full print:m-0 print:p-0 xl:sticky xl:top-6">
          {/* Certificate Canvas with ZoomPanViewport */}
          <div id="printable-kanyashree-canvas" className={printMode === "batch" ? "print:hidden" : undefined}>
            <ZoomPanViewport
              resetKey={`${paper}-${orientation}`}
              fitMode="contain"
              className="h-[46dvh] sm:h-[52dvh] xl:h-[calc(100dvh-2rem)] w-full print:hidden"
            >
              <KanyashreeCertificatePrintableView data={cert} schoolProfile={schoolProfile} />
            </ZoomPanViewport>
            <div className="hidden print:block">
              <KanyashreeCertificatePrintableView data={cert} schoolProfile={schoolProfile} />
            </div>
          </div>

          {/* Bulk Print Multi-Page Container: Rendered only during print */}
          {printMode === "batch" && (
            <div id="printable-kanyashree-batch" className="hidden print:block">
              {bulkStudents.map((student, idx) => {
                const certNo = formatDocumentNumber("kanyashree", certSeq - bulkStudents.length + idx, currentYear);
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
                    <KanyashreeCertificatePrintableView data={studentData} schoolProfile={schoolProfile} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="kanyashree"
        onUndoBatch={(newStart) => {
          setCertSeq(newStart);
          setCert((prev) => ({
            ...prev,
            certificateNo: formatDocumentNumber("kanyashree", newStart, currentYear),
          }));
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          header, aside, nav, .print\\:hidden, button { display: none !important; }
          @page { size: ${pageW}mm ${pageH}mm; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
          html, body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important;
            width: ${pageW}mm !important; height: auto !important; max-width: ${pageW}mm !important;
            overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #printable-kanyashree-canvas { background: transparent !important; padding: 0 !important; margin: 0 auto !important;
            border: none !important; box-shadow: none !important; width: ${pageW}mm !important;
            max-width: ${pageW}mm !important; box-sizing: border-box !important; display: block !important; }
          #printable-kanyashree-canvas > div { transform: none !important; width: ${pageW}mm !important; margin: 0 !important; display: block !important; }
          #printable-kanyashree-batch { background: transparent !important; padding: 0 !important; margin: 0 auto !important;
            width: ${pageW}mm !important; max-width: ${pageW}mm !important; display: block !important; }
          .page-break { width: ${pageW}mm !important; margin: 0 auto !important; display: block !important; box-sizing: border-box !important; }
          #pure-a5-kanyashree-sheet { width: ${pageW}mm !important; min-width: ${pageW}mm !important; max-width: ${pageW}mm !important;
            margin: 0 auto !important; box-sizing: border-box !important; border: 2.5px solid #9333ea !important;
            page-break-inside: avoid !important; break-inside: avoid !important; break-after: avoid !important; }
        }
      ` }} />
    </div>
  );
}

export default function KanyashreeCertificateGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-muted-foreground">
          Loading Kanyashree Certificate Generator...
        </div>
      }
    >
      <KanyashreeCertificateGeneratorContent />
    </Suspense>
  );
}
