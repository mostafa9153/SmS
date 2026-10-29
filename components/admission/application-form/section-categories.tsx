"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { ShieldCheck } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import type { AdmissionFormState } from "./use-admission-form";

export function CategoriesSection({ form }: { form: AdmissionFormState }) {
  const { control, errors, handleSaveAndNext, isSectionUnlocked, openSections, register, savedSections, toggleSection, watchSocialCat } = form;
  return (
    <CollapsibleCard
      id="B"
      title="B. Social & Eligibility (সামাজিক ও সংরক্ষণের তথ্য)"
      icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
      isOpen={openSections.B}
      onToggle={() => toggleSection("B")}
      onSaveAndNext={() => handleSaveAndNext("B")}
      isSaved={!!savedSections.B}
      isLocked={!isSectionUnlocked("B")}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <InputWrapper label="Social Category (কাস্ট / ক্যাটাগরি) *" error={errors.socialCategory?.message}>
          <Controller
            control={control}
            name="socialCategory"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "General"}
                onChange={field.onChange}
                options={[
                  "General",
                  "OBC-A",
                  "OBC-B",
                  "SC (তফসিলি জাতি)",
                  "ST (তফসিলি উপজাতি)",
                  "Other / অন্যান্য",
                ]}
              />
            )}
          />
        </InputWrapper>

        {watchSocialCat && watchSocialCat !== "General" && (
          <InputWrapper label="Caste Certificate No. (সার্টিফিকেট নং)">
            <input {...register("casteCertificateNo")} placeholder="যেমন: WB/SC/2024/..." />
          </InputWrapper>
        )}

        <InputWrapper label="Minority Group (সংখ্যালঘু গোষ্ঠী) *" error={errors.minorityGroup?.message}>
          <Controller
            control={control}
            name="minorityGroup"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "Muslim / মুসলিম"}
                onChange={field.onChange}
                options={[
                  "Muslim / মুসলিম",
                  "None / প্রযোজ্য নয়",
                  "Christian / খ্রিষ্টান",
                  "Sikh / শিখ",
                  "Buddhist / বৌদ্ধ",
                  "Jain / জৈন",
                  "Other / অন্যান্য",
                ]}
              />
            )}
          />
        </InputWrapper>

        <InputWrapper label="AAY (অন্নযোজনা কার্ড আছে কি?)">
          <Controller
            control={control}
            name="isAay"
            render={({ field }) => (
              <CustomSelect
                value={String(field.value ?? false)}
                onChange={(val) => field.onChange(val === "true" || val === true)}
                options={[
                  { label: "No / না", value: "false" },
                  { label: "Yes / হ্যাঁ (Antyodaya)", value: "true" },
                ]}
              />
            )}
          />
        </InputWrapper>
      </div>
    </CollapsibleCard>
  );
}
