"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { getStudents, searchStudents, getStudentById } from "@/lib/data/students";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Student } from "@/lib/types";
import { AdmissionFormVIxData, AdmissionFormXIData, BLANK_FORM_V_IX, BLANK_FORM_XI, formatFormNumber, schoolProfileToSchoolInfo } from "@/components/admission-form/types";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { useSchoolConfigQuery } from "@/lib/utils/school-config-client";
import { getClassRank } from "@/lib/utils";
import { getDynamicClassList } from "@/lib/ems/ems-config-loader";
import { recordPrintBatch } from "@/lib/utils/print-history";


export function useAdmissionFormGenerator(embedded: boolean) {
  const { profile: schoolProfile } = useSchoolProfile();
  const schoolInfo = useMemo(() => schoolProfileToSchoolInfo(schoolProfile), [schoolProfile]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const formTypeParam = searchParams.get("type"); // 'v-ix' or 'xi'
  const categoryParam = searchParams.get("category"); // 'new' or 're'

  // Admission category: New Admission vs Re-Admission
  const [admissionCategory, setAdmissionCategory] = useState<"new" | "re">(
    categoryParam === "re" ? "re" : "new"
  );

  // Tracker Modal State (Opens as a dialog popup like Invoice Tracker)
  const [isTrackerOpen, setIsTrackerOpen] = useState(
    searchParams.get("tab") === "tracker"
  );

  // Target Class selection for form Office Use auto-population
  const [selectedFormClass, setSelectedFormClass] = useState<string>("V");
  const effectiveFormClass = selectedFormClass;

  const studentIdParam = searchParams.get("studentId");

  // Form tab selection: Class V-IX vs Class XI
  const [activeTab, setActiveTabState] = useState<"v-ix" | "xi">(
    formTypeParam === "xi" || searchParams.get("tab") === "xi" ? "xi" : "v-ix"
  );

  const setActiveTab = (tab: "v-ix" | "xi") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "xi") {
        url.searchParams.set("type", "xi");
      } else {
        url.searchParams.delete("type");
        url.searchParams.delete("tab");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Generation Mode: 'single' vs 'bulk'
  const [generationMode, setGenerationMode] = useState<"single" | "bulk">("bulk");

  // Form mode: 'blank' for physical distribution, 'prefilled' for database/typed input
  const [formMode, setFormMode] = useState<"blank" | "prefilled">("blank");

  // Page view filter: 'all' (Both pages), 'page1', 'page2'
  const [activePageView, setActivePageView] = useState<"all" | "page1" | "page2">("page1");


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

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const debouncedSearch = useDebounce(studentSearch, 300);

  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["students", "search", debouncedSearch],
    queryFn: () => searchStudents({ query: debouncedSearch }, 1, 10, "summary"),
    enabled: debouncedSearch.length > 0 && generationMode === "single",
    staleTime: 5 * 60 * 1000,
  });

  const { data: directStudentData, isLoading: isDirectStudentLoading } = useQuery({
    queryKey: ["students", "direct", studentIdParam],
    queryFn: () => getStudentById(studentIdParam!),
    enabled: !!studentIdParam && generationMode === "single",
    staleTime: 5 * 60 * 1000,
  });

  const { data: bulkStudents = [], isLoading: isBulkLoading } = useQuery({
    queryKey: ["students", "class", bulkClass, bulkSection],
    queryFn: () => getStudents("summary", bulkClass, bulkSection),
    enabled: generationMode === "bulk" && !!bulkClass,
    staleTime: 5 * 60 * 1000,
  });

  const isLoadingStudents = isSearchLoading || isDirectStudentLoading || isBulkLoading;

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
      bplStatus: "NO" as "YES" | "NO",
      bplNo: "",
      cwsnStatus: (student.isCwsn ? "YES" : "NO") as "YES" | "NO",
      disabilityType: student.impairmentType || "",
    };

    const vIx: AdmissionFormVIxData = {
      ...BLANK_FORM_V_IX,
      academicYear: String(currentYear),
      admissionType: admissionCategory,
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
      admissionType: admissionCategory,
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
    if (directStudentData && !studentSearch) {
      return [directStudentData];
    }
    return searchResults?.data || [];
  }, [directStudentData, searchResults, studentSearch]);

  // Bulk Class Roster: Filter students by Class & Section
  const classRoster = useMemo(() => {
    return [...bulkStudents]
      .sort((a, b) => {
        const rollA = parseInt(String(a.presentRoll || "9999"), 10) || 9999;
        const rollB = parseInt(String(b.presentRoll || "9999"), 10) || 9999;
        return rollA - rollB;
      });
  }, [bulkStudents]);

  // Fetch dynamic class configuration from Database / Settings (/settings?tab=school-details)
  const { data: schoolConfig } = useSchoolConfigQuery();

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

  // Options for Format Class Selection Dropdown strictly based on configured classes
  const formatClassOptions = useMemo(() => {
    return availableClasses.map((c: any) => {
      const code = c.code.toUpperCase();
      const label = code.startsWith("CLASS") ? code : `Class ${code}`;
      return { label, value: code };
    });
  }, [availableClasses]);

  // Dynamic sections strictly for the currently selected class from Settings + actual student DB records
  const availableSections = useMemo(() => {
    const currentClassObj = dynamicClasses.find(
      (c: any) => c.code.toUpperCase() === bulkClass.toUpperCase()
    );
    const configuredSecs: string[] = currentClassObj && Array.isArray(currentClassObj.sections) && currentClassObj.sections.length > 0
      ? currentClassObj.sections
      : [];

    const studentSecsSet = new Set<string>();
    bulkStudents
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
  }, [dynamicClasses, bulkStudents, bulkClass]);

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

    const nextStart = startSerial + 1;
    let hasAdvanced = false;
    const advanceToNext = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      window.removeEventListener("afterprint", advanceToNext);
      setStartSerial(nextStart);
    };

    window.addEventListener("afterprint", advanceToNext, { once: true });

    // Save blank form entry to DB
    if (formMode === "blank" && !selectedStudent) {
      apiFetch("/api/admission/applications/bulk-blank", {
        method: "POST",
        json: {
          serials: [currentSingleFormNo],
          academicYear: String(currentYear),
          admissionType: admissionCategory,
          targetClass: effectiveFormClass || (activeTab === "xi" ? "XI" : "V"),
        },
      }).catch(err => console.error("Failed to log blank form", err));
    }

    setTimeout(() => {
      window.print();
      advanceToNext();
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
            : `Blank Batch (${effectiveFormClass ? `Class ${effectiveFormClass}` : activeTab.toUpperCase()})`,
      },
      currentYear
    );

    const nextStart = endSerial + 1;
    let hasAdvanced = false;
    const advanceToNext = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      window.removeEventListener("afterprint", advanceToNext);
      setStartSerial(nextStart);
      setIsBulkPrinting(false);
    };

    window.addEventListener("afterprint", advanceToNext, { once: true });

    // Save blank form entries to DB
    if (formMode === "blank") {
      apiFetch("/api/admission/applications/bulk-blank", {
        method: "POST",
        json: {
          serials: bulkSerialList,
          academicYear: String(currentYear),
          admissionType: admissionCategory,
          targetClass: effectiveFormClass || (activeTab === "xi" ? "XI" : "V"),
        },
      }).catch(err => console.error("Failed to log bulk blank forms", err));
    }

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        advanceToNext();
      }, 500);
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
        admissionType: admissionCategory,
        formNo: generationMode === "bulk" ? (bulkSerialList[previewBulkIndex] || formVIx.formNo) : formVIx.formNo,
        officeUse: {
          ...formVIx.officeUse,
          class: effectiveFormClass,
        },
      },
      formXI: {
        ...formXI,
        admissionType: admissionCategory,
        formNo: generationMode === "bulk" ? (bulkSerialList[previewBulkIndex] || formXI.formNo) : formXI.formNo,
        officeUse: {
          ...formXI.officeUse,
          class: effectiveFormClass || "XI",
        },
      },
    };
  }, [generationMode, formMode, classRoster, previewBulkIndex, serialPrefix, startSerial, paddingDigits, formVIx, formXI, bulkSerialList, admissionCategory, effectiveFormClass]);

  return {
    activePageView,
    activeTab,
    admissionCategory,
    availableClasses,
    availableSections,
    bulkClass,
    bulkCount,
    bulkSection,
    bulkSerialList,
    classRoster,
    effectiveFormClass,
    embedded,
    filteredStudents,
    formMode,
    formVIx,
    formXI,
    formatClassOptions,
    generationMode,
    handlePrintBulk,
    handlePrintSingle,
    handleResetBlank,
    handleResetSerialToOne,
    handleSelectStudent,
    isBulkPrinting,
    isHistoryOpen,
    isSearchFocused,
    isTrackerOpen,
    paddingDigits,
    previewBulkIndex,
    previewFormData,
    router,
    schoolInfo,
    selectedFormClass,
    selectedStudent,
    serialPrefix,
    setActivePageView,
    setActiveTab,
    setAdmissionCategory,
    setBulkClass,
    setBulkCount,
    setBulkSection,
    setFormMode,
    setGenerationMode,
    setIsHistoryOpen,
    setIsSearchFocused,
    setIsTrackerOpen,
    setPreviewBulkIndex,
    setSelectedFormClass,
    setStartSerial,
    setStudentSearch,
    startSerial,
    studentSearch,
    studentToFormData,
  };
}

export type AdmissionGeneratorState = ReturnType<typeof useAdmissionFormGenerator>;
