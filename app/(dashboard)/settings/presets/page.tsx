import { MapPin } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { PresetAddressesTab } from "@/components/settings/preset-addresses-tab";

export const metadata = {
  title: "Presets & Quick-Fill Hub | Settings | SMS",
  description: "Configure reusable presets for student addresses, banks, and feeder schools.",
};

export default function PresetsSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <SettingsPageHeader
        title="System Presets & Quick-Fill Hub"
        subtitle="Configure reusable preset templates for student registration, feeder schools, local banks, and quick addresses."
        icon={MapPin}
        iconColor="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
      />
      <PresetAddressesTab />
    </div>
  );
}
