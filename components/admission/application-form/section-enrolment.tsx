"use client";

import { Controller } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/ui/custom-select";
import { GraduationCap, Sparkles, X } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import { CLASSES } from "@/components/admission/application-form/constants";
import type { AdmissionFormState } from "./use-admission-form";

export function EnrolmentSection({ form }: { form: AdmissionFormState }) {
  const { addMandatorySubject, availableHsSubjects, control, errors, handleSaveAndNext, isClassXI, isSectionUnlocked, mandatoryList, mode, openSections, percentageMadhyamik, register, removeMandatorySubject, savedSections, toggleSection, totalMadhyamikMarks } = form;
  return (
    <CollapsibleCard
      id="E"
      title="E. Academic & Enrolment (ভর্তি ও শ্রেণি সংক্রান্ত তথ্য)"
      icon={<GraduationCap className="w-5 h-5 text-amber-600" />}
      isOpen={openSections.E}
      onToggle={() => toggleSection("E")}
      onSaveAndNext={() => handleSaveAndNext("E")}
      isSaved={!!savedSections.E}
      isLocked={!isSectionUnlocked("E")}
      badge={isClassXI ? "Class XI Special" : undefined}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <InputWrapper label="Present Class (যে শ্রেণিতে ভর্তি হচ্ছে) *" error={errors.presentClass?.message}>
            <Controller
              control={control}
              name="presentClass"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "V"}
                  onChange={field.onChange}
                  options={CLASSES.map((c) => ({ label: `Class ${c}`, value: c }))}
                />
              )}
            />
          </InputWrapper>

          {mode !== "public" && (
            <>
              <InputWrapper label="Present Section (সেকশন)">
                <Controller
                  control={control}
                  name="presentSection"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "A"}
                      onChange={field.onChange}
                      options={[
                        { label: "Section A", value: "A" },
                        { label: "Section B", value: "B" },
                        { label: "Section C", value: "C" },
                        { label: "Section D", value: "D" },
                      ]}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="Present Roll Number (রোল নম্বর)">
                <input {...register("presentRoll")} type="number" placeholder="রোল নং" />
              </InputWrapper>
            </>
          )}

          <InputWrapper label="Admission Type (ভর্তির ধরন) *" error={errors.admissionType?.message}>
            <Controller
              control={control}
              name="admissionType"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "New Admission / নতুন ভর্তি"}
                  onChange={field.onChange}
                  options={[
                    "New Admission / নতুন ভর্তি",
                    "Re-admission / পুনর্ভর্তি",
                    "Transfer Admission / টিসি দিয়ে ভর্তি",
                  ]}
                />
              )}
            />
          </InputWrapper>

          <InputWrapper label="Medium of Instruction (শিক্ষার মাধ্যম) *" error={errors.mediumOfInstruction?.message}>
            <Controller
              control={control}
              name="mediumOfInstruction"
              render={({ field }) => (
                <CustomSelect
                  value={field.value || "Bengali / বাংলা"}
                  onChange={field.onChange}
                  options={[
                    "Bengali / বাংলা",
                    "English / ইংরেজি",
                    "Urdu / উর্দু",
                    "Hindi / হিন্দি",
                  ]}
                />
              )}
            />
          </InputWrapper>
        </div>

        {/* DYNAMIC SECTION FOR CLASS XI ONLY */}
        {isClassXI && (
          <div className="mt-4 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800 pb-2.5">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Only for Class XI (একাদশ শ্রেণির মাধ্যমিক নম্বর ও বিষয় নির্বাচন)
                </h4>
              </div>
              {totalMadhyamikMarks > 0 && (
                <div className="flex gap-2">
                  <Badge className="bg-amber-600 text-white font-mono">
                    মোট: {totalMadhyamikMarks}/700
                  </Badge>
                  <Badge variant="outline" className="border-amber-400 font-mono font-bold">
                    {percentageMadhyamik}%
                  </Badge>
                </div>
              )}
            </div>

            {/* Board Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputWrapper label="Class 10 Board Reg No. (মাধ্যমিক রেজিস্ট্রেশন নং)">
                <input {...register("class10BoardRegNo")} placeholder="যেমন: 19180201004/2024" className="font-mono uppercase" />
              </InputWrapper>

              <InputWrapper label="Class 10 Board Roll No. (মাধ্যমিক রোল ও নম্বর)">
                <input {...register("class10BoardRollNo")} placeholder="যেমন: 123456N 0012" className="font-mono uppercase" />
              </InputWrapper>
            </div>

            {/* Madhyamik 7 Subjects Marks Table */}
            <div className="space-y-2">
              <p className="text-[13.5px] sm:text-[14px] font-bold text-foreground">মাধ্যমিক পরীক্ষায় প্রাপ্ত নম্বর (Marks out of 100):</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                <InputWrapper label="1. Bengali (বাংলা)">
                  <input {...register("bengaliMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                </InputWrapper>

                <InputWrapper label="2. English (ইংরেজি)">
                  <input {...register("englishMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                </InputWrapper>

                <InputWrapper label="3. Mathematics (গণিত)">
                  <input {...register("mathMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                </InputWrapper>

                <InputWrapper label="4. Life Sci (জীবন বিজ্ঞান)">
                  <input {...register("lifeSciMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                </InputWrapper>

                <InputWrapper label="5. Phys Sci (ভৌত বিজ্ঞান)">
                  <input {...register("phySciMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                </InputWrapper>

                <InputWrapper label="6. History (ইতিহাস)">
                  <input {...register("historyMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                </InputWrapper>

                <InputWrapper label="7. Geography (ভূগোল)">
                  <input {...register("geoMarks")} type="number" min="0" max="100" placeholder="0-100" className="text-center font-bold" />
                </InputWrapper>
              </div>
            </div>

            {/* Subjects in Class XI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200 dark:border-amber-800 items-start">
              {/* 1. Mandatory Subjects Multi-Picker */}
              <div className="space-y-1.5">
                <label className="block text-[13.5px] sm:text-[14.5px] font-bold text-foreground leading-snug">
                  Mandatory Subjects (বাধ্যতামূলক বিষয়সমূহ)
                </label>

                {/* Selected Subject Chips */}
                {mandatoryList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-background border rounded-xl min-h-[38px] items-center shadow-2xs">
                    {mandatoryList.map((subj, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-semibold border border-amber-300 dark:border-amber-800 animate-in zoom-in-95 duration-150"
                      >
                        {subj}
                        <button
                          type="button"
                          onClick={() => removeMandatorySubject(idx)}
                          className="hover:text-destructive hover:bg-amber-200 dark:hover:bg-amber-900 p-0.5 rounded-full transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown to add a subject from school presets */}
                <CustomSelect
                  placeholder="+ বিষয় নির্বাচন করুন (Select Mandatory Subject)..."
                  options={availableHsSubjects.map((s) => ({ label: s, value: s }))}
                  onChange={(val) => addMandatorySubject(String(val))}
                />
              </div>

              {/* 2. Additional Subject Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[13.5px] sm:text-[14.5px] font-bold text-foreground leading-snug">
                  Additional Subject (অতিরিক্ত ঐচ্ছিক বিষয়)
                </label>
                <Controller
                  control={control}
                  name="additionalSubjects"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "None / কোনোটি নয়"}
                      onChange={field.onChange}
                      options={[
                        "None / কোনোটি নয়",
                        ...availableHsSubjects,
                      ]}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
}
