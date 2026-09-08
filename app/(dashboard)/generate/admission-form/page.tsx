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
  schoolProfileToSchoolInfo,
} from "@/components/admission-form/types";
import { useSchoolProfile } from "@/lib/utils/school-profile";
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
  Lock,
  Undo2,
  Users,
  UserCheck,
  X,
  Filter,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";
import { cn, getClassRank } from "@/lib/utils";
import { getDynamicClassList } from "@/lib/ems/ems-config-loader";
import { PrintHistoryModal } from "@/components/ui/print-history-modal";
import { recordPrintBatch } from "@/lib/utils/print-history";

function AdmissionFormGeneratorContent() {
  const { profile: schoolProfile } = useSchoolProfile();
  const schoolInfo = useMemo(() => schoolProfileToSchoolInfo(schoolProfile), [schoolProfile]);
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
  const [activePageView, setActivePageView] = useState<"all" | "page1" | "page2">("page1");

  // Preview zoom scale
  const [previewScale, setPreviewScale] = useState<number>(0.8);

  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);
  const serialPrefix = `MHS/AF/${yearSuffix}/`;
  const paddingDigits = 4; // Strictly 4 digits (0001, 0002... 0100)
  const STORAGE_KEY = `sms_admission_form_last_serial_${currentYear}`;
  const PREV_STORAGE_KEY = `sms_admission_form_prev_serial_${currentYear}`;

  // Serial Numbering State (Auto-initialized to 1 or loaded from localStorage)
  const [startSerial, setStartSerial] = useState<number>(1);
  const [prevStartSerial, setPrevStartSerial] = useState<number | null>(null);
  const [bulkCount, setBulkCount] = useState<number>(100);

  // Bulk Class and Section for Pre-filled Bulk Generation
  const [bulkClass, setBulkClass] = useState<string>("IX");
  const [bulkSection, setBulkSection] = useState<string>("ALL");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Load last used serial and previous serial on mount/year change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const nextNum = parseInt(saved, 10) + 1;
        if (!isNaN(nextNum) && nextNum >= 1) {
          setStartSerial(nextNum);
        }
      }
      const savedPrev = localStorage.getItem(PREV_STORAGE_KEY);
      if (savedPrev) {
        const prevNum = parseInt(savedPrev, 10);
        if (!isNaN(prevNum) && prevNum >= 1) {
          setPrevStartSerial(prevNum);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [STORAGE_KEY, PREV_STORAGE_KEY]);

  // Sync class filter with tab
  useEffect(() => {
    if (activeTab === "xi") {
      setBulkClass("XI");
    } else if (bulkClass === "XI") {
      setBulkClass("IX");
    }
  }, [activeTab]);

  // For Bulk Preview: Which serial/student index (0-based) is currently being previewed
  const [previewBulkIndex, setPreviewBulkIndex] = useState<number>(0);

  // Flag during bulk print execution
  const [isBulkPrinting, setIsBulkPrinting] = useState<boolean>(false);

  // Master form state for Class V-IX
  const [formVIx, setFormVIx] = useState<AdmissionFormVIxData>(() => ({
    ...BLANK_FORM_V_IX,
    academicYear: String(currentYear),
    formNo: formatFormNumber(serialPrefix, 1, 4),
  }));

  // Master form state for Class XI
  const [formXI, setFormXI] = useState<AdmissionFormXIData>(() => ({
    ...BLANK_FORM_XI,
    academicYear: String(currentYear),
    formNo: formatFormNumber(serialPrefix, 1, 4),
  }));

  // Database students query
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: getStudents,
  });

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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

  // Reusable converter from student DB record to Admission Form Data
  function studentToFormData(student: Student, serialNo: string) {
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
      studentId: student.schoolId || student.id || "",
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

    const vIx: AdmissionFormVIxData = {
      ...BLANK_FORM_V_IX,
      academicYear: String(currentYear),
      formNo: serialNo,
      officeUse: {
        slNo: "",
        doa: "",
        class: student.presentClass || "",
        sec: student.presentSection || "",
        rollNo: student.presentRoll ? String(student.presentRoll) : "",
      },
      basicInfo: {
        ...BLANK_FORM_V_IX.basicInfo,
        ...commonBasic,
      },
      educationalInfo: {
        ...BLANK_FORM_V_IX.educationalInfo,
        presentClass: student.presentClass || "",
        presentSection: student.presentSection || "",
        presentRoll: student.presentRoll ? String(student.presentRoll) : "",
        previousClass: student.previousClass || "",
        previousSection: student.previousSection || "",
        previousRoll: student.previousRollNo ? String(student.previousRollNo) : "",
        previousStream: student.previousStream || "",
        medium: student.mediumOfInstruction || "BENGALI",
        attendanceDays: student.previousDaysAttended ? String(student.previousDaysAttended) : "",
      },
      contactInfo: {
        ...BLANK_FORM_V_IX.contactInfo,
        ...commonContact,
      },
      guardianDetails: {
        ...BLANK_FORM_V_IX.guardianDetails,
        ...commonGuardian,
      },
      guardianContact: {
        ...BLANK_FORM_V_IX.guardianContact,
        ...commonContact,
      },
      bankDetails: {
        ...BLANK_FORM_V_IX.bankDetails,
        ...commonBank,
      },
      otherInfo: {
        ...BLANK_FORM_V_IX.otherInfo,
        ...commonOther,
      },
    };

    const xi: AdmissionFormXIData = {
      ...BLANK_FORM_XI,
      academicYear: String(currentYear),
      formNo: serialNo,
      officeUse: {
        slNo: "",
        doa: "",
        class: "XI",
        sec: student.presentSection || "",
        rollNo: student.presentRoll ? String(student.presentRoll) : "",
      },
      basicInfo: {
        ...BLANK_FORM_XI.basicInfo,
        ...commonBasic,
      },
      educationalInfo: {
        ...BLANK_FORM_XI.educationalInfo,
        previousSchoolName: student.previousSchool || "Marigachi High School (H.S.)",
      },
      contactInfo: {
        ...BLANK_FORM_XI.contactInfo,
        ...commonContact,
      },
      guardianDetails: {
        ...BLANK_FORM_XI.guardianDetails,
        ...commonGuardian,
      },
      guardianContact: {
        ...BLANK_FORM_XI.guardianContact,
        ...commonContact,
      },
      bankDetails: {
        ...BLANK_FORM_XI.bankDetails,
        ...commonBank,
      },
      otherInfo: {
        ...BLANK_FORM_XI.otherInfo,
        ...commonOther,
      },
    };

    return { formVIx: vIx, formXI: xi };
  }

  // Handle single student selection from database
  function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    const targetSerial = generationMode === "single" ? currentSingleFormNo : (bulkSerialList[previewBulkIndex] || `${serialPrefix}0001`);
    const { formVIx: newVIx, formXI: newXI } = studentToFormData(student, targetSerial);

    // Auto-switch tab if student is in XI
    const sClass = (student.presentClass || "").toUpperCase();
    if (sClass === "XI" || sClass === "XII") {
      setActiveTab("xi");
    } else if (sClass) {
      setActiveTab("v-ix");
    }

    setFormVIx(newVIx);
    setFormXI(newXI);
    setIsSearchFocused(false);
  }

  // Filter student list for autocomplete search
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) {
      return students.slice(0, 10);
    }
    return students
      .filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.id && s.id.toLowerCase().includes(q)) ||
          (s.schoolId && s.schoolId.toLowerCase().includes(q)) ||
          (s.pen && s.pen.toLowerCase().includes(q)) ||
          (s.presentClass && s.presentClass.toLowerCase().includes(q)) ||
          (s.presentSection && s.presentSection.toLowerCase().includes(q)) ||
          (s.presentRoll && String(s.presentRoll).includes(q)) ||
          (s.studentContact && s.studentContact.includes(q)) ||
          (s.aadhaar && s.aadhaar.includes(q)) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [students, studentSearch]);

  // Bulk Class Roster: Filter students by Class & Section
  const classRoster = useMemo(() => {
    return students
      .filter((s) => {
        const sClass = (s.presentClass || "").toUpperCase().trim();
        const sSec = (s.presentSection || "").toUpperCase().trim();
        const matchesClass = !bulkClass || bulkClass === "ALL" || sClass === bulkClass.toUpperCase().trim();
        const matchesSection = !bulkSection || bulkSection === "ALL" || sSec === bulkSection.toUpperCase().trim();
        return matchesClass && matchesSection;
      })
      .sort((a, b) => (Number(a.presentRoll) || 9999) - (Number(b.presentRoll) || 9999));
  }, [students, bulkClass, bulkSection]);

  // Fetch dynamic class configuration from Database / Settings (/settings?tab=school-details)
  const { data: schoolConfig } = useQuery({
    queryKey: ["school-config"],
    queryFn: async () => {
      const res = await fetch("/api/school-config", { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data || null;
    },
  });

  // Dynamic Class Management List from Settings
  const dynamicClasses = useMemo(() => {
    if (schoolConfig?.class_management && Array.isArray(schoolConfig.class_management) && schoolConfig.class_management.length > 0) {
      return schoolConfig.class_management.map((c: any) => ({
        name: c.name || `Class ${c.code}`,
        code: String(c.code || c.name).trim().toUpperCase(),
        sections: Array.isArray(c.sections) && c.sections.length > 0 ? c.sections : ["A", "B"],
      }));
    }
    return getDynamicClassList();
  }, [schoolConfig]);

  // Filter available classes according to active format tab (V-IX vs XI) and sort in curriculum order
  const availableClasses = useMemo(() => {
    const list = dynamicClasses.filter((c: any) => {
      const code = c.code.toUpperCase();
      if (activeTab === "xi") {
        return code === "XI" || code === "XII" || code === "11" || code === "12";
      }
      return code !== "XI" && code !== "XII" && code !== "11" && code !== "12";
    });

    return list.sort((a: any, b: any) => getClassRank(a.code) - getClassRank(b.code));
  }, [dynamicClasses, activeTab]);

  // Dynamic sections strictly for the currently selected class from Settings + actual student DB records
  const availableSections = useMemo(() => {
    const currentClassObj = dynamicClasses.find(
      (c: any) => c.code.toUpperCase() === bulkClass.toUpperCase()
    );
    const configuredSecs: string[] = currentClassObj && Array.isArray(currentClassObj.sections) && currentClassObj.sections.length > 0
      ? currentClassObj.sections
      : [];

    const studentSecsSet = new Set<string>();
    students
      .filter((s) => (s.presentClass || "").toUpperCase().trim() === bulkClass.toUpperCase().trim())
      .forEach((s) => {
        if (s.presentSection) studentSecsSet.add(s.presentSection.toUpperCase().trim());
      });

    // Merge configured sections with actual student sections (no artificial hardcoded C, D)
    const combinedSet = new Set<string>(configuredSecs);
    studentSecsSet.forEach((sec) => combinedSet.add(sec));

    const secList = Array.from(combinedSet).filter(Boolean).sort();
    
    // If only 1 section or no sections exist, return array
    if (secList.length <= 1) {
      return secList.length === 1 ? secList : ["A"];
    }

    // If multiple sections exist, prepend "ALL"
    return ["ALL", ...secList];
  }, [dynamicClasses, students, bulkClass]);

  // Computed current single form number
  const currentSingleFormNo = useMemo(() => {
    return formatFormNumber(serialPrefix, startSerial, paddingDigits);
  }, [serialPrefix, startSerial, paddingDigits]);

  // Computed effective bulk count
  const effectiveBulkTotal = useMemo(() => {
    if (formMode === "prefilled") {
      return classRoster.length;
    }
    return Math.max(1, Math.min(500, bulkCount));
  }, [formMode, classRoster.length, bulkCount]);

  // Computed list of bulk serial numbers
  const bulkSerialList = useMemo(() => {
    const list: string[] = [];
    const count = Math.max(1, effectiveBulkTotal);
    for (let i = 0; i < count; i++) {
      list.push(formatFormNumber(serialPrefix, startSerial + i, paddingDigits));
    }
    return list;
  }, [serialPrefix, startSerial, effectiveBulkTotal, paddingDigits]);

  // Sync formNo in state when prefix/serial changes
  useEffect(() => {
    if (generationMode === "single") {
      if (!selectedStudent) {
        setFormVIx((p) => ({ ...p, formNo: currentSingleFormNo }));
        setFormXI((p) => ({ ...p, formNo: currentSingleFormNo }));
      }
    } else {
      if (formMode === "blank") {
        const activeSerial = bulkSerialList[previewBulkIndex] || bulkSerialList[0] || `${serialPrefix}0001`;
        setFormVIx((p) => ({ ...p, formNo: activeSerial }));
        setFormXI((p) => ({ ...p, formNo: activeSerial }));
      }
    }
  }, [generationMode, formMode, selectedStudent, currentSingleFormNo, bulkSerialList, previewBulkIndex, serialPrefix]);

  // Reset to clean blank form
  function handleResetBlank() {
    setSelectedStudent(null);
    setStudentSearch("");
    const defaultSerial = formatFormNumber(serialPrefix, startSerial, paddingDigits);
    setFormVIx({
      ...BLANK_FORM_V_IX,
      academicYear: String(currentYear),
      formNo: defaultSerial,
    });
    setFormXI({
      ...BLANK_FORM_XI,
      academicYear: String(currentYear),
      formNo: defaultSerial,
    });
  }

  // Helper to persist last used serial and advance state
  function saveLastUsedSerial(highestUsed: number, currentStart: number) {
    try {
      localStorage.setItem(PREV_STORAGE_KEY, String(currentStart));
      localStorage.setItem(STORAGE_KEY, String(highestUsed));
    } catch (e) {
      console.error(e);
    }
    setPrevStartSerial(currentStart);
    setStartSerial(highestUsed + 1);
  }

  // Undo / Revert back to previous starting serial
  function handleUndoLastBatch() {
    if (prevStartSerial === null || prevStartSerial <= 0) return;
    try {
      if (prevStartSerial <= 1) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PREV_STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, String(prevStartSerial - 1));
        localStorage.removeItem(PREV_STORAGE_KEY);
      }
    } catch (e) {
      console.error(e);
    }
    setStartSerial(prevStartSerial);
    setPrevStartSerial(null);
  }

  // Reset Serial Number back to 0001
  function handleResetSerialToOne() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREV_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
    setPrevStartSerial(null);
    setStartSerial(1);
  }

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Single Form Print Trigger
  const handlePrintSingle = (pageTarget: "all" | "page1" | "page2" = "all") => {
    setIsBulkPrinting(false);
    setActivePageView(pageTarget);
    saveLastUsedSerial(startSerial, startSerial);
    recordPrintBatch(
      {
        docType: "admission-form",
        mode: "single",
        startSerial,
        endSerial: startSerial,
        formattedStart: currentSingleFormNo,
        formattedEnd: currentSingleFormNo,
        count: 1,
        classInfo: selectedStudent ? selectedStudent.name : `Class ${activeTab.toUpperCase()}`,
      },
      currentYear
    );
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Bulk Forms Print Trigger (Prints all serials / students consecutively)
  const handlePrintBulk = () => {
    const totalCount = formMode === "prefilled" ? Math.max(1, classRoster.length) : bulkCount;
    setIsBulkPrinting(true);
    setActivePageView("all");
    const endSerial = startSerial + totalCount - 1;
    saveLastUsedSerial(endSerial, startSerial);
    recordPrintBatch(
      {
        docType: "admission-form",
        mode: "bulk",
        fillMode: formMode,
        startSerial,
        endSerial,
        formattedStart: bulkSerialList[0] || currentSingleFormNo,
        formattedEnd: bulkSerialList[bulkSerialList.length - 1] || currentSingleFormNo,
        count: totalCount,
        classInfo:
          formMode === "prefilled"
            ? `Class ${bulkClass} (Sec ${bulkSection})`
            : `Blank Batch (${activeTab.toUpperCase()})`,
      },
      currentYear
    );
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsBulkPrinting(false);
      }, 1000);
    }, 250);
  };

  // Computed Live Active Form Data for Screen Preview
  const previewFormData = useMemo(() => {
    if (generationMode === "bulk" && formMode === "prefilled" && classRoster.length > 0) {
      const activeStudent = classRoster[previewBulkIndex] || classRoster[0];
      const activeSerial = formatFormNumber(serialPrefix, startSerial + previewBulkIndex, paddingDigits);
      return studentToFormData(activeStudent, activeSerial);
    }
    return {
      formVIx: {
        ...formVIx,
        formNo: generationMode === "bulk" ? (bulkSerialList[previewBulkIndex] || formVIx.formNo) : formVIx.formNo,
      },
      formXI: {
        ...formXI,
        formNo: generationMode === "bulk" ? (bulkSerialList[previewBulkIndex] || formXI.formNo) : formXI.formNo,
      },
    };
  }, [generationMode, formMode, classRoster, previewBulkIndex, serialPrefix, startSerial, paddingDigits, formVIx, formXI, bulkSerialList]);

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* ISOLATED BULLETPROOF PRINT CSS STYLESHEET */}
      {/* ------------------------------------------------------------- */}
      <style jsx global>{`
        @media print {
          /* 1. Hide non-printable web UI completely */
          header,
          aside,
          nav,
          button,
          .print\\:hidden,
          .no-print {
            display: none !important;
          }

          body * {
            visibility: hidden;
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

          /* 4. Pure Print Container: ONLY this container is visible */
          #pure-print-container,
          #pure-print-container * {
            visibility: visible !important;
          }

          #pure-print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          /* Screen preview canvas is completely hidden in print */
          #printable-canvas {
            display: none !important;
          }

          /* 5. Target Sheet Page-breaks and Geometry */
          .admission-sheet {
            width: 205mm !important;
            min-height: 291mm !important;
            max-height: 291mm !important;
            margin: 2.5mm auto !important;
            padding: 3.5mm 4.5mm !important;
            box-sizing: border-box !important;
            border: 2px solid black !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .page-break-after-sheet {
            page-break-after: always !important;
            break-after: page !important;
          }

          .no-page-break-after {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .bulk-form-wrapper {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* DEDICATED PURE PRINT CONTAINER (Hidden on Screen, Sole Element in Print)  */}
      {/* ========================================================================= */}
      <div id="pure-print-container" className="hidden print:block">
        {isBulkPrinting ? (
          formMode === "prefilled" ? (
            classRoster.map((student, idx) => {
              const isLast = idx === classRoster.length - 1;
              const serial = formatFormNumber(serialPrefix, startSerial + idx, paddingDigits);
              const { formVIx: prefilledV, formXI: prefilledXI } = studentToFormData(student, serial);
              return (
                <div key={student.id || idx} className="bulk-form-wrapper">
                  {activeTab === "v-ix" ? (
                    <AdmissionFormVIxPrintableView
                      data={prefilledV}
                      school={schoolInfo}
                      activePage="all"
                      isLastInBatch={isLast}
                    />
                  ) : (
                    <AdmissionFormXIPrintableView
                      data={prefilledXI}
                      school={schoolInfo}
                      activePage="all"
                      isLastInBatch={isLast}
                    />
                  )}
                </div>
              );
            })
          ) : (
            bulkSerialList.map((serial, idx) => {
              const isLast = idx === bulkSerialList.length - 1;
              return (
                <div key={idx} className="bulk-form-wrapper">
                  {activeTab === "v-ix" ? (
                    <AdmissionFormVIxPrintableView
                      data={{
                        ...formVIx,
                        formNo: serial,
                      }}
                      school={schoolInfo}
                      activePage="all"
                      isLastInBatch={isLast}
                    />
                  ) : (
                    <AdmissionFormXIPrintableView
                      data={{
                        ...formXI,
                        formNo: serial,
                      }}
                      school={schoolInfo}
                      activePage="all"
                      isLastInBatch={isLast}
                    />
                  )}
                </div>
              );
            })
          )
        ) : (
          <div className="single-form-wrapper">
            {activeTab === "v-ix" ? (
              <AdmissionFormVIxPrintableView
                data={previewFormData.formVIx}
                school={schoolInfo}
                activePage={activePageView}
                isLastInBatch={true}
              />
            ) : (
              <AdmissionFormXIPrintableView
                data={previewFormData.formXI}
                school={schoolInfo}
                activePage={activePageView}
                isLastInBatch={true}
              />
            )}
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 max-w-[1700px] mx-auto space-y-6 print:hidden">
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
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                Admission Form Generator
              </h1>
            </div>
          </div>

          {/* Quick Actions Header Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              title="View print history and undo any printed batch"
              className="gap-1.5 text-xs font-semibold h-9.5 px-3 rounded-xl border-amber-300 dark:border-amber-700 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo Last Print</span>
            </Button>

            {generationMode === "bulk" ? (
              <Button
                size="sm"
                onClick={handlePrintBulk}
                disabled={formMode === "prefilled" && classRoster.length === 0}
                className="gap-2 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 h-9.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                {formMode === "prefilled"
                  ? `Print ${classRoster.length} Pre-filled Forms (${classRoster.length * 2} Pages)`
                  : `Print ${bulkCount} Forms (${bulkCount * 2} Pages)`}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintSingle("page1")}
                  className="gap-1.5 text-xs font-semibold rounded-xl border-border/80 cursor-pointer"
                  title="Print Page 1 only"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  Page 1 Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintSingle("page2")}
                  className="gap-1.5 text-xs font-semibold rounded-xl border-border/80 cursor-pointer"
                  title="Print Page 2 only"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  Page 2 Only
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePrintSingle("all")}
                  className="gap-2 text-xs font-bold rounded-xl shadow-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 h-9.5 cursor-pointer"
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

            {/* Print Quantity Mode (Bulk vs Single) & Pre-filled Settings */}
            <Card className="shadow-xs border-border/80 rounded-2xl">
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-600" />
                  Print Quantity & Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Mode Selector (Blank vs Pre-filled) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Form Content Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormMode("blank")}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        formMode === "blank"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border/70 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Blank Forms</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMode("prefilled")}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                        formMode === "prefilled"
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border/70 hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Pre-filled / Auto-fill</span>
                    </button>
                  </div>
                </div>

                {/* Quantity Toggle: Single vs Bulk */}
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
                    <span>
                      {formMode === "prefilled"
                        ? `Bulk Class (${classRoster.length} Students)`
                        : `Bulk Print (${bulkCount} Forms)`}
                    </span>
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

                {/* ============================================================== */}
                {/* PRE-FILLED SINGLE STUDENT SEARCH                               */}
                {/* ============================================================== */}
                {formMode === "prefilled" && generationMode === "single" && (
                  <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                        <Search className="h-3.5 w-3.5" />
                        <span>Search & Select Student</span>
                      </Label>
                      {selectedStudent && (
                        <button
                          type="button"
                          onClick={handleResetBlank}
                          className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    {/* Selected Student Highlight Card */}
                    {selectedStudent ? (
                      <div className="p-3 rounded-xl bg-background border-2 border-primary shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                            {selectedStudent.name}
                          </span>
                          <Badge className="text-[10px] bg-primary text-primary-foreground font-mono">
                            Roll: {selectedStudent.presentRoll || "N/A"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Class: <strong className="text-foreground">{selectedStudent.presentClass || "N/A"}</strong>
                          {" · "}
                          Sec: <strong className="text-foreground">{selectedStudent.presentSection || "A"}</strong>
                          {" · "}
                          ID: <strong className="text-foreground font-mono">{selectedStudent.schoolId || selectedStudent.id}</strong>
                        </p>
                        {selectedStudent.fatherName && (
                          <p className="text-[10.5px] text-muted-foreground truncate">
                            Guardian: {selectedStudent.fatherName}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {/* Search Input Box */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={studentSearch}
                        onFocus={() => setIsSearchFocused(true)}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setIsSearchFocused(true);
                        }}
                        placeholder="Type name, ID, roll no or contact..."
                        className="pl-8 pr-8 h-9 text-xs font-medium"
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
                    </div>

                    {/* Search Dropdown Results */}
                    {isSearchFocused && (
                      <div className="border rounded-xl bg-popover shadow-xl overflow-hidden divide-y divide-border/60 max-h-56 overflow-y-auto z-20">
                        <div className="px-3 py-1.5 bg-muted/50 text-[10.5px] font-bold text-muted-foreground flex justify-between items-center">
                          <span>Matching Students ({filteredStudents.length})</span>
                          <button
                            type="button"
                            onClick={() => setIsSearchFocused(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Close
                          </button>
                        </div>

                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleSelectStudent(s)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div className="space-y-0.5">
                                <p className="font-bold text-foreground">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Class: <strong className="text-foreground">{s.presentClass || "N/A"}</strong>
                                  {" · "}
                                  Roll: <strong className="text-foreground">{s.presentRoll || "N/A"}</strong>
                                  {" · "}
                                  ID: <span className="font-mono">{s.schoolId || s.id}</span>
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[9.5px] font-bold shrink-0">
                                Select
                              </Badge>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            No students found matching &quot;{studentSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ============================================================== */}
                {/* PRE-FILLED BULK CLASS & SECTION SELECTOR                       */}
                {/* ============================================================== */}
                {formMode === "prefilled" && generationMode === "bulk" && (
                  <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-primary">
                        <Users className="h-3.5 w-3.5" />
                        <span>Bulk Auto-fill by Class</span>
                      </Label>
                      <Badge className="text-[10px] bg-primary text-primary-foreground font-bold">
                        {classRoster.length} Students
                      </Badge>
                    </div>

                    {/* Class Selector (Ordered curriculum V -> X / XI -> XII) */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold flex items-center justify-between">
                        <span>Select Class</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Class {bulkClass}
                        </span>
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {availableClasses.map((cls: any) => {
                          const code = typeof cls === "string" ? cls : cls.code;
                          const name = typeof cls === "string" ? `Class ${cls}` : cls.name || `Class ${cls.code}`;
                          const isSelected = bulkClass.toUpperCase() === code.toUpperCase();
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => {
                                setBulkClass(code);
                                setPreviewBulkIndex(0);
                              }}
                              className={cn(
                                "py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                  : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                              )}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section Selector (Only shown when multiple sections exist in Class Management settings) */}
                    {availableSections.length > 1 && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold flex items-center justify-between">
                          <span>Select Section</span>
                          <span className="text-[10px] text-muted-foreground">
                            {bulkSection === "ALL" ? "All Sections" : `Section ${bulkSection}`}
                          </span>
                        </Label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {availableSections.map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                setBulkSection(sec);
                                setPreviewBulkIndex(0);
                              }}
                              className={cn(
                                "flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer min-w-[50px]",
                                bulkSection === sec
                                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                  : "bg-background hover:bg-muted text-muted-foreground border-border/80"
                              )}
                            >
                              {sec === "ALL" ? "All Sec" : `Sec ${sec}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Class Roster Summary */}
                    {classRoster.length > 0 ? (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Ready to Print {classRoster.length} Students:
                        </p>
                        <p className="font-mono text-[10.5px] font-bold">
                          Class {bulkClass} {availableSections.length > 1 ? (bulkSection === "ALL" ? "(All Sections)" : `(Sec ${bulkSection})`) : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Serial: {bulkSerialList[0]} → {bulkSerialList[classRoster.length - 1]} ({classRoster.length * 2} pages)
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs text-center font-medium">
                        No students found in Class {bulkClass} {availableSections.length > 1 && bulkSection !== "ALL" ? `(Section ${bulkSection})` : ""}.
                      </div>
                    )}
                  </div>
                )}

                {/* Serial Numbering Controls */}
                <div className="p-3.5 bg-muted/30 rounded-xl border border-border/70 space-y-3">
                  {/* Start Serial No. (Auto Continuous Sequence - Locked with Permanent Undo Button) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold flex items-center gap-1.5 text-foreground">
                        <Hash className="h-3.5 w-3.5 text-primary" />
                        <span>Current Start Serial No.</span>
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsHistoryOpen(true)}
                          title="View print batch history & undo"
                          className="text-[10.5px] px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/40 active:scale-95"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>History &amp; Undo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetSerialToOne}
                          title="Reset sequence to 0001 for this year"
                          className="text-[10px] px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative flex items-center">
                      <Input
                        value={formatFormNumber(serialPrefix, startSerial, 4)}
                        disabled
                        readOnly
                        className="h-9 text-xs sm:text-sm font-mono font-bold uppercase bg-muted/70 text-primary cursor-not-allowed select-none pr-8 border-dashed"
                      />
                      <Lock className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
                    </div>
                  </div>

                  {/* Bulk Quantity Selectors (Only shown in blank bulk mode) */}
                  {generationMode === "bulk" && formMode === "blank" && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold">Total Blank Forms to Generate</Label>
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
              </CardContent>
            </Card>
          </div>

          {/* ======================================================= */}
          {/* RIGHT COLUMN: LIVE CANVAS PREVIEW (Full Width in Print) */}
          {/* ======================================================= */}
          <div className="xl:col-span-8 print:w-full print:m-0 print:p-0">
            {/* Preview Toolbar (Hidden in Print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card border rounded-2xl mb-4 shadow-xs print:hidden">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Bulk Form Index Navigator (Bulk mode only) */}
                {generationMode === "bulk" && (
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={previewBulkIndex <= 0}
                      onClick={() => setPreviewBulkIndex((i) => Math.max(0, i - 1))}
                      className="h-7 w-7 rounded-lg cursor-pointer"
                      title="Previous Form Serial"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <span className="text-xs font-bold px-2 font-mono">
                      {formMode === "prefilled" && classRoster.length > 0 ? (
                        <>
                          Student {previewBulkIndex + 1} of {classRoster.length}:{" "}
                          <span className="text-primary font-sans">
                            {classRoster[previewBulkIndex]?.name} (Roll {classRoster[previewBulkIndex]?.presentRoll || "N/A"})
                          </span>
                        </>
                      ) : (
                        <>
                          Form {previewBulkIndex + 1} of {bulkCount}:{" "}
                          <span className="text-primary">{bulkSerialList[previewBulkIndex]}</span>
                        </>
                      )}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={
                        previewBulkIndex >=
                        (formMode === "prefilled" ? Math.max(0, classRoster.length - 1) : bulkCount - 1)
                      }
                      onClick={() =>
                        setPreviewBulkIndex((i) =>
                          Math.min(
                            formMode === "prefilled" ? Math.max(0, classRoster.length - 1) : bulkCount - 1,
                            i + 1
                          )
                        )
                      }
                      className="h-7 w-7 rounded-lg cursor-pointer"
                      title="Next Form Serial"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Page Switcher Icon Controls (Click to change page without scrolling) */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setActivePageView("page1")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                      activePageView === "page1"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="View Page 1 (Front)"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Page 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePageView("page2")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                      activePageView === "page2"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="View Page 2 (Back)"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Page 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePageView((prev) => (prev === "page2" ? "page1" : "page2"))}
                    className="p-1 text-xs font-bold rounded-lg bg-background hover:bg-muted text-foreground border border-border/80 shadow-2xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    title="Flip Page (Page 1 ↔ Page 2)"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                  </button>

                  <div className="h-4 w-px bg-border mx-0.5" />

                  <button
                    type="button"
                    onClick={() => setActivePageView("all")}
                    className={cn(
                      "px-2 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1",
                      activePageView === "all"
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="View Both Pages Stacked"
                  >
                    <Layers className="h-3 w-3" />
                    <span>Both</span>
                  </button>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewScale((prev) => Math.max(0.4, prev - 0.1))}
                  className="h-8 w-8 rounded-lg cursor-pointer"
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
                  className="h-8 w-8 rounded-lg cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale(0.8)}
                  className="h-8 text-xs font-semibold rounded-lg px-2 cursor-pointer"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Screen Preview Viewport */}
            <div className="relative overflow-auto bg-muted/40 p-4 md:p-8 rounded-2xl border flex justify-center custom-scrollbar print:hidden min-h-[500px]">
              {/* Floating Quick Page Flip Button */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => setActivePageView((prev) => (prev === "page2" ? "page1" : "page2"))}
                  className="bg-card/95 hover:bg-card border border-border shadow-md rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 text-foreground hover:text-primary transition-all cursor-pointer active:scale-95"
                  title="Click to flip page"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                  <span>{activePageView === "page2" ? "View Page 1" : "View Page 2"}</span>
                </button>
              </div>

              {/* Screen Preview (renders 1 active form at previewScale for 60fps performance) */}
              <div
                id="printable-canvas"
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top center",
                }}
                className="transition-transform duration-150 space-y-6 print:hidden"
              >
                {activeTab === "v-ix" ? (
                  <AdmissionFormVIxPrintableView
                    data={previewFormData.formVIx}
                    school={schoolInfo}
                    activePage={activePageView}
                  />
                ) : (
                  <AdmissionFormXIPrintableView
                    data={previewFormData.formXI}
                    school={schoolInfo}
                    activePage={activePageView}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PrintHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        docType="admission-form"
        onUndoBatch={(newStart) => setStartSerial(newStart)}
      />
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
