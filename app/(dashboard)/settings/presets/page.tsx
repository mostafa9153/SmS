import { Suspense } from "react";
import { PresetAddressesTab } from "@/components/settings/preset-addresses-tab";

export const metadata = {
  title: "Presets & Quick-Fill Hub | Settings | SMS",
  description: "Configure reusable presets for student addresses, banks, feeder schools, and AI OCR keys.",
};

export default function PresetsSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Presets...</div>}>
        <PresetAddressesTab />
      </Suspense>
    </div>
  );
}
