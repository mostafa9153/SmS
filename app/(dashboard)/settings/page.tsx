import { redirect } from "next/navigation";

interface SettingsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsRootPage({ searchParams }: SettingsPageProps) {
  const { tab } = await searchParams;

  if (tab) {
    switch (tab) {
      case "backup":
        redirect("/settings/backup");
      case "academic-session":
      case "session":
        redirect("/settings/academic-session");
      case "audit":
        redirect("/settings/audit");
      case "school-details":
      case "config":
        redirect("/settings/school-details");
      case "presets":
      case "preset-addresses":
        redirect("/settings/presets");
      case "danger":
        redirect("/settings/danger");
      case "teachers":
        redirect("/settings/teachers");
      case "users":
      default:
        redirect("/settings/users");
    }
  }

  // Default landing sub-route
  redirect("/settings/users");
}
