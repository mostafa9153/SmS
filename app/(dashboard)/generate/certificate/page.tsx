"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  CertificatePrintableView,
  CharacterCertificateData,
} from "@/components/certificate/certificate-printable-view";
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
  FileCheck,
  Search,
  Sparkles,
  GraduationCap,
  Building,
  Award,
  CheckCircle2,
  FileText,
} from "lucide-react";

function CertificateGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const examParam = searchParams.get("exam");

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

  // Certificate Master State (Strictly A5)
  const [cert, setCert] = useState<CharacterCertificateData>(() => ({
    certificateNo: `MHS/CC/${currentYear}/0036`,
    issueDate: getLiveDate(),
    examType: examParam === "HS" ? "HS" : "MP",
    studentId: "MHS-2026-0036",
    studentName: "Synthia Sanam",
    gender: "Female",
    fatherName: "Md. Ruhul Amin",
    village: "Marigachi",
    postOffice: "Kharigachi",
    policeStation: "Diamond Harbour",
    district: "South 24 Parganas",
    pincode: "743368",
    passingYear: String(currentYear),
    boardRollNo: "123456N 0012",
    boardRegistrationNo: "19180201004/2024",
    conduct: "good moral character",
    remarks:
      "I wish her every success, prosperity, and fulfillment in all her future academic and personal endeavors.",
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

    const isClass12orHS =
      s.presentClass === "XII" ||
      s.currentStatus === "C.C.H.S." ||
      s.currentStatus === "Passed Out";

    const chosenExam = isClass12orHS ? "HS" : "MP";
    const isFemale = s.gender === "Female";
    const pronounObject = isFemale ? "her" : "him";
    const pronounPossessive = isFemale ? "her" : "his";

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
      examType: chosenExam,
      passingYear: String(currentYear),
      boardRollNo: s.presentRoll ? `123456N 00${s.presentRoll}` : prev.boardRollNo,
      boardRegistrationNo: s.pen || s.schoolId || prev.boardRegistrationNo,
      certificateNo: `MHS/CC/${currentYear}/${s.presentRoll ? String(s.presentRoll).padStart(4, "0") : "0001"}`,
      remarks: `I wish ${pronounObject} every success, prosperity, and fulfillment in all ${pronounPossessive} future academic and personal endeavors.`,
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

  // Switch between MP & HS
  function handleExamTypeChange(type: "MP" | "HS") {
    setCert((prev) => ({
      ...prev,
      examType: type,
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Character Certificate</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 font-mono"
              >
                MP &amp; HS Generator
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Official character &amp; conduct certificate studio for Madhyamik and Higher Secondary passouts.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* MP vs HS Toggle */}
          <div className="flex items-center rounded-xl border bg-muted/40 p-1 text-xs font-semibold">
            <button
              onClick={() => handleExamTypeChange("MP")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                cert.examType === "MP"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
              <span>Madhyamik (MP)</span>
            </button>
            <button
              onClick={() => handleExamTypeChange("HS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                cert.examType === "HS"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building className="h-3.5 w-3.5 text-indigo-600" />
              <span>Higher Secondary (HS)</span>
            </button>
          </div>

          {/* Strictly A5 Format Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-2xs">
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            <span>Pure A5 Full-Bleed</span>
          </div>

          <Button
            onClick={handlePrint}
            className="gap-2 text-xs font-bold bg-[#14206b] hover:bg-[#14206b]/90 text-white shadow-xs cursor-pointer"
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
                    Auto-filled from database: <strong>{selectedStudent.name}</strong> ({selectedStudent.id})
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

          {/* Card 2: Address Particulars */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>Residential Address Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
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
                  <Label className="text-[11px] text-muted-foreground">Student ID / PEN</Label>
                  <Input
                    value={cert.studentId}
                    onChange={(e) => setCert({ ...cert, studentId: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Examination & Character Metadata */}
          <Card className="border shadow-2xs">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Examination &amp; Character Metadata</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
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
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Passing Year</Label>
                  <Input
                    value={cert.passingYear}
                    onChange={(e) => setCert({ ...cert, passingYear: e.target.value })}
                    className="text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Conduct Rating</Label>
                  <CustomSelect
                    value={cert.conduct}
                    onChange={(val) => setCert({ ...cert, conduct: val })}
                    options={[
                      { label: "Good moral character", value: "good moral character" },
                      { label: "Exemplary character", value: "exemplary moral character" },
                      { label: "Excellent character", value: "excellent character and conduct" },
                    ]}
                    className="w-full text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Board Roll No (Optional)</Label>
                  <Input
                    value={cert.boardRollNo || ""}
                    onChange={(e) => setCert({ ...cert, boardRollNo: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 123456N 0012"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Board Reg. No (Optional)</Label>
                  <Input
                    value={cert.boardRegistrationNo || ""}
                    onChange={(e) => setCert({ ...cert, boardRegistrationNo: e.target.value })}
                    className="text-xs h-8 font-mono"
                    placeholder="e.g. 19180201004/2024"
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
              <Award className="h-3.5 w-3.5 text-primary" />
              Live Certificate Preview (A5 Portrait &bull; 148 &times; 210 mm)
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
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
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
            id="printable-certificate-canvas"
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
              <CertificatePrintableView data={cert} />
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
          #printable-certificate-canvas {
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

          #printable-certificate-canvas > div {
            transform: none !important;
            width: 148mm !important;
            height: 208mm !important;
            margin: 0 !important;
            display: block !important;
          }

          #pure-a5-certificate-sheet {
            width: 148mm !important;
            height: 208mm !important;
            min-width: 148mm !important;
            max-width: 148mm !important;
            min-height: 208mm !important;
            max-height: 208mm !important;
            margin: 0 auto !important;
            padding: 3.5mm !important;
            box-sizing: border-box !important;
            border: 2.5px solid #14206b !important;
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

export default function CertificateGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-xs text-muted-foreground">
          Loading Certificate Generator...
        </div>
      }
    >
      <CertificateGeneratorContent />
    </Suspense>
  );
}
