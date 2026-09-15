"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAdmissionApplication } from "@/lib/data/admission";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { showToast } from "@/components/ui/toast-banner";
import { useSchoolProfile } from "@/lib/utils/school-profile";
import {
  getSavedStudentEntryPresets,
  fetchStudentEntryPresetsFromDb,
} from "@/lib/utils/student-entry-presets";
import {
  Camera,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Check,
  ShieldCheck,
  Lock,
  GraduationCap,
  Calculator,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CLASSES_V_IX = ["V", "VI", "VII", "VIII", "IX"] as const;
const RELIGIONS = ["Islam", "Hinduism", "Christianity", "Buddhism", "Sikhism", "Other"];
const SOCIAL_CATEGORIES = ["General", "SC", "ST", "OBC-A", "OBC-B"];
const BLOOD_GROUPS = [
  { value: "", label: "Select Blood Group (রক্তের গ্রুপ)" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "Unknown", label: "Unknown / Not Tested" },
];

const INCOME_PRESETS = ["₹48,000", "₹60,000", "₹72,000", "₹96,000", "₹1,20,000", "₹1,50,000+"];

const DISABILITY_TYPES = [
  "Locomotor (শারীরিক প্রতিবন্ধী)",
  "Visual Impairment (দৃষ্টি প্রতিবন্ধী)",
  "Hearing Impairment (শ্রবণ প্রতিবন্ধী)",
  "Speech and Language (বাক প্রতিবন্ধী)",
  "Intellectual Disability (বুদ্ধিবৃত্তিক)",
  "Multiple Disabilities (একাধিক প্রতিবন্ধী)",
  "Other (অন্যান্য)",
];

const QUALIFICATIONS = [
  "Below 10th (মাধ্যমিকের নিচে)",
  "10th / Madhyamik Pass (মাধ্যমিক পাস)",
  "12th / H.S. Pass (উচ্চমাধ্যমিক পাস)",
  "Graduate (স্নাতক)",
  "Post Graduate (স্নাতকোত্তর)",
  "Illiterate (নিরক্ষর)",
];

const STREAM_ELECTIVES: Record<"Arts" | "Science" | "Commerce", string[]> = {
  Arts: [
    "History (ইতিহাস)",
    "Geography (ভূগোল)",
    "Political Science (রাষ্ট্রবিজ্ঞান)",
    "Philosophy (দর্শন)",
    "Sanskrit (সংস্কৃত)",
    "Education (শিক্ষাবিজ্ঞান)",
    "Sociology (সমাজতত্ত্ব)",
    "Computer Application",
  ],
  Science: [
    "Physics (পদার্থবিদ্যা)",
    "Chemistry (রসায়ন)",
    "Mathematics (গণিত)",
    "Biological Sciences (জীববিজ্ঞান)",
    "Computer Science",
    "Nutrition (পুষ্টিবিজ্ঞান)",
  ],
  Commerce: [
    "Accountancy (হিসাববিজ্ঞান)",
    "Business Studies (কারবার শিক্ষা)",
    "Economics (অর্থনীতি)",
    "Costing & Taxation",
    "Commercial Law",
    "Computer Application",
  ],
};

export function ApplyPageContent({
  aiExtractedData,
  scannedImageUrl,
}: {
  aiExtractedData?: Record<string, any>;
  scannedImageUrl?: string;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type"); // 'v-ix' or 'xi'
  const { profile: schoolProfile } = useSchoolProfile();

  // Selected Category: "v-ix" (5 to 9) vs "xi" (11)
  const [selectedCategory, setSelectedCategory] = useState<"v-ix" | "xi">(
    initialType === "xi" ? "xi" : "v-ix"
  );

  // ==========================================
  // SECTION A: BASIC INFORMATION (মৌলিক তথ্য)
  // ==========================================
  const [nameEng, setNameEng] = useState<string>("");
  const [nameBen, setNameBen] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [birthRegNo, setBirthRegNo] = useState<string>("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "TRANSGENDER">("MALE");
  const [socialCategory, setSocialCategory] = useState<string>("General");
  const [religion, setReligion] = useState<string>(() => {
    const p = getSavedStudentEntryPresets();
    return p.defaultReligion && p.defaultReligion !== "None" ? p.defaultReligion : "Islam";
  });
  const [motherTongue, setMotherTongue] = useState<string>("Bengali");
  const [nationality, setNationality] = useState<string>("Indian");
  const [aadhaarNo, setAadhaarNo] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [healthId, setHealthId] = useState<string>("");
  const [identificationMark, setIdentificationMark] = useState<string>("");

  // ==========================================
  // SECTION B: EDUCATIONAL INFORMATION - V to IX
  // ==========================================
  const [presentClass, setPresentClass] = useState<string>("V");
  const [presentSection, setPresentSection] = useState<string>("A");
  const [presentRoll, setPresentRoll] = useState<string>("");
  const [presentStream, setPresentStream] = useState<string>("General");

  const [previousClass, setPreviousClass] = useState<string>("IV");
  const [previousSection, setPreviousSection] = useState<string>("");
  const [previousRoll, setPreviousRoll] = useState<string>("");
  const [previousStream, setPreviousStream] = useState<string>("General");
  const [medium, setMedium] = useState<string>("Bengali");
  const [attendanceDays, setAttendanceDays] = useState<string>("");

  // ==========================================
  // SECTION B: EDUCATIONAL INFORMATION - Class XI
  // ==========================================
  const [previousSchoolNameXI, setPreviousSchoolNameXI] = useState<string>("");
  const [streamXI, setStreamXI] = useState<"Arts" | "Science" | "Commerce">("Arts");
  const [selectedElectives, setSelectedElectives] = useState<string[]>([]);
  const [customElectivesText, setCustomElectivesText] = useState<string>("");

  // The 7 Standard Madhyamik Marks
  const [bengMarks, setBengMarks] = useState<string>("");
  const [engMarks, setEngMarks] = useState<string>("");
  const [mathMarks, setMathMarks] = useState<string>("");
  const [lscMarks, setLscMarks] = useState<string>("");
  const [pscMarks, setPscMarks] = useState<string>("");
  const [histMarks, setHistMarks] = useState<string>("");
  const [geoMarks, setGeoMarks] = useState<string>("");

  // Total Marks & Percentage (With Live Auto-Calculator)
  const [marksObtained, setMarksObtained] = useState<string>("");
  const [percentage, setPercentage] = useState<string>("");
  const [isAutoCalc, setIsAutoCalc] = useState<boolean>(true);

  // Live Auto-Calculate Marks & Percentage for Class XI
  useEffect(() => {
    if (!isAutoCalc) return;
    const b = parseFloat(bengMarks) || 0;
    const e = parseFloat(engMarks) || 0;
    const m = parseFloat(mathMarks) || 0;
    const l = parseFloat(lscMarks) || 0;
    const p = parseFloat(pscMarks) || 0;
    const h = parseFloat(histMarks) || 0;
    const g = parseFloat(geoMarks) || 0;

    const enteredCount = [bengMarks, engMarks, mathMarks, lscMarks, pscMarks, histMarks, geoMarks].filter(
      (val) => val.trim() !== ""
    ).length;

    if (enteredCount > 0) {
      const sum = b + e + m + l + p + h + g;
      setMarksObtained(String(sum));
      const pct = (sum / 7).toFixed(1);
      setPercentage(pct);
    }
  }, [bengMarks, engMarks, mathMarks, lscMarks, pscMarks, histMarks, geoMarks, isAutoCalc]);

  // ==========================================
  // SECTION C: CONTACT INFORMATION (ছাত্রের ঠিকানা)
  // ==========================================
  const [village, setVillage] = useState<string>("");
  const [locality, setLocality] = useState<string>("");
  const [district, setDistrict] = useState<string>(() => {
    return schoolProfile?.district || "South 24 Parganas";
  });
  const [blockMunicipality, setBlockMunicipality] = useState<string>("");
  const [panchayat, setPanchayat] = useState<string>("");
  const [postOffice, setPostOffice] = useState<string>("");
  const [policeStation, setPoliceStation] = useState<string>(() => {
    return schoolProfile?.policeStation || "Mathurapur";
  });
  const [pinCode, setPinCode] = useState<string>(() => {
    return schoolProfile?.pincode || "743349";
  });
  const [contactNo, setContactNo] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // ==========================================
  // SECTION D: BANK DETAILS (ব্যাংক একাউন্ট তথ্য)
  // ==========================================
  const [bankName, setBankName] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [ifsc, setIfsc] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");

  // ==========================================
  // SECTION E: GUARDIAN'S DETAILS (অভিভাবকের বিবরণ)
  // ==========================================
  const [fatherNameEng, setFatherNameEng] = useState<string>("");
  const [fatherNameBen, setFatherNameBen] = useState<string>("");
  const [motherNameEng, setMotherNameEng] = useState<string>("");
  const [motherNameBen, setMotherNameBen] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("Father");
  const [guardianNameEng, setGuardianNameEng] = useState<string>("");
  const [guardianNameBen, setGuardianNameBen] = useState<string>("");
  const [annualIncome, setAnnualIncome] = useState<string>("₹60,000");
  const [guardianQualification, setGuardianQualification] = useState<string>("");

  // ==========================================
  // SECTION F: GUARDIAN'S CONTACT INFORMATION
  // ==========================================
  const [sameAsStudentAddress, setSameAsStudentAddress] = useState<boolean>(true);
  const [gVillage, setGVillage] = useState<string>("");
  const [gLocality, setGLocality] = useState<string>("");
  const [gDistrict, setGDistrict] = useState<string>("");
  const [gBlockMunicipality, setGBlockMunicipality] = useState<string>("");
  const [gPanchayat, setGPanchayat] = useState<string>("");
  const [gPostOffice, setGPostOffice] = useState<string>("");
  const [gPoliceStation, setGPoliceStation] = useState<string>("");
  const [gPinCode, setGPinCode] = useState<string>("");
  const [gContactNo, setGContactNo] = useState<string>("");
  const [gEmail, setGEmail] = useState<string>("");

  // ==========================================
  // SECTION G: OTHER INFORMATION (BPL ও CWSN)
  // ==========================================
  const [bplStatus, setBplStatus] = useState<"YES" | "NO">("NO");
  const [bplNo, setBplNo] = useState<string>("");
  const [cwsnStatus, setCwsnStatus] = useState<"YES" | "NO">("NO");
  const [disabilityType, setDisabilityType] = useState<string>("");

  // Populate from AI Extracted Data
  useEffect(() => {
    if (!aiExtractedData || Object.keys(aiExtractedData).length === 0) return;
    const ext = aiExtractedData;
    if (ext.studentName) setNameEng(ext.studentName);
    if (ext.gender) {
      if (ext.gender.toUpperCase() === "MALE" || ext.gender === "Male") setGender("MALE");
      if (ext.gender.toUpperCase() === "FEMALE" || ext.gender === "Female") setGender("FEMALE");
    }
    if (ext.dob) setDob(ext.dob);
    if (ext.targetClass) {
      if (ext.targetClass === "XI") {
        setSelectedCategory("xi");
        setPresentClass("XI");
      } else {
        setSelectedCategory("v-ix");
        handlePresentClassChange(ext.targetClass);
      }
    }
    if (ext.fatherName) {
      setFatherNameEng(ext.fatherName);
      if (relationship === "Father") setGuardianNameEng(ext.fatherName);
    }
    if (ext.motherName) {
      setMotherNameEng(ext.motherName);
      if (relationship === "Mother") setGuardianNameEng(ext.motherName);
    }
    if (ext.guardianName) setGuardianNameEng(ext.guardianName);
    if (ext.studentContact) setContactNo(ext.studentContact);
    if (ext.altMobile) setGContactNo(ext.altMobile);
    if (ext.aadhaar) handleAadhaarChange(ext.aadhaar);
    if (ext.village) setVillage(ext.village);
    if (ext.postOffice) setPostOffice(ext.postOffice);
    if (ext.policeStation) setPoliceStation(ext.policeStation);
    if (ext.district) setDistrict(ext.district);
    if (ext.pincode) setPinCode(ext.pincode);
    if (ext.religion) setReligion(ext.religion);
    if (ext.socialCategory) setSocialCategory(ext.socialCategory);
    if (ext.bloodGroup) setBloodGroup(ext.bloodGroup);
    if (ext.previousSchool) {
      setPreviousSchoolNameXI(ext.previousSchool);
      // In V-IX, there's no state for previous school name right now? Wait, V-IX has previous school in API but maybe not state?
    }
    if (ext.previousClass) setPreviousClass(ext.previousClass);
    if (ext.previousRoll) setPreviousRoll(ext.previousRoll);
  }, [aiExtractedData]);

  // Sync profile defaults when loaded
  useEffect(() => {
    fetchStudentEntryPresetsFromDb().then((p) => {
      if (p.defaultReligion && p.defaultReligion !== "None") {
        setReligion(p.defaultReligion);
      }
    });
  }, []);

  // Sync school profile details
  useEffect(() => {
    if (schoolProfile) {
      if (schoolProfile.district && !district) setDistrict(schoolProfile.district);
      if (schoolProfile.pincode && !pinCode) setPinCode(schoolProfile.pincode);
      if (schoolProfile.policeStation && !policeStation) setPoliceStation(schoolProfile.policeStation);
    }
  }, [schoolProfile]);

  // Handle Class change for V-IX: auto set previous class
  const handlePresentClassChange = (cls: string) => {
    setPresentClass(cls);
    const mapping: Record<string, string> = {
      V: "IV",
      VI: "V",
      VII: "VI",
      VIII: "VII",
      IX: "VIII",
    };
    if (mapping[cls]) {
      setPreviousClass(mapping[cls]);
    }
  };

  // Helper: auto-capitalize words in English names
  const toTitleCase = (str: string) => {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Helper: Aadhaar auto-spacing (XXXX XXXX XXXX)
  const handleAadhaarChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    setAadhaarNo(parts.join(" "));
  };

  // Helper: Relationship selector auto-sync
  const handleRelationshipSelect = (rel: string) => {
    setRelationship(rel);
    if (rel === "Father") {
      setGuardianNameEng(fatherNameEng);
      setGuardianNameBen(fatherNameBen);
    } else if (rel === "Mother") {
      setGuardianNameEng(motherNameEng);
      setGuardianNameBen(motherNameBen);
    }
  };

  const handleFatherNameChange = (val: string) => {
    const capitalized = toTitleCase(val);
    setFatherNameEng(capitalized);
    if (relationship === "Father") {
      setGuardianNameEng(capitalized);
    }
  };

  const handleFatherNameBenChange = (val: string) => {
    setFatherNameBen(val);
    if (relationship === "Father") {
      setGuardianNameBen(val);
    }
  };

  const handleMotherNameChange = (val: string) => {
    const capitalized = toTitleCase(val);
    setMotherNameEng(capitalized);
    if (relationship === "Mother") {
      setGuardianNameEng(capitalized);
    }
  };

  const handleMotherNameBenChange = (val: string) => {
    setMotherNameBen(val);
    if (relationship === "Mother") {
      setGuardianNameBen(val);
    }
  };

  // Toggle Elective subject selection
  const handleToggleElective = (sub: string) => {
    setSelectedElectives((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  // Effective Guardian Contact
  const effectiveGuardianAddress = sameAsStudentAddress
    ? {
        village,
        locality,
        district,
        blockMunicipality,
        panchayat,
        postOffice,
        policeStation,
        pinCode,
        contactNo,
        email,
      }
    : {
        village: gVillage,
        locality: gLocality,
        district: gDistrict,
        blockMunicipality: gBlockMunicipality,
        panchayat: gPanchayat,
        postOffice: gPostOffice,
        policeStation: gPoliceStation,
        pinCode: gPinCode,
        contactNo: gContactNo,
        email: gEmail,
      };

  // Mutation to create application
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createAdmissionApplication,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      showToast("আবেদন সফলভাবে গৃহীত হয়েছে! রসিদ তৈরি হচ্ছে...", "success");
      router.push(`/admission/receipt/${data.id}`);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to submit application. Please check required fields.", "error");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanName = nameEng.trim();
    if (!cleanName) {
      showToast("দয়া করে ছাত্র-ছাত্রীর ইংরেজি নাম লিখুন (Student Name is required)", "error");
      return;
    }
    if (!fatherNameEng.trim() && !guardianNameEng.trim()) {
      showToast("দয়া করে পিতার বা অভিভাবকের নাম লিখুন (Father/Guardian Name is required)", "error");
      return;
    }
    if (!contactNo.trim()) {
      showToast("দয়া করে মোবাইল নম্বর লিখুন (Contact Number is required)", "error");
      return;
    }
    if (!village.trim()) {
      showToast("দয়া করে গ্রাম বা ঠিকানা লিখুন (Village / Address is required)", "error");
      return;
    }

    const isClassXI = selectedCategory === "xi";
    const targetClassFinal = isClassXI ? "XI" : presentClass;

    // Build Electives String for Class XI
    const combinedElectives = [
      ...selectedElectives,
      ...(customElectivesText.trim() ? [customElectivesText.trim()] : []),
    ].join(", ");

    // Structured JSON data matching official schema
    const structuredData = isClassXI
      ? {
          formNo: `ONLINE-XI-${Date.now().toString().slice(-6)}`,
          academicYear: "2026",
          officeUse: {
            doa: "",
            slNo: "",
            class: "XI",
            sec: "A",
            rollNo: "",
          },
          basicInfo: {
            nameEng: cleanName,
            nameBen: nameBen.trim(),
            dob,
            birthRegNo: birthRegNo.trim(),
            gender,
            socialCategory,
            religion,
            motherTongue,
            nationality,
            aadhaarNo: aadhaarNo.replace(/\s/g, ""),
            bloodGroup,
            studentId: studentId.trim(),
            healthId: healthId.trim(),
            identificationMark: identificationMark.trim(),
          },
          educationalInfo: {
            previousSchoolName: previousSchoolNameXI.trim(),
            marksObtained: marksObtained.trim(),
            percentage: percentage.trim(),
            bengMarks: bengMarks.trim(),
            engMarks: engMarks.trim(),
            mathMarks: mathMarks.trim(),
            lscMarks: lscMarks.trim(),
            pscMarks: pscMarks.trim(),
            histMarks: histMarks.trim(),
            geoMarks: geoMarks.trim(),
            stream: streamXI,
            electives: combinedElectives,
          },
          contactInfo: {
            village: village.trim(),
            locality: locality.trim(),
            district: district.trim(),
            blockMunicipality: blockMunicipality.trim(),
            panchayat: panchayat.trim(),
            postOffice: postOffice.trim(),
            policeStation: policeStation.trim(),
            pinCode: pinCode.trim(),
            contactNo: contactNo.trim(),
            email: email.trim(),
          },
          bankDetails: {
            bankName: bankName.trim(),
            branch: branch.trim(),
            ifsc: ifsc.trim().toUpperCase(),
            accountNumber: accountNumber.trim(),
          },
          guardianDetails: {
            fatherNameEng: fatherNameEng.trim(),
            fatherNameBen: fatherNameBen.trim(),
            motherNameEng: motherNameEng.trim(),
            motherNameBen: motherNameBen.trim(),
            guardianNameEng: (guardianNameEng || fatherNameEng).trim(),
            guardianNameBen: (guardianNameBen || fatherNameBen).trim(),
            relationship,
            annualIncome,
            guardianQualification,
          },
          guardianContact: effectiveGuardianAddress,
          otherInfo: {
            bplStatus,
            bplNo: bplStatus === "YES" ? bplNo.trim() : "",
            cwsnStatus,
            disabilityType: cwsnStatus === "YES" ? disabilityType.trim() : "",
          },
        }
      : {
          formNo: `ONLINE-V-IX-${Date.now().toString().slice(-6)}`,
          academicYear: "2026",
          officeUse: {
            slNo: "",
            class: targetClassFinal,
            sec: presentSection,
            rollNo: presentRoll,
          },
          basicInfo: {
            nameEng: cleanName,
            nameBen: nameBen.trim(),
            dob,
            birthRegNo: birthRegNo.trim(),
            gender,
            socialCategory,
            religion,
            motherTongue,
            nationality,
            aadhaarNo: aadhaarNo.replace(/\s/g, ""),
            bloodGroup,
            studentId: studentId.trim(),
            healthId: healthId.trim(),
            identificationMark: identificationMark.trim(),
          },
          educationalInfo: {
            presentClass: targetClassFinal,
            presentSection,
            presentRoll,
            presentStream,
            previousClass,
            previousSection,
            previousRoll,
            previousStream,
            medium,
            attendanceDays,
          },
          contactInfo: {
            village: village.trim(),
            locality: locality.trim(),
            district: district.trim(),
            blockMunicipality: blockMunicipality.trim(),
            panchayat: panchayat.trim(),
            postOffice: postOffice.trim(),
            policeStation: policeStation.trim(),
            pinCode: pinCode.trim(),
            contactNo: contactNo.trim(),
            email: email.trim(),
          },
          bankDetails: {
            bankName: bankName.trim(),
            branch: branch.trim(),
            ifsc: ifsc.trim().toUpperCase(),
            accountNumber: accountNumber.trim(),
          },
          guardianDetails: {
            fatherNameEng: fatherNameEng.trim(),
            fatherNameBen: fatherNameBen.trim(),
            motherNameEng: motherNameEng.trim(),
            motherNameBen: motherNameBen.trim(),
            guardianNameEng: (guardianNameEng || fatherNameEng).trim(),
            guardianNameBen: (guardianNameBen || fatherNameBen).trim(),
            relationship,
            annualIncome,
            guardianQualification,
          },
          guardianContact: effectiveGuardianAddress,
          otherInfo: {
            bplStatus,
            bplNo: bplStatus === "YES" ? bplNo.trim() : "",
            cwsnStatus,
            disabilityType: cwsnStatus === "YES" ? disabilityType.trim() : "",
          },
        };

    const finalMarksString = isClassXI
      ? `Madhyamik: ${marksObtained}/700 (${percentage}%) [B:${bengMarks||0}, E:${engMarks||0}, M:${mathMarks||0}, LS:${lscMarks||0}, PS:${pscMarks||0}, H:${histMarks||0}, G:${geoMarks||0}] | Stream: ${streamXI} | Subjects: ${combinedElectives}`
      : previousRoll
      ? `Class ${previousClass} - Roll: ${previousRoll}`
      : `Class ${previousClass}`;

    mutation.mutate({
      studentName: cleanName,
      targetClass: targetClassFinal,
      targetSection: isClassXI ? "A" : presentSection || "A",
      targetRoll: isClassXI ? undefined : presentRoll ? parseInt(presentRoll) : undefined,
      gender: gender === "MALE" ? "Male" : gender === "FEMALE" ? "Female" : "Other",
      dob,
      fatherName: fatherNameEng.trim(),
      motherName: motherNameEng.trim(),
      guardianName: (guardianNameEng || fatherNameEng).trim(),
      studentContact: contactNo.trim(),
      altMobile: effectiveGuardianAddress.contactNo || undefined,
      email: email.trim() || undefined,
      address: `${village.trim()}${locality ? `, ${locality.trim()}` : ""}`,
      village: village.trim(),
      postOffice: postOffice.trim(),
      policeStation: policeStation.trim(),
      district: district.trim(),
      pincode: pinCode.trim(),
      religion,
      socialCategory,
      aadhaar: aadhaarNo.replace(/\s/g, ""),
      bloodGroup,
      previousSchool: isClassXI ? previousSchoolNameXI.trim() : undefined,
      previousClass: isClassXI ? "10th / Madhyamik" : previousClass,
      previousRoll: isClassXI ? undefined : previousRoll,
      previousMarks: finalMarksString,
      admissionType: "new",
      formMethod: "online",
      aiExtractedData: structuredData,
      scannedImageUrl,
    });
  }

  const schoolName = schoolProfile?.schoolName || "MARIGACHI HIGH SCHOOL (H.S.)";
  const schoolAddress = schoolProfile?.schoolAddress || "Vill & P.O - Marigachi, P.S - Baduria, North 24 Parganas";

  return (
    <div className="py-6 px-3 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Official School Branding Header */}
      <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs text-center relative overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-2xs">
            <GraduationCap className="h-9 w-9" />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              Official Student Registration • Session 2026–2027
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground mt-0.5">
              {schoolName}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl mx-auto">
              {schoolAddress}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Public Student Admission Portal</span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" />
              SSL Encrypted
            </span>
          </div>
        </div>
      </div>

      {scannedImageUrl && (
        <div className="bg-card border-2 border-emerald-500/20 rounded-3xl p-5 shadow-xs flex flex-col items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 uppercase tracking-wider">
            <Camera className="w-4 h-4" />
            <span>AI Scanned Document Preview</span>
          </div>
          <img src={scannedImageUrl} alt="Scanned Form" className="w-full max-w-lg h-auto max-h-80 object-contain rounded-xl border shadow-inner" />
          <p className="text-[11px] text-muted-foreground mt-2 text-center max-w-md">
            Review the extracted information against the original document below. Please correct any AI misinterpretations manually.
          </p>
        </div>
      )}

      {/* TWO SELECTION BOXES (CLASS 5 TO 9 & CLASS 11) */}
      <div className="space-y-3">
        <div className="text-center">
          <h2 className="text-base sm:text-lg font-black text-foreground">
            Select Admission Class / ভর্তির শ্রেণি নির্বাচন করুন
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose the class category to fill out the official application form
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* BOX 1: CLASS V TO IX */}
          <button
            type="button"
            onClick={() => setSelectedCategory("v-ix")}
            className={cn(
              "rounded-3xl p-5 sm:p-6 border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group text-left",
              selectedCategory === "v-ix"
                ? "border-emerald-500 bg-emerald-500/[0.08] shadow-md ring-2 ring-emerald-500/20"
                : "border-border bg-card hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] hover:shadow-xs"
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center font-bold shrink-0 transition-colors",
                  selectedCategory === "v-ix"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/25"
                )}
              >
                <BookOpen className="h-6 w-6" />
              </div>

              {selectedCategory === "v-ix" ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-600 text-white shadow-2xs">
                  <Check className="h-3.5 w-3.5" />
                  Selected
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-muted text-muted-foreground border">
                  Click to Apply
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground mb-0.5">
                Class V – IX (পঞ্চম – নবম শ্রেণি)
              </h3>
              <p className="text-xs text-muted-foreground mb-2.5 font-medium">
                Official Secondary School Form (Class 5, 6, 7, 8 &amp; 9)
              </p>

              <div className="flex flex-wrap gap-1.5">
                {CLASSES_V_IX.map((cls) => (
                  <span
                    key={cls}
                    className={cn(
                      "px-2.5 py-0.5 rounded-lg text-[11px] font-bold",
                      selectedCategory === "v-ix" && presentClass === cls
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-foreground border border-border/70"
                    )}
                  >
                    Class {cls}
                  </span>
                ))}
              </div>
            </div>
          </button>

          {/* BOX 2: CLASS XI */}
          <button
            type="button"
            onClick={() => setSelectedCategory("xi")}
            className={cn(
              "rounded-3xl p-5 sm:p-6 border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group text-left",
              selectedCategory === "xi"
                ? "border-purple-500 bg-purple-500/[0.08] shadow-md ring-2 ring-purple-500/20"
                : "border-border bg-card hover:border-purple-500/50 hover:bg-purple-500/[0.02] hover:shadow-xs"
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center font-bold shrink-0 transition-colors",
                  selectedCategory === "xi"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/25"
                )}
              >
                <Sparkles className="h-6 w-6" />
              </div>

              {selectedCategory === "xi" ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-purple-600 text-white shadow-2xs">
                  <Check className="h-3.5 w-3.5" />
                  Selected
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-muted text-muted-foreground border">
                  Click to Apply
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground mb-0.5">
                Class XI (একাদশ শ্রেণি)
              </h3>
              <p className="text-xs text-muted-foreground mb-2.5 font-medium">
                Official Higher Secondary Form with Madhyamik Marks &amp; Streams
              </p>

              <div className="flex flex-wrap gap-1.5">
                {["Arts", "Science", "Commerce"].map((st) => (
                  <span
                    key={st}
                    className={cn(
                      "px-2.5 py-0.5 rounded-lg text-[11px] font-bold",
                      selectedCategory === "xi" && streamXI === st
                        ? "bg-purple-600 text-white"
                        : "bg-muted text-foreground border border-border/70"
                    )}
                  >
                    {st} Stream
                  </span>
                ))}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* FORM CONTAINER */}
      <form onSubmit={handleSubmit} className="space-y-6 pt-1">
        {/* ======================================================== */}
        {/* SECTION A: BASIC INFORMATION (COMMON TO BOTH 5-9 & 11)   */}
        {/* ======================================================== */}
        <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
              <span
                className={cn(
                  "h-6 w-6 rounded-lg flex items-center justify-center text-xs font-black",
                  selectedCategory === "xi"
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    : "bg-primary/10 text-primary"
                )}
              >
                A
              </span>
              <span>A. BASIC INFORMATION: (মৌলিক তথ্য)</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Section A
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* 1. Name (English) */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                1. Name / নাম (in English Capital Letters) *
              </label>
              <Input
                placeholder="e.g. RAHUL MONDAL"
                value={nameEng}
                onChange={(e) => setNameEng(e.target.value.toUpperCase())}
                className="h-9 text-xs rounded-xl font-medium"
              />
            </div>

            {/* 2. নাম (Bengali) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                2. নাম (বাংলায়)
              </label>
              <Input
                placeholder="বাংলায় নাম লিখুন (ঐচ্ছিক)"
                value={nameBen}
                onChange={(e) => setNameBen(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 3. DOB */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                3. Date of Birth (DOB) / জন্মতারিখ *
              </label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 4. Birth Regn. No */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                4. Birth Regn. No / জন্ম নিবন্ধন নং
              </label>
              <Input
                placeholder="e.g. 20101912..."
                value={birthRegNo}
                onChange={(e) => setBirthRegNo(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 5. Gender */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                5. Gender / লিঙ্গ *
              </label>
              <div className="grid grid-cols-3 gap-1.5 h-9">
                {(["MALE", "FEMALE", "TRANSGENDER"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={cn(
                      "rounded-xl border text-[11px] font-bold transition-all cursor-pointer",
                      gender === g
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 hover:bg-muted text-foreground"
                    )}
                  >
                    {g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : "Trans"}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Social Category */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                6. Social Category / জাতিগত শ্রেণি *
              </label>
              <CustomSelect
                value={socialCategory}
                onChange={setSocialCategory}
                options={SOCIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </div>

            {/* 7. Religion */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                7. Religion / ধর্ম *
              </label>
              <CustomSelect
                value={religion}
                onChange={setReligion}
                options={RELIGIONS.map((r) => ({ value: r, label: r }))}
              />
            </div>

            {/* 8. Mother Tongue */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                8. Mother Tongue / মাতৃভাষা *
              </label>
              <Input
                value={motherTongue}
                onChange={(e) => setMotherTongue(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 9. Nationality */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                9. Nationality / জাতীয়তা *
              </label>
              <Input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 10. Aadhaar No */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  10. Aadhaar No / আধার কার্ড নং
                </label>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {aadhaarNo.replace(/\s/g, "").length}/12
                </span>
              </div>
              <Input
                placeholder="12-digit Aadhaar (xxxx xxxx xxxx)"
                value={aadhaarNo}
                onChange={(e) => handleAadhaarChange(e.target.value)}
                maxLength={14}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            {/* 11. Blood Group */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                11. Blood Group / রক্তের গ্রুপ
              </label>
              <CustomSelect
                value={bloodGroup}
                onChange={setBloodGroup}
                options={BLOOD_GROUPS}
              />
            </div>

            {/* 12. Student ID */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                12. Student ID* (Banglar Shiksha ID)
              </label>
              <Input
                placeholder="e.g. 191107... (যদি থাকে)"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 13. Health ID */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                13. Health ID (ABHA ID)
              </label>
              <Input
                placeholder="Health ID (ঐচ্ছিক)"
                value={healthId}
                onChange={(e) => setHealthId(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 14. Identification Mark */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                14. Identification Mark / শনাক্তকরণ চিহ্ন
              </label>
              <Input
                placeholder="e.g. Mole on right cheek / ডান গালে তিল"
                value={identificationMark}
                onChange={(e) => setIdentificationMark(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION B: EDUCATIONAL INFORMATION                       */}
        {/* ======================================================== */}

        {/* --- IF CLASS V TO IX IS SELECTED --- */}
        {selectedCategory === "v-ix" && (
          <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
                <span className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">
                  B
                </span>
                <span>B. EDUCATIONAL INFORMATION: (শিক্ষা সংক্রান্ত তথ্য)</span>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Section B
              </span>
            </div>

            {/* 1. Present Class Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                1. Present Class (ভর্তির কাঙ্ক্ষিত শ্রেণি) *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {CLASSES_V_IX.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => handlePresentClassChange(cls)}
                    className={cn(
                      "py-2.5 rounded-2xl border text-xs sm:text-sm font-black transition-all cursor-pointer text-center",
                      presentClass === cls
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-foreground border-border"
                    )}
                  >
                    Class {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
              {/* 2. Section */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  2. Section / বিভাগ
                </label>
                <Input
                  placeholder="A / B / C"
                  value={presentSection}
                  onChange={(e) => setPresentSection(e.target.value.toUpperCase())}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* 3. Roll No */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  3. Roll No / রোল নং
                </label>
                <Input
                  placeholder="Roll No (যদি জানা থাকে)"
                  value={presentRoll}
                  onChange={(e) => setPresentRoll(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* 4. Stream */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  4. Stream / ধারা
                </label>
                <Input
                  disabled
                  value="General"
                  className="h-9 text-xs rounded-xl bg-muted/60"
                />
              </div>

              {/* 5. Previous Class */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  5. Previous Class / পূর্ববর্তী শ্রেণি *
                </label>
                <Input
                  placeholder="e.g. IV, V, VI, VII, VIII"
                  value={previousClass}
                  onChange={(e) => setPreviousClass(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* 6. Previous Section */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  6. Previous Section / বিভাগ
                </label>
                <Input
                  placeholder="Previous Section"
                  value={previousSection}
                  onChange={(e) => setPreviousSection(e.target.value.toUpperCase())}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* 7. Previous Roll */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  7. Previous Roll / পূর্বের রোল নং
                </label>
                <Input
                  placeholder="Previous Roll No"
                  value={previousRoll}
                  onChange={(e) => setPreviousRoll(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* 8. Previous Stream */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  8. Previous Stream
                </label>
                <Input
                  value={previousStream}
                  onChange={(e) => setPreviousStream(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* 9. Medium */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  9. Medium / মাধ্যম *
                </label>
                <Input
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* 10. No of days child attend school */}
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  10. No of Days Attended School
                </label>
                <Input
                  placeholder="উপস্থিতির দিন সংখ্যা"
                  value={attendanceDays}
                  onChange={(e) => setAttendanceDays(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- IF CLASS XI IS SELECTED (OFFICIAL FORM B DETAILS) --- */}
        {selectedCategory === "xi" && (
          <div className="bg-card border-2 border-purple-500/25 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-purple-500/15 pb-3">
              <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
                <span className="h-6 w-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-black">
                  B
                </span>
                <span>B. EDUCATIONAL INFORMATION: (একাদশ শ্রেণির শিক্ষা তথ্য)</span>
              </div>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                Class XI Official
              </span>
            </div>

            {/* Academic Stream Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                Select Academic Stream / উচ্চমাধ্যমিক শাখা নির্বাচন করুন *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["Arts", "Science", "Commerce"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStreamXI(st);
                      setSelectedElectives([]);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-xs sm:text-sm font-black transition-all cursor-pointer text-center",
                      streamXI === st
                        ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                        : "border-border bg-muted/40 hover:bg-muted text-foreground"
                    )}
                  >
                    {st} Stream
                  </button>
                ))}
              </div>
            </div>

            {/* 1. School Name (Previous Madhyamik School) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                1. School Name : (যে স্কুল থেকে মাধ্যমিক পাস করেছেন) *
              </label>
              <Input
                placeholder="Name of last school attended for Madhyamik"
                value={previousSchoolNameXI}
                onChange={(e) => setPreviousSchoolNameXI(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* 7 Standard Madhyamik Subjects Grid (Items 4 to 10) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-foreground block">
                    Madhyamik Subject Marks / মাধ্যমিক পরীক্ষার বিষয়ভিত্তিক নম্বর
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    নিচে বিষয়ভিত্তিক নম্বর লিখুন—মোট নম্বর ও শতকরা হার স্বয়ংক্রিয়ভাবে হিসাব হয়ে যাবে
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg">
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Auto Calculator</span>
                </div>
              </div>

              {/* 7 Box Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {/* 4. Beng */}
                <div className="p-2.5 rounded-2xl border bg-muted/30 text-center space-y-1">
                  <span className="block text-[11px] font-black text-foreground">
                    4. Beng.
                  </span>
                  <span className="text-[9px] text-muted-foreground block">বাংলা</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="নম্বর"
                    value={bengMarks}
                    onChange={(e) => setBengMarks(e.target.value)}
                    className="h-9 text-xs text-center font-bold font-mono rounded-xl bg-card"
                  />
                </div>

                {/* 5. Eng */}
                <div className="p-2.5 rounded-2xl border bg-muted/30 text-center space-y-1">
                  <span className="block text-[11px] font-black text-foreground">
                    5. Eng.
                  </span>
                  <span className="text-[9px] text-muted-foreground block">ইংরেজি</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="নম্বর"
                    value={engMarks}
                    onChange={(e) => setEngMarks(e.target.value)}
                    className="h-9 text-xs text-center font-bold font-mono rounded-xl bg-card"
                  />
                </div>

                {/* 6. Math */}
                <div className="p-2.5 rounded-2xl border bg-muted/30 text-center space-y-1">
                  <span className="block text-[11px] font-black text-foreground">
                    6. Math.
                  </span>
                  <span className="text-[9px] text-muted-foreground block">অঙ্ক</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="নম্বর"
                    value={mathMarks}
                    onChange={(e) => setMathMarks(e.target.value)}
                    className="h-9 text-xs text-center font-bold font-mono rounded-xl bg-card"
                  />
                </div>

                {/* 7. L. Sc. */}
                <div className="p-2.5 rounded-2xl border bg-muted/30 text-center space-y-1">
                  <span className="block text-[11px] font-black text-foreground">
                    7. L. Sc.
                  </span>
                  <span className="text-[9px] text-muted-foreground block">জীবন বিজ্ঞান</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="নম্বর"
                    value={lscMarks}
                    onChange={(e) => setLscMarks(e.target.value)}
                    className="h-9 text-xs text-center font-bold font-mono rounded-xl bg-card"
                  />
                </div>

                {/* 8. P. Sc. */}
                <div className="p-2.5 rounded-2xl border bg-muted/30 text-center space-y-1">
                  <span className="block text-[11px] font-black text-foreground">
                    8. P. Sc.
                  </span>
                  <span className="text-[9px] text-muted-foreground block">ভৌত বিজ্ঞান</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="নম্বর"
                    value={pscMarks}
                    onChange={(e) => setPscMarks(e.target.value)}
                    className="h-9 text-xs text-center font-bold font-mono rounded-xl bg-card"
                  />
                </div>

                {/* 9. Hist */}
                <div className="p-2.5 rounded-2xl border bg-muted/30 text-center space-y-1">
                  <span className="block text-[11px] font-black text-foreground">
                    9. Hist.
                  </span>
                  <span className="text-[9px] text-muted-foreground block">ইতিহাস</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="নম্বর"
                    value={histMarks}
                    onChange={(e) => setHistMarks(e.target.value)}
                    className="h-9 text-xs text-center font-bold font-mono rounded-xl bg-card"
                  />
                </div>

                {/* 10. Geo */}
                <div className="p-2.5 rounded-2xl border bg-muted/30 text-center space-y-1">
                  <span className="block text-[11px] font-black text-foreground">
                    10. Geo.
                  </span>
                  <span className="text-[9px] text-muted-foreground block">ভূগোল</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="নম্বর"
                    value={geoMarks}
                    onChange={(e) => setGeoMarks(e.target.value)}
                    className="h-9 text-xs text-center font-bold font-mono rounded-xl bg-card"
                  />
                </div>
              </div>
            </div>

            {/* 2. Marks Obtained & 3. Percentage (Auto-Calculated Output) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-foreground uppercase">
                    2. Marks Obtained : (মোট প্রাপ্ত নম্বর / ৭০০)
                  </label>
                  {marksObtained && (
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      Auto Calculated
                    </span>
                  )}
                </div>
                <Input
                  placeholder="e.g. 525"
                  value={marksObtained}
                  onChange={(e) => {
                    setIsAutoCalc(false);
                    setMarksObtained(e.target.value);
                  }}
                  className="h-9 text-xs rounded-xl font-bold font-mono bg-card"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-foreground uppercase">
                    3. Percentage : (শতকরা হার %)
                  </label>
                  {percentage && (
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      {percentage}%
                    </span>
                  )}
                </div>
                <Input
                  placeholder="e.g. 75.0"
                  value={percentage}
                  onChange={(e) => {
                    setIsAutoCalc(false);
                    setPercentage(e.target.value);
                  }}
                  className="h-9 text-xs rounded-xl font-bold font-mono bg-card"
                />
              </div>
            </div>

            {/* Elective Subject Combination Selection for Class XI */}
            <div className="space-y-2 pt-1 border-t border-purple-500/15">
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                Elective Subject Combination ({streamXI} শাখা)
              </label>
              <p className="text-[11px] text-muted-foreground">
                যে যে বিষয়গুলি নিতে চান, সেগুলোতে ক্লিক করে সিলেক্ট করুন:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {STREAM_ELECTIVES[streamXI].map((sub) => {
                  const isSel = selectedElectives.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleToggleElective(sub)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border",
                        isSel
                          ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                          : "bg-muted/40 hover:bg-muted text-foreground border-border"
                      )}
                    >
                      {isSel ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      <span>{sub}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5">
                <Input
                  placeholder="অন্য কোনো নির্দিষ্ট বিষয়ের নাম থাকলে এখানে লিখুন (ঐচ্ছিক)"
                  value={customElectivesText}
                  onChange={(e) => setCustomElectivesText(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SECTION C: CONTACT INFORMATION (COMMON)                  */}
        {/* ======================================================== */}
        <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
              <span className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                C
              </span>
              <span>C. CONTACT INFORMATION: (যোগাযোগের ঠিকানা)</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Section C
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* 1. Village */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                1. Village / গ্রাম *
              </label>
              <Input
                placeholder="e.g. Marigachi"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 2. Habitation or Locality */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                2. Habitation or Locality / পাড়া বা এলাকা
              </label>
              <Input
                placeholder="লোকালয় বা পাড়া"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 3. District */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                3. District / জেলা *
              </label>
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 4. Block/Municipality */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                4. Block / Municipality (ব্লক/পৌরসভা) *
              </label>
              <Input
                placeholder="e.g. Mathurapur-I"
                value={blockMunicipality}
                onChange={(e) => setBlockMunicipality(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 5. Panchayat */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                5. Gram Panchayat / পঞ্চায়েত
              </label>
              <Input
                placeholder="গ্রাম পঞ্চায়েত"
                value={panchayat}
                onChange={(e) => setPanchayat(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 6. Post Office */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                6. Post Office (P.O.) / ডাকঘর *
              </label>
              <Input
                placeholder="পোস্ট অফিস"
                value={postOffice}
                onChange={(e) => setPostOffice(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 7. Police Station */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                7. Police Station (P.S.) / থানা *
              </label>
              <Input
                placeholder="থানা"
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 8. Pin Code */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                8. Pin Code / পিন কোড *
              </label>
              <Input
                placeholder="6-digit PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>

            {/* 9. Contact No */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                9. Contact No. (+91) / মোবাইল নং *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">
                  +91
                </span>
                <Input
                  placeholder="10-digit mobile"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  className="h-9 text-xs rounded-xl pl-11 font-mono"
                />
              </div>
            </div>

            {/* 10. Email */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                10. Email Address / ইমেইল (ঐচ্ছিক)
              </label>
              <Input
                type="email"
                placeholder="student.email@example.com (যদি থাকে)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION D: BANK DETAILS (COMMON)                         */}
        {/* ======================================================== */}
        <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
              <span className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-black">
                D
              </span>
              <span>D. BANK DETAILS: (ব্যাংক একাউন্টের তথ্য - স্কলারশিপের জন্য)</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Section D
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Bank Name */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                1. Bank Name / ব্যাংকের নাম
              </label>
              <Input
                placeholder="e.g. State Bank of India / BGVB"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 2. Branch */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                2. Branch / শাখা
              </label>
              <Input
                placeholder="Branch Name"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 3. IFSC */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                3. IFSC Code
              </label>
              <Input
                placeholder="e.g. SBIN0001234"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                className="h-9 text-xs rounded-xl font-mono uppercase"
              />
            </div>

            {/* 4. Account Number */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                4. Account Number / একাউন্ট নং
              </label>
              <Input
                placeholder="Bank Account No"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="h-9 text-xs rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION E: GUARDIAN'S DETAILS (COMMON)                   */}
        {/* ======================================================== */}
        <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
              <span className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">
                E
              </span>
              <span>E. GUARDIAN&apos;S DETAILS: (অভিভাবকের বিবরণ)</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Section E
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Father's Name (English) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                1. Father&apos;s Name (English) *
              </label>
              <Input
                placeholder="Father's Full Name"
                value={fatherNameEng}
                onChange={(e) => handleFatherNameChange(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 2. পিতার নাম (বাংলা) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                2. পিতার নাম (বাংলায়)
              </label>
              <Input
                placeholder="পিতার নাম (বাংলায়)"
                value={fatherNameBen}
                onChange={(e) => handleFatherNameBenChange(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 3. Mother's Name (English) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                3. Mother&apos;s Name (English) *
              </label>
              <Input
                placeholder="Mother's Full Name"
                value={motherNameEng}
                onChange={(e) => handleMotherNameChange(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 4. মাতার নাম (বাংলা) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                4. মাতার নাম (বাংলায়)
              </label>
              <Input
                placeholder="মাতার নাম (বাংলায়)"
                value={motherNameBen}
                onChange={(e) => handleMotherNameBenChange(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* 7. Relationship with Guardian - 1 Click Quick Sync Helper */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-foreground uppercase">
                7. Relationship(with Guardian&apos;s)* / অভিভাবকের সাথে সম্পর্ক *
              </label>
              <span className="text-[10px] text-muted-foreground">
                ১ ক্লিকে পিতা বা মাতার নাম অভিভাবক হিসেবে সেট করুন
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "Father", label: "Father / পিতা" },
                { id: "Mother", label: "Mother / মাতা" },
                { id: "Other", label: "Other / অন্যান্য" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleRelationshipSelect(item.id)}
                  className={cn(
                    "py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border",
                    relationship === item.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-card hover:bg-muted text-foreground border-border"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 5. Guardian's Name (English) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                5. Guardian&apos;s Name* (English) *
              </label>
              <Input
                placeholder="Guardian's Name"
                value={guardianNameEng}
                onChange={(e) => setGuardianNameEng(toTitleCase(e.target.value))}
                className="h-9 text-xs rounded-xl font-medium"
              />
            </div>

            {/* 6. অভিভাবকের নাম (বাংলা) */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                6. অভিভাবকের নাম: (বাংলায়)
              </label>
              <Input
                placeholder="অভিভাবকের নাম (বাংলায়)"
                value={guardianNameBen}
                onChange={(e) => setGuardianNameBen(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 8. Annual Family Income */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                8. Annual Family Income : / বার্ষিক পারিবারিক আয়
              </label>
              <Input
                placeholder="e.g. ₹60,000"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {INCOME_PRESETS.map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setAnnualIncome(inc)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-lg border font-semibold cursor-pointer",
                      annualIncome === inc
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {inc}
                  </button>
                ))}
              </div>
            </div>

            {/* 9. Guardian's Qualification */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                9. Guardian&apos;s Qualification: / শিক্ষাগত যোগ্যতা
              </label>
              <CustomSelect
                value={guardianQualification}
                onChange={setGuardianQualification}
                options={[
                  { value: "", label: "Select Qualification (শিক্ষাগত যোগ্যতা)" },
                  ...QUALIFICATIONS.map((q) => ({ value: q, label: q })),
                ]}
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION F: GUARDIAN'S CONTACT INFORMATION (COMMON)       */}
        {/* ======================================================== */}
        <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
              <span className="h-6 w-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-black">
                F
              </span>
              <span>F. GUARDIAN&apos;S CONTACT INFORMATION: (অভিভাবকের যোগাযোগের ঠিকানা)</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Section F
            </span>
          </div>

          {/* 1-CLICK AUTO FILL SWITCH / CARD */}
          <div
            onClick={() => setSameAsStudentAddress(!sameAsStudentAddress)}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3",
              sameAsStudentAddress
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
                : "border-border bg-muted/40 text-foreground hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                  sameAsStudentAddress
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-muted-foreground bg-card"
                )}
              >
                {sameAsStudentAddress && <Check className="h-3.5 w-3.5" />}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  Same as Student&apos;s Contact Address (ছাত্রের ঠিকানার অনুরূপ)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  টিক দেওয়া থাকলে ছাত্রের ঠিকানা স্বয়ংক্রিয়ভাবে অভিভাবকের ঠিকানা হিসেবে সেট থাকবে
                </p>
              </div>
            </div>

            <span
              className={cn(
                "text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0",
                sameAsStudentAddress
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-card text-muted-foreground"
              )}
            >
              {sameAsStudentAddress ? "Auto Copied ✓" : "Separate Address"}
            </span>
          </div>

          {/* Separate Address Fields if Unchecked */}
          {!sameAsStudentAddress && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  1. Village / গ্রাম
                </label>
                <Input
                  placeholder="Guardian Village"
                  value={gVillage}
                  onChange={(e) => setGVillage(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  2. Habitation or Locality
                </label>
                <Input
                  placeholder="Locality"
                  value={gLocality}
                  onChange={(e) => setGLocality(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  3. District / জেলা
                </label>
                <Input
                  placeholder="District"
                  value={gDistrict}
                  onChange={(e) => setGDistrict(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  4. Block/Municipality*
                </label>
                <Input
                  placeholder="Block / Municipality"
                  value={gBlockMunicipality}
                  onChange={(e) => setGBlockMunicipality(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  5. Panchayat
                </label>
                <Input
                  placeholder="Panchayat"
                  value={gPanchayat}
                  onChange={(e) => setGPanchayat(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  6. Post Office*
                </label>
                <Input
                  placeholder="Post Office"
                  value={gPostOffice}
                  onChange={(e) => setGPostOffice(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  7. Police Station*
                </label>
                <Input
                  placeholder="Police Station"
                  value={gPoliceStation}
                  onChange={(e) => setGPoliceStation(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  8. Pin Code*
                </label>
                <Input
                  placeholder="Pin Code"
                  value={gPinCode}
                  onChange={(e) => setGPinCode(e.target.value)}
                  maxLength={6}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  9. Contact No. +91
                </label>
                <Input
                  placeholder="Guardian Mobile No"
                  value={gContactNo}
                  onChange={(e) => setGContactNo(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">
                  10. Email:
                </label>
                <Input
                  placeholder="Guardian Email"
                  value={gEmail}
                  onChange={(e) => setGEmail(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION G: OTHER INFORMATION (COMMON)                    */}
        {/* ======================================================== */}
        <div className="bg-card border rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-foreground font-black text-sm sm:text-base">
              <span className="h-6 w-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-black">
                G
              </span>
              <span>G. OTHER INFORMATION: (অন্যান্য তথ্য - BPL ও বিশেষ চাহিদা)</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Section G
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 1. BPL Status */}
            <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-foreground block">
                    1. BPL Status : (দারিদ্র্যসীমার নিচে কি?)
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Below Poverty Line (BPL) কার্ড আছে কি না
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(["YES", "NO"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setBplStatus(opt)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border",
                        bplStatus === opt
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-card text-foreground hover:bg-muted"
                      )}
                    >
                      {opt === "YES" ? "YES / হ্যাঁ" : "NO / না"}
                    </button>
                  ))}
                </div>
              </div>

              {bplStatus === "YES" && (
                <div className="pt-2 border-t space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                    If Yes, 2. BPL No: *
                  </label>
                  <Input
                    placeholder="Enter BPL Card Number"
                    value={bplNo}
                    onChange={(e) => setBplNo(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* 3. Children with Special Need (CWSN) */}
            <div className="p-4 rounded-2xl border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-black text-foreground block">
                    3. Children with special need:
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    বিশেষ চাহিদা সম্পন্ন বা প্রতিবন্ধী শিশু কি?
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(["YES", "NO"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCwsnStatus(opt)}
                      className={cn(
                        "px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border",
                        cwsnStatus === opt
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-card text-foreground hover:bg-muted"
                      )}
                    >
                      {opt === "YES" ? "YES / হ্যাঁ" : "NO / না"}
                    </button>
                  ))}
                </div>
              </div>

              {cwsnStatus === "YES" && (
                <div className="pt-2 border-t space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                    If Yes, 4. Type of Disability: *
                  </label>
                  <CustomSelect
                    value={disabilityType}
                    onChange={setDisabilityType}
                    options={[
                      { value: "", label: "Select Disability Type" },
                      ...DISABILITY_TYPES.map((t) => ({ value: t, label: t })),
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SUBMIT BUTTON                                            */}
        {/* ======================================================== */}
        <div className="pt-3 pb-8">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className={cn(
              "w-full py-4 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]",
              selectedCategory === "xi"
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>
              {mutation.isPending
                ? "আবেদন জমা হচ্ছে..."
                : selectedCategory === "xi"
                ? "Submit Class XI Admission Application (একাদশ শ্রেণির আবেদন জমা দিন)"
                : `Submit Class ${presentClass} Admission Application (আবেদন জমা দিন)`}
            </span>
          </Button>
          <p className="text-[11px] text-center text-muted-foreground mt-2">
            আবেদন জমা দেওয়ার সাথে সাথেই অফিসিয়াল ডিজিটাল রসিদ ও ফর্ম নম্বর তৈরি হবে।
          </p>
        </div>
      </form>
    </div>
  );
}

export default function NewAdmissionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-muted-foreground animate-pulse">
          Loading admission portal...
        </div>
      }
    >
      <ApplyPageContent />
    </Suspense>
  );
}
