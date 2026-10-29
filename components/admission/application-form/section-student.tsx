"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { User } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import type { AdmissionFormState } from "./use-admission-form";

export function StudentSection({ form }: { form: AdmissionFormState }) {
  const { control, errors, handleSaveAndNext, isSectionUnlocked, openSections, register, savedSections, toggleSection } = form;
  return (
    <CollapsibleCard
      id="A"
      title="A. Student Demographics (শিক্ষার্থীর ব্যক্তিগত তথ্য)"
      icon={<User className="w-5 h-5 text-blue-600" />}
      isOpen={openSections.A}
      onToggle={() => toggleSection("A")}
      onSaveAndNext={() => handleSaveAndNext("A")}
      isSaved={!!savedSections.A}
      isLocked={!isSectionUnlocked("A")}
      badge="Basic Info"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <InputWrapper label="Student Name (English) *" error={errors.studentName?.message}>
          <input {...register("studentName")} placeholder="e.g. RAHUL MONDAL" className="uppercase" />
        </InputWrapper>

        <InputWrapper label="ছাত্রের নাম (বাংলায়)" error={errors.studentNameBengali?.message}>
          <input {...register("studentNameBengali")} placeholder="যেমন: রাহুল মন্ডল" />
        </InputWrapper>

        <InputWrapper label="Date of Birth (জন্ম তারিখ) *" error={errors.dob?.message}>
          <input {...register("dob")} type="date" />
        </InputWrapper>

        <InputWrapper label="Gender (লিঙ্গ) *" error={errors.gender?.message}>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <CustomSelect
                value={field.value}
                onChange={field.onChange}
                options={[
                  { label: "Male / ছাত্র (পুরুষ)", value: "Male" },
                  { label: "Female / ছাত্রী (মহিলা)", value: "Female" },
                  { label: "Other / অন্যান্য", value: "Other" },
                ]}
              />
            )}
          />
        </InputWrapper>

        <InputWrapper label="Mother Tongue (মাতৃভাষা)">
          <Controller
            control={control}
            name="motherTongue"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "Bengali / বাংলা"}
                onChange={field.onChange}
                options={[
                  "Bengali / বাংলা",
                  "Hindi / হিন্দি",
                  "Urdu / উর্দু",
                  "English / ইংরেজি",
                  "Santhali / সাঁওতালি",
                  "Nepali / নেপালি",
                  "Other / অন্যান্য",
                ]}
              />
            )}
          />
        </InputWrapper>

        <InputWrapper label="Religion (ধর্ম)">
          <Controller
            control={control}
            name="religion"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "Islam / ইসলাম"}
                onChange={field.onChange}
                options={[
                  "Islam / ইসলাম",
                  "Hinduism / হিন্দু",
                  "Christianity / খ্রিষ্টান",
                  "Sikhism / শিখ",
                  "Buddhism / বৌদ্ধ",
                  "Jainism / জৈন",
                  "Other / অন্যান্য",
                ]}
              />
            )}
          />
        </InputWrapper>

        <InputWrapper label="Indian Nationality? (ভারতীয় নাগরিক?)">
          <Controller
            control={control}
            name="indianNationality"
            render={({ field }) => (
              <CustomSelect
                value={String(field.value ?? true)}
                onChange={(val) => field.onChange(val === "true" || val === true)}
                options={[
                  { label: "Yes / হ্যাঁ (Indian)", value: "true" },
                  { label: "No / না", value: "false" },
                ]}
              />
            )}
          />
        </InputWrapper>

        <InputWrapper label="Blood Group (রক্তের গ্রুপ)">
          <Controller
            control={control}
            name="bloodGroup"
            render={({ field }) => (
              <CustomSelect
                value={field.value || "Unknown / জানা নেই"}
                onChange={field.onChange}
                options={[
                  "Unknown / জানা নেই",
                  "A+",
                  "A-",
                  "B+",
                  "B-",
                  "AB+",
                  "AB-",
                  "O+",
                  "O-",
                ]}
              />
            )}
          />
        </InputWrapper>

        <InputWrapper label="Height (উচ্চতা - CM-এ)">
          <input {...register("heightCm")} type="number" placeholder="যেমন: 135" />
        </InputWrapper>

        <InputWrapper label="Weight (ওজন - KG-তে)">
          <input {...register("weightKg")} type="number" step="0.1" placeholder="যেমন: 32.5" />
        </InputWrapper>

        <InputWrapper label="Birth Registration No. (জন্ম নিবন্ধন নং)">
          <input {...register("birthRegistrationNo")} placeholder="যেমন: 19991901001000..." />
        </InputWrapper>

        <InputWrapper label="Identification Mark (সনাক্তকরণ চিহ্ন)">
          <input {...register("identificationMark")} placeholder="যেমন: তিল / কাটা দাগ" />
        </InputWrapper>
      </div>
    </CollapsibleCard>
  );
}
