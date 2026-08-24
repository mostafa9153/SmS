"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudent } from "@/lib/data/students";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Student } from "@/lib/types";
import { CustomSelect } from "@/components/ui/custom-select";

const studentSchema = z.object({
  // Identity
  name: z.string().min(2, "Name is required"),
  schoolId: z
    .string()
    .min(1, "School ID is required")
    .regex(
      /^[A-Z]+\/\d{4}\/\d{2}\/[A-Z]+\/[A-Z]+\/\d{3}$/,
      "School ID must match format: MHS/YYYY/NN/CLASS/SECTION/NNN"
    ),
  dob: z.string().refine((v) => {
    const d = new Date(v);
    return !isNaN(d.getTime()) && d < new Date();
  }, "Date of birth must be a valid past date"),
  gender: z.enum(["Male", "Female", "Other"]),
  motherTongue: z.string().optional(),
  religion: z.string().optional(),
  indianNationality: z.coerce.boolean().optional(),
  bloodGroup: z.string().optional(),
  heightCm: z.coerce.number().optional(),
  weightKg: z.coerce.number().optional(),
  birthRegistrationNo: z.string().optional(),
  identificationMark: z.string().optional(),

  // Social & Categories
  socialCategory: z.string().optional(),
  minorityGroup: z.string().optional(),
  isBpl: z.coerce.boolean().optional(),
  isAay: z.coerce.boolean().optional(),
  isEws: z.coerce.boolean().optional(),
  isOutOfSchool: z.coerce.boolean().optional(),
  mainstreamedDate: z.string().optional(),

  // CWSN
  isCwsn: z.coerce.boolean().optional(),
  impairmentType: z.string().optional(),
  hasDisabilityCertificate: z.coerce.boolean().optional(),
  disabilityPercentage: z.coerce.number().optional(),
  sldType: z.string().optional(),

  // Family Info
  fatherName: z.string().min(2, "Father's name is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  guardianName: z.string().optional(),
  relationshipWithGuardian: z.string().optional(),
  guardianQualification: z.string().optional(),
  annualFamilyIncome: z.coerce.number().optional(),
  
  // Contact
  studentContact: z.string().optional().refine((v) => !v || /^\d{10}$/.test(v), "Contact must be 10 digits"),
  altMobile: z.string().optional().refine((v) => !v || /^\d{10}$/.test(v), "Contact must be 10 digits"),
  email: z.string().optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email"),
  address: z.string().optional(),
  pincode: z.string().optional().refine((v) => !v || /^\d{6}$/.test(v), "Pincode must be 6 digits"),

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
  admissionYear: z.coerce.number().int().min(2000).max(new Date().getFullYear()),
  academicStream: z.string().optional(),

  // Language studied (comma separated)
  languageGroupInput: z.string().optional(),
  mandatorySubjectsInput: z.string().optional(),
  additionalSubjectsInput: z.string().optional(),
  coCurricularSubjectsInput: z.string().optional(),

  // Previous Academic Year Info
  previousStatus: z.string().optional(),
  previousClass: z.string().optional(),
  previousSection: z.string().optional(),
  previousStream: z.string().optional(),
  previousRollNo: z.coerce.number().optional(),
  previousAppearedForExams: z.coerce.boolean().optional(),
  previousResult: z.string().optional(),
  previousMarksPercent: z.coerce.number().optional(),
  previousDaysAttended: z.coerce.number().optional(),

  // RTE
  rteSection12C: z.coerce.boolean().optional(),
  rteAmountClaimed: z.coerce.number().optional(),

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
  distanceToSchool: z.coerce.number().optional(),
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
  aadhaar: z.string().optional().refine((v) => !v || /^\d{12}$/.test(v), "Aadhaar must be 12 digits"),
  nameAsPerAadhaar: z.string().optional(),
});

type FormData = z.infer<typeof studentSchema>;

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export default function AddStudentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      gender: "Male",
      indianNationality: true,
      isBpl: false,
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
    },
  });

  const isOutOfSchoolChecked = watch("isOutOfSchool");
  const isCwsnChecked = watch("isCwsn");
  const hasDisabilityCertChecked = watch("hasDisabilityCertificate");
  const rteSection12CChecked = watch("rteSection12C");
  const [hasAadhaarVal, setHasAadhaarVal] = useState("Yes");

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

      return createStudent({
        ...rest,
        languageGroup,
        mandatorySubjects,
        additionalSubjects,
        coCurricularSubjects,
        facilitiesProvided,
        cwsnFacilities,
        competitionsOlympiads,
        currentStatus: "Continuing",
        academicHistory: [
          {
            year: data.admissionYear,
            class: data.presentClass,
            section: data.presentSection,
            roll: data.presentRoll,
            status: "Continuing",
          },
        ],
      } as any);
    },
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      router.push(`/students/${student.id}`);
    },
  });

  function onSubmit(data: FormData) {
    mutation.mutate(data);
  }

  return (
    <div className="p-3.5 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Section 1: Demographics */}
        <FormSection title="A. Student Demographics">
          <FormGrid>
            <FormField label="Full Name *" error={errors.name?.message}>
              <input {...register("name")} placeholder="e.g. Arjun Mondal" />
            </FormField>
            <FormField label="School ID *" error={errors.schoolId?.message}>
              <input {...register("schoolId")} placeholder="e.g. MHS/2025/01/V/A/001" />
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
              <input {...register("motherTongue")} placeholder="e.g. Bengali" />
            </FormField>
            <FormField label="Religion" error={errors.religion?.message}>
              <input {...register("religion")} placeholder="e.g. Hinduism" />
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
                    ]}
                  />
                )}
              />
            </FormField>
            <FormField label="Minority Group" error={errors.minorityGroup?.message}>
              <input {...register("minorityGroup")} placeholder="e.g. Muslim, Christian, None" />
            </FormField>
            <FormField label="BPL Beneficiary?" error={errors.isBpl?.message}>
              <Controller
                control={control}
                name="isBpl"
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
            <FormField label="Mother's Name *" error={errors.motherName?.message}>
              <input {...register("motherName")} placeholder="e.g. Sujata Mondal" />
            </FormField>
            <FormField label="Guardian's Name" error={errors.guardianName?.message}>
              <input {...register("guardianName")} placeholder="e.g. Ramesh Mondal" />
            </FormField>
            <FormField label="Relationship with Guardian" error={errors.relationshipWithGuardian?.message}>
              <input {...register("relationshipWithGuardian")} placeholder="e.g. Uncle" />
            </FormField>
            <FormField label="Guardian's Qualification" error={errors.guardianQualification?.message}>
              <input {...register("guardianQualification")} placeholder="e.g. Graduate" />
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
            <FormField label="Address" error={errors.address?.message} full>
              <textarea {...register("address")} rows={2} placeholder="Village, PO, District, State" />
            </FormField>
            <FormField label="Pincode" error={errors.pincode?.message}>
              <input {...register("pincode")} placeholder="6-digit PIN" maxLength={6} />
            </FormField>
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
              <input {...register("mediumOfInstruction")} placeholder="e.g. Bengali, English" />
            </FormField>
            <FormField label="Present Class Admission Date" error={errors.presentClassAdmissionDate?.message}>
              <input {...register("presentClassAdmissionDate")} type="date" />
            </FormField>
            <FormField label="Academic Stream (HS only)" error={errors.academicStream?.message}>
              <input {...register("academicStream")} placeholder="e.g. Science, Arts" />
            </FormField>
          </FormGrid>

          <p className="text-xs font-semibold text-muted-foreground pt-3 border-t">Languages & Subjects (Comma Separated)</p>
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
              <input {...register("previousStream")} placeholder="e.g. General" />
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

        {/* Section 8: Bank Account Details */}
        <FormSection title="H. Bank Details">
          <FormGrid>
            <FormField label="Bank Account Number" error={errors.bankAccountNo?.message}>
              <input {...register("bankAccountNo")} placeholder="A/C Number" />
            </FormField>
            <FormField label="Bank IFSC Code" error={errors.bankIfsc?.message}>
              <input {...register("bankIfsc")} placeholder="e.g. SBIN0001234" maxLength={11} style={{ textTransform: "uppercase" }} />
            </FormField>
          </FormGrid>
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
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mutation.isPending ? "Saving…" : "Add Student"}
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
        className={`[&>input]:w-full [&>input]:rounded-md [&>input]:border [&>input]:bg-background [&>input]:px-3 [&>input]:py-1.5 [&>input]:text-sm [&>input]:outline-none [&>input]:focus:ring-2 [&>input]:focus:ring-ring
          [&>select]:w-full [&>select]:rounded-md [&>select]:border [&>select]:bg-background [&>select]:px-3 [&>select]:py-1.5 [&>select]:text-sm [&>select]:outline-none [&>select]:focus:ring-2 [&>select]:focus:ring-ring
          [&>textarea]:w-full [&>textarea]:rounded-md [&>textarea]:border [&>textarea]:bg-background [&>textarea]:px-3 [&>textarea]:py-1.5 [&>textarea]:text-sm [&>textarea]:outline-none [&>textarea]:focus:ring-2 [&>textarea]:focus:ring-ring [&>textarea]:resize-none
          ${error ? "[&>input]:border-destructive [&>select]:border-destructive [&>textarea]:border-destructive" : ""}`}
      >
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
