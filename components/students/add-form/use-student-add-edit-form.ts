"use client";

import type { StudentAddEditFormProps } from "./props";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudent } from "@/lib/data/students";
import { showToast } from "@/components/ui/toast-banner";
import { getSavedStudentEntryPresets, fetchStudentEntryPresetsFromDb, applyStudentEntryDefaults } from "@/lib/utils/student-entry-presets";
import { todayIST } from "@/lib/utils/date";
import { FormData, studentSchema } from "@/components/students/add-form/schema";

export function useStudentAddEditForm({
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
  } = useForm<z.input<typeof studentSchema>, unknown, FormData>({
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
      admissionDate: todayIST(),
      presentClassAdmissionDate: todayIST(),
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
  const isOutOfSchoolChecked = Boolean(watch("isOutOfSchool"));
  const watchSocialCategory = watch("socialCategory");
  const isCwsnChecked = Boolean(watch("isCwsn"));
  const hasDisabilityCertChecked = watch("hasDisabilityCertificate");
  const rteSection12CChecked = Boolean(watch("rteSection12C"));
  const watchPresentClass = watch("presentClass");
  const watchAdmissionYear = watch("admissionYear") as number | undefined;
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

  return {
    control,
    errors,
    handleSubmit,
    hasAadhaarVal,
    hasDisabilityCertChecked,
    isCwsnChecked,
    isEmbedded,
    isOutOfSchoolChecked,
    mutation,
    onSubmit,
    register,
    router,
    rteSection12CChecked,
    setHasAadhaarVal,
    setValue,
    submitButtonText,
    watch,
    watchAdmissionNo,
    watchAdmissionYear,
    watchGender,
    watchPresentClass,
    watchSocialCategory,
  };
}

export type StudentAddEditFormState = ReturnType<typeof useStudentAddEditForm>;
