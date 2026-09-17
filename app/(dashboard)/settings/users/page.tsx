import { UserCheck } from "lucide-react";
import { SettingsBackButton } from "@/components/settings/settings-back-button";
import { UsersTab } from "@/components/settings/users-tab";

export const metadata = {
  title: "User Management | Settings | SMS",
  description: "Manage authorized administrative staff and administrators.",
};

export default function UsersSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 p-6 sm:p-8 border border-border/50 shadow-sm">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50 animate-pulse duration-10000" />
          <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl opacity-50 animate-pulse duration-7000" />
        </div>
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <SettingsBackButton />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-background/80 shadow-sm border border-border/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center backdrop-blur-sm">
                <UserCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-600">
                Authorized System Users
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl font-medium">
              Manage administrative and staff accounts with granular role permissions.
            </p>
          </div>
        </div>
      </div>
      <UsersTab />
    </div>
  );
}
