"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getStudents } from "@/lib/data/students";
import { Student } from "@/lib/types";
import {
  AdmissionFormVIxData,
  AdmissionFormXIData,
  BLANK_FORM_V_IX,
  BLANK_FORM_XI,
  DEFAULT_SCHOOL_INFO,
  formatFormNumber,
} from "@/components/admission-form/types";
import { AdmissionFormVIxPrintableView } from "@/components/admission-form/admission-form-v-ix-printable";
import { AdmissionFormXIPrintableView } from "@/components/admission-form/admission-form-xi-printable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Printer,
  ArrowLeft,
  Search,
  Sparkles,
  FileText,
  Layers,
  GraduationCap,
  BookOpen,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Hash,
  ListOrdered,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

function AdmissionFormGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formTypeParam = searchParams.get("type"); // 'v-ix' or 'xi'

  // Form tab selection: Class V-IX vs Class XI
  const [activeTab, setActiveTab] = useState<"v-ix" | "xi">(
    formTypeParam === "xi" ? "xi" : "v-ix"
  );

  // Generation Mode: 'single' vs 'bulk'
  const [generationMode, setGenerationMode] = useState<"single" | "bulk">("bulk");

  // Form mode: 'blank' for physical distribution, 'prefilled' for database/typed input
  const [formMode, setFormMode] = useState<"blank" | "prefilled">("blank");

  // Page view filter: 'all' (Both pages), 'page1', 'page2'
  const [activePageView, setActivePageView] = useState<"all" | "page1" | "page2">("all");

  // Preview zoom scale
  const [previewScale, setPreviewScale] = useState<number>(0.8);

  // Serial Numbering State
  const [serialPrefix, setSerialPrefix] = useState<string>("MHS/AF/26/");
  const [startSerial, setStartSerial] = useState<number>(1);
  const [bulkCount, setBulkCount] = useState<number>(100);
  const [paddingDigits, setPaddingDigits] = useState<number>(3); // 3 -> 001, 4 -> 0001, 0 -> 1

  // For Bulk Preview: Which serial index (0-based) is currently being previewed
  const [previewBulkIndex, setPreviewBulkIndex] = useState<number>(0);

  // Flag during bulk print execution
  const [isBulkPrinting, setIsBulkPrinting] = useState<boolean>(false);

  // Master form state for Class V-IX
  const [formVIx, setFormVIx] = useState<AdmissionFormVIxData>(() => ({
    ...BLANK_FORM_V_IX,
    formNo: formatFormNumber("MHS/AF/26/", 1, 3),
  }));

  // Master form state for Class XI
  const [formXI, setFormXI] = useState<AdmissionFormXIData>(() => ({
    ...BLANK_FORM_XI,
    formNo: formatFormNumber("MHS/AF/26/", 1, 3),
  }));

  // Database students query
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Computed current single form number
  const currentSingleFormNo = useMemo(() => {
    return formatFormNumber(serialPrefix, startSerial, paddingDigits);
  }, [serialPrefix, startSerial, paddingDigits]);

  // Computed list of bulk serial numbers
  const bulkSerialList = useMemo(() => {
    const list: string[] = [];
    const count = Math.max(1, Math.min(500, bulkCount));
    for (let i = 0; i < count; i++) {
      list.push(formatFormNumber(serialPrefix, startSerial + i, paddingDigits));
    }
    return list;
  }, [serialPrefix, startSerial, bulkCount, paddingDigits]);

  // Sync formNo in state when prefix/serial changes
  useEffect(() => {
    if (generationMode === "single") {
      setFormVIx((p) => ({ ...p, formNo: currentSingleFormNo }));
      setFormXI((p) => ({ ...p, formNo: currentSingleFormNo }));
    } else {
      const activeSerial = bulkSerialList[previewBulkIndex] || bulkSerialList[0] || "MHS/AF/26/001";
      setFormVIx((p) => ({ ...p, formNo: activeSerial }));
      setFormXI((p) => ({ ...p, formNo: activeSerial }));
    }
  }, [generationMode, currentSingleFormNo, bulkSerialList, previewBulkIndex]);

  // Auto-fill student address components
  function parseAddress(addr?: string) {
    if (!addr) {
      return {
        village: "",
        locality: "",
        district: "South 24 Parganas",
        blockMunicipality: "",
        panchayat: "",
        postOffice: "",
        policeStation: "Diamond Harbour",
        pinCode: "743368",
      };
    }
    const parts = addr.split(",").map((p) => p.trim());
    const pinMatch = addr.match(/\b\d{6}\b/);
    return {
      village: parts[0] || "",
      locality: parts[1] || "",
      district: "South 24 Parganas",
      blockMunicipality: "",
      panchayat: "",
      postOffice: parts[2] || "",
      policeStation: "Diamond Harbour",
      pinCode: pinMatch ? pinMatch[0] : "743368",
    };
  }

  // Handle student auto-fill from database
  function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    const parsedAddr = parseAddress(student.address);

    const commonBasic = {
      nameEng: student.name || "",
      nameBen: "",
      dob: student.dob || "",
      birthRegNo: student.birthRegistrationNo || "",
      gender: (student.gender === "Male" ? "MALE" : student.gender === "Female" ? "FEMALE" : "TRANSGENDER") as "MALE" | "FEMALE" | "TRANSGENDER",
      socialCategory: student.socialCategory || "General",
      religion: student.religion || "",
      motherTongue: student.motherTongue || "BENGALI",
      nationality: "INDIAN",
      aadhaarNo: student.aadhaar || "",
      bloodGroup: student.bloodGroup || "",
      studentId: student.id || "",
      healthId: student.healthId || "",
      identificationMark: student.identificationMark || "",
    };

    const commonContact = {
      village: parsedAddr.village,
      locality: parsedAddr.locality,
      district: parsedAddr.district,
      blockMunicipality: parsedAddr.blockMunicipality,
      panchayat: parsedAddr.panchayat,
      postOffice: parsedAddr.postOffice,
      policeStation: parsedAddr.policeStation,
      pinCode: student.pincode || parsedAddr.pinCode,
      contactNo: student.studentContact || student.altMobile || "",
      email: student.email || "",
    };

    const commonGuardian = {
      fatherNameEng: student.fatherName || student.guardianName || "",
      fatherNameBen: "",
      motherNameEng: student.motherName || "",
      motherNameBen: "",
      guardianNameEng: student.guardianName || student.fatherName || "",
      guardianNameBen: "",
      relationship: student.relationshipWithGuardian || "Father",
      annualIncome: student.annualFamilyIncome ? String(student.annualFamilyIncome) : "",
      guardianQualification: student.guardianQualification || "",
    };

    const commonBank = {
      bankName: "",
      branch: "",
      ifsc: student.bankIfsc || "",
      accountNumber: student.bankAccountNo || "",
    };

    const commonOther = {
      bplStatus: (student.isBpl ? "YES" : "NO") as "YES" | "NO",
      bplNo: "",
      cwsnStatus: (student.isCwsn ? "YES" : "NO") as "YES" | "NO",
      disabilityType: student.impairmentType || "",
    };

    if (activeTab === "v-ix") {
      setFormVIx((prev) => ({
        ...prev,
        officeUse: {
          ...prev.officeUse,
          class: student.presentClass || "",
          sec: student.presentSection || "",
          rollNo: student.presentRoll ? String(student.presentRoll) : "",
        },
        basicInfo: {
          ...prev.basicInfo,
          ...commonBasic,
        },
        educationalInfo: {
          ...prev.educationalInfo,
          presentClass: student.presentClass || "",
          presentSection: student.presentSection || "",
          presentRoll: student.presentRoll ? String(student.presentRoll) : "",
          previousClass: student.previousClass || "",
          previousSection: student.previousSection || "",
          previousRoll: student.previousRollNo ? String(student.previousRollNo) : "",
          previousStream: student.previousStream || "",
          medium: student.mediumOfInstruction || "BENGALI",
        },
        contactInfo: {
          ...prev.contactInfo,
          ...commonContact,
        },
        guardianDetails: {
          ...prev.guardianDetails,
          ...commonGuardian,
        },
        guardianContact: {
          ...prev.guardianContact,
          ...commonContact,
        },
        bankDetails: {
          ...prev.bankDetails,
          ...commonBank,
        },
        otherInfo: {
          ...prev.otherInfo,
          ...commonOther,
        },
      }));
    } else {
      setFormXI((prev) => ({
        ...prev,
        officeUse: {
          ...prev.officeUse,
          class: "XI",
          sec: student.presentSection || "",
          rollNo: student.presentRoll ? String(student.presentRoll) : "",
        },
        basicInfo: {
          ...prev.basicInfo,
          ...commonBasic,
        },
        educationalInfo: {
          ...prev.educationalInfo,
          previousSchoolName: student.previousSchool || "Marigachi High School (H.S.)",
        },
        contactInfo: {
          ...prev.contactInfo,
          ...commonContact,
        },
        guardianDetails: {
          ...prev.guardianDetails,
          ...commonGuardian,
        },
        guardianContact: {
          ...prev.guardianContact,
          ...commonContact,
        },
        bankDetails: {
          ...prev.bankDetails,
          ...commonBank,
        },
        otherInfo: {
          ...prev.otherInfo,
          ...commonOther,
        },
      }));
    }
  }

  // Filter student list for autocomplete
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.presentRoll && String(s.presentRoll).includes(q))
      )
      .slice(0, 6);
  }, [students, studentSearch]);

  // Reset to clean blank form
  function handleResetBlank() {
    setSelectedStudent(null);
    setStudentSearch("");
    const defaultSerial = formatFormNumber(serialPrefix, startSerial, paddingDigits);
    setFormVIx({
      ...BLANK_FORM_V_IX,
      formNo: defaultSerial,
    });
    setFormXI({
      ...BLANK_FORM_XI,
      formNo: defaultSerial,
    });
  }

  // Single Form Print Trigger
  const handlePrintSingle = (pageTarget: "all" | "page1" | "page2" = "all") => {
    setIsBulkPrinting(false);
    setActivePageView(pageTarget);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Bulk Forms Print Trigger (Prints all serials consecutively)
  const handlePrintBulk = () => {
    setIsBulkPrinting(true);
    setActivePageView("all");
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsBulkPrinting(false);
      }, 500);
    }, 200);
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* ISOLATED BULLETPROOF PRINT CSS STYLESHEET */}
      {/* ------------------------------------------------------------- */}
      <style jsx global>{`
        @media print {
          /* 1. Hide non-printable web UI */
          header,
          aside,
          nav,
          .print\\:hidden,
          button,
          .no-print {
            display: none !important;
          }

          /* 2. Lock page size to exact A4 with zero margin */
          @page {
            size: 210mm 297mm;
            margin: 0;
          }

          /* 3. Base page reset */
          html,
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 4. Canvas Isolation */
          #printable-canvas,
          #bulk-printable-canvas {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            width: 210mm !important;
            max-width: 210mm !important;
            display: block !important;
          }

          #printable-canvas > div,
          #bulk-printable-canvas > div {
            transform: none !important;
            width: 210mm !important;
            margin: 0 !important;
            display: block !important;
          }

          /* 5. Target Sheet Page-breaks */
          .admission-sheet {
            width: 210mm !important;
            min-height: 295mm !important;
            max-height: 295mm !important;
            margin: 0 auto !important;
            padding: 6mm 10mm !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #admission-page-1 {
            page-break-after: always !important;
            break-after: page !important;
          }

          #admission-page-2 {
            page-break-after: always !important;
            break-after: page !important;
          }

          .bulk-form-wrapper {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="p-4 md:p-6 max-w-[1700px] mx-auto space-y-6 print:p-0 print:m-0 print:max-w-none print:space-y-0">
        {/* ========================================================= */}
        {/* STUDIO HEADER */}
        {/* ========================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl"
              title="Go Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                  Admission Form Generator
                </h1>
                <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary">
                  Bulk Serial Print
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Generate and bulk print serialized 2-page A4 application forms for Class V–IX & Class XI
              </p>
            </div>
          </div>

          {/* Quick Actions Header Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {generationMode === "bulk" ? (
              <Button
                size="sm"
                onClick={handlePrintBulk}
                className="gap-2 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 h-9.5"
              >
                <Printer className="h-4 w-4" />
                Print {bulkCount} Forms ({bulkCount * 2} Pages)
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintSingle("page1")}
                  className="gap-1.5 text-xs font-semibold rounded-xl border-border/80"
                  title="Print Page 1 only"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  Page 1 Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintSingle("page2")}
                  className="gap-1.5 text-xs font-semibold rounded-xl border-border/80"
                  title="Print Page 2 only"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  Page 2 Only
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePrintSingle("all")}
                  className="gap-2 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 h-9"
                >
                  <Printer className="h-4 w-4" />
                  Print Single Form
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN STUDIO GRID */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:block print:w-full print:m-0 print:p-0">
          {/* ======================================================= */}
          {/* LEFT COLUMN: CONTROLS & SETTINGS (Hidden in Print) */}
          {/* ======================================================= */}
          <div className="xl:col-span-4 space-y-5 print:hidden">
            {/* Tab Selection (Class V-IX vs Class XI) */}
            <Card className="shadow-xs border-border/80 rounded-2xl overflow-hidden">
              <CardHeader className="p-4 pb-3 bg-muted/40 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Select Admission Format
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("v-ix")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer",
                      activeTab === "v-ix"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.02]"
                        : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <BookOpen className="h-5 w-5 mb-1.5" />
                    <span className="text-xs font-bold">Class V – IX</span>
                    <span className="text-[10px] opacity-80 mt-0.5">5th to 9th Standard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("xi")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 text-center cursor-pointer",
                      activeTab === "xi"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-[1.02]"
                        : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <GraduationCap className="h-5 w-5 mb-1.5" />
                    <span className="text-xs font-bold">Class XI</span>
                    <span className="text-[10px] opacity-80 mt-0.5">11th Standard Form</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Print Quantity Mode (Bulk vs Single) */}
            <Card className="shadow-xs border-border/80 rounded-2xl">
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-600" />
                  Print Quantity & Serial Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGenerationMode("bulk")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                      generationMode === "bulk"
                        ? "bg-primary/15 text-primary border-primary shadow-xs"
                        : "border-border/70 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <ListOrdered className="h-4 w-4" />
                    <span>Bulk Print ({bulkCount} Forms)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerationMode("single")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                      generationMode === "single"
                        ? "bg-primary/15 text-primary border-primary shadow-xs"
                        : "border-border/70 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Single Form</span>
                  </button>
                </div>

                {/* Serial Prefix & Numbering Controls */}
                <div className="p-3.5 bg-muted/30 rounded-xl border border-border/70 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                      <span>Serial Prefix Format</span>
                      <span className="text-[10px] text-muted-foreground font-mono">Example: MHS/AF/26/</span>
                    </Label>
                    <Input
                      value={serialPrefix}
                      onChange={(e) => setSerialPrefix(e.target.value)}
                      placeholder="MHS/AF/26/"
                      className="h-8 text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Start Serial No.</Label>
                      <Input
                        type="number"
                        min={1}
                        value={startSerial}
                        onChange={(e) => setStartSerial(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Digit Padding</Label>
                      <select
                        value={paddingDigits}
                        onChange={(e) => setPaddingDigits(parseInt(e.target.value))}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-medium"
                      >
                        <option value={3}>3 digits (001, 002...)</option>
                        <option value={4}>4 digits (0001, 0002...)</option>
                        <option value={0}>No padding (1, 2, 3...)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bulk Quantity Selectors (Only shown in bulk mode) */}
                  {generationMode === "bulk" && (
                    <div className="space-y-2 pt-1 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold">Total Forms to Generate</Label>
                        <span className="text-xs font-bold text-primary font-mono">{bulkCount} Forms</span>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={bulkCount}
                        onChange={(e) => setBulkCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                        className="h-8 text-xs font-bold font-mono"
                      />

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {[10, 25, 50, 100, 200].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setBulkCount(count)}
                            className={cn(
                              "flex-1 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer",
                              bulkCount === count
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                            )}
                          >
                            {count}
                          </button>
                        ))}
                      </div>

                      {/* Serial Range Summary Banner */}
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium space-y-0.5">
                        <p className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Serial Range ({bulkCount} Forms):
                        </p>
                        <p className="font-mono text-[10.5px] font-bold truncate">
                          {bulkSerialList[0]} → {bulkSerialList[bulkSerialList.length - 1]}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {bulkCount * 2} Pages total (Page 1 Front & Page 2 Back for each form)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mode Selector (Blank vs Pre-filled) */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold">Form Content Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormMode("blank")}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        formMode === "blank"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border/70 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Blank Form (School Dist.)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMode("prefilled")}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        formMode === "prefilled"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border/70 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Pre-filled / Auto-fill
                    </button>
                  </div>
                </div>

                {/* Pre-filled Database Search Section */}
                {formMode === "prefilled" && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>Auto-fill from Student Directory</span>
                        {selectedStudent && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Selected: {selectedStudent.name}
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Search by student name, ID or roll..."
                          className="pl-8 h-8 text-xs"
                        />
                      </div>

                      {/* Search Dropdown Results */}
                      {filteredStudents.length > 0 && (
                        <div className="border rounded-xl bg-popover shadow-lg overflow-hidden divide-y divide-border/60 max-h-48 overflow-y-auto">
                          {filteredStudents.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                handleSelectStudent(s);
                                setStudentSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-accent flex items-center justify-between transition-colors"
                            >
                              <div>
                                <p className="font-bold text-foreground">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  ID: {s.id} · Class: {s.presentClass || "N/A"} · Roll: {s.presentRoll || "N/A"}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[9px]">Select</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Print Trigger Card */}
                <div className="pt-2 border-t space-y-2">
                  {generationMode === "bulk" ? (
                    <Button
                      onClick={handlePrintBulk}
                      className="w-full gap-2 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 h-10 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      Print {bulkCount} Forms with Serial Numbers
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePrintSingle("all")}
                      className="w-full gap-2 text-xs font-bold rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 py-2 h-9 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      Print Single Form (Both Pages)
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground text-center">
                    Standard A4 page (210mm × 297mm). Front & Back 2-page duplex print guaranteed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ======================================================= */}
          {/* RIGHT COLUMN: LIVE CANVAS PREVIEW (Full Width in Print) */}
          {/* ======================================================= */}
          <div className="xl:col-span-8 print:w-full print:m-0 print:p-0">
            {/* Preview Toolbar (Hidden in Print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-2xl mb-4 shadow-xs print:hidden">
              {/* Bulk Form Index Navigator */}
              {generationMode === "bulk" ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={previewBulkIndex <= 0}
                      onClick={() => setPreviewBulkIndex((i) => Math.max(0, i - 1))}
                      className="h-7 w-7 rounded-lg"
                      title="Previous Form Serial"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <span className="text-xs font-bold px-2 font-mono">
                      Form {previewBulkIndex + 1} of {bulkCount}:{" "}
                      <span className="text-primary">{bulkSerialList[previewBulkIndex]}</span>
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={previewBulkIndex >= bulkCount - 1}
                      onClick={() => setPreviewBulkIndex((i) => Math.min(bulkCount - 1, i + 1))}
                      className="h-7 w-7 rounded-lg"
                      title="Next Form Serial"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Page Filter Buttons in Single Mode */
                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActivePageView("all")}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                      activePageView === "all"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Both Pages (1 & 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePageView("page1")}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                      activePageView === "page1"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Page 1 (Front)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePageView("page2")}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                      activePageView === "page2"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Page 2 (Back)
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewScale((prev) => Math.max(0.4, prev - 0.1))}
                  className="h-8 w-8 rounded-lg"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono font-bold w-12 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewScale((prev) => Math.min(1.2, prev + 0.1))}
                  className="h-8 w-8 rounded-lg"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale(0.8)}
                  className="h-8 text-xs font-semibold rounded-lg px-2"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Printable Canvas Viewport */}
            <div className="overflow-auto bg-muted/40 p-4 md:p-8 rounded-2xl border flex justify-center custom-scrollbar print:p-0 print:m-0 print:border-none print:bg-transparent print:w-full print:block">
              {/* Screen Preview (renders 1 active form at previewScale for 60fps performance) */}
              <div
                id="printable-canvas"
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top center",
                }}
                className={cn(
                  "transition-transform duration-150 print:transform-none print:w-full print:h-full print:m-0 print:p-0 space-y-6 print:space-y-0",
                  isBulkPrinting ? "print:hidden" : "print:block"
                )}
              >
                {activeTab === "v-ix" ? (
                  <AdmissionFormVIxPrintableView
                    data={{
                      ...formVIx,
                      formNo: generationMode === "bulk" ? bulkSerialList[previewBulkIndex] : formVIx.formNo,
                    }}
                    activePage={activePageView}
                  />
                ) : (
                  <AdmissionFormXIPrintableView
                    data={{
                      ...formXI,
                      formNo: generationMode === "bulk" ? bulkSerialList[previewBulkIndex] : formXI.formNo,
                    }}
                    activePage={activePageView}
                  />
                )}
              </div>

              {/* Bulk Print Multi-Page Container (Visible only during bulk print) */}
              {isBulkPrinting && (
                <div id="bulk-printable-canvas" className="hidden print:block print:w-full print:m-0 print:p-0">
                  {bulkSerialList.map((serial, idx) => (
                    <div key={idx} className="bulk-form-wrapper">
                      {activeTab === "v-ix" ? (
                        <AdmissionFormVIxPrintableView
                          data={{
                            ...formVIx,
                            formNo: serial,
                          }}
                          activePage="all"
                        />
                      ) : (
                        <AdmissionFormXIPrintableView
                          data={{
                            ...formXI,
                            formNo: serial,
                          }}
                          activePage="all"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdmissionFormGeneratorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-medium">Loading Admission Form Generator...</div>}>
      <AdmissionFormGeneratorContent />
    </Suspense>
  );
}
