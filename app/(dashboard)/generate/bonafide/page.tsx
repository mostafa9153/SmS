"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Student } from "@/lib/types";
import {
  BonafideCertificatePrintableView,
  BonafideCertificateData,
} from "@/components/certificate/bonafide-certificate-printable-view";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentPicker, StudentPickerMode } from "@/components/certificate/student-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Printer,
  Users,
  FileCheck,
  History,
  User,
  MapPin,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrintPreview, PrintPageStyle } from "@/components/print/print-preview";
import { PaperSettingsPanel } from "@/components/print/paper-settings-panel";
import { usePaperSettings } from "@/components/print/use-paper-settings";

import {
  getEffectiveHeadTitle,
  parseStudentAddress,
} from "@/lib/utils/school-profile";
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
  buildBonafideCertInsert,
} from "@/lib/utils/certificate-registry";

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
  // The certificate layout is drawn for A5/A4 portrait only
  const paper = usePaperSettings("bonafide-paper-settings", {
    paper: "A5",
    papers: ["A5", "A4"],
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const paperSize: "A5" | "A4" = paper.paper === "A4" ? "A4" : "A5";

  // Student Selection (shared picker: single search or bulk roster)
  const [pickerMode, setPickerMode] = useState<StudentPickerMode>("bulk");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  // Certificate settings
  const [certSeq, setCertSeq] = useState<number>(1);
  const [issueDate, setIssueDate] = useState<string>(getLiveDate);
  const [copyType, setCopyType] = useState<"Original" | "Duplicate" | "Office Copy">("Original");
  const [purpose, setPurpose] = useState<string>(PURPOSE_PRESETS[0].value);
  const [conduct, setConduct] = useState<string>("exemplary moral character");
  const [includeDigitalSignature, setIncludeDigitalSignature] = useState<boolean>(true);
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
    photoUrl: "",
  });

  // Print Mode: "single" | "batch"
  const [printMode, setPrintMode] = useState<"single" | "batch">("single");

  // Auto-sync sequence when year rolls over or on mount
  useEffect(() => {
    const seq = getDocumentSequence("bonafide-certificate", currentYear);
    setCertSeq(seq);
  }, [currentYear]);

  // Picker callbacks: selecting a single student or activating a bulk roster row
  // both route through the same "active student" the right-hand preview/form reflects.
  function handleSelectStudent(s: Student) {
    setSelectedStudent(s);
    setActiveStudent(s);
  }

  function handleActivateStudent(s: Student) {
    setActiveStudent(s);
  }

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
        presentClass: activeStudent.presentClass || "X",
        presentSection: activeStudent.presentSection || "A",
        presentRoll: String(activeStudent.presentRoll || "1"),
        academicSession: String(currentYear),
        dateOfBirth: activeStudent.dob || "2010-01-01",
        village: addr.village || schoolProfile?.village || "Marigachi",
        postOffice: addr.postOffice || schoolProfile?.postOffice || "Marigachi",
        policeStation: addr.policeStation || schoolProfile?.policeStation || "Mathurapur",
        district: addr.district || schoolProfile?.district || "South 24 Parganas",
        pincode: addr.pincode || schoolProfile?.pincode || "743349",
        photoUrl: activeStudent.photoUrl || "",
      });
    }
  }, [activeStudent, schoolProfile, currentYear]);

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
        photoUrl: studentForm.photoUrl,
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
      photoUrl: student.photoUrl,
      gender: student.gender || "Male",
      fatherName: student.fatherName || "Guardian",
      village: addr.village,
      postOffice: addr.postOffice,
      policeStation: addr.policeStation,
      district: addr.district,
      pincode: addr.pincode,
      presentClass: student.presentClass || "X",
      presentSection: student.presentSection || "A",
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
      photoUrl: studentForm.photoUrl,
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

  // Selected students to be batch printed (bulk mode checkbox selection)
  const studentsToPrint = bulkStudents;

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
        classInfo: `${count} students (bulk)`,
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
      <PageHeader
        title="Bonafide Certificate Studio"
        back="/generate"
        className="bg-card border rounded-2xl p-4 shadow-2xs print:hidden"
        actions={
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
            size="sm"
            onClick={studentsToPrint.length > 0 ? handlePrintBatch : handlePrintSingle}
            disabled={studentsToPrint.length === 0 && !activeStudent}
            className="h-9 rounded-xl text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
        }
      />

      {/* Main Studio Grid: Unwraps in Print */}
      <div className="grid grid-cols-1 xl:grid-cols-[500px_1fr] gap-5 print:block print:w-full print:m-0 print:p-0">
        {/* Left Column: Filter Controls & Student Roster */}
        <div className="space-y-4 print:hidden order-2 xl:order-1">
          {/* 1. Student Selection Card (shared with other certificate pages) */}
          <Card className="rounded-2xl border shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Student Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <StudentPicker
                mode={pickerMode}
                onModeChange={setPickerMode}
                selectedStudent={selectedStudent}
                onSelectStudent={handleSelectStudent}
                onClearSelection={() => setSelectedStudent(null)}
                selectedIds={bulkStudents.map((s) => s.id)}
                onBulkSelectionChange={setBulkStudents}
                activeId={activeStudent?.id}
                onActivate={handleActivateStudent}
              />
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
                  <CustomSelect
                    value={studentForm.gender}
                    onChange={(val) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        gender: val as "Male" | "Female" | "Other",
                      }))
                    }
                    options={[
                      { label: "Male (son of)", value: "Male" },
                      { label: "Female (daughter of)", value: "Female" },
                    ]}
                    className="w-full text-xs h-8"
                  />
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
                <CustomSelect
                  value={purpose}
                  onChange={setPurpose}
                  options={PURPOSE_PRESETS}
                  className="w-full text-xs h-8.5"
                />
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
                  <CustomSelect
                    value={copyType}
                    onChange={(val) => setCopyType(val as "Original" | "Duplicate" | "Office Copy")}
                    options={[
                      { label: "Original", value: "Original" },
                      { label: "Duplicate", value: "Duplicate" },
                      { label: "Office Copy", value: "Office Copy" },
                    ]}
                    className="w-full text-xs h-8.5"
                  />
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
                <Label htmlFor="toggle-bonafide-digital-sign" className="text-xs font-semibold cursor-pointer">
                  Digital Signature
                </Label>
                <Switch
                  id="toggle-bonafide-digital-sign"
                  checked={includeDigitalSignature}
                  onCheckedChange={setIncludeDigitalSignature}
                />
              </div>
            </CardContent>
          </Card>
          <PaperSettingsPanel settings={paper} />
        </div>

        <PrintPreview resetKey={paperSize}>
          <BonafideCertificatePrintableView
            data={activeCertData}
            schoolProfile={schoolProfile}
          />
        </PrintPreview>
        <PrintPageStyle pageW={paper.pageW} pageH={paper.pageH} margins={paper.margins} />

        {/* Hidden print container (single & batch) */}
        <div id="printable-bonafide-canvas" className="hidden print:block print:w-full print:m-0 print:p-0">
          {printMode !== "batch" ? (
            <BonafideCertificatePrintableView
              data={activeCertData}
              schoolProfile={schoolProfile}
            />
          ) : (
            studentsToPrint.map((student, idx) => {
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
            })
          )}
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
