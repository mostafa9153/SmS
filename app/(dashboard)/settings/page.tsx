import { redirect } from "next/navigation";

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string; section?: string; subtab?: string; filter?: string }>;
}

export default async function SettingsRootPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const tab = params.tab || params.section;

  if (tab) {
    switch (tab) {
      case "backup":
      case "cloud":
      case "restore":
        redirect("/settings/backup");

      case "academic-session":
      case "session":
      case "secondary":
        redirect("/settings/academic-session?section=secondary");
      case "higher_secondary":
      case "hs":
        redirect("/settings/academic-session?section=higher_secondary");

      case "audit":
      case "audit-logs":
      case "logs":
        redirect(params.filter ? `/settings/audit?filter=${encodeURIComponent(params.filter)}` : "/settings/audit");

      case "school-details":
      case "school":
      case "config":
      case "profile":
        redirect("/settings/school-details?tab=profile");
      case "classes":
      case "class-management":
        redirect("/settings/school-details?tab=classes");
      case "marks_scheme":
      case "marks":
      case "exam-scheme":
        redirect("/settings/school-details?tab=marks_scheme");

      case "presets":
      case "preset-addresses":
      case "defaults":
        redirect("/settings/presets?section=defaults");
      case "fee":
      case "fee-presets":
        redirect("/settings/presets?section=fee");
      case "address":
      case "bank":
      case "ai":
        redirect(`/settings/presets?section=${tab}`);

      case "danger":
      case "danger-zone":
      case "wipeout":
        redirect("/settings/danger");

      case "teachers":
      case "accounts":
        redirect("/settings/teachers?tab=accounts");
      case "tasks":
      case "performance":
        redirect(`/settings/teachers?tab=${tab}`);

      case "users":
      default:
        redirect("/settings/users");
    }
  }

  // Default landing sub-route
  redirect("/settings/users");
}
