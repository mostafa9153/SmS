"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { Info } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import type { AdmissionFormState } from "./use-admission-form";

export function OtherInfoSection({ form }: { form: AdmissionFormState }) {
  const { control, handleSaveAndNext, isSectionUnlocked, openSections, register, savedSections, toggleSection, watchBpl } = form;
  return (
    <CollapsibleCard
      id="G"
      title="G. Other Information (অন্যান্য প্রয়োজনীয় তথ্য)"
      icon={<Info className="w-5 h-5 text-sky-600" />}
      isOpen={openSections.G}
      onToggle={() => toggleSection("G")}
      onSaveAndNext={() => handleSaveAndNext("G")}
      isSaved={!!savedSections.G}
      isLocked={!isSectionUnlocked("G")}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <InputWrapper label="Distance to School (স্কুল থেকে দূরত্ব - KM)">
          <input {...register("distanceToSchool")} type="number" step="0.1" placeholder="যেমন: 1.5" />
        </InputWrapper>

        <InputWrapper label="Competitions / Olympiads (অংশগ্রহণ)">
          <input {...register("competitionsOlympiads")} placeholder="যেমন: খেলাধুলা / কুইজ / কোনোটি নয়" />
        </InputWrapper>

        <InputWrapper label="BPL Status (বিপিএল তালিকাভুক্ত কি?)">
          <Controller
            control={control}
            name="bplStatus"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "NO"}
                onChange={field.onChange}
                options={[
                  { label: "NO / না", value: "NO" },
                  { label: "YES / হ্যাঁ (BPL)", value: "YES" },
                ]}
              />
            )}
          />
        </InputWrapper>

        {watchBpl === "YES" && (
          <InputWrapper label="BPL Number (বিপিএল কার্ড নং)">
            <input {...register("bplNo")} placeholder="যেমন: BPL/2024/..." />
          </InputWrapper>
        )}
      </div>
    </CollapsibleCard>
  );
}
