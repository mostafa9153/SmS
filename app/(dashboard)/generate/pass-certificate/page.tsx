"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  PassCertificatePrintableView,
  PassCertificateData,
  formatDobToWords,
} from "@/components/certificate/pass-certificate-printable-view";
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
  Sparkles,
  Award,
  CheckCircle2,
  FileText,
  GraduationCap,
} from "lucide-react";

const STANDARD_CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function getNextClass(currentClass: string): string {
  const idx = STANDARD_CLASSES.indexOf(currentClass);
  if (idx >= 0 && idx < STANDARD_CLASSES.length - 1) {
    return STANDARD_CLASSES[idx + 1];
  }
  return "College / Higher Studies";
}

function PassCertificateGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");

  // Fetch all students for search & auto-fill
  const { data: students = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [previewScale, setPreviewScale] = useState<number>(1.0);

  const currentYear = new Date().getFullYear();

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Pass Certificate Master State (Strictly A5)
  const [cert, setCert] = useState<PassCertificateData>(() => ({
    certificateNo: `MHS/POC/${currentYear}/0036`,
    issueDate: getLiveDate(),
    studentId: "MHS-2026-0036",
    studentName: "Synthia Sanam",
    gender: "Female",
    fatherName: "Md. Ruhul Amin",
    village: "Marigachi",
    postOffice: "Kharigachi",
    policeStation: "Diamond Harbour",
    district: "South 24 Parganas",
    pincode: "743368",
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
  }));

  // Auto-fill address components from free-text student address
  function parseAddress(addr?: string) {
    if (!addr) {
      return {
        village: "Marigachi",
        postOffice: "Kharigachi",
        policeStation: "Diamond Harbour",
        district: "South 24 Parganas",
        pincode: "743368",
      };
    }
    const parts = addr.split(",").map((p) => p.trim());
    const pinMatch = addr.match(/\b\d{6}\b/);
    return {
      village: parts[0] || "Marigachi",
      postOffice: parts[1] || "Kharigachi",
      policeStation: parts[2] || "Diamond Harbour",
      district: parts[3] || "South 24 Parganas",
      pincode: pinMatch ? pinMatch[0] : "743368",
    };
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
      certificateNo: `MHS/POC/${currentYear}/${s.presentRoll ? String(s.presentRoll).padStart(4, "0") : "0001"}`,
      remarks: `To the best of my knowledge, ${pronounSubject.toLowerCase()} bears an exemplary moral character and upright conduct during ${pronounPossessive} academic tenure. I wish ${pronounObject} every success and prosperity in all future academic pursuits and career endeavors.`,
    }));
  }

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

  // Handle DOB change with automatic word generation
  function handleDobChange(val: string) {
    const words = formatDobToWords(val);
    setCert((prev) => ({
      ...prev,
      dateOfBirth: val,
      dateOfBirthWords: words,
    }));
  }

  // Native Direct Print Trigger (Reliable & Zero Blank Issue)
  const handlePrint = () => {
    setCert((prev) => ({
      ...prev,
      issueDate: getLiveDate(),
    }));
    setTimeout(() => {
      window.print();
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Pass Out &amp; Completion Certificate</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono"
              >
                Class V – XII
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Official academic completion and promotion certificate studio for passout and continuing students.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Strictly A5 Format Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-2xs">
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            <span>Pure A5 Full-Bleed</span>
          </div>

          <Button
            onClick={handlePrint}
            className="gap-2 text-xs font-bold bg-[#0f766e] hover:bg-[#0f766e]/90 text-white shadow-xs cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Certificate (A5)</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Inputs + Right Certificate Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block print:w-full print:m-0 print:p-0">
        {/* LEFT COLUMN: Controls & Auto-Fill (Hidden in Print) */}
        <div className="xl:col-span-5 space-y-4 print:hidden overflow-y-auto max-h-[calc(100vh-140px)] pr-2 pb-48">
          {/* Card 1: Student Search & Core Details */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Student Information &amp; Auto-Fill</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Search Existing Student */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Type Student ID, Name, Roll No, or PEN..."
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

          {/* Card 2: Academic Admission & Passing Details */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                <span>Academic Admission &amp; Passing Record</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
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
                <div className="space-y-1">
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

              {/* Completion Outcome Switcher */}
              <div className="pt-2 border-t space-y-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Certificate Ref No</Label>
                  <Input
                    value={cert.certificateNo}
                    onChange={(e) => setCert({ ...cert, certificateNo: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Live Print-Ready Certificate Preview */}
        <div className="xl:col-span-7 space-y-4 print:w-full print:m-0 print:p-0">
          <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-teal-600" />
              Live Pass Out Certificate Preview (A5 Portrait &bull; 148 &times; 210 mm)
            </span>

            {/* Scale slider */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-semibold">Scale:</span>
              {[0.9, 1.0, 1.1].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPreviewScale(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                    previewScale === s
                      ? "bg-teal-600 text-white font-bold shadow-2xs"
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
            id="printable-pass-certificate-canvas"
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
              <PassCertificatePrintableView data={cert} />
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
            size: A5 portrait !important;
            margin: 0mm !important;
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
          #printable-pass-certificate-canvas {
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

          #printable-pass-certificate-canvas > div {
            transform: none !important;
            width: 148mm !important;
            height: 208mm !important;
            margin: 0 !important;
            display: block !important;
          }

          #pure-a5-pass-certificate-sheet {
            width: 148mm !important;
            height: 208mm !important;
            min-width: 148mm !important;
            max-width: 148mm !important;
            min-height: 208mm !important;
            max-height: 208mm !important;
            margin: 0 auto !important;
            padding: 3.5mm !important;
            box-sizing: border-box !important;
            border: 2.5px solid #0f766e !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>
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
