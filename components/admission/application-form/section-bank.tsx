"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { Building2 } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import type { AdmissionFormState } from "./use-admission-form";

export function BankSection({ form }: { form: AdmissionFormState }) {
  const { bankDropdownOptions, handleBankPresetSelect, handleSaveAndNext, isSectionUnlocked, openSections, register, savedSections, toggleSection } = form;
  return (
    <CollapsibleCard
      id="H"
      title="H. Bank Details (ব্যাংক অ্যাকাউন্টের বিবরণ)"
      icon={<Building2 className="w-5 h-5 text-emerald-700" />}
      isOpen={openSections.H}
      onToggle={() => toggleSection("H")}
      onSaveAndNext={() => handleSaveAndNext("H")}
      isSaved={!!savedSections.H}
      isLocked={!isSectionUnlocked("H")}
    >
      <div className="space-y-3">
        {/* Quick Bank Preset Selector */}
        <div className="p-3 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 rounded-xl space-y-2 shadow-2xs">
          <label className="text-[13.5px] sm:text-[14.5px] font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            সংরক্ষিত ব্যাংক প্রিসেট থেকে নির্বাচন (Quick Select Bank)
          </label>
          <CustomSelect
            placeholder="সংরক্ষিত ব্যাংক ও ব্রাঞ্চ বেছে নিন..."
            options={bankDropdownOptions}
            onChange={(val) => handleBankPresetSelect(String(val))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <InputWrapper label="Bank Name & Branch (ব্যাংক ও শাখার নাম)">
            <input {...register("bankName")} placeholder="যেমন: State Bank of India, Mathurapur Branch" />
          </InputWrapper>

          <InputWrapper label="Bank IFSC Code (আইএফএসসি কোড)">
            <input {...register("bankIfsc")} placeholder="যেমন: SBIN0001234" className="uppercase font-mono" />
          </InputWrapper>

          <InputWrapper label="Bank Account Number (অ্যাকাউন্ট নং)">
            <input {...register("bankAccountNo")} placeholder="অ্যাকাউন্ট নম্বর" className="font-mono" />
          </InputWrapper>
        </div>
      </div>
    </CollapsibleCard>
  );
}
