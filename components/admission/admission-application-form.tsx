"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import {
  getSavedAddressPresetsConfig,
  fetchAddressPresetsConfigFromDb,
  AddressPresetsConfig,
  DEFAULT_ADDRESS_PRESETS_CONFIG,
} from "@/lib/utils/preset-addresses";
import {
  getSavedSchoolPresets,
  fetchSchoolPresetsFromDb,
  DEFAULT_SCHOOL_PRESETS,
} from "@/lib/utils/school-presets";
import {
  getSavedBankPresets,
  fetchBankPresetsFromDb,
  DEFAULT_BANK_PRESETS,
  BankPresetItem,
} from "@/lib/utils/bank-presets";
import { getSavedMarksSchemes } from "@/lib/utils/marks-config";
import {
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  HeartHandshake,
  Users,
  GraduationCap,
  History,
  Info,
  Building2,
  FileBadge,
  Sparkles,
  CheckCircle2,
  Loader2,
  MapPin,
  X,
  Phone,
  ArrowRight,
  Lock,
  Check,
} from "lucide-react";
import { toast } from "sonner";

// 23 Districts of West Bengal
export const WB_DISTRICTS = [
  "Alipurduar",
  "Bankura",
  "Birbhum",
  "Cooch Behar",
  "Dakshin Dinajpur",
  "Darjeeling",
  "Hooghly",
  "Howrah",
  "Jalpaiguri",
  "Jhargram",
  "Kalimpong",
  "Kolkata",
  "Malda",
  "Murshidabad",
  "Nadia",
  "North 24 Parganas",
  "Paschim Bardhaman",
  "Paschim Medinipur",
  "Purba Bardhaman",
  "Purba Medinipur",
  "Purulia",
  "South 24 Parganas",
  "Uttar Dinajpur",
];

export const CLASSES = ["V", "VI", "VII", "VIII", "IX", "XI"];

export const OCCUPATIONS = [
  "Farmer / কৃষি কাজ",
  "Business / ব্যবসা",
  "Daily Wage Labour / দিনমজুর",
  "Service / চাকরি",
  "Teacher / শিক্ষকতা",
  "Driver / চালক",
  "Tailor / দর্জি",
  "Carpenter / ছুতার",
  "Mason / রাজমিস্ত্রি",
  "Electrician / ইলেকট্রিশিয়ান",
  "Homemaker / গৃহিণী",
  "Retired / অবসরপ্রাপ্ত",
  "Other / অন্যান্য",
];

export const QUALIFICATIONS = [
  "Illiterate / নিরক্ষর",
  "Primary / প্রাথমিক (Class I-IV)",
  "Upper Primary / উচ্চ প্রাথমিক (Class V-VIII)",
  "Secondary / মাধ্যমিক (Class IX-X)",
  "Higher Secondary / উচ্চ মাধ্যমিক (Class XI-XII)",
  "Graduate / স্নাতক (BA/BSc/BCom)",
  "Post Graduate / স্নাতকোত্তর (MA/MSc/MCom)",
  "Doctorate / Professional / পিএইচডি বা পেশাদার",
  "Other / অন্যান্য",
];

export const DEFAULT_HS_SUBJECTS = [
  "Bengali (1st Language)",
  "English (2nd Language)",
  "History",
  "Geography",
  "Political Science",
  "Philosophy",
  "Education",
  "Sanskrit",
  "Arabic",
  "Sociology",
  "Economics",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biological Sciences",
  "Computer Science",
  "Modern Computer Application (COMA)",
  "Nutrition",
  "Physical Education",
  "Music",
  "Visual Arts",
  "Accountancy",
  "Business Studies",
  "Commercial Law & Auditing (CLPA)",
  "Costing & Taxation",
];

const admissionFormSchema = z.object({
  // A. Student Demographics
  studentName: z.string().min(1, "Student Name is required"),
  studentNameBengali: z.string().optional(),
  dob: z.string().min(1, "Date of birth is required").refine((v) => {
    if (!v || v.trim() === "") return false;
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(s)) return true;
    const d = new Date(s);
    return !isNaN(d.getTime());
  }, "Valid date of birth required"),
  gender: z.string().min(1, "Gender is required"),
  motherTongue: z.string().min(1, "Mother tongue is required"),
  religion: z.string().min(1, "Religion is required"),
  indianNationality: z.coerce.boolean().optional(),
  bloodGroup: z.string().min(1, "Blood group is required"),
  heightCm: z.coerce.number().optional().nullable(),
  weightKg: z.coerce.number().optional().nullable(),
  birthRegistrationNo: z.string().optional(),
  identificationMark: z.string().optional(),

  // B. Social & Eligibility Categories
  socialCategory: z.string().min(1, "Social Category is required"),
  casteCertificateNo: z.string().optional(),
  minorityGroup: z.string().min(1, "Minority status is required"),
  isAay: z.coerce.boolean().optional(),

  // C. CWSN Profile
  isCwsn: z.coerce.boolean().optional(),
  impairmentType: z.string().optional(),
  hasDisabilityCertificate: z.coerce.boolean().optional(),
  disabilityCertificateNo: z.string().optional(),
  disabilityPercentage: z.coerce.number().optional().nullable(),
  sldType: z.string().optional(),

  // D. Family & Contacts
  fatherName: z.string().min(1, "Father's Name is required"),
  fatherNameBengali: z.string().optional(),
  fatherOccupation: z.string().min(1, "Father's occupation is required"),
  motherName: z.string().min(1, "Mother's Name is required"),
  motherNameBengali: z.string().optional(),
  motherOccupation: z.string().min(1, "Mother's occupation is required"),
  guardianName: z.string().min(1, "Guardian's Name is required"),
  relationshipWithGuardian: z.string().min(1, "Relationship with guardian is required"),
  guardianOccupation: z.string().min(1, "Guardian's occupation is required"),
  guardianQualification: z.string().min(1, "Guardian's qualification is required"),
  annualFamilyIncome: z.coerce.number().optional().nullable(),

  // Contact Details
  studentContact: z.string().min(1, "Mobile Number is required").refine((v) => {
    const digits = (v || "").replace(/\D/g, "");
    return digits.length === 10;
  }, "10-digit mobile number required"),
  altMobile: z.string().optional().refine((v) => {
    if (!v || v.trim() === "") return true;
    const digits = v.replace(/\D/g, "");
    return digits.length === 10;
  }, "10-digit mobile number required"),
  email: z.string().optional().refine((v) => !v || v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Invalid email address"),

  // Present Address
  presentVillage: z.string().min(1, "Village / Street is required"),
  presentPanchayat: z.string().min(1, "Gram Panchayat is required"),
  presentBlock: z.string().min(1, "Block / Municipality is required"),
  presentPostOffice: z.string().min(1, "Post Office is required"),
  presentPoliceStation: z.string().min(1, "Police Station is required"),
  presentDistrict: z.string().min(1, "District is required"),
  presentPincode: z.string().min(1, "PIN Code is required").refine((v) => {
    const digits = (v || "").replace(/\D/g, "");
    return digits.length === 6;
  }, "6-digit PIN required"),

  // Permanent Address
  sameAsPresentAddress: z.coerce.boolean().optional(),
  permVillage: z.string().optional(),
  permPanchayat: z.string().optional(),
  permBlock: z.string().optional(),
  permPostOffice: z.string().optional(),
  permPoliceStation: z.string().optional(),
  permDistrict: z.string().optional(),
  permPincode: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{6}$/.test(v.trim()), "6-digit PIN required"),

  // E. Enrolment & Academic Details
  presentClass: z.string().min(1, "Present Class is required"),
  presentSection: z.string().optional(),
  presentRoll: z.coerce.number().optional().nullable(),
  admissionType: z.string().min(1, "Admission Type is required"),
  mediumOfInstruction: z.string().min(1, "Medium of Instruction is required"),

  // Class XI Specific Fields
  academicStream: z.string().optional(),
  mandatorySubjects: z.string().optional(),
  additionalSubjects: z.string().optional(),
  class10BoardRegNo: z.string().optional(),
  class10BoardRollNo: z.string().optional(),
  bengaliMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  englishMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  mathMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  lifeSciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  phySciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  historyMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  geoMarks: z.coerce.number().min(0).max(100).optional().nullable(),

  // F. Previous Schooling
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  previousSection: z.string().optional(),
  previousRollNo: z.coerce.number().optional().nullable(),
  previousResult: z.string().optional(),
  previousMarksPercent: z.coerce.number().optional().nullable(),
  previousDaysAttended: z.coerce.number().optional().nullable(),

  // G. Other Information
  distanceToSchool: z.coerce.number().optional().nullable(),
  competitionsOlympiads: z.string().optional(),
  bplStatus: z.string().optional(),
  bplNo: z.string().optional(),

  // H. Bank Details
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankAccountNo: z.string().optional(),

  // I. Government Identifiers
  pen: z.string().optional(),
  healthId: z.string().optional(),
  studentUniqueCode: z.string().optional(),
  hasAadhaar: z.string().optional(),
  aadhaar: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === "" || /^\d{12}$/.test(v.replace(/\s+/g, "")),
      "12-digit Aadhaar number required"
    ),
  nameAsPerAadhaar: z.string().optional(),
});

