"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { MEDIUM_OF_INSTRUCTION_OPTIONS } from "@/lib/constants/student-options";
import { getDynamicSectionsForClassAndStream } from "@/lib/utils/school-profile";
import { FormField, FormGrid, FormSection } from "@/components/forms/form-layout";
import { CLASSES } from "@/components/students/form/constants";
import type { EditStudentState } from "./use-edit-student";

export function EnrolmentSection({ edit }: { edit: EditStudentState }) {
  const { control, errors, madhyamikPercent, madhyamikTotal, register, streamOptions, watchAcademicStream, watchPresentClass } = edit;
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
            render={({ field }) => {
              const normalizedClass = (watchPresentClass || "").toUpperCase().replace(/^CLASS\s*/i, "").replace(/^STD\s*/i, "").trim();
              const isHs = ["XI", "11", "XII", "12"].includes(normalizedClass);
              const availableSections = getDynamicSectionsForClassAndStream(watchPresentClass || "V", isHs ? watchAcademicStream : undefined);
              const options = availableSections.map((s) => ({ label: `Section ${s}`, value: s }));
              return (
                <CustomSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Select section..."
                  options={options}
                />
              );
            }}
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
                  const options = field.value && !streamOptions.some(o => o.value.toLowerCase() === field.value?.toLowerCase())
                    ? [{ label: field.value, value: field.value }, ...streamOptions]
                    : streamOptions;
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
  );
}
