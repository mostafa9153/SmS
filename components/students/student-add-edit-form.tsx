"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudent } from "@/lib/data/students";
import { ArrowLeft, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import type { Student } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";
import { SchoolIdInput } from "@/components/students/school-id-input";
import { GuardianRelationshipSelect } from "@/components/students/guardian-relationship-select";
import { SmartAddressInput } from "@/components/students/smart-address-input";
import { SmartBankInput } from "@/components/students/smart-bank-input";
import { SmartPreviousSchoolInput } from "@/components/students/smart-previous-school-input";
import { showToast } from "@/components/ui/toast-banner";
import {
  OCCUPATION_OPTIONS,
  MEDIUM_OF_INSTRUCTION_OPTIONS,
  SEMESTER_OPTIONS,
  STUDENT_STATUS_OPTIONS,
} from "@/lib/constants/student-options";
import {
  getSavedStudentEntryPresets,
  fetchStudentEntryPresetsFromDb,
  applyStudentEntryDefaults,
} from "@/lib/utils/student-entry-presets";

const studentSchema = z.object({
  // Identity
  name: z.string().min(2, "Name is required"),
  schoolId: z.string().optional(),
  currentStatus: z.string().optional(),
  dob: z.string().refine((v) => {
    if (!v) return false;
    const d = new Date(v);
    return !isNaN(d.getTime()) && d < new Date();
  }, "Date of birth must be a valid past date"),
  gender: z.enum(["Male", "Female", "Other"]),
  motherTongue: z.string().optional(),
  religion: z.string().optional(),
  indianNationality: z.coerce.boolean().optional(),
  bloodGroup: z.string().optional(),
  heightCm: z.coerce.number().optional().nullable(),
  weightKg: z.coerce.number().optional().nullable(),
  birthRegistrationNo: z.string().optional(),
  identificationMark: z.string().optional(),

  // Social & Categories
  socialCategory: z.string().optional(),
  casteCertificateNo: z.string().optional(),
  minorityGroup: z.string().optional(),
  isAay: z.coerce.boolean().optional(),
  isEws: z.coerce.boolean().optional(),
  isOutOfSchool: z.coerce.boolean().optional(),
  mainstreamedDate: z.string().optional(),

  // CWSN
  isCwsn: z.coerce.boolean().optional(),
  impairmentType: z.string().optional(),
  hasDisabilityCertificate: z.coerce.boolean().optional(),
  disabilityPercentage: z.coerce.number().optional().nullable(),
  sldType: z.string().optional(),

  // Family Info
  fatherName: z.string().min(2, "Father's name is required"),
  fatherOccupation: z.string().optional(),
  motherName: z.string().min(2, "Mother's name is required"),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  relationshipWithGuardian: z.string().optional(),
  guardianOccupation: z.string().optional(),
  guardianQualification: z.string().optional(),
  annualFamilyIncome: z.coerce.number().optional().nullable(),

  // Contact
  studentContact: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{10}$/.test(v.trim()), "Contact must be 10 digits"),
  altMobile: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{10}$/.test(v.trim()), "Contact must be 10 digits"),
  email: z.string().optional().refine((v) => !v || v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "Invalid email"),
  address: z.string().optional(),
  gramPanchayat: z.string().optional(),
  block: z.string().optional(),
  pincode: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{6}$/.test(v.trim()), "Pincode must be 6 digits"),

  // Academic Enrolment
  presentClass: z.string().min(1, "Class is required"),
  presentSection: z.string().min(1, "Section is required"),
  presentRoll: z.coerce.number().int().positive("Roll must be positive"),
  presentSemester: z.enum(["Sem 1", "Sem 2", "Sem 3", "Sem 4"]).optional().nullable(),
  detentionCount: z.coerce.number().int().nonnegative().optional().nullable(),
  admissionNo: z.string().optional(),
  admissionDate: z.string().optional(),
  admissionType: z.string().optional(),
  academicYear: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  presentClassAdmissionDate: z.string().optional(),
  admissionYear: z.coerce.number().int().min(2000).max(new Date().getFullYear()),
  academicStream: z.string().optional(),
  boardRegistrationNo: z.string().optional().nullable(),
  boardRollNo: z.string().optional().nullable(),

  // Language studied (comma separated)
  languageGroupInput: z.string().optional(),
  mandatorySubjectsInput: z.string().optional(),
  additionalSubjectsInput: z.string().optional(),
  coCurricularSubjectsInput: z.string().optional(),

  // Previous Academic Year Info
  previousSchool: z.string().optional().nullable(),
  previousStatus: z.string().optional(),
  previousClass: z.string().optional(),
  previousSection: z.string().optional(),
  previousStream: z.string().optional(),
  previousRollNo: z.coerce.number().optional().nullable(),
  previousAppearedForExams: z.coerce.boolean().optional(),
  previousResult: z.string().optional(),
  previousMarksPercent: z.coerce.number().optional().nullable(),
  previousDaysAttended: z.coerce.number().optional().nullable(),

  // RTE
  rteSection12C: z.coerce.boolean().optional(),
  rteAmountClaimed: z.coerce.number().optional().nullable(),

  // Facilities Profile
  facilitiesProvidedInput: z.string().optional(),
  cwsnFacilitiesInput: z.string().optional(),
  freeUniforms: z.coerce.boolean().optional(),
  freeTransport: z.coerce.boolean().optional(),
  freeBicycle: z.coerce.boolean().optional(),
  freeHostel: z.coerce.boolean().optional(),
  freeShoes: z.coerce.boolean().optional(),
  hasComputerAccess: z.coerce.boolean().optional(),

  // Extra Profile Fields
  ncc: z.coerce.boolean().optional(),
  nss: z.coerce.boolean().optional(),
  scoutsGuides: z.coerce.boolean().optional(),
  distanceToSchool: z.coerce.number().optional().nullable(),
  highestEducationParents: z.string().optional(),
  competitionsOlympiadsInput: z.string().optional(),

  // Bank
  bankIfsc: z.string().optional(),
  bankAccountNo: z.string().optional(),

  // Govt IDs
  pen: z.string().optional(),
  diseCode: z.string().optional(),
  healthId: z.string().optional(),
  studentUniqueCode: z.string().optional(),
  kanyashreeId: z.string().optional(),
  aadhaar: z.string().optional().refine((v) => !v || v.trim() === "" || /^\d{12}$/.test(v.trim()), "Aadhaar must be 12 digits"),
  nameAsPerAadhaar: z.string().optional(),
});

