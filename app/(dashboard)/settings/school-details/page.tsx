import { Suspense } from "react";
import { School } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { SchoolDetailsTab } from "@/components/school-details/school-details-tab";

export const metadata = {
  title: "School Details & Institutional Setup | Settings | SMS",
  description: "Manage institutional school profile and comprehensive class & section configuration.",
};

export default function SchoolDetailsSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <SettingsPageHeader
        title="School Details & Institutional Setup"
        subtitle="Manage institutional school profile, contact information, classes, sections, and marks distribution."
        icon={School}
        iconColor="text-amber-600 dark:text-amber-400 bg-amber-500/10"
      />
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading School Details...</div>}>
        <SchoolDetailsTab />
      </Suspense>
    </div>
  );
}
