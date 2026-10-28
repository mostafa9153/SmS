"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudentById } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  PassCertificatePrintableView,
  PassCertificateData,
  formatDobToWords,
} from "@/components/certificate/pass-certificate-printable-view";
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
  buildPassCertInsert,
} from "@/lib/utils/certificate-registry";
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

function PassCertificateGeneratorContent() {
  const router = useRouter();
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
      const saved = localStorage.getItem("pass-cert-paper-settings");
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
      localStorage.setItem("pass-cert-paper-settings", JSON.stringify({ paper, orientation, margins }));
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

  // Pass Certificate Master State (Strictly A5)
  const [cert, setCert] = useState<PassCertificateData>(() => ({
    certificateNo: formatDocumentNumber("pass-certificate", 1, currentYear),
    issueDate: getLiveDate(),
    copyType: "Original",
    studentId: `MHS-${currentYear}-0001`,
    studentName: "Synthia Sanam",
    gender: "Female",
    fatherName: "Md. Ruhul Amin",
    village: "Marigachi",
    postOffice: "Marigachi",
    policeStation: "Mathurapur",
    district: "South 24 Parganas",
    pincode: "743349",
    admissionYear: String(currentYear - 5),
    admissionClass: "V",
    passingYear: String(currentYear),
    passedClass: "X",
    eligibleForClass: "XI",
    isCompletedOrPassedOut: true,
    dateOfBirth: "2010-08-15",
    dateOfBirthWords: "Fifteenth August, 2010",
    conduct: "good moral character",
    remarks:
      "To the best of my knowledge, she bears an exemplary moral character and upright conduct during her academic tenure. I wish her every success and prosperity in all future academic pursuits and career endeavors.",
    headmasterTitle: "Teacher-in-Charge / Headmaster",
    includeDigitalSignature: true,
  }));

  const handleReset = () => {
    setSelectedStudent(null);
    const seq = getDocumentSequence("pass-certificate", currentYear);
    setCert({
      certificateNo: formatDocumentNumber("pass-certificate", seq, currentYear),
      issueDate: getLiveDate(),
      copyType: "Original",
      studentId: `MHS-${currentYear}-0001`,
      studentName: "Synthia Sanam",
      gender: "Female",
      fatherName: "Md. Ruhul Amin",
      village: "Marigachi",
      postOffice: "Marigachi",
      policeStation: "Mathurapur",
      district: "South 24 Parganas",
      pincode: "743349",
      admissionYear: String(currentYear - 5),
      admissionClass: "V",
      passingYear: String(currentYear),
      passedClass: "X",
      eligibleForClass: "XI",
      isCompletedOrPassedOut: true,
      dateOfBirth: "2010-08-15",
      dateOfBirthWords: "Fifteenth August, 2010",
      conduct: "good moral character",
      remarks:
        "To the best of my knowledge, she bears an exemplary moral character and upright conduct during her academic tenure. I wish her every success and prosperity in all future academic pursuits and career endeavors.",
      headmasterTitle: schoolProfile ? getEffectiveHeadTitle(schoolProfile) : "Teacher-in-Charge / Headmaster",
      includeDigitalSignature: true,
    });
  };

  // Auto-sync sequence when year rolls over or on mount
  useEffect(() => {
    const seq = getDocumentSequence("pass-certificate", currentYear);
    setCertSeq(seq);
    setCert((prev) => ({
      ...prev,
      certificateNo: formatDocumentNumber("pass-certificate", seq, currentYear),
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
    const pronounPossessive = isFemale ? "her" : "his";
    const pronounSubject = isFemale ? "She" : "He";

    const passedCls = s.presentClass || "X";
    const nextCls = getNextClass(passedCls);
    const isPassedOutStatus =
      s.currentStatus === "Passed Out" ||
      s.currentStatus === "C.C.H.S." ||
      passedCls === "XII" ||
      passedCls === "X";

    const dobVal = s.dob || "2010-08-15";
    const dobWords = formatDobToWords(dobVal);

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
      admissionYear: s.admissionYear ? String(s.admissionYear) : String(currentYear - 4),
      admissionClass: "V",
      passingYear: String(currentYear),
      passedClass: passedCls,
      eligibleForClass: nextCls,
      isCompletedOrPassedOut: isPassedOutStatus,
      dateOfBirth: dobVal,
      dateOfBirthWords: dobWords,
      certificateNo: prev.certificateNo || formatDocumentNumber("pass-certificate", certSeq, currentYear),
      remarks: `To the best of my knowledge, ${pronounSubject.toLowerCase()} bears an exemplary moral character and upright conduct during ${pronounPossessive} academic tenure. I wish ${pronounObject} every success and prosperity in all future academic pursuits and career endeavors.`,
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
  function buildCertDataForStudent(s: Student, certNo: string): PassCertificateData {
    const parsedAddr = parseAddress(s.address);
    const isFemale = s.gender === "Female";
    const pronounObject = isFemale ? "her" : "him";
    const pronounPossessive = isFemale ? "her" : "his";
    const pronounSubject = isFemale ? "She" : "He";

    const passedCls = s.presentClass || "X";
    const nextCls = getNextClass(passedCls);
    const isPassedOutStatus =
      s.currentStatus === "Passed Out" ||
      s.currentStatus === "C.C.H.S." ||
      passedCls === "XII" ||
      passedCls === "X";

    const dobVal = s.dob || "2010-08-15";
    const dobWords = formatDobToWords(dobVal);

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
      admissionYear: s.admissionYear ? String(s.admissionYear) : String(currentYear - 4),
      passedClass: passedCls,
      eligibleForClass: nextCls,
      isCompletedOrPassedOut: isPassedOutStatus,
      dateOfBirth: dobVal,
      dateOfBirthWords: dobWords,
      remarks: `To the best of my knowledge, ${pronounSubject.toLowerCase()} bears an exemplary moral character and upright conduct during ${pronounPossessive} academic tenure. I wish ${pronounObject} every success and prosperity in all future academic pursuits and career endeavors.`,
    };
  }

  // Handle DOB change with automatic word generation
  function handleDobChange(val: string) {
    const words = formatDobToWords(val);
    setCert((prev) => ({
      ...prev,
      dateOfBirth: val,
      dateOfBirthWords: words,
    }));
  }

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Native Direct Print Trigger (Reliable & Zero Blank Issue)
  const handlePrintSingle = () => {
    setPrintMode("single");
    const currentCertificateNo = cert.certificateNo;
    const nextSeq = certSeq + 1;
    saveDocumentSequence("pass-certificate", nextSeq, currentYear);
    recordPrintBatch(
      {
        docType: "pass-certificate",
        mode: "single",
        startSerial: certSeq,
        endSerial: certSeq,
        formattedStart: currentCertificateNo,
        formattedEnd: currentCertificateNo,
        count: 1,
        classInfo: `${cert.studentName} (Passed: ${cert.passedClass})`,
      },
      currentYear
    );
    // Persist printed certificate to database registry & local cache
    recordPrintedCertificate(buildPassCertInsert(cert, String(currentYear)));

    const nextFormattedNo = formatDocumentNumber("pass-certificate", nextSeq, currentYear);

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
    saveDocumentSequence("pass-certificate", nextSeq, currentYear);
    setCertSeq(nextSeq);

    bulkStudents.forEach((student, idx) => {
      const certNo = formatDocumentNumber("pass-certificate", startSeq + idx, currentYear);
      const certData = buildCertDataForStudent(student, certNo);
      recordPrintedCertificate(buildPassCertInsert(certData, String(currentYear)));
    });

    const formattedStart = formatDocumentNumber("pass-certificate", startSeq, currentYear);
    const formattedEnd = formatDocumentNumber("pass-certificate", endSeq, currentYear);
    recordPrintBatch(
      {
        docType: "pass-certificate",
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Pass Out &amp; Completion Certificate
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
            {/* Undo Last Print Button (Left of Print) */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHistoryOpen(true)}
              className="gap-1.5 text-xs font-semibold h-10 sm:h-9 px-3 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 cursor-pointer shadow-2xs"
              title="View print history and undo certificate serials"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Undo Print</span>
            </Button>

            {pickerMode === "bulk" ? (
              <Button
                onClick={handlePrintBatch}
                disabled={bulkStudents.length === 0}
                className="gap-2 text-xs font-bold bg-[#0f766e] hover:bg-[#0f766e]/90 text-white shadow-xs cursor-pointer rounded-xl h-10 sm:h-9 px-3.5"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print Selected ({bulkStudents.length})</span>
              </Button>
            ) : (
              <Button
                onClick={handlePrintSingle}
                className="gap-2 text-xs font-bold bg-[#0f766e] hover:bg-[#0f766e]/90 text-white shadow-xs cursor-pointer rounded-xl h-10 sm:h-9 px-3.5"
              >
                <Printer className="h-4 w-4 shrink-0" />
                <span>Print (A5)</span>
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
                <span>Student Information &amp; Auto-Fill</span>
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
                  Name, address &amp; passing details are filled per student automatically at print time. The settings below (dates, signature) apply to every selected certificate.
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

          {/* Card 2: Academic Admission & Passing Details */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span>Academic Admission &amp; Passing Record</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Initial Admission Class</Label>
                  <CustomSelect
                    value={cert.admissionClass}
                    onChange={(val) => setCert({ ...cert, admissionClass: val })}
                    options={STANDARD_CLASSES.map((c) => ({
                      label: `Class ${c}`,
                      value: c,
                    }))}
                    className="w-full text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Admission Year</Label>
                  <Input
                    value={cert.admissionYear}
                    onChange={(e) => setCert({ ...cert, admissionYear: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 2020"
                  />
                </div>
                <div className={cn("space-y-1", pickerMode === "bulk" && "hidden")}>
                  <Label className="text-[11px] text-muted-foreground">Passed Out / Completed Class</Label>
                  <CustomSelect
                    value={cert.passedClass}
                    onChange={(val) => {
                      const next = getNextClass(val);
                      setCert({
                        ...cert,
                        passedClass: val,
                        eligibleForClass: next,
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
                  <Label className="text-[11px] text-muted-foreground">Passing Session Year</Label>
                  <Input
                    value={cert.passingYear}
                    onChange={(e) => setCert({ ...cert, passingYear: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 2026"
                  />
                </div>
              </div>

              {/* Completion Outcome Switcher (auto-computed per student in bulk mode) */}
              <div className={cn("pt-2 border-t space-y-2", pickerMode === "bulk" && "hidden")}>
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  Certification Status Type
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCert({ ...cert, isCompletedOrPassedOut: true })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      cert.isCompletedOrPassedOut
                        ? "bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 font-bold"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Passed Out &amp; Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setCert({ ...cert, isCompletedOrPassedOut: false })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      !cert.isCompletedOrPassedOut
                        ? "bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 font-bold"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    Promoted to Next Class
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
                <span>Date of Birth &amp; Address Particulars</span>
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
                <Label htmlFor="toggle-pass-digital-sign" className="text-xs font-semibold cursor-pointer">
                  Digital Signature
                </Label>
                <Switch
                  id="toggle-pass-digital-sign"
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

        {/* RIGHT COLUMN: Certificate Preview */}
        <div className="xl:col-span-7 space-y-3.5 print:w-full print:m-0 print:p-0 xl:sticky xl:top-6">
          {/* Certificate Canvas with ZoomPanViewport */}
          <div id="printable-pass-certificate-canvas" className={printMode === "batch" ? "print:hidden" : undefined}>
            <ZoomPanViewport
              resetKey={`${paper}-${orientation}`}
              fitMode="contain"
              className="h-[46dvh] sm:h-[52dvh] xl:h-[calc(100dvh-2rem)] w-full print:hidden"
            >
              <PassCertificatePrintableView data={cert} schoolProfile={schoolProfile} />
            </ZoomPanViewport>
            <div className="hidden print:block">
              <PassCertificatePrintableView data={cert} schoolProfile={schoolProfile} />
            </div>
          </div>

          {/* Bulk Print Multi-Page Container: Rendered only during print */}
          {printMode === "batch" && (
            <div id="printable-pass-certificate-batch" className="hidden print:block">
              {bulkStudents.map((student, idx) => {
                const certNo = formatDocumentNumber(
                  "pass-certificate",
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
                    <PassCertificatePrintableView data={studentData} schoolProfile={schoolProfile} />
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
          #printable-pass-certificate-canvas { background: transparent !important; padding: 0 !important; margin: 0 auto !important;
            border: none !important; box-shadow: none !important; width: ${pageW}mm !important;
            max-width: ${pageW}mm !important; box-sizing: border-box !important; display: block !important; }
          #printable-pass-certificate-canvas > div { transform: none !important; width: ${pageW}mm !important; margin: 0 !important; display: block !important; }
          #printable-pass-certificate-batch { background: transparent !important; padding: 0 !important; margin: 0 auto !important;
            width: ${pageW}mm !important; max-width: ${pageW}mm !important; display: block !important; }
          .page-break { width: ${pageW}mm !important; margin: 0 auto !important; display: block !important; box-sizing: border-box !important; }
          #pure-a5-pass-certificate-sheet { width: ${pageW}mm !important; min-width: ${pageW}mm !important; max-width: ${pageW}mm !important;
            margin: 0 auto !important; box-sizing: border-box !important; border: 2.5px solid #0f766e !important;
            page-break-inside: avoid !important; break-inside: avoid !important; break-after: avoid !important; }
        }
      ` }} />

      {/* Print Batch History & Selective Undo Modal */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="pass-certificate"
        onUndoBatch={(newStart) => {
          setCertSeq(newStart);
          setCert((prev) => ({
            ...prev,
            certificateNo: formatDocumentNumber("pass-certificate", newStart, currentYear),
          }));
        }}
      />
    </div>
  );
}

export default function PassCertificateGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-muted-foreground">
          Loading Pass Out Certificate Generator...
        </div>
      }
    >
      <PassCertificateGeneratorContent />
    </Suspense>
  );
}
