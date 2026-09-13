import { ShieldAlert } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { DangerZoneTab } from "@/components/settings/danger-zone-tab";

export const metadata = {
  title: "Danger Zone | Settings | SMS",
  description: "High-risk administrative operations: database wipeout and system state initialization.",
};

export default function DangerSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <SettingsPageHeader
        title="Danger Zone & System Reset"
        subtitle="High-risk administrative operations: database wipeout, purging batches, and master reset."
        icon={ShieldAlert}
        iconColor="text-rose-600 dark:text-rose-400 bg-rose-500/10"
      />
      <DangerZoneTab />
    </div>
  );
}
