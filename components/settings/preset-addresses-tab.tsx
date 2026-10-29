"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { FeePresetManager } from "@/components/settings/fee-preset-manager";
import { ClassManagementTab } from "@/components/settings/class-management-tab";
import { MarksSchemeTab } from "@/components/settings/marks-scheme-tab";

import { PresetsHeader } from "@/components/settings/presets/presets-header";
import { PresetsNav } from "@/components/settings/presets/presets-nav";
import { DefaultsSection } from "@/components/settings/presets/defaults-section";
import { AddressSection } from "@/components/settings/presets/address-section";
import { BankSection } from "@/components/settings/presets/bank-section";
import { SchoolSection } from "@/components/settings/presets/school-section";
import { AiSection } from "@/components/settings/presets/ai-section";
import { usePresetAddresses } from "@/components/settings/presets/use-preset-addresses";

export function PresetAddressesTab() {
  const presets = usePresetAddresses();
  const { activeSection, isLoading } = presets;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 rounded-2xl border bg-card/50 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        <div className="h-[300px] w-full bg-muted/60 rounded-2xl" />
      </div>
    );
  }

  return (
    <TooltipProvider delay={100}>
      <div className="space-y-6">
        {/* Unified Header Banner with Navigation Back Button & Light Gradient */}
        <PresetsHeader presets={presets} />

        {/* Presets Navigation Quick-Grid (Compact, sleek & single-line buttons) */}
        <PresetsNav presets={presets} />

      {/* SECTION 0: Student Entry Defaults */}
      <DefaultsSection presets={presets} />

      {/* SECTION: Class Management */}
      {activeSection === "classes" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <ClassManagementTab />
        </div>
      )}

      {/* SECTION: Exam Marks Scheme */}
      {activeSection === "marks_scheme" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <MarksSchemeTab />
        </div>
      )}

      {/* SECTION: Invoice Fee Presets (3 Tiers: Class 5-8, 9-10, 11-12) */}
      {activeSection === "fee" && (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          <FeePresetManager />
        </div>
      )}

      {/* SECTION 1: Address Presets */}
      <AddressSection presets={presets} />

      {/* SECTION 2: Bank & IFSC Presets */}
      <BankSection presets={presets} />

      {/* SECTION 3: Feeder / Previous Schools */}
      <SchoolSection presets={presets} />

      {/* SECTION 4: AI Model & Vision OCR Configuration */}
      <AiSection presets={presets} />
    </div>
  </TooltipProvider>
);
}
