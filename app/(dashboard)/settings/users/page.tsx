import { UserCheck } from "lucide-react";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { UsersTab } from "@/components/settings/users-tab";

export const metadata = {
  title: "User Management | Settings | SMS",
  description: "Manage authorized administrative staff and administrators.",
};

export default function UsersSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <SettingsPageHeader
        title="Authorized System Users"
        subtitle="Manage administrative and staff accounts with granular role permissions."
        icon={UserCheck}
        iconColor="text-blue-600 dark:text-blue-400 bg-blue-500/10"
      />
      <UsersTab />
    </div>
  );
}
