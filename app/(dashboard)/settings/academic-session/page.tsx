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
        title="Academic Session Advancement & Transition"
        subtitle="Manage RTE promotion rules, calculate merit ranks, and roll the school into a new session."
        icon={CalendarClock}
        iconColor="text-cyan-600 dark:text-cyan-400 bg-cyan-500/10"
      >
        <Link
          href="/students/promotion"
          className="text-xs text-muted-foreground hover:text-foreground font-medium underline inline-flex items-center gap-1"
        >
          Individual Class Promotion →
        </Link>
      </SettingsPageHeader>
      <AcademicSessionClient />
    </div>
  );
}
