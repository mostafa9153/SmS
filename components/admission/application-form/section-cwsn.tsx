"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { HeartHandshake } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import type { AdmissionFormState } from "./use-admission-form";

export function CwsnSection({ form }: { form: AdmissionFormState }) {
  const { control, handleSaveAndNext, isSectionUnlocked, openSections, register, savedSections, setValue, toggleSection, watchCwsn, watchDisabilityCert } = form;
  return (
    <CollapsibleCard
      id="C"
      title="C. CWSN Profile (বিশেষ চাহিদাসম্পন্ন / প্রতিবন্ধী তথ্য)"
      icon={<HeartHandshake className="w-5 h-5 text-purple-600" />}
      isOpen={openSections.C}
      onToggle={() => toggleSection("C")}
      onSaveAndNext={() => handleSaveAndNext("C")}
      isSaved={!!savedSections.C}
      isLocked={!isSectionUnlocked("C")}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <InputWrapper label="CWSN Status? (বিশেষ চাহিদা সম্পন্ন?)">
          <Controller
            control={control}
            name="isCwsn"
            render={({ field }) => (
              <CustomSelect
                value={String(field.value ?? false)}
                onChange={(val) => field.onChange(val === "true" || val === true)}
                options={[
                  { label: "No / না (সাধারণ)", value: "false" },
                  { label: "Yes / হ্যাঁ (CWSN)", value: "true" },
                ]}
              />
            )}
          />
        </InputWrapper>

        {watchCwsn && (
          <>
            <InputWrapper label="Type of Impairment (প্রতিবন্ধকতার ধরন)">
              <Controller
                control={control}
                name="impairmentType"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Locomotor / অস্থি সংক্রান্ত"}
                    onChange={field.onChange}
                    options={[
                      "Locomotor / অস্থি সংক্রান্ত",
                      "Visual Impairment / দৃষ্টিহীন",
                      "Hearing Impairment / শ্রবণহীন",
                      "Speech & Language / বাক প্রতিবন্ধী",
                      "Intellectual / মানসিক",
                      "Autism / অটিজম",
                      "Multiple / একাধিক",
                      "Other / অন্যান্য",
                    ]}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Disability Certificate? (সার্টিফিকেট আছে?)">
              <Controller
                control={control}
                name="hasDisabilityCertificate"
                render={({ field }) => (
                  <CustomSelect
                    value={String(field.value ?? false)}
                    onChange={(val) => {
                      const hasCert = val === "true" || val === true;
                      field.onChange(hasCert);
                      if (!hasCert) {
                        setValue("disabilityCertificateNo", "");
                        setValue("disabilityPercentage", null);
                      }
                    }}
                    options={[
                      { label: "No / না", value: "false" },
                      { label: "Yes / হ্যাঁ (প্রাপ্ত)", value: "true" },
                    ]}
                  />
                )}
              />
            </InputWrapper>

            {watchDisabilityCert && (
              <>
                <InputWrapper label="Disability Certificate No. (সার্টিফিকেট নম্বর)">
                  <input
                    {...register("disabilityCertificateNo")}
                    placeholder="সার্টিফিকেট নম্বর (যেমন: WB/CWSN/12345)"
                  />
                </InputWrapper>

                <InputWrapper label="Disability Percentage (শতকরা হার %)">
                  <input {...register("disabilityPercentage")} type="number" placeholder="যেমন: 40" />
                </InputWrapper>
              </>
            )}
          </>
        )}

        <InputWrapper label="Specific Learning Disability (SLD)">
          <Controller
            control={control}
            name="sldType"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "None / কোনোটি নয়"}
                onChange={field.onChange}
                options={[
                  "None / কোনোটি নয়",
                  "Dyslexia (পড়তে সমস্যা)",
                  "Dysgraphia (লিখতে সমস্যা)",
                  "Dyscalculia (গণিতে সমস্যা)",
                  "Other / অন্যান্য",
                ]}
              />
            )}
          />
        </InputWrapper>
      </div>
    </CollapsibleCard>
  );
}
