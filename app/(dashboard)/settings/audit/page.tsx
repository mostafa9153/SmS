import { Activity } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { AuditLogsTab } from "@/components/settings/audit-logs-tab";

export const metadata = {
  title: "Audit Logs & Security History | Settings | SMS",
  description: "Track administrative operations, student changes, and security events.",
};

export default function AuditLogsSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <SettingsPageHeader
        title="System Audit Logs & Security History"
        subtitle="Track administrative operations, student demographic changes, and regulatory audit trails."
        icon={Activity}
        iconColor="text-violet-600 dark:text-violet-400 bg-violet-500/10"
      />
      <AuditLogsTab />
    </div>
  );
}
