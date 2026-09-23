"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentById, updateStudent } from "@/lib/data/students";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Student } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";
import { SchoolIdInput } from "@/components/students/school-id-input";
import { GuardianRelationshipSelect } from "@/components/students/guardian-relationship-select";
import { SmartAddressInput } from "@/components/students/smart-address-input";
import { SmartBankInput } from "@/components/students/smart-bank-input";
import { SmartPreviousSchoolInput } from "@/components/students/smart-previous-school-input";
import { showToast } from "@/components/ui/toast-banner";
import { OCCUPATION_OPTIONS, MEDIUM_OF_INSTRUCTION_OPTIONS } from "@/lib/constants/student-options";

const studentSchema = z.object({
  // Identity
  name: z.string().min(2, "Name is required"),
  studentNameBengali: z.string().optional(),
  schoolId: z
    .string()
    .min(1, "School ID is required")
    .regex(
      /^[A-Z0-9/_-]+$/i,
      "School ID contains invalid characters"
    ),
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
  bplStatus: z.string().optional(),
  bplNo: z.string().optional(),
  isOutOfSchool: z.coerce.boolean().optional(),
  mainstreamedDate: z.string().optional(),

  // CWSN
  isCwsn: z.coerce.boolean().optional(),
  impairmentType: z.string().optional(),
  hasDisabilityCertificate: z.coerce.boolean().optional(),
  disabilityCertificateNo: z.string().optional(),
  disabilityPercentage: z.coerce.number().optional().nullable(),
  sldType: z.string().optional(),

  // Family Info
  fatherName: z.string().min(2, "Father's name is required"),
  fatherNameBengali: z.string().optional(),
  fatherOccupation: z.string().optional(),
  motherName: z.string().min(2, "Mother's name is required"),
  motherNameBengali: z.string().optional(),
  motherOccupation: z.string().optional(),
  guardianName: z.string().optional(),
  relationshipWithGuardian: z.string().optional(),
  guardianOccupation: z.string().optional(),
  guardianQualification: z.string().optional(),
  annualFamilyIncome: z.coerce.number().optional().nullable(),

  // Contact & Address
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
  admissionNo: z.string().optional(),
  admissionDate: z.string().optional(),
  admissionType: z.string().optional(),
  academicYear: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  presentClassAdmissionDate: z.string().optional(),
  admissionYear: z.coerce.number().int().min(1900).max(2100),
  academicStream: z.string().optional(),
  boardRegistrationNo: z.string().optional().nullable(),
  boardRollNo: z.string().optional().nullable(),
  bengaliMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  englishMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  mathMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  lifeSciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  phySciMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  historyMarks: z.coerce.number().min(0).max(100).optional().nullable(),
  geoMarks: z.coerce.number().min(0).max(100).optional().nullable(),

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

  // Facilities & Co-curricular
  facilitiesProvidedInput: z.string().optional(),
  cwsnFacilitiesInput: z.string().optional(),
  competitionsOlympiadsInput: z.string().optional(),
  ncc: z.coerce.boolean().optional(),
  nss: z.coerce.boolean().optional(),
  scoutsGuides: z.coerce.boolean().optional(),
  distanceToSchool: z.coerce.number().optional().nullable(),
  highestEducationParents: z.string().optional(),

  // Bank
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankAccountNo: z.string().optional(),

  // Identifiers
  pen: z.string().optional(),
  diseCode: z.string().optional(),
  healthId: z.string().optional(),
  studentUniqueCode: z.string().optional(),
  kanyashreeId: z.string().optional(),
  aadhaar: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        v.trim() === "" ||
        v.includes("•") ||
        v === "PENDING_RECORD" ||
        v === "Not Available" ||
        /^\d{12}$/.test(v.trim()),
      "Aadhaar must be 12 digits"
    ),
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

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => getStudentById(id),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(studentSchema),
    values: student
      ? {
        name: student.name,
        studentNameBengali: student.studentNameBengali ?? "",
        schoolId: student.schoolId,
        dob: student.dob,
        gender: student.gender,
        motherTongue: student.motherTongue || "Bengali",
        religion: student.religion ?? "",
        indianNationality: student.indianNationality !== false,
        bloodGroup: student.bloodGroup ?? "",
        heightCm: student.heightCm,
        weightKg: student.weightKg,
        birthRegistrationNo: student.birthRegistrationNo ?? "",
        identificationMark: student.identificationMark ?? "",

        socialCategory: student.socialCategory ?? "",
        casteCertificateNo: student.casteCertificateNo ?? "",
        minorityGroup: student.minorityGroup ?? "",
        isAay: !!student.isAay,
        isEws: !!student.isEws,
        bplStatus: student.bplStatus ?? "NO",
        bplNo: student.bplNo ?? "",
        isOutOfSchool: !!student.isOutOfSchool,
        mainstreamedDate: student.mainstreamedDate ?? "",

        isCwsn: !!student.isCwsn,
        impairmentType: student.impairmentType ?? "",
        hasDisabilityCertificate: !!student.hasDisabilityCertificate,
        disabilityCertificateNo: student.disabilityCertificateNo ?? "",
        disabilityPercentage: student.disabilityPercentage,
        sldType: student.sldType ?? "",

        fatherName: student.fatherName,
        fatherNameBengali: student.fatherNameBengali ?? "",
        fatherOccupation: student.fatherOccupation ?? "",
        motherName: student.motherName,
        motherNameBengali: student.motherNameBengali ?? "",
        motherOccupation: student.motherOccupation ?? "",
        guardianName: student.guardianName ?? "",
        relationshipWithGuardian: student.relationshipWithGuardian ?? "",
        guardianOccupation: student.guardianOccupation ?? "",
        guardianQualification: student.guardianQualification ?? "",
        annualFamilyIncome: student.annualFamilyIncome,

        studentContact: student.studentContact ?? "",
        altMobile: student.altMobile ?? "",
        email: student.email ?? "",
        address: student.address ?? "",
        gramPanchayat: student.gramPanchayat ?? "",
        block: student.block ?? "",
        pincode: student.pincode ?? "",

        presentClass: student.presentClass,
        presentSection: student.presentSection,
        presentRoll: student.presentRoll,
        admissionNo: student.admissionNo ?? "",
        admissionDate: student.admissionDate ?? "",
        admissionType: student.admissionType ?? "",
        academicYear: student.academicYear ?? "",
        mediumOfInstruction: student.mediumOfInstruction || "Bengali",
        presentClassAdmissionDate: student.presentClassAdmissionDate ?? "",
        admissionYear: student.admissionYear,
        academicStream: student.academicStream ?? "",
        boardRegistrationNo: student.boardRegistrationNo ?? "",
        boardRollNo: student.boardRollNo ?? "",
        bengaliMarks: student.bengaliMarks,
        englishMarks: student.englishMarks,
        mathMarks: student.mathMarks,
        lifeSciMarks: student.lifeSciMarks,
        phySciMarks: student.phySciMarks,
        historyMarks: student.historyMarks,
        geoMarks: student.geoMarks,

        languageGroupInput: student.languageGroup ? student.languageGroup.join(", ") : "",
        mandatorySubjectsInput: student.mandatorySubjects ? student.mandatorySubjects.join(", ") : "",
        additionalSubjectsInput: student.additionalSubjects ? student.additionalSubjects.join(", ") : "",
        coCurricularSubjectsInput: student.coCurricularSubjects ? student.coCurricularSubjects.join(", ") : "",

        previousStatus: student.previousStatus ?? "",
        previousClass: student.previousClass ?? "",
        previousSection: student.previousSection ?? "",
        previousStream: student.previousStream ?? "",
        previousRollNo: student.previousRollNo,
        previousAppearedForExams: !!student.previousAppearedForExams,
        previousResult: student.previousResult ?? "",
        previousMarksPercent: student.previousMarksPercent,
        previousDaysAttended: student.previousDaysAttended,

        rteSection12C: !!student.rteSection12C,
        rteAmountClaimed: student.rteAmountClaimed,

        facilitiesProvidedInput: student.facilitiesProvided ? student.facilitiesProvided.join(", ") : "",
        cwsnFacilitiesInput: student.cwsnFacilities ? student.cwsnFacilities.join(", ") : "",
        competitionsOlympiadsInput: student.competitionsOlympiads ? student.competitionsOlympiads.join(", ") : "",
        ncc: !!student.ncc,
        nss: !!student.nss,
        scoutsGuides: !!student.scoutsGuides,
        distanceToSchool: student.distanceToSchool,
        highestEducationParents: student.highestEducationParents ?? "",

        bankName: student.bankName ?? "",
        bankBranch: student.bankBranch ?? "",
        bankIfsc: student.bankIfsc ?? "",
        bankAccountNo: student.bankAccountNo ?? "",

        pen: student.pen ?? "",
        diseCode: student.diseCode ?? "",
        healthId: student.healthId ?? "",
        studentUniqueCode: student.studentUniqueCode ?? "",
        kanyashreeId: student.kanyashreeId ?? "",
        aadhaar: student.aadhaar ?? "",
        nameAsPerAadhaar: student.nameAsPerAadhaar ?? "",
      }
      : undefined,
  });

  const isOutOfSchoolChecked = watch("isOutOfSchool");
  const watchSocialCategory = watch("socialCategory");
  const watchBplStatus = watch("bplStatus");
  const isCwsnChecked = watch("isCwsn");
  const hasDisabilityCertChecked = watch("hasDisabilityCertificate");
  const rteSection12CChecked = watch("rteSection12C");
  const watchPresentClass = watch("presentClass");
  const watchAdmissionYear = watch("admissionYear");
  const watchAdmissionNo = watch("admissionNo");
  const watchAdmissionDate = watch("admissionDate");
  const watchGender = watch("gender");
  const [hasAadhaarVal, setHasAadhaarVal] = useState<string | null>(null);

  const fatherNameWatched = watch("fatherName");
  const fatherOccupationWatched = watch("fatherOccupation");
  const motherNameWatched = watch("motherName");
  const motherOccupationWatched = watch("motherOccupation");
  const relationshipWatched = watch("relationshipWithGuardian");
  const studentContactWatched = watch("studentContact");
  const altMobileWatched = watch("altMobile");

  const mBengali = Number(watch("bengaliMarks")) || 0;
  const mEnglish = Number(watch("englishMarks")) || 0;
  const mMath = Number(watch("mathMarks")) || 0;
  const mLifeSci = Number(watch("lifeSciMarks")) || 0;
  const mPhySci = Number(watch("phySciMarks")) || 0;
  const mHistory = Number(watch("historyMarks")) || 0;
  const mGeo = Number(watch("geoMarks")) || 0;
  const madhyamikTotal = mBengali + mEnglish + mMath + mLifeSci + mPhySci + mHistory + mGeo;
  const madhyamikPercent = ((madhyamikTotal / 700) * 100).toFixed(2);

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

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      // Map inputs to lists for array columns
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

      return updateStudent(id, {
        ...rest,
        languageGroup,
        mandatorySubjects,
        additionalSubjects,
        coCurricularSubjects,
        facilitiesProvided,
        cwsnFacilities,
        competitionsOlympiads,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      showToast({ type: "success", title: "Student profile updated successfully" });
      router.push(`/students/${id}`);
    },
    onError: (err: any) => {
      showToast({
        type: "error",
        title: "Failed to update student",
        description: err.message || "Please check your inputs and try again.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[500px] w-full rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Student not found.</p>
      </div>
    );
  }

  function onSubmit(data: FormData) {
    mutation.mutate(data);
  }

  function onFormError(formErrors: any) {
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const errMsg = formErrors[firstKey]?.message || "Validation failed";
      showToast({
        type: "error",
        title: "Validation Error",
        description: `Field '${firstKey}': ${errMsg}`,
      });
    }
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Profile
      </button>

      <div>
        <h1 className="text-lg sm:text-xl font-bold">Edit Student</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Updating: <span className="font-medium text-foreground">{student.name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">

        {/* Section 1: Demographics */}
        <FormSection title="A. Student Demographics">
          <FormGrid>
            <FormField label="Full Name *" error={errors.name?.message}>
              <input {...register("name")} />
            </FormField>
            <FormField label="Student Name in Bengali (ছাত্রের নাম বাংলায়)" error={errors.studentNameBengali?.message}>
              <input {...register("studentNameBengali")} placeholder="ছাত্রের পুরো নাম বাংলায় লিখুন" />
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
              <input {...register("heightCm")} type="number" />
            </FormField>
            <FormField label="Weight (in KGs)" error={errors.weightKg?.message}>
              <input {...register("weightKg")} type="number" step="0.1" />
            </FormField>
            <FormField label="Birth Registration Number" error={errors.birthRegistrationNo?.message}>
              <input {...register("birthRegistrationNo")} />
            </FormField>
            <FormField label="Identification Mark" error={errors.identificationMark?.message}>
              <input {...register("identificationMark")} />
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
              <input {...register("minorityGroup")} />
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
            <FormField label="BPL Status (বিপিএল তালিকাভুক্ত কি?)" error={errors.bplStatus?.message}>
              <Controller
                control={control}
                name="bplStatus"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? "NO"}
                    onChange={field.onChange}
                    options={[
                      { label: "No (না)", value: "NO" },
                      { label: "Yes (হ্যাঁ)", value: "YES" },
                    ]}
                  />
                )}
              />
            </FormField>
            {watchBplStatus === "YES" && (
              <FormField label="BPL Card Number (বিপিএল কার্ড নং)" error={errors.bplNo?.message}>
                <input {...register("bplNo")} placeholder="Enter BPL card number" />
              </FormField>
            )}
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
                  <input {...register("impairmentType")} />
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
                  <>
                    <FormField label="Disability Certificate Number (সার্টিফিকেট নম্বর)" error={errors.disabilityCertificateNo?.message}>
                      <input {...register("disabilityCertificateNo")} placeholder="Enter certificate number" />
                    </FormField>
                    <FormField label="Disability Percentage (%)" error={errors.disabilityPercentage?.message}>
                      <input {...register("disabilityPercentage")} type="number" />
                    </FormField>
                  </>
                )}
              </>
            )}
            <FormField label="Specific Learning Disability (SLD)" error={errors.sldType?.message}>
              <input {...register("sldType")} />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Section 4: Family & Contact */}
        <FormSection title="D. Family & Contacts">
          <FormGrid>
            <FormField label="Father's Name *" error={errors.fatherName?.message}>
              <input {...register("fatherName")} />
            </FormField>
            <FormField label="Father's Name in Bengali (পিতার নাম বাংলায়)" error={errors.fatherNameBengali?.message}>
              <input {...register("fatherNameBengali")} placeholder="পিতার পুরো নাম বাংলায়" />
            </FormField>
            <FormField label="Father's Occupation" error={errors.fatherOccupation?.message}>
              <Controller
                control={control}
                name="fatherOccupation"
                render={({ field }) => {
                  const matched = OCCUPATION_OPTIONS.find(
                    (o) => o.value.toLowerCase() === (field.value || "").toLowerCase()
                  );
                  const options = field.value && !matched
                    ? [{ label: field.value, value: field.value }, ...OCCUPATION_OPTIONS]
                    : OCCUPATION_OPTIONS;
                  return (
                    <CustomSelect
                      value={matched ? matched.value : (field.value ?? "")}
                      onChange={field.onChange}
                      placeholder="Select father's occupation..."
                      options={options}
                    />
                  );
                }}
              />
            </FormField>
            <FormField label="Mother's Name *" error={errors.motherName?.message}>
              <input {...register("motherName")} />
            </FormField>
            <FormField label="Mother's Name in Bengali (মাতার নাম বাংলায়)" error={errors.motherNameBengali?.message}>
              <input {...register("motherNameBengali")} placeholder="মাতার পুরো নাম বাংলায়" />
            </FormField>
            <FormField label="Mother's Occupation" error={errors.motherOccupation?.message}>
              <Controller
                control={control}
                name="motherOccupation"
                render={({ field }) => {
                  const matched = OCCUPATION_OPTIONS.find(
                    (o) => o.value.toLowerCase() === (field.value || "").toLowerCase()
                  );
                  const options = field.value && !matched
                    ? [{ label: field.value, value: field.value }, ...OCCUPATION_OPTIONS]
                    : OCCUPATION_OPTIONS;
                  return (
                    <CustomSelect
                      value={matched ? matched.value : (field.value ?? "")}
                      onChange={field.onChange}
                      placeholder="Select mother's occupation..."
                      options={options}
                    />
                  );
                }}
              />
            </FormField>
            <FormField label="Guardian's Name" error={errors.guardianName?.message}>
              <input {...register("guardianName")} />
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
                render={({ field }) => {
                  const cleanVal = field.value?.replace(/\s*\([^)]*\)/g, "").trim();
                  const matched = OCCUPATION_OPTIONS.find(
                    (o) =>
                      o.value.toLowerCase() === field.value?.toLowerCase() ||
                      (cleanVal && o.value.toLowerCase() === cleanVal.toLowerCase())
                  );
                  const options = field.value && !matched
                    ? [{ label: cleanVal || field.value, value: field.value }, ...OCCUPATION_OPTIONS]
                    : OCCUPATION_OPTIONS;
                  return (
                    <CustomSelect
                      value={matched ? matched.value : (field.value ?? "")}
                      onChange={field.onChange}
                      placeholder="Select guardian's occupation..."
                      options={options}
                    />
                  );
                }}
              />
            </FormField>
            <FormField label="Guardian's Qualification" error={errors.guardianQualification?.message}>
              <Controller
                control={control}
                name="guardianQualification"
                render={({ field }) => {
                  const cleanVal = field.value?.replace(/\s*\([^)]*\)/g, "").trim();
                  const matched = QUALIFICATION_OPTIONS.find(
                    (o) =>
                      o.value.toLowerCase() === field.value?.toLowerCase() ||
                      (cleanVal && o.value.toLowerCase() === cleanVal.toLowerCase())
                  );
                  const options = field.value && !matched
                    ? [{ label: cleanVal || field.value, value: field.value }, ...QUALIFICATION_OPTIONS]
                    : QUALIFICATION_OPTIONS;
                  return (
                    <CustomSelect
                      value={matched ? matched.value : (field.value ?? "")}
                      onChange={field.onChange}
                      placeholder="Select qualification..."
                      options={options}
                    />
                  );
                }}
              />
            </FormField>
            <FormField label="Annual Family Income" error={errors.annualFamilyIncome?.message}>
              <input {...register("annualFamilyIncome")} type="number" />
            </FormField>
            <FormField label="Primary Contact Mobile *" error={errors.studentContact?.message}>
              <input {...register("studentContact")} />
            </FormField>
            <FormField label="Guardian Contact No" error={errors.altMobile?.message}>
              <input {...register("altMobile")} placeholder="10-digit guardian mobile" />
            </FormField>
            <FormField label="Contact Email ID" error={errors.email?.message}>
              <input {...register("email")} type="email" />
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

        {/* Section 5: Enrolment Details */}
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
                    options={["A", "B", "C", "D"].map((s) => ({ label: `Section ${s}`, value: s }))}
                  />
                )}
              />
            </FormField>
            <FormField label="Present Roll Number *" error={errors.presentRoll?.message}>
              <input {...register("presentRoll")} type="number" />
            </FormField>
            <FormField label="Admission Number" error={errors.admissionNo?.message}>
              <input {...register("admissionNo")} />
            </FormField>
            <FormField label="Admission Year *" error={errors.admissionYear?.message}>
              <input {...register("admissionYear")} type="number" />
            </FormField>
            <FormField label="Admission Date" error={errors.admissionDate?.message}>
              <input {...register("admissionDate")} type="date" />
            </FormField>
            <FormField label="Admission Type" error={errors.admissionType?.message}>
              <input {...register("admissionType")} />
            </FormField>
            <FormField label="Academic Year" error={errors.academicYear?.message}>
              <input {...register("academicYear")} />
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
                <FormField label="Academic Stream (HS only)" error={errors.academicStream?.message}>
                  <Controller
                    control={control}
                    name="academicStream"
                    render={({ field }) => {
                      const options = field.value && !STREAM_OPTIONS.some(o => o.value.toLowerCase() === field.value?.toLowerCase())
                        ? [{ label: field.value, value: field.value }, ...STREAM_OPTIONS]
                        : STREAM_OPTIONS;
                      return (
                        <CustomSelect
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="Select stream..."
                          options={options}
                        />
                      );
                    }}
                  />
                </FormField>
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
            {(() => {
              const normalizedClass = (watchPresentClass || "").toUpperCase().replace(/^CLASS\s*/i, "").trim();
              const isHs = ["XI", "11", "XII", "12"].includes(normalizedClass);
              if (!isHs) return null;
              return (
                <div className="sm:col-span-2 md:col-span-3 space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-semibold text-foreground">Madhyamik (Class 10) Examination Marks (মাধ্যমিক পরীক্ষার প্রাপ্ত নম্বর)</p>
                    {madhyamikTotal > 0 && (
                      <div className="flex items-center gap-3 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold">
                        <span>Total: {madhyamikTotal} / 700</span>
                        <span>Percentage: {madhyamikPercent}%</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    <FormField label="1. Bengali" error={errors.bengaliMarks?.message}>
                      <input {...register("bengaliMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                    </FormField>
                    <FormField label="2. English" error={errors.englishMarks?.message}>
                      <input {...register("englishMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                    </FormField>
                    <FormField label="3. Mathematics" error={errors.mathMarks?.message}>
                      <input {...register("mathMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                    </FormField>
                    <FormField label="4. Life Sci" error={errors.lifeSciMarks?.message}>
                      <input {...register("lifeSciMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                    </FormField>
                    <FormField label="5. Phys Sci" error={errors.phySciMarks?.message}>
                      <input {...register("phySciMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                    </FormField>
                    <FormField label="6. History" error={errors.historyMarks?.message}>
                      <input {...register("historyMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                    </FormField>
                    <FormField label="7. Geography" error={errors.geoMarks?.message}>
                      <input {...register("geoMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                    </FormField>
                  </div>
                </div>
              );
            })()}
          </FormGrid>

          <p className="text-xs font-semibold text-muted-foreground pt-3 border-t">Languages & Subjects (Comma Separated)</p>
          <FormGrid>
            <FormField label="Languages Studied" error={errors.languageGroupInput?.message}>
              <input {...register("languageGroupInput")} />
            </FormField>
            <FormField label="Mandatory Subjects" error={errors.mandatorySubjectsInput?.message}>
              <input {...register("mandatorySubjectsInput")} />
            </FormField>
            <FormField label="Additional Subjects" error={errors.additionalSubjectsInput?.message}>
              <input {...register("additionalSubjectsInput")} />
            </FormField>
            <FormField label="Co-Curricular Subjects" error={errors.coCurricularSubjectsInput?.message}>
              <input {...register("coCurricularSubjectsInput")} />
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
              <input {...register("previousStatus")} />
            </FormField>
            <FormField label="Previous Grade/Class" error={errors.previousClass?.message}>
              <input {...register("previousClass")} />
            </FormField>
            <FormField label="Previous Section" error={errors.previousSection?.message}>
              <input {...register("previousSection")} />
            </FormField>
            <FormField label="Previous Roll No" error={errors.previousRollNo?.message}>
              <input {...register("previousRollNo")} type="number" />
            </FormField>
            <FormField label="Previous Stream" error={errors.previousStream?.message}>
              <Controller
                control={control}
                name="previousStream"
                render={({ field }) => {
                  const options = field.value && !STREAM_OPTIONS.some(o => o.value.toLowerCase() === field.value?.toLowerCase())
                    ? [{ label: field.value, value: field.value }, ...STREAM_OPTIONS]
                    : STREAM_OPTIONS;
                  return (
                    <CustomSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Select stream..."
                      options={options}
                    />
                  );
                }}
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
              <input {...register("previousResult")} />
            </FormField>
            <FormField label="Marks Obtained (%)" error={errors.previousMarksPercent?.message}>
              <input {...register("previousMarksPercent")} type="number" />
            </FormField>
            <FormField label="Days Attended" error={errors.previousDaysAttended?.message}>
              <input {...register("previousDaysAttended")} type="number" />
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
                <input {...register("rteAmountClaimed")} type="number" />
              </FormField>
            )}
          </FormGrid>
        </FormSection>

        {/* Section 7: Facilities Profile */}
        <FormSection title="G. Facilities Profile & Extras">
          <FormGrid>
            <FormField label="General Facilities (Comma Separated)" error={errors.facilitiesProvidedInput?.message}>
              <input {...register("facilitiesProvidedInput")} />
            </FormField>
            <FormField label="CWSN Facilities (Comma Separated)" error={errors.cwsnFacilitiesInput?.message}>
              <input {...register("cwsnFacilitiesInput")} />
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
              <input {...register("distanceToSchool")} type="number" step="0.1" />
            </FormField>
            <FormField label="Highest Parent Education Level" error={errors.highestEducationParents?.message}>
              <input {...register("highestEducationParents")} />
            </FormField>
            <FormField label="Competitions/Olympiads (Comma Separated)" error={errors.competitionsOlympiadsInput?.message}>
              <input {...register("competitionsOlympiadsInput")} />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Section 8: Bank Details */}
        <FormSection title="H. Bank Details">
          <FormGrid>
            <FormField label="Bank Name (ব্যাংকের নাম)" error={errors.bankName?.message}>
              <input {...register("bankName")} placeholder="যেমন: State Bank of India" />
            </FormField>
            <FormField label="Branch Name (শাখার নাম)" error={errors.bankBranch?.message}>
              <input {...register("bankBranch")} placeholder="যেমন: Bongaon Branch" />
            </FormField>
          </FormGrid>
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
              <input {...register("pen")} />
            </FormField>
            <FormField label="DISE Code" error={errors.diseCode?.message}>
              <input {...register("diseCode")} />
            </FormField>
            <FormField label="Health ID" error={errors.healthId?.message}>
              <input {...register("healthId")} />
            </FormField>
            <FormField label="Student Unique Code" error={errors.studentUniqueCode?.message}>
              <input {...register("studentUniqueCode")} />
            </FormField>
            {(watchGender === "Female" || Boolean(student?.kanyashreeId)) && (
              <FormField label="Kanyashree ID / Applicant ID" error={errors.kanyashreeId?.message}>
                <input {...register("kanyashreeId")} placeholder="e.g. 19190100101150000001" />
              </FormField>
            )}
            <FormField label="Aadhaar Available? (Yes/No)">
              <CustomSelect
                value={hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")}
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
                maxLength={12}
                placeholder={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "Yes" ? "Enter 12-digit Aadhaar Number" : "Not Available"}
                disabled={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No"}
                className={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
              />
            </FormField>
            <FormField label="Name (as per Aadhaar)" error={errors.nameAsPerAadhaar?.message}>
              <input
                {...register("nameAsPerAadhaar")}
                placeholder={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "Yes" ? "Exact name on Aadhaar" : "Not Available"}
                disabled={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No"}
                className={(hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")) === "No" ? "bg-muted/40 cursor-not-allowed text-muted-foreground" : ""}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mutation.isPending ? "Saving changes…" : "Save Student"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
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
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
      <p className="text-sm font-semibold border-b pb-3 text-foreground">{title}</p>
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
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
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </label>
      <div
        className={`[&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:bg-background [&>input]:px-3.5 [&>input]:py-2 [&>input]:text-base sm:[&>input]:text-sm [&>input]:h-11 sm:[&>input]:h-9 [&>input]:outline-none [&>input]:focus:ring-2 [&>input]:focus:ring-ring
          [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:bg-background [&>select]:px-3.5 [&>select]:py-2 [&>select]:text-base sm:[&>select]:text-sm [&>select]:h-11 sm:[&>select]:h-9 [&>select]:outline-none [&>select]:focus:ring-2 [&>select]:focus:ring-ring
          [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:bg-background [&>textarea]:px-3.5 [&>textarea]:py-2 [&>textarea]:text-base sm:[&>textarea]:text-sm [&>textarea]:outline-none [&>textarea]:focus:ring-2 [&>textarea]:focus:ring-ring [&>textarea]:resize-none
          ${error ? "[&>input]:border-destructive [&>select]:border-destructive [&>textarea]:border-destructive" : ""}`}
      >
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
