import { Link2 } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { PublicAdmissionLinkCard } from "@/components/settings/public-admission-link-card";

export const metadata = {
  title: "Public Admission Link | Settings | SMS",
};

export default function AdmissionLinkSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <SettingsPageHeader
        title="Public Admission Link"
        icon={Link2}
        iconColor="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10"
      />
      <PublicAdmissionLinkCard />
    </div>
  );
}