type FormData = z.infer<typeof studentSchema>;

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const INDIAN_RELIGIONS = [
  { label: "Islam", value: "Islam" },
  { label: "Hinduism", value: "Hinduism" },
  { label: "Christianity", value: "Christianity" },
  { label: "Sikhism", value: "Sikhism" },
  { label: "Buddhism", value: "Buddhism" },
  { label: "Jainism", value: "Jainism" },
  { label: "Other", value: "Other" },
];

const MOTHER_TONGUES = [
  { label: "Bengali", value: "Bengali" },
  { label: "Hindi", value: "Hindi" },
  { label: "Urdu", value: "Urdu" },
  { label: "English", value: "English" },
  { label: "Santhali", value: "Santhali" },
  { label: "Nepali", value: "Nepali" },
  { label: "Other", value: "Other" },
];

const QUALIFICATION_OPTIONS = [
  { label: "Illiterate", value: "Illiterate" },
  { label: "Below Primary", value: "Below Primary" },
  { label: "Primary", value: "Primary" },
  { label: "Upper Primary", value: "Upper Primary" },
  { label: "Secondary", value: "Secondary" },
  { label: "Higher Secondary", value: "Higher Secondary" },
  { label: "Graduate", value: "Graduate" },
  { label: "Post Graduate", value: "Post Graduate" },
  { label: "Doctorate / Professional", value: "Doctorate / Professional" },
  { label: "Other", value: "Other" },
];

const STREAM_OPTIONS = [
  { label: "Science", value: "Science" },
  { label: "Arts", value: "Arts" },
  { label: "Commerce", value: "Commerce" },
  { label: "Vocational", value: "Vocational" },
];

export interface StudentAddEditFormProps {
  aiExtractedData?: Record<string, any>;
  initialData?: Record<string, any>;
  onSuccess?: (student: Student) => void;
  onSubmitData?: (formData: any) => void;
  submitButtonText?: string;
  isEmbedded?: boolean;
}

