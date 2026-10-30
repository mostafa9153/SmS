"use client";

import { Controller } from "react-hook-form";
import { CustomSelect } from "@/components/ui/custom-select";
import { Users, MapPin, Phone } from "lucide-react";
import { CollapsibleCard } from "@/components/admission/application-form/collapsible-card";
import { InputWrapper } from "@/components/admission/application-form/input-wrapper";
import { OCCUPATIONS, QUALIFICATIONS, WB_DISTRICTS } from "@/components/admission/application-form/constants";
import type { AdmissionFormState } from "./use-admission-form";

export function FamilySection({ form }: { form: AdmissionFormState }) {
  const { control, errors, handleSaveAndNext, handleSelectPresetArea, isSectionUnlocked, openSections, presetAreaOptions, register, savedSections, toggleSection, watchSameAddress } = form;
  return (
    <CollapsibleCard
      id="D"
      title="D. Family & Contacts (পারিবারিক ও যোগাযোগের তথ্য)"
      icon={<Users className="w-5 h-5 text-indigo-600" />}
      isOpen={openSections.D}
      onToggle={() => toggleSection("D")}
      onSaveAndNext={() => handleSaveAndNext("D")}
      isSaved={!!savedSections.D}
      isLocked={!isSectionUnlocked("D")}
    >
      <div className="space-y-4">
        {/* Family Details */}
        <div className="border-b border-indigo-100 dark:border-indigo-950/60 pb-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide mb-3 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            ১. পারিবারিক তথ্য (Family Details)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <InputWrapper label="Father's Name (English) *" error={errors.fatherName?.message}>
              <input {...register("fatherName")} placeholder="Father's Full Name" className="uppercase" />
            </InputWrapper>

            <InputWrapper label="পিতার নাম (বাংলায়)">
              <input {...register("fatherNameBengali")} placeholder="পিতার পুরো নাম বাংলায়" />
            </InputWrapper>

            <InputWrapper label="Father's Occupation (পিতার পেশা) *" error={errors.fatherOccupation?.message}>
              <Controller
                control={control}
                name="fatherOccupation"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Farmer / কৃষি কাজ"}
                    onChange={field.onChange}
                    options={OCCUPATIONS}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Mother's Name (English) *" error={errors.motherName?.message}>
              <input {...register("motherName")} placeholder="Mother's Full Name" className="uppercase" />
            </InputWrapper>

            <InputWrapper label="মাতার নাম (বাংলায়)">
              <input {...register("motherNameBengali")} placeholder="মাতার পুরো নাম বাংলায়" />
            </InputWrapper>

            <InputWrapper label="Mother's Occupation (মাতার পেশা) *" error={errors.motherOccupation?.message}>
              <Controller
                control={control}
                name="motherOccupation"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Homemaker / গৃহিণী"}
                    onChange={field.onChange}
                    options={OCCUPATIONS}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Guardian's Name (অভিভাবকের নাম) *" error={errors.guardianName?.message}>
              <input {...register("guardianName")} placeholder="Guardian's Full Name" className="uppercase" />
            </InputWrapper>

            <InputWrapper label="Relationship with Guardian (সম্পর্ক) *" error={errors.relationshipWithGuardian?.message}>
              <Controller
                control={control}
                name="relationshipWithGuardian"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Father / পিতা"}
                    onChange={field.onChange}
                    options={[
                      "Father / পিতা",
                      "Mother / মাতা",
                      "Uncle / কাকা-মামা",
                      "Aunt / পিসি-মাসি",
                      "Grandfather / দাদু-ঠাকুরদা",
                      "Grandmother / দিদিমা-ঠাকুমা",
                      "Brother / ভাই-দাদা",
                      "Sister / বোন-দিদি",
                      "Other / অন্যান্য",
                    ]}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Guardian's Occupation (অভিভাবকের পেশা) *" error={errors.guardianOccupation?.message}>
              <Controller
                control={control}
                name="guardianOccupation"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Farmer / কৃষি কাজ"}
                    onChange={field.onChange}
                    options={OCCUPATIONS}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Guardian's Qualification (শিক্ষাগত যোগ্যতা) *" error={errors.guardianQualification?.message}>
              <Controller
                control={control}
                name="guardianQualification"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "Secondary / মাধ্যমিক (Class IX-X)"}
                    onChange={field.onChange}
                    options={QUALIFICATIONS}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="Annual Family Income (বাৎসরিক আয় - ₹)">
              <input {...register("annualFamilyIncome")} type="number" placeholder="যেমন: 60000" />
            </InputWrapper>
          </div>
        </div>

        {/* Contact Details */}
        <div className="border-b border-indigo-100 dark:border-indigo-950/60 pb-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide mb-3 shadow-2xs">
            <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            ২. যোগাযোগের তথ্য (Contact Details)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <InputWrapper label="Primary Contact Mobile (মোবাইল নং) *" error={errors.studentContact?.message}>
              <input {...register("studentContact")} placeholder="10 ডিজিট মোবাইল নম্বর" maxLength={10} />
            </InputWrapper>

            <InputWrapper label="Guardian Contact No (বিকল্প মোবাইল)" error={errors.altMobile?.message}>
              <input {...register("altMobile")} placeholder="বিকল্প 10 ডিজিট মোবাইল" maxLength={10} />
            </InputWrapper>

            <InputWrapper label="Contact Email ID (ইমেইল)">
              <input {...register("email")} type="email" placeholder="যেমন: parent@gmail.com" />
            </InputWrapper>
          </div>
        </div>

        {/* Present Address */}
        <div className="border-b border-indigo-100 dark:border-indigo-950/60 pb-3.5 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 text-blue-900 dark:text-blue-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ৩. বর্তমান ঠিকানা (Present Address)
          </div>

          {/* Quick Preset Selector */}
          <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 rounded-xl space-y-2 shadow-2xs">
            <label className="text-[13.5px] sm:text-[14.5px] font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              সংরক্ষিত এলাকা থেকে দ্রুত নির্বাচন (Quick Select Area)
            </label>
            <CustomSelect
              placeholder="সংরক্ষিত এলাকা বেছে নিন..."
              options={presetAreaOptions.map((opt) => ({
                label: opt.label,
                value: opt.value,
              }))}
              onChange={(val) => handleSelectPresetArea(String(val))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <InputWrapper label="Village / Street (গ্রাম / পাড়া / রাস্তা) *" error={errors.presentVillage?.message}>
              <input {...register("presentVillage")} placeholder="গ্রাম বা রাস্তার নাম" />
            </InputWrapper>

            <InputWrapper label="Gram Panchayat (গ্রাম পঞ্চায়েত) *" error={errors.presentPanchayat?.message}>
              <input {...register("presentPanchayat")} placeholder="যেমন: মথুরাপুর" />
            </InputWrapper>

            <InputWrapper label="Block / Municipality (ব্লক / পৌরসভা) *" error={errors.presentBlock?.message}>
              <input {...register("presentBlock")} placeholder="যেমন: মথুরাপুর-১" />
            </InputWrapper>

            <InputWrapper label="Post Office (ডাকঘর) *" error={errors.presentPostOffice?.message}>
              <input {...register("presentPostOffice")} placeholder="ডাকঘরের নাম" />
            </InputWrapper>

            <InputWrapper label="Police Station (থানা) *" error={errors.presentPoliceStation?.message}>
              <input {...register("presentPoliceStation")} placeholder="থানার নাম" />
            </InputWrapper>

            <InputWrapper label="District (জেলা) *" error={errors.presentDistrict?.message}>
              <Controller
                control={control}
                name="presentDistrict"
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || "South 24 Parganas"}
                    onChange={field.onChange}
                    options={WB_DISTRICTS}
                  />
                )}
              />
            </InputWrapper>

            <InputWrapper label="PIN Code (পিন কোড) *" error={errors.presentPincode?.message}>
              <input {...register("presentPincode")} placeholder="৬ ডিজিট পিন কোড" maxLength={6} />
            </InputWrapper>
          </div>
        </div>

        {/* Permanent Address */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-bold text-xs sm:text-[13px] uppercase tracking-wide shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              ৪. স্থায়ী ঠিকানা (Permanent Address)
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-[13px] font-bold text-primary px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors">
              <input
                type="checkbox"
                {...register("sameAsPresentAddress")}
                className="rounded border-input text-primary w-4 h-4 cursor-pointer"
              />
              <span>বর্তমান ঠিকানার অনুরূপ (Same as Present)</span>
            </label>
          </div>

          {!watchSameAddress && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 p-3 bg-muted/20 rounded-xl border animate-in fade-in duration-200">
              <InputWrapper label="Village / Street (গ্রাম / পাড়া) *" error={errors.permVillage?.message}>
                <input {...register("permVillage")} placeholder="গ্রাম বা রাস্তার নাম" />
              </InputWrapper>

              <InputWrapper label="Gram Panchayat (গ্রাম পঞ্চায়েত)">
                <input {...register("permPanchayat")} placeholder="গ্রাম পঞ্চায়েত" />
              </InputWrapper>

              <InputWrapper label="Block / Municipality (ব্লক / পৌরসভা)">
                <input {...register("permBlock")} placeholder="ব্লক বা পৌরসভা" />
              </InputWrapper>

              <InputWrapper label="Post Office (ডাকঘর) *" error={errors.permPostOffice?.message}>
                <input {...register("permPostOffice")} placeholder="ডাকঘর" />
              </InputWrapper>

              <InputWrapper label="Police Station (থানা) *" error={errors.permPoliceStation?.message}>
                <input {...register("permPoliceStation")} placeholder="থানা" />
              </InputWrapper>

              <InputWrapper label="District (জেলা) *" error={errors.permDistrict?.message}>
                <Controller
                  control={control}
                  name="permDistrict"
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value || "South 24 Parganas"}
                      onChange={field.onChange}
                      options={WB_DISTRICTS}
                    />
                  )}
                />
              </InputWrapper>

              <InputWrapper label="PIN Code (পিন কোড) *" error={errors.permPincode?.message}>
                <input {...register("permPincode")} placeholder="৬ ডিজিট পিন" maxLength={6} />
              </InputWrapper>
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}
