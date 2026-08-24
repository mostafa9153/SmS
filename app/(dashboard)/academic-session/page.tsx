import { redirect } from "next/navigation";

export default function AcademicSessionPage() {
  redirect("/settings?tab=session");
}