export type AdmissionFormData = z.infer<typeof admissionFormSchema>;

export function formatAadhaarNumber(val: string): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "").slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(" ");
}

interface AdmissionApplicationFormProps {
  initialData?: Record<string, any>;
  aiExtractedData?: Record<string, any>;
  onSubmit: (data: AdmissionFormData) => Promise<void> | void;
  submitButtonText?: string;
  isSubmitting?: boolean;
  mode?: "public" | "offline" | "review";
  checklist?: React.ReactNode;
}

export function AdmissionApplicationForm({
  initialData,
  aiExtractedData,
  onSubmit,
  submitButtonText = "Submit Application",
  isSubmitting = false,
  mode = "public",
  checklist,
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

    // 3. Real-time draft save
    if (typeof window !== "undefined") {
      try {
        const data = getValues();
        localStorage.setItem("sms_admission_apply_draft", JSON.stringify(data));
        localStorage.setItem("sms_admission_saved_sections", JSON.stringify(updatedSaved));
      } catch (e) {
        console.warn("Could not save draft:", e);
      }
    }

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
  } = useForm<AdmissionFormData>({
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
  const watchCwsn = watch("isCwsn");
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

  // Restore draft on mount if available
  useEffect(() => {
    if (typeof window !== "undefined" && !initialData && (!aiExtractedData || Object.keys(aiExtractedData).length === 0)) {
      try {
        const savedDraft = localStorage.getItem("sms_admission_apply_draft");
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && typeof parsed === "object") {
            Object.keys(parsed).forEach((k) => {
              if (parsed[k] !== undefined && parsed[k] !== null && parsed[k] !== "") {
                setValue(k as any, parsed[k]);
              }
            });
          }
        }

        const savedSecs = localStorage.getItem("sms_admission_saved_sections");
        if (savedSecs) {
          const parsedSecs = JSON.parse(savedSecs);
          if (parsedSecs && typeof parsedSecs === "object") {
            setSavedSections(parsedSecs);
            // Open the first unsaved section or active section
            const nextUnsaved = SECTION_ORDER.find((s) => !parsedSecs[s]) || "A";
            setOpenSections({
              A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false, I: false,
              [nextUnsaved]: true,
            });
          }
        }
      } catch (e) {
        console.warn("Could not restore draft:", e);
      }
    }
  }, [initialData, aiExtractedData, setValue]);

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

  return (
    <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-4 max-w-4xl mx-auto w-full">
      {/* ALWAYS STICKY ULTRA-SMART COLORFUL STEP MAP (A to I) */}
      {(() => {
        const activeSection = SECTION_ORDER.find((sec) => openSections[sec]) || "A";
        const savedCount = Object.keys(savedSections).length;
        const progressPct = Math.round((savedCount / SECTION_ORDER.length) * 100);
        const lineProgress = Math.min(100, (savedCount / (SECTION_ORDER.length - 1)) * 100);

        return (
          <div className="sticky top-0 sm:top-2 z-40 bg-card/95 dark:bg-card/95 backdrop-blur-xl px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl border border-border/90 shadow-lg shadow-black/5 mb-4 transition-all duration-300">
            {/* Top Row: Active Section Info & Colorful Progress */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs shrink-0">
                  {activeSection}
                </span>
                <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight truncate">
                  {SECTION_META[activeSection]?.full || `Section ${activeSection}`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                  {savedCount} of {SECTION_ORDER.length} done
                </span>
                <span className="text-[11.5px] font-black font-mono text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 px-2 py-0.5 rounded-full shadow-2xs">
                  {progressPct}%
                </span>
              </div>
            </div>

            {/* Smart Colorful Pipeline Rail */}
            <div className="relative flex items-center justify-between w-full px-1">
              {/* Background Connecting Rail */}
              <div className="absolute left-3 right-3 sm:left-3.5 sm:right-3.5 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 bg-muted/80 rounded-full z-0" />

              {/* Dynamic Animated Gradient Line */}
              <div
                className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 via-purple-600 to-emerald-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(99,102,241,0.45)] z-0"
                style={{
                  width: savedCount > 0 ? `calc(${lineProgress}% * (100% - 24px) / 100)` : "0%",
                }}
              />

              {SECTION_ORDER.map((sec, idx) => {
                const isSaved = !!savedSections[sec];
                const isOpen = !!openSections[sec];
                const isUnlocked = isSectionUnlocked(sec);

                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      if (isUnlocked) {
                        setOpenSections({
                          A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false, I: false,
                          [sec]: true,
                        });
                        const el = document.getElementById(`section-card-${sec}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        const prevSec = SECTION_ORDER[idx - 1];
                        toast.warning(`Please complete Section ${prevSec} and click "Save & Next" first.`);
                      }
                    }}
                    title={`${sec}. ${SECTION_META[sec]?.label || sec}`}
                    className={cn(
                      "relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-black transition-all select-none shrink-0",
                      isOpen
                        ? "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/35 ring-4 ring-indigo-500/30 ring-offset-2 ring-offset-background scale-110 sm:scale-115 animate-pulse"
                        : isSaved
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-500/40 hover:scale-110 cursor-pointer"
                        : isUnlocked
                        ? "bg-card text-foreground border-2 border-indigo-400 dark:border-indigo-500 hover:border-indigo-600 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:scale-105 cursor-pointer"
                        : "bg-muted text-muted-foreground/40 border border-border/50 cursor-not-allowed text-[10px]"
                    )}
                  >
                    {isSaved ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : isUnlocked ? (
                      sec
                    ) : (
                      <Lock className="w-2.5 h-2.5 opacity-50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* SECTION A: Student Demographics */}
      <CollapsibleCard
        id="A"
        title="A. Student Demographics (শিক্ষার্থীর ব্যক্তিগত তথ্য)"
        icon={<User className="w-5 h-5 text-blue-600" />}
        isOpen={openSections.A}
        onToggle={() => toggleSection("A")}
        onSaveAndNext={() => handleSaveAndNext("A")}
        isSaved={!!savedSections.A}
        isLocked={!isSectionUnlocked("A")}
        badge="Basic Info"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <InputWrapper label="Student Name (English) *" error={errors.studentName?.message}>
            <input {...register("studentName")} placeholder="e.g. RAHUL MONDAL" className="uppercase" />
          </InputWrapper>

          <InputWrapper label="ছাত্রের নাম (বাংলায়)" error={errors.studentNameBengali?.message}>
            <input {...register("studentNameBengali")} placeholder="যেমন: রাহুল মন্ডল" />
          </InputWrapper>

          <InputWrapper label="Date of Birth (জন্ম তারিখ) *" error={errors.dob?.message}>
            <input {...register("dob")} type="date" />
          </InputWrapper>

          <InputWrapper label="Gender (লিঙ্গ) *" error={errors.gender?.message}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { label: "Male / ছাত্র (পুরুষ)", value: "Male" },
                    { label: "Female / ছাত্রী (মহিলা)", value: "Female" },
                    { label: "Other / অন্যান্য", value: "Other" },
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Mother Tongue (মাতৃভাষা)">
            <Controller
              control={control}
              name="motherTongue"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "Bengali / বাংলা"}
                  onChange={field.onChange}
                  options={[
                    "Bengali / বাংলা",
                    "Hindi / হিন্দি",
                    "Urdu / উর্দু",
                    "English / ইংরেজি",
                    "Santhali / সাঁওতালি",
                    "Nepali / নেপালি",
                    "Other / অন্যান্য",
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Religion (ধর্ম)">
            <Controller
              control={control}
              name="religion"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "Islam / ইসলাম"}
                  onChange={field.onChange}
                  options={[
                    "Islam / ইসলাম",
                    "Hinduism / হিন্দু",
                    "Christianity / খ্রিষ্টান",
                    "Sikhism / শিখ",
                    "Buddhism / বৌদ্ধ",
                    "Jainism / জৈন",
                    "Other / অন্যান্য",
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Indian Nationality? (ভারতীয় নাগরিক?)">
            <Controller
              control={control}
              name="indianNationality"
              render={({ field }) => (
                <CustomSelect
                  value={String(field.value ?? true)}
                  onChange={(val) => field.onChange(val === "true" || val === true)}
                  options={[
                    { label: "Yes / হ্যাঁ (Indian)", value: "true" },
                    { label: "No / না", value: "false" },
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Blood Group (রক্তের গ্রুপ)">
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "Unknown / জানা নেই"}
                  onChange={field.onChange}
                  options={[
                    "Unknown / জানা নেই",
                    "A+",
                    "A-",
                    "B+",
                    "B-",
                    "AB+",
                    "AB-",
                    "O+",
                    "O-",
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Height (উচ্চতা - CM-এ)">
            <input {...register("heightCm")} type="number" placeholder="যেমন: 135" />
          </InputWrapper>

          <InputWrapper label="Weight (ওজন - KG-তে)">
            <input {...register("weightKg")} type="number" step="0.1" placeholder="যেমন: 32.5" />
          </InputWrapper>

          <InputWrapper label="Birth Registration No. (জন্ম নিবন্ধন নং)">
            <input {...register("birthRegistrationNo")} placeholder="যেমন: 19991901001000..." />
          </InputWrapper>

          <InputWrapper label="Identification Mark (সনাক্তকরণ চিহ্ন)">
            <input {...register("identificationMark")} placeholder="যেমন: তিল / কাটা দাগ" />
          </InputWrapper>
        </div>
      </CollapsibleCard>

      {/* SECTION B: Social & Eligibility Categories */}
      <CollapsibleCard
        id="B"
        title="B. Social & Eligibility (সামাজিক ও সংরক্ষণের তথ্য)"
        icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        isOpen={openSections.B}
        onToggle={() => toggleSection("B")}
        onSaveAndNext={() => handleSaveAndNext("B")}
        isSaved={!!savedSections.B}
        isLocked={!isSectionUnlocked("B")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <InputWrapper label="Social Category (কাস্ট / ক্যাটাগরি) *" error={errors.socialCategory?.message}>
            <Controller
              control={control}
              name="socialCategory"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "General"}
                  onChange={field.onChange}
                  options={[
                    "General",
                    "OBC-A",
                    "OBC-B",
                    "SC (তফসিলি জাতি)",
                    "ST (তফসিলি উপজাতি)",
                    "Other / অন্যান্য",
                  ]}
                />
              )}
            />
          </InputWrapper>

          {watchSocialCat && watchSocialCat !== "General" && (
            <InputWrapper label="Caste Certificate No. (সার্টিফিকেট নং)">
              <input {...register("casteCertificateNo")} placeholder="যেমন: WB/SC/2024/..." />
            </InputWrapper>
          )}

          <InputWrapper label="Minority Group (সংখ্যালঘু গোষ্ঠী) *" error={errors.minorityGroup?.message}>
            <Controller
              control={control}
              name="minorityGroup"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "Muslim / মুসলিম"}
                  onChange={field.onChange}
                  options={[
                    "Muslim / মুসলিম",
                    "None / প্রযোজ্য নয়",
                    "Christian / খ্রিষ্টান",
                    "Sikh / শিখ",
                    "Buddhist / বৌদ্ধ",
                    "Jain / জৈন",
                    "Other / অন্যান্য",
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="AAY (অন্নযোজনা কার্ড আছে কি?)">
            <Controller
              control={control}
              name="isAay"
              render={({ field }) => (
                <CustomSelect
                  value={String(field.value ?? false)}
                  onChange={(val) => field.onChange(val === "true" || val === true)}
                  options={[
                    { label: "No / না", value: "false" },
                    { label: "Yes / হ্যাঁ (Antyodaya)", value: "true" },
                  ]}
                />
              )}
            />
          </InputWrapper>
        </div>
      </CollapsibleCard>

      {/* SECTION C: CWSN Profile */}
      <CollapsibleCard
        id="C"
        title="C. CWSN Profile (বিশেষ চাহিদাসম্পন্ন / প্রতিবন্ধী তথ্য)"
        icon={<HeartHandshake className="w-5 h-5 text-purple-600" />}
        isOpen={openSections.C}
        onToggle={() => toggleSection("C")}
        onSaveAndNext={() => handleSaveAndNext("C")}
        isSaved={!!savedSections.C}
        isLocked={!isSectionUnlocked("C")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <InputWrapper label="CWSN Status? (বিশেষ চাহিদা সম্পন্ন?)">
            <Controller
              control={control}
              name="isCwsn"
              render={({ field }) => (
                <CustomSelect
                  value={String(field.value ?? false)}
                  onChange={(val) => field.onChange(val === "true" || val === true)}
                  options={[
                    { label: "No / না (সাধারণ)", value: "false" },
                    { label: "Yes / হ্যাঁ (CWSN)", value: "true" },
                  ]}
                />
              )}
            />
          </InputWrapper>

          {watchCwsn && (
            <>
              <InputWrapper label="Type of Impairment (প্রতিবন্ধকতার ধরন)">
                <Controller
                  control={control}
                  name="impairmentType"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "Locomotor / অস্থি সংক্রান্ত"}
                      onChange={field.onChange}
                      options={[
                        "Locomotor / অস্থি সংক্রান্ত",
                        "Visual Impairment / দৃষ্টিহীন",
                        "Hearing Impairment / শ্রবণহীন",
                        "Speech & Language / বাক প্রতিবন্ধী",
                        "Intellectual / মানসিক",
                        "Autism / অটিজম",
                        "Multiple / একাধিক",
                        "Other / অন্যান্য",
                      ]}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Disability Certificate? (সার্টিফিকেট আছে?)">
                <Controller
                  control={control}
                  name="hasDisabilityCertificate"
                  render={({ field }) => (
                    <CustomSelect
                      value={String(field.value ?? false)}
                      onChange={(val) => {
                        const hasCert = val === "true" || val === true;
                        field.onChange(hasCert);
                        if (!hasCert) {
                          setValue("disabilityCertificateNo", "");
                          setValue("disabilityPercentage", null);
                        }
                      }}
                      options={[
                        { label: "No / না", value: "false" },
                        { label: "Yes / হ্যাঁ (প্রাপ্ত)", value: "true" },
                      ]}
                    />
                  )}
                />
              </InputWrapper>

              {watchDisabilityCert && (
                <>
                  <InputWrapper label="Disability Certificate No. (সার্টিফিকেট নম্বর)">
                    <input
                      {...register("disabilityCertificateNo")}
                      placeholder="সার্টিফিকেট নম্বর (যেমন: WB/CWSN/12345)"
                    />
                  </InputWrapper>

                  <InputWrapper label="Disability Percentage (শতকরা হার %)">
                    <input {...register("disabilityPercentage")} type="number" placeholder="যেমন: 40" />
                  </InputWrapper>
                </>
              )}
            </>
          )}

          <InputWrapper label="Specific Learning Disability (SLD)">
            <Controller
              control={control}
              name="sldType"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "None / কোনোটি নয়"}
                  onChange={field.onChange}
                  options={[
                    "None / কোনোটি নয়",
                    "Dyslexia (পড়তে সমস্যা)",
                    "Dysgraphia (লিখতে সমস্যা)",
                    "Dyscalculia (গণিতে সমস্যা)",
                    "Other / অন্যান্য",
                  ]}
                />
              )}
            />
          </InputWrapper>
        </div>
      </CollapsibleCard>

      {/* SECTION D: Family, Contacts & Addresses */}
      <CollapsibleCard
        id="D"
        title="D. Family & Contacts (পারিবারিক ও যোগাযোগের তথ্য)"
        icon={<Users className="w-5 h-5 text-indigo-600" />}
        isOpen={openSections.D}
        onToggle={() => toggleSection("D")}
        onSaveAndNext={() => handleSaveAndNext("D")}
        isSaved={!!savedSections.D}
        isLocked={!isSectionUnlocked("D")}
      >
        <div className="space-y-4">
          {/* Family Details */}
          <div className="border-b border-indigo-100 dark:border-indigo-950/60 pb-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide mb-3 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ১. পারিবারিক তথ্য (Family Details)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <InputWrapper label="Father's Name (English) *" error={errors.fatherName?.message}>
                <input {...register("fatherName")} placeholder="Father's Full Name" className="uppercase" />
              </InputWrapper>

              <InputWrapper label="পিতার নাম (বাংলায়)">
                <input {...register("fatherNameBengali")} placeholder="পিতার পুরো নাম বাংলায়" />
              </InputWrapper>

              <InputWrapper label="Father's Occupation (পিতার পেশা) *" error={errors.fatherOccupation?.message}>
                <Controller
                  control={control}
                  name="fatherOccupation"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "Farmer / কৃষি কাজ"}
                      onChange={field.onChange}
                      options={OCCUPATIONS}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Mother's Name (English) *" error={errors.motherName?.message}>
                <input {...register("motherName")} placeholder="Mother's Full Name" className="uppercase" />
              </InputWrapper>

              <InputWrapper label="মাতার নাম (বাংলায়)">
                <input {...register("motherNameBengali")} placeholder="মাতার পুরো নাম বাংলায়" />
              </InputWrapper>

              <InputWrapper label="Mother's Occupation (মাতার পেশা) *" error={errors.motherOccupation?.message}>
                <Controller
                  control={control}
                  name="motherOccupation"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "Homemaker / গৃহিণী"}
                      onChange={field.onChange}
                      options={OCCUPATIONS}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Guardian's Name (অভিভাবকের নাম) *" error={errors.guardianName?.message}>
                <input {...register("guardianName")} placeholder="Guardian's Full Name" className="uppercase" />
              </InputWrapper>

              <InputWrapper label="Relationship with Guardian (সম্পর্ক) *" error={errors.relationshipWithGuardian?.message}>
                <Controller
                  control={control}
                  name="relationshipWithGuardian"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "Father / পিতা"}
                      onChange={field.onChange}
                      options={[
                        "Father / পিতা",
                        "Mother / মাতা",
                        "Uncle / কাকা-মামা",
                        "Aunt / পিসি-মাসি",
                        "Grandfather / দাদু-ঠাকুরদা",
                        "Grandmother / দিদিমা-ঠাকুমা",
                        "Brother / ভাই-দাদা",
                        "Sister / বোন-দিদি",
                        "Other / অন্যান্য",
                      ]}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Guardian's Occupation (অভিভাবকের পেশা) *" error={errors.guardianOccupation?.message}>
                <Controller
                  control={control}
                  name="guardianOccupation"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "Farmer / কৃষি কাজ"}
                      onChange={field.onChange}
                      options={OCCUPATIONS}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Guardian's Qualification (শিক্ষাগত যোগ্যতা) *" error={errors.guardianQualification?.message}>
                <Controller
                  control={control}
                  name="guardianQualification"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "Secondary / মাধ্যমিক (Class IX-X)"}
                      onChange={field.onChange}
                      options={QUALIFICATIONS}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Annual Family Income (বাৎসরিক আয় - ₹)">
                <input {...register("annualFamilyIncome")} type="number" placeholder="যেমন: 60000" />
              </InputWrapper>
            </div>
          </div>

          {/* Contact Details */}
          <div className="border-b border-indigo-100 dark:border-indigo-950/60 pb-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide mb-3 shadow-2xs">
              <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ২. যোগাযোগের তথ্য (Contact Details)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <InputWrapper label="Primary Contact Mobile (মোবাইল নং) *" error={errors.studentContact?.message}>
                <input {...register("studentContact")} placeholder="10 ডিজিট মোবাইল নম্বর" maxLength={10} />
              </InputWrapper>

              <InputWrapper label="Guardian Contact No (বিকল্প মোবাইল)" error={errors.altMobile?.message}>
                <input {...register("altMobile")} placeholder="বিকল্প 10 ডিজিট মোবাইল" maxLength={10} />
              </InputWrapper>

              <InputWrapper label="Contact Email ID (ইমেইল)">
                <input {...register("email")} type="email" placeholder="যেমন: parent@gmail.com" />
              </InputWrapper>
            </div>
          </div>

          {/* Present Address */}
          <div className="border-b border-indigo-100 dark:border-indigo-950/60 pb-3.5 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              ৩. বর্তমান ঠিকানা (Present Address)
            </div>

            {/* Quick Preset Selector */}
            <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 rounded-xl space-y-2 shadow-2xs">
              <label className="text-[13.5px] sm:text-[14.5px] font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                সংরক্ষিত এলাকা থেকে দ্রুত নির্বাচন (Quick Select Area)
              </label>
              <CustomSelect
                placeholder="সংরক্ষিত এলাকা বেছে নিন..."
                options={presetAreaOptions.map((opt) => ({
                  label: opt.label,
                  value: opt.value,
                }))}
                onChange={(val) => handleSelectPresetArea(String(val))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <InputWrapper label="Village / Street (গ্রাম / পাড়া / রাস্তা) *" error={errors.presentVillage?.message}>
                <input {...register("presentVillage")} placeholder="গ্রাম বা রাস্তার নাম" />
              </InputWrapper>

              <InputWrapper label="Gram Panchayat (গ্রাম পঞ্চায়েত) *" error={errors.presentPanchayat?.message}>
                <input {...register("presentPanchayat")} placeholder="যেমন: মথুরাপুর" />
              </InputWrapper>

              <InputWrapper label="Block / Municipality (ব্লক / পৌরসভা) *" error={errors.presentBlock?.message}>
                <input {...register("presentBlock")} placeholder="যেমন: মথুরাপুর-১" />
              </InputWrapper>

              <InputWrapper label="Post Office (ডাকঘর) *" error={errors.presentPostOffice?.message}>
                <input {...register("presentPostOffice")} placeholder="ডাকঘরের নাম" />
              </InputWrapper>

              <InputWrapper label="Police Station (থানা) *" error={errors.presentPoliceStation?.message}>
                <input {...register("presentPoliceStation")} placeholder="থানার নাম" />
              </InputWrapper>

              <InputWrapper label="District (জেলা) *" error={errors.presentDistrict?.message}>
                <Controller
                  control={control}
                  name="presentDistrict"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "South 24 Parganas"}
                      onChange={field.onChange}
                      options={WB_DISTRICTS}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="PIN Code (পিন কোড) *" error={errors.presentPincode?.message}>
                <input {...register("presentPincode")} placeholder="৬ ডিজিট পিন কোড" maxLength={6} />
              </InputWrapper>
            </div>
          </div>

          {/* Permanent Address */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                ৪. স্থায়ী ঠিকানা (Permanent Address)
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-[13px] font-bold text-primary px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors">
                <input
                  type="checkbox"
                  {...register("sameAsPresentAddress")}
                  className="rounded border-input text-primary w-4 h-4 cursor-pointer"
                />
                <span>বর্তমান ঠিকানার অনুরূপ (Same as Present)</span>
              </label>
            </div>

            {!watchSameAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 p-3 bg-muted/20 rounded-xl border animate-in fade-in duration-200">
                <InputWrapper label="Village / Street (গ্রাম / পাড়া) *" error={errors.permVillage?.message}>
                  <input {...register("permVillage")} placeholder="গ্রাম বা রাস্তার নাম" />
                </InputWrapper>

                <InputWrapper label="Gram Panchayat (গ্রাম পঞ্চায়েত)">
                  <input {...register("permPanchayat")} placeholder="গ্রাম পঞ্চায়েত" />
                </InputWrapper>

                <InputWrapper label="Block / Municipality (ব্লক / পৌরসভা)">
                  <input {...register("permBlock")} placeholder="ব্লক বা পৌরসভা" />
                </InputWrapper>

                <InputWrapper label="Post Office (ডাকঘর) *" error={errors.permPostOffice?.message}>
                  <input {...register("permPostOffice")} placeholder="ডাকঘর" />
                </InputWrapper>

                <InputWrapper label="Police Station (থানা) *" error={errors.permPoliceStation?.message}>
                  <input {...register("permPoliceStation")} placeholder="থানা" />
                </InputWrapper>

                <InputWrapper label="District (জেলা) *" error={errors.permDistrict?.message}>
                  <Controller
                    control={control}
                    name="permDistrict"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || "South 24 Parganas"}
                        onChange={field.onChange}
                        options={WB_DISTRICTS}
                      />
                    )}
                  />
                </InputWrapper>

                <InputWrapper label="PIN Code (পিন কোড) *" error={errors.permPincode?.message}>
                  <input {...register("permPincode")} placeholder="৬ ডিজিট পিন" maxLength={6} />
                </InputWrapper>
              </div>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* SECTION E: Enrolment & Academic Details */}
      <CollapsibleCard
        id="E"
        title="E. Academic & Enrolment (ভর্তি ও শ্রেণি সংক্রান্ত তথ্য)"
        icon={<GraduationCap className="w-5 h-5 text-amber-600" />}
        isOpen={openSections.E}
        onToggle={() => toggleSection("E")}
        onSaveAndNext={() => handleSaveAndNext("E")}
        isSaved={!!savedSections.E}
        isLocked={!isSectionUnlocked("E")}
        badge={isClassXI ? "Class XI Special" : undefined}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <InputWrapper label="Present Class (যে শ্রেণিতে ভর্তি হচ্ছে) *" error={errors.presentClass?.message}>
              <Controller
                control={control}
                name="presentClass"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "V"}
                    onChange={field.onChange}
                    options={CLASSES.map((c) => ({ label: `Class ${c}`, value: c }))}
                  />
                )}
              />
            </InputWrapper>

            {mode !== "public" && (
              <>
                <InputWrapper label="Present Section (সেকশন)">
                  <Controller
                    control={control}
                    name="presentSection"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || "A"}
                        onChange={field.onChange}
                        options={[
                          { label: "Section A", value: "A" },
                          { label: "Section B", value: "B" },
                          { label: "Section C", value: "C" },
                          { label: "Section D", value: "D" },
                        ]}
                      />
                    )}
                  />
                </InputWrapper>

                <InputWrapper label="Present Roll Number (রোল নম্বর)">
                  <input {...register("presentRoll")} type="number" placeholder="রোল নং" />
                </InputWrapper>
              </>
            )}

            <InputWrapper label="Admission Type (ভর্তির ধরন) *" error={errors.admissionType?.message}>
              <Controller
                control={control}
                name="admissionType"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "New Admission / নতুন ভর্তি"}
                    onChange={field.onChange}
                    options={[
                      "New Admission / নতুন ভর্তি",
                      "Re-admission / পুনর্ভর্তি",
                      "Transfer Admission / টিসি দিয়ে ভর্তি",
                    ]}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Medium of Instruction (শিক্ষার মাধ্যম) *" error={errors.mediumOfInstruction?.message}>
              <Controller
                control={control}
                name="mediumOfInstruction"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Bengali / বাংলা"}
                    onChange={field.onChange}
                    options={[
                      "Bengali / বাংলা",
                      "English / ইংরেজি",
                      "Urdu / উর্দু",
                      "Hindi / হিন্দি",
                    ]}
                  />
                )}
              />
            </InputWrapper>
          </div>

          {/* DYNAMIC SECTION FOR CLASS XI ONLY */}
          {isClassXI && (
            <div className="mt-4 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-4 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800 pb-2.5">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Only for Class XI (একাদশ শ্রেণির মাধ্যমিক নম্বর ও বিষয় নির্বাচন)
                  </h4>
                </div>
                {totalMadhyamikMarks > 0 && (
                  <div className="flex gap-2">
                    <Badge className="bg-amber-600 text-white font-mono">
                      মোট: {totalMadhyamikMarks}/700
                    </Badge>
                    <Badge variant="outline" className="border-amber-400 font-mono font-bold">
                      {percentageMadhyamik}%
                    </Badge>
                  </div>
                )}
              </div>

              {/* Board Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputWrapper label="Class 10 Board Reg No. (মাধ্যমিক রেজিস্ট্রেশন নং)">
                  <input {...register("class10BoardRegNo")} placeholder="যেমন: 19180201004/2024" className="font-mono uppercase" />
                </InputWrapper>

                <InputWrapper label="Class 10 Board Roll No. (মাধ্যমিক রোল ও নম্বর)">
                  <input {...register("class10BoardRollNo")} placeholder="যেমন: 123456N 0012" className="font-mono uppercase" />
                </InputWrapper>
              </div>

              {/* Madhyamik 7 Subjects Marks Table */}
              <div className="space-y-2">
                <p className="text-[13.5px] sm:text-[14px] font-bold text-foreground">মাধ্যমিক পরীক্ষায় প্রাপ্ত নম্বর (Marks out of 100):</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  <InputWrapper label="1. Bengali (বাংলা)">
                    <input {...register("bengaliMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                  </InputWrapper>

                  <InputWrapper label="2. English (ইংরেজি)">
                    <input {...register("englishMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                  </InputWrapper>

                  <InputWrapper label="3. Mathematics (গণিত)">
                    <input {...register("mathMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                  </InputWrapper>

                  <InputWrapper label="4. Life Sci (জীবন বিজ্ঞান)">
                    <input {...register("lifeSciMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                  </InputWrapper>

                  <InputWrapper label="5. Phys Sci (ভৌত বিজ্ঞান)">
                    <input {...register("phySciMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                  </InputWrapper>

                  <InputWrapper label="6. History (ইতিহাস)">
                    <input {...register("historyMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                  </InputWrapper>

                  <InputWrapper label="7. Geography (ভূগোল)">
                    <input {...register("geoMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                  </InputWrapper>
                </div>
              </div>

              {/* Subjects in Class XI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200 dark:border-amber-800 items-start">
                {/* 1. Mandatory Subjects Multi-Picker */}
                <div className="space-y-1.5">
                  <label className="block text-[13.5px] sm:text-[14.5px] font-bold text-foreground leading-snug">
                    Mandatory Subjects (বাধ্যতামূলক বিষয়সমূহ)
                  </label>

                  {/* Selected Subject Chips */}
                  {mandatoryList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-background border rounded-xl min-h-[38px] items-center shadow-2xs">
                      {mandatoryList.map((subj, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-semibold border border-amber-300 dark:border-amber-800 animate-in zoom-in-95 duration-150"
                        >
                          {subj}
                          <button
                            type="button"
                            onClick={() => removeMandatorySubject(idx)}
                            className="hover:text-destructive hover:bg-amber-200 dark:hover:bg-amber-900 p-0.5 rounded-full transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Dropdown to add a subject from school presets */}
                  <CustomSelect
                    placeholder="+ বিষয় নির্বাচন করুন (Select Mandatory Subject)..."
                    options={availableHsSubjects.map((s) => ({ label: s, value: s }))}
                    onChange={(val) => addMandatorySubject(String(val))}
                  />
                </div>

                {/* 2. Additional Subject Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[13.5px] sm:text-[14.5px] font-bold text-foreground leading-snug">
                    Additional Subject (অতিরিক্ত ঐচ্ছিক বিষয়)
                  </label>
                  <Controller
                    control={control}
                    name="additionalSubjects"
                    render={({ field }) => (
                      <CustomSelect
                        value={field.value || "None / কোনোটি নয়"}
                        onChange={field.onChange}
                        options={[
                          "None / কোনোটি নয়",
                          ...availableHsSubjects,
                        ]}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleCard>

      {/* SECTION F: Previous Schooling */}
      <CollapsibleCard
        id="F"
        title="F. Previous Schooling (পূর্ববর্তী স্কুলের বিবরণ)"
        icon={<History className="w-5 h-5 text-teal-600" />}
        isOpen={openSections.F}
        onToggle={() => toggleSection("F")}
        onSaveAndNext={() => handleSaveAndNext("F")}
        isSaved={!!savedSections.F}
        isLocked={!isSectionUnlocked("F")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <InputWrapper label="Previous School Name (পূর্ববর্তী বিদ্যালয়ের নাম)">
              <div className="space-y-1.5">
                <CustomSelect
                  value={isCustomSchool ? "__other__" : watchPreviousSchool}
                  onChange={(val) => {
                    if (val === "__other__") {
                      setIsCustomSchool(true);
                      setValue("previousSchool", "", { shouldValidate: true });
                    } else {
                      setIsCustomSchool(false);
                      setValue("previousSchool", String(val), { shouldValidate: true });
                    }
                  }}
                  placeholder="পূর্ববর্তী বিদ্যালয় নির্বাচন করুন..."
                  options={[
                    ...schoolPresets.map((s) => ({ label: s, value: s })),
                    { label: "✏️ Other / অন্যান্য (নতুন লিখুন)...", value: "__other__" },
                  ]}
                />
                {isCustomSchool && (
                  <input
                    {...register("previousSchool")}
                    placeholder="বিদ্যালয়ের নাম লিখুন"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs sm:text-sm h-10 sm:h-9 outline-none focus:ring-2 focus:ring-primary animate-in fade-in duration-200"
                    autoFocus
                  />
                )}
              </div>
            </InputWrapper>
          </div>

          <InputWrapper label="Previous Grade / Class (পূর্ববর্তী শ্রেণি)">
            <Controller
              control={control}
              name="previousClass"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder="নির্বাচন করুন"
                  options={[
                    "Class IV / চতুর্থ শ্রেণি",
                    "Class V / পঞ্চম শ্রেণি",
                    "Class VI / ষষ্ঠ শ্রেণি",
                    "Class VII / সপ্তম শ্রেণি",
                    "Class VIII / অষ্টম শ্রেণি",
                    "Class IX / নবম শ্রেণি",
                    "Class X / দশম (মাধ্যমিক)",
                    "Other / অন্যান্য",
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Previous Section (সেকশন)">
            <Controller
              control={control}
              name="previousSection"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "A"}
                  onChange={field.onChange}
                  options={[
                    { label: "Section A / সেকশন A", value: "A" },
                    { label: "Section B / সেকশন B", value: "B" },
                    { label: "Section C / সেকশন C", value: "C" },
                    { label: "Section D / সেকশন D", value: "D" },
                    { label: "None / কোনোটি নয়", value: "None" },
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Previous Roll No (পূর্বের রোল নং)">
            <input {...register("previousRollNo")} type="number" placeholder="রোল নং" />
          </InputWrapper>

          <InputWrapper label="Exam Result (পরীক্ষার ফলাফল)">
            <Controller
              control={control}
              name="previousResult"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "Passed / উত্তীর্ণ"}
                  onChange={field.onChange}
                  options={[
                    "Passed / উত্তীর্ণ",
                    "Promoted / প্রমোটেড",
                    "Failed / অনুত্তীর্ণ",
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Marks Obtained (প্রাপ্ত নম্বর %)">
            <input {...register("previousMarksPercent")} type="number" step="0.1" placeholder="যেমন: 78.5" />
          </InputWrapper>

          <InputWrapper label="Days Attended (উপস্থিতির দিন সংখ্যা)">
            <input {...register("previousDaysAttended")} type="number" placeholder="যেমন: 180" />
          </InputWrapper>
        </div>
      </CollapsibleCard>

      {/* SECTION G: Other Information */}
      <CollapsibleCard
        id="G"
        title="G. Other Information (অন্যান্য প্রয়োজনীয় তথ্য)"
        icon={<Info className="w-5 h-5 text-sky-600" />}
        isOpen={openSections.G}
        onToggle={() => toggleSection("G")}
        onSaveAndNext={() => handleSaveAndNext("G")}
        isSaved={!!savedSections.G}
        isLocked={!isSectionUnlocked("G")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <InputWrapper label="Distance to School (স্কুল থেকে দূরত্ব - KM)">
            <input {...register("distanceToSchool")} type="number" step="0.1" placeholder="যেমন: 1.5" />
          </InputWrapper>

          <InputWrapper label="Competitions / Olympiads (অংশগ্রহণ)">
            <input {...register("competitionsOlympiads")} placeholder="যেমন: খেলাধুলা / কুইজ / কোনোটি নয়" />
          </InputWrapper>

          <InputWrapper label="BPL Status (বিপিএল তালিকাভুক্ত কি?)">
            <Controller
              control={control}
              name="bplStatus"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "NO"}
                  onChange={field.onChange}
                  options={[
                    { label: "NO / না", value: "NO" },
                    { label: "YES / হ্যাঁ (BPL)", value: "YES" },
                  ]}
                />
              )}
            />
          </InputWrapper>

          {watchBpl === "YES" && (
            <InputWrapper label="BPL Number (বিপিএল কার্ড নং)">
              <input {...register("bplNo")} placeholder="যেমন: BPL/2024/..." />
            </InputWrapper>
          )}
        </div>
      </CollapsibleCard>

      {/* SECTION H: Bank Details */}
      <CollapsibleCard
        id="H"
        title="H. Bank Details (ব্যাংক অ্যাকাউন্টের বিবরণ)"
        icon={<Building2 className="w-5 h-5 text-emerald-700" />}
        isOpen={openSections.H}
        onToggle={() => toggleSection("H")}
        onSaveAndNext={() => handleSaveAndNext("H")}
        isSaved={!!savedSections.H}
        isLocked={!isSectionUnlocked("H")}
      >
        <div className="space-y-3">
          {/* Quick Bank Preset Selector */}
          <div className="p-3 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 rounded-xl space-y-2 shadow-2xs">
            <label className="text-[13.5px] sm:text-[14.5px] font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              সংরক্ষিত ব্যাংক প্রিসেট থেকে নির্বাচন (Quick Select Bank)
            </label>
            <CustomSelect
              placeholder="সংরক্ষিত ব্যাংক ও ব্রাঞ্চ বেছে নিন..."
              options={bankDropdownOptions}
              onChange={(val) => handleBankPresetSelect(String(val))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <InputWrapper label="Bank Name & Branch (ব্যাংক ও শাখার নাম)">
              <input {...register("bankName")} placeholder="যেমন: State Bank of India, Mathurapur Branch" />
            </InputWrapper>

            <InputWrapper label="Bank IFSC Code (আইএফএসসি কোড)">
              <input {...register("bankIfsc")} placeholder="যেমন: SBIN0001234" className="uppercase font-mono" />
            </InputWrapper>

            <InputWrapper label="Bank Account Number (অ্যাকাউন্ট নং)">
              <input {...register("bankAccountNo")} placeholder="অ্যাকাউন্ট নম্বর" className="font-mono" />
            </InputWrapper>
          </div>
        </div>
      </CollapsibleCard>

      {/* SECTION I: Government Identifiers */}
      <CollapsibleCard
        id="I"
        title="I. Government Identifiers (সরকারি পরিচয় নম্বরসমূহ)"
        icon={<FileBadge className="w-5 h-5 text-rose-600" />}
        isOpen={openSections.I}
        onToggle={() => toggleSection("I")}
        onSaveAndNext={() => handleSaveAndNext("I")}
        isSaved={!!savedSections.I}
        isLocked={!isSectionUnlocked("I")}
        isLastSection={true}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <InputWrapper label="PEN (Permanent Education Number)">
            <input {...register("pen")} placeholder="জাতীয় PEN নম্বর (যদি থাকে)" />
          </InputWrapper>

          <InputWrapper label="Health ID (ABHA স্বাস্থ্য আইডি)">
            <input {...register("healthId")} placeholder="ABHA আইডি" />
          </InputWrapper>

          <InputWrapper label="Bangla Shiksha Portal No. (BSP ID)">
            <input {...register("studentUniqueCode")} placeholder="বাংলা শিক্ষা স্টুডেন্ট কোড" />
          </InputWrapper>

          <InputWrapper label="Aadhaar Available? (আধার কার্ড আছে?)">
            <Controller
              control={control}
              name="hasAadhaar"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "Yes"}
                  onChange={(val) => {
                    field.onChange(val);
                    if (val === "No") {
                      setValue("aadhaar", "");
                      setValue("nameAsPerAadhaar", "");
                    }
                  }}
                  options={[
                    { label: "Yes / হ্যাঁ (আধার কার্ড আছে)", value: "Yes" },
                    { label: "No / না (আধার কার্ড নেই)", value: "No" },
                  ]}
                />
              )}
            />
          </InputWrapper>

          {watchHasAadhaar !== "No" && (
            <>
              <InputWrapper label="Aadhaar Number (১২ ডিজিট আধার নং)" error={errors.aadhaar?.message}>
                <Controller
                  control={control}
                  name="aadhaar"
                  render={({ field }) => (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatAadhaarNumber(field.value || "")}
                      onChange={(e) => {
                        const rawDigits = e.target.value.replace(/\D/g, "").slice(0, 12);
                        field.onChange(rawDigits);
                      }}
                      maxLength={14}
                      placeholder="XXXX XXXX XXXX"
                      className="font-mono tracking-widest text-sm sm:text-base font-semibold"
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Name (as per Aadhaar - আধারে লেখা নাম)">
                <input {...register("nameAsPerAadhaar")} placeholder="আধারে যে বানান আছে" />
              </InputWrapper>
            </>
          )}
        </div>
      </CollapsibleCard>

      {/* Optional Document Verification Checklist Slot for Teacher */}
      {checklist}

      {/* SUBMIT BUTTON - Clean, Responsive & Mobile-Optimized */}
      <div className="pt-4 pb-8 sm:pb-4 w-full">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="w-full text-sm sm:text-base md:text-lg h-12 sm:h-14 font-bold gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.99] cursor-pointer rounded-xl sm:rounded-2xl px-3 sm:px-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <span className="truncate">আবেদন জমা হচ্ছে… (Processing…)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />
              <span className="truncate">{submitButtonText}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// Distinct Colorful Section Themes for visual appeal
const SECTION_THEMES: Record<string, { card: string; iconBox: string; title: string }> = {
  A: {
    card: "border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/25 via-card to-card hover:border-blue-400/50 shadow-xs",
    iconBox: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 shadow-2xs",
    title: "text-blue-950 dark:text-blue-100",
  },
  B: {
    card: "border-purple-200 dark:border-purple-900/60 bg-gradient-to-b from-purple-50/25 via-card to-card hover:border-purple-400/50 shadow-xs",
    iconBox: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 shadow-2xs",
    title: "text-purple-950 dark:text-purple-100",
  },
  C: {
    card: "border-amber-200 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/25 via-card to-card hover:border-amber-400/50 shadow-xs",
    iconBox: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-2xs",
    title: "text-amber-950 dark:text-amber-100",
  },
  D: {
    card: "border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/25 via-card to-card hover:border-indigo-400/50 shadow-xs",
    iconBox: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shadow-2xs",
    title: "text-indigo-950 dark:text-indigo-100",
  },
  E: {
    card: "border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-b from-emerald-50/25 via-card to-card hover:border-emerald-400/50 shadow-xs",
    iconBox: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-2xs",
    title: "text-emerald-950 dark:text-emerald-100",
  },
  F: {
    card: "border-cyan-200 dark:border-cyan-900/60 bg-gradient-to-b from-cyan-50/25 via-card to-card hover:border-cyan-400/50 shadow-xs",
    iconBox: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25 shadow-2xs",
    title: "text-cyan-950 dark:text-cyan-100",
  },
  G: {
    card: "border-orange-200 dark:border-orange-900/60 bg-gradient-to-b from-orange-50/25 via-card to-card hover:border-orange-400/50 shadow-xs",
    iconBox: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 shadow-2xs",
    title: "text-orange-950 dark:text-orange-100",
  },
  H: {
    card: "border-teal-200 dark:border-teal-900/60 bg-gradient-to-b from-teal-50/25 via-card to-card hover:border-teal-400/50 shadow-xs",
    iconBox: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25 shadow-2xs",
    title: "text-teal-950 dark:text-teal-100",
  },
  I: {
    card: "border-rose-200 dark:border-rose-900/60 bg-gradient-to-b from-rose-50/25 via-card to-card hover:border-rose-400/50 shadow-xs",
    iconBox: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25 shadow-2xs",
    title: "text-rose-950 dark:text-rose-100",
  },
};

// Smart helper to render Bengali text ~10% smaller for perfect visual balance
function renderBilingualText(text: string) {
  if (!text) return null;
  const match = text.match(/^(.*?)\s*(\([^)]+\))(.*)$/);
  if (match) {
    const [, main, paren, suffix] = match;
    return (
      <span className="inline-flex items-baseline gap-1 flex-wrap">
        <span>{main}</span>
        <span className="text-[12px] sm:text-[12.5px] font-semibold text-foreground/80">{paren}</span>
        {suffix && <span className="text-destructive font-bold">{suffix}</span>}
      </span>
    );
  }
  const hasBengali = /[\u0980-\u09FF]/.test(text);
  if (hasBengali) {
    return <span className="text-[13px] sm:text-[13.5px] font-semibold">{text}</span>;
  }
  return <span>{text}</span>;
}

// Collapsible Progressive Accordion Card with Colorful Themes
function CollapsibleCard({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  badge,
  onSaveAndNext,
  isLastSection,
  isSaved,
  isLocked,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  onSaveAndNext?: () => void;
  isLastSection?: boolean;
  isSaved?: boolean;
  isLocked?: boolean;
  children: React.ReactNode;
}) {
  const theme = SECTION_THEMES[id] || {
    card: "border-border/80 bg-card hover:border-primary/40",
    iconBox: "bg-muted/60 text-foreground border border-border/50",
    title: "text-foreground",
  };

  return (
    <div
      id={`section-card-${id}`}
      className={cn(
        "rounded-2xl border transition-all duration-200 scroll-mt-28",
        isLocked
          ? "border-dashed border-border/60 bg-muted/20 opacity-75"
          : theme.card,
        isOpen ? "overflow-visible shadow-md ring-1 ring-black/5 dark:ring-white/5 opacity-100" : "overflow-hidden"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between transition-colors text-left select-none rounded-t-2xl",
          isLocked ? "cursor-not-allowed hover:bg-muted/40" : "cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("p-2 sm:p-2.5 rounded-xl shrink-0", isLocked ? "bg-muted text-muted-foreground border border-border/40" : theme.iconBox)}>
            {icon}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-bold text-sm sm:text-[15.5px] tracking-tight", isLocked ? "text-muted-foreground" : theme.title)}>
              {renderBilingualText(title)}
            </span>
            {badge && !isLocked && (
              <Badge variant="secondary" className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25 shadow-2xs">
                {badge}
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-border/60 text-muted-foreground inline-flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Locked
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {isSaved && (
            <span
              title="Section completed"
              className="inline-flex items-center justify-center p-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
            </span>
          )}
          <div className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-transform">
            {isLocked ? <Lock className="w-4 h-4 text-muted-foreground/50" /> : isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {isOpen && !isLocked && (
        <div className="p-4 sm:p-5 pt-2 sm:pt-2 border-t border-border/50 animate-in fade-in-50 duration-200 overflow-visible space-y-4">
          {children}

          {onSaveAndNext && (
            <div className="pt-3 border-t border-border/50 flex items-center justify-end">
              <Button
                type="button"
                onClick={onSaveAndNext}
                className="h-9 sm:h-10 px-5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
              >
                <span>{isLastSection ? "Save Section" : "Save & Next"}</span>
                {!isLastSection && <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable Input Field Wrapper with Bilingual styling and balanced font sizes
function InputWrapper({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13.5px] sm:text-[14px] font-bold text-foreground/90 leading-snug">
        {renderBilingualText(label)}
      </label>
      <div
        className={`[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-border/80 [&>input]:bg-background/90 [&>input]:px-3.5 [&>input]:py-2 [&>input]:text-sm sm:[&>input]:text-[15px] [&>input]:font-medium [&>input]:h-10 sm:[&>input]:h-10 [&>input]:outline-none [&>input]:shadow-2xs [&>input]:transition-all [&>input]:placeholder:text-muted-foreground/50 [&>input]:hover:border-primary/50 [&>input]:focus:border-primary [&>input]:focus:ring-2 [&>input]:focus:ring-primary/20
          ${error ? "[&>input]:border-destructive/90 [&>input]:focus:ring-destructive/20" : ""}`}
      >
        {children}
      </div>
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
    </div>
  );
}
