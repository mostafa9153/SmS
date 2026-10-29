"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentById, updateStudent } from "@/lib/data/students";
import { showToast } from "@/components/ui/toast-banner";
import { getSchoolStreamOptions } from "@/lib/utils/school-profile";
import { useSchoolProfile } from "@/lib/hooks/use-school-profile";
import { toastWithUndo } from "@/lib/undo/client";
import { FormData, studentSchema } from "@/components/students/edit/schema";

export function useEditStudent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useSchoolProfile();
  const streamOptions = getSchoolStreamOptions(profile);

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
  } = useForm<z.input<typeof studentSchema>, unknown, FormData>({
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

  const isOutOfSchoolChecked = Boolean(watch("isOutOfSchool"));
  const watchSocialCategory = watch("socialCategory");
  const watchBplStatus = watch("bplStatus");
  const isCwsnChecked = Boolean(watch("isCwsn"));
  const hasDisabilityCertChecked = watch("hasDisabilityCertificate");
  const rteSection12CChecked = Boolean(watch("rteSection12C"));
  const watchPresentClass = watch("presentClass");
  const watchAcademicStream = watch("academicStream");
  const watchAdmissionYear = watch("admissionYear") as number | undefined;
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
    onSuccess: ({ undoId }) => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toastWithUndo("Student profile updated", undoId, () => {
        queryClient.invalidateQueries({ queryKey: ["student", id] });
        queryClient.invalidateQueries({ queryKey: ["students"] });
      });
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

  return {
    control,
    errors,
    handleSubmit,
    hasAadhaarVal,
    hasDisabilityCertChecked,
    isCwsnChecked,
    isLoading,
    isOutOfSchoolChecked,
    madhyamikPercent,
    madhyamikTotal,
    mutation,
    onFormError,
    onSubmit,
    register,
    router,
    rteSection12CChecked,
    setHasAadhaarVal,
    setValue,
    streamOptions,
    student,
    watch,
    watchAcademicStream,
    watchAdmissionNo,
    watchAdmissionYear,
    watchBplStatus,
    watchGender,
    watchPresentClass,
    watchSocialCategory,
  };
}

export type EditStudentState = ReturnType<typeof useEditStudent>;
