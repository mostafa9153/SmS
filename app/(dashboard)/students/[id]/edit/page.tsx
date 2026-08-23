"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentById, updateStudent } from "@/lib/data/students";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Student } from "@/lib/types";

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

  // Facilities & Co-curricular
  facilitiesProvidedInput: z.string().optional(),
  cwsnFacilitiesInput: z.string().optional(),
  competitionsOlympiadsInput: z.string().optional(),
  ncc: z.coerce.boolean().optional(),
  nss: z.coerce.boolean().optional(),
  scoutsGuides: z.coerce.boolean().optional(),
  distanceToSchool: z.coerce.number().optional(),
  highestEducationParents: z.string().optional(),

  // Bank
  bankIfsc: z.string().optional(),
  bankAccountNo: z.string().optional(),

  // Identifiers
  pen: z.string().optional(),
  diseCode: z.string().optional(),
  healthId: z.string().optional(),
  studentUniqueCode: z.string().optional(),
  aadhaar: z.string().optional().refine((v) => !v || /^\d{12}$/.test(v), "Aadhaar must be 12 digits"),
  nameAsPerAadhaar: z.string().optional(),
});

type FormData = z.infer<typeof studentSchema>;

const CLASSES = ["V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

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
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(studentSchema),
    values: student
      ? {
          name: student.name,
          schoolId: student.schoolId,
          dob: student.dob,
          gender: student.gender,
          motherTongue: student.motherTongue ?? "",
          religion: student.religion ?? "",
          indianNationality: student.indianNationality !== false,
          bloodGroup: student.bloodGroup ?? "",
          heightCm: student.heightCm,
          weightKg: student.weightKg,
          birthRegistrationNo: student.birthRegistrationNo ?? "",
          identificationMark: student.identificationMark ?? "",

          socialCategory: student.socialCategory ?? "",
          minorityGroup: student.minorityGroup ?? "",
          isBpl: !!student.isBpl,
          isAay: !!student.isAay,
          isEws: !!student.isEws,
          isOutOfSchool: !!student.isOutOfSchool,
          mainstreamedDate: student.mainstreamedDate ?? "",

          isCwsn: !!student.isCwsn,
          impairmentType: student.impairmentType ?? "",
          hasDisabilityCertificate: !!student.hasDisabilityCertificate,
          disabilityPercentage: student.disabilityPercentage,
          sldType: student.sldType ?? "",

          fatherName: student.fatherName,
          motherName: student.motherName,
          guardianName: student.guardianName ?? "",
          relationshipWithGuardian: student.relationshipWithGuardian ?? "",
          guardianQualification: student.guardianQualification ?? "",
          annualFamilyIncome: student.annualFamilyIncome,

          studentContact: student.studentContact ?? "",
          altMobile: student.altMobile ?? "",
          email: student.email ?? "",
          address: student.address ?? "",
          pincode: student.pincode ?? "",

          presentClass: student.presentClass,
          presentSection: student.presentSection,
          presentRoll: student.presentRoll,
          admissionNo: student.admissionNo ?? "",
          admissionDate: student.admissionDate ?? "",
          admissionType: student.admissionType ?? "",
          academicYear: student.academicYear ?? "",
          mediumOfInstruction: student.mediumOfInstruction ?? "",
          presentClassAdmissionDate: student.presentClassAdmissionDate ?? "",
          admissionYear: student.admissionYear,
          academicStream: student.academicStream ?? "",

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

          bankIfsc: student.bankIfsc ?? "",
          bankAccountNo: student.bankAccountNo ?? "",

          pen: student.pen ?? "",
          diseCode: student.diseCode ?? "",
          healthId: student.healthId ?? "",
          studentUniqueCode: student.studentUniqueCode ?? "",
          aadhaar: student.aadhaar ?? "",
          nameAsPerAadhaar: student.nameAsPerAadhaar ?? "",
        }
      : undefined,
  });

  const isOutOfSchoolChecked = watch("isOutOfSchool");
  const isCwsnChecked = watch("isCwsn");
  const hasDisabilityCertChecked = watch("hasDisabilityCertificate");
  const rteSection12CChecked = watch("rteSection12C");
  const [hasAadhaarVal, setHasAadhaarVal] = useState<string | null>(null);

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
      router.push(`/students/${id}`);
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Section 1: Demographics */}
        <FormSection title="A. Student Demographics">
          <FormGrid>
            <FormField label="Full Name *" error={errors.name?.message}>
              <input {...register("name")} />
            </FormField>
            <FormField label="School ID *" error={errors.schoolId?.message}>
              <input {...register("schoolId")} disabled className="opacity-60 bg-muted cursor-not-allowed" />
            </FormField>
            <FormField label="Date of Birth *" error={errors.dob?.message}>
              <input {...register("dob")} type="date" />
            </FormField>
            <FormField label="Gender *" error={errors.gender?.message}>
              <select {...register("gender")}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            <FormField label="Mother Tongue" error={errors.motherTongue?.message}>
              <input {...register("motherTongue")} />
            </FormField>
            <FormField label="Religion" error={errors.religion?.message}>
              <input {...register("religion")} />
            </FormField>
            <FormField label="Indian Nationality?" error={errors.indianNationality?.message}>
              <select {...register("indianNationality")}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FormField>
            <FormField label="Blood Group" error={errors.bloodGroup?.message}>
              <select {...register("bloodGroup")}>
                <option value="">Select...</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
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
              <select {...register("socialCategory")}>
                <option value="">Select...</option>
                <option value="General">General</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </FormField>
            <FormField label="Minority Group" error={errors.minorityGroup?.message}>
              <input {...register("minorityGroup")} />
            </FormField>
            <FormField label="BPL Beneficiary?" error={errors.isBpl?.message}>
              <select {...register("isBpl")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
            <FormField label="AAY (Antyodaya Anna Yojana)?" error={errors.isAay?.message}>
              <select {...register("isAay")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
            <FormField label="EWS / Disadvantaged Group?" error={errors.isEws?.message}>
              <select {...register("isEws")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
            <FormField label="Out-of-School Child?" error={errors.isOutOfSchool?.message}>
              <select {...register("isOutOfSchool")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
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
              <select {...register("isCwsn")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
            {isCwsnChecked && (
              <>
                <FormField label="Type of Impairment" error={errors.impairmentType?.message}>
                  <input {...register("impairmentType")} />
                </FormField>
                <FormField label="Disability Certificate?" error={errors.hasDisabilityCertificate?.message}>
                  <select {...register("hasDisabilityCertificate")}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </FormField>
                {hasDisabilityCertChecked && (
                  <FormField label="Disability Percentage (%)" error={errors.disabilityPercentage?.message}>
                    <input {...register("disabilityPercentage")} type="number" />
                  </FormField>
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
            <FormField label="Mother's Name *" error={errors.motherName?.message}>
              <input {...register("motherName")} />
            </FormField>
            <FormField label="Guardian's Name" error={errors.guardianName?.message}>
              <input {...register("guardianName")} />
            </FormField>
            <FormField label="Relationship with Guardian" error={errors.relationshipWithGuardian?.message}>
              <input {...register("relationshipWithGuardian")} />
            </FormField>
            <FormField label="Guardian's Qualification" error={errors.guardianQualification?.message}>
              <input {...register("guardianQualification")} />
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
            <FormField label="Address" error={errors.address?.message} full>
              <textarea {...register("address")} rows={2} />
            </FormField>
            <FormField label="Pincode" error={errors.pincode?.message}>
              <input {...register("pincode")} maxLength={6} />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Section 5: Enrolment Details */}
        <FormSection title="E. Enrolment & Academic Details">
          <FormGrid>
            <FormField label="Present Class *" error={errors.presentClass?.message}>
              <select {...register("presentClass")}>
                <option value="">Select class...</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Present Section *" error={errors.presentSection?.message}>
              <select {...register("presentSection")}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
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
              <input {...register("mediumOfInstruction")} />
            </FormField>
            <FormField label="Present Class Admission Date" error={errors.presentClassAdmissionDate?.message}>
              <input {...register("presentClassAdmissionDate")} type="date" />
            </FormField>
            <FormField label="Academic Stream (HS only)" error={errors.academicStream?.message}>
              <input {...register("academicStream")} />
            </FormField>
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
              <input {...register("previousStream")} />
            </FormField>
            <FormField label="Appeared for Exams?" error={errors.previousAppearedForExams?.message}>
              <select {...register("previousAppearedForExams")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
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
              <select {...register("rteSection12C")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
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
              <select {...register("ncc")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
            <FormField label="NSS Member?" error={errors.nss?.message}>
              <select {...register("nss")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </FormField>
            <FormField label="Scouts and Guides?" error={errors.scoutsGuides?.message}>
              <select {...register("scoutsGuides")}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
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

        {/* Section 8: Bank Account Details */}
        <FormSection title="H. Bank Details">
          <FormGrid>
            <FormField label="Bank Account Number" error={errors.bankAccountNo?.message}>
              <input {...register("bankAccountNo")} />
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
            <FormField label="Aadhaar Available? (Yes/No)">
              <select
                value={hasAadhaarVal ?? (watch("aadhaar") ? "Yes" : "No")}
                onChange={(e) => {
                  const val = e.target.value;
                  setHasAadhaarVal(val);
                  if (val === "No") {
                    setValue("aadhaar", "");
                    setValue("nameAsPerAadhaar", "");
                  }
                }}
              >
                <option value="Yes">Yes (Aadhaar Available)</option>
                <option value="No">No (Aadhaar Not Available)</option>
              </select>
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
