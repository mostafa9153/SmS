import { Cloud } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { BackupRestoreTab } from "@/components/backup/backup-restore-tab";

export const metadata = {
  title: "Cloud & Local Backup Recovery | Settings | SMS",
  description: "Automated Google Drive cloud backups, offline snapshots, and 1-click restore.",
};

export default function BackupSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <SettingsPageHeader
        title="Cloud & Local Database Backup Recovery"
        subtitle="Automated Google Drive cloud backups, offline exports, and 1-click disaster recovery."
        icon={Cloud}
        iconColor="text-blue-600 dark:text-blue-400 bg-blue-500/10"
      />
      <BackupRestoreTab />
    </div>
  );
}
