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
  CheckCircle2,
  Eye,
  X,
  RotateCcw,
} from "lucide-react";
import { useSchoolProfile, getEffectiveHeadTitle, parseStudentAddress } from "@/lib/utils/school-profile";
import {
  getDocumentSequence,
  saveDocumentSequence,
  formatDocumentNumber,
} from "@/lib/utils/document-sequence";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintBatch } from "@/lib/utils/print-history";
import {
  recordPrintedCertificate,
  buildCharacterCertInsert,
} from "@/lib/utils/certificate-registry";

function CertificateGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const examParam = searchParams.get("exam");
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
  const [certSeq, setCertSeq] = useState<number>(() => getDocumentSequence("character-certificate", currentYear));

  function getLiveDate() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Certificate Master State (Strictly A5)
  const [cert, setCert] = useState<CharacterCertificateData>(() => ({
    certificateNo: formatDocumentNumber("character-certificate", getDocumentSequence("character-certificate", currentYear), currentYear),
    issueDate: getLiveDate(),
    copyType: "Original",
    examType: examParam === "HS" ? "HS" : "MP",
    studentId: `MHS-${currentYear}-0001`,
    studentName: "Synthia Sanam",
    gender: "Female",
    fatherName: "Md. Ruhul Amin",
    village: "Marigachi",
    postOffice: "Marigachi",
    policeStation: "Mathurapur",
    district: "South 24 Parganas",
    pincode: "743349",
    passingYear: String(currentYear),
    boardRollNo: "123456N 0012",
    boardRegistrationNo: "19111305602/2024",
    conduct: "good moral character",
    remarks:
      "I wish her every success and prosperity in her future academic and personal endeavours.",
    headmasterTitle: "Teacher-in-Charge / Headmaster",
  }));

  // Auto-sync sequence when year rolls over or on mount
  useEffect(() => {
    const seq = getDocumentSequence("character-certificate", currentYear);
    setCertSeq(seq);
    setCert((prev) => ({
      ...prev,
      certificateNo: formatDocumentNumber("character-certificate", seq, currentYear),
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
      certificateNo: prev.certificateNo || formatDocumentNumber("character-certificate", certSeq, currentYear),
      remarks: `I wish ${pronounObject} every success and prosperity in ${pronounPossessive} future academic and personal endeavours.`,
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

  // Sequence undo handler if print was aborted or needs correction
  const handleUndoSequence = () => {
    if (certSeq <= 1) return;
    const prevSeq = certSeq - 1;
    saveDocumentSequence("character-certificate", prevSeq, currentYear);
    setCertSeq(prevSeq);
    setCert((prev) => ({
      ...prev,
      certificateNo: formatDocumentNumber("character-certificate", prevSeq, currentYear),
    }));
  };

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Native Direct Print Trigger (Reliable & Zero Blank Issue)
  const handlePrint = () => {
    const nextSeq = certSeq + 1;
    saveDocumentSequence("character-certificate", nextSeq, currentYear);
    recordPrintBatch(
      {
        docType: "character-certificate",
        mode: "single",
        startSerial: certSeq,
        endSerial: certSeq,
        formattedStart: cert.certificateNo,
        formattedEnd: cert.certificateNo,
        count: 1,
        classInfo: `${cert.studentName} (${cert.examType})`,
      },
      currentYear
    );
    // Persist printed certificate to database registry & local cache
    recordPrintedCertificate(buildCharacterCertInsert(cert, String(currentYear)));

    setCertSeq(nextSeq);
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
            className="rounded-xl p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors active:scale-95 cursor-pointer border border-transparent hover:border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Character Certificate
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
            className="gap-2 text-xs font-bold bg-[#14206b] hover:bg-[#14206b]/90 text-white shadow-xs cursor-pointer h-9 px-4 rounded-xl"
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
          {/* MP vs HS Toggle */}
          <div className="flex items-center rounded-xl border bg-muted/40 p-1 text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => handleExamTypeChange("MP")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                cert.examType === "MP"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <span>Madhyamik (MP)</span>
            </button>
            <button
              type="button"
              onClick={() => handleExamTypeChange("HS")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                cert.examType === "HS"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building className="h-4 w-4 text-indigo-600" />
              <span>Higher Secondary (HS)</span>
            </button>
          </div>

          {/* Card 1: Student Search & Core Details */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Student Information &amp; Auto-Fill</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 overflow-visible">
              {/* Search Existing Student */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Type Student ID, Name, Roll No, or PEN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-8 text-xs h-8.5"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
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
                <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/40 p-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">
                      Auto-filled: <strong>{selectedStudent.name}</strong> ({selectedStudent.id})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 p-0.5 rounded cursor-pointer shrink-0"
                    title="Clear selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Row 1: Student Name & Student ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Student Full Name
                  </Label>
                  <Input
                    value={cert.studentName}
                    onChange={(e) => setCert({ ...cert, studentName: e.target.value })}
                    className="text-xs h-8.5 font-semibold"
                    placeholder="e.g. Synthia Sanam"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Student ID / PEN
                  </Label>
                  <Input
                    value={cert.studentId}
                    onChange={(e) => setCert({ ...cert, studentId: e.target.value })}
                    className="text-xs h-8.5 font-mono"
                    placeholder="e.g. MHS-2026-0001"
                  />
                </div>
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
                    className="text-xs h-8.5"
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
                    className="w-full text-xs h-8.5"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Village</Label>
                  <Input
                    value={cert.village}
                    onChange={(e) => setCert({ ...cert, village: e.target.value })}
                    className="text-xs h-8.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Post Office</Label>
                  <Input
                    value={cert.postOffice}
                    onChange={(e) => setCert({ ...cert, postOffice: e.target.value })}
                    className="text-xs h-8.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Police Station</Label>
                  <Input
                    value={cert.policeStation}
                    onChange={(e) => setCert({ ...cert, policeStation: e.target.value })}
                    className="text-xs h-8.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">District</Label>
                  <Input
                    value={cert.district}
                    onChange={(e) => setCert({ ...cert, district: e.target.value })}
                    className="text-xs h-8.5"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">PIN Code</Label>
                  <Input
                    value={cert.pincode}
                    onChange={(e) => setCert({ ...cert, pincode: e.target.value })}
                    className="text-xs h-8.5 font-mono max-w-xs"
                    placeholder="e.g. 743349"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Examination & Character Metadata */}
          <Card className="border shadow-2xs overflow-visible">
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Examination &amp; Character Metadata</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-visible">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Certificate Ref No</Label>
                    {certSeq > 1 && (
                      <button
                        type="button"
                        onClick={handleUndoSequence}
                        title="Undo sequence (decrement serial no)"
                        className="text-[10px] text-muted-foreground hover:text-amber-600 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>Undo Sl</span>
                      </button>
                    )}
                  </div>
                  <Input
                    value={cert.certificateNo}
                    onChange={(e) => setCert({ ...cert, certificateNo: e.target.value })}
                    className="text-xs h-8.5 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Issue Date</Label>
                  <Input
                    value={cert.issueDate}
                    onChange={(e) => setCert({ ...cert, issueDate: e.target.value })}
                    className="text-xs h-8.5 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Passing Year</Label>
                  <Input
                    value={cert.passingYear}
                    onChange={(e) => setCert({ ...cert, passingYear: e.target.value })}
                    className="text-xs h-8.5 font-mono"
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
                    className="w-full text-xs h-8.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Board Roll No (Optional)</Label>
                  <Input
                    value={cert.boardRollNo || ""}
                    onChange={(e) => setCert({ ...cert, boardRollNo: e.target.value })}
                    className="text-xs h-8.5 font-mono"
                    placeholder="e.g. 123456N 0012"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Board Reg. No (Optional)</Label>
                  <Input
                    value={cert.boardRegistrationNo || ""}
                    onChange={(e) => setCert({ ...cert, boardRegistrationNo: e.target.value })}
                    className="text-xs h-8.5 font-mono"
                    placeholder="e.g. 19180201004/2024"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Certificate Preview */}
        <div className="xl:col-span-7 space-y-3.5 print:w-full print:m-0 print:p-0 xl:sticky xl:top-6">
          <div className="flex items-center justify-between px-1 print:hidden flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Preview</span>
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground bg-muted/40 font-normal">
                A5 Portrait
              </Badge>
            </div>

            {/* Scale controls */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border">
              <span className="text-[10px] text-muted-foreground font-semibold px-1.5">Zoom:</span>
              {[0.85, 1.0, 1.15].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPreviewScale(s)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    previewScale === s
                      ? "bg-background text-foreground font-bold shadow-2xs border"
                      : "text-muted-foreground hover:text-foreground"
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
            className="w-full overflow-x-auto rounded-2xl border bg-slate-100/80 dark:bg-slate-900/50 p-6 flex justify-center items-start shadow-xs print:p-0 print:border-none print:bg-transparent print:w-full print:block min-h-[620px]"
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "center top",
                transition: "transform 0.15s ease-out",
              }}
              className="shrink-0 m-auto print:transform-none print:w-full print:h-full print:m-0 print:p-0 print:block"
            >
              <CertificatePrintableView data={cert} schoolProfile={schoolProfile} />
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

      {/* Print Batch History & Selective Undo Modal */}
      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="character-certificate"
        onUndoBatch={(newStart) => {
          setCertSeq(newStart);
          setCert((prev) => ({
            ...prev,
            certificateNo: formatDocumentNumber("character-certificate", newStart, currentYear),
          }));
        }}
      />
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
