"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { History } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import type { AdmissionFormState } from "./use-admission-form";

export function PreviousSchoolSection({ form }: { form: AdmissionFormState }) {
  const { control, handleSaveAndNext, isCustomSchool, isSectionUnlocked, openSections, register, savedSections, schoolPresets, setIsCustomSchool, setValue, toggleSection, watchPreviousSchool } = form;
  return (
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
  );
}