export function StudentAddEditForm({
  aiExtractedData,
  initialData,
  onSuccess,
  onSubmitData,
  submitButtonText,
  isEmbedded = false,
}: StudentAddEditFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      gender: "Male",
      motherTongue: "Bengali",
      indianNationality: true,
      isAay: false,
      isEws: false,
      isOutOfSchool: false,
      isCwsn: false,
      hasDisabilityCertificate: false,
      previousAppearedForExams: false,
      rteSection12C: false,
      ncc: false,
      nss: false,
      scoutsGuides: false,
      admissionYear: new Date().getFullYear(),
      admissionDate: new Date().toISOString().split("T")[0],
      presentClassAdmissionDate: new Date().toISOString().split("T")[0],
      presentClass: "V",
      presentSection: "A",
      presentRoll: 1,
      presentSemester: null,
      detentionCount: 0,
      currentStatus: "Continuing",
      admissionNo: "",
      fatherOccupation: "",
      motherOccupation: "",
      mediumOfInstruction: "Bengali",
      ...(initialData || {}),
    },
  });

  // Watchers
  const isOutOfSchoolChecked = watch("isOutOfSchool");
  const watchSocialCategory = watch("socialCategory");
  const isCwsnChecked = watch("isCwsn");
  const hasDisabilityCertChecked = watch("hasDisabilityCertificate");
  const rteSection12CChecked = watch("rteSection12C");
  const watchPresentClass = watch("presentClass");
  const watchAdmissionYear = watch("admissionYear");
  const watchAdmissionNo = watch("admissionNo");
  const watchAdmissionDate = watch("admissionDate");
  const watchGender = watch("gender");
  const [hasAadhaarVal, setHasAadhaarVal] = useState("Yes");

  const fatherNameWatched = watch("fatherName");
  const fatherOccupationWatched = watch("fatherOccupation");
  const motherNameWatched = watch("motherName");
  const motherOccupationWatched = watch("motherOccupation");
  const relationshipWatched = watch("relationshipWithGuardian");
  const studentContactWatched = watch("studentContact");
  const altMobileWatched = watch("altMobile");

  // Populate extracted fields when AI returns data
  useEffect(() => {
    if (aiExtractedData && Object.keys(aiExtractedData).length > 0) {
      const fieldMap: Record<string, keyof FormData> = {
        studentName: "name",
        name: "name",
        dob: "dob",
        dateOfBirth: "dob",
        fatherName: "fatherName",
        motherName: "motherName",
        guardianName: "guardianName",
        studentContact: "studentContact",
        contact: "studentContact",
        phone: "studentContact",
        mobile: "studentContact",
        altMobile: "altMobile",
        address: "address",
        pincode: "pincode",
        presentClass: "presentClass",
        class: "presentClass",
        targetClass: "presentClass",
        presentSection: "presentSection",
        section: "presentSection",
        targetSection: "presentSection",
        presentRoll: "presentRoll",
        roll: "presentRoll",
        targetRoll: "presentRoll",
        schoolId: "schoolId",
        aadhaar: "aadhaar",
        aadhaarNo: "aadhaar",
        pen: "pen",
        kanyashreeId: "kanyashreeId",
        previousSchool: "previousSchool",
        bankAccountNo: "bankAccountNo",
        bankIfsc: "bankIfsc",
        birthRegistrationNo: "birthRegistrationNo",
        casteCertificateNo: "casteCertificateNo",
      };

      Object.entries(aiExtractedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          const targetKey = fieldMap[key] || (key in getValues() ? (key as keyof FormData) : undefined);
          if (targetKey) {
            if (targetKey === "gender") {
              const g = String(value).trim().toLowerCase();
              if (g.startsWith("m")) setValue("gender", "Male");
              else if (g.startsWith("f")) setValue("gender", "Female");
              else setValue("gender", "Other");
            } else if (targetKey === "presentRoll" || targetKey === "annualFamilyIncome" || targetKey === "heightCm" || targetKey === "weightKg") {
              const num = Number(value);
              if (!isNaN(num)) setValue(targetKey, num as any, { shouldValidate: true });
            } else {
              setValue(targetKey, String(value) as any, { shouldValidate: true });
            }
          }
        }
      });
    }
  }, [aiExtractedData, setValue, getValues]);

  // Auto-sync admission year when admission date is chosen
  useEffect(() => {
    if (watchAdmissionDate) {
      const year = new Date(watchAdmissionDate).getFullYear();
      if (!isNaN(year) && year > 1990 && year <= new Date().getFullYear()) {
        setValue("admissionYear", year, { shouldValidate: true });
      }
    }
  }, [watchAdmissionDate, setValue]);

  // Auto-sync guardian fields based on relationship and parent details
  useEffect(() => {
    const rel = (relationshipWatched || "").trim().toLowerCase();
    if (rel === "father") {
      if (fatherNameWatched) {
        setValue("guardianName", fatherNameWatched, { shouldValidate: true });
      }
      if (fatherOccupationWatched) {
        setValue("guardianOccupation", fatherOccupationWatched, { shouldValidate: true });
      }
    } else if (rel === "mother") {
      if (motherNameWatched) {
        setValue("guardianName", motherNameWatched, { shouldValidate: true });
      }
      if (motherOccupationWatched) {
        setValue("guardianOccupation", motherOccupationWatched, { shouldValidate: true });
      }
    }
  }, [relationshipWatched, fatherNameWatched, motherNameWatched, fatherOccupationWatched, motherOccupationWatched, setValue]);

  // Auto-sync guardian mobile with primary contact if empty
  useEffect(() => {
    const rel = (relationshipWatched || "").trim().toLowerCase();
    if (rel === "father" || rel === "mother") {
      if (studentContactWatched && (!altMobileWatched || altMobileWatched.trim() === "")) {
        setValue("altMobile", studentContactWatched, { shouldValidate: true });
      }
    }
  }, [relationshipWatched, studentContactWatched, altMobileWatched, setValue]);

  useEffect(() => {
    const presets = getSavedStudentEntryPresets();
    if (presets.defaultGuardianRelationship && presets.defaultGuardianRelationship !== "None") {
      setValue("relationshipWithGuardian", presets.defaultGuardianRelationship);
    }
    if (presets.defaultReligion && presets.defaultReligion !== "None") {
      setValue("religion", presets.defaultReligion);
    }
    if (presets.defaultMotherTongue && presets.defaultMotherTongue !== "None") {
      setValue("motherTongue", presets.defaultMotherTongue);
    }
    if (presets.defaultMediumOfInstruction && presets.defaultMediumOfInstruction !== "None") {
      setValue("mediumOfInstruction", presets.defaultMediumOfInstruction);
    }

    fetchStudentEntryPresetsFromDb().then((p) => {
      if (p.defaultGuardianRelationship && p.defaultGuardianRelationship !== "None" && !getValues("relationshipWithGuardian")) {
        setValue("relationshipWithGuardian", p.defaultGuardianRelationship);
      }
      if (p.defaultReligion && p.defaultReligion !== "None" && !getValues("religion")) {
        setValue("religion", p.defaultReligion);
      }
      if (p.defaultMediumOfInstruction && p.defaultMediumOfInstruction !== "None" && (!getValues("mediumOfInstruction") || getValues("mediumOfInstruction") === "")) {
        setValue("mediumOfInstruction", p.defaultMediumOfInstruction);
      }
    });
  }, [setValue, getValues]);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      const data = applyStudentEntryDefaults(formData);

      const languageGroup = data.languageGroupInput ? data.languageGroupInput.split(",").map(s => s.trim()).filter(Boolean) : [];
      const mandatorySubjects = data.mandatorySubjectsInput ? data.mandatorySubjectsInput.split(",").map(s => s.trim()).filter(Boolean) : [];
      const additionalSubjects = data.additionalSubjectsInput ? data.additionalSubjectsInput.split(",").map(s => s.trim()).filter(Boolean) : [];
      const coCurricularSubjects = data.coCurricularSubjectsInput ? data.coCurricularSubjectsInput.split(",").map(s => s.trim()).filter(Boolean) : [];

      const facilitiesProvided = data.facilitiesProvidedInput ? data.facilitiesProvidedInput.split(",").map(s => s.trim()).filter(Boolean) : [];
      const cwsnFacilities = data.cwsnFacilitiesInput ? data.cwsnFacilitiesInput.split(",").map(s => s.trim()).filter(Boolean) : [];
      const competitionsOlympiads = data.competitionsOlympiadsInput ? data.competitionsOlympiadsInput.split(",").map(s => s.trim()).filter(Boolean) : [];

      const {
        languageGroupInput: _l,
        mandatorySubjectsInput: _m,
        additionalSubjectsInput: _a,
        coCurricularSubjectsInput: _c,
        facilitiesProvidedInput: _f,
        cwsnFacilitiesInput: _cw,
        competitionsOlympiadsInput: _co,
        ...rest
      } = data;

      return createStudent({
        ...rest,
        languageGroup,
        mandatorySubjects,
        additionalSubjects,
        coCurricularSubjects,
        facilitiesProvided,
        cwsnFacilities,
        competitionsOlympiads,
        currentStatus: (data.currentStatus as any) || "Continuing",
        presentSemester: data.presentSemester || undefined,
        detentionCount: data.detentionCount ? Number(data.detentionCount) : undefined,
        academicHistory: [
          {
            year: data.admissionYear,
            class: data.presentClass,
            section: data.presentSection,
            roll: data.presentRoll,
            status: (data.currentStatus as any) || "Continuing",
            semester: data.presentSemester || undefined,
            detentionCount: data.detentionCount ? Number(data.detentionCount) : undefined,
          },
        ],
      } as any);
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admission-applications"] });
      showToast(`Student ${student.name} created & enrolled successfully!`, "success");
      if (onSuccess) {
        onSuccess(student);
      } else {
        router.push(`/students/${student.id}`);
      }
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to save student record", "error");
    },
  });

  function onSubmit(data: FormData) {
    if (onSubmitData) {
      onSubmitData(data);
      return;
    }
    mutation.mutate(data);
  }

  return (
    <div className={isEmbedded ? "space-y-6" : "p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5"}>
      {!isEmbedded && (
        <>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold">Add Student</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Fill in the comprehensive student details below.
            </p>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Section 1: Demographics */}
        <FormSection title="A. Student Demographics">
          <FormGrid>
            <FormField label="Full Name *" error={errors.name?.message}>
              <input {...register("name")} placeholder="e.g. Arjun Mondal" />
            </FormField>
            <FormField label="School ID *" error={errors.schoolId?.message}>
              <Controller
                control={control}
                name="schoolId"
                render={({ field }) => (
                  <SchoolIdInput
                    value={field.value}
                    onChange={field.onChange}
                    presentClass={watchPresentClass}
                    admissionYear={watchAdmissionYear}
                    admissionNo={watchAdmissionNo}
                  />
                )}
              />
            </FormField>
            <FormField label="Date of Birth *" error={errors.dob?.message}>
              <input {...register("dob")} type="date" />
            </FormField>
            <FormField label="Gender *" error={errors.gender?.message}>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { label: "Male", value: "Male" },
                      { label: "Female", value: "Female" },
                      { label: "Other", value: "Other" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Mother Tongue" error={errors.motherTongue?.message}>
              <Controller
                control={control}
                name="motherTongue"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Bengali"}
                    onChange={field.onChange}
                    options={MOTHER_TONGUES}
                  />
                )}
              />
            </FormField>
            <FormField label="Religion" error={errors.religion?.message}>
              <Controller
                control={control}
                name="religion"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select religion..."
                    options={INDIAN_RELIGIONS}
                  />
                )}
              />
            </FormField>
            <FormField label="Indian Nationality?" error={errors.indianNationality?.message}>
              <Controller
                control={control}
                name="indianNationality"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? true)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "Yes", value: "true" },
                      { label: "No", value: "false" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Blood Group" error={errors.bloodGroup?.message}>
              <Controller
                control={control}
                name="bloodGroup"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select blood group..."
                    options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => ({
                      label: bg,
                      value: bg,
                    }))}
                  />
                )}
              />
            </FormField>
            <FormField label="Height (in CMs)" error={errors.heightCm?.message}>
              <input {...register("heightCm")} type="number" placeholder="e.g. 142" />
            </FormField>
            <FormField label="Weight (in KGs)" error={errors.weightKg?.message}>
              <input {...register("weightKg")} type="number" step="0.1" placeholder="e.g. 35.5" />
            </FormField>
            <FormField label="Birth Registration Number" error={errors.birthRegistrationNo?.message}>
              <input {...register("birthRegistrationNo")} placeholder="Registration number" />
            </FormField>
            <FormField label="Identification Mark" error={errors.identificationMark?.message}>
              <input {...register("identificationMark")} placeholder="e.g. Mole on left cheek" />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Section 2: Social Categories & Eligibility */}
        <FormSection title="B. Social & Eligibility Categories">
          <FormGrid>
            <FormField label="Social Category" error={errors.socialCategory?.message}>
              <Controller
                control={control}
                name="socialCategory"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select category..."
                    options={[
                      { label: "General", value: "General" },
                      { label: "OBC", value: "OBC" },
                      { label: "SC", value: "SC" },
                      { label: "ST", value: "ST" },
                      { label: "Other", value: "Other" },
                    ]}
                  />
                )}
              />
            </FormField>
            {watchSocialCategory && watchSocialCategory.trim() !== "" && (
              <FormField label="Category / Caste Certificate Number" error={errors.casteCertificateNo?.message}>
                <input
                  {...register("casteCertificateNo")}
                  placeholder="Enter certificate number (e.g. WB/SC/2024/...)"
                />
              </FormField>
            )}
            <FormField label="Minority Group" error={errors.minorityGroup?.message}>
              <input {...register("minorityGroup")} placeholder="e.g. Muslim, Christian, None" />
            </FormField>
            <FormField label="AAY (Antyodaya Anna Yojana)?" error={errors.isAay?.message}>
              <Controller
                control={control}
                name="isAay"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="EWS / Disadvantaged Group?" error={errors.isEws?.message}>
              <Controller
                control={control}
                name="isEws"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Out-of-School Child?" error={errors.isOutOfSchool?.message}>
              <Controller
                control={control}
                name="isOutOfSchool"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            {isOutOfSchoolChecked && (
              <FormField label="When Mainstreamed" error={errors.mainstreamedDate?.message}>
                <input {...register("mainstreamedDate")} type="date" />
              </FormField>
            )}
          </FormGrid>
        </FormSection>

        {/* Section 3: CWSN Profile */}
        <FormSection title="C. CWSN Profile">
          <FormGrid>
            <FormField label="CWSN Status?" error={errors.isCwsn?.message}>
              <Controller
                control={control}
                name="isCwsn"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            {isCwsnChecked && (
              <>
                <FormField label="Type of Impairment" error={errors.impairmentType?.message}>
                  <input {...register("impairmentType")} placeholder="e.g. Blindness, Hearing impairment" />
                </FormField>
                <FormField label="Disability Certificate?" error={errors.hasDisabilityCertificate?.message}>
                  <Controller
                    control={control}
                    name="hasDisabilityCertificate"
                    render={({ field }) => (
                      <CustomSelect
                        value={String(field.value ?? false)}
                        onChange={(val) => field.onChange(val === "true" || val === true)}
                        options={[
                          { label: "No", value: "false" },
                          { label: "Yes", value: "true" },
                        ]}
                      />
                    )}
                  />
                </FormField>
                {hasDisabilityCertChecked && (
                  <FormField label="Disability Percentage (%)" error={errors.disabilityPercentage?.message}>
                    <input {...register("disabilityPercentage")} type="number" placeholder="e.g. 40" />
                  </FormField>
                )}
              </>
            )}
            <FormField label="Specific Learning Disability (SLD)" error={errors.sldType?.message}>
              <input {...register("sldType")} placeholder="e.g. Dyslexia, None" />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Section 4: Family & Contact */}
        <FormSection title="D. Family & Contacts">
          <FormGrid>
            <FormField label="Father's Name *" error={errors.fatherName?.message}>
              <input {...register("fatherName")} placeholder="e.g. Ratan Mondal" />
            </FormField>
            <FormField label="Father's Occupation" error={errors.fatherOccupation?.message}>
              <Controller
                control={control}
                name="fatherOccupation"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select father's occupation..."
                    options={OCCUPATION_OPTIONS}
                  />
                )}
              />
            </FormField>
            <FormField label="Mother's Name *" error={errors.motherName?.message}>
              <input {...register("motherName")} placeholder="e.g. Sujata Mondal" />
            </FormField>
            <FormField label="Mother's Occupation" error={errors.motherOccupation?.message}>
              <Controller
                control={control}
                name="motherOccupation"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select mother's occupation..."
                    options={OCCUPATION_OPTIONS}
                  />
                )}
              />
            </FormField>
            <FormField label="Guardian's Name" error={errors.guardianName?.message}>
              <input {...register("guardianName")} placeholder="e.g. Ramesh Mondal" />
            </FormField>
            <FormField label="Relationship with Guardian" error={errors.relationshipWithGuardian?.message}>
              <Controller
                control={control}
                name="relationshipWithGuardian"
                render={({ field }) => (
                  <GuardianRelationshipSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField label="Guardian's Occupation" error={errors.guardianOccupation?.message}>
              <Controller
                control={control}
                name="guardianOccupation"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select guardian's occupation..."
                    options={OCCUPATION_OPTIONS}
                  />
                )}
              />
            </FormField>
            <FormField label="Guardian's Qualification" error={errors.guardianQualification?.message}>
              <Controller
                control={control}
                name="guardianQualification"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select qualification..."
                    options={QUALIFICATION_OPTIONS}
                  />
                )}
              />
            </FormField>
            <FormField label="Annual Family Income" error={errors.annualFamilyIncome?.message}>
              <input {...register("annualFamilyIncome")} type="number" placeholder="e.g. 120000" />
            </FormField>
            <FormField label="Primary Contact Mobile *" error={errors.studentContact?.message}>
              <input {...register("studentContact")} placeholder="e.g. 9876543210" />
            </FormField>
            <FormField label="Guardian Contact No" error={errors.altMobile?.message}>
              <input {...register("altMobile")} placeholder="10-digit guardian mobile" />
            </FormField>
            <FormField label="Contact Email ID" error={errors.email?.message}>
              <input {...register("email")} type="email" placeholder="e.g. guardian@mail.com" />
            </FormField>
            <div className="sm:col-span-2 md:col-span-3">
              <SmartAddressInput
                value={watch("address") || ""}
                onChange={(addr) => setValue("address", addr, { shouldValidate: true })}
                pincodeValue={watch("pincode") || ""}
                onPincodeChange={(pin) => setValue("pincode", pin, { shouldValidate: true })}
                gramPanchayatValue={watch("gramPanchayat") || ""}
                onGramPanchayatChange={(gp) => setValue("gramPanchayat", gp, { shouldValidate: true })}
                blockValue={watch("block") || ""}
                onBlockChange={(blk) => setValue("block", blk, { shouldValidate: true })}
                error={errors.address?.message}
                pincodeError={errors.pincode?.message}
                gramPanchayatError={errors.gramPanchayat?.message}
                blockError={errors.block?.message}
              />
            </div>
          </FormGrid>
        </FormSection>

        {/* Section 5: Present Enrolment Details */}
        <FormSection title="E. Enrolment & Academic Details">
          <FormGrid>
            <FormField label="Present Class *" error={errors.presentClass?.message}>
              <Controller
                control={control}
                name="presentClass"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select class..."
                    options={CLASSES.map((c) => ({ label: `Class ${c}`, value: c }))}
                  />
                )}
              />
            </FormField>
            <FormField label="Present Section *" error={errors.presentSection?.message}>
              <Controller
                control={control}
                name="presentSection"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select section..."
                    options={["A", "B", "C"].map((s) => ({ label: `Section ${s}`, value: s }))}
                  />
                )}
              />
            </FormField>
            <FormField label="Present Roll Number *" error={errors.presentRoll?.message}>
              <input {...register("presentRoll")} type="number" placeholder="e.g. 1" />
            </FormField>
            <FormField label="Admission Number" error={errors.admissionNo?.message}>
              <input {...register("admissionNo")} placeholder="e.g. ADM2025001" />
            </FormField>
            <FormField label="Admission Year *" error={errors.admissionYear?.message}>
              <input {...register("admissionYear")} type="number" placeholder="2025" />
            </FormField>
            <FormField label="Admission Date" error={errors.admissionDate?.message}>
              <input {...register("admissionDate")} type="date" />
            </FormField>
            <FormField label="Admission Type" error={errors.admissionType?.message}>
              <input {...register("admissionType")} placeholder="e.g. Day Scholar, Hosteller" />
            </FormField>
            <FormField label="Academic Year" error={errors.academicYear?.message}>
              <input {...register("academicYear")} placeholder="e.g. 2025-2026" />
            </FormField>
            <FormField label="Medium of Instruction" error={errors.mediumOfInstruction?.message}>
              <Controller
                control={control}
                name="mediumOfInstruction"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? "Bengali"}
                    onChange={field.onChange}
                    placeholder="Select medium..."
                    options={MEDIUM_OF_INSTRUCTION_OPTIONS}
                  />
                )}
              />
            </FormField>
            <FormField label="Present Class Admission Date" error={errors.presentClassAdmissionDate?.message}>
              <input {...register("presentClassAdmissionDate")} type="date" />
            </FormField>
            {(() => {
              const normalizedClass = (watchPresentClass || "").toUpperCase().replace(/^CLASS\s*/i, "").replace(/^STD\s*/i, "").trim();
              const isHs = ["XI", "11", "XII", "12"].includes(normalizedClass);
              if (!isHs) return null;
              return (
                <>
                  <FormField label="Academic Stream (HS only)" error={errors.academicStream?.message}>
                    <Controller
                      control={control}
                      name="academicStream"
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Select stream..."
                          options={STREAM_OPTIONS}
                        />
                      )}
                    />
                  </FormField>
                  <FormField label="Semester (HS only)" error={errors.presentSemester?.message}>
                    <Controller
                      control={control}
                      name="presentSemester"
                      render={({ field }) => (
                        <CustomSelect
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Select semester..."
                          options={
                            ["XI", "11"].includes(normalizedClass)
                              ? [
                                  { label: "Semester 1", value: "Sem 1" },
                                  { label: "Semester 2", value: "Sem 2" },
                                ]
                              : [
                                  { label: "Semester 3", value: "Sem 3" },
                                  { label: "Semester 4", value: "Sem 4" },
                                ]
                          }
                        />
                      )}
                    />
                  </FormField>
                </>
              );
            })()}
            {(() => {
              const normalizedClass = (watchPresentClass || "").toUpperCase().replace(/^CLASS\s*/i, "").trim();
              const isBoardClass = ["IX", "9", "X", "10", "XI", "11", "XII", "12"].includes(normalizedClass);
              const isHs = ["XI", "11", "XII", "12"].includes(normalizedClass);
              if (!isBoardClass) return null;
              return (
                <>
                  <FormField
                    label={isHs ? "WBCHSE Board Registration No" : "WBBSE Board Registration No"}
                    error={errors.boardRegistrationNo?.message}
                  >
                    <input
                      {...register("boardRegistrationNo")}
                      placeholder="e.g. 19180201004/2024"
                      className="font-mono uppercase"
                    />
                  </FormField>
                  <FormField
                    label={isHs ? "WBCHSE Board Roll Number" : "WBBSE Board Roll Number"}
                    error={errors.boardRollNo?.message}
                  >
                    <input
                      {...register("boardRollNo")}
                      placeholder="e.g. 123456N 0012"
                      className="font-mono uppercase"
                    />
                  </FormField>
                </>
              );
            })()}
          </FormGrid>

          <p className="text-xs font-semibold text-muted-foreground pt-3 border-t">Languages &amp; Subjects (Comma Separated)</p>
          <FormGrid>
            <FormField label="Languages Studied" error={errors.languageGroupInput?.message}>
              <input {...register("languageGroupInput")} placeholder="e.g. Bengali, English" />
            </FormField>
            <FormField label="Mandatory Subjects" error={errors.mandatorySubjectsInput?.message}>
              <input {...register("mandatorySubjectsInput")} placeholder="e.g. Mathematics, Science, History" />
            </FormField>
            <FormField label="Additional Subjects" error={errors.additionalSubjectsInput?.message}>
              <input {...register("additionalSubjectsInput")} placeholder="e.g. Computer Application" />
            </FormField>
            <FormField label="Co-Curricular Subjects" error={errors.coCurricularSubjectsInput?.message}>
              <input {...register("coCurricularSubjectsInput")} placeholder="e.g. Work Education, Health" />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Section 6: Previous Schooling & RTE */}
        <FormSection title="F. Previous Schooling & RTE">
          <FormGrid>
            <div className="sm:col-span-2 md:col-span-3">
              <SmartPreviousSchoolInput
                value={watch("previousSchool") || ""}
                onChange={(val) => setValue("previousSchool", val, { shouldValidate: true })}
                error={errors.previousSchool?.message}
              />
            </div>
            <FormField label="Schooling Status" error={errors.previousStatus?.message}>
              <input {...register("previousStatus")} placeholder="e.g. Studied in same school" />
            </FormField>
            <FormField label="Previous Grade/Class" error={errors.previousClass?.message}>
              <input {...register("previousClass")} placeholder="e.g. IV" />
            </FormField>
            <FormField label="Previous Section" error={errors.previousSection?.message}>
              <input {...register("previousSection")} placeholder="e.g. A" />
            </FormField>
            <FormField label="Previous Roll No" error={errors.previousRollNo?.message}>
              <input {...register("previousRollNo")} type="number" placeholder="e.g. 1" />
            </FormField>
            <FormField label="Previous Stream" error={errors.previousStream?.message}>
              <Controller
                control={control}
                name="previousStream"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Select stream..."
                    options={STREAM_OPTIONS}
                  />
                )}
              />
            </FormField>
            <FormField label="Appeared for Exams?" error={errors.previousAppearedForExams?.message}>
              <Controller
                control={control}
                name="previousAppearedForExams"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Exam Result" error={errors.previousResult?.message}>
              <input {...register("previousResult")} placeholder="e.g. Passed" />
            </FormField>
            <FormField label="Marks Obtained (%)" error={errors.previousMarksPercent?.message}>
              <input {...register("previousMarksPercent")} type="number" placeholder="e.g. 78" />
            </FormField>
            <FormField label="Days Attended" error={errors.previousDaysAttended?.message}>
              <input {...register("previousDaysAttended")} type="number" placeholder="e.g. 185" />
            </FormField>
            <FormField label="Admitted under RTE Sec 12C?" error={errors.rteSection12C?.message}>
              <Controller
                control={control}
                name="rteSection12C"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            {rteSection12CChecked && (
              <FormField label="Amount Claimed from Govt" error={errors.rteAmountClaimed?.message}>
                <input {...register("rteAmountClaimed")} type="number" placeholder="e.g. 15000" />
              </FormField>
            )}
          </FormGrid>
        </FormSection>

        {/* Section 7: Facilities Profile */}
        <FormSection title="G. Facilities Profile & Extras">
          <FormGrid>
            <FormField label="General Facilities (Comma Separated)" error={errors.facilitiesProvidedInput?.message}>
              <input {...register("facilitiesProvidedInput")} placeholder="e.g. Free Uniform, Textbooks" />
            </FormField>
            <FormField label="CWSN Facilities (Comma Separated)" error={errors.cwsnFacilitiesInput?.message}>
              <input {...register("cwsnFacilitiesInput")} placeholder="e.g. Braille Book, Wheelchair" />
            </FormField>
            <FormField label="NCC Member?" error={errors.ncc?.message}>
              <Controller
                control={control}
                name="ncc"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="NSS Member?" error={errors.nss?.message}>
              <Controller
                control={control}
                name="nss"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Scouts and Guides?" error={errors.scoutsGuides?.message}>
              <Controller
                control={control}
                name="scoutsGuides"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => field.onChange(val === "true" || val === true)}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Distance to School (KM)" error={errors.distanceToSchool?.message}>
              <input {...register("distanceToSchool")} type="number" step="0.1" placeholder="e.g. 1.2" />
            </FormField>
            <FormField label="Highest Parent Education Level" error={errors.highestEducationParents?.message}>
              <input {...register("highestEducationParents")} placeholder="e.g. Post Graduate" />
            </FormField>
            <FormField label="Competitions/Olympiads (Comma Separated)" error={errors.competitionsOlympiadsInput?.message}>
              <input {...register("competitionsOlympiadsInput")} placeholder="e.g. National Math Olympiad" />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Section 8: Bank Details */}
        <FormSection title="H. Bank Details">
          <SmartBankInput
            accountNumberValue={watch("bankAccountNo") || ""}
            onAccountNumberChange={(val) => setValue("bankAccountNo", val, { shouldValidate: true })}
            ifscValue={watch("bankIfsc") || ""}
            onIfscChange={(val) => setValue("bankIfsc", val, { shouldValidate: true })}
            accountNumberError={errors.bankAccountNo?.message}
            ifscError={errors.bankIfsc?.message}
          />
        </FormSection>

        {/* Section 9: Government Identifiers */}
        <FormSection title="I. Government Identifiers">
          <FormGrid>
            <FormField label="PEN" error={errors.pen?.message}>
              <input {...register("pen")} placeholder="Permanent Education Number" />
            </FormField>
            <FormField label="DISE Code" error={errors.diseCode?.message}>
              <input {...register("diseCode")} placeholder="School DISE Code" />
            </FormField>
            <FormField label="Health ID" error={errors.healthId?.message}>
              <input {...register("healthId")} placeholder="Student Health ID" />
            </FormField>
            <FormField label="Student Unique Code" error={errors.studentUniqueCode?.message}>
              <input {...register("studentUniqueCode")} placeholder="Unique identifier code" />
            </FormField>
            {watchGender === "Female" && (
              <FormField label="Kanyashree ID / Applicant ID" error={errors.kanyashreeId?.message}>
                <input {...register("kanyashreeId")} placeholder="e.g. 19190100101150000001" />
              </FormField>
            )}
            <FormField label="Aadhaar Available? (Yes/No)">
              <CustomSelect
                value={hasAadhaarVal}
                onChange={(val) => {
                  setHasAadhaarVal(val);
                  if (val === "No") {
                    setValue("aadhaar", "");
                    setValue("nameAsPerAadhaar", "");
                  }
                }}
                options={[
                  { label: "Yes (Aadhaar Available)", value: "Yes" },
                  { label: "No (Aadhaar Not Available)", value: "No" },
                ]}
              />
            </FormField>
            <FormField label="Aadhaar Number (12 digits)" error={errors.aadhaar?.message}>
              <input
                {...register("aadhaar")}
                placeholder={hasAadhaarVal === "Yes" ? "Enter 12-digit Aadhaar Number" : "Not Available"}
                maxLength={12}
                disabled={hasAadhaarVal === "No"}
                className={hasAadhaarVal === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
              />
            </FormField>
            <FormField label="Name (as per Aadhaar)" error={errors.nameAsPerAadhaar?.message}>
              <input
                {...register("nameAsPerAadhaar")}
                placeholder={hasAadhaarVal === "Yes" ? "Exact name on Aadhaar" : "Not Available"}
                disabled={hasAadhaarVal === "No"}
                className={hasAadhaarVal === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {mutation.isPending ? "Saving Record…" : (submitButtonText || "Save Student Record")}
          </button>
          {!isEmbedded && (
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {mutation.isError && (
          <p className="text-xs font-semibold text-destructive">
            Something went wrong. Please check your fields and try again.
          </p>
        )}
      </form>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-4 shadow-2xs">
      <p className="text-xs sm:text-sm font-bold border-b pb-2.5 text-foreground">{title}</p>
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">{children}</div>
  );
}

function FormField({
  label,
  error,
  children,
  full,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2 md:col-span-3" : ""}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <div
        className={`[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:bg-background [&>input]:px-3.5 [&>input]:py-2 [&>input]:text-xs [&>input]:h-9 [&>input]:outline-none [&>input]:focus:ring-2 [&>input]:focus:ring-ring
          [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:bg-background [&>select]:px-3.5 [&>select]:py-2 [&>select]:text-xs [&>select]:h-9 [&>select]:outline-none [&>select]:focus:ring-2 [&>select]:focus:ring-ring
          [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:bg-background [&>textarea]:px-3.5 [&>textarea]:py-2 [&>textarea]:text-xs [&>textarea]:outline-none [&>textarea]:focus:ring-2 [&>textarea]:focus:ring-ring [&>textarea]:resize-none
          ${error ? "[&>input]:border-destructive [&>select]:border-destructive [&>textarea]:border-destructive" : ""}`}
      >
        {children}
      </div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
