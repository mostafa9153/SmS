import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeProfileClient } from "./employee-profile-client";

export const metadata: Metadata = {
  title: "Employee Profile | SMS",
  description: "View comprehensive staff member details.",
};

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: staff, error } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !staff) {
    console.error("Error fetching staff profile:", error);
    notFound();
  }

  return <EmployeeProfileClient staff={staff} />;
}
