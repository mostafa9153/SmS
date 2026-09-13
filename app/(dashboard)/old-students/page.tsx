import { redirect } from "next/navigation";

export default function OldStudentsIndexPage() {
  const currentYear = new Date().getFullYear();
  redirect(`/old-students/${currentYear - 1}`);
}
