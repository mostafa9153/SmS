import { Suspense } from "react";
import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import AcademicSessionClient from "@/app/(dashboard)/academic-session/academic-session-client";

export const metadata = {
  title: "Academic Session Management | Settings | SMS",
  description: "Manage academic session transition, promotion policy, and advancement.",
};

export default function AcademicSessionSettingsPage() {
  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <SettingsPageHeader
        title="Academic Session Settings"
        icon={CalendarClock}
        iconColor="text-cyan-600 dark:text-cyan-400 bg-cyan-500/10"
      >
        <Link
          href="/students/promotion"
          className="text-xs text-muted-foreground hover:text-foreground font-medium underline inline-flex items-center gap-1"
        >
          Promotion Desk →
        </Link>
      </SettingsPageHeader>
      <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Academic Session...</div>}>
        <AcademicSessionClient />
      </Suspense>
    </div>
  );
}
