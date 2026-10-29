"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { FileBadge } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import { formatAadhaarNumber } from "@/components/admission/application-form/format";
import type { AdmissionFormState } from "./use-admission-form";

export function IdentifiersSection({ form }: { form: AdmissionFormState }) {
  const { control, errors, handleSaveAndNext, isSectionUnlocked, openSections, register, savedSections, setValue, toggleSection, watchHasAadhaar } = form;
  return (
    <CollapsibleCard
      id="I"
      title="I. Government Identifiers (সরকারি পরিচয় নম্বরসমূহ)"
      icon={<FileBadge className="w-5 h-5 text-rose-600" />}
      isOpen={openSections.I}
      onToggle={() => toggleSection("I")}
      onSaveAndNext={() => handleSaveAndNext("I")}
      isSaved={!!savedSections.I}
      isLocked={!isSectionUnlocked("I")}
      isLastSection={true}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <InputWrapper label="PEN (Permanent Education Number)">
          <input {...register("pen")} placeholder="জাতীয় PEN নম্বর (যদি থাকে)" />
        </InputWrapper>

        <InputWrapper label="Health ID (ABHA স্বাস্থ্য আইডি)">
          <input {...register("healthId")} placeholder="ABHA আইডি" />
        </InputWrapper>

        <InputWrapper label="Bangla Shiksha Portal No. (BSP ID)">
          <input {...register("studentUniqueCode")} placeholder="বাংলা শিক্ষা স্টুডেন্ট কোড" />
        </InputWrapper>

        <InputWrapper label="Aadhaar Available? (আধার কার্ড আছে?)">
          <Controller
            control={control}
            name="hasAadhaar"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "Yes"}
                onChange={(val) => {
                  field.onChange(val);
                  if (val === "No") {
                    setValue("aadhaar", "");
                    setValue("nameAsPerAadhaar", "");
                  }
                }}
                options={[
                  { label: "Yes / হ্যাঁ (আধার কার্ড আছে)", value: "Yes" },
                  { label: "No / না (আধার কার্ড নেই)", value: "No" },
                ]}
              />
            )}
          />
        </InputWrapper>

        {watchHasAadhaar !== "No" && (
          <>
            <InputWrapper label="Aadhaar Number (১২ ডিজিট আধার নং)" error={errors.aadhaar?.message}>
              <Controller
                control={control}
                name="aadhaar"
                render={({ field }) => (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatAadhaarNumber(field.value || "")}
                    onChange={(e) => {
                      const rawDigits = e.target.value.replace(/\D/g, "").slice(0, 12);
                      field.onChange(rawDigits);
                    }}
                    maxLength={14}
                    placeholder="XXXX XXXX XXXX"
                    className="font-mono tracking-widest text-sm sm:text-base font-semibold"
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Name (as per Aadhaar - আধারে লেখা নাম)">
              <input {...register("nameAsPerAadhaar")} placeholder="আধারে যে বানান আছে" />
            </InputWrapper>
          </>
        )}
      </div>
    </CollapsibleCard>
  );
}
