"use client";

import type { AdmissionApplicationFormProps } from "./props";
import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { admissionFormSchema, type AdmissionFormData } from "@/lib/validations/admission-form-schema";
import { loadAdmissionDraft, saveAdmissionDraft } from "@/lib/admission/form-draft";
import { getSavedAddressPresetsConfig, fetchAddressPresetsConfigFromDb, AddressPresetsConfig, DEFAULT_ADDRESS_PRESETS_CONFIG } from "@/lib/utils/preset-addresses";
import { getSavedSchoolPresets, fetchSchoolPresetsFromDb, DEFAULT_SCHOOL_PRESETS } from "@/lib/utils/school-presets";
import { getSavedBankPresets, fetchBankPresetsFromDb, DEFAULT_BANK_PRESETS, BankPresetItem } from "@/lib/utils/bank-presets";
import { getSavedMarksSchemes } from "@/lib/utils/marks-config";
import { toast } from "sonner";
import { DEFAULT_HS_SUBJECTS } from "@/components/admission/application-form/constants";

export function useAdmissionForm({
  initialData,
  aiExtractedData,
  onSubmit,
  submitButtonText = "Submit Application",
  isSubmitting = false,
  mode = "public",
  checklist,
  draftKey,
}: AdmissionApplicationFormProps) {
  // Accordion open/close state for all 9 sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (mode === "review" || !!initialData) {
      return {
        A: true,
        B: true,
        C: true,
        D: true,
        E: true,
        F: true,
        G: true,
        H: true,
        I: true,
      };
    }
    return {
      A: true,
      B: false,
      C: false,
      D: false,
      E: false,
      F: false,
      G: false,
      H: false,
      I: false,
    };
  });

  // Track which sections have been saved
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>(() => {
    if (mode === "review" || !!initialData) {
      return { A: true, B: true, C: true, D: true, E: true, F: true, G: true, H: true, I: true };
    }
    const empty: Record<string, boolean> = {};
    return empty;
  });

  const SECTION_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

  const SECTION_META: Record<string, { label: string; full: string }> = {
    A: { label: "Demographics", full: "Student Demographics (ব্যক্তিগত তথ্য)" },
    B: { label: "Social", full: "Social & Minority (সামাজিক শ্রেণি)" },
    C: { label: "CWSN", full: "Special Needs / CWSN (প্রতিবন্ধকতা)" },
    D: { label: "Family", full: "Parents & Address (অভিভাবক ও ঠিকানা)" },
    E: { label: "Academic", full: "Enrolment & Academic (ভর্তির বিবরণ)" },
    F: { label: "Previous", full: "Previous Schooling (পূর্ববর্তী বিদ্যালয়)" },
    G: { label: "Other", full: "Other Information (অন্যান্য তথ্য)" },
    H: { label: "Bank", full: "Bank Account Details (ব্যাংক তথ্য)" },
    I: { label: "Govt IDs", full: "Government IDs & Aadhaar (পরিচয়পত্র)" },
  };

  const SECTION_FIELDS: Record<string, (keyof AdmissionFormData)[]> = {
    A: ["studentName", "dob", "gender", "motherTongue", "religion", "bloodGroup"],
    B: ["socialCategory", "minorityGroup"],
    C: ["isCwsn"],
    D: [
      "fatherName",
      "fatherOccupation",
      "motherName",
      "motherOccupation",
      "guardianName",
      "relationshipWithGuardian",
      "guardianOccupation",
      "guardianQualification",
      "studentContact",
      "presentVillage",
      "presentPanchayat",
      "presentBlock",
      "presentPostOffice",
      "presentPoliceStation",
      "presentDistrict",
      "presentPincode",
    ],
    E: ["presentClass", "admissionType", "mediumOfInstruction"],
    F: [],
    G: [],
    H: [],
    I: ["hasAadhaar"],
  };

  const isSectionUnlocked = (sec: string) => {
    if (mode === "review" || !!initialData) return true;
    const idx = SECTION_ORDER.indexOf(sec);
    if (idx <= 0) return true; // Section A is always unlocked
    for (let i = 0; i < idx; i++) {
      const prevSec = SECTION_ORDER[i];
      if (!savedSections[prevSec]) {
        return false;
      }
    }
    return true;
  };

  const toggleSection = (sec: string) => {
    if (!isSectionUnlocked(sec)) {
      const idx = SECTION_ORDER.indexOf(sec);
      const prevSec = idx > 0 ? SECTION_ORDER[idx - 1] : "A";
      toast.warning(`Please complete Section ${prevSec} and click "Save & Next" first.`);
      return;
    }
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleSaveAndNext = async (currentSec: string) => {
    // 1. Trigger validation for current section's required fields
    const fields = SECTION_FIELDS[currentSec] || [];
    if (fields.length > 0) {
      const isValid = await trigger(fields as any);
      if (!isValid) {
        toast.error(`Please fill in all required fields in Section ${currentSec}.`);
        return;
      }
    }

    // 2. Mark section as saved
    const updatedSaved = { ...savedSections, [currentSec]: true };
    setSavedSections(updatedSaved);

    // 3. Real-time draft save (scoped to this form/student)
    if (draftKey) saveAdmissionDraft(draftKey, getValues(), updatedSaved);

    // 4. Next section transition
    const currentIndex = SECTION_ORDER.indexOf(currentSec);
    const nextSec = currentIndex !== -1 && currentIndex < SECTION_ORDER.length - 1 ? SECTION_ORDER[currentIndex + 1] : null;

    setOpenSections((prev) => {
      const updated = { ...prev, [currentSec]: false };
      if (nextSec) {
        updated[nextSec] = true;
      }
      return updated;
    });

    toast.success(`Section ${currentSec} Saved!`, {
      description: nextSec ? `Next Section ${nextSec} is now open.` : "All sections completed.",
    });

    if (nextSec) {
      setTimeout(() => {
        const el = document.getElementById(`section-card-${nextSec}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<z.input<typeof admissionFormSchema>, unknown, AdmissionFormData>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      studentName: "",
      studentNameBengali: "",
      dob: "",
      gender: "Male",
      motherTongue: "Bengali / বাংলা",
      religion: "Islam / ইসলাম",
      indianNationality: true,
      bloodGroup: "Unknown / জানা নেই",
      socialCategory: "General",
      minorityGroup: "Muslim / মুসলিম",
      isAay: false,
      isCwsn: false,
      hasDisabilityCertificate: false,
      disabilityCertificateNo: "",
      fatherName: "",
      fatherNameBengali: "",
      fatherOccupation: "Farmer / কৃষি কাজ",
      motherName: "",
      motherNameBengali: "",
      motherOccupation: "Homemaker / গৃহিণী",
      guardianName: "",
      relationshipWithGuardian: "Father / পিতা",
      guardianOccupation: "Farmer / কৃষি কাজ",
      guardianQualification: "Secondary / মাধ্যমিক (Class IX-X)",
      studentContact: "",
      altMobile: "",
      email: "",
      presentVillage: "",
      presentPanchayat: "",
      presentBlock: "",
      presentPostOffice: "",
      presentPoliceStation: "",
      presentDistrict: "South 24 Parganas",
      presentPincode: "",
      sameAsPresentAddress: true,
      permVillage: "",
      permPanchayat: "",
      permBlock: "",
      permPostOffice: "",
      permPoliceStation: "",
      permDistrict: "South 24 Parganas",
      permPincode: "",
      presentClass: "V",
      presentSection: "A",
      presentRoll: 1,
      admissionType: "New Admission / নতুন ভর্তি",
      mediumOfInstruction: "Bengali / বাংলা",
      academicStream: "Arts / কলা বিভাগ",
      previousResult: "Passed / উত্তীর্ণ",
      bplStatus: "NO",
      hasAadhaar: "Yes",
      ...(initialData || {}),
    },
  });

  // Watchers for dynamic fields
  const watchClass = watch("presentClass");
  const isClassXI = watchClass === "XI" || watchClass === "11";
  const watchSocialCat = watch("socialCategory");
  const watchCwsn = Boolean(watch("isCwsn"));
  const watchDisabilityCert = watch("hasDisabilityCertificate");
  const watchSameAddress = watch("sameAsPresentAddress");
  const watchBpl = watch("bplStatus");
  const watchHasAadhaar = watch("hasAadhaar");

  const watchFatherName = watch("fatherName");
  const watchFatherOcc = watch("fatherOccupation");
  const watchMotherName = watch("motherName");
  const watchMotherOcc = watch("motherOccupation");
  const watchRel = watch("relationshipWithGuardian");
  const watchContact = watch("studentContact");
  const watchAltMobile = watch("altMobile");

  // Watch Marks for Class XI
  const mBengali = Number(watch("bengaliMarks")) || 0;
  const mEnglish = Number(watch("englishMarks")) || 0;
  const mMath = Number(watch("mathMarks")) || 0;
  const mLifeSci = Number(watch("lifeSciMarks")) || 0;
  const mPhySci = Number(watch("phySciMarks")) || 0;
  const mHistory = Number(watch("historyMarks")) || 0;
  const mGeo = Number(watch("geoMarks")) || 0;

  const totalMadhyamikMarks = useMemo(() => {
    return mBengali + mEnglish + mMath + mLifeSci + mPhySci + mHistory + mGeo;
  }, [mBengali, mEnglish, mMath, mLifeSci, mPhySci, mHistory, mGeo]);

  const percentageMadhyamik = useMemo(() => {
    if (totalMadhyamikMarks <= 0) return 0;
    return Number(((totalMadhyamikMarks / 700) * 100).toFixed(1));
  }, [totalMadhyamikMarks]);

  // Address Presets State
  const [addressPresets, setAddressPresets] = useState<AddressPresetsConfig>(DEFAULT_ADDRESS_PRESETS_CONFIG);

  useEffect(() => {
    setAddressPresets(getSavedAddressPresetsConfig());
    fetchAddressPresetsConfigFromDb().then((data) => {
      if (data) setAddressPresets(data);
    });

    const handleConfigUpdate = (e: any) => {
      if (e.detail) setAddressPresets(e.detail);
    };
    window.addEventListener("sms_address_presets_config_updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("sms_address_presets_config_updated", handleConfigUpdate);
    };
  }, []);

  const presetAreaOptions = useMemo(() => {
    const list: { label: string; value: string; data: { village: string; gp: string; po: string; block: string; ps: string; dist: string; pin: string } }[] = [];
    const defaultPs = addressPresets.policeStations[0] || "Diamond Harbour";
    const defaultDist = addressPresets.districts[0] || "South 24 Parganas";
    const defaultGp = addressPresets.gramPanchayats?.[0] || "";
    const defaultBlock = addressPresets.blocks?.[0] || "";

    const added = new Set<string>();

    // Add configured post offices
    addressPresets.postOffices.forEach((po) => {
      const name = (po.name || "").trim();
      if (!name || added.has(name.toUpperCase())) return;
      added.add(name.toUpperCase());

      list.push({
        label: name,
        value: name,
        data: {
          village: name,
          gp: defaultGp,
          po: name,
          block: defaultBlock,
          ps: defaultPs,
          dist: defaultDist,
          pin: po.pincode || "",
        },
      });
    });

    // Add configured villages
    addressPresets.villages.forEach((v) => {
      const name = (v || "").trim();
      if (!name || added.has(name.toUpperCase())) return;
      added.add(name.toUpperCase());

      const matchPo = addressPresets.postOffices.find(
        (p) => (p.name || "").trim().toLowerCase() === name.toLowerCase()
      ) || addressPresets.postOffices[0];

      list.push({
        label: name,
        value: name,
        data: {
          village: name,
          gp: defaultGp,
          po: matchPo ? matchPo.name : name,
          block: defaultBlock,
          ps: defaultPs,
          dist: defaultDist,
          pin: matchPo?.pincode || "",
        },
      });
    });

    return list;
  }, [addressPresets]);

  const handleSelectPresetArea = (selectedVal: string) => {
    const match = presetAreaOptions.find((opt) => opt.value === selectedVal);
    if (match) {
      setValue("presentVillage", match.data.village, { shouldValidate: true });
      if (match.data.gp) setValue("presentPanchayat", match.data.gp, { shouldValidate: true });
      setValue("presentPostOffice", match.data.po, { shouldValidate: true });
      if (match.data.block) setValue("presentBlock", match.data.block, { shouldValidate: true });
      setValue("presentPoliceStation", match.data.ps, { shouldValidate: true });
      setValue("presentDistrict", match.data.dist, { shouldValidate: true });
      setValue("presentPincode", match.data.pin, { shouldValidate: true });

      if (getValues("sameAsPresentAddress")) {
        setValue("permVillage", match.data.village);
        if (match.data.gp) setValue("permPanchayat", match.data.gp);
        setValue("permPostOffice", match.data.po);
        if (match.data.block) setValue("permBlock", match.data.block);
        setValue("permPoliceStation", match.data.ps);
        setValue("permDistrict", match.data.dist);
        setValue("permPincode", match.data.pin);
      }
      toast.success(`ঠিকানা অটো-ফিল করা হয়েছে: ${match.data.village} (${match.data.pin})`);
    }
  };

  // HS Available Subjects from School Configuration & Presets
  const availableHsSubjects = useMemo(() => {
    const list = new Set<string>();

    try {
      const schemes = getSavedMarksSchemes();
      const xi = schemes.find((s) => s.classCode === "XI");
      const xii = schemes.find((s) => s.classCode === "XII");
      if (xi?.subjects && Array.isArray(xi.subjects)) {
        xi.subjects.forEach((s) => list.add(s.trim()));
      }
      if (xii?.subjects && Array.isArray(xii.subjects)) {
        xii.subjects.forEach((s) => list.add(s.trim()));
      }
    } catch (e) {
      console.warn("Could not load HS subjects from schemes:", e);
    }

    DEFAULT_HS_SUBJECTS.forEach((s) => list.add(s));
    return Array.from(list).filter(Boolean);
  }, []);

  const watchMandatory = watch("mandatorySubjects") || "";

  const mandatoryList = useMemo(() => {
    if (!watchMandatory) return [];
    return watchMandatory
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [watchMandatory]);

  const addMandatorySubject = (subj: string) => {
    if (!subj || subj === "none" || subj === "None / কোনোটি নয়") return;
    if (mandatoryList.some((s) => s.toLowerCase() === subj.toLowerCase())) {
      toast.info(`${subj} already added.`);
      return;
    }
    const updated = [...mandatoryList, subj];
    setValue("mandatorySubjects", updated.join(", "), { shouldValidate: true });
  };

  const removeMandatorySubject = (indexToRemove: number) => {
    const updated = mandatoryList.filter((_, idx) => idx !== indexToRemove);
    setValue("mandatorySubjects", updated.join(", "), { shouldValidate: true });
  };

  // School Presets State
  const [schoolPresets, setSchoolPresets] = useState<string[]>(DEFAULT_SCHOOL_PRESETS);
  const [isCustomSchool, setIsCustomSchool] = useState(false);

  useEffect(() => {
    setSchoolPresets(getSavedSchoolPresets());
    fetchSchoolPresetsFromDb().then((data) => {
      if (data && Array.isArray(data) && data.length > 0) setSchoolPresets(data);
    });

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) setSchoolPresets(e.detail);
    };
    window.addEventListener("sms_school_presets_updated", handleUpdate);
    return () => {
      window.removeEventListener("sms_school_presets_updated", handleUpdate);
    };
  }, []);

  const watchPreviousSchool = watch("previousSchool") || "";

  useEffect(() => {
    if (watchPreviousSchool) {
      const match = schoolPresets.some(
        (s) => s.trim().toLowerCase() === watchPreviousSchool.trim().toLowerCase()
      );
      if (!match) {
        setIsCustomSchool(true);
      }
    }
  }, [watchPreviousSchool, schoolPresets]);

  // Bank Presets State
  const [bankPresets, setBankPresets] = useState<BankPresetItem[]>(DEFAULT_BANK_PRESETS);
  const [isCustomBank, setIsCustomBank] = useState(false);

  useEffect(() => {
    setBankPresets(getSavedBankPresets());
    fetchBankPresetsFromDb().then((data) => {
      if (data && Array.isArray(data) && data.length > 0) setBankPresets(data);
    });

    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) setBankPresets(e.detail);
    };
    window.addEventListener("sms_bank_presets_updated", handleUpdate);
    return () => {
      window.removeEventListener("sms_bank_presets_updated", handleUpdate);
    };
  }, []);

  const bankDropdownOptions = useMemo(() => {
    const list = bankPresets.map((b) => ({
      label: `${b.bankName} - ${b.branchName} (${b.ifsc})`,
      value: b.id,
    }));
    list.push({ label: "✏️ Other / অন্যান্য (নতুন ব্যাংক / শাখা)...", value: "__other__" });
    return list;
  }, [bankPresets]);

  const handleBankPresetSelect = (presetId: string) => {
    if (presetId === "__other__") {
      setIsCustomBank(true);
      setValue("bankName", "", { shouldValidate: true });
      setValue("bankIfsc", "", { shouldValidate: true });
    } else {
      setIsCustomBank(false);
      const chosen = bankPresets.find((b) => b.id === presetId);
      if (chosen) {
        setValue("bankName", `${chosen.bankName}, ${chosen.branchName} Branch`, { shouldValidate: true });
        setValue("bankIfsc", chosen.ifsc, { shouldValidate: true });
        toast.success(`ব্যাংক তথ্য অটো-ফিল করা হয়েছে: ${chosen.bankName}`);
      }
    }
  };

  // Auto-fill extracted data from AI scan
  useEffect(() => {
    if (aiExtractedData && Object.keys(aiExtractedData).length > 0) {
      if (aiExtractedData.studentName) setValue("studentName", aiExtractedData.studentName);
      if (aiExtractedData.dob) setValue("dob", aiExtractedData.dob);
      if (aiExtractedData.gender) setValue("gender", aiExtractedData.gender === "Female" ? "Female" : "Male");
      if (aiExtractedData.fatherName) setValue("fatherName", aiExtractedData.fatherName);
      if (aiExtractedData.motherName) setValue("motherName", aiExtractedData.motherName);
      if (aiExtractedData.guardianName) setValue("guardianName", aiExtractedData.guardianName);
      if (aiExtractedData.studentContact || aiExtractedData.contactNumber) {
        setValue("studentContact", aiExtractedData.studentContact || aiExtractedData.contactNumber);
      }
      if (aiExtractedData.altMobile) setValue("altMobile", aiExtractedData.altMobile);
      if (aiExtractedData.presentVillage || aiExtractedData.village || aiExtractedData.address) {
        setValue("presentVillage", aiExtractedData.presentVillage || aiExtractedData.village || aiExtractedData.address);
      }
      if (aiExtractedData.presentPostOffice || aiExtractedData.postOffice) {
        setValue("presentPostOffice", aiExtractedData.presentPostOffice || aiExtractedData.postOffice);
      }
      if (aiExtractedData.presentPoliceStation || aiExtractedData.policeStation) {
        setValue("presentPoliceStation", aiExtractedData.presentPoliceStation || aiExtractedData.policeStation);
      }
      if (aiExtractedData.presentDistrict || aiExtractedData.district) {
        setValue("presentDistrict", aiExtractedData.presentDistrict || aiExtractedData.district);
      }
      if (aiExtractedData.presentPincode || aiExtractedData.pincode) {
        setValue("presentPincode", aiExtractedData.presentPincode || aiExtractedData.pincode);
      }
      if (aiExtractedData.aadhaar) setValue("aadhaar", aiExtractedData.aadhaar);
      if (aiExtractedData.targetClass || aiExtractedData.presentClass) {
        setValue("presentClass", aiExtractedData.targetClass || aiExtractedData.presentClass);
      }
      if (aiExtractedData.cwsnCertificateNo || aiExtractedData.disabilityCertificateNo) {
        setValue("disabilityCertificateNo", aiExtractedData.cwsnCertificateNo || aiExtractedData.disabilityCertificateNo);
      }
      if (aiExtractedData.previousSchool) setValue("previousSchool", aiExtractedData.previousSchool);
      if (aiExtractedData.bankAccountNo) setValue("bankAccountNo", aiExtractedData.bankAccountNo);
      if (aiExtractedData.bankIfsc) setValue("bankIfsc", aiExtractedData.bankIfsc);
      toast.success("AI Scanned data loaded into form fields!");
    }
  }, [aiExtractedData, setValue]);

  // Auto-sync guardian details
  useEffect(() => {
    const rel = (watchRel || "").toLowerCase();
    if (rel.includes("father") || rel.includes("পিতা")) {
      if (watchFatherName) setValue("guardianName", watchFatherName);
      if (watchFatherOcc) setValue("guardianOccupation", watchFatherOcc);
      if (watchContact && (!watchAltMobile || watchAltMobile.trim() === "")) {
        setValue("altMobile", watchContact);
      }
    } else if (rel.includes("mother") || rel.includes("মাতা")) {
      if (watchMotherName) setValue("guardianName", watchMotherName);
      if (watchMotherOcc) setValue("guardianOccupation", watchMotherOcc);
    }
  }, [watchRel, watchFatherName, watchFatherOcc, watchMotherName, watchMotherOcc, watchContact, watchAltMobile, setValue]);

  // Handle Permanent Address sync
  useEffect(() => {
    if (watchSameAddress) {
      const v = getValues();
      setValue("permVillage", v.presentVillage || "");
      setValue("permPanchayat", v.presentPanchayat || "");
      setValue("permBlock", v.presentBlock || "");
      setValue("permPostOffice", v.presentPostOffice || "");
      setValue("permPoliceStation", v.presentPoliceStation || "");
      setValue("permDistrict", v.presentDistrict || "South 24 Parganas");
      setValue("permPincode", v.presentPincode || "");
    }
  }, [watchSameAddress, setValue, getValues]);

  // Restore this form's own draft once (after a refresh); drafts never cross forms or students.
  const draftRestored = React.useRef(false);
  useEffect(() => {
    if (!draftKey || draftRestored.current) return;
    draftRestored.current = true;
    const draft = loadAdmissionDraft(draftKey);
    if (!draft) return;
    Object.entries(draft.values).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") setValue(k as any, v as any);
    });
    setSavedSections(draft.savedSections);
    const nextUnsaved = SECTION_ORDER.find((sec) => !draft.savedSections[sec]) || "A";
    setOpenSections({
      A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false, I: false,
      [nextUnsaved]: true,
    });
  }, [draftKey, setValue]);

  const onFormError = (formErrors: any) => {
    const keys = Object.keys(formErrors);
    if (keys.length > 0) {
      const first = keys[0];
      const err = formErrors[first]?.message || "Please check the required fields.";
      toast.error(`Please check: ${err}`);

      // Auto-open and scroll to the section that contains the error
      for (const [sec, fields] of Object.entries(SECTION_FIELDS)) {
        if ((fields as string[]).includes(first)) {
          setOpenSections({
            A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false, I: false,
            [sec]: true,
          });
          setTimeout(() => {
            const el = document.getElementById(`section-card-${sec}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
          break;
        }
      }
    }
  };

  return {
    SECTION_META,
    SECTION_ORDER,
    addMandatorySubject,
    availableHsSubjects,
    bankDropdownOptions,
    checklist,
    control,
    errors,
    handleBankPresetSelect,
    handleSaveAndNext,
    handleSelectPresetArea,
    handleSubmit,
    isClassXI,
    isCustomSchool,
    isSectionUnlocked,
    isSubmitting,
    mandatoryList,
    mode,
    onFormError,
    onSubmit,
    openSections,
    percentageMadhyamik,
    presetAreaOptions,
    register,
    removeMandatorySubject,
    savedSections,
    schoolPresets,
    setIsCustomSchool,
    setOpenSections,
    setValue,
    submitButtonText,
    toggleSection,
    totalMadhyamikMarks,
    watchBpl,
    watchCwsn,
    watchDisabilityCert,
    watchHasAadhaar,
    watchPreviousSchool,
    watchSameAddress,
    watchSocialCat,
  };
}

export type AdmissionFormState = ReturnType<typeof useAdmissionForm>;
