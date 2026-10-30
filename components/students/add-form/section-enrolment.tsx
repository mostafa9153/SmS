"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { MEDIUM_OF_INSTRUCTION_OPTIONS } from "@/lib/constants/student-options";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";
import { CLASSES, STREAM_OPTIONS } from "@/components/students/form/constants";
import type { StudentAddEditFormState } from "./use-student-add-edit-form";

export function EnrolmentSection({ sf }: { sf: StudentAddEditFormState }) {
  const { control, errors, register, watchPresentClass } = sf;
  return (
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
  );
}
